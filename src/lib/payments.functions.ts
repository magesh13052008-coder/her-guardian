import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PlanInput = z.object({ plan_id: z.enum(["premium", "super_premium"]) });

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PlanInput.parse(d))
  .handler(async ({ data, context }) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID?.trim();
      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
      if (!keyId || !keySecret) {
        console.error("[payments] Razorpay keys not configured");
        throw new Error("Payment service is not configured. Please try again later.");
      }
      if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
        console.error(`[payments] RAZORPAY_KEY_ID has wrong format (starts with "${keyId.slice(0, 8)}")`);
        throw new Error("Payment service is misconfigured. Please contact support.");
      }
      if (keySecret.startsWith("rzp_")) {
        console.error("[payments] RAZORPAY_KEY_SECRET appears to be a Key ID (starts with rzp_)");
        throw new Error("Payment service is misconfigured. Please contact support.");
      }

      const { data: plan, error: planErr } = await supabaseAdmin
        .from("subscription_plans")
        .select("id, name, price_inr")
        .eq("id", data.plan_id)
        .single();
      if (planErr || !plan) {
        if (planErr) console.error("[payments] plan lookup failed:", planErr);
        throw new Error("Selected plan is unavailable.");
      }
      if (plan.price_inr <= 0) throw new Error("Free plan does not require payment");

      const amountPaise = plan.price_inr * 100;
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `sub_${context.userId.slice(0, 8)}_${Date.now()}`,
          notes: { user_id: context.userId, plan_id: plan.id },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[payments] Razorpay order failed (${res.status}): ${body}`);
        throw new Error("Could not start payment. Please try again.");
      }
      const order = (await res.json()) as { id: string; amount: number; currency: string };

      const { error: insErr } = await supabaseAdmin.from("payment_transactions").insert({
        user_id: context.userId,
        plan_id: plan.id,
        razorpay_order_id: order.id,
        amount_inr: plan.price_inr,
        status: "created",
      });
      if (insErr) {
        console.error("[payments] payment_transactions insert failed:", insErr);
        throw new Error("Could not start payment. Please try again.");
      }

      return {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: keyId,
        plan_name: plan.name,
      };
    } catch (err) {
      if (err instanceof Error && /^(Payment|Selected plan|Could not|Free plan)/.test(err.message)) throw err;
      console.error("[payments] createRazorpayOrder unexpected error:", err);
      throw new Error("Payment could not be processed. Please try again.");
    }
  });


const VerifyInput = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VerifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("[payments] Razorpay secret not configured");
      throw new Error("Payment service is not configured. Please try again later.");
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");

    const ok =
      expected.length === data.razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(data.razorpay_signature));

    if (!ok) {
      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "failed", razorpay_payment_id: data.razorpay_payment_id })
        .eq("razorpay_order_id", data.razorpay_order_id)
        .eq("user_id", context.userId);
      console.warn(`[payments] invalid signature for order=${data.razorpay_order_id} user=${context.userId}`);
      throw new Error("Payment could not be verified. Please contact support if you were charged.");
    }

    const { data: tx, error: txErr } = await supabaseAdmin
      .from("payment_transactions")
      .select("plan_id, status")
      .eq("razorpay_order_id", data.razorpay_order_id)
      .eq("user_id", context.userId)
      .single();
    if (txErr || !tx) {
      if (txErr) console.error("[payments] tx lookup failed:", txErr);
      throw new Error("Payment could not be verified. Please contact support if you were charged.");
    }
    if (tx.status === "paid") {
      console.warn(`[payments] replay attempt for order=${data.razorpay_order_id} user=${context.userId}`);
      throw new Error("This payment has already been processed.");
    }
    const planId = tx.plan_id;

    await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: "paid",
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      })
      .eq("razorpay_order_id", data.razorpay_order_id)
      .eq("user_id", context.userId);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabaseAdmin
      .from("user_subscriptions")
      .update({ status: "cancelled", updated_at: now.toISOString() })
      .eq("user_id", context.userId)
      .eq("status", "active");

    const { error: insErr } = await supabaseAdmin.from("user_subscriptions").insert({
      user_id: context.userId,
      plan_id: planId,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_order_id: data.razorpay_order_id,
    });
    if (insErr) {
      console.error("[payments] user_subscriptions insert failed:", insErr);
      throw new Error("Payment was verified but activating your plan failed. Please contact support.");
    }

    return { success: true, plan_id: planId, period_end: periodEnd.toISOString() };
  });



export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("user_subscriptions")
      .select("id, plan_id, status, current_period_end, created_at")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { subscription: data ?? null };
  });
