
// --- Data Pools for Realistic Antivirus Log Randomization ---
const vendors = ["CrowdStrike", "SentinelOne", "Microsoft", "Trend Micro", "Sophos", "McAfee", "Palo Alto Networks"];
const products = {
    "CrowdStrike": "Falcon",
    "SentinelOne": "Singularity",
    "Microsoft": "Defender for Endpoint",
    "Trend Micro": "Apex One",
    "Sophos": "Intercept X",
    "McAfee": "Endpoint Security",
    "Palo Alto Networks": "Cortex XDR"
};
const threatTypes = ["Malware", "Ransomware", "Spyware", "Adware", "Trojan", "Worm", "PUP", "Exploit", "Phishing", "C2"];
const malwareFamilies = ["Emotet", "TrickBot", "Ryuk", "WannaCry", "Qakbot", "Cobalt Strike", "LockBit", "Conti"];
const fileExtensions = ["exe", "dll", "docm", "ps1", "vbs", "zip", "tmp", "bat", "js", "lnk"];
const remediationActions = ["quarantined", "cleaned", "blocked", "deleted", "allowed", "detected_only", "remediated"];
const scanTypes = ["full_scan", "quick_scan", "custom_scan", "on_access", "scheduled"];
const osNames = ["Windows 10", "Windows 11", "Windows Server 2019", "Windows Server 2022"];
const processNames = ["svchost.exe", "powershell.exe", "cmd.exe", "winword.exe", "rundll32.exe", "explorer.exe", "lsass.exe", "javaw.exe"];

