import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Shield } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payment/success")({
  validateSearch: z.object({ plan: z.string().optional() }),
  component: SuccessPage,
  head: () => ({
    meta: [
      { title: "Payment successful — Her Guardian" },
      { name: "description", content: "Your Her Guardian subscription payment was completed successfully." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SuccessPage() {
  const { plan } = Route.useSearch();
  const planName = plan === "super_premium" ? "Super Premium" : plan === "premium" ? "Premium" : "your plan";
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass-strong rounded-3xl p-8 max-w-md w-full text-center space-y-4">
        <div className="grid place-items-center mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 glow-pink">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Payment successful</h1>
        <p className="text-muted-foreground text-sm">Welcome to <span className="text-foreground font-semibold">{planName}</span>. Your safety features are now unlocked.</p>
        <div className="flex flex-col gap-2 pt-2">
          <Link to="/dashboard" className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2"><Shield className="h-4 w-4" /> Go to Dashboard</Link>
          <Link to="/settings" className="rounded-xl glass px-4 py-3 font-medium text-sm hover:bg-white/10">Manage subscription</Link>
        </div>
      </div>
    </div>
  );
}
