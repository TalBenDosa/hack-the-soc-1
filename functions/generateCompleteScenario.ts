/**
 * Generate Complete Security Scenario with 10 Realistic Logs
 * 
 * This function generates a complete attack scenario including:
 * - Scenario metadata (title, description, difficulty)
 * - Learning objectives
 * - 10 correlated, realistic security logs that tell a coherent story
 * - Uses OpenAI for generation and MalwareBazaar for real malicious hashes
 */

export default async function generateCompleteScenario(context) {
  const { attackType, difficulty, includeRealHashes } = context.arguments;
  const { OPENAI_API_KEY } = context.secrets;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Step 1: Fetch real malicious hashes if requested
  let maliciousHashData = null;
  if (includeRealHashes) {
    try {
      maliciousHashData = await context.functions.fetchMalwareHash({});
      console.log('Fetched real malicious hash:', maliciousHashData.hash);
    } catch (error) {
      console.log('Could not fetch from MalwareBazaar, will use database:', error);
      // Fallback to database
      const hashes = await context.entities.MaliciousHash.list('-created_date', 1);
      if (hashes.length > 0) {
        maliciousHashData = {
          hash: hashes[0].hash_value,
          malware_family: hashes[0].malware_family,
          file_type: hashes[0].file_type,
          source: 'Database'
        };
      }
    }
  }

  // Step 2: Define scenario types and data sources
  const scenarioTypes = {
    'Phishing': ['Office 365', 'EDR', 'Active Directory', 'Firewall'],
    'Ransomware': ['EDR', 'Active Directory', 'Firewall', 'Network IDS'],
    'Brute Force': ['Active Directory', 'DC', 'Firewall', 'VPN'],
    'Data Exfiltration': ['DLP', 'Firewall', 'Office 365', 'EDR'],
    'Malware Execution': ['EDR', 'Active Directory', 'Firewall', 'DNS'],
    'Lateral Movement': ['Active Directory', 'EDR', 'DC', 'Network IDS'],
    'Privilege Escalation': ['Active Directory', 'DC', 'EDR', 'Windows Security'],
    'C2 Communication': ['Firewall', 'Network IDS', 'EDR', 'DNS']
  };

  const selectedType = attackType || Object.keys(scenarioTypes)[Math.floor(Math.random() * Object.keys(scenarioTypes).length)];
  const dataSources = scenarioTypes[selectedType] || ['EDR', 'Firewall', 'Active Directory', 'Network IDS'];

  // Step 3: Build comprehensive prompt for scenario generation
  const hashContext = maliciousHashData 
    ? `\n\nREAL MALICIOUS HASH TO USE:\nSHA256: ${maliciousHashData.hash}\nMalware Family: ${maliciousHashData.malware_family}\nFile Type: ${maliciousHashData.file_type}\nSource: ${maliciousHashData.source}\n\nUSE THIS HASH in EDR logs where applicable.`
    : '';

  const prompt = `You are a SOC scenario architect. Generate a COMPLETE, PRODUCTION-GRADE cybersecurity training scenario.

━━━━━━━━━━━━━━━━━━━━━━
SCENARIO REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━

ATTACK TYPE: ${selectedType}
DIFFICULTY: ${difficulty || 'Medium'}
DATA SOURCES TO USE: ${dataSources.join(', ')}
${hashContext}

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT STRUCTURE (EXACT JSON):
━━━━━━━━━━━━━━━━━━━━━━

{
  "title": "Clear, professional scenario title",
  "description": "2-3 sentence description of the attack scenario, company context, and initial alert",
  "difficulty": "${difficulty || 'Medium'}",
  "category": "${selectedType}",
  "learning_objectives": [
    "Objective 1 - specific skill or technique",
    "Objective 2 - specific skill or technique",
    "Objective 3 - specific skill or technique",
    "Objective 4 - specific skill or technique"
  ],
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "initial_events": [
    {LOG OBJECT 1},
    {LOG OBJECT 2},
    {LOG OBJECT 3},
    {LOG OBJECT 4},
    {LOG OBJECT 5},
    {LOG OBJECT 6},
    {LOG OBJECT 7},
    {LOG OBJECT 8},
    {LOG OBJECT 9},
    {LOG OBJECT 10}
  ]
}

━━━━━━━━━━━━━━━━━━━━━━
SCENARIO STORY REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━

The 10 logs MUST tell a coherent story with these phases:

1. **Initial Access** (Logs 1-2): How attacker got in
2. **Detection Point** (Logs 3-4): Security tool alerts
3. **Progression** (Logs 5-7): Lateral movement, privilege escalation, or persistence
4. **Impact/Objective** (Logs 8-9): Data access, malware execution, or exfiltration
5. **Additional Context** (Log 10): Supporting evidence or noise

━━━━━━━━━━━━━━━━━━━━━━
LOG REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━

Each log MUST:
- Have EXACT field names from the real product (EDR, Firewall, AD, etc.)
- Include 25-50 fields minimum
- Have realistic timestamps in sequence (span 30-60 minutes)
- Use consistent actor names (same user, same IPs throughout the story)
- Include nested objects where appropriate
- Have realistic severity levels
- Include all metadata fields (agent info, rule IDs, event codes, etc.)

For each log, include these fields:
{
  "id": "unique_id",
  "timestamp": "ISO 8601 timestamp",
  "source_type": "Data Source Name",
  "rule_description": "What this event represents",
  "hostname": "consistent hostname",
  "username": "consistent username if applicable",
  "ip_address": "consistent IP if applicable",
  "severity": "Low/Medium/High/Critical",
  "raw_log_data": {
    ...all detailed fields from the actual product...
    (this is the main log body with 25-50+ fields)
  },
  "default_classification": "True Positive" or "False Positive"
}

Use varied data sources: ${dataSources.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES:
━━━━━━━━━━━━━━━━━━━━━━

- Output ONLY valid JSON
- NO markdown, NO code blocks, NO explanations
- Logs must be chronologically ordered
- Same attacker throughout (consistent usernames, IPs, hostnames)
- Include both malicious and benign-looking activity
- Make it require analyst judgment
- Professional SOC-grade quality

GENERATE THE COMPLETE SCENARIO NOW:`;

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity expert specializing in SOC training scenarios. Output ONLY valid JSON without markdown or explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.85,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  let generatedContent = data.choices[0].message.content.trim();

  // Clean up markdown if present
  if (generatedContent.startsWith('```json')) {
    generatedContent = generatedContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (generatedContent.startsWith('```')) {
    generatedContent = generatedContent.replace(/```\n?/, '').replace(/\n?```$/, '');
  }

  // Parse JSON
  let scenarioData;
  try {
    scenarioData = JSON.parse(generatedContent);
  } catch (error) {
    throw new Error(`Failed to parse generated scenario as JSON: ${error.message}`);
  }

  // Validate structure
  if (!scenarioData.title || !scenarioData.initial_events || scenarioData.initial_events.length !== 10) {
    throw new Error('Generated scenario does not meet requirements (must have title and exactly 10 logs)');
  }

  // Step 4: Save scenario to database
  try {
    const user = await context.auth.me();
    let tenantId = null;
    
    // Check if user is Super Admin
    if (user.role === 'admin') {
      // Super Admin - create global scenario
      scenarioData.is_global = true;
      scenarioData.created_by_super_admin = true;
      scenarioData.tenant_id = null;
    } else {
      // Regular admin - find tenant
      const tenantUsers = await context.entities.TenantUser.filter({ 
        user_id: user.id, 
        status: 'active' 
      });
      
      if (tenantUsers.length > 0) {
        tenantId = tenantUsers[0].tenant_id;
      }
      
      scenarioData.tenant_id = tenantId;
      scenarioData.is_global = false;
      scenarioData.created_by_super_admin = false;
    }

    const savedScenario = await context.entities.Scenario.create(scenarioData);

    return {
      success: true,
      scenario: savedScenario,
      tokens_used: data.usage.total_tokens,
      malicious_hash_used: maliciousHashData?.hash || null,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to save scenario to database: ${error.message}`);
  }
}