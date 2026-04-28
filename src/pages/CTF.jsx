import React, { useState } from "react";
import SentinelInterface from "@/components/ctf/SentinelInterface";
import CrowdStrikeInterface from "@/components/ctf/CrowdStrikeInterface";
import InvestigationTracker from "@/components/ctf/InvestigationTracker";
import { InvestigationProvider } from "@/components/ctf/InvestigationContext";
import { Shield, ChevronRight, ClipboardList } from "lucide-react";

const TABS = [
  {
    id: "sentinel",
    label: "Microsoft Sentinel",
  },
  {
    id: "crowdstrike",
    label: "CrowdStrike Falcon",
  },
];

export default function CTFPage() {
  const [activeTab, setActiveTab] = useState("sentinel");
  const [showTracker, setShowTracker] = useState(true);

  return (
    <InvestigationProvider>
      <div className="h-screen bg-[#1a1a2e] text-white flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-[#0d0d1a] border-b border-slate-700/50 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-teal-400" />
            <span className="text-sm text-slate-400">CTF Investigation Platform</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-sm text-white font-semibold">
              {activeTab === "sentinel" ? "Microsoft Sentinel" : "CrowdStrike Falcon"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              Live Environment
            </div>
            <button
              onClick={() => setShowTracker(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${
                showTracker
                  ? "bg-teal-600/20 border-teal-500/40 text-teal-300 hover:bg-teal-600/30"
                  : "bg-slate-800 border-slate-700/50 text-slate-400 hover:text-white"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Investigation Log
            </button>
          </div>
        </div>

        {/* Platform Selector */}
        <div className="bg-[#0f0f1f] border-b border-slate-700/30 px-6 pt-0 flex-shrink-0">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-8 py-3.5 text-sm font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? tab.id === "sentinel"
                      ? "text-blue-300 border-blue-500 bg-blue-900/20"
                      : "text-red-300 border-red-500 bg-red-900/20"
                    : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {tab.id === "sentinel" ? (
                    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                      <path d="M24 4L44 14V34L24 44L4 34V14L24 4Z" fill="#0078d4" opacity="0.8"/>
                      <path d="M24 12L36 18V30L24 36L12 30V18L24 12Z" fill="#50e6ff" opacity="0.6"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="24" r="20" fill="#e2231a" opacity="0.8"/>
                      <path d="M16 20L24 14L32 20V28L24 34L16 28V20Z" fill="white" opacity="0.9"/>
                    </svg>
                  )}
                  {tab.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content + Tracker */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {activeTab === "sentinel" ? <SentinelInterface /> : <CrowdStrikeInterface />}
          </div>
          {showTracker && (
            <div className="w-72 flex-shrink-0 overflow-hidden">
              <InvestigationTracker onClose={() => setShowTracker(false)} />
            </div>
          )}
        </div>
      </div>
    </InvestigationProvider>
  );
}