import React, { useState } from "react";
import { SENTINEL_INCIDENTS } from "./ctfData";
import SentinelIncidentDetail from "./SentinelIncidentDetail";
import { Search, RefreshCw, ChevronDown, CheckSquare, Square, BarChart2, AlertTriangle, Zap, Info } from "lucide-react";

const SEVERITY_CONFIG = {
  High: { color: "text-red-400", bg: "bg-red-500", bar: "bg-red-500" },
  Medium: { color: "text-yellow-400", bg: "bg-yellow-500", bar: "bg-yellow-500" },
  Low: { color: "text-blue-400", bg: "bg-blue-400", bar: "bg-blue-400" },
  Informational: { color: "text-slate-400", bg: "bg-slate-400", bar: "bg-slate-400" },
};

const SEVERITY_COUNTS = {
  High: SENTINEL_INCIDENTS.filter(i => i.severity === "High").length,
  Medium: SENTINEL_INCIDENTS.filter(i => i.severity === "Medium").length,
  Low: SENTINEL_INCIDENTS.filter(i => i.severity === "Low").length,
  Informational: SENTINEL_INCIDENTS.filter(i => i.severity === "Informational").length,
};

export default function SentinelInterface() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [checkedIds, setCheckedIds] = useState(new Set());

  const filtered = SENTINEL_INCIDENTS.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.provider.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCheck = (id, e) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <div className="flex h-full bg-[#1a1a2e]">
      {/* Left Sidebar */}
      <div className="w-52 bg-[#0d0d1a] border-r border-slate-700/40 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-slate-700/40">
          <div className="text-xs text-slate-500 font-medium mb-1">General</div>
        </div>
        <nav className="flex-1 text-xs">
          <div className="px-3 py-2 text-slate-400 font-semibold text-xs uppercase tracking-wider mt-1">Threat management</div>
          <div className="bg-blue-600/20 border-l-2 border-blue-500 px-4 py-2 text-blue-300 font-medium cursor-default flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Incidents
          </div>
          {["Workbooks", "Hunting", "Notebooks", "Entity behavior", "Threat intelligence", "MITRE ATT&CK (Preview)", "SOC optimization"].map(item => (
            <div key={item} className="px-4 py-2 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 cursor-pointer flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span> {item}
            </div>
          ))}
          <div className="px-3 py-2 text-slate-400 font-semibold text-xs uppercase tracking-wider mt-2">Content management</div>
          <div className="px-3 py-2 text-slate-400 font-semibold text-xs uppercase tracking-wider mt-1">Configuration</div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#12121f] border-b border-slate-700/40 px-5 py-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-blue-600/20 rounded flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Microsoft Sentinel | Incidents</div>
              <div className="text-xs text-slate-500">Selected workspace: prod-workspace-sentinel</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-[#12121f] border-b border-slate-700/30 px-4 py-2 flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 transition-colors">
            <span className="text-lg leading-none font-light">+</span> Create incident
            <span className="text-slate-500 text-xs ml-1">(Preview)</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-slate-700/40 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-slate-700/40 transition-colors">
            <span>⏱</span> Last 14 days <ChevronDown className="w-3 h-3" />
          </button>
          <div className="w-px h-5 bg-slate-700"></div>
          <button className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-slate-700/40 transition-colors">Actions</button>
          <button className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded hover:bg-red-900/20 transition-colors">Delete</button>
          <button className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-slate-700/40 transition-colors flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5" /> Security efficiency workbook</button>
          <button className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded hover:bg-slate-700/40 transition-colors">Columns</button>
          <button className="text-xs text-blue-400 hover:text-blue-300 px-2.5 py-1.5 rounded hover:bg-slate-700/40 transition-colors">Guides & Feedback</button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-900/10 border-b border-blue-700/20 px-4 py-2 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-300">Write permissions on the workspace are required to modify incidents.</span>
        </div>

        {/* Stats Row */}
        <div className="bg-[#12121f] border-b border-slate-700/30 px-4 py-3 flex items-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{SENTINEL_INCIDENTS.length}</div>
            <div className="text-xs text-slate-400">Open incidents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{SENTINEL_INCIDENTS.filter(i => i.status === "New").length}</div>
            <div className="text-xs text-slate-400">New incidents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-slate-400">Active incidents</div>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="text-xs text-slate-400 mb-1">Open incidents by severity</div>
            <div className="flex items-center gap-1">
              {Object.entries(SEVERITY_COUNTS).map(([sev, count]) => count > 0 && (
                <div key={sev} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${SEVERITY_CONFIG[sev].bg}`}></div>
                  <span className="text-xs text-slate-400">{sev} ({count})</span>
                </div>
              ))}
            </div>
            <div className="flex h-2 rounded overflow-hidden mt-1 gap-px">
              {Object.entries(SEVERITY_COUNTS).map(([sev, count]) => count > 0 && (
                <div
                  key={sev}
                  className={`${SEVERITY_CONFIG[sev].bar} h-full`}
                  style={{ width: `${(count / SENTINEL_INCIDENTS.length) * 100}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#12121f] border-b border-slate-700/30 px-4 py-2 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700/50 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              placeholder="Search by ID, title, tags, owner or product"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {["Severity: All", "Status: 2 selected", "Incident Provider name: All", "More (2)"].map(f => (
            <button key={f} className="flex items-center gap-1 text-xs text-slate-300 border border-slate-700/50 rounded px-2.5 py-1.5 bg-slate-800/40 hover:bg-slate-700/50 transition-colors">
              {f} <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          ))}
        </div>

        {/* Table + Detail Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Table */}
          <div className={`${selected ? "w-1/2" : "w-full"} overflow-auto flex flex-col`}>
            {/* Auto-refresh */}
            <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-700/20 bg-[#12121f]">
              <div className="w-8 h-4 bg-slate-700 rounded-full flex items-center px-0.5">
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              </div>
              <span className="text-xs text-slate-400">Auto-refresh incidents</span>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/40 bg-[#0f0f1c]">
                  <th className="w-8 px-3 py-2.5"><Square className="w-3.5 h-3.5 text-slate-500" /></th>
                  <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Severity ↑↓</th>
                  <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Incident number ↑↓</th>
                  <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Title ↑↓</th>
                  <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Alerts</th>
                  <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Incident provider na...</th>
                  <th className="px-3 py-2.5 text-left text-slate-400 font-medium">Alert product name</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(incident => {
                  const cfg = SEVERITY_CONFIG[incident.severity];
                  return (
                    <tr
                      key={incident.id}
                      onClick={() => setSelected(incident)}
                      className={`border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/30 transition-colors ${selected?.id === incident.id ? "bg-blue-900/20 border-l-2 border-l-blue-500" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <button onClick={e => toggleCheck(incident.id, e)}>
                          {checkedIds.has(incident.id)
                            ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                            : <Square className="w-3.5 h-3.5 text-slate-600" />}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`${cfg.color} font-medium`}>{incident.severity}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{incident.id}</td>
                      <td className="px-3 py-2.5 text-blue-400 hover:text-blue-300 max-w-[200px] truncate">{incident.title}</td>
                      <td className="px-3 py-2.5 text-slate-300">{incident.alerts}</td>
                      <td className="px-3 py-2.5 text-slate-300 truncate max-w-[160px]">{incident.provider}</td>
                      <td className="px-3 py-2.5 text-slate-300 truncate max-w-[160px]">{incident.product}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-auto px-4 py-2 border-t border-slate-700/30 bg-[#0f0f1c] flex items-center gap-3 text-xs text-slate-500">
              <button className="px-3 py-1 border border-slate-700 rounded hover:bg-slate-700 text-slate-400">{"< Previous"}</button>
              <span>1 - {filtered.length} / {filtered.length}</span>
              <button className="px-3 py-1 border border-slate-700 rounded hover:bg-slate-700 text-slate-400">{"Next >"}</button>
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-1/2 border-l border-slate-700/40 overflow-y-auto">
              <SentinelIncidentDetail incident={selected} onClose={() => setSelected(null)} />
            </div>
          )}

          {/* No selection placeholder */}
          {!selected && (
            <div className="hidden">No incidents selected</div>
          )}
        </div>
      </div>
    </div>
  );
}