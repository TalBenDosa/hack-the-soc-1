/**
 * Scenario Generation Engine — Frontend Orchestrator
 *
 * Calls the backend `generateFullScenario` function and returns the
 * full structured scenario output.  Falls back to InvokeLLM when the
 * backend function is unavailable.
 *
 * NOTE: No external threat-intel APIs are used.  All hashes are
 * deterministically generated from the scenario parameters.  The
 * HashLookupPanel component provides a simulated TI lookup experience
 * for students so they practice the investigation step.
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
      { id: 'T1027', name: 'Obfuscated Files or Information', tactic: 'Defense Evasion' },
      { id: 'T1086', name: 'PowerShell', tactic: 'Execution' }
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

export const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Hard'];

// ── Main engine function ───────────────────────────────────────────────────

/**
 * Generate a full scenario using the backend function.
 * Falls back to the legacy in-browser generator on error.
 *
 * @param {object} opts
 * @param {string}   opts.scenarioTypeKey   — key from SCENARIO_TYPES
 * @param {string}   opts.difficulty
 * @param {string[]} opts.dataSources
 * @param {number}   opts.numLogs
 * @param {boolean}  opts.useRealIOCs
 * @returns {Promise<FullScenarioResult>}
 */
export async function generateFullScenario(opts = {}) {
  const {
    scenarioTypeKey,
    difficulty = 'Intermediate',
    dataSources = ['EDR', 'Firewall', 'Active Directory'],
    numLogs = 12,
    useRealIOCs = false
  } = opts;

  const typeInfo = SCENARIO_TYPES.find((t) => t.key === scenarioTypeKey) ?? SCENARIO_TYPES[0];

  console.log('[ScenarioEngine] Starting generation:', typeInfo.label, difficulty);

  try {
    // Try the backend function first
    const result = await base44.functions.generateFullScenario({
      attackType: typeInfo.key,
      difficulty,
      dataSources,
      numLogs,
      useRealIOCs,
      scenarioTypeLabel: typeInfo.label
    });

    if (result?.success && result?.full_output) {
      console.log('[ScenarioEngine] Backend generation success:', result.logs_count, 'logs');
      return normalizeBackendResult(result, typeInfo);
    }
    throw new Error('Backend returned incomplete result');
  } catch (backendErr) {
    console.warn('[ScenarioEngine] Backend function failed, falling back to InvokeLLM:', backendErr.message);
    return generateViaInvokeLLM(typeInfo, difficulty, dataSources, numLogs, useRealIOCs);
  }
}

// ── InvokeLLM fallback ─────────────────────────────────────────────────────

async function generateViaInvokeLLM(typeInfo, difficulty, dataSources, numLogs, useRealIOCs) {
  // Generate a deterministic simulated hash — no external API needed.
  // The HashLookupPanel will present this hash as malicious to the student.
  const seed = `${typeInfo.key}-${difficulty}-${Date.now()}`;
  const primaryHash = generateSimulatedHash(seed);
  const primaryFile = pickMaliciousFileName(typeInfo.key);
  const malwareFamily = pickMalwareFamily(typeInfo.key);
  const iocContext = `\nSimulated Malicious Hash: ${primaryHash}\nFile: ${primaryFile}\nFamily: ${malwareFamily}\nUSE THIS HASH in EDR/AV/CrowdStrike/Wazuh logs.`;

  const techniquesList = typeInfo.mitre
    .map((m) => `  - ${m.id} (${m.tactic}): ${m.name}`)
    .join('\n');

  const prompt = buildInvokeLLMPrompt(typeInfo, difficulty, dataSources, numLogs, techniquesList, iocContext, primaryHash, primaryFile, malwareFamily);

  console.log('[ScenarioEngine] Calling InvokeLLM...');

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: buildOutputSchema()
  });

  console.log('[ScenarioEngine] InvokeLLM returned:', response?.scenario?.title);

  validateInvokeLLMResponse(response);

  return normalizeInvokeLLMResult(response, typeInfo, difficulty, dataSources, primaryHash, primaryFile, malwareFamily, useRealIOCs);
}

