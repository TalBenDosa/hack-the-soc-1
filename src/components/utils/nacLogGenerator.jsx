/**
 * NAC (Network Access Control) Log Generator
 * Generates realistic network access control logs for SOC training scenarios
 */

const vendors = ['Cisco ISE', 'Aruba ClearPass', 'Forescout CounterACT', 'PacketFence', 'Bradford Campus Manager'];
const authMethods = ['802.1X', 'MAC Auth Bypass', 'Web Auth', 'Guest Portal', 'Certificate'];
const deviceTypes = ['Windows Laptop', 'Mobile Device', 'IoT Device', 'Printer', 'Security Camera', 'Access Point'];
const complianceStatus = ['Compliant', 'Non-Compliant', 'Unknown', 'Checking'];
const networkLocations = ['Building A Floor 2', 'Lobby WiFi', 'Conference Room', 'IT Department', 'Guest Network'];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateMacAddress = () => {
    return Array.from({length: 6}, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join(':').toUpperCase();
};

export const generateNacLog = (options = {}) => {
    const ioc = options.ioc || {};
    const eventTime = options.timestamp || new Date().toISOString();
    const details = options.details || "Network access control event";
    
    // Determine if this should be a suspicious or normal event
    const isSuspicious = options.severity === 'High' || options.severity === 'Critical' || 
                        (options.event_type && (
                            options.event_type.toLowerCase().includes('unauthorized') ||
                            options.event_type.toLowerCase().includes('violation') ||
                            options.event_type.toLowerCase().includes('denied')
                        ));

    const deviceType = getRandomElement(deviceTypes);
    const authMethod = getRandomElement(authMethods);
    const vendor = getRandomElement(vendors);
    const macAddress = generateMacAddress();
    const vlanId = isSuspicious ? 666 : Math.floor(Math.random() * 200) + 10; // Quarantine VLAN or normal VLAN
    
    const log = {
        "@timestamp": eventTime,
        "event_time": eventTime,
        "event_id": `nac-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        "session_id": `sess_${Date.now().toString(36)}`,
        "nac_server": vendor,
        "vendor": vendor.split(' ')[0], // e.g., "Cisco" from "Cisco ISE"
        
        // Authentication details
        "authentication_method": authMethod,
        "authentication_status": isSuspicious ? "Failed" : "Success",
        "authentication_source": authMethod === 'Certificate' ? 'PKI' : 'Active Directory',
        "authentication_attempts": isSuspicious ? Math.floor(Math.random() * 3) + 2 : 1,
        
        // User information
        "username": ioc.user || ioc.username || (authMethod === 'MAC Auth Bypass' ? null : "sarah.johnson"),
        "user_domain": authMethod === 'MAC Auth Bypass' ? null : "COMPANY",
        "user_role": "Employee",
        
        // Device information  
        "device_mac_address": macAddress,
        "device_ip_address": isSuspicious ? null : (ioc.ip || "192.168.10.21"),
        "device_hostname": ioc.device || ioc.host || "FINANCE-PC-07",
        "device_type": deviceType,
        "device_vendor": deviceType.includes('Windows') ? 'Microsoft' : getRandomElement(['Apple', 'Samsung', 'Dell', 'HP']),
        "device_category": deviceType.includes('Mobile') ? 'BYOD' : 'Managed',
        "device_compliance_status": isSuspicious ? "Non-Compliant" : getRandomElement(complianceStatus),
        "device_trust_level": isSuspicious ? "Untrusted" : "Trusted",
        
        // Network information
        "network_device_name": `SW-${Math.floor(Math.random() * 50) + 1}`,
        "network_device_ip": `192.168.1.${Math.floor(Math.random() * 50) + 200}`,
        "switch_port": `GigabitEthernet1/0/${Math.floor(Math.random() * 48) + 1}`,
        "vlan_id": vlanId,
        "vlan_name": vlanId === 666 ? "QUARANTINE" : `VLAN_${vlanId}`,
        "network_segment": getRandomElement(networkLocations),
        "network_location": getRandomElement(networkLocations),
        
        // Authorization results
        "authorization_result": isSuspicious ? "Deny" : "Permit",
        "policy_name": isSuspicious ? "Security_Quarantine" : "Standard_Employee_Policy", 
        "policy_action": isSuspicious ? "Quarantine" : "Allow",
        "access_level": isSuspicious ? "Restricted Access" : "Full Access",
        "quarantine_reason": isSuspicious ? "Non-compliant device detected" : null,
        
        // Compliance information
        "compliance_check_result": isSuspicious ? "Fail" : "Pass",
        "antivirus_status": isSuspicious ? "Outdated" : "Up to Date",
        "firewall_status": isSuspicious ? "Disabled" : "Enabled",
        "patch_level": isSuspicious ? "Missing Patches" : "Up to Date",
        "risk_score": isSuspicious ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 30) + 10,
        
        // Processing information
        "processing_time_ms": Math.floor(Math.random() * 500) + 100,
        "log_source": "NAC",
        "correlation_id": `corr_${Date.now().toString(36)}`,
        
        // Normalized fields for consistent access
        "user_name": ioc.user || ioc.username || (authMethod === 'MAC Auth Bypass' ? 'unknown' : "sarah.johnson"),
        "device_name": ioc.device || ioc.host || "FINANCE-PC-07", 
        "source_ip": ioc.ip || "192.168.10.21",
        "action_type": options.event_type || (isSuspicious ? "AccessDenied" : "DeviceConnected"),
        "action_result": isSuspicious ? "Access Denied - Policy Violation" : "Access Granted",
        "was_blocked": isSuspicious,
        "message": `NAC ${isSuspicious ? 'denied' : 'granted'} network access for device ${macAddress}`,
        "analysis_notes": details,
        
        // Raw log simulation
        "raw_message": `${eventTime} ${vendor}: Device ${macAddress} authentication ${isSuspicious ? 'failed' : 'successful'} via ${authMethod}, assigned to VLAN ${vlanId}`,
        "severity": isSuspicious ? "High" : "Low",
        "tags": isSuspicious ? ["nac", "access_denied", "policy_violation"] : ["nac", "device_connected", "normal"]
    };

    return log;
};