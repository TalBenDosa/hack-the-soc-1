
import { getMalwareBazaarHash } from './threatIntelService'; // Import backend service

/**
 * Security Log Enhancer and Validator with Real Hash Integration
 * 
 * This function no longer rejects logs. Instead, it accepts any log,
 * auto-fixes missing fields, generates professional annotations based on
 * available data, and returns a quality score.
 */

async function validateAndAdjudicateSecurityLog(logData, context = {}) {
    // Add safety check for undefined logData
    if (!logData) {
        console.error('[SECURITY LOG VALIDATOR] Received undefined logData');
        return {
            validated_log: {
                title: "Unknown Event",
                description: "Log data was undefined",
                event_time: new Date().toISOString(),
                log_source: "Unknown"
            },
            verdict: 'FP',
            verdict_reason: 'Invalid log data',
            annotations: 'Log data was undefined or null',
            quality_report: {
                score: 0,
                enhanced_fields: [],
                validation_notes: ['Log data was undefined']
            }
        };
    }

    console.log('[SECURITY LOG VALIDATOR] Starting validation for:', logData.title || 'Unknown log');
    
    try {
        let validated_log = { ...logData };
        
        // Initialize required fields if missing
        if (!validated_log.title) {
            validated_log.title = validated_log.rule_description || "Security Event";
        }
        if (!validated_log.description) {
            validated_log.description = validated_log.notes || "No description available";
        }
        
        // Determine verdict based on log content
        let verdict = 'TP'; // Default to True Positive
        let verdict_reason = 'Suspicious activity detected';
        let enhanced_fields = [];
        let validation_notes = [];

        // Check for malicious indicators
        const logText = `${validated_log.title || ''} ${validated_log.description || ''}`.toLowerCase();
        
        if (logText.includes('malicious') || logText.includes('threat') || logText.includes('attack') || logText.includes('hash')) {
            verdict = 'TP';
            verdict_reason = 'Contains malicious indicators';
            
            // CRITICAL FIX: Always use backend function for malicious hashes
            try {
                const backendHash = await getMalwareBazaarHash();
                validated_log.file_hash = backendHash.sha256;
                validated_log.md5_hash = backendHash.md5;
                validated_log.threat_name = backendHash.name;
                enhanced_fields.push('file_hash', 'md5_hash', 'threat_name');
                console.log('[SECURITY LOG VALIDATOR] Added backend malicious hash:', backendHash.sha256.substring(0, 16) + '...');
            } catch (hashError) {
                console.error('[SECURITY LOG VALIDATOR] Failed to get backend hash:', hashError);
            }
        } else if (logText.includes('failed login') || logText.includes('authentication')) {
            verdict = Math.random() > 0.3 ? 'TP' : 'FP';
            verdict_reason = verdict === 'TP' ? 'Suspicious authentication activity' : 'Normal failed login attempt';
        } else if (logText.includes('routine') || logText.includes('normal') || logText.includes('legitimate')) {
            verdict = 'FP';
            verdict_reason = 'Normal business activity';
        }

        // Enhance log with additional fields
        if (!validated_log.event_time && !validated_log.timestamp) {
            validated_log.event_time = new Date().toISOString();
            enhanced_fields.push('event_time');
        }

        if (!validated_log.log_source) {
            validated_log.log_source = validated_log.source_type || 'Unknown';
            enhanced_fields.push('log_source');
        }

        // Quality scoring
        let quality_score = 70; // Base score
        
        if (validated_log.title && validated_log.title.length > 10) quality_score += 5;
        if (validated_log.description && validated_log.description.length > 50) quality_score += 10;
        if (validated_log.user_name && validated_log.user_name !== 'N/A') quality_score += 5;
        if (validated_log.source_ip && validated_log.source_ip !== 'N/A') quality_score += 5;
        if (validated_log.file_hash && validated_log.file_hash.length === 64) quality_score += 10;
        
        quality_score = Math.min(quality_score, 95);

        return {
            validated_log,
            verdict,
            verdict_reason: `${verdict} - ${verdict_reason}`,
            annotations: `Enhanced log with ${verdict} classification. ${verdict_reason}`,
            quality_report: {
                score: quality_score,
                enhanced_fields: enhanced_fields,
                validation_notes: validation_notes
            }
        };
        
    } catch (error) {
        console.error('[SECURITY LOG VALIDATOR] Validation failed:', error);
        return {
            validated_log: logData || {
                title: "Error Processing Log",
                description: "Validation encountered an error",
                event_time: new Date().toISOString()
            },
            verdict: 'TP',
            verdict_reason: 'Validation failed - assumed True Positive',
            annotations: 'Log processing encountered errors but maintained for scenario',
            quality_report: {
                score: 50,
                enhanced_fields: [],
                validation_notes: ['Validation error occurred']
            }
        };
    }
}

export { validateAndAdjudicateSecurityLog };
