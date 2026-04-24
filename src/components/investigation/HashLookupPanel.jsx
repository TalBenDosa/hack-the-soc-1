/**
 * HashLookupPanel
 *
 * Simulated threat-intelligence hash lookup panel for SOC training.
 * Renders a realistic VirusTotal-style result so students practice
 * the "check the hash" investigation step without hitting real APIs.
 *
 * Always marks the hash as MALICIOUS when it was flagged by the scenario;
 * renders a CLEAN result for benign hashes (those not in the scenario's IOC list).
 *
 * Props:
 *   hash          string   — SHA256 to look up
 *   isMalicious   boolean  — true = malicious, false = clean (default true)
 *   malwareFamily string   — e.g. "Cobalt Strike", "Emotet" (optional)
 *   fileName      string   — original file name (optional)
 *   onClose       function — called when the panel is dismissed
 */

import React, { useState, useEffect } from 'react';
import { X, Shield, ShieldAlert, ShieldCheck, AlertTriangle, Clock, Tag, FileText, Hash, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Deterministic-but-realistic AV engine set ─────────────────────────────

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
  'Cobalt Strike':     { type: 'Trojan', category: 'Backdoor/C2' },
  'Mimikatz':          { type: 'HackTool', category: 'Credential Stealer' },
  'Emotet':            { type: 'Trojan', category: 'Banking Trojan / Loader' },
  'Ryuk':              { type: 'Ransomware', category: 'File Encryptor' },
  'BlackCat':          { type: 'Ransomware', category: 'RaaS' },
  'Metasploit':        { type: 'HackTool', category: 'Exploitation Framework' },
  'PowerShell Empire': { type: 'HackTool', category: 'Post-Exploitation' },
  'RedLine Stealer':   { type: 'Trojan', category: 'InfoStealer' },
  'AgentTesla':        { type: 'Trojan', category: 'InfoStealer / RAT' },
  'QakBot':            { type: 'Trojan', category: 'Banking Trojan' },
  'Generic.Trojan':    { type: 'Trojan', category: 'Generic Malware' },
  'Unknown':           { type: 'Suspicious', category: 'Unclassified' },
};

// Seeded pseudo-random: same hash → same "random" detections every time
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

  // Shuffle engines deterministically
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
    `${malwareFamily?.replace(/\s/g, '') ?? 'Trojan'}.Dropper`,
    `${family.type}.Agent.BNCQ`,
    `Unsafe.AI_Score_${Math.floor(95 + rng() * 4)}%`,
    `Malware.${hash.slice(-6).toUpperCase()}`,
    `Threat.${malwareFamily?.replace(/\s/g, '') ?? 'Generic'}.H`
  ];

  const detectingCount = isMalicious ? Math.floor(38 + rng() * 20) : 0; // 38-57 if malicious

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

