"use client";

import { useState, useEffect } from "react";
import { Globe } from "@/components/ui/globe";
import { Github, Mail, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in or show error if OAuth failed
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/dashboard");
      }
    });

    if (searchParams.get("error") === "auth_failed") {
      setError("Authentication failed. Please try again.");
    }
  }, [router, searchParams, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleGithubLogin = async () => {
    setIsGithubLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background 3D Globe */}
      <Globe />

      {/* Foreground Content */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-0">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4 backdrop-blur-sm">
            <span className="text-2xl font-bold text-primary">A</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
            Welcome to AgentPulse
          </h1>
          <p className="text-sm text-gray-400 text-center">
            Sign in to access your AI observability dashboard.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* GitHub OAuth Button */}
          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={isGithubLoading}
            className="w-full h-11 rounded-xl bg-white text-black font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isGithubLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Github className="h-4 w-4" />
                Continue with GitHub
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-black/60 px-3 text-[11px] font-mono text-gray-500 uppercase tracking-widest absolute">
              or
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-gray-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer mt-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Need access? Ask your administrator or team lead.
        </p>
      </div>
    </div>
  );
}
