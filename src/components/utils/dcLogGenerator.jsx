export const generateDomainControllerLog = (options = {}) => {
    const generateLogId = () => `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generateRandomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const dcEvents = [
        { event_id: 4662, description: "An operation was performed on an object", object_type: "Domain Controller", severity: "Medium" },
        { event_id: 4672, description: "Special privileges assigned to new logon", privileges: "SeDebugPrivilege, SeBackupPrivilege", severity: "High" },
        { event_id: 4768, description: "A Kerberos authentication ticket (TGT) was requested", ticket_encryption: "0x12", severity: "Low" },
        { event_id: 4769, description: "A Kerberos service ticket was requested", service_name: "HTTP/webapp.corp.com", severity: "Low" }
    ];
    
    const selectedEvent = dcEvents[Math.floor(Math.random() * dcEvents.length)];
    const timestamp = new Date(Date.now() - Math.random() * 86400000);
    
    return {
        id: generateLogId(),
        timestamp: timestamp.toISOString(),
        source_type: "DC",
        event_id: selectedEvent.event_id,
        description: selectedEvent.description,
        computer_name: `DC-${Math.floor(Math.random() * 3) + 1}.corp.local`,
        account_name: options.username || `user${Math.floor(Math.random() * 1000)}`,
        source_ip: generateRandomIP(),
        object_type: selectedEvent.object_type || null,
        privileges: selectedEvent.privileges || null,
        severity: selectedEvent.severity,
        raw_log: `${timestamp.toISOString()} DC Log: ${selectedEvent.description}`
    };
};