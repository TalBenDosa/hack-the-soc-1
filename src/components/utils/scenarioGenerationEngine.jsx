/**
 * Scenario Generation Engine — Frontend Orchestrator
 *
 * Calls the backend `generateFullScenario` function and returns the
 * full structured scenario output.
 *
 * No external threat-intel APIs are used. All hashes are
 * deterministically generated from the scenario parameters.
 */

import { base44 } from '@/api/base44Client';

// ── Scenario-type catalogue ────────────────────────────────────────────────

export const SCENARIO_TYPES = [
  {
    key: 'phishing_credential_theft',
    label: 'Phishing → Credential Theft',
    category: 'Phishing / Social Engineering',
    difficulty: 'Beginner',
    defaultSources: ['Email Security / Mail Gateway', 'Office365 / Microsoft 365 Audit', 'Azure AD / Entra ID', 'EDR'],
    mitre: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' },
      { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
      { id: 'T1110', name: 'Brute Force', tactic: 'Credential Access' }
    ]
  },
  {
    key: 'malware_execution',
    label: 'Malware Execution',
    category: 'Malware',
    difficulty: 'Intermediate',
    defaultSources: ['EDR', 'Windows Security Events', 'Firewall', 'DNS'],
    mitre: [
      { id: 'T1204', name: 'User Execution', tactic: 'Execution' },
      { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' },
      { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion' }
    ]
  },
  {
    key: 'suspicious_powershell',
    label: 'Suspicious PowerShell',
    category: 'Malware',
    difficulty: 'Intermediate',
    defaultSources: ['EDR', 'Windows Security Events', 'Active Directory', 'Wazuh'],
    mitre: [
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1027', name: 'Obfuscated Files or Information', tactic: 'Defense Evasion' }
    ]
  },
  {
    key: 'ransomware_behavior',
    label: 'Ransomware Behavior',
    category: 'Malware',
    difficulty: 'Advanced',
    defaultSources: ['EDR', 'Windows Security Events', 'Active Directory', 'Firewall', 'CrowdStrike Falcon'],
    mitre: [
      { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
      { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact' },
      { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access' }
    ]
  },
  {
    key: 'lateral_movement',
    label: 'Lateral Movement',
    category: 'Network Intrusion',
    difficulty: 'Advanced',
    defaultSources: ['Active Directory', 'Windows Security Events', 'EDR', 'Firewall', 'IDS / IPS'],
    mitre: [
      { id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement' },
      { id: 'T1550', name: 'Use Alternate Authentication Material', tactic: 'Defense Evasion' },
      { id: 'T1087', name: 'Account Discovery', tactic: 'Discovery' }
    ]
  },
  {
    key: 'brute_force_attack',
    label: 'Brute Force Attack',
    category: 'Brute Force',
    difficulty: 'Beginner',
    defaultSources: ['Active Directory', 'Windows Security Events', 'VPN', 'Firewall', 'Azure AD / Entra ID'],
    mitre: [
      { id: 'T1110.001', name: 'Password Guessing', tactic: 'Credential Access' },
      { id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' },
      { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' }
    ]
  },
  {
    key: 'impossible_travel',
    label: 'Impossible Travel',
    category: 'Phishing / Social Engineering',
    difficulty: 'Beginner',
    defaultSources: ['Azure AD / Entra ID', 'Office365 / Microsoft 365 Audit', 'VPN'],
    mitre: [
      { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
      { id: 'T1133', name: 'External Remote Services', tactic: 'Initial Access' }
    ]
  },
  {
    key: 'suspicious_mailbox_access',
    label: 'Suspicious Mailbox Access',
    category: 'Phishing / Social Engineering',
    difficulty: 'Intermediate',
    defaultSources: ['Office365 / Microsoft 365 Audit', 'Azure AD / Entra ID', 'Email Security / Mail Gateway'],
    mitre: [
      { id: 'T1114', name: 'Email Collection', tactic: 'Collection' },
      { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' }
    ]
  },
  {
    key: 'oauth_consent_abuse',
    label: 'OAuth Consent Abuse',
    category: 'Cloud Misconfiguration',
    difficulty: 'Advanced',
    defaultSources: ['Azure AD / Entra ID', 'Office365 / Microsoft 365 Audit', 'Azure Activity Logs'],
    mitre: [
      { id: 'T1550.001', name: 'Application Access Token', tactic: 'Defense Evasion' },
      { id: 'T1528', name: 'Steal Application Access Token', tactic: 'Credential Access' }
    ]
  },
  {
    key: 'data_exfiltration',
    label: 'Data Exfiltration',
    category: 'Data Exfiltration',
    difficulty: 'Advanced',
    defaultSources: ['DLP', 'Proxy', 'Firewall', 'EDR', 'Office365 / Microsoft 365 Audit'],
    mitre: [
      { id: 'T1567', name: 'Exfiltration Over Web Service', tactic: 'Exfiltration' },
      { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration' },
      { id: 'T1560', name: 'Archive Collected Data', tactic: 'Collection' }
    ]
  },
  {
    key: 'insider_threat',
    label: 'Insider Threat',
    category: 'Insider Threat',
    difficulty: 'Hard',
    defaultSources: ['DLP', 'Office365 / Microsoft 365 Audit', 'Active Directory', 'Proxy', 'EDR'],
    mitre: [
      { id: 'T1005', name: 'Data from Local System', tactic: 'Collection' },
      { id: 'T1567', name: 'Exfiltration Over Web Service', tactic: 'Exfiltration' }
    ]
  },
  {
    key: 'c2_communication',
    label: 'C2 Communication',
    category: 'Network Intrusion',
    difficulty: 'Advanced',
    defaultSources: ['Firewall', 'IDS / IPS', 'DNS', 'Proxy', 'EDR'],
    mitre: [
      { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control' },
      { id: 'T1095', name: 'Non-Application Layer Protocol', tactic: 'Command and Control' },
      { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' }
    ]
  },
  {
    key: 'dns_tunneling',
    label: 'DNS Tunneling',
    category: 'Network Intrusion',
    difficulty: 'Hard',
    defaultSources: ['DNS', 'Firewall', 'IDS / IPS', 'EDR'],
    mitre: [
      { id: 'T1071.004', name: 'DNS', tactic: 'Command and Control' },
      { id: 'T1048.003', name: 'Exfiltration Over Unencrypted Protocol', tactic: 'Exfiltration' }
    ]
  },
  {
    key: 'suspicious_admin_activity',
    label: 'Suspicious Admin Activity',
    category: 'Privilege Escalation',
    difficulty: 'Intermediate',
    defaultSources: ['Active Directory', 'Windows Security Events', 'EDR', 'Azure AD / Entra ID'],
    mitre: [
      { id: 'T1078.002', name: 'Domain Accounts', tactic: 'Defense Evasion' },
      { id: 'T1098', name: 'Account Manipulation', tactic: 'Persistence' },
      { id: 'T1136', name: 'Create Account', tactic: 'Persistence' }
    ]
  },
  {
    key: 'shadow_copy_deletion',
    label: 'Shadow Copy Deletion',
    category: 'Malware',
    difficulty: 'Advanced',
    defaultSources: ['EDR', 'Windows Security Events', 'Wazuh', 'CrowdStrike Falcon'],
    mitre: [
      { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact' },
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { id: 'T1047', name: 'Windows Management Instrumentation', tactic: 'Execution' }
    ]
  },
  {
    key: 'persistence_scheduled_task',
    label: 'Persistence via Scheduled Task',
    category: 'Malware',
    difficulty: 'Intermediate',
    defaultSources: ['EDR', 'Windows Security Events', 'Wazuh', 'Active Directory'],
    mitre: [
      { id: 'T1053.005', name: 'Scheduled Task', tactic: 'Persistence' },
      { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' }
    ]
  },
  {
    key: 'credential_dumping',
    label: 'Credential Dumping Simulation',
    category: 'Privilege Escalation',
    difficulty: 'Hard',
    defaultSources: ['EDR', 'Windows Security Events', 'CrowdStrike Falcon', 'Active Directory'],
    mitre: [
      { id: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access' },
      { id: 'T1003.003', name: 'NTDS', tactic: 'Credential Access' },
      { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion' }
    ]
  },
  {
    key: 'sharepoint_onedrive_download',
    label: 'Suspicious SharePoint / OneDrive Download',
    category: 'Data Exfiltration',
    difficulty: 'Intermediate',
    defaultSources: ['Office365 / Microsoft 365 Audit', 'Azure AD / Entra ID', 'DLP', 'Proxy'],
    mitre: [
      { id: 'T1213.002', name: 'SharePoint', tactic: 'Collection' },
      { id: 'T1567.002', name: 'Exfiltration to Cloud Storage', tactic: 'Exfiltration' }
    ]
  },
  {
    key: 'vpn_anomaly',
    label: 'VPN Anomaly',
    category: 'Network Intrusion',
    difficulty: 'Beginner',
    defaultSources: ['VPN', 'Active Directory', 'Firewall', 'Azure AD / Entra ID'],
    mitre: [
      { id: 'T1133', name: 'External Remote Services', tactic: 'Initial Access' },
      { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' }
    ]
  },
  {
    key: 'cloud_privilege_escalation',
    label: 'Cloud Privilege Escalation',
    category: 'Cloud Misconfiguration',
    difficulty: 'Hard',
    defaultSources: ['AWS CloudTrail', 'Azure Activity Logs', 'Azure AD / Entra ID'],
    mitre: [
      { id: 'T1548', name: 'Abuse Elevation Control Mechanism', tactic: 'Privilege Escalation' },
      { id: 'T1098', name: 'Account Manipulation', tactic: 'Persistence' },
      { id: 'T1580', name: 'Cloud Infrastructure Discovery', tactic: 'Discovery' }
    ]
  }
];

// ── Available data sources ─────────────────────────────────────────────────

export const DATA_SOURCES = [
  'EDR',
  'Microsoft Defender for Endpoint',
  'Office365 / Microsoft 365 Audit',
  'Azure AD / Entra ID',
  'Active Directory',
  'Windows Security Events',
  'Firewall',
  'DNS',
  'Proxy',
  'IDS / IPS',
  'DLP',
  'Email Security / Mail Gateway',
  'CrowdStrike Falcon',
  'Wazuh',
  'VPN',
  'NAC',
  'AWS CloudTrail',
  'Azure Activity Logs'
];

export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Hard'];

// ── Main generation function ───────────────────────────────────────────────

/**
 * Generate a full SOC scenario via the backend function.
 *
 * @param {object} options
 * @param {string} options.attackType - scenario type key
 * @param {string} options.difficulty - Beginner | Intermediate | Advanced | Hard
 * @param {string[]} options.dataSources - list of log sources
 * @param {number} options.numLogs - minimum number of logs (default 12)
 * @returns {Promise<object>} - { scenario_id, scenario, raw_generated }
 */
export async function generateFullScenario({
  attackType,
  difficulty = 'Intermediate',
  dataSources = ['EDR', 'Firewall', 'Active Directory', 'Windows Security Events'],
  numLogs = 12
}) {
  const scenarioType = SCENARIO_TYPES.find(s => s.key === attackType);
  const scenarioTypeLabel = scenarioType?.label || attackType;

  const result = await base44.functions.invoke('generateFullScenario', {
    attackType,
    difficulty,
    dataSources,
    numLogs,
    scenarioTypeLabel
  });

  if (!result?.data?.success) {
    throw new Error(result?.data?.error || 'Failed to generate scenario');
  }

  return result.data;
}

/**
 * Get a random scenario type
 */
export function getRandomScenarioType() {
  return SCENARIO_TYPES[Math.floor(Math.random() * SCENARIO_TYPES.length)];
}

/**
 * Get scenario type by key
 */
export function getScenarioType(key) {
  return SCENARIO_TYPES.find(s => s.key === key) || null;
}