function buildInvokeLLMPrompt(typeInfo, difficulty, dataSources, numLogs, techniquesList, iocContext, primaryHash, primaryFile, malwareFamily) {
  return `You are a world-class SOC training architect. Generate a PRODUCTION-GRADE cybersecurity scenario.

SCENARIO TYPE: ${typeInfo.label}
DIFFICULTY: ${difficulty}
DATA SOURCES: ${dataSources.join(', ')}
MINIMUM LOGS: ${numLogs}
${iocContext}

MITRE ATT&CK Techniques:
${techniquesList}

STORY REQUIREMENT:
The ${numLogs}+ logs must tell a coherent, chronological attack story:
  Phase 1 (logs 1-2): Initial access / first alert
  Phase 2 (logs 3-4): Detection / security tool alert
  Phase 3 (logs 5-8): Attack progression
  Phase 4 (logs 9-${numLogs}): Impact / objective reached
  Plus: benign noise logs, at least 1 false positive, at least 1 Tier-2 escalation event

QUALITY RULES:
- Each raw_log_data must have 15-40 realistic fields matching the actual security product
- Consistent actor: same attacker IP, same victim hostname/username across all logs
- All emails must be full valid addresses (user@domain.com)
- Realistic private IPs (10.x, 172.16-31.x, 192.168.x) for internal, real public IPs for external
- Process names must be real (powershell.exe, cmd.exe, lsass.exe, etc.)
- File paths must be valid OS paths
- For EDR: include SHA256 = ${primaryHash}, FileName = ${primaryFile}
- For Firewall: include src_ip, dst_ip, src_port, dst_port, protocol, action, bytes
- For AD/Windows: include EventID, SubjectUserName, TargetUserName, LogonType
- For Office365: include Operation, UserId, ClientIP, Workload, UserAgent, ObjectId
- For DNS: include query_name, query_type, response_code, resolved_ip, client_ip
- For AWS: include eventName, eventSource, userIdentity, sourceIPAddress, requestParameters

Generate a complete, realistic, analyst-grade scenario:`;
}

function buildOutputSchema() {
  return {
    type: 'object',
    properties: {
      scenario: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          business_context: { type: 'string' },
          attack_objective: { type: 'string' },
          difficulty: { type: 'string' },
          scenario_type: { type: 'string' },
          mitre: { type: 'array', items: { type: 'object' } },
          data_sources: { type: 'array', items: { type: 'string' } },
          expected_verdict: { type: 'string' },
          recommended_investigation_steps: { type: 'array', items: { type: 'string' } },
          recommended_remediation: { type: 'array', items: { type: 'string' } },
          incident_summary: { type: 'string' }
        },
        required: ['title', 'description', 'expected_verdict']
      },
      iocs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            value: { type: 'string' },
            source: { type: 'string' },
            metadata: { type: 'object' }
          }
        }
      },
      logs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            log_id: { type: 'string' },
            timestamp: { type: 'string' },
            data_source: { type: 'string' },
            severity: { type: 'string' },
            event_name: { type: 'string' },
            description: { type: 'string' },
            verdict: { type: 'string' },
            raw_log_data: { type: 'object' }
          },
          required: ['log_id', 'timestamp', 'data_source', 'severity', 'event_name', 'verdict', 'raw_log_data']
        }
      },
      student_questions: { type: 'array', items: { type: 'string' } },
      expected_answer: {
        type: 'object',
        properties: {
          final_verdict: { type: 'string' },
          key_findings: { type: 'array', items: { type: 'string' } },
          recommended_actions: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    required: ['scenario', 'logs']
  };
}

function validateInvokeLLMResponse(response) {
  if (!response?.scenario?.title) throw new Error('AI response missing scenario.title');
  if (!Array.isArray(response?.logs) || response.logs.length < 3)
    throw new Error(`Insufficient logs: got ${response?.logs?.length ?? 0}`);
}

// ── Normalizers ────────────────────────────────────────────────────────────

function normalizeBackendResult(result, typeInfo) {
  const full = result.full_output;
  return {
    ...full,
    _meta: {
      source: 'backend_function',
      tokens_used: result.tokens_used,
      scenario_id: result.scenario_id,
      logs_count: result.logs_count,
      iocs_count: result.iocs_count,
      generated_at: result.generated_at
    },
    // Map logs → initial_events format for ScenarioEditor compatibility
    initial_events: mapLogsToEvents(full.logs ?? [])
  };
}

function normalizeInvokeLLMResult(response, typeInfo, difficulty, dataSources, primaryHash, primaryFile, malwareFamily, _useRealIOCs) {
  // Always use a simulated IOC — no external TI dependency
  const iocs = response.iocs?.length > 0
    ? response.iocs
    : [{
        type: 'sha256',
        value: primaryHash,
        source: 'Simulated',
        metadata: {
          file_name: primaryFile,
          file_type: 'Win32 EXE',
          signature: malwareFamily,
          tags: ['simulated', 'training'],
          first_seen: new Date().toISOString()
        }
      }];

  return {
    scenario: {
      ...response.scenario,
      difficulty: response.scenario.difficulty || difficulty,
      scenario_type: response.scenario.scenario_type || typeInfo.label,
      data_sources: response.scenario.data_sources || dataSources,
      mitre: response.scenario.mitre || typeInfo.mitre.map((m) => ({
        technique_id: m.id,
        technique_name: m.name,
        tactic: m.tactic,
        description: ''
      }))
    },
    iocs,
    logs: response.logs ?? [],
    student_questions: response.student_questions ?? [],
    expected_answer: response.expected_answer ?? {
      final_verdict: response.scenario?.expected_verdict ?? 'True Positive',
      key_findings: [],
      recommended_actions: []
    },
    _meta: {
      source: 'invoke_llm_fallback',
      logs_count: response.logs?.length ?? 0,
      iocs_count: iocs.length,
      generated_at: new Date().toISOString()
    },
    initial_events: mapLogsToEvents(response.logs ?? [])
  };
}

