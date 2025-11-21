import { InvokeLLM } from '@/integrations/Core';

// Generate realistic EDR logs
export const generateEDRLogs = async (count = 20) => {
  const prompt = `
Generate ${count} realistic EDR (Endpoint Detection & Response) security logs in JSON format.

**REQUIRED FIELDS:**
- Timestamp (ISO format, last 24 hours, mix business hours + after hours)
- Host (realistic computer names like DESKTOP-ABC123, LAPTOP-HR-01, SRV-DC-01)
- Process (real process names: explorer.exe, powershell.exe, chrome.exe, notepad.exe, etc.)
- PID (realistic process IDs 1000-9999)
- User (domain\\username format like CORP\\john.doe, CORP\\admin, etc.)
- Action (ProcessStart, FileWrite, NetworkConnect, RegistryModify, ProcessTerminate)
- FilePath (realistic Windows paths like C:\\Windows\\System32\\, C:\\Users\\john\\Documents\\)
- Hash (MD5 or SHA256 - use real malware hashes for suspicious events)
- ThreatLevel (Low, Medium, High, Critical)

**CONTENT MIX:**
- 60% Normal business activity (legitimate processes, standard file operations)
- 25% Suspicious events (unusual processes, lateral movement attempts, privilege escalation)
- 15% Clear malicious activity (known malware execution, credential dumping, persistence mechanisms)

**SUSPICIOUS INDICATORS TO INCLUDE:**
- Unusual processes: mimikatz.exe, psexec.exe, powershell with suspicious commands
- Lateral movement: net.exe commands, RDP connections from unusual hosts
- Privilege escalation: runas commands, token manipulation
- Persistence: scheduled tasks, registry run keys modifications

Return JSON array with realistic, varied logs that a SOC analyst would encounter.
`;

  try {
    const response = await InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          logs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp: { type: "string" },
                host: { type: "string" },
                process: { type: "string" },
                pid: { type: "number" },
                user: { type: "string" },
                action: { type: "string" },
                file_path: { type: "string" },
                hash: { type: "string" },
                threat_level: { type: "string" },
                is_suspicious: { type: "boolean" },
                mitre_technique: { type: "string" }
              }
            }
          }
        }
      }
    });

    return response?.logs || [];
  } catch (error) {
    console.error('Failed to generate EDR logs:', error);
    return [];
  }
};

// Generate realistic Firewall logs
export const generateFirewallLogs = async (count = 20) => {
  const prompt = `
Generate ${count} realistic Firewall security logs in JSON format.

**REQUIRED FIELDS:**
- Timestamp (ISO format, last 24 hours)
- SourceIP (mix internal 192.168.x.x, 10.x.x.x and external IPs)
- DestinationIP (web servers, internal servers, suspicious IPs)
- SourcePort (ephemeral ports 32000-65000 for outbound, well-known for inbound)
- DestinationPort (80, 443, 22, 3389, 445, 135, etc.)
- Protocol (TCP, UDP, ICMP)
- Action (Allow, Deny, Drop)
- Bytes (realistic transfer sizes)
- Packets (realistic packet counts)
- RuleName (descriptive rule names like "Block_Malicious_IPs", "Allow_Web_Traffic")

**TRAFFIC MIX:**
- 70% Legitimate traffic (web browsing, email, file shares, remote access)
- 20% Suspicious patterns (port scanning, blocked countries, unusual protocols)
- 10% Clearly malicious (known bad IPs, exploit attempts, data exfiltration)

**SUSPICIOUS PATTERNS TO INCLUDE:**
- Port scanning: multiple ports from same source
- Blocked countries: IPs from suspicious geographic locations
- Unusual protocols: non-standard ports, protocol anomalies
- Data exfiltration: large outbound transfers
- Exploit attempts: attempts on vulnerable services

Return JSON array with realistic network traffic logs.
`;

  try {
    const response = await InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          logs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp: { type: "string" },
                source_ip: { type: "string" },
                destination_ip: { type: "string" },
                source_port: { type: "number" },
                destination_port: { type: "number" },
                protocol: { type: "string" },
                action: { type: "string" },
                bytes: { type: "number" },
                packets: { type: "number" },
                rule_name: { type: "string" },
                is_suspicious: { type: "boolean" },
                threat_category: { type: "string" }
              }
            }
          }
        }
      }
    });

    return response?.logs || [];
  } catch (error) {
    console.error('Failed to generate Firewall logs:', error);
    return [];
  }
};

