
/**
 * Provides a centralized list of specific security use cases categorized by data source.
 * This is used to dynamically generate more specific and realistic AI-driven scenarios.
 */
export const useCasesBySource = {
    'Active Directory': [
        'User Logon / Logoff',
        'Failed Logon',
        'Account Lockout',
        'Password Change / Reset',
        'New User Creation / Deletion',
        'User Permission Changes',
        'Group Membership Changes',
        'Kerberos Ticket Usage (TGT, TGS)',
        'Group Policy Changes',
        'Delegation / Impersonation'
    ],
    'EDR': [
        'Process Creation',
        'Malicious PowerShell Execution',
        'Suspicious CMD or Scripting Commands',
        'DLL Injection into another process',
        'Persistence Mechanism via Registry or Scheduled Task',
        'File Downloaded or Executed',
        'Suspicious File Hash Detected',
        'Suspicious Outbound C2 Beaconing',
        'Local Exploit Execution'
    ],
    'Firewall': [
        'Allowed / Blocked Traffic Spike',
        'Port Scanning Detected',
        'Unauthorized Inbound Connection Attempt',
        'Outbound Connection to Known Malicious IP',
        'Anomalous Protocol Usage',
        'Unusual Bandwidth Consumption',
        'Connection from Unexpected Geographic Location'
    ],
    'Office 365': [
        'Multiple Failed Login Attempts',
        'Successful Multi-Factor Authentication',
        'Suspicious Email Forwarding Rule Created',
        'Mass Mailing / Spam Detected from internal account',
        'Anomalous SharePoint / OneDrive Access',
        'Anomalous File Sharing Activity',
        'Suspicious Teams Activity or Call',
        'Suspicious OAuth Application Consent'
    ],
    'NAC': [
        'New Device Connected to Network',
        'Unauthorized Device Detected',
        'Device Failed Compliance Check',
        'Unauthorized Device Blocked',
        'Device Status Changed (Authorized / Unauthorized)',
        'Multiple Devices Connected from a Single User'
    ],
    'Azure / AWS': [
        'New Resource Creation (VM, Storage Bucket)',
        'IAM Policy Change (User, Role, Permission)',
        'Failed Cloud Account Login',
        'Suspicious API Key Usage',
        'Resource Deletion and Recreation',
        'Anomalous Data Egress (Exfiltration)',
        'Activity from an Unexpected Cloud Region',
        'Cloud Security Group / Firewall Rule Change'
    ],
    'Mail Relay': [
        'Outbound Email Sent',
        'Inbound Email Received',
        'Email Flagged as Spam',
        'Suspicious File Attachment Detected',
        'Email from a Blacklisted Domain',
        'Phishing Campaign Detected'
    ],
    'DNS': [
        'Suspicious DNS Query Detected',
        'Multiple Lookups for Unknown Domains',
        'DGA (Domain Generation Algorithm) Pattern Detected',
        'DNS Tunneling for Data Exfiltration',
        'Request to a Blacklisted Domain',
        'Queries to Fast Flux Domains'
    ],
    'IPS / IDS': [
        'Exploit Attempt Detected',
        'Known Attack Signature Matched',
        'Brute Force Attack Detected',
        'SQL Injection or XSS Attack Detected',
        'Attack on a Common Protocol (SMB, FTP)',
        'Privilege Escalation Attempt',
        'DoS / DDoS Attack Detected'
    ],
    'Anti-Virus': [
        'Malware Detected on Endpoint',
        'File Quarantined',
        'Malicious File Executed',
        'AV Signature Update',
        'Ransomware Behavior Detected',
        'File with Known Malicious Hash Executed'
    ]
};

