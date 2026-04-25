import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import HashLookupPanel from "./HashLookupPanel";

// ── helpers ────────────────────────────────────────────────────────────────

const SHA256_RE = /^[0-9a-fA-F]{64}$/;
const SHA256_KEY_RE = /sha256|hash|checksum/i;

/** Returns the first SHA256-like string found inside a log object */
function extractHashes(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return [];
  const found = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && SHA256_RE.test(val.trim())) {
      found.push({ key, value: val.trim() });
    } else if (typeof val === 'object') {
      found.push(...extractHashes(val, depth + 1));
    }
  }
  return found;
}

/** Guess whether a hash field is malicious (any key with "sha256" / "hash" heuristic) */
function isMaliciousKey(key) {
  return SHA256_KEY_RE.test(key);
}

// ── colour helpers ─────────────────────────────────────────────────────────

const SOURCE_COLORS = {
  'Azure': 'bg-blue-600/90 text-white border-blue-500',
  'Azure AD / Entra ID': 'bg-blue-700/90 text-white border-blue-600',
  'Azure Activity Logs': 'bg-blue-800/90 text-white border-blue-700',
  'AWS': 'bg-orange-600/90 text-white border-orange-500',
  'AWS CloudTrail': 'bg-orange-600/90 text-white border-orange-500',
  'Office 365': 'bg-purple-600/90 text-white border-purple-500',
  'Office365 / Microsoft 365 Audit': 'bg-purple-700/90 text-white border-purple-600',
  'Active Directory': 'bg-teal-600/90 text-white border-teal-500',
  'EDR': 'bg-red-600/90 text-white border-red-500',
  'Microsoft Defender for Endpoint': 'bg-red-700/90 text-white border-red-600',
  'CrowdStrike Falcon': 'bg-rose-600/90 text-white border-rose-500',
  'Wazuh': 'bg-pink-700/90 text-white border-pink-600',
  'Firewall': 'bg-yellow-600/90 text-white border-yellow-500',
  'Network IDS': 'bg-pink-600/90 text-white border-pink-500',
  'IDS / IPS': 'bg-pink-600/90 text-white border-pink-500',
  'Windows Security': 'bg-indigo-600/90 text-white border-indigo-500',
  'Windows Security Events': 'bg-indigo-700/90 text-white border-indigo-600',
  'DLP': 'bg-green-600/90 text-white border-green-500',
  'DC': 'bg-cyan-600/90 text-white border-cyan-500',
  'DNS': 'bg-lime-600/90 text-white border-lime-500',
  'Proxy': 'bg-amber-600/90 text-white border-amber-500',
  'VPN': 'bg-violet-600/90 text-white border-violet-500',
  'NAC': 'bg-sky-600/90 text-white border-sky-500',
  'Email Security / Mail Gateway': 'bg-fuchsia-600/90 text-white border-fuchsia-500',
};

function getSourceColor(source) {
  return SOURCE_COLORS[source] || 'bg-slate-600/90 text-white border-slate-500';
}

function getLogDescription(log) {
  if (log.story_context && log.story_context.trim() && log.story_context !== 'Generated Event') {
    return log.story_context;
  }
  if (log.raw_log_data?.rule?.description && log.raw_log_data.rule.description.trim() && log.raw_log_data.rule.description !== 'Generated Event') {
    return log.raw_log_data.rule.description;
  }
  return log.rule_description || 'Security Event';
}

// ── formatted value renderer with "Check Hash" button ─────────────────────

