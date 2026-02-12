import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const SUPABASE_URL = "https://kokvcgiuhbtymsnwdxtr.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtva3ZjZ2l1aGJ0eW1zbndkeHRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMxNDk1OCwiZXhwIjoyMDg1ODkwOTU4fQ.vY33ql0QZ8qughmmhBN0myLuyfy19gtYIY_VugCSL4M";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const BINANCE_WS_BASES = (
  process.env.BINANCE_WS_BASES
    ? process.env.BINANCE_WS_BASES.split(",").map((s) => s.trim()).filter(Boolean)
    : [
        process.env.BINANCE_WS_BASE || "wss://stream.binance.com:9443",
        "wss://stream.binance.com:443",
      ]
).filter((v, i, arr) => arr.indexOf(v) === i);
const HEARTBEAT_MS = Number(process.env.ENGINE_HEARTBEAT_MS || 30_000);
const RESYNC_MS = Number(process.env.ENGINE_RESYNC_MS || 300_000);
const RECONNECT_BASE_MS = Number(process.env.ENGINE_RECONNECT_BASE_MS || 2_000);
const RECONNECT_MAX_MS = Number(process.env.ENGINE_RECONNECT_MAX_MS || 30_000);
const REST_POLL_MS = Number(process.env.ENGINE_REST_POLL_MS || 2_000);
const BINANCE_REST_BASE = process.env.BINANCE_REST_BASE || "https://data-api.binance.vision";

const STATUS_PENDING = "pending_entry";
const STATUS_ENTERED = "entered";
const STATUS_ACTIVE = "active";
const STATUS_CLOSED = "closed";
const ACTIVE_FAMILY = new Set([STATUS_PENDING, STATUS_ENTERED, STATUS_ACTIVE]);

const ANSI_RED = "\x1b[31m";
const ANSI_GREEN = "\x1b[32m";
const ANSI_RESET = "\x1b[0m";

function logErrorHighlight(tag, message) {
  console.error(`${ANSI_RED}[${tag}] ${message}${ANSI_RESET}`);
}

function logSuccessHighlight(tag, message) {
  console.log(`${ANSI_GREEN}[${tag}] ${message}${ANSI_RESET}`);
}

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const signalsById = new Map();
const idsBySymbol = new Map();
const inFlight = new Set();

let binanceWs = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let heartbeatTimer = null;
let resyncTimer = null;
let restPollTimer = null;
let lastWsMessageAt = 0;
let subscribedSymbolsKey = "";
let wsConnected = false;
let restPollInFlight = false;
let lastRestActiveLogAt = 0;
let lastWsPriceLogAt = 0;
let wsCycleToken = 0;
let restFallbackActive = false;

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(raw) {
  if (!raw) return "";
  return String(raw).replace(/\//g, "").toUpperCase().trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDuration(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function enrichSignal(row) {
  return {
    ...row,
    symbolNorm: normalizeSymbol(row.symbol),
    entry_price: toNumber(row.entry_price),
    take_profit: toNumber(row.take_profit),
    stop_loss: toNumber(row.stop_loss),
    leverage: toNumber(row.leverage) || 1,
  };
}

function addToIndexes(row) {
  const sig = enrichSignal(row);
  if (!sig.id || !sig.symbolNorm || !ACTIVE_FAMILY.has(sig.status)) return;

  const prev = signalsById.get(sig.id);
  if (prev && prev.symbolNorm !== sig.symbolNorm) {
    const prevSet = idsBySymbol.get(prev.symbolNorm);
    if (prevSet) {
      prevSet.delete(sig.id);
      if (prevSet.size === 0) idsBySymbol.delete(prev.symbolNorm);
    }
  }

  signalsById.set(sig.id, sig);
  let set = idsBySymbol.get(sig.symbolNorm);
  if (!set) {
    set = new Set();
    idsBySymbol.set(sig.symbolNorm, set);
  }
  set.add(sig.id);
}

function removeFromIndexes(id) {
  const existing = signalsById.get(id);
  if (!existing) return;
  const set = idsBySymbol.get(existing.symbolNorm);
  if (set) {
    set.delete(id);
    if (set.size === 0) idsBySymbol.delete(existing.symbolNorm);
  }
  signalsById.delete(id);
}

async function loadInitialSignals() {
  const { data, error } = await supabase
    .from("signals")
    .select("id, symbol, direction, entry_price, take_profit, stop_loss, leverage, status, entry_time, created_at")
    .in("status", [STATUS_PENDING, STATUS_ENTERED, STATUS_ACTIVE]);

  if (error) {
    throw new Error(`Load signals failed: ${error.message}`);
  }

  signalsById.clear();
  idsBySymbol.clear();
  for (const row of data || []) addToIndexes(row);

  logSuccessHighlight("init", `loaded ${signalsById.size} active-family signals across ${idsBySymbol.size} symbols`);
  scheduleWsRefresh();
}

function currentSymbols() {
  return [...idsBySymbol.keys()].sort();
}

function wsUrlFor(symbols) {
  const streams = symbols.map((s) => `${s.toLowerCase()}@aggTrade`).join("/");
  const base = BINANCE_WS_BASES[0];
  return `${base}/stream?streams=${streams}`;
}

function closeWs() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (binanceWs) {
    binanceWs.onopen = null;
    binanceWs.onclose = null;
    binanceWs.onerror = null;
    binanceWs.onmessage = null;
    try {
      binanceWs.close();
    } catch {
      // ignore
    }
    binanceWs = null;
  }
  wsConnected = false;
}

