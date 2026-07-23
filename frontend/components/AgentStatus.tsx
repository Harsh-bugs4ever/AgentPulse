"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Activity, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "Healthy" | "Healing" | "Recovered" | "Investigating";

interface AgentStatusProps {
  className?: string;
  forceStatus?: Status | null;
}

export function AgentStatus({ className, forceStatus = null }: AgentStatusProps) {
  const [fetchedStatus, setFetchedStatus] = useState<Status>("Healthy");

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setFetchedStatus(data.status as Status);
        }
      }
    } catch (err) {
      console.error("Failed to fetch health status", err);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchHealth();

    // Listen for custom actions/events to refresh status
    const handleRefresh = () => {
      fetchHealth();
    };

    window.addEventListener("agent-health-refresh", handleRefresh);
    return () => {
      window.removeEventListener("agent-health-refresh", handleRefresh);
    };
  }, []);

  const currentStatus = forceStatus || fetchedStatus;

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium transition-all duration-500",
      currentStatus === "Healthy" ? "bg-primary/10 border-primary/20 text-primary" :
      currentStatus === "Recovered" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
      currentStatus === "Investigating" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
      "bg-yellow-500/10 border-yellow-500/20 text-yellow-500", // Healing
      className
    )}>
      {currentStatus === "Investigating" ? <Loader2 className="h-4 w-4 animate-spin" /> : 
       currentStatus === "Healthy" ? <CheckCircle2 className="h-4 w-4" /> : 
       currentStatus === "Recovered" ? <CheckCircle2 className="h-4 w-4" /> :
       <Zap className="h-4 w-4 animate-pulse" />}
      {currentStatus === "Healing" ? "⚡ Self-Healing..." : 
       currentStatus === "Recovered" ? "✅ Recovered" : currentStatus}
    </div>
  );
}
