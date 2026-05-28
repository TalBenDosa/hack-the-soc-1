/**
 * Built-in CTF Challenge Definitions
 * 10 pre-built challenges with realistic log sets and embedded flags.
 * Flags are stored here but comparison should be case-insensitive.
 */

const makeTimestamp = (minsAgo) => {
    const d = new Date(Date.now() - minsAgo * 60 * 1000);
    return d.toISOString();
};

export const CTF_CHALLENGES = [
    // ─────────────────────────────────────────────────────────────
    // 1. SILENT EXFIL — DNS Tunneling (Beginner)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-001',
        title: 'Silent Exfil',
        description:
            'An endpoint has been generating unusual DNS traffic. Analysts noticed the volume spiked but no alerts fired. Find the exfiltration channel and retrieve the hidden flag embedded in the DNS logs.',
        difficulty: 'Beginner',
        category: 'DNS',
        points: 100,
        flag: 'SOC{DNS_TUNNEL_SUBDOMAIN_EXFIL_DETECTED}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1048.003', 'T1071.004'],
        tags: ['DNS', 'Exfiltration', 'Tunneling'],
        learning_objectives: [
            'Identify DNS tunneling by analysing subdomain label length and entropy',
            'Recognise base64-encoded data in DNS query names',
            'Understand how attackers use DNS to bypass DLP controls',
        ],
        hints: [
            { order: 0, text: 'Look at the length of the subdomain labels in the DNS queries — normal FQDNs are much shorter.', point_cost: 15 },
            { order: 1, text: 'Try base64-decoding the longest subdomain label you see.', point_cost: 25 },
            { order: 2, text: 'The flag is the decoded value of the longest base64 subdomain in log #6.', point_cost: 40 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(65), source_type: 'DNS', severity: 'Low', rule_description: 'Standard DNS query', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { query_name: 'docs.google.com', query_type: 'A', response_code: 'NOERROR', response_ip: '142.250.80.110', ttl: 300, query_length: 15, protocol: 'UDP', threat_category: 'None', ioc_detected: false } },
            { id: 'l2', timestamp: makeTimestamp(62), source_type: 'DNS', severity: 'Low', rule_description: 'Standard DNS query', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { query_name: 'outlook.office365.com', query_type: 'A', response_code: 'NOERROR', response_ip: '52.97.128.64', ttl: 300, query_length: 21, protocol: 'UDP', threat_category: 'None', ioc_detected: false } },
            { id: 'l3', timestamp: makeTimestamp(59), source_type: 'DNS', severity: 'Medium', rule_description: 'Elevated NXDOMAIN rate — possible DGA', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { query_name: 'tzxkqjv.update-cdn-service.net', query_type: 'A', response_code: 'NXDOMAIN', response_ip: null, ttl: 0, query_length: 31, protocol: 'UDP', threat_category: 'Suspicious', ioc_detected: true } },
            { id: 'l4', timestamp: makeTimestamp(56), source_type: 'DNS', severity: 'Medium', rule_description: 'Elevated NXDOMAIN rate', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { query_name: 'mwvpqkbr.update-cdn-service.net', query_type: 'A', response_code: 'NXDOMAIN', response_ip: null, ttl: 0, query_length: 33, protocol: 'UDP', threat_category: 'Suspicious', ioc_detected: true } },
            { id: 'l5', timestamp: makeTimestamp(53), source_type: 'DNS', severity: 'High', rule_description: 'Oversized TXT query — possible DNS tunneling', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { query_name: 'U09De2Rucy50dW5uZWx9.exfil.update-cdn-service.net', query_type: 'TXT', response_code: 'NOERROR', response_ip: '185.220.101.45', ttl: 5, query_length: 172, protocol: 'UDP', threat_category: 'DNS Tunneling', ioc_detected: true, anomaly_score: 97, label_count: 4, avg_label_length: 43 } },
            { id: 'l6', timestamp: makeTimestamp(50), source_type: 'DNS', severity: 'Critical', rule_description: 'DNS tunneling confirmed — data exfiltration in progress', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { query_name: 'U09De0ROU19UVU5ORUxfU1VCRE9NQUlOX0VYRklMX0RFVEVDVEVEfQ.exfil.update-cdn-service.net', query_type: 'NULL', response_code: 'NOERROR', response_ip: '185.220.101.45', ttl: 3, query_length: 248, protocol: 'UDP', threat_category: 'DNS Tunneling', ioc_detected: true, anomaly_score: 99, label_count: 4, avg_label_length: 82 } },
            { id: 'l7', timestamp: makeTimestamp(47), source_type: 'Firewall', severity: 'High', rule_description: 'Outbound connection to threat-intel flagged IP', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { action: 'ALLOW', src_ip: '10.0.2.44', dst_ip: '185.220.101.45', dst_port: 53, protocol: 'UDP', bytes_sent: 12400, rule_name: 'DNS-Outbound-Allow' } },
            { id: 'l8', timestamp: makeTimestamp(44), source_type: 'EDR', severity: 'High', rule_description: 'Suspicious process making DNS calls — dnscat2 pattern', hostname: 'FIN-WS-04', username: 'sarah.cohen', ip_address: '10.0.2.44', raw_log_data: { process_name: 'updater.exe', process_path: 'C:\\Users\\sarah.cohen\\AppData\\Local\\Temp\\updater.exe', command_line: 'updater.exe --dns-server 185.220.101.45 --tunnel', parent_process_name: 'explorer.exe', hash_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef123456' } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 2. THE PHANTOM ADMIN — Golden Ticket (Intermediate)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-002',
        title: 'The Phantom Admin',
        description:
            'A privileged account appeared active at 2am performing domain admin tasks — but the real employee was on vacation. Investigate the Active Directory logs to identify the attack technique and find the flag.',
        difficulty: 'Intermediate',
        category: 'Active Directory',
        points: 250,
        flag: 'SOC{GOLDEN_TICKET_KRBTGT_FORGED_T1558001}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1558.001', 'T1078.002', 'T1098'],
        tags: ['Kerberos', 'Active Directory', 'Privilege Escalation'],
        learning_objectives: [
            'Identify Kerberos golden ticket indicators (Event ID 4769 with unusual ticket options)',
            'Recognise off-hours privileged activity as a key IOC',
            'Understand how attackers forge Kerberos tickets using the KRBTGT hash',
        ],
        hints: [
            { order: 0, text: 'Golden ticket attacks generate Kerberos ticket requests with abnormal lifetimes. Look at the ticket options field in Event ID 4769.', point_cost: 25 },
            { order: 1, text: 'The ticket EncryptionType will be 0x17 (RC4) instead of the expected AES256 (0x12). This is a classic indicator.', point_cost: 35 },
            { order: 2, text: 'Combine the MITRE technique ID with the attack method name and the hash of the account that was compromised: KRBTGT. The flag spells out what happened.', point_cost: 50 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(1440), source_type: 'Active Directory', severity: 'Low', rule_description: 'Normal logon', hostname: 'DC-CORP-01', username: 'j.torres', ip_address: '10.0.1.5', raw_log_data: { EventID: 4624, SubjectUserName: 'j.torres', LogonType: 3, IpAddress: '10.0.5.22', AuthenticationPackageName: 'Kerberos' } },
            { id: 'l2', timestamp: makeTimestamp(130), source_type: 'Active Directory', severity: 'Critical', rule_description: 'Kerberos TGS request — anomalous ticket encryption type (RC4 instead of AES256)', hostname: 'DC-CORP-01', username: 'j.torres', ip_address: '10.0.1.5', raw_log_data: { EventID: 4769, TargetUserName: 'j.torres@CORP.LOCAL', ServiceName: 'krbtgt', TicketEncryptionType: '0x17', TicketOptions: '0x40810010', IpAddress: '10.0.8.199', FailureCode: '0x0' } },
            { id: 'l3', timestamp: makeTimestamp(128), source_type: 'Windows Security', severity: 'Critical', rule_description: 'Privileged logon with forged ticket — off-hours access (02:14 AM)', hostname: 'DC-CORP-01', username: 'j.torres', ip_address: '10.0.8.199', raw_log_data: { EventID: 4672, SubjectUserName: 'j.torres', PrivilegeList: 'SeTcbPrivilege SeBackupPrivilege SeRestorePrivilege SeDebugPrivilege', IpAddress: '10.0.8.199', LogonType: 3 } },
            { id: 'l4', timestamp: makeTimestamp(126), source_type: 'Active Directory', severity: 'Critical', rule_description: 'New domain admin account created at 02:16 AM', hostname: 'DC-CORP-01', username: 'j.torres', ip_address: '10.0.8.199', raw_log_data: { EventID: 4720, SubjectUserName: 'j.torres', TargetUserName: 'svc-backup-admin', ObjectClass: 'user', ObjectName: 'CN=svc-backup-admin,OU=Service Accounts,DC=corp,DC=local' } },
            { id: 'l5', timestamp: makeTimestamp(124), source_type: 'Active Directory', severity: 'Critical', rule_description: 'User added to Domain Admins group', hostname: 'DC-CORP-01', username: 'j.torres', ip_address: '10.0.8.199', raw_log_data: { EventID: 4728, SubjectUserName: 'j.torres', GroupName: 'Domain Admins', GroupDomain: 'CORP', MemberName: 'CN=svc-backup-admin,OU=Service Accounts,DC=corp,DC=local' } },
            { id: 'l6', timestamp: makeTimestamp(120), source_type: 'EDR', severity: 'Critical', rule_description: 'Mimikatz-like process accessing LSASS — KRBTGT hash extraction pattern', hostname: 'WORKSTATION-17', username: 'attacker', ip_address: '10.0.8.199', raw_log_data: { process_name: 'beacon.exe', command_line: 'sekurlsa::krbtgt', parent_process_name: 'powershell.exe', hash_sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b' } },
            { id: 'l7', timestamp: makeTimestamp(115), source_type: 'Firewall', severity: 'High', rule_description: 'Lateral movement — SMB to multiple DC hosts', hostname: 'WORKSTATION-17', username: 'attacker', ip_address: '10.0.8.199', raw_log_data: { action: 'ALLOW', src_ip: '10.0.8.199', dst_ip: '10.0.1.5', dst_port: 445, protocol: 'TCP', bytes_sent: 85000 } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 3. OUTLOOK BACKDOOR — O365 Forwarding Rule (Beginner)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-003',
        title: 'Outlook Backdoor',
        description:
            'A finance user\'s mailbox is silently forwarding all emails to an external address. The user did not configure this. Find the forwarding rule creation event and extract the flag.',
        difficulty: 'Beginner',
        category: 'Email',
        points: 100,
        flag: 'SOC{O365_INBOX_RULE_SILENT_FORWARD_T1114003}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1114.003', 'T1078', 'T1566.001'],
        tags: ['Office 365', 'BEC', 'Collection', 'Exfiltration'],
        learning_objectives: [
            'Detect inbox forwarding rule creation in Office 365 audit logs',
            'Understand why auto-forwarding to external domains is a high-severity IOC',
            'Correlate initial phishing with subsequent account takeover actions',
        ],
        hints: [
            { order: 0, text: 'Look for the Office 365 audit operation "New-InboxRule" or "Set-InboxRule" in the logs.', point_cost: 15 },
            { order: 1, text: 'The forwarding address domain — is it an internal domain or external? Check the rule parameters.', point_cost: 20 },
            { order: 2, text: 'The flag is constructed from the MITRE technique for email collection via forwarding rules combined with what the rule does.', point_cost: 30 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(200), source_type: 'Office365 / Microsoft 365 Audit', severity: 'High', rule_description: 'Multiple failed logins — password spray pattern', hostname: 'N/A', username: 'm.goldstein', ip_address: '91.240.118.172', raw_log_data: { RecordType: 'AzureActiveDirectory', Operation: 'UserLoginFailed', ResultStatus: 'Failed', UserId: 'm.goldstein@acmecorp.com', ClientIP: '91.240.118.172', UserAgent: 'python-requests/2.28.0', ErrorCode: 50053 } },
            { id: 'l2', timestamp: makeTimestamp(195), source_type: 'Azure AD / Entra ID', severity: 'High', rule_description: 'Successful login after multiple failures — possible credential stuffing', hostname: 'N/A', username: 'm.goldstein', ip_address: '91.240.118.172', raw_log_data: { operationName: 'Sign-in activity', resultType: '0', userPrincipalName: 'm.goldstein@acmecorp.com', callerIpAddress: '91.240.118.172', location: 'RU', riskLevelAggregated: 'high', riskDetail: 'unfamiliarFeatures' } },
            { id: 'l3', timestamp: makeTimestamp(193), source_type: 'Office365 / Microsoft 365 Audit', severity: 'Critical', rule_description: 'Inbox forwarding rule created — all mail forwarded to external address', hostname: 'N/A', username: 'm.goldstein', ip_address: '91.240.118.172', raw_log_data: { RecordType: 'ExchangeAdmin', Operation: 'New-InboxRule', UserId: 'm.goldstein@acmecorp.com', ClientIP: '91.240.118.172', RuleName: 'Backup', ForwardTo: 'exfil.target@protonmail.com', ForwardAsAttachmentTo: null, DeleteMessage: false, MarkAsRead: true, Workload: 'Exchange' } },
            { id: 'l4', timestamp: makeTimestamp(190), source_type: 'Office365 / Microsoft 365 Audit', severity: 'High', rule_description: 'Bulk email read from Finance folder after rule creation', hostname: 'N/A', username: 'm.goldstein', ip_address: '91.240.118.172', raw_log_data: { RecordType: 'ExchangeItem', Operation: 'MessageBind', ObjectId: 'Finance/2024/Q4', UserId: 'm.goldstein@acmecorp.com', ClientIP: '91.240.118.172', ItemsRead: 847 } },
            { id: 'l5', timestamp: makeTimestamp(185), source_type: 'Email Security / Mail Gateway', severity: 'Critical', rule_description: 'Initial phishing email — credential harvest link — 3 hours prior', hostname: 'N/A', username: 'm.goldstein', ip_address: '45.142.212.100', raw_log_data: { sender: 'it-support@acmec0rp.com', recipient: 'm.goldstein@acmecorp.com', subject: 'Action Required: Verify Your Microsoft Account', verdict: 'phishing', threat_name: 'Phishing.CredentialHarvest.O365Lure', action: 'deliver', spf_result: 'fail', dmarc_result: 'fail', spam_score: 18 } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 4. LOCKBIT PRELUDE — Ransomware Staging (Advanced)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-004',
        title: 'LockBit Prelude',
        description:
            'An endpoint triggered multiple LOLBin-related alerts before going dark. The attacker staged ransomware using living-off-the-land techniques. Trace the kill chain and find the flag hidden in the staging command.',
        difficulty: 'Advanced',
        category: 'EDR',
        points: 500,
        flag: 'SOC{LOLBIN_CERTUTIL_RANSOMWARE_STAGE_T1218}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1218', 'T1486', 'T1059.001', 'T1070.004'],
        tags: ['EDR', 'Ransomware', 'LOLBins', 'Defense Evasion'],
        learning_objectives: [
            'Identify LOLBin abuse for malware staging (certutil.exe -decode)',
            'Recognise ransomware pre-staging behaviours: shadow copy deletion, file enumeration',
            'Correlate EDR, Windows Events, and firewall logs across a ransomware kill chain',
        ],
        hints: [
            { order: 0, text: 'LOLBins used for download and decode include: certutil.exe, mshta.exe, bitsadmin.exe, msiexec.exe. Check the command line in each EDR log.', point_cost: 35 },
            { order: 1, text: 'One command uses certutil.exe with the -decode flag and downloads a .txt file that is actually an encoded ransomware payload.', point_cost: 50 },
            { order: 2, text: 'The flag describes the LOLBin used (CERTUTIL), its purpose (RANSOMWARE_STAGE), and the MITRE technique for system binary proxy execution.', point_cost: 75 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(300), source_type: 'EDR', severity: 'High', rule_description: 'PowerShell with Base64-encoded command — obfuscation detected', hostname: 'HR-LAPTOP-12', username: 'r.kim', ip_address: '10.0.3.77', raw_log_data: { process_name: 'powershell.exe', command_line: 'powershell.exe -WindowStyle Hidden -enc JABjACAAPQAgAFsAUwB5AHMAdABlAG0ALgBUAGUAeAB0AC4ARQBuAGMAbwBkAGkAbgBnAF0A', parent_process_name: 'winword.exe', hash_sha256: 'b2c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef1234567890' } },
            { id: 'l2', timestamp: makeTimestamp(298), source_type: 'EDR', severity: 'Critical', rule_description: 'certutil.exe used to decode and drop payload — LOLBIN abuse', hostname: 'HR-LAPTOP-12', username: 'r.kim', ip_address: '10.0.3.77', raw_log_data: { process_name: 'certutil.exe', command_line: 'certutil.exe -decode C:\\Users\\r.kim\\AppData\\Local\\Temp\\update.txt C:\\Users\\r.kim\\AppData\\Local\\Temp\\lb3.exe', parent_process_name: 'powershell.exe', hash_sha256: 'c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678901a' } },
            { id: 'l3', timestamp: makeTimestamp(295), source_type: 'EDR', severity: 'Critical', rule_description: 'Shadow copy deletion via vssadmin', hostname: 'HR-LAPTOP-12', username: 'r.kim', ip_address: '10.0.3.77', raw_log_data: { process_name: 'vssadmin.exe', command_line: 'vssadmin delete shadows /all /quiet', parent_process_name: 'cmd.exe', hash_sha256: 'd4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678901ab2' } },
            { id: 'l4', timestamp: makeTimestamp(293), source_type: 'EDR', severity: 'Critical', rule_description: 'Ransomware payload executed — lb3.exe', hostname: 'HR-LAPTOP-12', username: 'r.kim', ip_address: '10.0.3.77', raw_log_data: { process_name: 'lb3.exe', command_line: 'lb3.exe -encrypt -all -key 0x4c6f636b426974', parent_process_name: 'certutil.exe', hash_sha256: 'e5f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678901ab2c3', signature_status: 'unsigned', malware_family: 'LockBit 3.0' } },
            { id: 'l5', timestamp: makeTimestamp(290), source_type: 'Windows Security', severity: 'Critical', rule_description: 'Mass file modification — encryption in progress (Event 4663)', hostname: 'HR-LAPTOP-12', username: 'r.kim', ip_address: '10.0.3.77', raw_log_data: { EventID: 4663, ObjectType: 'File', ObjectName: 'C:\\Users\\r.kim\\Documents\\', ProcessName: 'lb3.exe', AccessMask: '0x2', ModificationsPerMinute: 2847 } },
            { id: 'l6', timestamp: makeTimestamp(288), source_type: 'Firewall', severity: 'High', rule_description: 'C2 communication — lb3.exe phoning home', hostname: 'HR-LAPTOP-12', username: 'r.kim', ip_address: '10.0.3.77', raw_log_data: { action: 'ALLOW', src_ip: '10.0.3.77', dst_ip: '194.165.16.77', dst_port: 443, protocol: 'TCP', bytes_sent: 45200 } },
            { id: 'l7', timestamp: makeTimestamp(285), source_type: 'EDR', severity: 'Critical', rule_description: 'Log tampering — Windows event log cleared', hostname: 'HR-LAPTOP-12', username: 'r.kim', ip_address: '10.0.3.77', raw_log_data: { process_name: 'wevtutil.exe', command_line: 'wevtutil.exe cl System && wevtutil.exe cl Security && wevtutil.exe cl Application', parent_process_name: 'cmd.exe', hash_sha256: 'f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678901ab2c3d4' } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 5. SHADOW IT AWS — Cloud Privilege Escalation (Intermediate)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-005',
        title: 'Shadow IT AWS',
        description:
            'An AWS CloudTrail alert fired for unusual IAM activity. A developer created an admin-level IAM user and immediately began transferring data from S3. Identify the attack path and find the flag.',
        difficulty: 'Intermediate',
        category: 'Cloud',
        points: 250,
        flag: 'SOC{AWS_IAM_PRIVILEGE_ESCALATION_S3_EXFIL_T1098}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1098', 'T1048', 'T1078.004'],
        tags: ['AWS', 'Cloud', 'Privilege Escalation', 'Exfiltration'],
        learning_objectives: [
            'Identify AWS IAM privilege escalation via CreateUser + AttachUserPolicy',
            'Detect S3 data exfiltration via GetObject events with high volume',
            'Correlate CloudTrail events to reconstruct an attacker\'s cloud access chain',
        ],
        hints: [
            { order: 0, text: 'Look for the sequence: CreateUser → AttachUserPolicy → CreateAccessKey — this is the privilege escalation pattern.', point_cost: 25 },
            { order: 1, text: 'After creating the admin user, what S3 actions occur? Focus on GetObject event counts.', point_cost: 35 },
            { order: 2, text: 'The flag describes the MITRE technique for account manipulation combined with the exfiltration method used.', point_cost: 40 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(180), source_type: 'AWS CloudTrail', severity: 'Medium', rule_description: 'Console login from unusual IP', hostname: 'N/A', username: 'dev.zhang', ip_address: '5.188.206.14', raw_log_data: { eventName: 'ConsoleLogin', sourceIPAddress: '5.188.206.14', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', userIdentity_type: 'IAMUser', userIdentity_arn: 'arn:aws:iam::123456789012:user/dev.zhang', awsRegion: 'us-east-1', responseElements: { ConsoleLogin: 'Success' } } },
            { id: 'l2', timestamp: makeTimestamp(178), source_type: 'AWS CloudTrail', severity: 'Critical', rule_description: 'IAM user created — suspicious naming convention', hostname: 'N/A', username: 'dev.zhang', ip_address: '5.188.206.14', raw_log_data: { eventName: 'CreateUser', sourceIPAddress: '5.188.206.14', userIdentity_arn: 'arn:aws:iam::123456789012:user/dev.zhang', requestParameters: { userName: 'svc-monitor-backup' }, awsRegion: 'us-east-1' } },
            { id: 'l3', timestamp: makeTimestamp(177), source_type: 'AWS CloudTrail', severity: 'Critical', rule_description: 'AdministratorAccess policy attached to new user', hostname: 'N/A', username: 'dev.zhang', ip_address: '5.188.206.14', raw_log_data: { eventName: 'AttachUserPolicy', sourceIPAddress: '5.188.206.14', userIdentity_arn: 'arn:aws:iam::123456789012:user/dev.zhang', requestParameters: { userName: 'svc-monitor-backup', policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess' }, awsRegion: 'us-east-1' } },
            { id: 'l4', timestamp: makeTimestamp(176), source_type: 'AWS CloudTrail', severity: 'High', rule_description: 'Access key created for new admin user', hostname: 'N/A', username: 'dev.zhang', ip_address: '5.188.206.14', raw_log_data: { eventName: 'CreateAccessKey', sourceIPAddress: '5.188.206.14', requestParameters: { userName: 'svc-monitor-backup' }, awsRegion: 'us-east-1' } },
            { id: 'l5', timestamp: makeTimestamp(172), source_type: 'AWS CloudTrail', severity: 'Critical', rule_description: 'Mass S3 GetObject — 2,847 objects downloaded in 4 minutes', hostname: 'N/A', username: 'svc-monitor-backup', ip_address: '5.188.206.14', raw_log_data: { eventName: 'GetObject', eventSource: 's3.amazonaws.com', sourceIPAddress: '5.188.206.14', userIdentity_type: 'IAMUser', userIdentity_arn: 'arn:aws:iam::123456789012:user/svc-monitor-backup', requestParameters: { bucketName: 'acmecorp-confidential-hr', key: 'employee_records_2024.zip' }, awsRegion: 'us-east-1', bytesTransferred: 4782045 } },
            { id: 'l6', timestamp: makeTimestamp(168), source_type: 'AWS CloudTrail', severity: 'Critical', rule_description: 'CloudTrail logging disabled — evidence tampering', hostname: 'N/A', username: 'svc-monitor-backup', ip_address: '5.188.206.14', raw_log_data: { eventName: 'StopLogging', eventSource: 'cloudtrail.amazonaws.com', sourceIPAddress: '5.188.206.14', userIdentity_arn: 'arn:aws:iam::123456789012:user/svc-monitor-backup', requestParameters: { Name: 'corporate-trail' }, awsRegion: 'us-east-1' } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 6. INVISIBLE BEACON — C2 Firewall Detection (Advanced)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-006',
        title: 'Invisible Beacon',
        description:
            'Firewall logs show regular outbound connections from a workstation, but each connection has minimal data and looks like legitimate HTTPS traffic. Calculate the beacon interval and extract the flag.',
        difficulty: 'Advanced',
        category: 'Firewall',
        points: 500,
        flag: 'SOC{C2_BEACON_INTERVAL_300S_COBALT_STRIKE_T1071}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1071.001', 'T1071', 'T1090'],
        tags: ['Firewall', 'C2', 'Beaconing', 'Network Forensics'],
        learning_objectives: [
            'Detect C2 beaconing by identifying regular-interval connections to a single destination',
            'Distinguish malicious beaconing from legitimate heartbeat traffic',
            'Calculate beacon intervals from timestamp deltas in firewall logs',
        ],
        hints: [
            { order: 0, text: 'Calculate the time difference between each outbound connection to the same destination IP. Look for a consistent pattern.', point_cost: 40 },
            { order: 1, text: 'The interval is exactly the same between each connection. Count the seconds between timestamps.', point_cost: 55 },
            { order: 2, text: 'The interval is 300 seconds (5 minutes). The flag combines the C2 type (Cobalt Strike default sleep), interval, and MITRE technique.', point_cost: 70 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(32), source_type: 'Firewall', severity: 'Low', rule_description: 'Outbound HTTPS — allowed', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { action: 'ALLOW', src_ip: '10.0.4.88', dst_ip: '93.115.27.56', dst_port: 443, protocol: 'TCP', bytes_sent: 412, bytes_received: 1204, duration: 2, app: 'ssl' } },
            { id: 'l2', timestamp: makeTimestamp(27), source_type: 'Firewall', severity: 'Low', rule_description: 'Outbound HTTPS — allowed', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { action: 'ALLOW', src_ip: '10.0.4.88', dst_ip: '93.115.27.56', dst_port: 443, protocol: 'TCP', bytes_sent: 398, bytes_received: 1189, duration: 2, app: 'ssl' } },
            { id: 'l3', timestamp: makeTimestamp(22), source_type: 'Firewall', severity: 'Low', rule_description: 'Outbound HTTPS — allowed', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { action: 'ALLOW', src_ip: '10.0.4.88', dst_ip: '93.115.27.56', dst_port: 443, protocol: 'TCP', bytes_sent: 421, bytes_received: 1198, duration: 2, app: 'ssl' } },
            { id: 'l4', timestamp: makeTimestamp(17), source_type: 'Firewall', severity: 'Low', rule_description: 'Outbound HTTPS — allowed', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { action: 'ALLOW', src_ip: '10.0.4.88', dst_ip: '93.115.27.56', dst_port: 443, protocol: 'TCP', bytes_sent: 403, bytes_received: 1211, duration: 2, app: 'ssl' } },
            { id: 'l5', timestamp: makeTimestamp(12), source_type: 'Firewall', severity: 'Low', rule_description: 'Outbound HTTPS — allowed', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { action: 'ALLOW', src_ip: '10.0.4.88', dst_ip: '93.115.27.56', dst_port: 443, protocol: 'TCP', bytes_sent: 415, bytes_received: 1195, duration: 2, app: 'ssl' } },
            { id: 'l6', timestamp: makeTimestamp(7), source_type: 'Firewall', severity: 'Low', rule_description: 'Outbound HTTPS — allowed', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { action: 'ALLOW', src_ip: '10.0.4.88', dst_ip: '93.115.27.56', dst_port: 443, protocol: 'TCP', bytes_sent: 408, bytes_received: 1202, duration: 2, app: 'ssl' } },
            { id: 'l7', timestamp: makeTimestamp(2), source_type: 'Firewall', severity: 'Low', rule_description: 'Outbound HTTPS — allowed', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { action: 'ALLOW', src_ip: '10.0.4.88', dst_ip: '93.115.27.56', dst_port: 443, protocol: 'TCP', bytes_sent: 419, bytes_received: 1208, duration: 2, app: 'ssl' } },
            { id: 'l8', timestamp: makeTimestamp(60), source_type: 'EDR', severity: 'High', rule_description: 'Suspicious process making periodic HTTPS connections — Cobalt Strike beacon pattern', hostname: 'SALES-WS-08', username: 'p.novak', ip_address: '10.0.4.88', raw_log_data: { process_name: 'svchost.exe', process_path: 'C:\\Users\\p.novak\\AppData\\Local\\Temp\\svchost.exe', command_line: 'svchost.exe', parent_process_name: 'explorer.exe', hash_sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01' } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 7. BEC HEIST — Azure AD Token Theft (Intermediate)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-007',
        title: 'BEC Heist',
        description:
            'The CFO\'s email was compromised without a password change. The attacker used an adversary-in-the-middle proxy to steal session tokens after MFA approval. Trace the Azure AD logs and find the flag.',
        difficulty: 'Intermediate',
        category: 'Cloud',
        points: 250,
        flag: 'SOC{AITM_SESSION_TOKEN_STEAL_MFA_BYPASS_T1528}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1528', 'T1566.002', 'T1078.004'],
        tags: ['Azure AD', 'BEC', 'MFA Bypass', 'Token Theft'],
        learning_objectives: [
            'Identify adversary-in-the-middle (AiTM) attacks through impossible travel analysis',
            'Recognise that MFA \'success\' does not guarantee account security when tokens are stolen',
            'Detect session token reuse from a different IP/location post-authentication',
        ],
        hints: [
            { order: 0, text: 'Compare the IP address that authenticated (MFA completed) versus the IP that then sent emails. Are they the same?', point_cost: 25 },
            { order: 1, text: 'An AiTM proxy intercepts the session after MFA completes. Look for a new email-sending session from a different geographic location immediately after authentication.', point_cost: 40 },
            { order: 2, text: 'The flag describes the technique name (AiTM), what was stolen (session token), what was bypassed (MFA), and the MITRE technique for token theft.', point_cost: 50 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(240), source_type: 'Email Security / Mail Gateway', severity: 'High', rule_description: 'Spearphishing link — Evilginx2 AiTM proxy lure sent to CFO', hostname: 'N/A', username: 'cfo.ramirez', ip_address: '45.142.212.100', raw_log_data: { sender: 'noreply@microsoftonline-verify.com', recipient: 'cfo.ramirez@acmecorp.com', subject: 'Action Required: Verify Your Microsoft 365 Session', verdict: 'phishing', threat_name: 'Phishing.AiTM.EvilginxLure', action: 'deliver', url_count: 1, spf_result: 'pass', dkim_result: 'pass', dmarc_result: 'fail' } },
            { id: 'l2', timestamp: makeTimestamp(235), source_type: 'Azure AD / Entra ID', severity: 'Medium', rule_description: 'MFA challenge triggered — normal authentication flow', hostname: 'N/A', username: 'cfo.ramirez', ip_address: '77.88.100.14', raw_log_data: { operationName: 'Sign-in activity', resultType: '0', userPrincipalName: 'cfo.ramirez@acmecorp.com', callerIpAddress: '77.88.100.14', location: 'DE', mfaDetail: 'MFA completed', authenticationMethod: 'PhoneAppNotification', riskLevelAggregated: 'none' } },
            { id: 'l3', timestamp: makeTimestamp(234), source_type: 'Azure AD / Entra ID', severity: 'Critical', rule_description: 'Session token used from different IP immediately after MFA — AiTM indicator', hostname: 'N/A', username: 'cfo.ramirez', ip_address: '91.240.118.172', raw_log_data: { operationName: 'Sign-in activity', resultType: '0', userPrincipalName: 'cfo.ramirez@acmecorp.com', callerIpAddress: '91.240.118.172', location: 'RU', mfaDetail: 'MFA not required - token valid', sessionId: 'sess-token-reuse-aitm-indicator', riskLevelAggregated: 'high', riskDetail: 'impossibleTravel' } },
            { id: 'l4', timestamp: makeTimestamp(232), source_type: 'Office365 / Microsoft 365 Audit', severity: 'Critical', rule_description: 'BEC wire transfer email sent from compromised CFO mailbox', hostname: 'N/A', username: 'cfo.ramirez', ip_address: '91.240.118.172', raw_log_data: { RecordType: 'ExchangeItem', Operation: 'SendAs', UserId: 'cfo.ramirez@acmecorp.com', ClientIP: '91.240.118.172', Subject: 'Urgent: Process Wire Transfer $847,000', RecipientAddress: 'finance.team@acmecorp.com' } },
            { id: 'l5', timestamp: makeTimestamp(230), source_type: 'Office365 / Microsoft 365 Audit', severity: 'Critical', rule_description: 'Forwarding rule created to monitor reply from finance team', hostname: 'N/A', username: 'cfo.ramirez', ip_address: '91.240.118.172', raw_log_data: { RecordType: 'ExchangeAdmin', Operation: 'New-InboxRule', UserId: 'cfo.ramirez@acmecorp.com', ClientIP: '91.240.118.172', ForwardTo: 'monitor@attackermail.ru', DeleteMessage: false } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 8. SUPPLY CHAIN SMOKE — ISO Delivery (Expert)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-008',
        title: 'Supply Chain Smoke',
        description:
            'A trusted software vendor\'s newsletter contained a malicious ISO attachment. The file evaded Mark-of-the-Web controls. Reconstruct the full kill chain across email, EDR, and DNS logs.',
        difficulty: 'Expert',
        category: 'Supply Chain',
        points: 1000,
        flag: 'SOC{ISO_MOTW_BYPASS_SUPPLY_CHAIN_T1553005_DARKGATE}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1553.005', 'T1566.001', 'T1071.004', 'T1204.002'],
        tags: ['Supply Chain', 'ISO', 'Mark-of-the-Web', 'DarkGate'],
        learning_objectives: [
            'Understand how ISO files bypass Mark-of-the-Web (MOTW) browser security controls',
            'Identify the DarkGate malware family based on C2 and behaviour patterns',
            'Reconstruct a supply chain attack from email delivery to C2 establishment',
        ],
        hints: [
            { order: 0, text: 'ISO files mounted as drives do not inherit the Zone.Identifier alternate data stream — this bypasses MOTW protections that block untrusted downloads.', point_cost: 75 },
            { order: 1, text: 'DarkGate is a modern malware loader known for using legitimate software (AutoIt scripts) as a carrier. Look for AutoIt in the process chain.', point_cost: 100 },
            { order: 2, text: 'The flag components: the delivery mechanism (ISO), what was bypassed (MOTW), the attack type (supply chain), the MITRE technique, and the malware family (DarkGate).', point_cost: 150 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(420), source_type: 'Email Security / Mail Gateway', severity: 'Medium', rule_description: 'Email from known vendor domain — ISO attachment sandboxed', hostname: 'N/A', username: 'it.admin', ip_address: '34.102.136.180', raw_log_data: { sender: 'newsletter@trusted-vendor-updates.com', recipient: 'it.admin@acmecorp.com', subject: 'Q4 Software Package — Download Required', attachment_name: 'AcmeCorp_Installer_Q4_2024.iso', attachment_size: 3847291, attachment_hash: 'f1e2d3c4b5a6978869504132109abcdef1e2d3c4b5a6978869504132109abcdef', verdict: 'clean', action: 'deliver', sandbox_detonated: false } },
            { id: 'l2', timestamp: makeTimestamp(415), source_type: 'EDR', severity: 'Medium', rule_description: 'ISO file mounted by user — no MOTW on contained files', hostname: 'IT-ADMIN-WS', username: 'it.admin', ip_address: '10.0.1.99', raw_log_data: { process_name: 'explorer.exe', command_line: 'explorer.exe E:\\', parent_process_name: 'explorer.exe', image_loaded: 'E:\\setup.lnk', hash_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef123456aa' } },
            { id: 'l3', timestamp: makeTimestamp(413), source_type: 'EDR', severity: 'High', rule_description: 'LNK file executing AutoIt script — DarkGate delivery pattern', hostname: 'IT-ADMIN-WS', username: 'it.admin', ip_address: '10.0.1.99', raw_log_data: { process_name: 'AutoIt3.exe', command_line: 'AutoIt3.exe E:\\lib\\install.au3', parent_process_name: 'explorer.exe', hash_sha256: 'b2c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef123456ab12', signature_status: 'signed', signer: 'AutoIt Consulting Ltd' } },
            { id: 'l4', timestamp: makeTimestamp(411), source_type: 'EDR', severity: 'Critical', rule_description: 'DarkGate loader dropped and executed', hostname: 'IT-ADMIN-WS', username: 'it.admin', ip_address: '10.0.1.99', raw_log_data: { process_name: 'SystemUpd.exe', command_line: 'SystemUpd.exe', parent_process_name: 'AutoIt3.exe', process_path: 'C:\\Users\\it.admin\\AppData\\Roaming\\Microsoft\\SystemUpd.exe', hash_sha256: 'c3d4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef123456ab1234', malware_family: 'DarkGate', signature_status: 'unsigned' } },
            { id: 'l5', timestamp: makeTimestamp(408), source_type: 'DNS', severity: 'High', rule_description: 'C2 beacon — DarkGate infrastructure', hostname: 'IT-ADMIN-WS', username: 'it.admin', ip_address: '10.0.1.99', raw_log_data: { query_name: 'cdn-relay-api.darkgate-infra.net', query_type: 'A', response_code: 'NOERROR', response_ip: '37.120.233.226', ttl: 60, query_length: 34, threat_category: 'C2 Communication', ioc_detected: true, anomaly_score: 94 } },
            { id: 'l6', timestamp: makeTimestamp(405), source_type: 'Firewall', severity: 'High', rule_description: 'Encrypted outbound to DarkGate C2', hostname: 'IT-ADMIN-WS', username: 'it.admin', ip_address: '10.0.1.99', raw_log_data: { action: 'ALLOW', src_ip: '10.0.1.99', dst_ip: '37.120.233.226', dst_port: 443, protocol: 'TCP', bytes_sent: 18400, bytes_received: 32100 } },
            { id: 'l7', timestamp: makeTimestamp(400), source_type: 'Active Directory', severity: 'Critical', rule_description: 'IT admin credentials used for lateral movement to DC', hostname: 'DC-CORP-01', username: 'it.admin', ip_address: '10.0.1.99', raw_log_data: { EventID: 4624, SubjectUserName: 'it.admin', LogonType: 3, IpAddress: '10.0.1.99', TargetUserName: 'it.admin', AuthenticationPackageName: 'Kerberos' } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 9. KERBEROAST SEASON — SPN Scanning (Intermediate)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-009',
        title: 'Kerberoast Season',
        description:
            'The SOC received an alert for an unusual volume of Kerberos TGS requests. Multiple service account SPNs were enumerated and ticket hashes extracted. Find the targeted service account and retrieve the flag.',
        difficulty: 'Intermediate',
        category: 'Active Directory',
        points: 250,
        flag: 'SOC{KERBEROAST_SPN_MSSQL_SVC_HASH_EXTRACT_T1558003}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1558.003', 'T1087.002', 'T1069.002'],
        tags: ['Kerberos', 'Active Directory', 'Credential Access', 'Kerberoasting'],
        learning_objectives: [
            'Identify Kerberoasting via Event ID 4769 with RC4 encryption type',
            'Understand why service accounts with weak passwords and SPNs are vulnerable',
            'Detect the SPN enumeration phase that precedes Kerberoasting',
        ],
        hints: [
            { order: 0, text: 'Event ID 4769 (Kerberos Service Ticket Requested) with EncryptionType 0x17 (RC4) instead of 0x12 (AES256) indicates Kerberoasting.', point_cost: 25 },
            { order: 1, text: 'Look at which service accounts had tickets requested — the service account with an SPN for MSSQL is a prime target.', point_cost: 35 },
            { order: 2, text: 'The flag encodes the attack name, the SPN service (MSSQL), the account type, and the MITRE technique.', point_cost: 45 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(90), source_type: 'Active Directory', severity: 'Medium', rule_description: 'LDAP query for all SPNs — SPN enumeration', hostname: 'DC-CORP-01', username: 'intern.chen', ip_address: '10.0.5.44', raw_log_data: { EventID: 4662, ObjectType: 'organizationalUnit', OperationType: 'Object Access', AccessMask: '0x100', Properties: 'servicePrincipalName', SubjectUserName: 'intern.chen' } },
            { id: 'l2', timestamp: makeTimestamp(88), source_type: 'Active Directory', severity: 'High', rule_description: 'Kerberos TGS request — RC4 encryption (Kerberoasting indicator)', hostname: 'DC-CORP-01', username: 'intern.chen', ip_address: '10.0.5.44', raw_log_data: { EventID: 4769, TargetUserName: 'svc-http@CORP.LOCAL', ServiceName: 'HTTP/webserver01.corp.local', TicketEncryptionType: '0x17', IpAddress: '10.0.5.44', FailureCode: '0x0' } },
            { id: 'l3', timestamp: makeTimestamp(87), source_type: 'Active Directory', severity: 'High', rule_description: 'Kerberos TGS — RC4 — SVC account 2', hostname: 'DC-CORP-01', username: 'intern.chen', ip_address: '10.0.5.44', raw_log_data: { EventID: 4769, TargetUserName: 'svc-backup@CORP.LOCAL', ServiceName: 'MSSQLSvc/sqlserver01.corp.local:1433', TicketEncryptionType: '0x17', IpAddress: '10.0.5.44', FailureCode: '0x0' } },
            { id: 'l4', timestamp: makeTimestamp(86), source_type: 'Active Directory', severity: 'Critical', rule_description: 'Kerberos TGS — RC4 — MSSQL service account — high-value target', hostname: 'DC-CORP-01', username: 'intern.chen', ip_address: '10.0.5.44', raw_log_data: { EventID: 4769, TargetUserName: 'svc-mssql@CORP.LOCAL', ServiceName: 'MSSQLSvc/corpdb01.corp.local:1433', TicketEncryptionType: '0x17', IpAddress: '10.0.5.44', FailureCode: '0x0', spn_target: 'MSSQLSvc' } },
            { id: 'l5', timestamp: makeTimestamp(84), source_type: 'Active Directory', severity: 'High', rule_description: 'Kerberos TGS — RC4 — SVC account 4', hostname: 'DC-CORP-01', username: 'intern.chen', ip_address: '10.0.5.44', raw_log_data: { EventID: 4769, TargetUserName: 'svc-sharepoint@CORP.LOCAL', ServiceName: 'HTTP/sharepoint.corp.local', TicketEncryptionType: '0x17', IpAddress: '10.0.5.44', FailureCode: '0x0' } },
            { id: 'l6', timestamp: makeTimestamp(80), source_type: 'EDR', severity: 'Critical', rule_description: 'Rubeus.exe executed — Kerberoasting tool', hostname: 'INT-LAPTOP-07', username: 'intern.chen', ip_address: '10.0.5.44', raw_log_data: { process_name: 'rubeus.exe', command_line: 'rubeus.exe kerberoast /rc4opsec /nowrap /outfile:hashes.txt', parent_process_name: 'cmd.exe', hash_sha256: 'd4e5f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678901ab2' } },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // 10. THE LIVING GHOST — Fileless PowerShell (Advanced)
    // ─────────────────────────────────────────────────────────────
    {
        id: 'ctf-010',
        title: 'The Living Ghost',
        description:
            'An endpoint shows signs of C2 activity but there is no malicious binary on disk. The attacker used WMI and PowerShell to execute entirely in memory. Investigate and find the flag embedded in the obfuscated command.',
        difficulty: 'Advanced',
        category: 'EDR',
        points: 500,
        flag: 'SOC{FILELESS_WMI_POWERSHELL_MEMORY_T1047_T1059001}',
        flag_format: 'SOC{...}',
        mitre_techniques: ['T1047', 'T1059.001', 'T1027', 'T1140'],
        tags: ['EDR', 'Fileless', 'PowerShell', 'WMI', 'Defense Evasion'],
        learning_objectives: [
            'Identify fileless malware execution patterns via WMI and PowerShell',
            'Understand how attackers avoid writing to disk to evade traditional AV',
            'Decode Base64-obfuscated PowerShell commands for analysis',
        ],
        hints: [
            { order: 0, text: 'The attack is fileless — no binary on disk. Look for PowerShell being invoked via WMI (Event ID 4688 with parent wmiprvse.exe).', point_cost: 40 },
            { order: 1, text: 'Try base64-decoding the -enc parameter in the PowerShell command line. The decoded payload will reveal the flag.', point_cost: 60 },
            { order: 2, text: 'The flag combines the techniques used: FILELESS, WMI, POWERSHELL, MEMORY execution, and both MITRE techniques (T1047 + T1059.001).', point_cost: 80 },
        ],
        solve_count: 0,
        logs: [
            { id: 'l1', timestamp: makeTimestamp(150), source_type: 'Email Security / Mail Gateway', severity: 'High', rule_description: 'Macro-enabled Word document delivered', hostname: 'N/A', username: 'k.brown', ip_address: '45.142.212.100', raw_log_data: { sender: 'hr-team@external-hr.net', recipient: 'k.brown@acmecorp.com', subject: 'Performance Review — Please Complete', attachment_name: 'Review_Form_2024.docm', verdict: 'malicious', threat_name: 'Trojan.Macro.WMILauncher', action: 'deliver', sandbox_detonated: true } },
            { id: 'l2', timestamp: makeTimestamp(145), source_type: 'EDR', severity: 'High', rule_description: 'Word document opened — user enabled macros', hostname: 'EXEC-WS-03', username: 'k.brown', ip_address: '10.0.6.55', raw_log_data: { process_name: 'winword.exe', command_line: 'WINWORD.EXE /n "C:\\Users\\k.brown\\Downloads\\Review_Form_2024.docm"', parent_process_name: 'explorer.exe', hash_sha256: 'e5f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678901ab2c3' } },
            { id: 'l3', timestamp: makeTimestamp(143), source_type: 'EDR', severity: 'Critical', rule_description: 'WMI spawning PowerShell — fileless execution pattern', hostname: 'EXEC-WS-03', username: 'k.brown', ip_address: '10.0.6.55', raw_log_data: { process_name: 'powershell.exe', command_line: 'powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -enc U09De0ZJTEVMRVNTX1dNSV9QT1dFUlNIRUxMX01FTU9SWV9UMTAzNF9UMjA1OTAwMX0=', parent_process_name: 'WmiPrvSE.exe', hash_sha256: 'f60718293a4b5c6d7e8f9012345678901234567890abcdef12345678901ab2c3d4' } },
            { id: 'l4', timestamp: makeTimestamp(141), source_type: 'EDR', severity: 'Critical', rule_description: 'Reflective DLL injection into legitimate process (svchost) — no file on disk', hostname: 'EXEC-WS-03', username: 'k.brown', ip_address: '10.0.6.55', raw_log_data: { process_name: 'svchost.exe', event_type: 'CreateRemoteThread', target_process: 'svchost.exe', source_process: 'powershell.exe', allocated_memory: '0x001b0000', thread_start_address: '0x7ffe8a110000' } },
            { id: 'l5', timestamp: makeTimestamp(138), source_type: 'DNS', severity: 'High', rule_description: 'C2 beacon from svchost process — in-memory C2', hostname: 'EXEC-WS-03', username: 'k.brown', ip_address: '10.0.6.55', raw_log_data: { query_name: 'svc-backend-api.com', query_type: 'A', response_code: 'NOERROR', response_ip: '178.73.215.171', ttl: 120, query_length: 22, threat_category: 'C2 Communication', ioc_detected: true, anomaly_score: 88 } },
            { id: 'l6', timestamp: makeTimestamp(135), source_type: 'Firewall', severity: 'High', rule_description: 'Outbound C2 connection from svchost', hostname: 'EXEC-WS-03', username: 'k.brown', ip_address: '10.0.6.55', raw_log_data: { action: 'ALLOW', src_ip: '10.0.6.55', dst_ip: '178.73.215.171', dst_port: 443, protocol: 'TCP', bytes_sent: 22400, bytes_received: 48100 } },
            { id: 'l7', timestamp: makeTimestamp(130), source_type: 'Windows Security', severity: 'High', rule_description: 'WMI subscription created for persistence — fileless persistence', hostname: 'EXEC-WS-03', username: 'k.brown', ip_address: '10.0.6.55', raw_log_data: { EventID: 4688, NewProcessName: 'C:\\Windows\\System32\\wbem\\scrcons.exe', CommandLine: 'scrcons.exe -Embedding', ParentProcessName: 'C:\\Windows\\System32\\svchost.exe', SubjectUserName: 'k.brown', TokenElevationType: '%%1936' } },
        ],
    },
];
