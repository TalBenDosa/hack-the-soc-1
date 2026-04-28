import React, { useState } from "react";
import { CROWDSTRIKE_DETECTIONS } from "./ctfData";
import CrowdStrikeDetail from "./CrowdStrikeDetail";
import { Search, RefreshCw, ChevronDown, Shield, AlertTriangle, Activity, Eye } from "lucide-react";

const SEV_CONFIG = {
  Critical: { label: "Critical", dot: "bg-red-500", text: "text-red-400", ring: "ring-red-500/30", badge: "bg-red-900/40 border-red-500/50 text-red-300" },
  High:     { label: "High",     dot: "bg-orange-500", text: "text-orange-400", ring: "ring-orange-500/30", badge: "bg-orange-900/40 border-orange-500/50 text-orange-300" },
  Medium:   { label: "Medium",   dot: "bg-yellow-500", text: "text-yellow-400", ring: "ring-yellow-500/30", badge: "bg-yellow-900/40 border-yellow-500/50 text-yellow-300" },
  Low:      { label: "Low",      dot: "bg-blue-400",   text: "text-blue-400",   ring: "ring-blue-400/30",   badge: "bg-blue-900/40 border-blue-500/50 text-blue-300" },
};

const STATUS_COLOR = {
  new:         "text-blue-300 bg-blue-900/30 border border-blue-500/30",
  in_progress: "text-yellow-300 bg-yellow-900/30 border border-yellow-500/30",
  closed:      "text-slate-400 bg-slate-800/40 border border-slate-600/30",
};

const DISP_COLOR = {
  Prevented: "text-green-400 bg-green-900/30 border border-green-500/30",
  Detected:  "text-yellow-400 bg-yellow-900/30 border border-yellow-500/30",
};

function TopMetrics({ detections }) {
  return (
    <div className="grid grid-cols-4 gap-px bg-slate-700/30">
      {[
        { label: "Total Detections", value: detections.length, icon: AlertTriangle, color: "text-red-400" },
        { label: "Critical / High", value: detections.filter(d => d.severityLabel === "Critical" || d.severityLabel === "High").length, icon: AlertTriangle, color: "text-orange-400" },
        { label: "Hosts Affected", value: new Set(detections.map(d => d.hostname)).size, icon: Activity, color: "text-blue-400" },
        { label: "Prevented", value: detections.filter(d => d.patternDisposition === "Prevented").length, icon: Shield, color: "text-green-400" },
      ].map(m => (
        <div key={m.label} className="bg-[#12121f] px-5 py-3 flex items-center gap-3">
          <m.icon className={`w-5 h-5 ${m.color}`} />
          <div>
            <div className="text-xl font-bold text-white">{m.value}</div>
            <div className="text-xs text-slate-500">{m.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CrowdStrikeInterface() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = CROWDSTRIKE_DETECTIONS.filter(d => {
    const matchSearch = d.scenario.toLowerCase().includes(search.toLowerCase()) ||
      d.hostname.toLowerCase().includes(search.toLowerCase()) ||
      d.username.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex h-full bg-[#0d0d0d]">
      {/* Left Nav */}
      <div className="w-52 bg-[#111111] border-r border-slate-800/60 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Falcon</span>
          </div>
        </div>
        <nav className="flex-1 text-xs py-2">
          <div className="px-3 py-1.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Endpoint Security</div>
          <div className="bg-red-600/20 border-l-2 border-red-500 px-4 py-2 text-red-300 font-medium cursor-default">Detections</div>
          {["Incidents", "Hosts", "Prevention Policy", "Response Actions"].map(item => (
            <div key={item} className="px-4 py-2 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 cursor-pointer">{item}</div>
          ))}
          <div className="px-3 py-1.5 text-slate-500 font-semibold text-xs uppercase tracking-wider mt-2">Threat Intelligence</div>
          {["Indicators", "Actors", "Sandbox"].map(item => (
            <div key={item} className="px-4 py-2 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 cursor-pointer">{item}</div>
          ))}
          <div className="px-3 py-1.5 text-slate-500 font-semibold text-xs uppercase tracking-wider mt-2">Investigate</div>
          {["Event Search", "File Analysis", "Process Timeline"].map(item => (
            <div key={item} className="px-4 py-2 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 cursor-pointer">{item}</div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#111111] border-b border-slate-800/60 px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white">Detections</div>
            <div className="text-xs text-slate-500">Endpoint Activity · Production Environment</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700/50">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700/50">
              Export <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metrics */}
        <TopMetrics detections={CROWDSTRIKE_DETECTIONS} />

        {/* Filter Bar */}
        <div className="bg-[#111111] border-b border-slate-800/40 px-4 py-2.5 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700/50 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50"
              placeholder="Search detections, hosts, users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700/50 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          {["Severity", "Tactic", "Host"].map(f => (
            <button key={f} className="flex items-center gap-1 text-xs text-slate-400 border border-slate-700/40 rounded px-2.5 py-1.5 bg-slate-800/40 hover:bg-slate-700/50 transition-colors">
              {f} <ChevronDown className="w-3 h-3" />
            </button>
          ))}
        </div>

        {/* Content split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Detection List */}
          <div className={`${selected ? "w-[45%]" : "w-full"} overflow-y-auto flex flex-col gap-px bg-[#0a0a0a]`}>
            {filtered.map(d => {
              const cfg = SEV_CONFIG[d.severityLabel] || SEV_CONFIG.Low;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`bg-[#111111] border-l-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors p-4 ${
                    selected?.id === d.id
                      ? `border-l-red-500 bg-[#1a1a1a]`
                      : `border-l-transparent hover:border-l-slate-600`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded border ${cfg.badge}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`}></span>
                          {cfg.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[d.status] || ""}`}>
                          {d.status.replace("_", " ")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${DISP_COLOR[d.patternDisposition] || "text-slate-400"}`}>
                          {d.patternDisposition}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white mb-1 truncate">{d.scenario}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{d.description}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-slate-500">{new Date(d.timestamp).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">{new Date(d.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {d.hostname}
                    </span>
                    <span>{d.username}@{d.domain}</span>
                    <span>{d.localIp}</span>
                    <span className="ml-auto">{d.patternId}</span>
                  </div>
                  {/* Tactics chips */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {d.tactics.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-purple-900/30 border border-purple-500/20 text-purple-300 rounded">{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="flex-1 border-l border-slate-800/60 overflow-y-auto">
              <CrowdStrikeDetail detection={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}