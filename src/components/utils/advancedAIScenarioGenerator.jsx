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

// Attack Chain Templates (APT scenarios)
const ATTACK_CHAINS = {
  'apt29-cozy-bear': {
    name: 'APT29 (Cozy Bear) - Advanced Persistent Threat',
    description: 'Sophisticated Russian state-sponsored attack group targeting government and private sector',
    difficulty: 'Advanced',
    category: 'Network Intrusion',
    phases: [
      { phase: 'Initial Access', technique: 'T1566', description: 'Spear phishing email with malicious attachment' },
      { phase: 'Execution', technique: 'T1059', description: 'PowerShell execution to download second stage' },
      { phase: 'Persistence', technique: 'T1053', description: 'Scheduled task creation for persistence' },
      { phase: 'Credential Access', technique: 'T1003', description: 'LSASS memory dumping via Mimikatz' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'RDP connections to multiple hosts' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'Data uploaded to cloud storage service' }
    ]
  },
  'ransomware-ryuk': {
    name: 'Ryuk Ransomware Attack',
    description: 'Targeted ransomware campaign with lateral movement and data encryption',
    difficulty: 'Hard',
    category: 'Malware',
    phases: [
      { phase: 'Initial Access', technique: 'T1078', description: 'Compromised VPN credentials used for access' },
      { phase: 'Discovery', technique: 'T1018', description: 'Network scanning and domain enumeration' },
      { phase: 'Lateral Movement', technique: 'T1021', description: 'PsExec used to deploy ransomware' },
      { phase: 'Privilege Escalation', technique: 'T1068', description: 'Kernel exploit for SYSTEM privileges' },
      { phase: 'Impact', technique: 'T1486', description: 'Mass file encryption across network shares' }
    ]
  },
  'insider-threat': {
    name: 'Insider Threat - Data Exfiltration',
    description: 'Malicious insider stealing sensitive data before resignation',
    difficulty: 'Medium',
    category: 'Insider Threat',
    phases: [
      { phase: 'Collection', technique: 'T1005', description: 'Access to sensitive database and file shares' },
      { phase: 'Staging', technique: 'T1074', description: 'Large files copied to USB drive and cloud storage' },
      { phase: 'Exfiltration', technique: 'T1567', description: 'Data uploaded to personal cloud accounts' },
      { phase: 'Defense Evasion', technique: 'T1070', description: 'Clearing of access logs and browser history' }
    ]
  },
  'web-app-exploit': {
    name: 'Web Application SQL Injection Attack',
    description: 'Automated SQL injection attack targeting customer database',
    difficulty: 'Medium',
    category: 'Web Application Attack',
    phases: [
      { phase: 'Initial Access', technique: 'T1190', description: 'SQL injection in login form' },
      { phase: 'Execution', technique: 'T1059', description: 'Database shell commands executed' },
      { phase: 'Credential Access', technique: 'T1552', description: 'Password hashes extracted from database' },
      { phase: 'Exfiltration', technique: 'T1041', description: 'Customer PII exfiltrated via DNS tunneling' }
    ]
  },
  'privilege-escalation': {
    name: 'Linux Privilege Escalation',
    description: 'Low-privilege user escalating to root via kernel exploit',
    difficulty: 'Hard',
    category: 'Privilege Escalation',
    phases: [
      { phase: 'Initial Access', technique: 'T1078', description: 'SSH access with compromised user credentials' },
      { phase: 'Discovery', technique: 'T1082', description: 'System information gathering and enumeration' },
      { phase: 'Privilege Escalation', technique: 'T1068', description: 'DirtyPipe kernel exploit executed' },
      { phase: 'Persistence', technique: 'T1053', description: 'Root cron job added for backdoor' }
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

6. **Technical Accuracy**:
   - Each TRUE POSITIVE log should map to a MITRE ATT&CK technique
   - Include technical details in raw_log_data (event IDs, registry keys, etc.)
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
 */
function selectRandomAttackChain() {
  const weights = {
    'apt29-cozy-bear': 2,
    'ransomware-ryuk': 3,
    'insider-threat': 2,
    'web-app-exploit': 2,
    'privilege-escalation': 1
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }

  return 'ransomware-ryuk'; // fallback
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