function connectWs(symbols) {
  closeWs();

  if (symbols.length === 0) {
    subscribedSymbolsKey = "";
    restFallbackActive = false;
    console.log("[ws] no active symbols, waiting for realtime inserts/updates...");
    return;
  }

  subscribedSymbolsKey = symbols.join(",");
  const token = ++wsCycleToken;
  if (restFallbackActive) {
    logSuccessHighlight("ws", "leaving REST fallback, attempting WS reconnect");
  }
  restFallbackActive = false;
  console.log(`[ws] prepare connect (${symbols.length} symbols) endpoints=${BINANCE_WS_BASES.join(", ")}`);
  attemptWsEndpoint(symbols, token, 0);
}

function attemptWsEndpoint(symbols, token, endpointIndex) {
  if (token !== wsCycleToken) return;

  const wsBase = BINANCE_WS_BASES[endpointIndex];
  if (!wsBase) {
    restFallbackActive = true;
    logErrorHighlight(
      "ws:error",
      `no endpoint available, fallback to REST polling (endpoints=${BINANCE_WS_BASES.join(", ")})`,
    );
    scheduleReconnect();
    return;
  }

  const streams = symbols.map((s) => `${s.toLowerCase()}@aggTrade`).join("/");
  const url = `${wsBase}/stream?streams=${streams}`;
  console.log(`[ws] attempt ${endpointIndex + 1}/${BINANCE_WS_BASES.length} via ${wsBase}`);
  console.log(`[ws] url=${url}`);

  const ws = new WebSocket(url);
  binanceWs = ws;
  wsConnected = false;

  let opened = false;
  let failed = false;

  const failAndTryNext = (reason) => {
    if (token !== wsCycleToken || failed) return;
    failed = true;
    wsConnected = false;
    logErrorHighlight("ws:error", `${reason} (${wsBase})`);

    try {
      ws.close();
    } catch {
      // ignore
    }

    const nextIndex = endpointIndex + 1;
    if (nextIndex < BINANCE_WS_BASES.length) {
      const nextBase = BINANCE_WS_BASES[nextIndex];
      logErrorHighlight("ws:error", `endpoint failed, switch -> ${nextBase}`);
      setTimeout(() => attemptWsEndpoint(symbols, token, nextIndex), 250);
      return;
    }

    restFallbackActive = true;
    logErrorHighlight("ws:error", `all endpoints failed, fallback -> REST polling (last=${wsBase})`);
    scheduleReconnect();
  };

  ws.onopen = () => {
    if (token !== wsCycleToken) return;
    opened = true;
    reconnectAttempts = 0;
    if (restFallbackActive) {
      logSuccessHighlight("ws", "connected, disabling REST fallback");
    }
    restFallbackActive = false;
    lastWsMessageAt = Date.now();
    wsConnected = true;
    logSuccessHighlight("ws", `connected via ${wsBase}`);
  };

  ws.onmessage = async (event) => {
    if (token !== wsCycleToken) return;
    lastWsMessageAt = Date.now();
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    const trade = payload?.data ?? payload;
    const symbolNorm = normalizeSymbol(trade?.s);
    const price = toNumber(trade?.p);
    if (!symbolNorm || price === null) return;

    await handleTrade(symbolNorm, price);
  };

  ws.onerror = (err) => {
    if (token !== wsCycleToken) return;
    const msg = err?.message || String(err);
    if (!opened) {
      failAndTryNext(`handshake/error: ${msg}`);
      return;
    }
    logErrorHighlight("ws:error", `${msg} (${wsBase})`);
  };

  ws.onclose = (event) => {
    if (token !== wsCycleToken) return;
    const code = event?.code ?? 0;
    const reason = event?.reason || "n/a";

    if (!opened) {
      failAndTryNext(`handshake/close: code=${code}, reason=${reason}`);
      return;
    }

    wsConnected = false;
    logErrorHighlight("ws:error", `disconnected code=${code} reason=${reason}`);
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const ms = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS);
  reconnectAttempts += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWs(currentSymbols());
  }, ms);
}

