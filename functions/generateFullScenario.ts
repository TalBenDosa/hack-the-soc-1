/**
 * Generate Full SOC Training Scenario
 *
 * Produces a complete attack scenario with:
 *  - Scenario metadata (title, description, MITRE, verdict, etc.)
 *  - Malicious IOCs fetched from MalwareBazaar (with DB fallback)
 *  - Minimum 10 realistic, source-specific logs that tell a coherent story
 *  - Student questions and expected answers
 *
 * Arguments:
 *   attackType        string  — scenario type key (e.g. "phishing_credential_theft")
 *   difficulty        string  — Beginner | Intermediate | Advanced | Hard
 *   dataSources       string[] — list of data sources to include
 *   numLogs           number  — minimum number of logs (default 10)
 *   useRealIOCs       boolean — whether to pull live hashes from MalwareBazaar
 *   scenarioTypeLabel string  — human-readable label shown in the prompt
 */

export default async function generateFullScenario(context) {
  const {
    attackType,
    difficulty = 'Intermediate',
    dataSources = ['EDR', 'Firewall', 'Active Directory', 'Windows Security Events'],
    numLogs = 12,
    useRealIOCs = false,
    scenarioTypeLabel = ''
  } = context.arguments;

  const { OPENAI_API_KEY } = context.secrets;
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY secret is not configured');

  // ── Step 1: Generate a deterministic simulated IOC ─────────────────────
  // No external threat-intel API is needed.
  // The student will use the in-platform "Check Hash" button which renders
  // a simulated VirusTotal-style result, teaching the investigation step
  // without any real-world dependencies.
  const primaryHash = generateSimulatedHash(`${attackType}-${difficulty}-${Date.now()}`);
  const primaryFileName = pickFileName(attackType);
  const malwareFamily = pickMalwareFamily(attackType);

  const iocs = [{
    type: 'sha256',
    value: primaryHash,
    source: 'Simulated',
    metadata: {
      file_name: primaryFileName,
      file_type: 'Win32 EXE',
      signature: malwareFamily,
      tags: ['simulated', 'training', attackType ?? 'generic'],
      first_seen: new Date().toISOString(),
      reporter: 'Hack The SOC Training Engine'
    }
  }];

  // ── Step 2: Build the AI prompt ─────────────────────────────────────────
  const sourceSchemaHints = buildSourceSchemaHints(dataSources);
  const label = scenarioTypeLabel || attackType || 'Advanced Persistent Threat';

  const systemMessage =
    'You are a world-class cybersecurity architect and SOC trainer. ' +
    'Output ONLY valid JSON — no markdown fences, no explanations outside the JSON.';

  const userPrompt = `
Generate a PRODUCTION-GRADE SOC training scenario.

═══════════════════════════════════════
SCENARIO PARAMETERS
═══════════════════════════════════════
Scenario Type  : ${label}
Difficulty     : ${difficulty}
Data Sources   : ${dataSources.join(', ')}
Minimum Logs   : ${numLogs}
Malicious Hash : ${primaryHash}
Malicious File : ${primaryFileName}
Malware Family : ${malwareFamily}

═══════════════════════════════════════
REQUIRED OUTPUT — STRICT JSON SCHEMA
═══════════════════════════════════════

{
  "scenario": {
    "title": "string — professional SOC scenario title",
    "description": "string — 2-3 sentences describing the incident and initial alert",
    "business_context": "string — company name, industry, size, what business was impacted",
    "attack_objective": "string — what the attacker was trying to achieve",
    "difficulty": "${difficulty}",
    "scenario_type": "${label}",
    "mitre": [
      { "technique_id": "T1xxx", "technique_name": "...", "tactic": "...", "description": "..." }
    ],
    "data_sources": ${JSON.stringify(dataSources)},
    "expected_verdict": "True Positive | False Positive | Needs Escalation",
    "recommended_investigation_steps": ["step 1", "step 2", "..."],
    "recommended_remediation": ["action 1", "action 2", "..."],
    "incident_summary": "string — full 3-5 sentence incident wrap-up for the analyst"
  },
  "iocs": [
    {
      "type": "sha256",
      "value": "${primaryHash}",
      "source": "Simulated",
      "metadata": {
        "file_name": "${primaryFileName}",
        "file_type": "Win32 EXE",
        "signature": "${malwareFamily}",
        "tags": []
      }
    }
  ],
  "logs": [
    {
      "log_id": "LOG-001",
      "timestamp": "ISO 8601 — chronologically ordered, span 2-4 hours",
      "data_source": "one of: ${dataSources.join(' | ')}",
      "severity": "Low | Medium | High | Critical",
      "event_name": "string — name of the detection rule or event type",
      "description": "string — analyst-friendly plain-English description",
      "verdict": "TP | FP | Escalate",
      "raw_log_data": { "field1": "value1" }
    }
  ],
  "student_questions": [
    "What MITRE technique is represented by log LOG-003?",
    "Which log indicates lateral movement?",
    "Is LOG-007 a true positive or false positive? Why?",
    "What should be the first containment action?",
    "Which user account was compromised?"
  ],
  "expected_answer": {
    "final_verdict": "True Positive | False Positive | Needs Escalation",
    "key_findings": ["finding 1", "finding 2", "..."],
    "recommended_actions": ["action 1", "action 2", "..."]
  }
}

═══════════════════════════════════════
LOG NARRATIVE STRUCTURE (${numLogs}+ logs)
═══════════════════════════════════════
The logs MUST tell a connected, chronological story with these phases:
  Phase 1 — Initial Access / Trigger (logs 1-2)
  Phase 2 — Detection Alert (logs 3-4)
  Phase 3 — Attack Progression (logs 5-8)
  Phase 4 — Impact / Objective Reached (logs 9-10)
  Phase 5 — Supporting Context / Noise (remaining logs)

Include in the log mix:
  • At least 1 log that is a FALSE POSITIVE (realistic red herring)
  • At least 1 log that requires Tier-2 escalation
  • At least 2 benign baseline logs that show normal activity
  • Consistent actor: same attacker IP, same victim hostname/username throughout

═══════════════════════════════════════
PER-SOURCE LOG SCHEMAS (use exact field names)
═══════════════════════════════════════
${sourceSchemaHints}

═══════════════════════════════════════
FIELD QUALITY RULES
═══════════════════════════════════════
• Every email field MUST be a full valid address (e.g. john.smith@contoso.com)
• IPs: use 10.x, 172.16-31.x, or 192.168.x for internal; realistic public IPs for external
• Hostnames: e.g. FIN-WS-007, DC01-CORP, HR-LAPTOP-14, SIEM-01
• Usernames: realistic (john.smith, s.admin, svc-backup)
• Process names: real (powershell.exe, cmd.exe, lsass.exe, mshta.exe)
• Command lines: realistic and relevant to the technique
• File paths: valid Windows or Linux paths
• If a downloaded file appears → include file.name, file.path, file.sha256, file.size, process.command_line
• If a URL click appears → include url.full, url.domain, url.path, url.hash_sha256
• Each raw_log_data MUST have 15-40 fields — make it production-grade realistic
• Timestamps must be ISO 8601 with timezone (e.g. 2024-03-15T09:14:22.341Z)
• No duplicate log_ids
• Chronological order

GENERATE THE COMPLETE SCENARIO NOW (output only valid JSON):
`;

  // ── Step 3: Call OpenAI ─────────────────────────────────────────────────
  const openAiResponse = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 6000,
        response_format: { type: 'json_object' }
      })
    },
    3
  );

  if (!openAiResponse.ok) {
    const errText = await openAiResponse.text();
    throw new Error(`OpenAI API error ${openAiResponse.status}: ${errText}`);
  }

  const aiData = await openAiResponse.json();
  let rawContent = aiData.choices?.[0]?.message?.content ?? '';

  // Strip accidental markdown fences
  rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // ── Step 4: Parse & validate ────────────────────────────────────────────
  let generated;
  try {
    generated = JSON.parse(rawContent);
  } catch (parseErr) {
    throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
  }

  validateScenarioOutput(generated);

  // Inject any real IOCs fetched above into the iocs array
  if (iocs.length > 0) {
    generated.iocs = iocs;
  }

  // ── Step 5: Persist to database ─────────────────────────────────────────
  const user = await context.auth.me();
  const isGlobal = user.role === 'admin';

  let tenantId = null;
  if (!isGlobal) {
    const tenantUsers = await context.entities.TenantUser.filter({ user_id: user.id, status: 'active' });
    if (tenantUsers.length > 0) tenantId = tenantUsers[0].tenant_id;
  }

  const scenarioRecord = {
    title: generated.scenario.title,
    description: generated.scenario.description,
    difficulty: generated.scenario.difficulty,
    category: mapScenarioTypeToCategory(generated.scenario.scenario_type),
    learning_objectives: generated.scenario.recommended_investigation_steps?.slice(0, 4) ?? [],
    tags: [
      generated.scenario.difficulty,
      generated.scenario.scenario_type,
      ...(generated.scenario.mitre?.map((m) => m.technique_id) ?? [])
    ],
    initial_events: generated.logs.map((log, i) => ({
      id: log.log_id || `log-${i + 1}`,
      timestamp: log.timestamp,
      source_type: log.data_source,
      rule_description: log.event_name,
      hostname: extractField(log.raw_log_data, ['hostname', 'DeviceName', 'Computer', 'host', 'device_name']) ?? 'UNKNOWN-HOST',
      username: extractField(log.raw_log_data, ['username', 'UserName', 'SubjectUserName', 'user', 'user_name']) ?? 'N/A',
      ip_address: extractField(log.raw_log_data, ['src_ip', 'IpAddress', 'sourceIPAddress', 'client_ip', 'source_ip']) ?? 'N/A',
      severity: log.severity,
      raw_log_data: log.raw_log_data,
      default_classification: verdictToClassification(log.verdict),
      admin_notes: log.description,
      analyst_friendly_description: log.description,
      recommended_action: log.verdict === 'TP' ? 'Investigate and escalate' : log.verdict === 'Escalate' ? 'Escalate to Tier-2' : 'Review and close'
    })),
    expected_verdict: generated.scenario.expected_verdict,
    is_active: false,
    is_global: isGlobal,
    created_by_super_admin: isGlobal,
    tenant_id: tenantId,
    scenario_metadata: {
      business_context: generated.scenario.business_context,
      attack_objective: generated.scenario.attack_objective,
      mitre: generated.scenario.mitre,
      incident_summary: generated.scenario.incident_summary,
      recommended_remediation: generated.scenario.recommended_remediation,
      iocs: generated.iocs,
      student_questions: generated.student_questions,
      expected_answer: generated.expected_answer
    }
  };

  const saved = await context.entities.Scenario.create(scenarioRecord);

  return {
    success: true,
    scenario_id: saved.id,
    scenario: saved,
    full_output: generated,
    tokens_used: aiData.usage?.total_tokens ?? 0,
    iocs_count: generated.iocs?.length ?? 0,
    logs_count: generated.logs?.length ?? 0,
    generated_at: new Date().toISOString()
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function validateScenarioOutput(data) {
  if (!data?.scenario) throw new Error('Missing scenario object in AI output');
  if (!data?.logs || !Array.isArray(data.logs) || data.logs.length < 5)
    throw new Error(`Insufficient logs: expected ≥5, got ${data?.logs?.length ?? 0}`);
  if (!data?.scenario?.title) throw new Error('Missing scenario.title');
  if (!data?.scenario?.expected_verdict) throw new Error('Missing scenario.expected_verdict');
}

async function fetchWithRetry(url, options, maxRetries) {
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries - 1) await sleep(1000 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractField(obj, keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null && obj[k] !== '') return String(obj[k]);
  }
  return null;
}

