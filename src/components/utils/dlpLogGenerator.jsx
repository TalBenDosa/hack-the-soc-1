// --- Data Pools for Realistic DLP Log Randomization ---
const vendors = ["Microsoft Purview", "Symantec DLP", "Trellix DLP", "Broadcom DLP", "Proofpoint"];
const products = {
    "Microsoft Purview": "Information Protection",
    "Symantec DLP": "Symantec Data Loss Prevention",
    "Trellix DLP": "Trellix DLP Discover",
    "Broadcom DLP": "Broadcom Data Loss Prevention",
    "Proofpoint": "Email DLP"
};
const policyNames = ["Confidential Data Policy", "PII Protection", "Financial Data Rule", "Source Code Leakage", "GDPR Compliance"];
const ruleNames = ["Credit Card Number Detection", "SSN Detection", "Internal Project Codename 'Phoenix'", "EU Passport Number Detection", "Medical Record Keyword Match"];
const severities = ["High", "Medium", "Low", "Informational"];
const userDepartments = ["Engineering", "Sales", "HR", "Finance", "Legal", "Marketing"];
const sensitiveDataTypes = ["CreditCardNumber", "SSN", "PassportNumber", "MedicalRecord", "SourceCode", "ConfidentialProject", "IBAN"];
const sensitivityLabels = ["Public", "Internal", "Confidential", "Highly Confidential", "Restricted"];
const fileExtensions = [".docx", ".xlsx", ".pdf", ".txt", ".zip", ".pptx", ".csv", ".eml"];
const actionTypes = ["EmailSent", "FileUpload", "RemovableMediaWrite", "Print", "ClipboardCopy", "Screenshot", "NetworkShareCopy", "CloudSync"];
const channelTypes = ["Email", "Web Upload", "Removable Media", "Print", "Clipboard", "Network Share", "Cloud Sync"];
const cloudServices = ["SharePoint", "OneDrive", "Google Drive", "Dropbox", "Box", "AWS S3"];

