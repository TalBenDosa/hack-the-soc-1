/**
 * HashLookupPanel
 *
 * Simulated threat-intelligence hash lookup panel for SOC training.
 * Renders a realistic VirusTotal-style result so students practice
 * the "check the hash" investigation step without hitting real APIs.
 */

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, ShieldCheck, AlertTriangle, Clock, Tag, FileText, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const AV_ENGINES = [
  'Kaspersky', 'Bitdefender', 'CrowdStrike Falcon', 'Microsoft Defender',
  'Sophos', 'ESET NOD32', 'Malwarebytes', 'Trend Micro', 'Symantec',
  'McAfee', 'Avast', 'AVG', 'F-Secure', 'Panda', 'Fortinet',
  'Carbon Black', 'SentinelOne', 'Cylance', 'Check Point', 'Webroot',
  'Emsisoft', 'G Data', 'NANO Antivirus', 'Rising', 'Quick Heal',
  'Comodo', 'Dr.Web', 'K7 AntiVirus', 'IKARUS', 'Zillya',
  'AhnLab', 'Avira', 'Jiangmin', 'Lionic', 'Zoner',
  'MaxSecure', 'TotalDefense', 'VBA32', 'Xcitium', 'Yandex'
];

const MALWARE_FAMILIES = {
  'Cobalt Strike': { type: 'Trojan', category: 'Backdoor/C2' },
  'Mimikatz': { type: 'HackTool', category: 'Credential Stealer' },
  'Emotet': { type: 'Trojan', category: 'Banking Trojan / Loader' },
  'Ryuk': { type: 'Ransomware', category: 'File Encryptor' },
  'BlackCat': { type: 'Ransomware', category: 'RaaS' },
  'Metasploit': { type: 'HackTool', category: 'Exploitation Framework' },
  'PowerShell Empire': { type: 'HackTool', category: 'Post-Exploitation' },
  'RedLine Stealer': { type: 'Trojan', category: 'InfoStealer' },
  'AgentTesla': { type: 'Trojan', category: 'InfoStealer / RAT' },
  'QakBot': { type: 'Trojan', category: 'Banking Trojan' },
  'Generic.Trojan': { type: 'Trojan', category: 'Generic Malware' },
  'Unknown': { type: 'Suspicious', category: 'Unclassified' },
};

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 7;
    h ^= h << 17;
    return Math.abs(h) / 2147483648;
  };
}

function buildDetections(hash, malwareFamily, isMalicious) {
  const rng = seededRandom(hash);
  const family = MALWARE_FAMILIES[malwareFamily] ?? MALWARE_FAMILIES['Generic.Trojan'];
  const engines = [...AV_ENGINES].sort(() => rng() - 0.5);

  const detectionNames = [
    `Trojan.${malwareFamily?.replace(/\s/g, '') ?? 'Generic'}.Gen`,
    `Backdoor:Win32/${malwareFamily?.replace(/\s/g, '') ?? 'Unknown'}`,
    `HEUR:Trojan.Win32.${malwareFamily?.replace(/\s/g, '') ?? 'Generic'}`,
    `Malicious.${(hash.slice(0, 8)).toUpperCase()}`,
    `${family.type}.Win.${malwareFamily?.replace(/\s/g, '') ?? 'Generic'}`,
    `Gen:Variant.${malwareFamily?.replace(/\s/g, '') ?? 'Ursu'}.${Math.floor(Math.abs(seededRandom(hash)() * 99999))}`,
    `W32/${malwareFamily?.replace(/\s/g, '') ?? 'Trojan'}.GEN`,
    `Trojan.GenericKD.${Math.floor(Math.abs(seededRandom(hash + '1')() * 90000000))}`,
    `RDN/Generic.${family.type}`,
    `Artemis!${hash.slice(0, 16).toUpperCase()}`,
  ];

  const detectingCount = isMalicious ? Math.floor(38 + rng() * 20) : 0;

  return engines.map((engine, idx) => {
    const detected = isMalicious && idx < detectingCount;
    return {
      engine,
      detected,
      name: detected ? detectionNames[idx % detectionNames.length] : null,
      version: `${Math.floor(1 + rng() * 22)}.${Math.floor(rng() * 10)}.${Math.floor(rng() * 9999)}`,
      updated: generateRecentDate(rng, 1, 5)
    };
  });
}

function generateRecentDate(rng, minDaysAgo, maxDaysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(minDaysAgo + rng() * (maxDaysAgo - minDaysAgo)));
  return d.toISOString().split('T')[0];
}

function deriveFakeHashes(sha256) {
  const rng = seededRandom(sha256 + 'md5');
  const hex = () => Math.floor(rng() * 16).toString(16);
  const md5 = Array.from({ length: 32 }, hex).join('');
  const sha1 = Array.from({ length: 40 }, hex).join('');
  return { md5, sha1 };
}

function HashRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center py-1 border-b border-slate-700/50">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-xs text-slate-200 font-mono truncate">{value}</span>
      <button onClick={copy} className="text-xs text-teal-400 hover:text-teal-300 px-2 py-0.5 rounded border border-teal-500/30 hover:border-teal-400/50 transition-colors">
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function InfoCard({ label, value, icon, mono = false, highlight = false }) {
  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg ${highlight ? 'bg-red-900/20 border border-red-500/30' : 'bg-slate-800/50'}`}>
      <div className="text-slate-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`text-sm font-medium ${mono ? 'font-mono' : ''} ${highlight ? 'text-red-300' : 'text-white'}`}>{value}</div>
      </div>
    </div>
  );
}

export default function HashLookupPanel({ hash, isMalicious = true, malwareFamily = 'Generic.Trojan', fileName = 'payload.exe', onClose }) {
  const [showAllEngines, setShowAllEngines] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const detections = buildDetections(hash, malwareFamily, isMalicious);
      const { md5, sha1 } = deriveFakeHashes(hash);
      const detected = detections.filter(d => d.detected).length;
      const rng = seededRandom(hash);

      setResult({
        sha256: hash,
        md5,
        sha1,
        fileName: fileName || 'unknown.exe',
        fileType: 'Win32 EXE',
        fileSize: `${Math.floor(120 + rng() * 880)} KB`,
        malwareFamily: malwareFamily || 'Generic.Trojan',
        familyInfo: MALWARE_FAMILIES[malwareFamily] ?? MALWARE_FAMILIES['Generic.Trojan'],
        detections,
        detectedCount: detected,
        totalEngines: detections.length,
        firstSeen: generateRecentDate(seededRandom(hash + 'first'), 30, 180),
        lastSeen: generateRecentDate(seededRandom(hash + 'last'), 0, 7),
        tags: isMalicious
          ? ['malware', 'trojan', 'suspicious', malwareFamily?.toLowerCase().replace(/\s/g, '-') ?? 'unknown']
          : ['clean', 'benign'],
        threat_score: isMalicious ? Math.floor(85 + rng() * 14) : Math.floor(1 + rng() * 8)
      });
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [hash, isMalicious, malwareFamily, fileName]);

  const visibleDetections = showAllEngines ? result?.detections : result?.detections?.slice(0, 15);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-start justify-between gap-3 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-4 h-4 text-teal-400" />
              <h2 className="text-white font-bold text-base">Hash Threat Intelligence Lookup</h2>
            </div>
            <p className="text-xs font-mono text-slate-400 break-all">{hash}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors mt-1 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-400 text-sm">Querying threat intelligence databases...</p>
              <p className="text-slate-500 text-xs">Checking {AV_ENGINES.length} security vendors</p>
            </div>
          ) : result ? (
            <>
              {/* Verdict Banner */}
              {isMalicious ? (
                <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-400 font-bold text-sm">MALICIOUS</span>
                      <Badge className="bg-red-600 text-white text-xs">{result.detectedCount}/{result.totalEngines} Detections</Badge>
                    </div>
                    <p className="text-slate-300 text-xs">
                      This file has been identified as <strong>{result.malwareFamily}</strong> ({result.familyInfo.category}) by {result.detectedCount} security vendors.
                    </p>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="text-2xl font-bold text-red-400">{result.threat_score}</div>
                    <div className="text-xs text-slate-400">Threat Score</div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400 font-bold text-sm">CLEAN</span>
                    </div>
                    <p className="text-slate-300 text-xs">No security vendors flagged this file as malicious.</p>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="text-2xl font-bold text-green-400">{result.threat_score}</div>
                    <div className="text-xs text-slate-400">Threat Score</div>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {result.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs border-slate-600 text-slate-300">
                    <Tag className="w-3 h-3 mr-1" />{tag}
                  </Badge>
                ))}
              </div>

              {/* File Info */}
              <div className="grid grid-cols-2 gap-2">
                <InfoCard label="File Name" value={result.fileName} icon={<FileText className="w-4 h-4" />} />
                <InfoCard label="File Type" value={result.fileType} icon={<FileText className="w-4 h-4" />} />
                <InfoCard label="File Size" value={result.fileSize} icon={<FileText className="w-4 h-4" />} />
                <InfoCard label="Malware Family" value={result.malwareFamily} icon={<ShieldAlert className="w-4 h-4" />} highlight={isMalicious} />
                <InfoCard label="First Seen" value={result.firstSeen} icon={<Clock className="w-4 h-4" />} />
                <InfoCard label="Last Seen" value={result.lastSeen} icon={<Clock className="w-4 h-4" />} />
              </div>

              {/* Hash Fingerprints */}
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-400 font-semibold mb-2">File Fingerprints</p>
                <HashRow label="SHA256" value={result.sha256} />
                <HashRow label="MD5" value={result.md5} />
                <HashRow label="SHA1" value={result.sha1} />
              </div>

              {/* Detection Results */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400 font-semibold">
                    Security Vendor Analysis ({result.detectedCount} of {result.totalEngines} flagged)
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/50">
                        <th className="text-left p-2 text-slate-400 font-medium">Engine</th>
                        <th className="text-left p-2 text-slate-400 font-medium">Status</th>
                        <th className="text-left p-2 text-slate-400 font-medium">Detection Name</th>
                        <th className="text-left p-2 text-slate-400 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDetections.map((d, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                          <td className="p-2 text-slate-300 font-medium">{d.engine}</td>
                          <td className="p-2">
                            {d.detected ? (
                              <span className="text-red-400 font-semibold">Detected</span>
                            ) : (
                              <span className="text-green-400">Clean</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 font-mono">{d.name ?? <span className="text-slate-600">Undetected</span>}</td>
                          <td className="p-2 text-slate-500">{d.updated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => setShowAllEngines(v => !v)}
                  className="mt-2 text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                >
                  {showAllEngines ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAllEngines ? 'Show less' : `Show all ${result.totalEngines} engines`}
                </button>
              </div>

              {/* Analyst Tip */}
              {isMalicious && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300">
                    <strong className="text-yellow-400">Analyst Tip:</strong> This hash is confirmed malicious.
                    Isolate the affected endpoint, collect a forensic image, and search all other endpoints for this hash.
                    Correlate with network logs to identify C2 communication.
                  </p>
                </div>
              )}

              <Button onClick={onClose} className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                Close Lookup
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}