export const dataSourceDefinitions = {
    EDR: {
        description: "Monitors and protects endpoints (PCs, laptops, servers) in real-time.",
        detects: [
            "Suspicious process execution (PowerShell/CMD).",
            "Malicious file download, execution, or modification.",
            "Anomalous user activity and unauthorized access attempts.",
            "Anomalous system changes, potential malware or ransomware behavior.",
            "IOC matches via threat intelligence integration."
        ],
        common_event_types: ['Process Create', 'File Create', 'Network Connection', 'Registry Modify', 'DNS Query'],
    },
    FW: {
        description: "Controls and protects network traffic between endpoints, servers, and the cloud.",
        detects: [
            "Anomalous TCP/UDP connection attempts.",
            "Unauthorized inbound or outbound traffic to sensitive ports.",
            "Potential data exfiltration over non-standard protocols.",
            "Connection attempts to known malicious domains or IPs.",
            "Traffic deviations from established firewall rules."
        ],
        common_event_types: ['Connection Allowed', 'Connection Blocked', 'Traffic Anomaly Detected'],
    },
    AV: {
        description: "Detects and prevents malicious software in files and systems.",
        detects: [
            "Malicious file detected based on signature or heuristics.",
            "Activity characteristic of malware/spyware/ransomware.",
            "Attempted installation or execution of unauthorized software.",
            "Suspicious behavior patterns indicating a potential threat.",
            "File quarantined after failing security scan."
        ],
        common_event_types: ['Malware Detected', 'File Quarantined', 'Suspicious Behavior Blocked'],
    },
    AD: {
        description: "Manages identities and permissions in on-premise systems.",
        detects: [
            "Anomalous or repeated failed user logon attempts.",
            "Unauthorized change in user permissions or group membership.",
            "Creation of new privileged accounts outside of policy.",
            "Anomalous activity by security groups (e.g., Domain Admins).",
            "Suspected privilege escalation or lateral movement attempts."
        ],
        common_event_types: ['User Logon Success', 'User Logon Failure', 'Group Membership Change', 'Account Created'],
    },
    DC: {
        description: "Manages authentication and authorization for an Active Directory network.",
        detects: [
            "Suspicious or failed authentication attempts (Kerberos/NTLM).",
            "Anomalous password change or reset requests.",
            "Suspicious session creation or termination.",
            "Unauthorized modification of Group Policy Objects (GPO).",
            "Suspected Pass-the-Hash or Kerberos ticket abuse (Golden/Silver Ticket)."
        ],
        common_event_types: ['Authentication Success', 'Authentication Failure', 'Kerberos TGT Request', 'Password Change'],
    },
    NAC: {
        description: "Manages and controls access to the corporate network.",
        detects: [
            "Unauthorized device attempting to connect to the network.",
            "Access attempts without proper authentication.",
            "Connection attempt from a non-compliant or infected device.",
            "Anomalies in MAC addresses, IP assignments, or open ports.",
            "Violation of role-based access policies."
        ],
        common_event_types: ['Device Allowed', 'Device Blocked', 'Compliance Check Failed'],
    },
    'MAIL RELAY': {
        description: "Monitors, filters, and protects email traffic.",
        detects: [
            "Inbound email identified as phishing or malware.",
            "Email attachment with a suspicious file type or signature.",
            "Connection from a malicious domain or IP address.",
            "Email spoofing attempts or DKIM/DMARC failures.",
            "Potential data exfiltration via outbound email."
        ],
        common_event_types: ['Email Received', 'Email Blocked', 'Phishing Detected'],
    },
    AWS: {
        description: "Monitors events and API calls within the AWS cloud environment.",
        detects: [
            "Anomalous or unusual API calls.",
            "Administrative actions by IAM users from unrecognized locations.",
            "Access attempts from unfamiliar or suspicious IP addresses.",
            "Unauthorized download or modification of data in S3.",
            "Creation of suspicious resources or unauthorized permission changes."
        ],
        common_event_types: ['ConsoleLogin', 'GetObject', 'RunInstances', 'AttachUserPolicy'],
    },
    Azure: {
        description: "Monitors events and resources within the Microsoft Azure cloud environment.",
        detects: [
            "Anomalous or failed sign-in attempts to Azure AD.",
            "Suspicious operations on resources (VMs, Storage, SQL, NSGs).",
            "Unauthorized changes to role assignments or permissions.",
            "Suspected attacks or port scans on cloud servers.",
            "Unauthorized data download or copy operations."
        ],
        common_event_types: ['Sign-in activity', 'Update VM', 'Create role assignment', 'Get blob'],
    },
    OFFICE365: {
        description: "Monitors email traffic, files, and sharing within the Microsoft 365 cloud.",
        detects: [
            "Anomalous user sign-ins from suspicious locations or IPs.",
            "Suspicious activity in Outlook, Teams, SharePoint, or OneDrive.",
            "Anomalous download or sharing of sensitive files.",
            "Phishing emails with malicious links or macro-enabled attachments.",
            "Creation of unusual forwarding rules or permission changes."
        ],
        common_event_types: ['MailboxLogin', 'FileDownloaded', 'EmailReceived', 'ForwardingRuleSet'],
    },
    'WINDOWS SECURITY': {
        description: "Monitors system-level operations on Windows machines via Event Logs.",
        detects: [
            "User logon/logoff events (success and failure).",
            "Changes to security policies or user permissions.",
            "Installation of new software or services.",
            "Suspected privilege escalation attempts (e.g., Event ID 4672).",
            "Suspicious file or registry modifications."
        ],
        common_event_types: ['Logon Success', 'Logon Failure', 'Process Create', 'Registry Modify'],
    },
};

