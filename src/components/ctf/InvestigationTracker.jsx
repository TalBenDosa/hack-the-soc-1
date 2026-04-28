import React, { useState } from "react";
import { useInvestigation } from "./InvestigationContext";
import { ClipboardList, Trash2, ChevronDown, ChevronUp, Eye, FileText, Search, Shield, Terminal, Network, AlertTriangle, CheckSquare, X } from "lucide-react";

const STEP_ICONS = {
  view_incident:    { icon: Eye,           color: "text-blue-400",   bg: "bg-blue-900/30",   label: "Viewed Incident" },
  view_detection:   { icon: Eye,           color: "text-red-400",    bg: "bg-red-900/30",    label: "Viewed Detection" },
  open_raw_log:     { icon: Terminal,      color: "text-green-400",  bg: "bg-green-900/30",  label: "Opened Raw Log" },
  open_evidence:    { icon: FileText,      color: "text-yellow-400", bg: "bg-yellow-900/30", label: "Opened Evidence" },
  open_behaviors:   { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-900/30", label: "Examined Behaviors" },
  open_network:     { icon: Network,       color: "text-cyan-400",   bg: "bg-cyan-900/30",   label: "Checked Network" },
  check_iocs:       { icon: Search,        color: "text-purple-400", bg: "bg-purple-900/30", label: "Checked IOCs" },
  check_hash:       { icon: Shield,        color: "text-teal-400",   bg: "bg-teal-900/30",   label: "Hash Lookup" },
  set_verdict:      { icon: CheckSquare,   color: "text-emerald-400",bg: "bg-emerald-900/30",label: "Set Verdict" },
  search:           { icon: Search,        color: "text-slate-400",  bg: "bg-slate-800/60",  label: "Searched" },
};

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const CATEGORY_GROUPS = {
  "Incidents / Detections": ["view_incident", "view_detection"],
  "Log Analysis": ["open_raw_log", "open_evidence", "open_behaviors"],
  "Threat Hunting": ["check_iocs", "check_hash", "open_network"],
  "Decisions": ["set_verdict", "search"],
};

export default function InvestigationTracker({ onClose }) {
  const { steps, clearSteps } = useInvestigation();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? steps : steps.filter(s => s.type === filter);

  // Progress score: unique step types done
  const uniqueTypes = new Set(steps.map(s => s.type));
  const totalTypes = Object.keys(STEP_ICONS).length;
  const progress = Math.round((uniqueTypes.size / totalTypes) * 100);

  return (
    <div className="flex flex-col h-full bg-[#0d0d1a] border-l border-slate-700/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40 bg-[#0f0f20] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-teal-400" />
          <span className="text-sm font-semibold text-white">Investigation Log</span>
          <span className="text-xs px-1.5 py-0.5 bg-teal-600/20 border border-teal-500/30 rounded text-teal-300 font-mono">{steps.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {steps.length > 0 && (
            <button onClick={clearSteps} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded" title="Clear log">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 border-b border-slate-700/30 bg-[#0f0f20]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">Investigation Coverage</span>
          <span className="text-xs font-bold text-teal-300">{progress}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries(CATEGORY_GROUPS).map(([cat, types]) => {
            const done = types.filter(t => uniqueTypes.has(t)).length;
            return (
              <span key={cat} className={`text-xs px-2 py-0.5 rounded border ${done === types.length ? "bg-teal-900/30 border-teal-500/40 text-teal-300" : "bg-slate-800/60 border-slate-700/40 text-slate-500"}`}>
                {cat} {done}/{types.length}
              </span>
            );
          })}
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b border-slate-700/30 flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-2 py-1 rounded transition-colors ${filter === "all" ? "bg-teal-600/30 text-teal-300 border border-teal-500/40" : "text-slate-500 hover:text-slate-300"}`}
        >All</button>
        {Object.entries(STEP_ICONS).map(([type, cfg]) => {
          const count = steps.filter(s => s.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? "all" : type)}
              className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${filter === type ? `${cfg.bg} ${cfg.color} border border-current/30` : "text-slate-500 hover:text-slate-300"}`}
            >
              {cfg.label} <span className="font-mono text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <ClipboardList className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 font-medium">No activity yet</p>
            <p className="text-xs text-slate-600 mt-1">Start investigating by clicking on incidents or detections</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filtered.map((step, i) => {
              const cfg = STEP_ICONS[step.type] || STEP_ICONS.search;
              const Icon = cfg.icon;
              return (
                <div key={step.id} className="px-4 py-3 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-slate-600 flex-shrink-0">{timeAgo(step.timestamp)}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-snug break-words">{step.details}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}