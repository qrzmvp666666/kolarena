import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Direction mapping (现货 excluded) ──
const DIRECTION_MAP: Record<string, "long" | "short"> = {
  "做多": "long",
  "做空": "short",
};

// ── Helper: parse a numeric string that might be a range, "未提供", "市价", or contain commas ──
function parsePrice(raw: string | null | undefined): number | null {
  if (!raw || raw === "未提供" || raw === "市价" || raw.trim() === "") return null;
  // Remove commas (e.g. "83,000")
  let cleaned = raw.replace(/,/g, "");
  // If it's a range like "2180-2280", take the first value
  // But be careful: negative numbers start with "-"
  // Use regex to split on "-" that is between digits
  const rangeParts = cleaned.split(/(?<=\d)-(?=\d)/);
  if (rangeParts.length > 1) {
    cleaned = rangeParts[0].trim();
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ── Helper: parse leverage like "100x" or "10x" → integer ──
function parseLeverage(raw: string | null | undefined): number | null {
  if (!raw || raw === "未提供" || raw.trim() === "") return null;
  const match = raw.match(/(\d+)/); 
  return match ? parseInt(match[1], 10) : null;
}

// ── Helper: parse entry_time ──
// Formats: "23:05" (today), "2/8 19:34" (month/day), "2/8 23:27"
function parseEntryTime(raw: string | null | undefined): string | null {
  if (!raw || raw === "未提供" || raw.trim() === "") return null;
  const now = new Date();
  const year = now.getUTCFullYear();

  // Pattern: M/D HH:MM
  const mdMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10);
    const day = parseInt(mdMatch[2], 10);
    const hour = parseInt(mdMatch[3], 10);
    const minute = parseInt(mdMatch[4], 10);
    // Use UTC+8 (China timezone)
    const d = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
    return d.toISOString();
  }

  // Pattern: HH:MM (today)
  const hmMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hmMatch) {
    const hour = parseInt(hmMatch[1], 10);
    const minute = parseInt(hmMatch[2], 10);
    // Today in UTC+8
    const chinaDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const d = new Date(Date.UTC(
      chinaDate.getUTCFullYear(),
      chinaDate.getUTCMonth(),
      chinaDate.getUTCDate(),
      hour - 8,
      minute
    ));
    return d.toISOString();
  }

  return null;
}