import {
    generateEDRLog,
    generateFirewallLog,
    generateOffice365Log,
    generateAntivirusLog,
    generateDLPLog,
    generateNIDSLog,
    generateNACLog,
    generateDNSLog,
    generateADLog
} from './useCaseLogGenerator';


export const DATA_SOURCE_MAP = {
    'EDR': generateEDRLog,
    'Firewall': generateFirewallLog,
    'Office 365': generateOffice365Log,
    'Antivirus': generateAntivirusLog,
    'DLP': generateDLPLog,
    'NIDS': generateNIDSLog,
    'NAC': generateNACLog,
    'DNS': generateDNSLog,
    'Active Directory': generateADLog
};


// ✅ תבניות סיפור חדשות לתרחישים מורכבים ורלוונטיים
export const INVESTIGATION_TEMPLATES = {
    insider_data_exfil: {
        name: "Insider Threat - Data Exfiltration via USB",
        description: "An employee with access to sensitive data attempts to exfiltrate it using a personal USB drive.",
        final_verdict: {
            verdict: "TP",
            confidence: "High",
            reasoning: "Sequence of events shows privileged account creation, access to sensitive shares, and DLP block on USB transfer."
        },
        story_flow: [
            { source: 'Active Directory', type: 'privileged_account_created', type_group: 'reconnaissance', count: 1 },
            { source: 'Firewall', type: 'internal_file_share_access', type_group: 'execution', count: 2 },
            { source: 'DLP', type: 'sensitive_data_to_usb_blocked', type_group: 'exfiltration', count: 1, is_key_event: true },
            { source: 'EDR', type: 'suspicious_process_on_dc', type_group: 'defense_evasion', count: 1 },
            { source: 'Office 365', type: 'benign_email_activity', type_group: 'noise', count: 3 },
            { source: 'DNS', type: 'benign_internal_query', type_group: 'noise', count: 2 },
        ]
    },
    phishing_and_malware: {
        name: "Phishing Attack Leading to Malware Execution",
        description: "A user falls for a phishing email, clicks a malicious link, and a malicious executable runs, attempting to establish C2 communication.",
        final_verdict: {
            verdict: "TP",
            confidence: "High",
            reasoning: "Clear chain of events: phishing email -> DNS query to malicious domain -> EDR detects malicious hash execution."
        },
        story_flow: [
            { source: 'Office 365', type: 'phishing_email_detected', type_group: 'initial_access', count: 1 },
            { source: 'DNS', type: 'malicious_domain_query', type_group: 'execution', count: 1, is_key_event: true },
            { source: 'EDR', type: 'malware_execution_detected', type_group: 'execution', count: 1, is_key_event: true },
            { source: 'Firewall', type: 'c2_communication_blocked', type_group: 'command_and_control', count: 2 },
            { source: 'Active Directory', type: 'benign_user_login', type_group: 'noise', count: 3 },
            { source: 'Antivirus', type: 'routine_scan_completed', type_group: 'noise', count: 2 },
        ]
    },
    brute_force_lateral_movement: {
        name: "Brute Force Attack and Lateral Movement",
        description: "An external attacker successfully brute-forces an account, logs in, and attempts to move laterally within the network.",
        final_verdict: {
            verdict: "TP",
            confidence: "High",
            reasoning: "High number of failed logins followed by a successful login from an unusual location, then attempts to access other systems."
        },
        story_flow: [
            { source: 'Firewall', type: 'multiple_failed_logins_external', type_group: 'initial_access', count: 2, is_key_event: true },
            { source: 'Active Directory', type: 'successful_login_after_failures', type_group: 'initial_access', count: 1, is_key_event: true },
            { source: 'EDR', type: 'powershell_command_recon', type_group: 'discovery', count: 1 },
            { source: 'NIDS', type: 'smb_traffic_to_multiple_hosts', type_group: 'lateral_movement', count: 2 },
            { source: 'DNS', type: 'benign_external_query', type_group: 'noise', count: 3 },
            { source: 'Office 365', type: 'benign_email_activity', type_group: 'noise', count: 1 },
        ]
    }
};
