/**
 * Advanced Event Classification Engine
 * מנוע סיווג מתקדם המבוסס על מטריצת Use Cases מפורטת
 * מסווג אירועים לפי data source ודפוסים ידועים של TP/FP/Escalate
 */

import { getThreatIntelligence } from './maliciousHashes';

const CLASSIFICATION_CODES = {
    TP: 'True Positive',
    FP: 'False Positive', 
    ESCALATE: 'Escalate to TIER 2'
};

/**
 * פונקציית סיווג מרכזית המבוססת על Use Case Matrix
 * @param {Object} event - האירוע לסיווג
 * @param {Array} correlationEvents - אירועים קשורים לקורלציה
 * @returns {Object} תוצאת סיווג מפורטת
 */
export const classifySecurityEventAdvanced = (event, correlationEvents = []) => {
    const threatIntel = getThreatIntelligence();
    let classification = null;
    let reasoning = [];
    let confidence = 0;

    // זיהוי data source והפעלת הסיווג המתאים
    switch (event.log_source || event.source_type) {
        case 'EDR':
            return classifyEDREvent(event, correlationEvents, threatIntel);
        case 'Active Directory':
        case 'Windows Security':
            return classifyADEvent(event, correlationEvents, threatIntel);
        case 'Firewall':
        case 'IDS':
        case 'IPS':
            return classifyNetworkEvent(event, correlationEvents, threatIntel);
        case 'Office 365':
        case 'Exchange':
            return classifyO365Event(event, correlationEvents, threatIntel);
        case 'DLP':
            return classifyDLPEvent(event, correlationEvents, threatIntel);
        case 'AWS':
        case 'Azure':
        case 'GCP':
            return classifyCloudEvent(event, correlationEvents, threatIntel);
        case 'DNS':
            return classifyDNSEvent(event, correlationEvents, threatIntel);
        default:
            return classifyGenericEvent(event, correlationEvents, threatIntel);
    }
};

/**
 * סיווג אירועי EDR
 */
function classifyEDREvent(event, correlationEvents, threatIntel) {
    let reasoning = [];
    
    // === TRUE POSITIVE PATTERNS ===
    
    // Credential dumping to lsass.exe
    if (event.process_name?.includes('lsass.exe') && 
        (event.command_line?.includes('mimikatz') || event.rule_triggered?.includes('credential dump'))) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Credential dumping detected targeting lsass.exe - classic attack technique'],
            confidence: 95
        };
    }
    
    // PowerShell with Base64 encoded command downloading suspicious content
    if (event.command_line?.includes('powershell.exe -enc') && 
        (event.command_line?.includes('DownloadString') || event.command_line?.includes('WebClient'))) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['PowerShell executing encoded command with external download capability'],
            confidence: 90
        };
    }
    
    // Known malware hash
    if (event.file_hash && threatIntel.hashes.includes(event.file_hash.toLowerCase())) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: [`File hash ${event.file_hash.substring(0,8)}... matches known malware signature`],
            confidence: 100
        };
    }
    
    // Process hollowing to svchost.exe
    if (event.process_name?.includes('svchost.exe') && event.threat_indicators?.includes('Process Hollowing')) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Process hollowing detected in system process svchost.exe'],
            confidence: 85
        };
    }
    
    // Persistence via suspicious Scheduled Task
    if (event.persistence_mechanism === 'Scheduled Task' && 
        (event.task_name?.includes('Update') || event.task_name?.includes('Svc'))) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Suspicious scheduled task created for persistence'],
            confidence: 80
        };
    }
    
    // === FALSE POSITIVE PATTERNS ===
    
    // IT admin running legitimate PowerShell scripts
    if (event.user_role === 'IT Admin' && event.digital_signature_status === 'Valid' &&
        event.command_line?.includes('powershell.exe') && isBusinessHours(event)) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['IT admin executing signed PowerShell script during business hours'],
            confidence: 80
        };
    }
    
    // Known Red Team exercise
    if (event.tags?.includes('RedTeam') || event.user_name?.includes('redteam') ||
        event.description?.toLowerCase().includes('exercise')) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Activity identified as authorized security exercise'],
            confidence: 90
        };
    }
    
    // Sysinternals tools flagged incorrectly
    if (event.process_name?.includes('Process') && event.certificate_issuer === 'Microsoft Corporation' &&
        event.reputation_score > 80) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Microsoft-signed system administration tool'],
            confidence: 75
        };
    }
    
    // === ESCALATE TIER 2 PATTERNS ===
    
    // Parent-child process anomaly: winword.exe → cmd.exe → powershell.exe
    if (event.parent_process_name?.includes('winword.exe') && 
        (event.process_name?.includes('cmd.exe') || event.process_name?.includes('powershell.exe'))) {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['Suspicious process chain: Office application spawning command shell'],
            confidence: 70
        };
    }
    
    // Chrome connecting to newly registered domain
    if (event.process_name?.includes('chrome.exe') && event.destination_domain &&
        event.domain_age_days < 7) {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['Browser connection to very recently registered domain'],
            confidence: 60
        };
    }
    
    // Unknown file hash with suspicious network behavior
    if (!event.file_hash || !threatIntel.hashes.includes(event.file_hash.toLowerCase())) {
        if (event.network_connections > 0 && event.registry_modifications > 0) {
            return {
                classification: CLASSIFICATION_CODES.ESCALATE,
                reasoning: ['Unknown file exhibiting network and registry activity - requires investigation'],
                confidence: 65
            };
        }
    }
    
    // Default fallback
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['EDR event requires further analysis'],
        confidence: 40
    };
}

