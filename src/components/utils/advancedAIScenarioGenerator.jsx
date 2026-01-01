import { base44 } from '@/api/base44Client';

/**
 * Advanced AI Scenario Generator with MITRE ATT&CK Integration
 * Inspired by summved/log-generator capabilities
 */

// MITRE ATT&CK Techniques Database (subset of most common techniques)
const MITRE_TECHNIQUES = {
  'T1110': { name: 'Brute Force', tactic: 'Credential Access', severity: 'High' },
  'T1078': { name: 'Valid Accounts', tactic: 'Initial Access', severity: 'Medium' },
  'T1053': { name: 'Scheduled Task/Job', tactic: 'Persistence', severity: 'High' },
  'T1059': { name: 'Command and Scripting Interpreter', tactic: 'Execution', severity: 'High' },
  'T1003': { name: 'OS Credential Dumping', tactic: 'Credential Access', severity: 'Critical' },
  'T1071': { name: 'Application Layer Protocol', tactic: 'Command and Control', severity: 'Medium' },
  'T1486': { name: 'Data Encrypted for Impact', tactic: 'Impact', severity: 'Critical' },
  'T1566': { name: 'Phishing', tactic: 'Initial Access', severity: 'High' },
  'T1567': { name: 'Exfiltration Over Web Service', tactic: 'Exfiltration', severity: 'High' },
  'T1068': { name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation', severity: 'High' },
  'T1021': { name: 'Remote Services', tactic: 'Lateral Movement', severity: 'Medium' },
  'T1574': { name: 'Hijack Execution Flow', tactic: 'Persistence', severity: 'High' },
  'T1548': { name: 'Abuse Elevation Control Mechanism', tactic: 'Privilege Escalation', severity: 'High' },
  'T1027': { name: 'Obfuscated Files or Information', tactic: 'Defense Evasion', severity: 'Medium' },
  'T1055': { name: 'Process Injection', tactic: 'Defense Evasion', severity: 'High' }
};

// Attack Chain Templates (APT scenarios) - All Advanced Persistent Threats
const ATTACK_CHAINS = {
  'apt29-cozy-bear': {
    name: 'APT29 (Cozy Bear) - Russian SVR Intelligence',
    description: 'Sophisticated Russian state-sponsored APT targeting government, defense contractors, and critical infrastructure',
    difficulty: 'Advanced',
    category: 'Network Intrusion',
    phases: [
      { phase: 'Initial Access', technique: 'T1566', description: 'Spear phishing with COVID-19 themed lure and malicious PDF' },
      { phase: 'Execution', technique: 'T1059', description: 'Obfuscated PowerShell Empire stager execution' },
      { phase: 'Persistence', technique: 'T1053', description: 'WMI subscription for fileless persistence' },
      { phase: 'Defense Evasion', technique: 'T1027', description: 'Custom packer and anti-analysis techniques' },
      { phase: 'Credential Access', technique: 'T1003', description: 'LSASS memory dumping with custom Mimikatz variant' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'Pass-the-Hash attacks via SMB and WMI' },
      { phase: 'Collection', technique: 'T1005', description: 'Automated collection of emails and documents' },
      { phase: 'C2', technique: 'T1071', description: 'HTTPS beaconing to compromised legitimate websites' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'Staged exfiltration to cloud storage via Tor' }
    ]
  },
  'apt28-fancy-bear': {
    name: 'APT28 (Fancy Bear) - Russian GRU Unit 26165',
    description: 'Russian military intelligence APT known for targeting political organizations and defense sectors',
    difficulty: 'Advanced',
    category: 'Network Intrusion',
    phases: [
      { phase: 'Reconnaissance', technique: 'T1589', description: 'OSINT gathering and social media profiling of targets' },
      { phase: 'Initial Access', technique: 'T1566', description: 'Credential harvesting via fake Microsoft login pages' },
      { phase: 'Execution', technique: 'T1204', description: 'Malicious macro in fake NATO security document' },
      { phase: 'Persistence', technique: 'T1547', description: 'Registry Run key and COM hijacking' },
      { phase: 'Privilege Escalation', technique: 'T1068', description: 'CVE-2015-1701 Windows kernel exploit' },
      { phase: 'Defense Evasion', technique: 'T1055', description: 'Process injection into svchost.exe and explorer.exe' },
      { phase: 'Credential Access', technique: 'T1003', description: 'DCSync attack against domain controllers' },
      { phase: 'Discovery', technique: 'T1087', description: 'Active Directory enumeration and mapping' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'RDP hijacking and Kerberos ticket manipulation' },
      { phase: 'Exfiltration', technique: 'T1041', description: 'Encrypted data exfiltration over existing C2 channel' }
    ]
  },
  'apt32-oceanlotus': {
    name: 'APT32 (OceanLotus) - Vietnamese Cyber Espionage',
    description: 'Vietnamese state-sponsored APT targeting foreign corporations, dissidents, and journalists in Southeast Asia',
    difficulty: 'Advanced',
    category: 'Network Intrusion',
    phases: [
      { phase: 'Initial Access', technique: 'T1566', description: 'Strategic web compromise (watering hole) of activist websites' },
      { phase: 'Execution', technique: 'T1203', description: 'Browser zero-day exploit for initial code execution' },
      { phase: 'Persistence', technique: 'T1574', description: 'DLL side-loading with signed legitimate applications' },
      { phase: 'Defense Evasion', technique: 'T1027', description: 'Multi-layer encryption and code obfuscation' },
      { phase: 'Credential Access', technique: 'T1555', description: 'Browser credential dumping from Chrome and Firefox' },
      { phase: 'Discovery', technique: 'T1083', description: 'Automated scanning for documents containing keywords' },
      { phase: 'Collection', technique: 'T1560', description: 'RAR archives with password protection for staging' },
      { phase: 'C2', technique: 'T1071', description: 'DNS tunneling and custom binary protocol over HTTPS' },
      { phase: 'Exfiltration', technique: 'T1048', description: 'Data exfiltrated via Dropbox and OneDrive APIs' }
    ]
  },
  'apt41-double-dragon': {
    name: 'APT41 (Double Dragon) - Chinese Dual-Purpose APT',
    description: 'Chinese state-sponsored APT conducting both espionage and financially-motivated cybercrime operations',
    difficulty: 'Advanced',
    category: 'Network Intrusion',
    phases: [
      { phase: 'Initial Access', technique: 'T1190', description: 'SQL injection in customer-facing web application' },
      { phase: 'Execution', technique: 'T1059', description: 'Web shell deployment and command execution' },
      { phase: 'Persistence', technique: 'T1505', description: 'Modified IIS module for persistent web backdoor' },
      { phase: 'Privilege Escalation', technique: 'T1068', description: 'EternalBlue (MS17-010) exploit for escalation' },
      { phase: 'Defense Evasion', technique: 'T1218', description: 'Living-off-the-land binaries (certutil, bitsadmin)' },
      { phase: 'Credential Access', technique: 'T1003', description: 'ntds.dit extraction from domain controller' },
      { phase: 'Discovery', technique: 'T1046', description: 'Network scanning for additional vulnerable systems' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'PSExec and WMI for lateral propagation' },
      { phase: 'Impact', technique: 'T1486', description: 'Ransomware deployment as distraction for espionage' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'Multi-stage exfiltration to compromised cloud accounts' }
    ]
  },
  'lazarus-group': {
    name: 'Lazarus Group - North Korean State APT',
    description: 'North Korean state-sponsored APT conducting destructive attacks, financial theft, and cyber espionage',
    difficulty: 'Advanced',
    category: 'Network Intrusion',
    phases: [
      { phase: 'Initial Access', technique: 'T1566', description: 'LinkedIn recruiting scam targeting defense contractors' },
      { phase: 'Execution', technique: 'T1204', description: 'Trojanized cryptocurrency wallet application' },
      { phase: 'Persistence', technique: 'T1053', description: 'Scheduled task using Windows Task Scheduler' },
      { phase: 'Defense Evasion', technique: 'T1070', description: 'Log deletion and timestamp manipulation' },
      { phase: 'Privilege Escalation', technique: 'T1548', description: 'UAC bypass via CMSTPLUA COM interface' },
      { phase: 'Credential Access', technique: 'T1555', description: 'Keylogging and credential theft from memory' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'WMI-based lateral movement and remote execution' },
      { phase: 'C2', technique: 'T1071', description: 'Custom backdoor with HTTPS C2 to compromised servers' },
      { phase: 'Impact', technique: 'T1485', description: 'Destructive wiper malware targeting critical systems' },
      { phase: 'Exfiltration', technique: 'T1041', description: 'Financial data and cryptocurrency wallet theft' }
    ]
  },
  'fin7-carbanak': {
    name: 'FIN7 (Carbanak) - Russian Cybercrime Syndicate',
    description: 'Sophisticated financially-motivated APT targeting retail, hospitality, and financial sectors for payment card theft',
    difficulty: 'Advanced',
    category: 'Data Exfiltration',
    phases: [
      { phase: 'Initial Access', technique: 'T1566', description: 'Phishing with malicious Word documents posing as customer complaints' },
      { phase: 'Execution', technique: 'T1204', description: 'VBA macro downloads Carbanak backdoor via DNS TXT records' },
      { phase: 'Persistence', technique: 'T1547', description: 'Registry autostart and COM object hijacking' },
      { phase: 'Defense Evasion', technique: 'T1027', description: 'Fileless malware using PowerShell Empire' },
      { phase: 'Privilege Escalation', technique: 'T1134', description: 'Token impersonation to assume SYSTEM privileges' },
      { phase: 'Discovery', technique: 'T1087', description: 'BloodHound for Active Directory reconnaissance' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'PsExec to deploy PoS malware on payment terminals' },
      { phase: 'Collection', technique: 'T1005', description: 'Memory scraping for payment card data (Track 1 & 2)' },
      { phase: 'Exfiltration', technique: 'T1041', description: 'Encrypted exfiltration of millions of payment cards' }
    ]
  },
  'blackcat-alphv': {
    name: 'BlackCat/ALPHV - Ransomware-as-a-Service APT',
    description: 'Sophisticated RaaS operation using Rust-based ransomware with triple extortion tactics and APT-level techniques',
    difficulty: 'Advanced',
    category: 'Malware',
    phases: [
      { phase: 'Initial Access', technique: 'T1078', description: 'Compromised VPN credentials purchased from dark web' },
      { phase: 'Execution', technique: 'T1059', description: 'PowerShell and Cobalt Strike beacon deployment' },
      { phase: 'Persistence', technique: 'T1136', description: 'Creation of backdoor domain admin accounts' },
      { phase: 'Defense Evasion', technique: 'T1562', description: 'EDR and antivirus disablement via admin rights' },
      { phase: 'Credential Access', technique: 'T1003', description: 'Credential harvesting using Mimikatz and LaZagne' },
      { phase: 'Discovery', technique: 'T1083', description: 'Network share enumeration and data discovery' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'RDP and PSExec for domain-wide deployment' },
      { phase: 'Collection', technique: 'T1560', description: 'Sensitive data exfiltrated before encryption' },
      { phase: 'Impact', technique: 'T1486', description: 'Fast file encryption with AES and RSA' },
      { phase: 'Impact', technique: 'T1490', description: 'Backup deletion and shadow copy removal' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'Triple extortion: data leak, encryption, DDoS threats' }
    ]
  },
  'lockbit-3': {
    name: 'LockBit 3.0 - Advanced Ransomware APT',
    description: 'Highly automated ransomware APT with bug bounty program, targeting enterprises globally with advanced evasion',
    difficulty: 'Advanced',
    category: 'Malware',
    phases: [
      { phase: 'Initial Access', technique: 'T1133', description: 'Exploitation of unpatched VPN vulnerabilities' },
      { phase: 'Execution', technique: 'T1059', description: 'Batch script drops and executes ransomware payload' },
      { phase: 'Persistence', technique: 'T1053', description: 'Scheduled tasks for ransomware re-execution' },
      { phase: 'Privilege Escalation', technique: 'T1068', description: 'PrintNightmare exploit (CVE-2021-34527)' },
      { phase: 'Defense Evasion', technique: 'T1562', description: 'Windows Defender exclusions added via Group Policy' },
      { phase: 'Credential Access', technique: 'T1003', description: 'LSASS dumping and Kerberos ticket extraction' },
      { phase: 'Discovery', technique: 'T1018', description: 'Active Directory enumeration using SharpHound' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'WMI-based propagation across domain' },
      { phase: 'Collection', technique: 'T1005', description: 'Automated collection of high-value files before encryption' },
      { phase: 'Impact', technique: 'T1486', description: 'Ransomware encryption with unique victim ID' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'Data published on leak site if ransom unpaid' }
    ]
  },
  'solarwinds-supply-chain': {
    name: 'SolarWinds Supply Chain Attack - APT-Style',
    description: 'Nation-state supply chain compromise affecting thousands of organizations via trusted software updates',
    difficulty: 'Advanced',
    category: 'Supply Chain Attack',
    phases: [
      { phase: 'Initial Compromise', technique: 'T1195', description: 'Supply chain compromise of SolarWinds Orion build system' },
      { phase: 'Execution', technique: 'T1195', description: 'SUNBURST backdoor deployed via signed software updates' },
      { phase: 'Persistence', technique: 'T1543', description: 'Legitimate service (SolarWinds) used for persistence' },
      { phase: 'Defense Evasion', technique: 'T1027', description: 'Backdoor disguised as legitimate Orion plugin' },
      { phase: 'C2', technique: 'T1071', description: 'DGA-based C2 using legitimate domains (avsvmcloud.com)' },
      { phase: 'Discovery', technique: 'T1087', description: 'Azure AD and cloud infrastructure reconnaissance' },
      { phase: 'Credential Access', technique: 'T1528', description: 'SAML token forgery for authentication bypass' },
      { phase: 'Lateral Movement', technique: 'T1550', description: 'Golden SAML attacks for cloud environment access' },
      { phase: 'Collection', technique: 'T1114', description: 'Email collection from O365 and Exchange servers' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'Long-term exfiltration of sensitive government data' }
    ]
  },
  'cloud-infrastructure-apt': {
    name: 'Cloud Infrastructure Takeover - Multi-Cloud APT',
    description: 'Sophisticated APT targeting cloud infrastructure (AWS, Azure, GCP) for crypto mining and data theft',
    difficulty: 'Advanced',
    category: 'Cloud Misconfiguration',
    phases: [
      { phase: 'Initial Access', technique: 'T1078', description: 'Compromised AWS IAM credentials from GitHub leak' },
      { phase: 'Execution', technique: 'T1059', description: 'Lambda functions created for code execution' },
      { phase: 'Persistence', technique: 'T1098', description: 'Backdoor IAM users and roles created' },
      { phase: 'Privilege Escalation', technique: 'T1548', description: 'IAM privilege escalation via policy modification' },
      { phase: 'Defense Evasion', technique: 'T1562', description: 'CloudTrail logging disabled in multiple regions' },
      { phase: 'Credential Access', technique: 'T1552', description: 'Secrets extracted from S3 buckets and Parameter Store' },
      { phase: 'Discovery', technique: 'T1580', description: 'Cloud infrastructure discovery and enumeration' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'Cross-account access via compromised assume roles' },
      { phase: 'Impact', technique: 'T1496', description: 'Cryptominers deployed on EC2 and ECS containers' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'S3 data exfiltrated to attacker-controlled buckets' }
    ]
  },
  'apt10-menupass': {
    name: 'APT10 (MenuPass) - Chinese MSS Cyber Espionage',
    description: 'Chinese state-sponsored APT targeting managed service providers to access customer networks globally',
    difficulty: 'Advanced',
    category: 'Network Intrusion',
    phases: [
      { phase: 'Initial Access', technique: 'T1566', description: 'Spear phishing targeting MSP IT administrators' },
      { phase: 'Execution', technique: 'T1203', description: 'CVE-2017-0199 HTA handler exploit' },
      { phase: 'Persistence', technique: 'T1136', description: 'Hidden administrator accounts created' },
      { phase: 'Defense Evasion', technique: 'T1070', description: 'Event log clearing and forensic anti-analysis' },
      { phase: 'Credential Access', technique: 'T1003', description: 'Credential dumping from multiple MSP environments' },
      { phase: 'Discovery', technique: 'T1018', description: 'Network topology mapping of MSP customers' },
      { phase: 'Lateral Movement', technique: 'T1550', description: 'Pass-the-ticket attacks via Kerberos' },
      { phase: 'Collection', technique: 'T1005', description: 'Intellectual property and trade secrets targeted' },
      { phase: 'C2', technique: 'T1071', description: 'Custom ChChes and RedLeaves backdoors' },
      { phase: 'Exfiltration', technique: 'T1041', description: 'Long-term exfiltration spanning multiple years' }
    ]
  }
};

// Log source types with realistic patterns
const LOG_SOURCES = [
  'Active Directory', 'EDR', 'Firewall', 'Office 365', 'Network IDS',
  'Windows Security', 'DLP', 'Antivirus', 'WAF', 'Proxy', 'VPN', 'DHCP',
  'Azure', 'AWS', 'Database Security', 'Email Gateway', 'DNS'
];

/**
 * Generate an advanced AI-powered scenario with MITRE ATT&CK integration
 */
export async function generateAdvancedAIScenario(options = {}) {
  const {
    attackChain = null, // null = random, or specify: 'apt29-cozy-bear', 'ransomware-ryuk', etc.
    difficulty = null, // null = auto-determine from chain
    numLogs = null, // null = auto (8-15 logs based on attack complexity)
  } = options;

  console.log('[AI GENERATOR] Starting advanced scenario generation with MITRE ATT&CK...');

  // Select attack chain
  const chainKey = attackChain || selectRandomAttackChain();
  const chain = ATTACK_CHAINS[chainKey];

  if (!chain) {
    throw new Error(`Unknown attack chain: ${chainKey}`);
  }

  console.log(`[AI GENERATOR] Selected attack chain: ${chain.name}`);

  // Determine number of logs (1-2 per phase + some benign noise)
  const baseLogCount = chain.phases.length * 2;
  const noiseLogCount = Math.floor(Math.random() * 5) + 3; // 3-7 benign logs
  const totalLogs = numLogs || (baseLogCount + noiseLogCount);

  // Build comprehensive prompt for AI
  const prompt = buildScenarioPrompt(chain, totalLogs);

  console.log('[AI GENERATOR] Invoking LLM for scenario generation...');

  // Call InvokeLLM with structured JSON response
  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        scenario_name: { type: 'string' },
        scenario_description: { type: 'string' },
        company_context: { type: 'string' },
        learning_objectives: {
          type: 'array',
          items: { type: 'string' }
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              log_source: { type: 'string' },
              event_type: { type: 'string' },
              severity: { type: 'string' },
              user_name: { type: 'string' },
              device_name: { type: 'string' },
              source_ip: { type: 'string' },
              destination_ip: { type: 'string' },
              process_name: { type: 'string' },
              command_line: { type: 'string' },
              file_path: { type: 'string' },
              story_context: { type: 'string' },
              mitre_technique: { type: 'string' },
              verdict: { type: 'string' }, // TP, FP, or BenignNoise
              justification: { type: 'string' },
              raw_log_data: { type: 'object' }
            },
            required: ['timestamp', 'log_source', 'event_type', 'verdict', 'justification']
          }
        },
        expected_verdict: { type: 'string' },
        investigation_summary: { type: 'string' }
      },
      required: ['scenario_name', 'logs', 'expected_verdict']
    }
  });

  console.log(`[AI GENERATOR] Received scenario: ${response.scenario_name}`);
  console.log(`[AI GENERATOR] Generated ${response.logs?.length || 0} logs`);

  // Validate response
  if (!response.logs || response.logs.length === 0) {
    throw new Error('AI generated invalid scenario - no logs received');
  }

  // Enrich response with chain metadata
  return {
    ...response,
    difficulty: difficulty || chain.difficulty,
    category: chain.category,
    attack_chain: chainKey,
    attack_phases: chain.phases,
    mitre_techniques_used: chain.phases.map(p => p.technique),
    total_logs: response.logs.length,
    malicious_logs: response.logs.filter(l => l.verdict === 'TP').length,
    benign_logs: response.logs.filter(l => l.verdict === 'FP' || l.verdict === 'BenignNoise').length
  };
}

