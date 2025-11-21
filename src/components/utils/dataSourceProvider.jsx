/**
 * Data Source Provider - מכיל את ההגדרות והתפקידים של כל מקורות המידע במערכת SOC
 * מבוסס על התיאור המפורט שסופק על ידי המשתמש
 */

export const dataSourceDefinitions = {
    EDR: {
        name: "Endpoint Detection & Response",
        description: "משמש לניטור והגנה על נקודות קצה – מחשבים אישיים, מחשבים ניידים, שרתים – בזמן אמת",
        detects: [
            "יצירה, סיום או שינוי תהליכים (processes)",
            "פקודות חשודות או הרצות PowerShell/CMD",
            "הורדה, הרצה או שינוי של קבצים זדוניים",
            "פעילות חשודה של משתמשים, כולל ניסיונות גישה לא מורשים",
            "שינויי מערכת חריגים, התקפות malware או ransomware",
            "אינטגרציה עם threat intelligence לזיהוי IOCs"
        ],
        common_event_types: [
            "ProcessCreate", "ProcessTerminate", "FileCreate", "FileDelete", "FileModify", 
            "NetworkConnection", "RegistryModify", "PowerShellExecution", "SuspiciousCommand"
        ],
        typical_fields: ["process_name", "command_line", "file_path", "hash", "parent_process", "user_name", "device_name"]
    },

    FW: {
        name: "Firewall",
        description: "משמש לבקרה והגנה על תעבורת הרשת בין נקודות קצה לשרתים ולענן",
        detects: [
            "חיבורי TCP/UDP חריגים",
            "תעבורה יוצאת או נכנסת לא מורשית", 
            "ניסיונות הוצאת מידע (Data Exfiltration)",
            "גישה לדומיינים או IPים זדוניים",
            "חריגות בתעבורת רשת לפי כללי firewall קיימים"
        ],
        common_event_types: [
            "ConnectionAllowed", "ConnectionBlocked", "TrafficAnomaly", "SuspiciousOutbound", 
            "MaliciousDomain", "DataExfiltration", "PortScan"
        ],
        typical_fields: ["src_ip", "dest_ip", "src_port", "dest_port", "protocol", "bytes_sent", "bytes_received", "action"]
    },

    AV: {
        name: "Antivirus",
        description: "משמש לזיהוי ומניעת תוכנות זדוניות בקבצים ובמערכות",
        detects: [
            "קבצים זדוניים לפי signatures או heuristics",
            "פעילות של malware/spyware/ransomware",
            "ניסיונות התקנה או הפעלה של תוכנות לא מורשות",
            "דפוסי התנהגות חשודים (behavior-based detection)"
        ],
        common_event_types: [
            "MalwareDetected", "VirusQuarantined", "SuspiciousFile", "ThreatBlocked", 
            "HeuristicDetection", "BehaviorAnalysis"
        ],
        typical_fields: ["file_name", "file_path", "virus_name", "threat_type", "action_taken", "detection_method"]
    },

    AD: {
        name: "Active Directory",
        description: "משמש לניהול זהויות והרשאות במערכות מקומיות",
        detects: [
            "כניסות משתמשים חריגות או נכשלות",
            "שינוי בהרשאות משתמשים",
            "יצירת חשבונות חדשים או שינוי סיסמאות",
            "פעילות חריגה של קבוצות אבטחה",
            "ניסיונות privilege escalation או lateral movement"
        ],
        common_event_types: [
            "UserLogon", "UserLogonFailed", "AccountCreated", "PasswordChanged", 
            "GroupMembership", "PrivilegeEscalation", "AccountLockout"
        ],
        typical_fields: ["user_name", "account_name", "logon_type", "workstation", "failure_reason", "group_name"]
    },

    DC: {
        name: "Domain Controller", 
        description: "משמש לניהול האימות וההרשאות ברשת מבוססת Active Directory",
        detects: [
            "התחברות חשודה או נכשלת לחשבונות",
            "שינויי סיסמאות והגדרות אבטחה",
            "יצירת session חשוד",
            "ניהול קבוצות ומדיניות (GPO) חריגה",
            "התקפות Pass-the-Hash או Kerberos ticket abuse"
        ],
        common_event_types: [
            "KerberosAuth", "NTLMAuth", "TicketGranted", "AuthenticationFailure", 
            "GPOModified", "DomainPolicy", "PassTheHash"
        ],
        typical_fields: ["authentication_type", "ticket_encryption", "service_name", "client_address", "kerberos_result"]
    },

    NAC: {
        name: "Network Access Control",
        description: "משמש לניהול ובקרה של הגישה לרשת",
        detects: [
            "התקנים שאינם מורשים ברשת",
            "ניסיונות גישה לרשת ללא אימות מתאים",
            "התקנים נגועים או לא מעודכנים", 
            "חריגות ב-MAC, IP או פורטים פתוחים",
            "חריגות במדיניות גישה מבוססת תפקיד"
        ],
        common_event_types: [
            "DeviceConnected", "AccessDenied", "QuarantineDevice", "ComplianceCheck", 
            "UnauthorizedDevice", "PolicyViolation", "NetworkAdmission"
        ],
        typical_fields: ["mac_address", "ip_address", "device_type", "compliance_status", "access_method", "vlan_assignment"]
    },

    "MAIL RELAY": {
        name: "Mail Relay / Mail Gateway",
        description: "משמש לניטור, סינון והגנה על תעבורת דואר אלקטרוני",
        detects: [
            "מיילים זדוניים או פישינג",
            "קבצים מצורפים חשודים",
            "דומיינים או כתובות IP מזיקות",
            "Spoofing, DKIM/DMARC failures",
            "ניסיונות exfiltration דרך מייל"
        ],
        common_event_types: [
            "PhishingDetected", "MaliciousAttachment", "SpamBlocked", "DMARCFailure", 
            "EmailQuarantined", "SuspiciousSender", "DataLeakage"
        ],
        typical_fields: ["sender", "recipient", "subject", "attachment_hash", "dmarc_result", "spam_score"]
    },

    AWS: {
        name: "AWS CloudTrail",
        description: "משמש לניטור אירועים בענן AWS",
        detects: [
            "קריאות API חריגות או בלתי רגילות",
            "פעולות ניהוליות של משתמשי IAM",
            "גישה ממקורות IP לא מוכרים",
            "הורדה או שינוי קבצים ונתונים בענן",
            "יצירת משאבים חשודים או שינוי הרשאות"
        ],
        common_event_types: [
            "APICall", "IAMRoleAssumed", "S3Access", "EC2Instance", 
            "UnusualLogin", "PermissionChanged", "ResourceCreated"
        ],
        typical_fields: ["event_name", "aws_region", "user_identity", "source_ip", "user_agent", "resource_arn"]
    },

    Azure: {
        name: "Azure Activity / Logs",
        description: "משמש לניטור אירועים ומשאבים בענן Microsoft Azure",
        detects: [
            "כניסה לחשבונות חריגה או נכשלת",
            "פעולות על משאבים (VMs, Storage, SQL, Network Security Groups)",
            "שינוי הרשאות או role assignments",
            "ניסיונות התקפה/סריקות בשרתים בענן",
            "הורדה או העתקת מידע לא מורשה"
        ],
        common_event_types: [
            "SignInLogs", "AuditLogs", "ResourceAccess", "RoleAssignment", 
            "VMActivity", "StorageAccess", "SecurityAlert"
        ],
        typical_fields: ["user_principal_name", "resource_group", "subscription_id", "operation_name", "result_signature", "caller_ip_address"]
    },

    OFFICE365: {
        name: "Office 365 / Microsoft 365 Logs", 
        description: "משמש לניטור תעבורת דואר, קבצים ושיתוף מידע בענן",
        detects: [
            "כניסות משתמשים חריגות",
            "שימוש חשוד ב-Outlook, Teams, SharePoint, OneDrive",
            "הורדות או שיתופים חשודים של קבצים",
            "מיילי פישינג ו-macro attacks",
            "יצירת קבוצות, שיתופי קבצים או הרשאות חריגות"
        ],
        common_event_types: [
            "EmailReceived", "FileDownloaded", "FileShared", "TeamsMessage", 
            "SharePointAccess", "OneDriveSync", "ExchangeAdmin", "MacroExecution"
        ],
        typical_fields: ["user_id", "client_ip", "user_agent", "workload", "operation", "object_id", "site_url"]
    },

    "WINDOWS SECURITY": {
        name: "Windows Security (Event Logs)",
        description: "משמש לניטור פעולות מערכת Windows",
        detects: [
            "כניסות ויציאות משתמשים (logon/logoff)",
            "שינויים בהרשאות או במדיניות אבטחה",
            "התקנת תוכנות ושירותים חדשים",
            "ניסיונות privilege escalation",
            "שינויי קבצים או registry חשודים"
        ],
        common_event_types: [
            "Logon", "Logoff", "AccountLogon", "PrivilegeUse", 
            "ProcessCreation", "ServiceInstalled", "RegistryChanged", "PolicyChange"
        ],
        typical_fields: ["event_id", "logon_type", "account_name", "workstation_name", "process_name", "privilege_list"]
    }
};

/**
 * פונקצית עזר להחזרת הגדרות מקור מידע
 */
export const getDataSourceDefinition = (sourceType) => {
    return dataSourceDefinitions[sourceType] || null;
};

/**
 * פונקצית עזר לקבלת רשימת כל מקורות המידע הזמינים
 */
export const getAllDataSources = () => {
    return Object.keys(dataSourceDefinitions);
};

/**
 * פונקצית עזר לקבלת סוגי אירועים נפוצים לפי מקור מידע
 */
export const getCommonEventTypes = (sourceType) => {
    const definition = dataSourceDefinitions[sourceType];
    return definition ? definition.common_event_types : [];
};