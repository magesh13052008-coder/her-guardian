import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Her Guardian 2.0" },
      { name: "description", content: "Sign in to Her Guardian to access SOS alerts, live tracking, and trusted contact management." },
      { property: "og:title", content: "Sign in — Her Guardian 2.0" },
      { property: "og:description", content: "Access SOS alerts, live tracking, and trusted contact management." },
      { property: "og:url", content: "https://https-her-guardian-app-com.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://https-her-guardian-app-com.lovable.app/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard" });
  }, [user, authLoading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created! Redirecting...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };
 const google = async () => {
  setLoading(true);
  const google = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-500/10 via-transparent to-purple-600/20" />
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 glow-pink">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">Her Guardian <span className="text-gradient">2.0</span></span>
        </Link>

        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-center">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to access your safety dashboard" : "Join Her Guardian to stay protected"}
          </p>

          <button onClick={google} disabled={loading}
            className="mt-6 w-full glass rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-50">
            <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4.1 5.4l6.2 5.2C40.6 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-white/10" /> OR <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400/50" />
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full glass rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400/50" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full glass rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400/50" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white glow-pink hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-pink-400 hover:underline font-medium">
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>

        <Link to="/" className="block text-center mt-6 text-xs text-muted-foreground hover:text-foreground transition">← Back to home</Link>
      </div>
    </div>
  );
}