/**
 * Build comprehensive prompt for LLM
 */
function buildScenarioPrompt(chain, totalLogs) {
  const techniquesList = chain.phases.map(p => {
    const tech = MITRE_TECHNIQUES[p.technique];
    return `- ${p.phase}: ${p.technique} (${tech?.name}) - ${p.description}`;
  }).join('\n');

  return `You are a cybersecurity expert creating a realistic SOC investigation scenario for training purposes.

**ATTACK SCENARIO**: ${chain.name}
**DESCRIPTION**: ${chain.description}
**DIFFICULTY**: ${chain.difficulty}

**ATTACK CHAIN PHASES** (MITRE ATT&CK):
${techniquesList}

**YOUR TASK**:
Generate a complete investigation scenario with **${totalLogs} realistic security logs** that tell the story of this attack.

**REQUIREMENTS**:

1. **Scenario Context**: Create a realistic company scenario (e.g., "TechCorp financial services company")

2. **Log Distribution**:
   - ${Math.floor(totalLogs * 0.6)}-${Math.floor(totalLogs * 0.7)} logs should be TRUE POSITIVES (TP) - actual attack indicators
   - ${Math.floor(totalLogs * 0.2)}-${Math.floor(totalLogs * 0.3)} logs should be FALSE POSITIVES (FP) - suspicious but benign
   - ${Math.floor(totalLogs * 0.1)}-${Math.floor(totalLogs * 0.15)} logs should be BENIGN NOISE - normal business activity

3. **Log Sources**: Use varied sources like:
   - EDR (Endpoint Detection), Firewall, Active Directory, Windows Security
   - Network IDS, Email Gateway, Proxy, VPN, Cloud (Azure/AWS)
   - Antivirus, DLP, WAF, Database Security

4. **Realistic Details**:
   - Use realistic usernames (e.g., john.smith, sarah.admin, backup-svc)
   - Realistic hostnames (e.g., HR-LAPTOP-07, DB-SERVER-03, FINANCE-WS12)
   - Real IP addresses (use private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x)
   - Realistic timestamps spanning 2-8 hours
   - Actual process names (powershell.exe, cmd.exe, mimikatz.exe, etc.)
   - Real file paths and command lines

5. **Story Coherence**:
   - Logs should tell a chronological story
   - Attack should progress logically through phases
   - Include reconnaissance, initial access, lateral movement, impact
   - Mix in benign activities that could confuse junior analysts

6. **Technical Accuracy & Rich Log Data**:
   - Each TRUE POSITIVE log should map to a MITRE ATT&CK technique
   - **CRITICAL**: raw_log_data must contain COMPREHENSIVE, REALISTIC log fields as they appear in real security logs:
     * Windows Security logs: event_id, account_name, account_domain, logon_type, workstation_name, logon_process, authentication_package, security_id, process_id, parent_process_id, token_elevation_type
     * EDR logs: process_guid, parent_process_guid, hash_sha256, hash_md5, signer, signature_status, image_loaded, registry_path, registry_value_type, registry_value_data
     * Firewall logs: protocol, src_port, dst_port, bytes_sent, bytes_received, packets_sent, packets_received, action, rule_name, application
     * Active Directory logs: distinguished_name, group_name, ou_path, old_value, new_value, object_class, attribute_modified
     * Network IDS: signature_id, classification, priority, protocol, flags, ttl, payload_printable
     * Add 10-20 relevant fields per log to make it production-grade realistic
   - Make story_context descriptive but not revealing the verdict

7. **Learning Value**:
   - FALSE POSITIVES should be realistic red herrings
   - Require correlation across multiple log sources
   - Test ability to distinguish attack from normal ops

**OUTPUT FORMAT**: Return structured JSON with logs array and metadata.

Make this scenario challenging, realistic, and educational for SOC analysts!`;
}