// Generate fake MD5 and SHA1 from SHA256 seed
function deriveFakeHashes(sha256) {
  const rng = seededRandom(sha256 + 'md5');
  const hex = () => Array.from({ length: 1 }, () => Math.floor(rng() * 16).toString(16)).join('');
  const md5 = Array.from({ length: 32 }, hex).join('');
  const sha1 = Array.from({ length: 40 }, hex).join('');
  return { md5, sha1 };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HashLookupPanel({ hash, isMalicious = true, malwareFamily = 'Generic.Trojan', fileName = 'payload.exe', onClose }) {
  const [showAllEngines, setShowAllEngines] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Simulate a 1.5 s "API call" delay for realism
    const timer = setTimeout(() => {
      const detections = buildDetections(hash, malwareFamily, isMalicious);
      const { md5, sha1 } = deriveFakeHashes(hash);
      const detected = detections.filter(d => d.detected).length;

      setResult({
        sha256: hash,
        md5,
        sha1,
        fileName: fileName || 'unknown.exe',
        fileType: 'Win32 EXE',
        fileSize: `${Math.floor(120 + seededRandom(hash)() * 880)} KB`,
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
        threat_score: isMalicious ? Math.floor(85 + seededRandom(hash)() * 14) : Math.floor(1 + seededRandom(hash)() * 8)
      });
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [hash, isMalicious, malwareFamily, fileName]);

  const visibleDetections = showAllEngines ? result?.detections : result?.detections?.slice(0, 15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-800/80 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Hash className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Hash Threat Intelligence Lookup</h2>
              <p className="text-slate-400 text-xs font-mono truncate max-w-xs">{hash}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-slate-700 rounded-full"></div>
              <div className="w-14 h-14 border-4 border-t-teal-400 border-r-teal-400 rounded-full animate-spin absolute inset-0"></div>
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Querying threat intelligence databases...</p>
              <p className="text-slate-400 text-sm mt-1">Checking {AV_ENGINES.length} security vendors</p>
            </div>
          </div>
        ) : result ? (
          <div className="p-5 space-y-5">

            {/* ── Verdict Banner ── */}
            {isMalicious ? (
              <div className="flex items-center gap-4 p-4 bg-red-950/60 border border-red-500/50 rounded-xl">
                <ShieldAlert className="w-10 h-10 text-red-400 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-red-300 font-bold text-lg uppercase tracking-wide">MALICIOUS</span>
                    <Badge className="bg-red-500/30 text-red-300 border-red-500/50 text-xs">
                      {result.detectedCount}/{result.totalEngines} Detections
                    </Badge>
                  </div>
                  <p className="text-red-200/80 text-sm mt-1">
                    This file has been positively identified as <strong>{result.malwareFamily}</strong> ({result.familyInfo.category}) by {result.detectedCount} security vendors.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-4xl font-bold text-red-400">{result.threat_score}</div>
                  <div className="text-red-300/70 text-xs">Threat Score</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-green-950/60 border border-green-500/50 rounded-xl">
                <ShieldCheck className="w-10 h-10 text-green-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-green-300 font-bold text-lg uppercase tracking-wide">CLEAN</span>
                  <p className="text-green-200/80 text-sm mt-1">
                    No security vendors flagged this file as malicious.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-4xl font-bold text-green-400">{result.threat_score}</div>
                  <div className="text-green-300/70 text-xs">Threat Score</div>
                </div>
              </div>
            )}

            {/* ── Tags ── */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-slate-400" />
              {result.tags.map(tag => (
                <Badge key={tag} className="bg-slate-700 text-slate-300 border-slate-600 text-xs">{tag}</Badge>
              ))}
            </div>

            {/* ── File Info ── */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="File Name" value={result.fileName} icon={<FileText className="w-4 h-4 text-teal-400" />} mono />
              <InfoCard label="File Type" value={result.fileType} icon={<FileText className="w-4 h-4 text-teal-400" />} />
              <InfoCard label="File Size" value={result.fileSize} icon={<Hash className="w-4 h-4 text-slate-400" />} />
              <InfoCard label="Malware Family" value={`${result.malwareFamily} (${result.familyInfo.type})`} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} highlight={isMalicious} />
              <InfoCard label="First Seen" value={result.firstSeen} icon={<Clock className="w-4 h-4 text-slate-400" />} />
              <InfoCard label="Last Seen" value={result.lastSeen} icon={<Clock className="w-4 h-4 text-slate-400" />} />
            </div>

            {/* ── Hash Fingerprints ── */}
            <div className="space-y-2 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">File Fingerprints</p>
              <HashRow label="SHA256" value={result.sha256} />
              <HashRow label="SHA1  " value={result.sha1} />
              <HashRow label="MD5   " value={result.md5} />
            </div>

            {/* ── Detection Results Table ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-medium">
                  Security Vendor Analysis
                  <span className="ml-2 text-slate-400 text-sm font-normal">
                    ({result.detectedCount} of {result.totalEngines} flagged)
                  </span>
                </p>
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(result.detectedCount / result.totalEngines) * 100}%`,
                      backgroundColor: isMalicious ? '#ef4444' : '#22c55e'
                    }}
                  />
                </div>
              </div>

              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="text-left text-slate-400 px-4 py-2 font-medium">Engine</th>
                      <th className="text-left text-slate-400 px-4 py-2 font-medium">Status</th>
                      <th className="text-left text-slate-400 px-4 py-2 font-medium">Detection Name</th>
                      <th className="text-left text-slate-400 px-4 py-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDetections.map((d, i) => (
                      <tr key={d.engine} className={`border-t border-slate-800 ${i % 2 === 0 ? 'bg-slate-900/30' : ''}`}>
                        <td className="px-4 py-2 text-white font-medium">{d.engine}</td>
                        <td className="px-4 py-2">
                          {d.detected ? (
                            <span className="text-red-400 font-semibold">Detected</span>
                          ) : (
                            <span className="text-green-500">Clean</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-300">
                          {d.name ?? <span className="text-slate-500 italic">Undetected</span>}
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-xs">{d.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="mt-2 flex items-center gap-1 text-teal-400 hover:text-teal-300 text-sm mx-auto"
                onClick={() => setShowAllEngines(v => !v)}
              >
                {showAllEngines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAllEngines ? 'Show less' : `Show all ${result.totalEngines} engines`}
              </button>
            </div>

            {/* ── Analyst Tip ── */}
            {isMalicious && (
              <div className="flex gap-3 p-4 bg-amber-950/40 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200/80">
                  <strong className="text-amber-300">Analyst Tip:</strong> This hash is confirmed malicious.
                  Locate the affected endpoint immediately, isolate from network, and collect a forensic image.
                  Search all other endpoints for this hash. Correlate with network logs to identify C2 communication.
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white">
                Close Lookup
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoCard({ label, value, icon, mono = false, highlight = false }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-sm break-all ${mono ? 'font-mono' : ''} ${highlight ? 'text-red-300 font-semibold' : 'text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );
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
    <div className="flex items-center gap-2 text-xs font-mono group">
      <span className="text-slate-500 w-10 shrink-0">{label}</span>
      <span className="text-slate-300 break-all flex-1">{value}</span>
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 text-teal-400 hover:text-teal-300 text-xs transition-opacity shrink-0"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
