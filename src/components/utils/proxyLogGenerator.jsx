export const generateProxyLog = (options = {}) => {
    const generateLogId = () => `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generateRandomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const proxyEvents = [
        { action: "BLOCK", description: "Access to malicious website blocked", category: "Malware", severity: "High" },
        { action: "ALLOW", description: "Web request allowed", category: "Business", severity: "Low" },
        { action: "WARN", description: "Access to suspicious domain", category: "Suspicious", severity: "Medium" }
    ];
    
    const selectedEvent = proxyEvents[Math.floor(Math.random() * proxyEvents.length)];
    const timestamp = new Date(Date.now() - Math.random() * 86400000);
    
    return {
        id: generateLogId(),
        timestamp: timestamp.toISOString(),
        source_type: "Proxy",
        action: selectedEvent.action,
        description: selectedEvent.description,
        source_ip: generateRandomIP(),
        destination_url: selectedEvent.category === "Malware" ? "http://malicious-site.com" : "http://business-site.com",
        user_name: options.username || `user${Math.floor(Math.random() * 1000)}`,
        category: selectedEvent.category,
        bytes_sent: Math.floor(Math.random() * 10000),
        bytes_received: Math.floor(Math.random() * 100000),
        severity: selectedEvent.severity,
        raw_log: `${timestamp.toISOString()} Proxy: ${selectedEvent.action} - ${selectedEvent.description}`
    };
};