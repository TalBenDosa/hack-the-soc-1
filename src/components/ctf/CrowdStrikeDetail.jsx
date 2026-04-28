import React, { useState } from "react";
import { X, Copy, Terminal, Globe, Monitor, User, AlertTriangle, Shield, Network } from "lucide-react";

const SEV_BADGE = {
  Critical: "text-red-300 bg-red-900/40 border-red-500/50",
  High:     "text-orange-300 bg-orange-900/40 border-orange-500/50",
  Medium:   "text-yellow-300 bg-yellow-900/40 border-yellow-500/50",
  Low:      "text-blue-300 bg-blue-900/40 border-blue-500/50",
};

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active ? "text-red-400 border-red-500" : "text-slate-500 border-transparent hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, value, mono, copy: copyable }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-slate-800/40 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs break-all ${mono ? "font-mono text-teal-300" : "text-slate-200"}`}>{String(value)}</span>
        {copyable && (
          <button onClick={doCopy} className="text-slate-600 hover:text-slate-400 flex-shrink-0">
            <Copy className="w-3 h-3" />
          </button>
        )}
        {copied && <span className="text-xs text-green-400">✓</span>}
      </div>
    </div>
  );
}

export default function CrowdStrikeDetail({ detection: d, onClose, logStep }) {
  const [tab, setTab] = useState("overview");
  const [verdict, setVerdict] = useState(null);

  const handleTabChange = (t) => {
    setTab(t);
    if (t === "raw") logStep?.("open_raw_log", `Opened raw alert JSON for: "${d.scenario}" on ${d.hostname}`);
    if (t === "behaviors") logStep?.("open_behaviors", `Examined behaviors for: "${d.scenario}" on ${d.hostname}`);
    if (t === "network") logStep?.("open_network", `Checked network connections for: "${d.scenario}" on ${d.hostname}`);
    if (t === "iocs") logStep?.("check_iocs", `Inspected IOCs for: "${d.scenario}" on ${d.hostname}`);
    if (t === "verdict") logStep?.("set_verdict", `Opened verdict panel for detection: "${d.scenario}"`);
  };

  const handleVerdict = (v) => {
    setVerdict(v);
    logStep?.("set_verdict", `Set verdict "${v}" for CrowdStrike detection: "${d.scenario}" on ${d.hostname}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/60 bg-[#111111]">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded border font-bold ${SEV_BADGE[d.severityLabel]}`}>{d.severityLabel}</span>
              <span className="text-xs text-slate-500 font-mono">{d.id}</span>
            </div>
            <h2 className="text-sm font-bold text-white">{d.scenario}</h2>
            <p className="text-xs text-slate-400 mt-1">{new Date(d.timestamp).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white p-1 rounded hover:bg-slate-700/50">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/60 bg-[#111111] px-2">
        {["overview", "behaviors", "network", "iocs", "raw", "verdict"].map(t => (
          <TabBtn key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={tab === t} onClick={() => handleTabChange(t)} />
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {tab === "overview" && (
          <div className="p-5 space-y-4">
            {/* Device Card */}
            <div className="bg-[#1a1a1a] border border-slate-700/40 rounded p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Monitor className="w-3.5 h-3.5" /> Affected Host
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hostname" value={d.hostname} />
                <Field label="OS" value={d.os} />
                <Field label="Local IP" value={d.localIp} mono />
                <Field label="External IP" value={d.externalIp} mono />
                <Field label="Sensor ID" value={d.sensorId} mono copy />
                <Field label="Domain" value={d.domain} />
              </div>
            </div>

            {/* User */}
            <div className="bg-[#1a1a1a] border border-slate-700/40 rounded p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <User className="w-3.5 h-3.5" /> User
              </div>
              <Field label="Username" value={`${d.username}@${d.domain}`} />
            </div>

            {/* Detection Meta */}
            <div className="bg-[#1a1a1a] border border-slate-700/40 rounded p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" /> Detection Info
              </div>
              <Field label="Pattern ID" value={d.patternId} mono />
              <Field label="Disposition" value={d.patternDisposition} />
              <Field label="Status" value={d.status.replace("_", " ")} />
              <Field label="Description" value={d.description} />
            </div>

            {/* Tactics */}
            <div className="bg-[#1a1a1a] border border-slate-700/40 rounded p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" /> MITRE ATT&CK
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {d.tactics.map(t => (
                  <span key={t} className="px-2.5 py-1 bg-purple-900/40 border border-purple-500/30 rounded text-xs text-purple-300">{t}</span>
                ))}
              </div>
              <div className="space-y-1">
                {d.techniques.map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span>
                    <span className="text-xs text-slate-300">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "behaviors" && (
          <div className="p-5 space-y-4">
            {d.behaviors.map((b, i) => (
              <div key={b.id} className="bg-[#1a1a1a] border border-slate-700/40 rounded overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/30 bg-[#141414]">
                  <span className="text-xs text-slate-500">#{i + 1}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${SEV_BADGE[b.severity] || SEV_BADGE.Low}`}>{b.severity}</span>
                  <span className="text-xs text-slate-300 font-medium">{b.tactic} · {b.technique}</span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-xs text-slate-300 mb-3">{b.description}</p>
                  <Field label="Process" value={b.processName} mono />
                  <Field label="PID" value={b.processPid} />
                  <Field label="Parent Process" value={`${b.parentName} (PID: ${b.parentPid})`} mono />
                  <Field label="File Path" value={b.filePath} mono />
                  <Field label="SHA256" value={b.sha256} mono copy />
                  <div className="mt-3">
                    <div className="text-xs text-slate-500 mb-1">Command Line</div>
                    <div className="bg-[#0a0a0a] border border-slate-700/30 rounded p-3 flex items-start gap-2">
                      <Terminal className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                      <code className="text-xs font-mono text-green-300 break-all leading-relaxed">{b.commandLine}</code>
                    </div>
                  </div>
                  <Field label="Timestamp" value={new Date(b.timestamp).toLocaleString()} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "network" && (
          <div className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Network className="w-3.5 h-3.5" /> Network Connections
            </h3>
            {d.networkConnections.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">No network connections recorded</div>
            ) : (
              d.networkConnections.map((nc, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-slate-700/40 rounded p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span className={`text-xs px-2 py-0.5 rounded ${nc.direction === "Outbound" ? "bg-orange-900/30 text-orange-300 border border-orange-500/30" : "bg-green-900/30 text-green-300 border border-green-500/30"}`}>
                      {nc.direction}
                    </span>
                    <span className="text-xs text-slate-500">{nc.protocol}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <div className="text-center">
                      <div className="text-blue-300">{nc.localIp}</div>
                      <div className="text-slate-500 text-xs">:{nc.localPort}</div>
                    </div>
                    <div className="text-slate-600 text-lg">→</div>
                    <div className="text-center">
                      <div className="text-red-300">{nc.remoteIp}</div>
                      <div className="text-slate-500 text-xs">:{nc.remotePort}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "iocs" && (
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Indicators of Compromise</h3>
            {d.iocs.map((ioc, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-slate-700/40 rounded p-3 flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-600/40 rounded text-slate-400 uppercase font-mono flex-shrink-0">{ioc.type}</span>
                <span className="text-xs font-mono text-teal-300 break-all flex-1">{ioc.value}</span>
                <span className="text-xs text-slate-500 flex-shrink-0">{ioc.source}</span>
                <button onClick={() => navigator.clipboard.writeText(ioc.value)} className="text-slate-600 hover:text-slate-400 flex-shrink-0">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "raw" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw Detection JSON</h3>
              <button
                onClick={() => navigator.clipboard.writeText(d.rawAlert)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="text-xs font-mono text-green-300 bg-[#050505] border border-slate-800/60 rounded p-4 overflow-auto max-h-[500px] leading-relaxed">
              {d.rawAlert}
            </pre>
          </div>
        )}

        {tab === "verdict" && (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Classify this Detection</h3>
              <p className="text-xs text-slate-400">Based on the behaviors, IOCs and context above, make your determination.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { v: "True Positive", desc: "Confirmed malicious activity — escalate and contain", color: "border-red-500/60 bg-red-900/20 hover:bg-red-900/30", active: "border-red-500 bg-red-900/40", icon: "🚨" },
                { v: "False Positive", desc: "Legitimate activity incorrectly flagged", color: "border-green-500/60 bg-green-900/20 hover:bg-green-900/30", active: "border-green-500 bg-green-900/40", icon: "✅" },
                { v: "Suspicious – Monitor", desc: "Unclear intent, continue monitoring", color: "border-yellow-500/60 bg-yellow-900/20 hover:bg-yellow-900/30", active: "border-yellow-500 bg-yellow-900/40", icon: "👁️" },
                { v: "Escalate to TIER 2", desc: "Complex case requiring advanced forensics", color: "border-blue-500/60 bg-blue-900/20 hover:bg-blue-900/30", active: "border-blue-500 bg-blue-900/40", icon: "⬆️" },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => handleVerdict(opt.v)}
                  className={`text-left p-3 rounded border-2 transition-all ${verdict === opt.v ? opt.active : opt.color}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span className="text-sm font-semibold text-white">{opt.v}</span>
                    {verdict === opt.v && <span className="ml-auto text-green-400 text-xs font-medium">✓ Selected</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-6">{opt.desc}</p>
                </button>
              ))}
            </div>
            {verdict && (
              <div className="bg-teal-900/20 border border-teal-500/30 rounded p-4">
                <p className="text-xs text-teal-300 font-semibold">Verdict recorded: {verdict}</p>
                <p className="text-xs text-slate-400 mt-1">Your classification has been saved to the investigation session.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}