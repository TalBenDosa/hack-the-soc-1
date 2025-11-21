export const generateDHCPLog = (options = {}) => {
    const generateLogId = () => `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generateRandomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const dhcpEvents = [
        { action: "LEASE_ASSIGNED", description: "IP address lease assigned", severity: "Low" },
        { action: "LEASE_EXPIRED", description: "IP address lease expired", severity: "Low" },
        { action: "ROGUE_DHCP_DETECTED", description: "Rogue DHCP server detected on network", severity: "High" }
    ];
    
    const selectedEvent = dhcpEvents[Math.floor(Math.random() * dhcpEvents.length)];
    const timestamp = new Date(Date.now() - Math.random() * 86400000);
    
    return {
        id: generateLogId(),
        timestamp: timestamp.toISOString(),
        source_type: "DHCP",
        action: selectedEvent.action,
        description: selectedEvent.description,
        assigned_ip: generateRandomIP(),
        mac_address: `${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}:${Math.floor(Math.random() * 256).toString(16)}`,
        hostname: `PC-${Math.floor(Math.random() * 100) + 1}`,
        lease_duration: "8 hours",
        dhcp_server: "192.168.1.1",
        severity: selectedEvent.severity,
        raw_log: `${timestamp.toISOString()} DHCP: ${selectedEvent.action} - ${selectedEvent.description}`
    };
};