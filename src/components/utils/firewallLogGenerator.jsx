/**
 * Firewall Log Generator
 * Generates realistic firewall logs for SOC training scenarios
 */

const actions = ['ACCEPT', 'DROP', 'REJECT', 'ALLOW', 'DENY', 'LOG'];
const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'FTP', 'SSH'];
const firewallVendors = ['Palo Alto', 'Cisco ASA', 'Fortinet', 'SonicWall', 'pfSense'];
const zones = ['DMZ', 'LAN', 'WAN', 'GUEST', 'SERVERS'];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateSessionId = () => Math.floor(Math.random() * 1000000);
const generatePacketId = () => Math.floor(Math.random() * 65535);

export const generateFirewallLog = (options = {}) => {
    const ioc = options.ioc || {};
    const eventTime = options.timestamp || new Date().toISOString();
    const details = options.details || "Network traffic event";
    
    // Determine if this should be a suspicious or normal event
    const isSuspicious = options.severity === 'High' || options.severity === 'Critical' || 
                        (options.event_type && (
                            options.event_type.toLowerCase().includes('malicious') ||
                            options.event_type.toLowerCase().includes('blocked') ||
                            options.event_type.toLowerCase().includes('suspicious')
                        ));

    const action = isSuspicious ? getRandomElement(['DROP', 'DENY', 'REJECT']) : getRandomElement(['ACCEPT', 'ALLOW']);
    const protocol = getRandomElement(protocols);
    const vendor = getRandomElement(firewallVendors);
    const sourceZone = getRandomElement(zones);
    const destZone = sourceZone === 'LAN' ? 'WAN' : 'LAN';
    
    const destPort = isSuspicious ? 
        getRandomElement([4444, 6666, 8080, 9999, 31337]) : // Suspicious ports
        getRandomElement([80, 443, 22, 21, 25, 53, 993]); // Common legitimate ports
    
    const destIp = isSuspicious ? 
        (ioc.attackerIp || '185.220.101.182') : // Suspicious external IP
        '8.8.8.8'; // Legitimate external service

    // Raw firewall log structure
    const rawLog = {
        '@timestamp': eventTime,
        'timestamp': eventTime,
        'firewall_name': `${vendor.replace(/\s+/g, '')}-FW-01`,
        'device_vendor': vendor.split(' ')[0],
        'device_product': vendor,
        'log_type': 'TRAFFIC',
        'message_id': `fw-${generatePacketId()}`,
        'session_id': generateSessionId(),
        
        // Network flow information (only in raw log)
        'source': {
            'ip': ioc.ip || '192.168.10.21',
            'port': Math.floor(Math.random() * 60000) + 1024,
            'zone': sourceZone,
            'interface': `eth${Math.floor(Math.random() * 4)}`
        },
        'destination': {
            'ip': destIp,
            'port': destPort,
            'zone': destZone,
            'interface': destZone === 'WAN' ? 'wan0' : 'lan0'
        },
        
        // Traffic details
        'network': {
            'protocol': protocol,
            'bytes_sent': Math.floor(Math.random() * 10000) + 500,
            'bytes_received': Math.floor(Math.random() * 5000) + 200,
            'packets': Math.floor(Math.random() * 50) + 10,
            'duration': Math.floor(Math.random() * 300) + 5
        },
        
        // Firewall decision
        'action': action,
        'disposition': action,
        'rule': {
            'id': `rule_${Math.floor(Math.random() * 1000) + 1}`,
            'name': isSuspicious ? 'BLOCK_SUSPICIOUS_TRAFFIC' : 'ALLOW_WEB_TRAFFIC',
            'uuid': `rule-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`
        },
        
        // Security context
        'threat': isSuspicious ? {
            'category': 'malware',
            'severity': 'high',
            'name': 'C2 Communication Detected'
        } : null,
        
        'application': protocol === 'HTTP' ? 'web-browsing' : 
                      protocol === 'HTTPS' ? 'ssl' : 
                      protocol === 'SSH' ? 'ssh' : 'unknown',
        
        // Geolocation (for external IPs)
        'geo': destZone === 'WAN' ? {
            'country_code': isSuspicious ? 'RU' : 'US',
            'country_name': isSuspicious ? 'Russian Federation' : 'United States',
            'city': isSuspicious ? 'Moscow' : 'Mountain View'
        } : null,
        
        // Additional metadata
        'facility': 'firewall',
        'severity_label': isSuspicious ? 'high' : 'informational',
        'event_category': 'network-traffic',
        'tags': isSuspicious ? 
            ['firewall', 'blocked', 'suspicious', 'network'] : 
            ['firewall', 'allowed', 'normal', 'network']
    };

    return rawLog;
};