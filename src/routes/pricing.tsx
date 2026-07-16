import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Shield, Sparkles, Crown, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRazorpayOrder, verifyRazorpayPayment, getMySubscription } from "@/lib/payments.functions";

type Plan = { id: string; name: string; price_inr: number; tier: number; features: string[] };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — Her Guardian 2.0" },
      { name: "description", content: "Choose the safety plan that protects you best — Free, Premium and Super Premium plans for women's personal safety." },
      { property: "og:title", content: "Pricing — Her Guardian 2.0" },
      { property: "og:description", content: "Free, Premium and Super Premium plans for women's personal safety." },
      { property: "og:url", content: "https://https-her-guardian-app-com.lovable.app/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://https-her-guardian-app-com.lovable.app/pricing" }],
  }),
});

function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const createOrder = useServerFn(createRazorpayOrder);
  const verifyPayment = useServerFn(verifyRazorpayPayment);
  const fetchSub = useServerFn(getMySubscription);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id,name,price_inr,tier,features")
        .eq("active", true)
        .order("tier", { ascending: true });
      setPlans((data ?? []) as Plan[]);
      try {
        const r = await fetchSub();
        setCurrentPlanId(r.subscription?.plan_id ?? "free");
      } catch {
        setCurrentPlanId(null);
      }
      setLoading(false);
    })();
  }, [fetchSub]);

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") {
      toast.success("You're on the Free plan");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setProcessing(planId);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay");
      const order = await createOrder({ data: { plan_id: planId as "premium" | "super_premium" } });

      const rzp = new window.Razorpay!({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Her Guardian",
        description: `${order.plan_name} subscription`,
        order_id: order.order_id,
        theme: { color: "#ec4899" },
        prefill: { email: user.email ?? "" },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await verifyPayment({
              data: {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
            });
            navigate({ to: "/payment/success", search: { plan: planId } });
          } catch (e: any) {
            console.error("[pricing] payment verification failed:", e);
            navigate({ to: "/payment/failed", search: { reason: "verification_failed" } });
          }

        },
        modal: {
          ondismiss: () => setProcessing(null),
        },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message ?? "Payment failed");
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-pink-400" /></div>;
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="mx-auto max-w-6xl glass-strong rounded-2xl px-5 py-3 flex items-center justify-between mb-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm hover:text-pink-400 transition"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 glow-pink"><Shield className="h-5 w-5 text-white" /></div>
          <span className="font-bold">Pricing</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-pink-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">Choose your safety</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Upgrade for live tracking, AI threat detection, voice-activated SOS and more. Cancel anytime.</p>
      </div>

      <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-5">
        {plans.map((p) => <PlanCard key={p.id} plan={p} current={currentPlanId === p.id} processing={processing === p.id} onSubscribe={() => handleSubscribe(p.id)} />)}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">Secured by Razorpay · UPI · Cards · Netbanking</p>
    </div>
  );
}

function PlanCard({ plan, current, processing, onSubscribe }: { plan: Plan; current: boolean; processing: boolean; onSubscribe: () => void }) {
  const isPremium = plan.id === "premium";
  const isSuper = plan.id === "super_premium";
  const isFree = plan.id === "free";

  const cardStyle = isSuper
    ? "bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-700/20 border-amber-400/40 ring-1 ring-amber-300/30"
    : isPremium
    ? "bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-600/20 border-blue-400/40"
    : "bg-white/5 border-white/10";

  const icon = isSuper ? <Crown className="h-6 w-6 text-amber-300" /> : isPremium ? <Sparkles className="h-6 w-6 text-blue-300" /> : <Shield className="h-6 w-6 text-pink-300" />;

  const btnStyle = isSuper
    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:shadow-lg hover:shadow-amber-500/30"
    : isPremium
    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/30"
    : "glass hover:bg-white/10 text-foreground";

  return (
    <div className={`glass-strong border rounded-3xl p-6 flex flex-col relative transition hover:-translate-y-1 ${cardStyle}`}>
      {isSuper && <span className="absolute -top-3 right-5 text-[10px] uppercase tracking-wider font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-3 py-1 rounded-full">Most Protection</span>}
      <div className="flex items-center gap-2 mb-1">{icon}<h3 className="font-bold text-lg">{plan.name}</h3></div>
      <div className="mb-4">
        <span className="text-4xl font-bold">₹{plan.price_inr}</span>
        <span className="text-muted-foreground text-sm">/month</span>
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className={`h-4 w-4 shrink-0 mt-0.5 ${isSuper ? "text-amber-300" : isPremium ? "text-blue-300" : "text-emerald-400"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onSubscribe}
        disabled={current || processing || isFree}
        className={`rounded-xl px-4 py-3 font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${btnStyle}`}
      >
        {processing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : current ? "Current plan" : isFree ? "Default" : `Subscribe — ₹${plan.price_inr}/mo`}
      </button>
    </div>
  );
}