// --- Helper Functions ---
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateGUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});
const generateIP = () => `${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
const generateHash = (len) => [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const generateEmail = () => `${getRandomElement(["john.doe", "jane.smith", "admin", "test.user"])}@corp.contoso.com`;

// --- Main Exported Function ---

export const generateDlpLog = (options = {}) => {
    const eventTime = new Date(Date.now() - Math.floor(Math.random() * 1000 * 3600 * 72));
    const vendor = getRandomElement(vendors);
    const actionType = options.actionType || getRandomElement(actionTypes);
    const wasBlocked = Math.random() < 0.7; // 70% chance to be blocked
    const fileExtension = getRandomElement(fileExtensions);
    const fileName = `report_${Math.floor(Math.random() * 999)}${fileExtension}`;

    let channelSpecificData = {};
    switch (actionType) {
        case "EmailSent":
            channelSpecificData = {
                channel_type: "Email",
                email_recipient: generateEmail(),
                email_subject: "FW: Confidential Project Phoenix Details",
                destination_host: "outlook.office365.com",
            };
            break;
        case "FileUpload":
            const service = getRandomElement(cloudServices);
            channelSpecificData = {
                channel_type: "Web Upload",
                cloud_service_name: service,
                web_url: `https://${service.toLowerCase().replace(' ', '')}.com/upload/`,
                destination_host: `${service.toLowerCase().replace(' ', '')}.com`,
            };
            break;
        case "RemovableMediaWrite":
            channelSpecificData = {
                channel_type: "Removable Media",
                usb_device_id: `VID_0781&PID_5581\\${generateHash(12)}`,
                destination_host: "USB Mass Storage Device",
            };
            break;
        case "Print":
            channelSpecificData = {
                channel_type: "Print",
                printer_name: `\\\\PRN-SRV-01\\${getRandomElement(["Sales-Printer", "HR-Color-Laser", "Finance-Secure"])}`,
            };
            break;
        case "ClipboardCopy":
            channelSpecificData = {
                channel_type: "Clipboard",
            };
            break;
        case "NetworkShareCopy":
            channelSpecificData = {
                channel_type: "Network Share",
                destination_file_path: `\\\\FILE-SRV-02\\public_share\\${fileName}`,
                destination_host: "FILE-SRV-02",
            };
            break;
        default:
            channelSpecificData = { channel_type: "Unknown" };
            break;
    }

    const baseLog = {
        // --- Meta ---
        event_time: eventTime.toISOString(),
        event_id: generateGUID(),
        event_type: "DLPIncident",
        event_subtype: "PolicyViolation",
        policy_id: `DLP-POL-${Math.floor(Math.random() * 10) + 1}`,
        policy_name: getRandomElement(policyNames),
        rule_id: generateGUID(),
        rule_name: getRandomElement(ruleNames),
        detection_type: "ContentAnalysis",
        detection_source: "Endpoint Agent",
        severity: getRandomElement(severities),
        confidence_level: "High",
        incident_id: Math.floor(Math.random() * 99999) + 10000,
        alert_id: generateGUID(),
        alert_status: "Active",
        log_level: "Warning",
        product: products[vendor],
        vendor: vendor,
        sensor_id: generateGUID(),
        tenant_id: generateGUID(),

        // --- User Details ---
        user_id: generateGUID(),
        user_name: "j.doe",
        user_display_name: "John Doe",
        user_email: "john.doe@corp.contoso.com",
        user_domain: "CORP",
        user_department: getRandomElement(userDepartments),
        user_role: "Analyst",
        user_group: "All Employees",
        is_privileged_user: Math.random() < 0.1,
        actor_ip: generateIP(),
        actor_location: "New York, US",
        device_id: generateGUID(),
        device_name: "DESKTOP-A8B4C2D",
        device_type: "Desktop",
        os_version: "Windows 10 Enterprise 22H2",

        // --- Sensitive Data ---
        sensitive_data_type: getRandomElement(sensitiveDataTypes),
        sensitive_data_name: "Credit Card Numbers",
        sensitivity_label: getRandomElement(sensitivityLabels),
        compliance_tag: "PCI-DSS",
        match_count: Math.floor(Math.random() * 20) + 1,
        classification_rule_id: `CLASS-${Math.floor(Math.random() * 99) + 1}`,
        classification_rule_name: "Credit Card Regex",
        confidence_score: Math.floor(Math.random() * 30) + 70,
        detection_count: 1,
        matched_content_sample: "4242...[redacted]...4242",

        // --- File Details ---
        file_name: fileName,
        file_path: `C:\\Users\\j.doe\\Documents\\${fileName}`,
        file_extension: fileExtension,
        file_type: "Microsoft Word Document",
        file_size: Math.floor(Math.random() * 500000) + 10000,
        file_hash_md5: generateHash(32),
        file_hash_sha256: generateHash(64),
        source_file_path: `C:\\Users\\j.doe\\Documents\\${fileName}`,
        destination_file_path: channelSpecificData.destination_file_path || null,
        source_file_owner: "John Doe",
        last_modified_time: new Date(eventTime.getTime() - 1000 * 60 * 5).toISOString(),
        document_id: generateGUID(),
        document_title: "Quarterly Financial Report",
        application_name: "WINWORD.EXE",

        // --- Action Details ---
        action_type: actionType,
        action_result: wasBlocked ? "Blocked" : "Audited",
        action_status: "Success",
        was_blocked: wasBlocked,
        was_alerted: true,
        was_quarantined: false,
        was_user_warned: true,
        user_response: !wasBlocked ? "Override" : null,
        remediation_status: "Pending",
        incident_status: "Open",
        response_action_taken: "AlertGenerated",

        // --- Policy Match ---
        policy_match_type: "Regex",
        policy_action: wasBlocked ? "Block" : "Audit",
        rule_severity: "High",
        rule_priority: 1,
        exception_applied: false,
        
        // --- Geo / Network ---
        source_ip: generateIP(),
        source_location: "Office Network",
        geoip_country: "US",
        vpn_status: "Not Connected",
        network_direction: "Outbound",
    };

    return { ...baseLog, ...channelSpecificData };
};