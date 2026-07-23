"use client";

import Link from "next/link";
import { ArrowLeft, Book, Code, Terminal, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 p-6 md:p-12 max-w-[1400px] mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-12">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>
      
      <div className="max-w-[800px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.1] mb-6">
            Documentation
          </h1>
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            Welcome to the AgentPulse documentation. Learn how to monitor, trace, and debug your AI research agents in real-time.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid sm:grid-cols-2 gap-6"
        >
          <DocCard 
            icon={Zap}
            title="Quickstart"
            description="Get up and running with AgentPulse in less than 5 minutes."
            href="#"
          />
          <DocCard 
            icon={Code}
            title="SDK Reference"
            description="Detailed API reference for our Python and Node.js SDKs."
            href="#"
          />
          <DocCard 
            icon={Terminal}
            title="CLI Tool"
            description="Manage your projects and view traces directly from the terminal."
            href="#"
          />
          <DocCard 
            icon={Book}
            title="Guides"
            description="In-depth tutorials and guides on advanced tracing techniques."
            href="#"
          />
        </motion.div>
      </div>
    </div>
  );
}

function DocCard({ icon: Icon, title, description, href }: { icon: any, title: string, description: string, href: string }) {
  return (
    <Link href={href} className="group block p-6 rounded-2xl border border-border bg-card hover:bg-secondary/20 transition-all hover:border-primary/50">
      <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">{title}</h2>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}
