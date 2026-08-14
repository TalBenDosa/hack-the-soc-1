// Demo fixtures for capturing the real Hack The SOC UI without a backend.
// All data is synthetic demo content — no real users, tenants, or customers.

export const USER = {
  id: 'demo-user-1',
  full_name: 'Alex Weiss',
  email: 'analyst@demo.hackthesoc.app',
  role: 'user',
  total_points: 2480,
  level: 5,
  current_streak: 12,
  longest_streak: 21,
  achievements: ['first_investigation', 'hash_hunter', 'week_streak', 'sharp_eye'],
  skill_levels: {
    malware_detection: 78,
    network_analysis: 65,
    incident_response: 82,
    threat_hunting: 58,
  },
  subscription_tier: 'full',
  tenant_id: 'demo-tenant',
};

export const SCENARIOS = [
  {
    id: 'scn-001', is_active: true, difficulty: 'Medium',
    title: 'Suspicious PowerShell Execution',
    description: 'An endpoint triggered multiple encoded PowerShell commands shortly after a user opened an email attachment. Determine whether this is a genuine compromise.',
    tags: ['Living off the Land', 'Endpoint Security', 'Phishing'],
  },
  {
    id: 'scn-002', is_active: true, difficulty: 'Hard',
    title: 'Impossible Travel — Entra ID',
    description: 'A single account authenticated from two continents within eleven minutes. Correlate sign-in logs and decide whether the session should be revoked.',
    tags: ['Identity', 'Azure AD / Entra ID', 'Account Takeover'],
  },
  {
    id: 'scn-003', is_active: true, difficulty: 'Advanced',
    title: 'Ransomware Staging Detected',
    description: 'Shadow copies were deleted across three hosts and a known packer signature fired on the file server. Scope the blast radius before it encrypts.',
    tags: ['Ransomware', 'Incident Response', 'Forensics'],
  },
  {
    id: 'scn-004', is_active: true, difficulty: 'Easy',
    title: 'Brute Force Against VPN Gateway',
    description: 'Hundreds of failed authentications from a single ASN, followed by one success. Classify the alert and recommend containment.',
    tags: ['Network Security', 'Credential Stuffing', 'VPN'],
  },
  {
    id: 'scn-005', is_active: true, difficulty: 'Medium',
    title: 'Data Exfiltration via DNS',
    description: 'Unusually long TXT queries to a newly registered domain are leaving the finance subnet. Confirm or rule out tunnelling.',
    tags: ['Threat Detection', 'DNS', 'Exfiltration'],
  },
  {
    id: 'scn-006', is_active: true, difficulty: 'Hard',
    title: 'Lateral Movement via SMB',
    description: 'Service account activity spiked across twelve workstations overnight. Trace the movement path and identify patient zero.',
    tags: ['Lateral Movement', 'Threat Hunting', 'Windows Security Events'],
  },
];

export const LESSONS = [
  { id: 'les-1', is_active: true, title: 'SOC Fundamentals: The Triage Mindset', category: 'Fundamentals', difficulty: 'Beginner', estimated_read_time: 8, description: 'How analysts decide what deserves attention in the first sixty seconds of an alert.' },
  { id: 'les-2', is_active: true, title: 'Reading Windows Security Events', category: 'Endpoint Security', difficulty: 'Beginner', estimated_read_time: 12, description: 'Event IDs that actually matter, and the ones that only look scary.' },
  { id: 'les-3', is_active: true, title: 'Indicators of Compromise in Practice', category: 'Threat Detection', difficulty: 'Intermediate', estimated_read_time: 15, description: 'Turning raw artefacts into indicators you can pivot on.' },
  { id: 'les-4', is_active: true, title: 'Incident Response: Containment First', category: 'Incident Response', difficulty: 'Intermediate', estimated_read_time: 11, description: 'Why the instinct to investigate before isolating costs you the network.' },
  { id: 'les-5', is_active: true, title: 'Memory Forensics Primer', category: 'Forensics', difficulty: 'Advanced', estimated_read_time: 20, description: 'Pulling process trees and injected code out of a memory image.' },
  { id: 'les-6', is_active: true, title: 'Detecting Command and Control Traffic', category: 'Network Security', difficulty: 'Advanced', estimated_read_time: 17, description: 'Beacon jitter, TLS fingerprints, and the limits of signature matching.' },
];

const EMPTY = [];

