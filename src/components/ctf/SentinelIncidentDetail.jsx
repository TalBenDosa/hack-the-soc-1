import React, { useState } from "react";
import { X, ChevronDown, ChevronRight, Copy, ExternalLink, AlertTriangle, User, Monitor, Globe, Tag } from "lucide-react";

const SEVERITY_COLOR = {
  High: "text-red-400 bg-red-900/30 border-red-500/40",
  Medium: "text-yellow-400 bg-yellow-900/30 border-yellow-500/40",
  Low: "text-blue-400 bg-blue-900/30 border-blue-500/40",
  Informational: "text-slate-400 bg-slate-800/60 border-slate-500/40",
};

const STATUS_COLOR = {
  New: "text-blue-300 bg-blue-900/30",
  Active: "text-green-300 bg-green-900/30",
  Closed: "text-slate-400 bg-slate-800/40",
};

function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-700/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors"
      >
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function KVRow({ label, value, mono, copyable }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-1.5 border-b border-slate-800/40 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`text-xs ${mono ? "font-mono text-teal-300" : "text-slate-200"} break-all`}>{String(value)}</span>
        {copyable && (
          <button onClick={copy} className="text-slate-600 hover:text-slate-400 ml-1">
            <Copy className="w-3 h-3" />
          </button>
        )}
        {copied && <span className="text-xs text-green-400">✓</span>}
      </div>
    </div>
  );
}

export default function SentinelIncidentDetail({ incident, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showRaw, setShowRaw] = useState(false);
  const [verdict, setVerdict] = useState(null);

  const sev = SEVERITY_COLOR[incident.severity] || SEVERITY_COLOR.Informational;

  return (
    <div className="flex flex-col h-full bg-[#0f0f1c]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/40 bg-[#12121f]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${sev}`}>{incident.severity}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[incident.status] || STATUS_COLOR.New}`}>{incident.status}</span>
              <span className="text-xs text-slate-500">#{incident.id}</span>
            </div>
            <h2 className="text-sm font-semibold text-white leading-snug">{incident.title}</h2>
            <p className="text-xs text-slate-400 mt-1">{new Date(incident.created).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700/50">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/40 bg-[#12121f] px-2">
        {["overview", "evidence", "logs", "verdict"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "text-blue-400 border-blue-500"
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <div>
            <Collapsible title="Description">
              <p className="text-xs text-slate-300 leading-relaxed">{incident.description}</p>
            </Collapsible>

            <Collapsible title="Entities">
              <div className="space-y-2">
                {incident.entities?.map((entity, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-800/40 rounded p-2.5 border border-slate-700/30">
                    {entity.type === "Account" && <User className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    {entity.type === "IP" && <Globe className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                    {entity.type === "Host" && <Monitor className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    {!["Account","IP","Host"].includes(entity.type) && <Tag className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                    <div>
                      <div className="text-xs text-slate-300 font-medium">
                        {entity.name || entity.address || entity.upn || JSON.stringify(entity)}
                      </div>
                      <div className="text-xs text-slate-500">{entity.type} {entity.geo ? `· ${entity.geo}` : ""}{entity.domain ? ` · ${entity.domain}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>

            <Collapsible title="Tactics & Techniques">
              <div className="flex flex-wrap gap-2 mb-3">
                {incident.tactics?.map(t => (
                  <span key={t} className="px-2.5 py-1 bg-purple-900/40 border border-purple-500/30 rounded text-xs text-purple-300">{t}</span>
                ))}
              </div>
              <div className="space-y-1">
                {incident.mitre?.map(m => (
                  <div key={m} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span>
                    <span className="text-xs text-slate-300">{m}</span>
                  </div>
                ))}
              </div>
            </Collapsible>

            <Collapsible title="Details">
              <KVRow label="Incident provider" value={incident.provider} />
              <KVRow label="Alert product" value={incident.product} />
              <KVRow label="Owner" value={incident.owner || "Unassigned"} />
              <KVRow label="Tenant ID" value={incident.tenantId} mono copyable />
              <KVRow label="Created" value={new Date(incident.created).toLocaleString()} />
            </Collapsible>
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alert Details</h3>
            {incident.alertDetails && Object.entries(incident.alertDetails).map(([k, v]) => (
              <KVRow key={k} label={k} value={v} mono={k.toLowerCase().includes("id")} copyable={k.toLowerCase().includes("id")} />
            ))}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw Log / Alert JSON</h3>
              <button
                onClick={() => navigator.clipboard.writeText(incident.rawLog)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="text-xs font-mono text-green-300 bg-[#0a0a14] border border-slate-700/40 rounded p-4 overflow-auto max-h-[500px] leading-relaxed">
              {incident.rawLog}
            </pre>
          </div>
        )}

        {activeTab === "verdict" && (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Classify this Incident</h3>
              <p className="text-xs text-slate-400">Based on your investigation, select the appropriate verdict for this incident.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { v: "True Positive", desc: "This is a real security incident requiring action", color: "border-red-500/50 bg-red-900/20 hover:bg-red-900/30", active: "border-red-500 bg-red-900/40", icon: "🚨" },
                { v: "False Positive", desc: "This alert is benign and not a real threat", color: "border-green-500/50 bg-green-900/20 hover:bg-green-900/30", active: "border-green-500 bg-green-900/40", icon: "✅" },
                { v: "Benign Positive", desc: "Expected behavior, no action needed", color: "border-blue-500/50 bg-blue-900/20 hover:bg-blue-900/30", active: "border-blue-500 bg-blue-900/40", icon: "ℹ️" },
                { v: "Escalate to TIER 2", desc: "Requires advanced investigation by senior analyst", color: "border-yellow-500/50 bg-yellow-900/20 hover:bg-yellow-900/30", active: "border-yellow-500 bg-yellow-900/40", icon: "⬆️" },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setVerdict(opt.v)}
                  className={`text-left p-3 rounded border-2 transition-all ${verdict === opt.v ? opt.active : opt.color}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span className="text-sm font-semibold text-white">{opt.v}</span>
                    {verdict === opt.v && <span className="ml-auto text-green-400 text-xs">✓ Selected</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-6">{opt.desc}</p>
                </button>
              ))}
            </div>

            {verdict && (
              <div className="bg-teal-900/20 border border-teal-500/30 rounded p-4">
                <p className="text-xs text-teal-300 font-semibold mb-1">Verdict recorded: {verdict}</p>
                <p className="text-xs text-slate-400">Your classification has been saved to the investigation session.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}