// Generate realistic Windows AD security logs
export const generateADSecurityLogs = async (count = 20) => {
  const prompt = `
Generate ${count} realistic Windows Active Directory security logs in JSON format.

**REQUIRED EVENT IDs:**
- 4624: Successful logon (various logon types: 2=Interactive, 3=Network, 10=RemoteInteractive)
- 4625: Failed logon (include realistic failure reasons)
- 4648: Explicit logon (runas, service account usage)
- 4672: Special privileges assigned to new logon (admin rights)
- 4768: Kerberos authentication ticket requested
- 4769: Kerberos service ticket requested
- 4771: Kerberos pre-authentication failed

**REQUIRED FIELDS:**
- Timestamp (ISO format, last 24 hours)
- EventID (from list above)
- Username (realistic: john.doe, sarah.smith, svc_backup, administrator)
- Domain (CORP, CONTOSO, company names)
- SourceIP (internal network ranges + some external for VPN)
- Workstation (realistic computer names)
- LogonType (2, 3, 4, 5, 7, 8, 9, 10, 11)
- AuthenticationPackage (NTLM, Kerberos)
- Result (Success, Failure with specific error codes)
- FailureReason (for failed events: wrong password, account locked, etc.)

**ACTIVITY MIX:**
- 65% Normal business activity (standard logins during business hours)
- 25% Suspicious activity (after-hours logins, service account anomalies, failed login spikes)
- 10% Clear attacks (brute force, credential stuffing, privilege escalation attempts)

**SUSPICIOUS PATTERNS TO INCLUDE:**
- After-hours administrative logins
- Multiple failed logins followed by success
- Service accounts logging in interactively
- Logins from unusual workstations/IPs
- Privilege escalation (4672 events for non-admin users)

Return JSON array with realistic AD security events that SOC analysts encounter daily.
`;

  try {
    const response = await InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          logs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timestamp: { type: "string" },
                event_id: { type: "string" },
                username: { type: "string" },
                domain: { type: "string" },
                source_ip: { type: "string" },
                workstation: { type: "string" },
                logon_type: { type: "number" },
                authentication_package: { type: "string" },
                result: { type: "string" },
                failure_reason: { type: "string" },
                is_suspicious: { type: "boolean" },
                risk_score: { type: "number" }
              }
            }
          }
        }
      }
    });

    return response?.logs || [];
  } catch (error) {
    console.error('Failed to generate AD logs:', error);
    return [];
  }
};

// Combined multi-source log generation
export const generateMultiSourceSecurityLogs = async (edrCount = 15, firewallCount = 15, adCount = 15) => {
  try {
    const [edrLogs, firewallLogs, adLogs] = await Promise.all([
      generateEDRLogs(edrCount),
      generateFirewallLogs(firewallCount),
      generateADSecurityLogs(adCount)
    ]);

    // Add source type and normalize structure
    const normalizedLogs = [
      ...edrLogs.map(log => ({
        ...log,
        source_type: 'EDR',
        log_level: log.threat_level === 'Critical' ? 'CRITICAL' : 
                   log.threat_level === 'High' ? 'ERROR' : 
                   log.threat_level === 'Medium' ? 'WARNING' : 'INFO',
        event_id: `EDR_${log.action}_${Math.random().toString(36).substr(2, 6)}`
      })),
      ...firewallLogs.map(log => ({
        ...log,
        source_type: 'Firewall',
        log_level: log.action === 'Deny' || log.action === 'Drop' ? 'WARNING' : 'INFO',
        event_id: `FW_${log.action}_${Math.random().toString(36).substr(2, 6)}`
      })),
      ...adLogs.map(log => ({
        ...log,
        source_type: 'Active Directory',
        log_level: log.result === 'Failure' ? 'WARNING' : 
                   log.event_id === '4672' ? 'ERROR' : 'INFO',
        event_id: log.event_id
      }))
    ];

    // Sort by timestamp
    normalizedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      logs: normalizedLogs,
      metadata: {
        total_logs: normalizedLogs.length,
        source_distribution: {
          EDR: edrLogs.length,
          Firewall: firewallLogs.length,
          'Active Directory': adLogs.length
        },
        suspicious_events: normalizedLogs.filter(log => log.is_suspicious).length,
        generation_timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Failed to generate multi-source logs:', error);
    return { logs: [], metadata: {} };
  }
};