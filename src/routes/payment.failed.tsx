import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payment/failed")({
  validateSearch: z.object({ reason: z.string().optional() }),
  component: FailedPage,
  head: () => ({
    meta: [
      { title: "Payment failed — Her Guardian" },
      { name: "description", content: "Your Her Guardian subscription payment could not be completed." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function FailedPage() {
  const { reason } = Route.useSearch();
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass-strong rounded-3xl p-8 max-w-md w-full text-center space-y-4">
        <div className="grid place-items-center mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600">
          <XCircle className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Payment failed</h1>
        <p className="text-muted-foreground text-sm">{reason ? `Reason: ${reason}` : "Your payment could not be completed. No money was charged."}</p>
        <div className="flex flex-col gap-2 pt-2">
          <Link to="/pricing" className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 font-semibold text-sm">Try again</Link>
          <Link to="/dashboard" className="rounded-xl glass px-4 py-3 font-medium text-sm hover:bg-white/10">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
