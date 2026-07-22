"use client";

import { useState } from "react";
import { Globe } from "@/components/ui/globe";
import { Github, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      router.push("/");
    }, 1500);
  };

  const handleGithubLogin = () => {
    setIsGithubLoading(true);
    // Simulate github login
    setTimeout(() => {
      setIsGithubLoading(false);
      router.push("/");
    }, 1500);
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

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle gradient overlay for the glass effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 mb-6">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-700 bg-white/5 text-primary focus:ring-primary/50" />
                  Remember me
                </label>
                <Link href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGithubLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl px-4 py-2.5 text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 mb-6 flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Or continue with
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={isLoading || isGithubLoading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGithubLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Github className="h-4 w-4" />
              )}
              Log in with GitHub
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          By signing in, you agree to our{" "}
          <Link href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>{" "}
          and{" "}
          <Link href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