/**
 * Select random attack chain with weighted probability
 * All scenarios are now APT-level threats
 */
function selectRandomAttackChain() {
  const weights = {
    'apt29-cozy-bear': 2,
    'apt28-fancy-bear': 2,
    'apt32-oceanlotus': 2,
    'apt41-double-dragon': 2,
    'lazarus-group': 2,
    'fin7-carbanak': 2,
    'blackcat-alphv': 3,
    'lockbit-3': 3,
    'solarwinds-supply-chain': 1,
    'cloud-infrastructure-apt': 2,
    'apt10-menupass': 2
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }

  return 'blackcat-alphv'; // fallback
}

/**
 * Generate quick scenario (for testing/demo)
 */
export async function generateQuickScenario() {
  return generateAdvancedAIScenario({
    numLogs: 10,
    difficulty: 'Medium'
  });
}

/**
 * List available attack chains
 */
export function listAttackChains() {
  return Object.entries(ATTACK_CHAINS).map(([key, chain]) => ({
    id: key,
    name: chain.name,
    description: chain.description,
    difficulty: chain.difficulty,
    category: chain.category,
    phases: chain.phases.length
  }));
}

/**
 * Get MITRE technique details
 */
export function getMitreTechnique(techniqueId) {
  return MITRE_TECHNIQUES[techniqueId] || null;
}