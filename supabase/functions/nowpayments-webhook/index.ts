// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, x-nowpayments-sig",
};

type WebhookPayload = {
  payment_id?: string | number;
  payment_status?: string;
  order_id?: string;
  pay_address?: string;
  pay_amount?: number;
  pay_currency?: string;
  purchase_id?: string;
  payin_hash?: string;
};

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObject(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObject((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toOrderStatus(providerStatus: string | null | undefined):
  | "pending"
  | "confirming"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_paid" {
  const normalized = (providerStatus ?? "waiting").toLowerCase();
  if (normalized === "waiting") return "pending";
  if (normalized === "confirming" || normalized === "sending") return "confirming";
  if (normalized === "confirmed" || normalized === "finished") return "paid";
  if (normalized === "failed") return "failed";
  if (normalized === "expired") return "expired";
  if (normalized === "refunded") return "refunded";
  if (normalized === "partially_paid") return "partially_paid";
  return "pending";
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, message: "METHOD_NOT_ALLOWED" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ipnSecret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { success: false, message: "SUPABASE_ENV_MISSING" });
  }

  if (!ipnSecret) {
    return jsonResponse(500, { success: false, message: "NOWPAYMENTS_IPN_SECRET_MISSING" });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-nowpayments-sig") ?? "";

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return jsonResponse(400, { success: false, message: "INVALID_JSON" });
  }

  const sortedPayload = sortObject(payload);
  const signaturePayload = JSON.stringify(sortedPayload);
  const expectedSignature = await hmacSha512Hex(ipnSecret, signaturePayload);
  const signatureValid = signatureHeader.toLowerCase() === expectedSignature.toLowerCase();

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const eventHash = await sha256Hex(rawBody);

  const { error: eventInsertError } = await supabase
    .from("payment_webhook_events")
    .insert({
      provider: "nowpayments",
      event_hash: eventHash,
      provider_payment_id: payload.payment_id ? String(payload.payment_id) : null,
      signature: signatureHeader,
      signature_valid: signatureValid,
      payload,
      process_result: "RECEIVED",
    });

  if (eventInsertError && eventInsertError.code === "23505") {
    return jsonResponse(200, { success: true, message: "DUPLICATE_EVENT_IGNORED" });
  }

  if (eventInsertError) {
    return jsonResponse(500, {
      success: false,
      message: "WEBHOOK_EVENT_INSERT_FAILED",
      detail: eventInsertError.message,
    });
  }

  if (!signatureValid) {
    await supabase
      .from("payment_webhook_events")
      .update({
        processed_at: new Date().toISOString(),
        process_result: "INVALID_SIGNATURE",
        error_message: "signature mismatch",
      })
      .eq("event_hash", eventHash);

    return jsonResponse(401, { success: false, message: "INVALID_SIGNATURE" });
  }

  const providerPaymentId = payload.payment_id ? String(payload.payment_id) : null;
  const providerOrderId = payload.order_id ? String(payload.order_id) : null;

  let orderQuery = supabase.from("payment_orders").select("id, status, membership_applied").limit(1);

  if (providerPaymentId) {
    orderQuery = orderQuery.eq("provider_payment_id", providerPaymentId);
  } else if (providerOrderId) {
    orderQuery = orderQuery.eq("id", providerOrderId);
  } else {
    await supabase
      .from("payment_webhook_events")
      .update({
        processed_at: new Date().toISOString(),
        process_result: "ORDER_NOT_RESOLVED",
        error_message: "missing provider ids",
      })
      .eq("event_hash", eventHash);

    return jsonResponse(400, { success: false, message: "ORDER_NOT_RESOLVED" });
  }

  const { data: order, error: orderError } = await orderQuery.maybeSingle();

  if (orderError || !order) {
    await supabase
      .from("payment_webhook_events")
      .update({
        processed_at: new Date().toISOString(),
        process_result: "ORDER_NOT_FOUND",
        error_message: orderError?.message ?? "order not found",
      })
      .eq("event_hash", eventHash);

    return jsonResponse(404, { success: false, message: "ORDER_NOT_FOUND" });
  }

  const providerStatus = payload.payment_status ?? "waiting";
  const mappedStatus = toOrderStatus(providerStatus);
  const txHash = payload.payin_hash ?? payload.purchase_id ?? null;

  const { error: orderUpdateError } = await supabase
    .from("payment_orders")
    .update({
      provider_status: providerStatus,
      status: mappedStatus,
      provider_payment_id: providerPaymentId,
      provider_order_id: providerOrderId,
      pay_address: payload.pay_address ?? null,
      pay_amount: payload.pay_amount ?? null,
      pay_currency: payload.pay_currency ? String(payload.pay_currency).toUpperCase() : null,
      tx_hash: txHash,
      raw_last_webhook: payload,
      paid_at: mappedStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", order.id);

  if (orderUpdateError) {
    await supabase
      .from("payment_webhook_events")
      .update({
        processed_at: new Date().toISOString(),
        process_result: "ORDER_UPDATE_FAILED",
        error_message: orderUpdateError.message,
      })
      .eq("event_hash", eventHash);

    return jsonResponse(500, { success: false, message: "ORDER_UPDATE_FAILED", detail: orderUpdateError.message });
  }

  let applyResult: unknown = null;

  if (mappedStatus === "paid") {
    const { data: applyData, error: applyError } = await supabase.rpc("apply_membership_from_paid_order", {
      p_order_id: order.id,
    });

    if (applyError) {
      await supabase
        .from("payment_webhook_events")
        .update({
          processed_at: new Date().toISOString(),
          process_result: "MEMBERSHIP_APPLY_FAILED",
          error_message: applyError.message,
        })
        .eq("event_hash", eventHash);

      return jsonResponse(500, { success: false, message: "MEMBERSHIP_APPLY_FAILED", detail: applyError.message });
    }

    applyResult = applyData;
  }

  await supabase
    .from("payment_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      process_result: mappedStatus === "paid" ? "PAID_APPLIED" : `STATUS_${mappedStatus.toUpperCase()}`,
      error_message: null,
    })
    .eq("event_hash", eventHash);

  return jsonResponse(200, {
    success: true,
    order_id: order.id,
    provider_status: providerStatus,
    status: mappedStatus,
    membership_result: applyResult,
  });
});