function verdictToClassification(verdict) {
  if (verdict === 'TP') return 'True Positive';
  if (verdict === 'FP') return 'False Positive';
  return 'Escalate to TIER 2';
}

function mapScenarioTypeToCategory(label = '') {
  const l = label.toLowerCase();
  if (l.includes('phish')) return 'Phishing / Social Engineering';
  if (l.includes('ransom')) return 'Malware';
  if (l.includes('malware') || l.includes('powershell') || l.includes('persist')) return 'Malware';
  if (l.includes('lateral')) return 'Network Intrusion';
  if (l.includes('brute')) return 'Brute Force';
  if (l.includes('exfil') || l.includes('sharepoint') || l.includes('onedrive') || l.includes('dlp')) return 'Data Exfiltration';
  if (l.includes('insider')) return 'Insider Threat';
  if (l.includes('cloud') || l.includes('aws') || l.includes('azure') || l.includes('oauth')) return 'Cloud Misconfiguration';
  if (l.includes('c2') || l.includes('dns tunnel') || l.includes('command')) return 'Network Intrusion';
  if (l.includes('priv') || l.includes('escalat')) return 'Privilege Escalation';
  return 'Network Intrusion';
}

// ── Simulated hash & IOC helpers ───────────────────────────────────────────

function generateSimulatedHash(seed: string): string {
  const hex = '0123456789abcdef';
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x9e3779b9);
    h2 = Math.imul(h2 ^ c, 0x5f4a7c15);
  }
  let result = '';
  for (let i = 0; i < 64; i++) {
    h1 ^= h1 >>> 16; h1 = Math.imul(h1, 0x45d9f3b); h1 ^= h1 >>> 16;
    h2 ^= h2 >>> 16; h2 = Math.imul(h2, 0x45d9f3b); h2 ^= h2 >>> 16;
    result += hex[Math.abs(h1 + h2 + i * 7) % 16];
  }
  return result;
}

