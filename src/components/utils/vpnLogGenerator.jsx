export const generateVPNLog = (options = {}) => {
    const generateLogId = () => `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generateRandomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const vpnEvents = [
        { action: "CONNECT", description: "VPN connection established", severity: "Low" },
        { action: "DISCONNECT", description: "VPN connection terminated", severity: "Low" },
        { action: "AUTH_FAILED", description: "VPN authentication failed", severity: "Medium" },
        { action: "SUSPICIOUS_LOCATION", description: "VPN connection from unusual location", severity: "High" }
    ];
    
    const selectedEvent = vpnEvents[Math.floor(Math.random() * vpnEvents.length)];
    const timestamp = new Date(Date.now() - Math.random() * 86400000);
    
    return {
        id: generateLogId(),
        timestamp: timestamp.toISOString(),
        source_type: "VPN",
        action: selectedEvent.action,
        description: selectedEvent.description,
        user_name: options.username || `user${Math.floor(Math.random() * 1000)}`,
        source_ip: generateRandomIP(),
        vpn_server: `vpn-server-${Math.floor(Math.random() * 5) + 1}.company.com`,
        location: selectedEvent.action === "SUSPICIOUS_LOCATION" ? "Unknown Country" : "Office Location",
        protocol: "OpenVPN",
        severity: selectedEvent.severity,
        raw_log: `${timestamp.toISOString()} VPN: ${selectedEvent.action} - ${selectedEvent.description}`
    };
};