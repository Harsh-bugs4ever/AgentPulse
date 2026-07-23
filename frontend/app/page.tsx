"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Activity, Receipt, Sparkles, ShieldAlert, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import ConfettiBackground from "@/components/ui/confetti-background";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("no-scrollbar");
    document.body.classList.add("no-scrollbar");

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      document.documentElement.classList.remove("no-scrollbar");
      document.body.classList.remove("no-scrollbar");
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 overflow-x-hidden relative no-scrollbar">
      <ConfettiBackground />
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6 text-primary" />
          <span className="font-medium text-lg tracking-tight">AgentPulse</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  setUser(null);
                }}
                className="text-sm font-medium bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link href="/dashboard" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="max-w-[65ch]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.1] mb-6">
                AI-native observability for autonomous systems.
              </h1>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-[50ch] leading-relaxed"
            >
              Monitor, trace, and debug your AI research agents in real-time. Better traces, better observability, better demonstrations.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4"
            >
              <Link 
                href="/dashboard" 
                className="group flex items-center gap-2 bg-primary text-primary-foreground font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-all"
              >
                {user ? "Go to Dashboard" : "Start tracing"}{" "}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              {!user && (
                <Link 
                  href="/login" 
                  className="font-medium px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
              )}
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative h-[400px] lg:h-[600px] w-full rounded-3xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center isolate"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
             <div className="w-full h-full scale-[1.2]">
               <InteractiveRobotSpline scene={ROBOT_SCENE_URL} />
             </div>
             
             {/* Floating UI Elements */}
             <div className="absolute bottom-8 left-8 right-8 bg-card/80 backdrop-blur-md border border-border rounded-xl p-4 flex items-center gap-4 shadow-2xl">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium font-mono">agent.run</p>
                  <p className="text-xs text-muted-foreground">Search completed • 2.4s</p>
                </div>
                <div className="text-xs font-mono text-primary">$0.002</div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="px-6 md:px-12 py-20 max-w-[1400px] mx-auto border-t border-border">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter mb-4">Core Capabilities</h2>
          <p className="text-muted-foreground max-w-[50ch]">Built specifically for autonomous AI agents, not standard web applications.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={Activity}
            title="Live Telemetry"
            description="Watch every LLM call, tool execution, and reasoning step stream in real-time."
            delay={0}
          />
          <FeatureCard 
            icon={Receipt}
            title="Cost Watchdog"
            description="Track token usage and USD costs per session. Never get surprised by your API bill again."
            delay={0.1}
          />
          <FeatureCard 
            icon={Sparkles}
            title="Self-Healing"
            description="Agents that detect their own failures, trace the root cause, and autonomously recover."
            delay={0.2}
          />
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 max-w-[1400px] mx-auto border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">AgentPulse</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} AgentPulse. Built for the AI Observability Hackathon.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="list-none"
    >
      <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative flex h-full flex-col gap-6 overflow-hidden rounded-xl border-[0.75px] bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] md:p-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-3">
            <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance text-foreground">
              {title}
            </h3>
            <p className="font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