function mapLogsToEvents(logs) {
  return logs.map((log, i) => {
    const raw = log.raw_log_data ?? {};
    return {
      id: log.log_id || `log-${String(i + 1).padStart(3, '0')}`,
      timestamp: log.timestamp,
      source_type: log.data_source,
      rule_description: log.event_name,
      hostname: raw.DeviceName ?? raw.hostname ?? raw.Computer ?? raw.agent_name ?? 'UNKNOWN-HOST',
      username: raw.AccountName ?? raw.username ?? raw.UserName ?? raw.SubjectUserName ?? 'N/A',
      ip_address: raw.src_ip ?? raw.IpAddress ?? raw.sourceIPAddress ?? raw.client_ip ?? 'N/A',
      severity: log.severity,
      raw_log_data: raw,
      default_classification: verdictToClassification(log.verdict),
      admin_notes: log.description,
      analyst_friendly_description: log.description
    };
  });
}

function verdictToClassification(verdict) {
  if (verdict === 'TP') return 'True Positive';
  if (verdict === 'FP') return 'False Positive';
  return 'Escalate to TIER 2';
}

// ── Simulated hash generation ──────────────────────────────────────────────

/**
 * Generate a deterministic, realistic-looking SHA256-style hex string.
 * No external APIs.  Same seed → same hash every time.
 */
export function generateSimulatedHash(seed = '') {
  const input = seed || String(Date.now());
  const hex = '0123456789abcdef';
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x9e3779b9);
    h2 = Math.imul(h2 ^ c, 0x5f4a7c15);
  }
  let result = '';
  for (let i = 0; i < 64; i++) {
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x45d9f3b);
    h1 ^= h1 >>> 16;
    h2 ^= h2 >>> 16;
    h2 = Math.imul(h2, 0x45d9f3b);
    h2 ^= h2 >>> 16;
    const combined = (Math.abs(h1 + h2 + i * 7) & 0xfffffff);
    result += hex[combined % 16];
  }
  return result;
}

const SCENARIO_FILENAMES = {
  phishing_credential_theft: ['invoice_Q4.exe', 'SecureMessage.exe', 'DocuSign_Agreement.exe'],
  malware_execution:         ['update_helper.exe', 'flashplayer_installer.exe', 'RuntimeBroker32.exe'],
  suspicious_powershell:     ['pshelper.ps1.exe', 'WindowsUpdate.exe', 'svchost32.exe'],
  ransomware_behavior:       ['locker.exe', 'cryptor_x64.exe', 'restore_files.exe'],
  lateral_movement:          ['psexec_helper.exe', 'wmiexec.exe', 'lateral.exe'],
  brute_force_attack:        ['auth_test.exe', 'hydra_win.exe', 'spray.exe'],
  c2_communication:          ['beacon.exe', 'agent_x64.exe', 'c2client.exe'],
  dns_tunneling:             ['dnscat.exe', 'iodine_win.exe', 'tunnelio.exe'],
  credential_dumping:        ['mimikatz.exe', 'lsass_dump.exe', 'procdump64.exe'],
  shadow_copy_deletion:      ['vssadmin_wrap.exe', 'shadowkill.exe', 'antirecovery.exe'],
};

const SCENARIO_MALWARE = {
  phishing_credential_theft: 'AgentTesla',
  malware_execution:         'Generic.Trojan',
  suspicious_powershell:     'PowerShell Empire',
  ransomware_behavior:       'BlackCat',
  lateral_movement:          'Cobalt Strike',
  brute_force_attack:        'Generic.Trojan',
  c2_communication:          'Cobalt Strike',
  dns_tunneling:             'Generic.Trojan',
  credential_dumping:        'Mimikatz',
  shadow_copy_deletion:      'Ryuk',
};

function pickMaliciousFileName(scenarioKey) {
  const list = SCENARIO_FILENAMES[scenarioKey] ?? ['payload.exe', 'dropper.exe', 'stager.exe'];
  return list[Math.floor(Math.abs(seededVal(scenarioKey)) * list.length) % list.length];
}

function pickMalwareFamily(scenarioKey) {
  return SCENARIO_MALWARE[scenarioKey] ?? 'Generic.Trojan';
}

function seededVal(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return Math.abs(h) / 2147483648;
}