const HOST = 'FIN-WKS-4471';
const IP = '10.42.18.203';
const USERNAME = 'm.harel';
const SHA256 = 'a7f3c9e21b8d4f60e5c7a913d2b84f6e0c1a5d97b3e8f2461c0d7a95e3b6f8c24';

const ev = (id, mins, source_type, rule_description, level, extra = {}) => ({
  id,
  timestamp: new Date(Date.UTC(2026, 7, 14, 2, mins, (id * 7) % 60)).toISOString(),
  source_type,
  rule_description,
  severity: level,
  hostname: HOST,
  username: USERNAME,
  ip_address: IP,
  agent: { name: HOST },
  rule: { level, description: rule_description },
  ...extra,
});

// A coherent phishing -> PowerShell -> C2 chain for scenario scn-001.
const SCN1_EVENTS = [
  ev(1, 3, 'Email Security / Mail Gateway', 'Attachment delivered from newly registered domain', 5,
    { raw_log_data: { rule: { level: 5, description: 'Attachment delivered from newly registered domain' }, sender: 'billing@invoice-secure-portal.com', subject: 'Outstanding Invoice #48812', attachment: 'Invoice_48812.xlsm' } }),
  ev(2, 6, 'Office365 / Microsoft 365 Audit', 'User opened macro-enabled attachment', 6,
    { raw_log_data: { rule: { level: 6, description: 'User opened macro-enabled attachment' }, file: 'Invoice_48812.xlsm', user: USERNAME } }),
  ev(3, 7, 'Windows Security Events', 'Office process spawned command interpreter', 8,
    { raw_log_data: { rule: { level: 8, description: 'Office process spawned command interpreter' }, parent_process: 'EXCEL.EXE', process: 'cmd.exe', event_id: 4688 } }),
  ev(4, 8, 'Microsoft Defender for Endpoint', 'Encoded PowerShell command executed', 9,
    { raw_log_data: { rule: { level: 9, description: 'Encoded PowerShell command executed' }, process: 'powershell.exe', command_line: 'powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA', parent_process: 'cmd.exe' } }),
  ev(5, 9, 'CrowdStrike Falcon', 'Unsigned binary written to AppData and executed', 10,
    { raw_log_data: { rule: { level: 10, description: 'Unsigned binary written to AppData and executed' }, file_path: 'C:\\Users\\m.harel\\AppData\\Roaming\\svchost32.exe', sha256: SHA256, signed: false } }),
  ev(6, 11, 'IDS / IPS', 'Outbound beacon to known C2 infrastructure', 10,
    { raw_log_data: { rule: { level: 10, description: 'Outbound beacon to known C2 infrastructure' }, destination_ip: '185.220.101.47', destination_port: 443, bytes_out: 4821, jitter: '±12%' } }),
  ev(7, 14, 'Wazuh', 'Scheduled task created for persistence', 9,
    { raw_log_data: { rule: { level: 9, description: 'Scheduled task created for persistence' }, task_name: 'MicrosoftEdgeUpdateTaskUser', command: 'C:\\Users\\m.harel\\AppData\\Roaming\\svchost32.exe' } }),
  ev(8, 17, 'Windows Security Events', 'Volume shadow copies enumerated', 8,
    { raw_log_data: { rule: { level: 8, description: 'Volume shadow copies enumerated' }, process: 'vssadmin.exe', command_line: 'vssadmin list shadows' } }),
];

SCENARIOS[0].initial_events = SCN1_EVENTS;
SCENARIOS[0].learning_objectives = [
  'Trace an intrusion from initial email delivery to established persistence',
  'Recognise encoded PowerShell as a living-off-the-land execution technique',
  'Pivot on a file hash to confirm a malicious binary',
  'Decide between true positive, false positive, and tier-two escalation',
];

export function fixtureFor(url) {
  const u = decodeURIComponent(url);
  if (/entities\/User\/me/.test(u)) return USER;
  if (/entities\/User\b/.test(u)) return [USER];
  const one = u.match(/entities\/Scenario\/([\w-]+)/);
  if (one) return SCENARIOS.find(s => s.id === one[1]) || SCENARIOS[0];
  if (/entities\/Scenario/.test(u)) return SCENARIOS;
  if (/entities\/Lesson/.test(u)) return LESSONS;
  if (/public-settings/.test(u)) return { id: 'demo', name: 'Hack The SOC', auth_required: false };
  if (/analytics\/track/.test(u)) return { ok: true };
  return EMPTY;
}
