export const generateWAFLog = (options = {}) => {
    const generateLogId = () => `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generateRandomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const wafEvents = [
        { action: "BLOCK", description: "SQL injection attempt blocked", attack_type: "SQL Injection", severity: "High" },
        { action: "BLOCK", description: "XSS attack attempt blocked", attack_type: "Cross-Site Scripting", severity: "High" },
        { action: "ALERT", description: "Suspicious request pattern detected", attack_type: "Scanning", severity: "Medium" },
        { action: "ALLOW", description: "Request allowed after inspection", attack_type: null, severity: "Low" }
    ];
    
    const selectedEvent = wafEvents[Math.floor(Math.random() * wafEvents.length)];
    const timestamp = new Date(Date.now() - Math.random() * 86400000);
    
    return {
        id: generateLogId(),
        timestamp: timestamp.toISOString(),
        source_type: "WAF",
        action: selectedEvent.action,
        description: selectedEvent.description,
        source_ip: generateRandomIP(),
        destination_ip: "192.168.1.100",
        url: "/login.php",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        attack_type: selectedEvent.attack_type,
        rule_id: `WAF-${Math.floor(Math.random() * 1000) + 1}`,
        severity: selectedEvent.severity,
        raw_log: `${timestamp.toISOString()} WAF: ${selectedEvent.action} - ${selectedEvent.description}`
    };
};