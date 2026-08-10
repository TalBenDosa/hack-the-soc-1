/**
 * Generate Full SOC Training Scenario
 *
 * Produces a complete attack scenario with:
 * - Scenario metadata (title, description, MITRE, verdict, etc.)
 * - Simulated IOC hashes (no external API needed)
 * - Minimum 12 realistic, source-specific logs that tell a coherent story
 * - Student questions and expected answers
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Source schema hints ────────────────────────────────────────────────────

const SOURCE_SCHEMAS = {
  'EDR': `EDR raw_log_data fields: process_guid, parent_process_guid, timestamp, hostname, username,
    process_name, process_path, process_id, parent_process_id, parent_process_name, command_line,
    hash_sha256, hash_md5, signer, signature_status, image_loaded, network_connection,
    destination_ip, destination_port, protocol, bytes_sent, bytes_received`,

  'Windows Security Events': `Windows Security Events raw_log_data fields: EventID, TimeCreated,
    Computer, SubjectUserName, SubjectDomainName, SubjectLogonId, TargetUserName, TargetDomainName,
    TargetLogonId, LogonType, LogonProcessName, AuthenticationPackageName, WorkstationName,
    ProcessName, ProcessId, IpAddress, IpPort, Status, SubStatus, KeyLength`,

  'Active Directory': `Active Directory raw_log_data fields: EventID, ObjectClass, ObjectName,
    ObjectGUID, OperationType, OldValue, NewValue, AttributeLDAPDisplayName, SubjectUserName,
    SubjectDomainName, PrivilegeList, GroupName, GroupGuid, GroupDomain, MemberName, MemberSid`,

  'Firewall': `Firewall raw_log_data fields: action, protocol, src_ip, src_port, dst_ip, dst_port,
    bytes_sent, bytes_received, packets_sent, packets_received, rule_name, rule_id, application,
    interface, direction, flags, ttl, nat_src_ip, nat_src_port`,

  'IDS / IPS': `IDS/IPS raw_log_data fields: signature_id, signature_name, classification,
    priority, protocol, src_ip, src_port, dst_ip, dst_port, flags, ttl, payload_printable,
    payload_hex, action, severity, category`,

  'Azure AD / Entra ID': `Azure AD raw_log_data fields: correlationId, operationName, resultType,
    resultDescription, callerIpAddress, userPrincipalName, userDisplayName, userId, tenantId,
    appDisplayName, appId, resourceDisplayName, resourceId, ipAddress, location, deviceDetail,
    status, riskDetail, riskLevelAggregated`,

  'Office365 / Microsoft 365 Audit': `O365 raw_log_data fields: RecordType, CreationTime,
    Operation, OrganizationId, UserType, UserKey, Workload, ResultStatus, ObjectId, UserId,
    ClientIP, UserAgent, Site, ItemType, SourceFileExtension, SourceFileName, SourceRelativeUrl,
    DestinationFileName, DestinationRelativeUrl`,

  'DLP': `DLP raw_log_data fields: PolicyName, PolicyId, RuleId, RuleName, Severity, Action,
    UserName, UserEmail, DeviceName, FilePath, FileName, FileSize, SensitiveInfoType,
    SensitiveInfoCount, Destination, DestinationType, Channel`,

  'DNS': `DNS raw_log_data fields: query_name, query_type, response_code, response_ip,
    client_ip, client_port, server_ip, query_class, ttl, flags, transaction_id,
    query_length, response_length, protocol`,

  'Proxy': `Proxy raw_log_data fields: ClientIP, UserName, URL, Domain, Method, StatusCode,
    BytesSent, BytesReceived, Duration, ContentType, UserAgent, Referer, Category,
    Action, ThreatName, RiskScore`,

  'VPN': `VPN raw_log_data fields: username, src_ip, dst_ip, vpn_gateway, protocol,
    bytes_sent, bytes_received, duration, auth_type, session_id, device_type,
    os_type, country, city, reason`,

  'Email Security / Mail Gateway': `Mail Gateway raw_log_data fields: sender, recipient,
    subject, message_id, src_ip, attachment_name, attachment_hash, attachment_size,
    verdict, threat_name, action, policy, url_count, attachment_count, spam_score`,

  'CrowdStrike Falcon': `CrowdStrike raw_log_data fields: aid, cid, event_type,
    ComputerName, UserName, DetectId, DetectDescription, Severity, SeverityName,
    Tactic, Technique, Objective, ProcessStartTime, FileName, FilePath, CommandLine,
    SHA256HashData, MD5HashData, ParentProcessId, ProcessId, PatternDispositionDescription`,

  'Wazuh': `Wazuh raw_log_data fields: id, timestamp, rule_id, rule_description, rule_level,
    rule_groups, agent_id, agent_name, manager_host, srcip, dstip, srcport, dstport,
    protocol, full_log, location, decoder_name`,

  'AWS CloudTrail': `AWS CloudTrail raw_log_data fields: eventVersion, eventTime, eventSource,
    eventName, awsRegion, sourceIPAddress, userAgent, requestParameters, responseElements,
    requestID, eventID, eventType, recipientAccountId, userIdentity_type, userIdentity_arn,
    userIdentity_accountId, userIdentity_principalId, errorCode, errorMessage`,

  'Azure Activity Logs': `Azure Activity Logs raw_log_data fields: operationName, status,
    eventTimestamp, correlationId, callerIpAddress, caller, level, resourceId,
    resourceGroupName, subscriptionId, tenantId, properties_statusCode,
    properties_serviceRequestId, properties_message`,

  'Microsoft Defender for Endpoint': `MDE raw_log_data fields: AlertId, Title, Severity,
    Category, Status, Classification, Determination, InvestigationId, DeviceId,
    DeviceName, AadDeviceId, UserName, DomainName, Sha256, ProcessCommandLine,
    InitiatingProcessFileName, InitiatingProcessSHA256, RemoteIP, RemotePort, LocalPort`,

  'NAC': `NAC raw_log_data fields: mac_address, ip_address, hostname, username,
    policy_name, vlan_id, switch_ip, switch_port, auth_method, posture_status,
    os_type, device_type, vendor, auth_result, session_id`
};

function buildSourceSchemaHints(dataSources) {
  return dataSources
    .map(src => SOURCE_SCHEMAS[src] || `${src} raw_log_data: include 15-20 relevant fields for this source type`)
    .join('\n\n');
}

// ── Deterministic hash generation ──────────────────────────────────────────

function generateSimulatedHash(seed) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) + seed.charCodeAt(i);
    h = h & 0xffffffff;
  }
  let hash = '';
  let n = Math.abs(h);
  const chars = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    hash += chars[n % 16];
  }
  return hash;
}

const FILE_NAMES_BY_TYPE = {
  phishing_credential_theft: 'invoice_Q4_2024.exe',
  malware_execution: 'setup_update.exe',
  suspicious_powershell: 'WindowsUpdate.ps1',
  ransomware_behavior: 'svchost32.exe',
  lateral_movement: 'psexec_mod.exe',
  brute_force_attack: 'hydra.exe',
  credential_dumping: 'mimikatz.exe',
  c2_communication: 'beacon.dll',
  data_exfiltration: 'exfil_tool.exe',
  shadow_copy_deletion: 'vssadmin_wrapper.exe',
  dns_tunneling: 'dnsclient.exe',
  default: 'payload.exe'
};

// Updated for 2024-2025 threat landscape
const MALWARE_FAMILIES_BY_TYPE = {
  phishing_credential_theft: 'Latrodectus',      // Emotet successor (2024)
  malware_execution: 'DarkGate',                 // Active loader (2024)
  suspicious_powershell: 'Sliver C2',            // Open-source C2 replacing PS Empire
  ransomware_behavior: 'RansomHub',              // Top ransomware group (2024)
  lateral_movement: 'Brute Ratel C4',            // AV-evasive C2 (2024)
  credential_dumping: 'NanoDump',                // Modern LSASS dumper evading Mimikatz sigs
  c2_communication: 'Havoc C2',                  // Open-source Cobalt Strike alternative
  data_exfiltration: 'LummaC2',                  // Top infostealer (2024, replaced RedLine)
  shadow_copy_deletion: 'Play Ransomware',       // Active ransomware group (2024)
  dns_tunneling: 'DNSCAT2',
  supply_chain: 'AsyncRAT',
  ai_assisted_phishing: 'LummaC2',
  default: 'AsyncRAT'
};

function pickFileName(attackType) {
  return FILE_NAMES_BY_TYPE[attackType] || FILE_NAMES_BY_TYPE.default;
}

function pickMalwareFamily(attackType) {
  return MALWARE_FAMILIES_BY_TYPE[attackType] || MALWARE_FAMILIES_BY_TYPE.default;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateScenarioOutput(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('AI returned non-object');
  if (!obj.scenario) throw new Error('Missing scenario field');
  if (!Array.isArray(obj.logs) || obj.logs.length === 0) throw new Error('Missing or empty logs array');
  if (!obj.expected_answer) throw new Error('Missing expected_answer field');
}

function verdictToClassification(verdict) {
  if (verdict === 'TP') return 'True Positive';
  if (verdict === 'Escalate') return 'Escalate to TIER 2';
  return 'False Positive';
}

function mapScenarioTypeToCategory(scenarioType) {
  const map = {
    'Phishing': 'Phishing / Social Engineering',
    'Ransomware': 'Malware',
    'Malware': 'Malware',
    'Lateral Movement': 'Network Intrusion',
    'Brute Force': 'Brute Force',
    'Data Exfiltration': 'Data Exfiltration',
    'Privilege Escalation': 'Privilege Escalation',
    'Insider Threat': 'Insider Threat',
    'Cloud': 'Cloud Misconfiguration',
    'Supply Chain': 'Supply Chain Attack',
    'Web': 'Web Application Attack',
    'DoS': 'Denial of Service (DoS/DDoS)',
    'Vulnerability': 'Vulnerability Exploitation',
  };
  for (const [key, val] of Object.entries(map)) {
    if (scenarioType?.includes(key)) return val;
  }
  return 'Network Intrusion';
}

function extractField(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (obj[key] != null) return String(obj[key]);
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      const found = extractField(val, keys);
      if (found) return found;
    }
  }
  return null;
}

async function fetchWithRetry(url, options, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status !== 429 && res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
  throw lastErr;
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      attackType,
      difficulty = 'Intermediate',
      dataSources = ['EDR', 'Firewall', 'Active Directory', 'Windows Security Events'],
      numLogs = 12,
      scenarioTypeLabel = ''
    } = body;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY secret is not configured');

    // Step 1: Generate simulated IOC
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

    // Step 2: Build prompt
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
Scenario Type : ${label}
Difficulty    : ${difficulty}
Data Sources  : ${dataSources.join(', ')}
Minimum Logs  : ${numLogs}
Malicious Hash: ${primaryHash}
Malicious File: ${primaryFileName}
Malware Family: ${malwareFamily}

═══════════════════════════════════════
REQUIRED OUTPUT — STRICT JSON SCHEMA
═══════════════════════════════════════

{
  "scenario": {
    "title": "string",
    "description": "string — 2-3 sentences",
    "business_context": "string — company name, industry, size",
    "attack_objective": "string",
    "difficulty": "${difficulty}",
    "scenario_type": "${label}",
    "mitre": [{ "technique_id": "T1xxx", "technique_name": "...", "tactic": "...", "description": "..." }],
    "data_sources": ${JSON.stringify(dataSources)},
    "expected_verdict": "True Positive | False Positive | Needs Escalation",
    "recommended_investigation_steps": ["step 1", "step 2"],
    "recommended_remediation": ["action 1", "action 2"],
    "incident_summary": "string — 3-5 sentences"
  },
  "iocs": [
    {
      "type": "sha256",
      "value": "${primaryHash}",
      "source": "Simulated",
      "metadata": { "file_name": "${primaryFileName}", "file_type": "Win32 EXE", "signature": "${malwareFamily}", "tags": [] }
    }
  ],
  "logs": [
    {
      "log_id": "LOG-001",
      "timestamp": "ISO 8601 with timezone",
      "data_source": "one of: ${dataSources.join(' | ')}",
      "severity": "Low | Medium | High | Critical",
      "event_name": "string",
      "description": "string — analyst-friendly",
      "verdict": "TP | FP | Escalate",
      "raw_log_data": { "field1": "value1" }
    }
  ],
  "student_questions": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "expected_answer": {
    "final_verdict": "True Positive | False Positive | Needs Escalation",
    "key_findings": ["finding 1", "finding 2"],
    "recommended_actions": ["action 1", "action 2"]
  }
}

═══════════════════════════════════════
LOG NARRATIVE STRUCTURE (${numLogs}+ logs)
═══════════════════════════════════════
The logs MUST tell a connected, chronological story:
  Phase 1 — Initial Access / Trigger (logs 1-2)
  Phase 2 — Detection Alert (logs 3-4)
  Phase 3 — Attack Progression (logs 5-8)
  Phase 4 — Impact / Objective Reached (logs 9-10)
  Phase 5 — Supporting Context / Noise (remaining)

Include: at least 1 FALSE POSITIVE, 1 Escalate log, 2 benign baseline logs.
Use consistent attacker IP and victim hostname/username throughout.

═══════════════════════════════════════
PER-SOURCE LOG SCHEMAS
═══════════════════════════════════════
${sourceSchemaHints}

═══════════════════════════════════════
FIELD QUALITY RULES
═══════════════════════════════════════
• IPs: 10.x, 172.16-31.x, 192.168.x for internal; realistic public IPs for external
• Hostnames: FIN-WS-007, DC01-CORP, HR-LAPTOP-14
• Usernames: john.smith, s.admin, svc-backup
• Process names: powershell.exe, cmd.exe, lsass.exe, mshta.exe
• Command lines: realistic and relevant to technique
• Each raw_log_data MUST have 15-40 fields — production-grade realistic
• Timestamps: ISO 8601 with timezone, chronological, span 2-4 hours
• No duplicate log_ids
• The attacker IP MUST appear in at least 3 different log sources (cross-source correlation)
• The compromised username MUST appear in at least 2 different data sources

═══════════════════════════════════════
CURRENT THREAT LANDSCAPE (2024-2025)
═══════════════════════════════════════
Use CURRENT, realistic threat intelligence in all scenarios:
• Active ransomware groups: RansomHub, Play, LockBit 3.0 (post-disruption ops), Hunters International, Akira, Black Basta, Meow
• Modern C2 frameworks: Sliver, Havoc C2, Brute Ratel C4, Mythic, NightHawk (use instead of legacy Cobalt Strike references)
• 2024-2025 malware: LummaC2 (infostealer), DarkGate (loader), Latrodectus (Emotet successor), AsyncRAT, SectopRAT
• 2024 LOLBins: certutil.exe -decode, msiexec.exe /z, odbcconf.exe, mavinject.exe, forfiles.exe, finger.exe
• Identity attacks: MFA fatigue bombing, adversary-in-the-middle proxies (Evilginx2, Modlishka), session token theft
• Cloud threats: AWS IAM role chaining, Azure Managed Identity abuse, serverless function exploitation
• AI-assisted attacks: LLM-generated spearphishing with perfect grammar, deepfake audio BEC, AI-generated malware
• Supply chain: Software update channel abuse, npm/PyPI package poisoning, ISO delivery bypassing MOTW (T1553.005)
• Threat actor groups: Scattered Spider (social engineering), Volt Typhoon (living-off-the-land), Sandworm (destructive)
• Modern email threats: QR code phishing (T1566.001), HTML smuggling (T1027.006), callback phishing (TOAD attacks)
• Credential access: Kerberoasting with Rubeus, NanoDump for LSASS, ADCS abuse (ESC1-ESC8)

GENERATE THE COMPLETE SCENARIO NOW (output only valid JSON):
`;

    // Step 3: Call OpenAI
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
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Step 4: Parse & validate
    let generated;
    try {
      generated = JSON.parse(rawContent);
    } catch (parseErr) {
      throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
    }

    validateScenarioOutput(generated);

    // Inject simulated IOCs
    generated.iocs = iocs;

    // Step 5: Build Scenario entity record
    const isGlobal = user.role === 'admin';
    let tenantId = null;
    if (!isGlobal) {
      const tenantUsers = await base44.entities.TenantUser.filter({ user_id: user.id, status: 'active' });
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
        raw_log_data: {
          ...log.raw_log_data,
          ioc_sha256: iocs[0]?.value
        },
        default_classification: verdictToClassification(log.verdict),
        admin_notes: log.description,
        notes: log.description
      })),
      expected_verdict: generated.expected_answer?.final_verdict === 'True Positive' ? 'True Positive'
        : generated.expected_answer?.final_verdict === 'False Positive' ? 'False Positive'
        : 'Escalate to TIER 2',
      is_active: false,
      tenant_id: tenantId,
      is_global: isGlobal,
      scenario_metadata: {
        iocs,
        mitre: generated.scenario.mitre,
        student_questions: generated.student_questions,
        expected_answer: generated.expected_answer,
        incident_summary: generated.scenario.incident_summary,
        business_context: generated.scenario.business_context,
        recommended_remediation: generated.scenario.recommended_remediation
      }
    };

    const saved = await base44.entities.Scenario.create(scenarioRecord);

    return Response.json({
      success: true,
      scenario_id: saved.id,
      scenario: scenarioRecord,
      raw_generated: generated
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});