const FILE_MAP: Record<string, string[]> = {
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

const MALWARE_MAP: Record<string, string> = {
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

function pickFileName(key = ''): string {
  const list = FILE_MAP[key] ?? ['payload.exe', 'dropper.exe', 'stager.exe'];
  return list[0];
}

function pickMalwareFamily(key = ''): string {
  return MALWARE_MAP[key] ?? 'Generic.Trojan';
}

function buildSourceSchemaHints(sources) {
  const SCHEMAS = {
    'EDR': `
EDR / Microsoft Defender for Endpoint:
  DeviceName, DeviceId, Timestamp, ActionType, FileName, FolderPath, SHA256,
  ProcessCommandLine, InitiatingProcessFileName, InitiatingProcessCommandLine,
  InitiatingProcessParentFileName, RemoteIP, RemotePort, LocalIP, LocalPort,
  LoggedOnUsers, ReportId, MachineGroup, OSPlatform, OSVersion, ProcessId,
  InitiatingProcessId, InitiatingProcessParentId, AccountName, AccountDomain,
  AccountSid, AlertId, Category, Severity, Title, AttackTechniques`,

    'Microsoft Defender for Endpoint': `
Microsoft Defender for Endpoint — same schema as EDR plus:
  AlertId, DetectionSource, ServiceSource, Entities, MitreTechniques,
  InvestigationId, InvestigationState, AssignedTo, Classification, Determination,
  DetectionTime, FirstActivityTime, LastActivityTime, ResolvedTime`,

    'Office365 / Microsoft 365 Audit': `
Office365 / Microsoft 365 Audit:
  CreationTime, Id, Operation, OrganizationId, RecordType, ResultStatus,
  UserKey, UserType, Version, Workload, ClientIP, UserId, UserAgent,
  ObjectId, AuditData, ClientInfoString, ExternalAccess, OrganizationName,
  OriginatingServer, Parameters, SessionId, Scope, AuthenticationType,
  LogonError, AppId, AppPoolName`,

    'Azure AD / Entra ID': `
Azure AD / Entra ID:
  time, resourceId, operationName, operationVersion, category, tenantId,
  resultType, resultSignature, resultDescription, durationMs, callerIpAddress,
  correlationId, identity, Level, location, properties.userPrincipalName,
  properties.userDisplayName, properties.targetResources, properties.initiatedBy,
  properties.conditionalAccessStatus, properties.authenticationRequirement,
  properties.riskState, properties.riskLevelAggregated, properties.riskDetail,
  properties.isRisky, properties.mfaDetail, properties.deviceDetail`,

    'Active Directory': `
Active Directory:
  EventID, TimeCreated, Computer, SubjectUserName, SubjectUserSid, SubjectDomainName,
  TargetUserName, TargetUserSid, TargetDomainName, LogonType, LogonProcessName,
  AuthenticationPackageName, WorkstationName, TransmittedServices, LmPackageName,
  KeyLength, ProcessId, ProcessName, IpAddress, IpPort, PrivilegeList,
  SamAccountName, DisplayName, ObjectClass, OldUacValue, NewUacValue,
  ObjectGUID, GroupName, MemberSid`,

    'Windows Security Events': `
Windows Security Events:
  EventID, TimeCreated, Channel, Computer, SubjectUserName, SubjectUserSid,
  SubjectDomainName, TargetUserName, TargetUserSid, TargetDomainName,
  LogonType, LogonProcessName, AuthenticationPackageName, WorkstationName,
  ProcessId, NewProcessName, CommandLine, TokenElevationType, IpAddress, IpPort,
  ParentProcessName, ObjectName, ObjectType, AccessMask, AuditPolicyChange`,

    'Firewall': `
Firewall:
  timestamp, src_ip, dst_ip, src_port, dst_port, protocol, action, rule_name,
  rule_id, bytes_sent, bytes_received, packets_sent, packets_received,
  duration_ms, application, interface_in, interface_out, nat_src_ip, nat_dst_ip,
  firewall_name, policy_name, session_id, threat_category, threat_id`,

    'DNS': `
DNS:
  timestamp, query_name, query_type, response_code, resolved_ip, client_ip,
  client_hostname, server_ip, record_ttl, question_count, answer_count,
  additional_count, flags, transaction_id, protocol, query_class,
  threat_category, blocked, dga_score, entropy`,

    'Proxy': `
Proxy:
  timestamp, client_ip, client_hostname, username, url_full, url_domain,
  url_path, url_query, http_method, status_code, bytes_sent, bytes_received,
  content_type, user_agent, referrer, category, action, threat_name,
  ssl_inspect, certificate_subject, response_time_ms`,

    'IDS / IPS': `
IDS / IPS:
  timestamp, alert_id, signature_id, signature_name, severity, priority,
  classification, src_ip, dst_ip, src_port, dst_port, protocol, action,
  sensor_name, payload_printable, flags, ttl, tos, id, iplen, dgmlen,
  attack_category, cve_reference, mitre_technique`,

    'DLP': `
DLP:
  timestamp, policy_name, rule_name, action, severity, user, device,
  source_app, destination, file_name, file_path, file_size, file_type,
  data_classification, matched_pattern, match_count, channel, endpoint_ip,
  review_status, incident_id`,

    'Email Security / Mail Gateway': `
Email Security / Mail Gateway:
  timestamp, message_id, subject, from_address, to_address, cc, reply_to,
  sender_ip, sender_domain, spf_result, dkim_result, dmarc_result,
  verdict, threat_type, attachment_name, attachment_sha256, attachment_type,
  url_detected, url_reputation, action_taken, quarantine_id, delivery_status,
  spam_score, phishing_score, malware_score`,

    'CrowdStrike Falcon': `
CrowdStrike Falcon:
  EventType, Timestamp, ComputerName, UserName, FileName, FilePath, SHA256,
  MD5, CommandLine, ParentCommandLine, ParentImageFileName, Tactic, Technique,
  Objective, SeverityName, PatternDispositionDescription, AlertId, DetectId,
  LocalIP, RemoteIP, RemotePort, Protocol, NetworkDirection, ConnectionDirection,
  DnsRequest, HttpRequest, AssociatedFile, Confidence, PatternDispositionFlags`,

    'Wazuh': `
Wazuh:
  id, timestamp, rule.id, rule.level, rule.description, rule.groups,
  rule.mitre.id, rule.mitre.tactic, rule.mitre.technique,
  agent.id, agent.name, agent.ip, manager.name, cluster.name,
  data.win.eventdata.CommandLine, data.win.eventdata.ParentCommandLine,
  data.win.eventdata.Image, data.win.eventdata.TargetUserName,
  data.win.eventdata.SubjectUserName, data.srcip, data.dstip,
  data.protocol, full_log, decoder.name, location`,

    'VPN': `
VPN:
  timestamp, event_type, username, user_group, src_ip, vpn_gateway_ip,
  assigned_ip, tunnel_protocol, auth_method, auth_status, reason,
  bytes_in, bytes_out, session_duration_sec, device_type, os_version,
  compliance_status, geo_country, geo_city, is_split_tunnel, mfa_status`,

    'NAC': `
NAC:
  timestamp, event_type, mac_address, ip_address, hostname, username,
  switch_name, switch_port, vlan_id, auth_method, posture_status,
  os_type, compliance_policy, action, reason, session_id, endpoint_group,
  certificate_cn, radius_server`,

    'AWS CloudTrail': `
AWS CloudTrail:
  eventTime, eventVersion, userIdentity.type, userIdentity.principalId,
  userIdentity.arn, userIdentity.accountId, userIdentity.userName,
  eventSource, eventName, awsRegion, sourceIPAddress, userAgent,
  requestParameters, responseElements, errorCode, errorMessage,
  requestID, eventID, eventType, apiVersion, managementEvent,
  recipientAccountId, vpcEndpointId, tlsDetails`,

    'Azure Activity Logs': `
Azure Activity Logs:
  time, resourceId, operationName, operationVersion, category, resultType,
  resultSignature, resultDescription, durationMs, callerIpAddress, correlationId,
  identity.authorization.action, identity.authorization.scope,
  identity.claims.name, identity.claims.email, properties.statusCode,
  properties.serviceRequestId, properties.statusMessage, tenantId,
  subscriptionId, resourceGroupName, resourceProviderName`
  };

  return sources
    .filter((s) => SCHEMAS[s])
    .map((s) => `${s}:\n${SCHEMAS[s]}`)
    .join('\n\n');
}