let wsRefreshDebounce = null;
function scheduleWsRefresh() {
  if (wsRefreshDebounce) clearTimeout(wsRefreshDebounce);
  wsRefreshDebounce = setTimeout(() => {
    const symbols = currentSymbols();
    const nextKey = symbols.join(",");
    if (nextKey !== subscribedSymbolsKey) connectWs(symbols);
  }, 500);
}

function isEntryTriggered(sig, price) {
  if (sig.direction === "long") return price <= sig.entry_price;
  return price >= sig.entry_price;
}

function getExitType(sig, price) {
  const tp = sig.take_profit;
  const sl = sig.stop_loss;

  if (sig.direction === "long") {
    if (tp !== null && price >= tp) return "take_profit";
    if (sl !== null && price <= sl) return "stop_loss";
    return null;
  }

  if (tp !== null && price <= tp) return "take_profit";
  if (sl !== null && price >= sl) return "stop_loss";
  return null;
}

function calcPnl(sig, exitPrice) {
  const entry = sig.entry_price;
  const lev = sig.leverage || 1;
  const raw = sig.direction === "long" ? (exitPrice - entry) / entry : (entry - exitPrice) / entry;
  const pnlPercentage = raw * lev * 100;
  const pnlRatio = raw * lev;
  return {
    pnl_percentage: Number(pnlPercentage.toFixed(4)),
    pnl_ratio: pnlRatio.toFixed(6),
  };
}

async function updateStatus(id, expectedStatus, patch) {
  const { data, error } = await supabase
    .from("signals")
    .update(patch)
    .eq("id", id)
    .eq("status", expectedStatus)
    .select("id, status")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

async function handleSignalAgainstPrice(sig, price) {
  if (!sig || inFlight.has(sig.id)) return;
  inFlight.add(sig.id);

  try {
    if (sig.status === STATUS_PENDING && isEntryTriggered(sig, price)) {
      const entered = await updateStatus(sig.id, STATUS_PENDING, {
        status: STATUS_ENTERED,
      });
      if (entered) {
        const local = signalsById.get(sig.id);
        if (local) {
          local.status = STATUS_ENTERED;
          signalsById.set(sig.id, local);
        }
        console.log(`[entry] ${sig.id} ${sig.symbolNorm} -> entered @ ${price}`);
      }
      return;
    }

    if (sig.status !== STATUS_ENTERED && sig.status !== STATUS_ACTIVE) {
      return;
    }

    const exitType = getExitType(sig, price);
    if (!exitType) return;

    const exitTime = nowIso();
    const pnl = calcPnl(sig, price);
    const patch = {
      status: STATUS_CLOSED,
      exit_type: exitType,
      exit_price: price,
      exit_time: exitTime,
      signal_duration: formatDuration(sig.entry_time || sig.created_at, exitTime),
      ...pnl,
    };

    let closed = false;
    if (sig.status === STATUS_ENTERED) {
      closed = await updateStatus(sig.id, STATUS_ENTERED, patch);
    } else {
      closed = await updateStatus(sig.id, STATUS_ACTIVE, patch);
    }

    if (!closed && sig.status === STATUS_ACTIVE) {
      closed = await updateStatus(sig.id, STATUS_ENTERED, patch);
    }

    if (closed) {
      removeFromIndexes(sig.id);
      scheduleWsRefresh();
      console.log(`[exit] ${sig.id} ${sig.symbolNorm} -> closed(${exitType}) @ ${price}`);
    }
  } catch (err) {
    console.error(`[eval] ${sig.id} failed`, err?.message || err);
  } finally {
    inFlight.delete(sig.id);
  }
}

async function handleTrade(symbolNorm, price) {
  const ids = idsBySymbol.get(symbolNorm);
  if (!ids || ids.size === 0) return;

  const now = Date.now();
  if (now - lastWsPriceLogAt > 10_000) {
    logSuccessHighlight("ws:tick", `${symbolNorm} @ ${price}`);
    lastWsPriceLogAt = now;
  }

  for (const id of [...ids]) {
    const sig = signalsById.get(id);
    if (!sig) continue;
    await handleSignalAgainstPrice(sig, price);
  }
}

function handleRealtimePayload(payload) {
  const eventType = payload.eventType;
  const next = payload.new;
  const prev = payload.old;

  if (eventType === "DELETE") {
    if (prev?.id) {
      removeFromIndexes(prev.id);
      scheduleWsRefresh();
    }
    return;
  }

  if (!next?.id) return;

  if (ACTIVE_FAMILY.has(next.status)) {
    addToIndexes(next);
  } else {
    removeFromIndexes(next.id);
  }
  scheduleWsRefresh();
}

async function startRealtime() {
  const channel = supabase
    .channel("vps-signal-engine")
    .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, handleRealtimePayload)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        logSuccessHighlight("realtime", status);
      } else {
        logErrorHighlight("realtime", status);
      }
    });

  return channel;
}

