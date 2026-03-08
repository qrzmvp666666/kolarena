// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

type PaymentOrderRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_payment_id: string | null;
  provider_order_id: string | null;
  provider_status: string | null;
  status: string;
  pay_address: string | null;
  pay_amount: number | null;
  pay_currency: string | null;
  tx_hash: string | null;
  paid_at: string | null;
  membership_applied: boolean | null;
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, message: "METHOD_NOT_ALLOWED" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const nowpaymentsApiKey = Deno.env.get("NOWPAYMENTS_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { success: false, message: "SUPABASE_ENV_MISSING" });
  }

  if (!nowpaymentsApiKey) {
    return jsonResponse(500, { success: false, message: "NOWPAYMENTS_API_KEY_MISSING" });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse(401, { success: false, message: "NOT_AUTHENTICATED" });
  }

  const jwt = authorization.slice(7).trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(jwt);

  if (userError || !user) {
    return jsonResponse(401, {
      success: false,
      message: "NOT_AUTHENTICATED",
      detail: userError?.message ?? null,
    });
  }

  let body: { limit?: number; offset?: number } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const limit = Math.min(Math.max(Number(body.limit ?? 20), 1), 50);
  const offset = Math.max(Number(body.offset ?? 0), 0);

  const { data: orders, error: ordersError } = await supabase
    .from("payment_orders")
    .select("id,user_id,provider,provider_payment_id,provider_order_id,provider_status,status,pay_address,pay_amount,pay_currency,tx_hash,paid_at,membership_applied")
    .eq("user_id", user.id)
    .eq("provider", "nowpayments")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (ordersError) {
    return jsonResponse(500, { success: false, message: "ORDERS_FETCH_FAILED", detail: ordersError.message });
  }

  const syncableOrders = ((orders ?? []) as PaymentOrderRow[]).filter((order) =>
    Boolean(order.provider_payment_id) && !["failed", "expired", "refunded", "completed"].includes(String(order.status || "").toLowerCase())
  );

  let updatedCount = 0;
  let appliedCount = 0;
  const results: Array<Record<string, unknown>> = [];

  for (const order of syncableOrders) {
    const providerPaymentId = String(order.provider_payment_id);

    try {
      const statusRes = await fetch(`https://api.nowpayments.io/v1/payment/${providerPaymentId}`, {
        method: "GET",
        headers: {
          "x-api-key": nowpaymentsApiKey,
        },
      });

      const providerData = await statusRes.json().catch(() => null);

      if (!statusRes.ok) {
        results.push({
          order_id: order.id,
          provider_payment_id: providerPaymentId,
          success: false,
          message: providerData?.message ?? "PROVIDER_STATUS_FETCH_FAILED",
        });
        continue;
      }

      const providerStatus = providerData?.payment_status ?? order.provider_status ?? "waiting";
      const mappedStatus = toOrderStatus(providerStatus);
      const nextTxHash = providerData?.payin_hash ?? providerData?.purchase_id ?? order.tx_hash ?? null;
      const nextPayCurrency = providerData?.pay_currency ? String(providerData.pay_currency).toUpperCase() : order.pay_currency;
      const nextPayAmount = providerData?.pay_amount ?? order.pay_amount;
      const nextPayAddress = providerData?.pay_address ?? order.pay_address;

      const changed =
        String(order.provider_status ?? "") !== String(providerStatus ?? "") ||
        String(order.status ?? "") !== String(mappedStatus ?? "") ||
        String(order.tx_hash ?? "") !== String(nextTxHash ?? "") ||
        String(order.pay_currency ?? "") !== String(nextPayCurrency ?? "") ||
        Number(order.pay_amount ?? 0) !== Number(nextPayAmount ?? 0) ||
        String(order.pay_address ?? "") !== String(nextPayAddress ?? "");

      if (changed) {
        const { error: updateError } = await supabase
          .from("payment_orders")
          .update({
            provider_status: providerStatus,
            status: mappedStatus,
            provider_order_id: providerData?.order_id ? String(providerData.order_id) : order.provider_order_id,
            pay_address: nextPayAddress,
            pay_amount: nextPayAmount,
            pay_currency: nextPayCurrency,
            tx_hash: nextTxHash,
            paid_at: mappedStatus === "paid" ? (order.paid_at ?? new Date().toISOString()) : order.paid_at,
          })
          .eq("id", order.id);

        if (updateError) {
          results.push({
            order_id: order.id,
            provider_payment_id: providerPaymentId,
            success: false,
            message: updateError.message,
          });
          continue;
        }

        updatedCount += 1;
      }

      let membershipResult: unknown = null;
      if (mappedStatus === "paid" && !order.membership_applied) {
        const { data: applyData, error: applyError } = await supabase.rpc("apply_membership_from_paid_order", {
          p_order_id: order.id,
        });

        if (!applyError) {
          membershipResult = applyData;
          appliedCount += 1;
        } else {
          membershipResult = { success: false, message: applyError.message };
        }
      }

      results.push({
        order_id: order.id,
        provider_payment_id: providerPaymentId,
        success: true,
        provider_status: providerStatus,
        status: mappedStatus,
        membership_result: membershipResult,
      });
    } catch (error) {
      results.push({
        order_id: order.id,
        provider_payment_id: providerPaymentId,
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return jsonResponse(200, {
    success: true,
    scanned: syncableOrders.length,
    updated: updatedCount,
    applied: appliedCount,
    results,
  });
});
