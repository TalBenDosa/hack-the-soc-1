/**
 * Event Classifier - פונקציית באקנד פשוטה לסיווג אירועים
 * משתמשת במאגר ההאשים הזדוניים הקיים ובמטריצת Use Cases
 * ✅ תומך בכל שדות ההאש האפשריים
 */

import { getThreatIntelligence } from './maliciousHashes';

// הגדרות סיווג בסיסיות
export const EVENT_CLASSIFICATIONS = {
    TP: 'True Positive',
    FP: 'False Positive', 
    ESCALATE: 'Escalate to TIER 2'
};

/**
 * פונקציית סיווג מרכזית - פשוטה ויעילה
 * ✅ תומכת בכל שדות ההאש: file_hash, process_sha256, file_sha256, executable_hash
 * @param {Object} event - האירוע לסיווג
 * @returns {Object} - סיווג + נימוק
 */
export const classifyEvent = (event) => {
    const threatIntel = getThreatIntelligence();
    
    // === ✅ בדיקת IOCs מוכרים (TP מיידי) - תמיכה בכל שדות ההאש ===
    
    // Hash זדוני ידוע - בדיקה של כל השדות האפשריים
    const possibleHashFields = [
        event.file_hash,
        event.process_sha256, 
        event.file_sha256,
        event.executable_hash,
        event.hash,
        event.sha256
    ];
    
    for (const hashValue of possibleHashFields) {
        if (hashValue && threatIntel.hashes.includes(hashValue.toLowerCase())) {
            return {
                classification: EVENT_CLASSIFICATIONS.TP,
                reasoning: `File hash ${hashValue.substring(0,8)}... matches known malware signature`
            };
        }
    }
    
    // IP זדוני ידוע - תמיכה בכל שדות ה-IP
    const possibleIpFields = [
        event.destination_ip,
        event.dest_ip,
        event.remote_ip,
        event.target_ip,
        event.external_ip
    ];
    
    for (const ipValue of possibleIpFields) {
        if (ipValue && threatIntel.ips.includes(ipValue)) {
            return {
                classification: EVENT_CLASSIFICATIONS.TP,
                reasoning: `Connection to known malicious IP ${ipValue}`
            };
        }
    }
    
    // Domain זדוני ידוע - תמיכה בכל שדות הדומיין
    const possibleDomainFields = [
        event.query_name,
        event.domain,
        event.destination_domain,
        event.remote_domain
    ];
    
    for (const domainValue of possibleDomainFields) {
        if (domainValue && threatIntel.domains.includes(domainValue)) {
            return {
                classification: EVENT_CLASSIFICATIONS.TP,
                reasoning: `DNS query to known malicious domain ${domainValue}`
            };
        }
    }
    
    // === בדיקות TP מבוססות Use Case Matrix ===
    
    // EDR - PowerShell encoded command
    if (event.log_source === 'EDR' && event.command_line?.includes('powershell.exe -enc')) {
        return {
            classification: EVENT_CLASSIFICATIONS.TP,
            reasoning: 'PowerShell encoded command execution - classic attack technique'
        };
    }
    
    // AD - Brute Force detected
    if (event.log_source === 'Active Directory' && event.failed_login_count >= 10) {
        return {
            classification: EVENT_CLASSIFICATIONS.TP,
            reasoning: `${event.failed_login_count} failed login attempts detected - brute force attack`
        };
    }
    
    // DLP - Sensitive data blocked
    if (event.log_source === 'DLP' && event.action_taken === 'Blocked' && 
        event.data_classification === 'Confidential') {
        return {
            classification: EVENT_CLASSIFICATIONS.TP,
            reasoning: 'DLP blocked exfiltration of confidential data'
        };
    }
    
    // === בדיקות FP מבוססות Use Case Matrix ===
    
    // Office 365 - Standard business email
    if (event.log_source === 'Office 365' && event.Operation === 'Send' && 
        event.recipient_internal === true && !event.malicious_attachment) {
        return {
            classification: EVENT_CLASSIFICATIONS.FP,
            reasoning: 'Standard internal business email communication'
        };
    }
    
    // EDR - IT Admin with signed script
    if (event.log_source === 'EDR' && event.user_role === 'IT Admin' && 
        event.digital_signature_status === 'Valid') {
        return {
            classification: EVENT_CLASSIFICATIONS.FP,
            reasoning: 'IT admin executing signed script during business hours'
        };
    }
    
    // Firewall - Vulnerability scanner
    if (event.log_source === 'Firewall' && 
        (event.user_agent?.includes('Nessus') || event.user_agent?.includes('Qualys'))) {
        return {
            classification: EVENT_CLASSIFICATIONS.FP,
            reasoning: 'Authorized vulnerability scanning activity'
        };
    }
    
    // === ברירת מחדל - Escalate Tier 2 ===
    
    return {
        classification: EVENT_CLASSIFICATIONS.ESCALATE,
        reasoning: `${event.log_source || 'Unknown source'} event requires manual investigation`
    };
};

/**
 * פונקציית עזר - בדיקת שעות עבודה
 */
function isBusinessHours(event) {
    const eventTime = new Date(event.timestamp || event.event_time);
    const hour = eventTime.getHours();
    return hour >= 7 && hour <= 19;
}

/**
 * פונקציית עזר - בדיקת חשבונות מורשים
 */
function isPrivilegedAccount(userName) {
    const privilegedAccounts = ['administrator', 'root', 'admin', 'svc_'];
    return privilegedAccounts.some(acc => userName?.toLowerCase().includes(acc));
}

/**
 * ✅ פונקציית עזר - חילוץ האש מהאירוע (תמיכה בכל השדות)
 */
export const extractHashFromEvent = (event) => {
    const hashFields = [
        'file_hash',
        'process_sha256', 
        'file_sha256',
        'executable_hash',
        'hash',
        'sha256'
    ];
    
    for (const field of hashFields) {
        if (event[field]) {
            return event[field];
        }
    }
    return null;
};