// ── Helper: normalize symbol ──
// Input: "SOL/USDT" → "SOLUSDT", "DOTUSDT/USDT" → "DOTUSDT"
function normalizeSymbol(raw: string): string {
  if (!raw || raw === "未识别币种") return "";
  // Remove the trailing /USDT if the base already contains USDT
  let s = raw.trim();
  // "DOTUSDT/USDT" → "DOTUSDT"
  if (s.match(/USDT\/USDT$/i)) {
    s = s.replace(/\/USDT$/i, "");
  }
  // "SOL/USDT" → "SOLUSDT"
  s = s.replace("/", "");
  return s.toUpperCase();
}

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Verify webhook secret ──
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (webhookSecret) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── Parse body ──
  let body: { ColumnNames: string[]; Values: string[][] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.ColumnNames || !body.Values || !Array.isArray(body.Values)) {
    return new Response(
      JSON.stringify({ error: "Expected { ColumnNames: [...], Values: [[...], ...] }" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Init Supabase service-role client ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Load KOL name→id map ──
  const { data: kols, error: kolErr } = await supabase
    .from("kols")
    .select("id, name, short_name");

  if (kolErr || !kols) {
    return new Response(
      JSON.stringify({ error: "Failed to load KOLs", detail: kolErr?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Load existing symbols into a Set for fast lookup ──
  const { data: existingSymbols } = await supabase
    .from("symbols")
    .select("symbol");
  const symbolSet = new Set((existingSymbols ?? []).map((s: { symbol: string }) => s.symbol));

  // Auto-insert new symbol if it doesn't exist
  async function ensureSymbol(symbol: string): Promise<void> {
    if (symbolSet.has(symbol)) return;
    const { error } = await supabase
      .from("symbols")
      .insert({ symbol, is_active: true });
    if (!error) {
      symbolSet.add(symbol);
    }
    // ignore duplicate errors (race condition safe)
  }

  // Build a lookup: exact name match, then substring match
  function findKolId(rawName: string): string | null {
    // 1. Exact match
    const exact = kols!.find(
      (k) => k.name === rawName || k.short_name === rawName
    );
    if (exact) return exact.id;

    // 2. KOL name contained in rawName (e.g. "BTC飞扬" contains "飞扬")
    const contained = kols!.find(
      (k) => rawName.includes(k.name) || (k.short_name && rawName.includes(k.short_name))
    );
    if (contained) return contained.id;

    // 3. rawName contained in KOL name
    const reverse = kols!.find(
      (k) => k.name.includes(rawName) || (k.short_name && k.short_name.includes(rawName))
    );
    if (reverse) return reverse.id;

    return null;
  }

  // ── Map columns ──
  const colIdx: Record<string, number> = {};
  body.ColumnNames.forEach((name, i) => {
    colIdx[name] = i;
  });

  const results = {
    total: body.Values.length,
    inserted: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // ── Process each row ──
  for (const row of body.Values) {
    const kolName = row[colIdx["KOL名称"]] ?? "";
    const directionRaw = row[colIdx["方向"]] ?? "";
    const symbolRaw = row[colIdx["交易对"]] ?? "";
    const entryPriceRaw = row[colIdx["入场价"]] ?? "";
    const takeProfitRaw = row[colIdx["止盈价"]] ?? "";
    const stopLossRaw = row[colIdx["止损价"]] ?? "";
    const leverageRaw = row[colIdx["杠杆"]] ?? "";
    const entryTimeRaw = row[colIdx["创建时间"]] ?? "";

    // ── Resolve KOL ──
    const kolId = findKolId(kolName);
    if (!kolId) {
      results.skipped++;
      results.errors.push(`KOL not found: "${kolName}"`);
      continue;
    }

    // ── Parse fields ──
    const direction = DIRECTION_MAP[directionRaw];
    if (!direction) {
      results.skipped++;
      results.errors.push(`Unknown direction: "${directionRaw}" for KOL "${kolName}"`);
      continue;
    }

    const symbol = normalizeSymbol(symbolRaw);
    if (!symbol) {
      results.skipped++;
      results.errors.push(`Invalid symbol for KOL "${kolName}"`);
      continue;
    }

    const entryPrice = parsePrice(entryPriceRaw);
    if (entryPrice === null) {
      results.skipped++;
      results.errors.push(`No valid entry price for KOL "${kolName}" on ${symbol}`);
      continue;
    }

    const takeProfit = parsePrice(takeProfitRaw);
    const stopLoss = parsePrice(stopLossRaw);
    const leverage = parseLeverage(leverageRaw);
    const entryTime = parseEntryTime(entryTimeRaw);

    // Skip if both take_profit and stop_loss are missing
    if (takeProfit === null && stopLoss === null) {
      results.skipped++;
      results.errors.push(`No TP/SL for KOL "${kolName}" on ${symbol}, skipped`);
      continue;
    }

    if (!entryTime) {
      results.skipped++;
      results.errors.push(`No valid entry time for KOL "${kolName}" on ${symbol}`);
      continue;
    }

    // ── Auto-insert symbol if not in symbols table ──
    await ensureSymbol(symbol);

    // ── Upsert (ON CONFLICT skip) ──
    const record = {
      kol_id: kolId,
      symbol,
      direction,
      entry_price: entryPrice,
      take_profit: takeProfit,
      stop_loss: stopLoss,
      leverage,
      entry_time: entryTime,
      status: "active" as const,
      margin_mode: "cross" as const,
    };

    const { error: insertErr } = await supabase
      .from("signals")
      .upsert(record, {
        onConflict: "kol_id,symbol,direction,entry_price,entry_time",
        ignoreDuplicates: true,
      });

    if (insertErr) {
      // Duplicate key is expected and fine
      if (insertErr.code === "23505") {
        results.skipped++;
      } else {
        results.errors.push(
          `Insert error for "${kolName}" ${symbol}: ${insertErr.message}`
        );
        results.skipped++;
      }
    } else {
      results.inserted++;
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