/**
 * סיווג אירועי Active Directory
 */
function classifyADEvent(event, correlationEvents, threatIntel) {
    // === TRUE POSITIVE PATTERNS ===
    
    // Brute Force: 100 failed logins + success on service account
    const failedLogins = correlationEvents.filter(e => 
        e.event_type === 'Logon' && e.logon_result === 'Failed' && 
        e.source_ip === event.source_ip
    ).length;
    
    if (failedLogins >= 10 && event.logon_result === 'Success' && 
        event.user_name?.includes('svc_')) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: [`Successful logon to service account after ${failedLogins} failed attempts - brute force attack`],
            confidence: 95
        };
    }
    
    // Pass-the-Hash activity
    if (event.authentication_type === 'NTLM' && event.source_workstation !== event.user_normal_workstation) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['NTLM authentication from unusual workstation - possible Pass-the-Hash'],
            confidence: 85
        };
    }
    
    // Domain Admin group membership change by unauthorized user
    if (event.group_name?.includes('Domain Admins') && event.action === 'Member Added' &&
        !isAuthorizedForGroupChange(event.performed_by)) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Unauthorized addition to Domain Admins group'],
            confidence: 90
        };
    }
    
    // Multiple logins from geographically distant locations
    if (event.logon_result === 'Success' && hasSimultaneousDistantLogins(event, correlationEvents)) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Simultaneous successful logins from geographically impossible locations'],
            confidence: 85
        };
    }
    
    // === FALSE POSITIVE PATTERNS ===
    
    // User forgot password and locked themselves out
    if (event.event_type === 'Account Lockout' && event.failure_reason === 'Bad Password' &&
        event.failure_count < 10 && isBusinessHours(event)) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Standard account lockout due to incorrect password attempts'],
            confidence: 70
        };
    }
    
    // VPN login from unexpected IP but authorized travel
    if (event.logon_type === 'VPN' && event.user_travel_approved && 
        event.geo_location_matches_travel) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['VPN login from expected travel location'],
            confidence: 80
        };
    }
    
    // === ESCALATE TIER 2 PATTERNS ===
    
    // Login at unusual hour with privileged account
    if (!isBusinessHours(event) && isPrivilegedAccount(event.user_name) &&
        event.logon_result === 'Success') {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['Privileged account login outside business hours requires verification'],
            confidence: 60
        };
    }
    
    // Mass failed login attempts - unclear if attack or system issue
    if (event.event_type === 'Failed Logon' && failedLogins > 50) {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['Mass login failures detected - determine if attack or system malfunction'],
            confidence: 55
        };
    }
    
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['Active Directory event requires investigation'],
        confidence: 45
    };
}

/**
 * סיווג אירועי רשת (Firewall/IDS/IPS)
 */