function FieldValue({ fieldKey, value, onCheckHash }) {
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const isHash = SHA256_RE.test(str.trim());

  if (!isHash) {
    return <span className="text-white break-all">{str}</span>;
  }

  return (
    <span className="flex items-center gap-2 flex-wrap">
      <span className="text-amber-300 font-mono break-all text-xs">{str}</span>
      <button
        onClick={() => onCheckHash(str.trim(), fieldKey)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold
                   bg-teal-600/20 border border-teal-500/50 text-teal-300
                   hover:bg-teal-500/30 hover:text-teal-200 transition-colors shrink-0"
      >
        <Search className="w-3 h-3" />
        Check Hash
      </button>
    </span>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function InvestigationLogs({ logs, onSelectLog, selectedLogId, scenarioIOCs = [] }) {
  const [viewMode, setViewMode] = useState('formatted');
  const [hashLookup, setHashLookup] = useState(null); // { hash, fieldKey }

  // Set of hashes that came from the scenario's IOC list (definitely malicious)
  const maliciousHashes = new Set(
    (scenarioIOCs ?? [])
      .filter(ioc => ioc.type === 'sha256' || SHA256_RE.test(ioc.value ?? ''))
      .map(ioc => (ioc.value ?? '').toLowerCase())
  );

  function openHashLookup(hash, fieldKey) {
    const lower = hash.toLowerCase();
    const isMalicious = maliciousHashes.has(lower) || isMaliciousKey(fieldKey);
    // Find matching IOC metadata if available
    const ioc = [...(scenarioIOCs ?? [])].find(i => (i.value ?? '').toLowerCase() === lower);
    setHashLookup({
      hash,
      isMalicious,
      malwareFamily: ioc?.metadata?.signature ?? 'Generic.Trojan',
      fileName: ioc?.metadata?.file_name ?? 'payload.exe',
    });
  }

  return (
    <>
      <Card className="bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Investigation Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-700/50 bg-slate-900/50">
                  <TableHead className="w-8 text-slate-400 font-semibold"></TableHead>
                  <TableHead className="text-slate-400 font-semibold">Time</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Agent Name</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Source</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs && logs.map((log) => {
                  const hashes = extractHashes(log.raw_log_data || {});

                  return (
                    <React.Fragment key={log.id}>
                      {/* Main log row */}
                      <TableRow
                        onClick={() => onSelectLog(log)}
                        className={cn(
                          "cursor-pointer border-b border-slate-800/50 hover:bg-slate-700/30 transition-colors",
                          selectedLogId === log.id && "bg-slate-700/40"
                        )}
                      >
                        <TableCell className="py-3">
                          {selectedLogId === log.id ? (
                            <ChevronDown className="w-4 h-4 text-teal-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-white font-mono text-sm py-3">
                          {new Date(log.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                          }).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-white font-semibold py-3">
                          {log.hostname || log.agent?.name || 'Unknown'}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className={`${getSourceColor(log.source_type)} text-xs px-3 py-1 font-medium`}>
                            {log.source_type || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm">{getLogDescription(log)}</span>
                            {/* Quick-access hash badges in the row itself */}
                            {hashes.slice(0, 1).map(({ key, value }) => (
                              <button
                                key={key}
                                onClick={e => { e.stopPropagation(); openHashLookup(value, key); }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold
                                           bg-teal-600/20 border border-teal-500/50 text-teal-300
                                           hover:bg-teal-500/30 hover:text-teal-200 transition-colors"
                              >
                                <Search className="w-3 h-3" />
                                Check Hash
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {selectedLogId === log.id && (
                        <TableRow className="border-b border-slate-800/50">
                          <TableCell colSpan={5} className="p-6 bg-slate-900/80">
                            <div className="space-y-4">
                              {/* Header */}
                              <div className="flex items-center gap-2 text-teal-400 text-base font-semibold">
                                <div className="w-1 h-6 bg-teal-400 rounded-full"></div>
                                Log Analysis
                              </div>

                              {/* Basic Information */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-300 text-sm">
                                  <div className="w-1 h-5 bg-slate-500 rounded-full"></div>
                                  Basic Information
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                                  <div className="grid grid-cols-[180px_1fr] gap-3 text-sm">
                                    <div className="text-slate-400">Rule Description:</div>
                                    <div className="text-white">{getLogDescription(log)}</div>

                                    <div className="text-slate-400">Source Type:</div>
                                    <div className="text-white">{log.source_type}</div>

                                    <div className="text-slate-400">Timestamp:</div>
                                    <div className="text-white font-mono">{log.timestamp}</div>

                                    <div className="text-slate-400">Severity:</div>
                                    <div className="text-white">{log.severity || log.rule?.level || 'N/A'}</div>

                                    {log.username && (
                                      <>
                                        <div className="text-slate-400">Username:</div>
                                        <div className="text-white">{log.username}</div>
                                      </>
                                    )}

                                    <div className="text-slate-400">Hostname:</div>
                                    <div className="text-white">{log.hostname || log.agent?.name || 'N/A'}</div>

                                    {log.ip_address && (
                                      <>
                                        <div className="text-slate-400">IP Address:</div>
                                        <div className="text-white font-mono">{log.ip_address}</div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Detected hashes — prominent panel */}
                              {hashes.length > 0 && (
                                <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-lg space-y-2">
                                  <p className="text-amber-300 text-sm font-semibold flex items-center gap-2">
                                    <Search className="w-4 h-4" />
                                    File Hash Detected — Investigate this indicator
                                  </p>
                                  {hashes.map(({ key, value }) => (
                                    <div key={key} className="flex items-center gap-3 flex-wrap">
                                      <span className="text-slate-400 text-xs w-20 shrink-0">{key}:</span>
                                      <span className="text-amber-200 font-mono text-xs break-all flex-1">{value}</span>
                                      <Button
                                        size="sm"
                                        onClick={() => openHashLookup(value, key)}
                                        className="bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 h-7 shrink-0"
                                      >
                                        <Search className="w-3 h-3 mr-1" />
                                        Check Hash
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Detailed Log Data */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                                    <div className="w-1 h-5 bg-slate-500 rounded-full"></div>
                                    Detailed Log Data
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Raw JSON</span>
                                    <button
                                      onClick={() => setViewMode(viewMode === 'raw' ? 'formatted' : 'raw')}
                                      className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                        viewMode === 'raw' ? 'bg-teal-600' : 'bg-slate-700'
                                      )}
                                    >
                                      <span className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                        viewMode === 'raw' ? 'translate-x-6' : 'translate-x-1'
                                      )} />
                                    </button>
                                  </div>
                                </div>

                                {viewMode === 'raw' ? (
                                  <pre className="text-xs text-slate-300 bg-slate-800/50 p-4 rounded-lg overflow-auto max-h-96 border border-slate-700/50 font-mono">
                                    {JSON.stringify(log.raw_log_data || log, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 max-h-96 overflow-auto">
                                    <div className="grid grid-cols-[200px_1fr] gap-3 text-sm font-mono">
                                      {Object.entries(log.raw_log_data || log).map(([key, value]) => (
                                        <React.Fragment key={key}>
                                          <div className="text-slate-400">{key}:</div>
                                          <div>
                                            <FieldValue
                                              fieldKey={key}
                                              value={value}
                                              onCheckHash={openHashLookup}
                                            />
                                          </div>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hash Lookup Panel overlay */}
      {hashLookup && (
        <HashLookupPanel
          hash={hashLookup.hash}
          isMalicious={hashLookup.isMalicious}
          malwareFamily={hashLookup.malwareFamily}
          fileName={hashLookup.fileName}
          onClose={() => setHashLookup(null)}
        />
      )}
    </>
  );
}
