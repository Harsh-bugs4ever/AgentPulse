"use client";

import Link from "next/link";
import { ArrowRight, Activity, Receipt, Sparkles, ShieldAlert, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import ConfettiBackground from "@/components/ui/confetti-background";
import { GradientButton } from "@/components/ui/gradient-button";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
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
              className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed font-normal"
            >
              Real-time traces, self-healing fallbacks, SRE automated root-cause analysis, and token cost tracking for your AI agent pipelines.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors gap-2"
              >
                Launch Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <GradientButton asChild variant="variant">
                <Link href="/docs">Read Docs</Link>
              </GradientButton>
            </motion.div>
          </div>

          <div className="relative h-[450px] md:h-[550px] w-full rounded-3xl overflow-hidden border border-border/50 bg-card/30 backdrop-blur-sm">
            <InteractiveRobotSpline scene={ROBOT_SCENE_URL} className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-20 px-6 md:px-12 max-w-[1400px] mx-auto border-t border-border/40">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-12">
          Core Platform Capabilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={Activity}
            title="Trace Telemetry"
            description="OpenTelemetry spans for every LLM completion, search tool, and strategy execution."
            href="/trace"
          />
          <FeatureCard
            icon={ShieldAlert}
            title="SRE Sidekick"
            description="Automated incident response with real-time error rate calculations and AI analysis."
            href="/sidekick"
          />
          <FeatureCard
            icon={Receipt}
            title="Cost Watchdog"
            description="Track USD cost per query, model token counts, and session budget analytics."
            href="/cost"
          />
          <FeatureCard
            icon={Sparkles}
            title="Self-Healing"
            description="Automatic fallback strategies when upstream APIs fail or return errors."
            href="/healing"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="relative group block rounded-2xl border border-border p-6 bg-card hover:bg-card/80 transition-all">
      <GlowingEffect blur={0} borderWidth={1} spread={15} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div className="p-3 w-fit rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}