function classifyNetworkEvent(event, correlationEvents, threatIntel) {
    // === TRUE POSITIVE PATTERNS ===
    
    // Outbound traffic to known C2 IP
    if (event.destination_ip && threatIntel.ips.includes(event.destination_ip)) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: [`Outbound connection to known malicious IP ${event.destination_ip}`],
            confidence: 95
        };
    }
    
    // SQL Injection attempt detected
    if (event.attack_type === 'SQL Injection' && event.confidence > 80) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['High-confidence SQL Injection attack detected'],
            confidence: 90
        };
    }
    
    // Internal port scan to DMZ
    if (event.attack_type === 'Port Scan' && event.source_zone === 'Internal' &&
        event.destination_zone === 'DMZ') {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Internal host performing reconnaissance scan of DMZ network'],
            confidence: 80
        };
    }
    
    // === FALSE POSITIVE PATTERNS ===
    
    // Vulnerability scanner activity
    if (event.source_ip?.includes('192.168.') && 
        (event.user_agent?.includes('Nessus') || event.user_agent?.includes('Qualys'))) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Authorized vulnerability scanning activity'],
            confidence: 85
        };
    }
    
    // Legitimate software deployment
    if (event.destination_port === 80 && event.bytes_transferred < 1000000 &&
        event.user_role === 'IT Admin') {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Administrative software deployment activity'],
            confidence: 70
        };
    }
    
    // === ESCALATE TIER 2 PATTERNS ===
    
    // Suspicious SSL to new domain
    if (event.protocol === 'TLS' && event.destination_domain &&
        event.domain_age_days < 30 && event.certificate_self_signed) {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['TLS connection to recently registered domain with self-signed certificate'],
            confidence: 65
        };
    }
    
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['Network security event requires analysis'],
        confidence: 50
    };
}

/**
 * סיווג אירועי Office 365
 */
function classifyO365Event(event, correlationEvents, threatIntel) {
    // === TRUE POSITIVE PATTERNS ===
    
    // Forwarding rule to external attacker domain
    if (event.Operation === 'Set-MailboxJunkEmailConfiguration' && 
        event.forwarding_address && threatIntel.domains.some(domain => 
            event.forwarding_address.includes(domain))) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Email forwarding rule created to known malicious domain'],
            confidence: 95
        };
    }
    
    // Login from suspicious country after failed attempts
    if (event.Operation === 'UserLoggedIn' && event.geo_country === 'Russia' &&
        correlationEvents.some(e => e.Operation === 'UserLoginFailed' && e.user_id === event.user_id)) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Successful login from high-risk country following failed attempts'],
            confidence: 85
        };
    }
    
    // === FALSE POSITIVE PATTERNS ===
    
    // Standard internal business email
    if (event.Operation === 'Send' && event.recipient_internal === true &&
        !event.malicious_attachment && event.user_role === 'Standard User') {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Standard internal business email communication'],
            confidence: 80
        };
    }
    
    // Travel login from authorized location
    if (event.Operation === 'UserLoggedIn' && event.user_travel_approved &&
        isBusinessHours(event)) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Login from authorized travel location during business hours'],
            confidence: 75
        };
    }
    
    // === ESCALATE TIER 2 PATTERNS ===
    
    // Multiple countries login within minutes
    if (event.Operation === 'UserLoggedIn' && hasImpossibleTravelPattern(event, correlationEvents)) {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['Impossible travel pattern detected - multiple country logins'],
            confidence: 70
        };
    }
    
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['Office 365 event requires review'],
        confidence: 45
    };
}

/**
 * סיווג אירועי DLP
 */
function classifyDLPEvent(event, correlationEvents, threatIntel) {
    // === TRUE POSITIVE PATTERNS ===
    
    // HR/PII data sent to personal email
    if (event.data_classification === 'PII' && event.destination_external === true &&
        event.action_taken === 'Blocked' && event.destination_type === 'Personal Email') {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Blocked attempt to exfiltrate PII data to personal email'],
            confidence: 90
        };
    }
    
    // USB copy of restricted financial database
    if (event.data_source === 'Database' && event.destination_type === 'USB' &&
        event.data_classification === 'Confidential') {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Attempt to copy confidential database to USB device'],
            confidence: 85
        };
    }
    
    // === FALSE POSITIVE PATTERNS ===
    
    // Test data with dummy information
    if (event.data_contains_test_patterns === true || 
        event.file_name?.includes('test') || event.file_name?.includes('sample')) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Test or sample data detected, not genuine sensitive information'],
            confidence: 80
        };
    }
    
    // === ESCALATE TIER 2 PATTERNS ===
    
    // Large encrypted archive sent externally
    if (event.file_type === 'Archive' && event.encrypted === true &&
        event.file_size_mb > 100 && event.destination_external === true) {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['Large encrypted archive sent externally - content analysis required'],
            confidence: 60
        };
    }
    
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['DLP event requires investigation'],
        confidence: 50
    };
}