// --- Helper Functions ---
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateHash = (len) => [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const generateRandomIP = () => `${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
const generateDomain = () => `malicious-domain-${Math.floor(Math.random() * 9999)}.com`;
const generateProcessId = () => Math.floor(Math.random() * 65535);
const generateGUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

const avLogTypes = {
    threat: { weight: 70 },
    scan: { weight: 20 },
    system: { weight: 5 },
    network: { weight: 5 }
};

// --- Category-Specific Log Generators ---

const _generateThreatDetectionLog = (options) => {
    const isMalicious = Math.random() < 0.9; // Most detections are malicious
    const threatType = getRandomElement(threatTypes);
    const malwareFamily = getRandomElement(malwareFamilies);
    const fileName = `${malwareFamily.toLowerCase()}_payload_${Math.floor(Math.random() * 999)}.${getRandomElement(fileExtensions)}`;
    const actionTaken = isMalicious ? getRandomElement(["quarantined", "blocked", "deleted"]) : "detected_only";

    return {
        event_type: "ThreatDetection",
        threat_id: generateHash(12),
        threat_name: isMalicious ? `${threatType}.${malwareFamily}.Gen` : "Suspicious.Behavior.Generic",
        threat_type: threatType,
        threat_category: isMalicious ? "Malware" : "Suspicious Activity",
        threat_severity: isMalicious ? getRandomElement(["critical", "high", "medium"]) : "low",
        malware_name: isMalicious ? malwareFamily : "N/A",
        malware_family: isMalicious ? malwareFamily : "N/A",
        malicious_confidence: isMalicious ? "High" : "Medium",
        cve_id: isMalicious && Math.random() < 0.3 ? `CVE-2023-${Math.floor(Math.random() * 9999) + 1000}` : "N/A",
        detection_source: "Real-time Protection",
        status: "detected",
        action_taken: actionTaken,
        remediation_status: "successful",
        is_remediated: true,

        // File Details
        file_name: fileName,
        file_path: `C:\\Users\\${options.userName}\\AppData\\Local\\Temp\\${fileName}`,
        file_size: Math.floor(Math.random() * 2000000) + 50000,
        file_hash_md5: generateHash(32),
        file_hash_sha1: generateHash(40),
        file_hash_sha256: generateHash(64),

        // Process Details
        process_name: "powershell.exe",
        process_id: generateProcessId(),
        process_command_line: `powershell.exe -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "C:\\Users\\${options.userName}\\Downloads\\run.ps1"`,
        parent_process_name: "explorer.exe",
        parent_process_id: generateProcessId(),

        // Flags
        is_suspicious: !isMalicious,
        is_malicious: isMalicious,
        is_false_positive: false,
    };
};

const _generateScanLog = (options) => {
    const itemsDetected = Math.random() < 0.1 ? Math.floor(Math.random() * 5) + 1 : 0;
    return {
        event_type: "ScanActivity",
        scan_id: generateHash(16),
        scan_type: getRandomElement(scanTypes),
        scan_start_time: new Date(options.eventTime - 3600 * 1000).toISOString(),
        scan_end_time: options.eventTime.toISOString(),
        scan_duration: 3600,
        items_scanned: Math.floor(Math.random() * 500000) + 100000,
        items_detected: itemsDetected,
        scan_result: itemsDetected > 0 ? "ThreatsFound" : "Clean",
        scan_trigger: getRandomElement(["user", "system", "schedule"]),
    };
};

const _generateSystemLog = (options) => {
    const isUpdate = Math.random() > 0.5;
    return {
        event_type: "SystemEvent",
        event_subtype: isUpdate ? "Update" : "ConfigurationChange",
        update_status: isUpdate ? "successful" : "N/A",
        engine_update_time: isUpdate ? options.eventTime.toISOString() : "N/A",
        definition_version: `1.3${Math.floor(Math.random() * 99)}.${Math.floor(Math.random() * 999)}.0`,
    };
};

const _generateNetworkLog = (options) => {
    return {
        event_type: "NetworkProtection",
        threat_name: "C2.Generic.TCP",
        threat_category: "Command-and-Control",
        threat_severity: "high",
        action_taken: "blocked",
        url: generateDomain(),
        ip_address: generateRandomIP(),
        domain_name: generateDomain(),
        port: getRandomElement([80, 443, 8080, 53]),
        protocol: "TCP",
        network_direction: "outbound",
        geoip_country: getRandomElement(["Russia", "China", "North Korea"]),
        command_and_control: true,
        is_malicious: true,
    };
};

// --- Main Exported Function ---

export const generateAntivirusLog = (options = {}) => {
    const logTypeKey = options.logType || Object.keys(avLogTypes).find(key => {
        const type = avLogTypes[key];
        const rand = Math.random() * 100;
        return rand < type.weight;
    }) || 'threat';

    const eventTime = new Date(Date.now() - Math.floor(Math.random() * 1000 * 3600 * 48));
    const vendor = getRandomElement(vendors);
    const userName = getRandomElement(["j.doe", "a.smith", "m.jones", "SYSTEM"]);
    const deviceName = `${getRandomElement(["DESKTOP", "LAPTOP", "SERVER"])}-${generateHash(6).toUpperCase()}`;

    let specificData = {};
    const sharedOptions = { eventTime, userName, deviceName };

    switch (logTypeKey) {
        case 'scan':
            specificData = _generateScanLog(sharedOptions);
            break;
        case 'system':
            specificData = _generateSystemLog(sharedOptions);
            break;
        case 'network':
            specificData = _generateNetworkLog(sharedOptions);
            break;
        case 'threat':
        default:
            specificData = _generateThreatDetectionLog(sharedOptions);
            break;
    }

    const baseLog = {
        // General Meta
        event_time: eventTime.toISOString(),
        event_id: generateHash(32),
        vendor: vendor,
        product_name: products[vendor],
        product_version: `${Math.floor(Math.random() * 5) + 2}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
        log_source: "Endpoint",
        log_level: specificData.threat_severity || "info",
        scan_engine_version: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
        signature_version: `1.3${Math.floor(Math.random() * 90) + 10}.${Math.floor(Math.random() * 2000)}.0`,
        sensor_id: generateGUID(),

        // Device & User
        device_name: deviceName,
        hostname: deviceName,
        domain: "CORP",
        os_name: getRandomElement(osNames),
        os_version: "10.0.19044",
        user_name: userName,
        user_sid: `S-1-5-21-${generateHash(8)}-${generateHash(8)}-${generateHash(8)}-${Math.floor(Math.random() * 9999) + 1001}`,
        logged_on_user: `${userName}@corp.local`,
    };

    return { ...baseLog, ...specificData };
};
