"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, ShieldAlert, Sparkles, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStatus } from "./AgentStatus";
import { Logo } from "./Logo";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Traces", href: "/trace", icon: Activity },
  { name: "SRE Sidekick", href: "/sidekick", icon: ShieldAlert },
  { name: "Cost Watchdog", href: "/cost", icon: Receipt },
  { name: "Self-Healing", href: "/healing", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/") return null;

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
      
      <div className="px-6 pt-4 border-t border-border">
        <AgentStatus className="w-full justify-center" />
      </div>
    </div>
  );
}
