import { dataSourceDefinitions } from './dataSourceProvider';
import { maliciousHashService } from './maliciousHashService';

// Import all available log generators
import { generateEdrLog } from './edrLogGenerator';
import { generateFirewallLog } from './firewallLogGenerator';
import { generateOffice365Log } from './office365LogGenerator';
import { generateAwsLog } from './awsLogGenerator';
import { generateAzureLog } from './azureLogGenerator';
import { generateActiveDirectoryLog as generateAdLog } from './adLogGenerator';
import { generateAntivirusLog } from './antivirusLogGenerator';
import { generateNacLog } from './nacLogGenerator';

/**
 * Generates a single, realistic log entry based on the new Normalized Log Schema.
 * Implements the comprehensive schema to eliminate ALL duplications.
 */
export const generateLogForUseCase = async (useCase, context) => {
    const { user, device, ipMap, iocs, initialTimestamp } = context;
    const dataSource = useCase.dataSource || 'UNKNOWN';

    console.log(`[LogGenerator V6] Generating normalized log for: "${useCase.title}" | Source: ${dataSource}`);

    // Create consistent base context for all generators
    const logOptions = {
        ioc: { 
            user: user.name, 
            ip: device.ip, 
            email: user.email, 
            maliciousHash: iocs?.hash,
            c2Domain: iocs?.domain,
            attackerIp: iocs?.ip
        },
        details: useCase.description || useCase.title,
        severity: useCase.severity || 'Medium',
        event_type: useCase.title,
        timestamp: initialTimestamp.toISOString(),
        device: { name: device.name, ip: device.ip },
        user: { name: user.name, email: user.email }
    };

    let generatorFunc;
    let raw_log;

    // Dispatch to the correct log generator
    switch (dataSource) {
        case 'EDR':
            generatorFunc = generateEdrLog;
            break;
        case 'FW':
            generatorFunc = generateFirewallLog;
            break;
        case 'OFFICE365':
        case 'MAIL RELAY':
            generatorFunc = generateOffice365Log;
            break;
        case 'AV':
            generatorFunc = generateAntivirusLog;
            break;
        case 'AD':
        case 'DC':
        case 'WINDOWS SECURITY':
            generatorFunc = generateAdLog;
            break;
        case 'NAC':
            generatorFunc = generateNacLog;
            break;
        case 'AWS':
            generatorFunc = generateAwsLog;
            break;
        case 'Azure':
            generatorFunc = generateAzureLog;
            break;
        default:
            console.warn(`[LogGenerator] No generator for: "${dataSource}". Creating generic log.`);
            raw_log = createGenericLog(dataSource, useCase, logOptions);
            break;
    }

    // Execute the generator function
    if (generatorFunc && typeof generatorFunc === 'function') {
        try {
            raw_log = await generatorFunc(logOptions);
        } catch (e) {
            console.error(`[LogGenerator] Error executing generator for "${dataSource}":`, e);
            raw_log = createErrorLog(dataSource, e.message, logOptions);
        }
    } else if (!raw_log) {
        console.error(`[LogGenerator] Generator for "${dataSource}" not found.`);
        raw_log = createGenericLog(dataSource, useCase, logOptions);
    }

    // --- IMPLEMENT THE NEW NORMALIZED SCHEMA ---
    
    // 1️⃣ General Metadata
    const normalizedLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: initialTimestamp.toISOString(),
        log_source: dataSource,
        event_type: useCase.event_type || mapToEventType(useCase.title),
        severity: useCase.severity || 'Medium',
        log_level: mapSeverityToLogLevel(useCase.severity || 'Medium'),
        story_context: useCase.description || useCase.title,

        // 2️⃣ User Information
        user: {
            name: user.name,
            email: user.email,
            domain: extractUserDomain(raw_log)
        },

        // 3️⃣ Device Information  
        device: {
            name: device.name,
            id: `device-${device.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            ip: device.ip,
            os: raw_log.host?.os?.name || raw_log.agent?.os?.name || 'Unknown'
        },

        // 4️⃣ Network/Destination Information
        network: {
            destination_ip: extractDestinationIP(raw_log),
            destination_domain: extractDestinationDomain(raw_log),
            protocol: raw_log.network?.protocol || 'unknown',
            port: raw_log.destination?.port || raw_log.network?.destination?.port
        },

        // 5️⃣ Action/Event Information
        action: {
            type: extractActionType(raw_log, useCase),
            subtype: extractActionSubtype(raw_log, useCase),
            result: extractActionResult(raw_log),
            was_blocked: determineIfBlocked(raw_log, useCase)
        },

        // Process information (only if relevant)
        ...(raw_log.process && {
            process: {
                name: raw_log.process.name,
                command_line: raw_log.process.command_line,
                parent_name: raw_log.process_parent?.name
            }
        }),

        // 6️⃣ Files/Hashes (only if relevant)
        ...(raw_log.file && {
            file: {
                name: raw_log.file.name,
                path: raw_log.file.path,
                hash: {
                    sha256: raw_log.file.hash?.sha256,
                    md5: raw_log.file.hash?.md5
                }
            }
        }),

        // Raw log data - cleaned of ALL duplicated fields
        raw_log_data: cleanRawLogData(raw_log)
    };

    return removeEmptyFields(normalizedLog);
};

/**
 * Maps useCase title to standardized event types
 */
function mapToEventType(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('phishing') || lowerTitle.includes('email')) return 'PhishingEmail';
    if (lowerTitle.includes('click') || lowerTitle.includes('link')) return 'URLClicked';
    if (lowerTitle.includes('powershell')) return 'PowerShellExecution';
    if (lowerTitle.includes('macro')) return 'MacroExecution';
    if (lowerTitle.includes('download') || lowerTitle.includes('payload')) return 'FileDownload';
    if (lowerTitle.includes('data') || lowerTitle.includes('exfil')) return 'OutgoingDataTransmission';
    if (lowerTitle.includes('login') || lowerTitle.includes('auth')) return 'AuthenticationEvent';
    return 'GenericEvent';
}

/**
 * Maps severity to appropriate log level
 */
function mapSeverityToLogLevel(severity) {
    switch (severity) {
        case 'Critical': return 'Critical';
        case 'High': return 'Warning';
        case 'Medium': return 'Information';
        case 'Low': return 'Information';
        default: return 'Information';
    }
}

/**
 * Extracts destination IP, avoiding duplications
 */
function extractDestinationIP(raw_log) {
    return raw_log.destination?.ip || 
           raw_log.network?.destination?.ip || 
           raw_log.ClientIP ||
           'N/A';
}

/**
 * Extracts destination domain, avoiding duplications  
 */
function extractDestinationDomain(raw_log) {
    if (raw_log.destination?.domain) return raw_log.destination.domain;
    if (raw_log.url?.full) {
        try {
            return new URL(raw_log.url.full).hostname;
        } catch (e) { return 'N/A'; }
    }
    return raw_log.network?.destination?.domain || 'N/A';
}

/**
 * Extracts technical action type
 */
function extractActionType(raw_log, useCase) {
    return raw_log.event?.action || 
           raw_log.Operation || 
           raw_log.Activity ||
           mapToEventType(useCase.title);
}

/**
 * Extracts action subtype for more granular classification
 */
function extractActionSubtype(raw_log, useCase) {
    const command = raw_log.process?.command_line?.toLowerCase() || '';
    if (command.includes('powershell')) return 'PowerShellExecution';
    if (command.includes('wscript') || command.includes('cscript')) return 'VBSScriptExecution';
    if (command.includes('rundll32')) return 'DLLExecution';
    if (useCase.event_type?.toLowerCase().includes('macro')) return 'MacroExecution';
    return null;
}

/**
 * Extracts action result from raw log
 */
function extractActionResult(raw_log) {
    const outcome = raw_log.event?.outcome || raw_log.Status || 'unknown';
    if (outcome === 'success') return 'Success';
    if (outcome === 'failure') return 'Failure';
    if (raw_log.was_blocked || raw_log.Blocked) return 'Blocked';
    if (raw_log.tags?.includes('malicious') || raw_log.tags?.includes('suspicious')) return 'SuspiciousActivity';
    return 'Success';
}

/**
 * Determines if action was blocked
 */
function determineIfBlocked(raw_log, useCase) {
    return raw_log.was_blocked === true || 
           raw_log.event?.outcome === 'failure' ||
           raw_log.Blocked === true ||
           useCase.severity === 'Critical';
}

/**
 * Extracts user domain from raw log
 */
function extractUserDomain(raw_log) {
    return raw_log.user?.domain || 
           raw_log.winlog?.event_data?.TargetDomainName || 
           raw_log.OrganizationId ||
           'COMPANY';
}

/**
 * Cleans raw log data by removing ALL fields that are now in the normalized structure
 * This eliminates ALL duplications as per the new schema
 */
function cleanRawLogData(raw_log) {
    const cleaned = JSON.parse(JSON.stringify(raw_log));
    
    // Remove all fields that are now represented in the normalized structure
    const fieldsToRemove = [
        'user', 'host', 'source', 'destination', 'network.destination', 
        'process', 'process_parent', 'file', 'event.action', 'event.outcome',
        'Operation', 'Activity', 'ClientIP', 'UserId', 'UserKey',
        'timestamp', '@timestamp', 'CreationTime', 'EventTime',
        'agent.name', 'agent.hostname'
    ];

    fieldsToRemove.forEach(field => {
        deleteNestedProperty(cleaned, field);
    });

    // Remove any remaining duplicated content
    delete cleaned.analysis_notes;
    delete cleaned.message;
    
    return cleaned;
}

/**
 * Deletes a nested property using dot notation
 */
function deleteNestedProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) return;
        current = current[parts[i]];
    }
    delete current[parts[parts.length - 1]];
    
    // Clean up empty parent objects
    for (let i = parts.length - 2; i >= 0; i--) {
        const parentPath = parts.slice(0, i + 1);
        const parent = parentPath.reduce((acc, part) => acc && acc[part], obj);
        if (parent && Object.keys(parent).length === 0) {
            deleteNestedProperty(obj, parentPath.join('.'));
        }
    }
}

/**
 * Removes empty fields to keep JSON clean
 */
function removeEmptyFields(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined && value !== '' && value !== 'N/A') {
                const cleanedValue = removeEmptyFields(value);
                if (cleanedValue !== null && cleanedValue !== undefined) {
                    cleaned[key] = cleanedValue;
                }
            }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : null;
    }
    
    return obj;
}

/**
 * Creates a generic log when no specific generator exists
 */
function createGenericLog(dataSource, useCase, logOptions) {
    return {
        "@timestamp": logOptions.timestamp,
        "event": {
            "action": useCase.event_type || 'GenericEvent',
            "category": dataSource.toLowerCase(),
            "outcome": "unknown"
        },
        "tags": [dataSource.toLowerCase(), "generic"]
    };
}

/**
 * Creates an error log when generation fails
 */
function createErrorLog(dataSource, error, logOptions) {
    return {
        "@timestamp": logOptions.timestamp,
        "event": {
            "action": "GenerationError",
            "category": "error",
            "outcome": "failure"
        },
        "error": error,
        "tags": ["error", "generation_failed"]
    };
}