/**
 * סיווג אירועי Cloud (AWS/Azure/GCP)
 */
function classifyCloudEvent(event, correlationEvents, threatIntel) {
    // === TRUE POSITIVE PATTERNS ===
    
    // IAM user created with admin privileges outside policy
    if (event.event_name === 'CreateUser' && event.attached_policies?.includes('AdministratorAccess') &&
        !event.change_request_approved) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Unauthorized creation of user with administrator privileges'],
            confidence: 90
        };
    }
    
    // Security services disabled
    if ((event.event_name === 'StopConfigurationRecorder' || event.event_name === 'DeleteTrail') &&
        event.user_name !== 'authorized_admin') {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: ['Attempt to disable security logging and monitoring'],
            confidence: 95
        };
    }
    
    // === FALSE POSITIVE PATTERNS ===
    
    // DevOps automation script
    if (event.user_type === 'AssumedRole' && event.user_name?.includes('DevOps') &&
        event.source_ip_internal === true) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['Automated DevOps deployment activity'],
            confidence: 75
        };
    }
    
    // === ESCALATE TIER 2 PATTERNS ===
    
    // Login from unusual region
    if (event.event_name === 'ConsoleLogin' && 
        !isExpectedRegion(event.source_region, event.user_name)) {
        return {
            classification: CLASSIFICATION_CODES.ESCALATE,
            reasoning: ['Console login from unexpected geographical region'],
            confidence: 65
        };
    }
    
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['Cloud security event requires review'],
        confidence: 50
    };
}

/**
 * סיווג אירועי DNS  
 */
function classifyDNSEvent(event, correlationEvents, threatIntel) {
    // DNS query to known malicious domain
    if (event.query_name && threatIntel.domains.includes(event.query_name)) {
        return {
            classification: CLASSIFICATION_CODES.TP,
            reasoning: [`DNS query to known malicious domain ${event.query_name}`],
            confidence: 90
        };
    }
    
    // Standard business domain query
    if (event.query_name && (event.query_name.includes('office.com') || 
        event.query_name.includes('microsoft.com') || event.query_name.includes('google.com'))) {
        return {
            classification: CLASSIFICATION_CODES.FP,
            reasoning: ['DNS query to legitimate business domain'],
            confidence: 85
        };
    }
    
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['DNS query requires investigation'],
        confidence: 45
    };
}

/**
 * סיווג גנרי לאירועים לא מזוהים
 */
function classifyGenericEvent(event, correlationEvents, threatIntel) {
    return {
        classification: CLASSIFICATION_CODES.ESCALATE,
        reasoning: ['Unknown event type requires manual classification'],
        confidence: 30
    };
}

// פונקציות עזר
function isBusinessHours(event) {
    const eventTime = new Date(event.timestamp || event.event_time || event.created_date);
    const hour = eventTime.getHours();
    return hour >= 7 && hour <= 19;
}

function isPrivilegedAccount(userName) {
    const privilegedAccounts = ['administrator', 'root', 'admin', 'svc_backup', 'svc_sql'];
    return privilegedAccounts.some(acc => userName?.toLowerCase().includes(acc));
}

function isAuthorizedForGroupChange(user) {
    // בדיקה אם המשתמש מורשה לשנות חברות בקבוצות
    const authorizedAdmins = ['domain_admin', 'security_admin'];
    return authorizedAdmins.some(admin => user?.toLowerCase().includes(admin));
}

function hasSimultaneousDistantLogins(event, correlationEvents) {
    // בדיקה לכניסות בו זמנית ממקומות רחוקים גיאוגרפית
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const eventTime = new Date(event.timestamp).getTime();
    
    return correlationEvents.some(e => {
        const eTime = new Date(e.timestamp).getTime();
        return Math.abs(eventTime - eTime) < timeWindow && 
               e.geo_location !== event.geo_location && 
               e.user_name === event.user_name;
    });
}

function hasImpossibleTravelPattern(event, correlationEvents) {
    // זיהוי דפוסי נסיעה בלתי אפשריים
    return hasSimultaneousDistantLogins(event, correlationEvents);
}

function isExpectedRegion(region, userName) {
    // בדיקה אם האזור צפוי עבור המשתמש
    const expectedRegions = ['us-east-1', 'eu-west-1', 'il-central-1'];
    return expectedRegions.includes(region);
}

// Export יחיד בלבד
export { CLASSIFICATION_CODES };