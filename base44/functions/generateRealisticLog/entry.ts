/**
 * Generate Realistic Security Log using OpenAI
 * 
 * This function generates detailed, realistic security logs based on:
 * - Data source type (EDR, Firewall, AD, etc.)
 * - Attack scenario context
 * - Log templates from database
 */

export default async function generateRealisticLog(context) {
  const { sourceType, attackType, logContext, includeIOCs } = context.arguments;
  const { OPENAI_API_KEY } = context.secrets;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Fetch relevant log templates from database
  let logTemplates = [];
  try {
    const templates = await context.entities.LogTemplate.filter({
      source_type: sourceType,
      is_active: true
    });
    logTemplates = templates;
  } catch (error) {
    console.log('Could not fetch log templates:', error);
  }

  // Build context for OpenAI
  const templateContext = logTemplates.length > 0 
    ? `\n\nUSE THESE REAL LOG TEMPLATES AS REFERENCE:\n${JSON.stringify(logTemplates.slice(0, 3), null, 2)}`
    : '';

  // Fetch malicious hashes if needed
  let maliciousHashes = [];
  if (includeIOCs) {
    try {
      const hashes = await context.entities.MaliciousHash.list('-created_date', 5);
      maliciousHashes = hashes.map(h => ({ hash: h.hash_value, type: h.hash_type }));
    } catch (error) {
      console.log('Could not fetch malicious hashes:', error);
    }
  }

  const hashesContext = maliciousHashes.length > 0
    ? `\n\nUSE THESE REAL MALICIOUS HASHES:\n${JSON.stringify(maliciousHashes, null, 2)}`
    : '';

  // Create detailed prompt for OpenAI
  const prompt = `You are a SOC log generation expert. Generate ONE realistic, production-grade security log.

━━━━━━━━━━━━━━━━━━━━━━
DATA SOURCE: ${sourceType}
ATTACK TYPE: ${attackType || 'Not specified'}
CONTEXT: ${logContext || 'General security event'}
${templateContext}
${hashesContext}

━━━━━━━━━━━━━━━━━━━━━━
REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━

1. FIELD ACCURACY:
   - Use EXACT field names from real ${sourceType} logs
   - Include ALL standard fields for ${sourceType}
   - No generic or made-up field names
   - Follow the exact JSON structure of ${sourceType}

2. DATA REALISM:
   - Realistic timestamps (ISO 8601 format)
   - Real-looking usernames (e.g., john.smith, sarah.johnson)
   - Valid internal IPs (10.x.x.x, 172.16.x.x, 192.168.x.x)
   - Real domains and URLs if applicable
   - Actual process names and paths for the OS
   - Real file hashes (use provided malicious hashes if relevant)
   
3. LOG DEPTH:
   - Include 20-40 fields minimum
   - Add nested objects where appropriate
   - Include metadata fields (agent info, event codes, etc.)
   - Add contextual information (parent processes, network connections, etc.)

4. SECURITY RELEVANCE:
   - Log must be relevant to: ${attackType || 'security monitoring'}
   - Include clear indicators of compromise if malicious
   - Realistic severity level
   - MITRE ATT&CK technique if applicable

5. FORMAT:
   - Output ONLY valid JSON
   - No markdown, no code blocks, no explanations
   - Production-ready format

━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE STRUCTURE REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━

For EDR logs, include: process details, parent process, command line, user, host, file operations, network connections, hash values, threat scores

For Firewall logs, include: source/dest IPs and ports, protocol, action, policy rule, bytes transferred, session info, NAT details, geo-location

For Active Directory logs, include: event ID, account name, domain, logon type, workstation, IP address, process info, failure codes

For Office 365 logs, include: user, operation, workload, client IP, user agent, item type, site URL, file details

GENERATE ONE COMPLETE LOG NOW:`;

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
          content: 'You are a cybersecurity expert specializing in generating realistic SOC logs. Output ONLY valid JSON without any markdown or explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const generatedContent = data.choices[0].message.content.trim();

  // Clean up the response (remove markdown if present)
  let logJson = generatedContent;
  if (logJson.startsWith('```json')) {
    logJson = logJson.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (logJson.startsWith('```')) {
    logJson = logJson.replace(/```\n?/, '').replace(/\n?```$/, '');
  }

  // Parse and validate JSON
  let parsedLog;
  try {
    parsedLog = JSON.parse(logJson);
  } catch (error) {
    throw new Error(`Failed to parse generated log as JSON: ${error.message}`);
  }

  return {
    success: true,
    log: parsedLog,
    source_type: sourceType,
    generated_at: new Date().toISOString(),
    tokens_used: data.usage.total_tokens
  };
}