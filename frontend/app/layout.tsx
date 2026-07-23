import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "AgentPulse | Observability",
  description: "AI-native observability system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body
        className={cn(
          "h-full font-sans antialiased bg-background text-foreground",
          outfit.variable
        )}
      >
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Script type="module" src="https://unpkg.com/@splinetool/viewer@1.0.91/build/spline-viewer.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