async function pollRestPricesOnce() {
  const symbols = currentSymbols();
  if (symbols.length === 0 || wsConnected || !restFallbackActive || restPollInFlight) return;

  restPollInFlight = true;
  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
    const url = `${BINANCE_REST_BASE}/api/v3/ticker/price?symbols=${symbolsParam}`;
    if (Date.now() - lastRestActiveLogAt > 10_000) {
      console.log(`[rest] polling ${url}`);
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return;

    const now = Date.now();
    if (now - lastRestActiveLogAt > 10_000) {
      logSuccessHighlight("rest", `fallback active, polled ${data.length} prices for ${symbols.length} symbols`);
      lastRestActiveLogAt = now;
    }

    for (const item of data) {
      const symbolNorm = normalizeSymbol(item?.symbol);
      const price = toNumber(item?.price);
      if (!symbolNorm || price === null) continue;
      await handleTrade(symbolNorm, price);
    }
  } catch (err) {
    logErrorHighlight("rest:error", `price poll failed: ${err?.message || err}`);
  } finally {
    restPollInFlight = false;
  }
}

function startHealthChecks() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    const silentTooLong = lastWsMessageAt > 0 && now - lastWsMessageAt > HEARTBEAT_MS * 2;
    if (silentTooLong) {
      console.warn("[health] ws stale, reconnecting...");
      connectWs(currentSymbols());
      return;
    }
    console.log(
      `[health] signals=${signalsById.size}, symbols=${idsBySymbol.size}, ws=${wsConnected ? "up" : "down"}, rest=${restFallbackActive ? "on" : "off"}`,
    );
  }, HEARTBEAT_MS);

  if (resyncTimer) clearInterval(resyncTimer);
  resyncTimer = setInterval(async () => {
    try {
      await loadInitialSignals();
      console.log("[resync] done");
    } catch (err) {
      console.error("[resync] failed", err?.message || err);
    }
  }, RESYNC_MS);

  if (restPollTimer) clearInterval(restPollTimer);
  restPollTimer = setInterval(() => {
    pollRestPricesOnce();
  }, REST_POLL_MS);
}

async function main() {
  logSuccessHighlight("engine", "starting signal engine...");
  await loadInitialSignals();
  await startRealtime();
  connectWs(currentSymbols());
  startHealthChecks();
}

main().catch((err) => {
  console.error("[engine] fatal", err?.message || err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("[engine] shutting down (SIGINT)");
  closeWs();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[engine] shutting down (SIGTERM)");
  closeWs();
  process.exit(0);
});
