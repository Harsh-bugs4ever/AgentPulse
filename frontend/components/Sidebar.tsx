"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LayoutDashboard, ShieldAlert, Sparkles, Receipt, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStatus } from "./AgentStatus";
import { Logo } from "./Logo";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Traces", href: "/trace", icon: Activity },
  { name: "SRE Sidekick", href: "/sidekick", icon: ShieldAlert },
  { name: "Cost Watchdog", href: "/cost", icon: Receipt },
  { name: "Self-Healing", href: "/healing", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (pathname === "/login" || pathname === "/") return null;

  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? user?.user_metadata?.user_name?.[0]?.toUpperCase() ?? "?";
  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.user_name ?? user?.email?.split("@")[0] ?? "User";
  const displayEmail = user?.email ?? "";

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-background pt-8 pb-4">
      <div className="px-6 pb-8">
        <h1 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">
          <Logo className="h-5 w-5 text-primary" />
          AgentPulse
        </h1>
        <p className="text-sm text-muted-foreground mt-1 ml-7">AI Observability</p>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Agent status */}
      <div className="px-6 pt-4 border-t border-border">
        <AgentStatus className="w-full justify-center" />
      </div>

      {/* User profile + sign out */}
      {user && (
        <div className="px-4 pt-4 mt-2 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <span className="text-sm font-semibold text-primary">{avatarLetter}</span>
              )}
            </div>
            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              {displayEmail && (
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              )}
            </div>
            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
