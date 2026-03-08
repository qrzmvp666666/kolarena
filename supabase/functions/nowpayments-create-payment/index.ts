// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

type MembershipPlan = {
  id: number;
  name: string;
  plan_family: string;
  duration: string;
  price: number;
  currency: string;
  is_active: boolean;
};

const SUPPORTED_PAY_CURRENCIES = (Deno.env.get("NOWPAYMENTS_ALLOWED_PAY_CURRENCIES") ?? "USDT,BTC,ETH,SOL,BNB,XRP,DOGE")
  .split(",")
  .map((item) => item.trim().toUpperCase())
  .filter(Boolean);

function resolveProviderPayCurrency(payCurrency: string): string {
  switch (payCurrency.toUpperCase()) {
    case "USDT":
      return (Deno.env.get("NOWPAYMENTS_USDT_CODE") ?? "USDTTRC20").toUpperCase();
    case "BNB":
      return (Deno.env.get("NOWPAYMENTS_BNB_CODE") ?? "BNBBSC").toUpperCase();
    default:
      return payCurrency.toUpperCase();
  }
}

function resolveIpnCallbackUrl(supabaseUrl: string): string {
  const configured = (Deno.env.get("NOWPAYMENTS_IPN_CALLBACK_URL") ?? "").trim();
  const fallback = `${supabaseUrl}/functions/v1/nowpayments-webhook`;

  if (!configured) return fallback;

  const normalized = configured.toLowerCase();
  if (normalized.includes("localhost") || !normalized.includes("/functions/v1/nowpayments-webhook")) {
    return fallback;
  }

  return configured;
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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
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
    console.error("Auth validation failed", {
      detail: userError?.message ?? null,
      hasJwt: Boolean(jwt),
      jwtLength: jwt.length,
    });
    return jsonResponse(401, {
      success: false,
      message: "NOT_AUTHENTICATED",
      detail: userError?.message ?? null,
    });
  }

  let body: { planId?: number; payCurrency?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { success: false, message: "INVALID_JSON" });
  }

  const planId = Number(body.planId);
  if (!Number.isFinite(planId) || planId <= 0) {
    return jsonResponse(400, { success: false, message: "INVALID_PLAN_ID" });
  }

  const payCurrency = (body.payCurrency ?? "USDT").toUpperCase().trim();
  if (!SUPPORTED_PAY_CURRENCIES.includes(payCurrency)) {
    return jsonResponse(400, {
      success: false,
      message: "PAY_CURRENCY_NOT_SUPPORTED",
      supported: SUPPORTED_PAY_CURRENCIES,
    });
  }

  const providerPayCurrency = resolveProviderPayCurrency(payCurrency);

  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("id,name,plan_family,duration,price,currency,is_active")
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle<MembershipPlan>();

  if (planError || !plan) {
    return jsonResponse(404, { success: false, message: "PLAN_NOT_AVAILABLE" });
  }

  const planFamily = ["pro", "max", "lifetime"].includes((plan.plan_family ?? "").toLowerCase())
    ? plan.plan_family.toLowerCase()
    : plan.duration === "lifetime"
      ? "lifetime"
      : "pro";

  const { data: order, error: orderError } = await supabase
    .from("payment_orders")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      plan_name: plan.name,
      plan_family: planFamily,
      plan_duration: plan.duration,
      price_amount: plan.price,
      price_currency: String(plan.currency).toUpperCase(),
      pay_currency: providerPayCurrency,
      status: "pending",
      provider: "nowpayments",
    })
    .select("id, plan_name, plan_family, plan_duration, price_amount, price_currency, pay_currency, status")
    .single();

  if (orderError || !order) {
    return jsonResponse(500, { success: false, message: "ORDER_CREATE_FAILED", detail: orderError?.message });
  }

  const callbackUrl = resolveIpnCallbackUrl(supabaseUrl);
  const successUrl = Deno.env.get("NOWPAYMENTS_SUCCESS_URL");
  const cancelUrl = Deno.env.get("NOWPAYMENTS_CANCEL_URL");

  const createPayload: Record<string, unknown> = {
    price_amount: Number(order.price_amount),
    price_currency: String(order.price_currency).toLowerCase(),
    pay_currency: providerPayCurrency.toLowerCase(),
    order_id: order.id,
    order_description: `${order.plan_name} membership`,
    is_fixed_rate: true,
    is_fee_paid_by_user: true,
  };

  createPayload.ipn_callback_url = callbackUrl;
  if (successUrl) createPayload.success_url = successUrl;
  if (cancelUrl) createPayload.cancel_url = cancelUrl;

  let providerResponse: any = null;
  let providerStatus = "waiting";

  try {
    const createPaymentRes = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "x-api-key": nowpaymentsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
    });

    providerResponse = await createPaymentRes.json().catch(() => null);

    if (!createPaymentRes.ok) {
      await supabase
        .from("payment_orders")
        .update({
          status: "failed",
          provider_status: "create_failed",
          raw_create_response: providerResponse,
        })
        .eq("id", order.id);

      return jsonResponse(502, {
        success: false,
        message: "NOWPAYMENTS_CREATE_FAILED",
        detail: providerResponse,
      });
    }

    providerStatus = providerResponse?.payment_status ?? "waiting";

    await supabase
      .from("payment_orders")
      .update({
        provider_payment_id: providerResponse?.payment_id ? String(providerResponse.payment_id) : null,
        provider_order_id: providerResponse?.order_id ? String(providerResponse.order_id) : String(order.id),
        provider_status: providerStatus,
        status: toOrderStatus(providerStatus),
        invoice_url: providerResponse?.invoice_url ?? null,
        pay_address: providerResponse?.pay_address ?? null,
        pay_amount: providerResponse?.pay_amount ?? null,
        pay_currency: providerResponse?.pay_currency ? String(providerResponse.pay_currency).toUpperCase() : providerPayCurrency,
        raw_create_response: providerResponse,
      })
      .eq("id", order.id);

    return jsonResponse(200, {
      success: true,
      order: {
        id: order.id,
        plan_name: order.plan_name,
        plan_family: order.plan_family,
        plan_duration: order.plan_duration,
        price_amount: order.price_amount,
        price_currency: order.price_currency,
        pay_currency: providerResponse?.pay_currency ? String(providerResponse.pay_currency).toUpperCase() : providerPayCurrency,
        pay_amount: providerResponse?.pay_amount ?? null,
        pay_address: providerResponse?.pay_address ?? null,
        invoice_url: providerResponse?.invoice_url ?? null,
        provider_payment_id: providerResponse?.payment_id ? String(providerResponse.payment_id) : null,
        provider_status: providerStatus,
        status: toOrderStatus(providerStatus),
      },
    });
  } catch (error) {
    await supabase
      .from("payment_orders")
      .update({
        status: "failed",
        provider_status: "create_error",
        raw_create_response: providerResponse,
      })
      .eq("id", order.id);

    return jsonResponse(500, {
      success: false,
      message: "NOWPAYMENTS_CREATE_ERROR",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});
