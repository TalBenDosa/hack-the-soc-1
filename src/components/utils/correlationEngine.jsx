import { InvokeLLM } from '@/integrations/Core';
import { dataSourceDefinitions } from './dataSourceProvider';
import { generateLogForUseCase } from './scenarioLogGenerator';
import { generateConsistentLog } from './IntelligentLogGenerator';
import { classifyEvent, validateScenarioBalance } from './eventClassificationEngine';

/**
 * CorrelationEngine V8 - Now uses the new Event Classification Schema
 */
export class CorrelationEngine {

    async generateInvestigationScenario(difficulty = null, topic = null) {
        const timestamp = Date.now();
        console.log(`[CorrelationEngine] Generating scenario with new classification schema at ${timestamp}`);

        try {
            // ✅ RANDOMIZE DIFFICULTY
            const allDifficulties = ["Easy", "Medium", "Hard", "Advanced"];
            const randomDifficulty = allDifficulties[Math.floor(Math.random() * allDifficulties.length)];

            // ✅ DEFINE ATTACK SCENARIOS WITH PROPER EVENT CLASSIFICATION
            const attackScenarios = [
                {
                    theme: "Phishing to Malware Campaign",
                    // True Positives: זדוניים ברורים
                    maliciousEvents: ['PHISHING_EMAIL_RECEIVED', 'SUSPICIOUS_LINK_CLICKED', 'EDR_MALICIOUS_FILE_DETECTED', 'BRUTE_FORCE_ATTEMPT'],
                    // False Positive: בדיוק 1
                    falsePositiveEvent: 'ADMIN_SCRIPT_EXECUTION',
                    // Escalate to Tier 2: מצריכים חקירה
                    escalateEvents: ['SUSPICIOUS_LOGIN_OFFHOURS', 'PORT_SCAN_DETECTED', 'AD_USER_ADDED_TO_ADMIN_GROUP'],
                    category: "Malware",
                    companies: ["TechCorp Industries", "Global Finance Ltd", "Healthcare Solutions Inc"]
                },
                {
                    theme: "Advanced Persistent Threat", 
                    maliciousEvents: ['EDR_MALICIOUS_FILE_DETECTED', 'BRUTE_FORCE_ATTEMPT', 'SUSPICIOUS_LINK_CLICKED'],
                    falsePositiveEvent: 'SOFTWARE_UPDATE',
                    escalateEvents: ['SUSPICIOUS_LOGIN_OFFHOURS', 'AD_ACCOUNT_LOCKOUT', 'PROXY_MALICIOUS_DOWNLOAD_BLOCKED', 'FW_SUSPICIOUS_CONNECTION'],
                    category: "Network Intrusion",
                    companies: ["CyberDefense Group", "Enterprise Networks", "Cloud Solutions Inc"]
                },
                {
                    theme: "Insider Threat Investigation",
                    maliciousEvents: ['PHISHING_EMAIL_RECEIVED', 'BRUTE_FORCE_ATTEMPT'],
                    falsePositiveEvent: 'INTERNAL_APP_ACCESS',
                    escalateEvents: ['SUSPICIOUS_LOGIN_OFFHOURS', 'AD_USER_ADDED_TO_ADMIN_GROUP', 'AD_ACCOUNT_LOCKOUT', 'PORT_SCAN_DETECTED', 'PROXY_MALICIOUS_DOWNLOAD_BLOCKED'],
                    category: "Insider Threat",
                    companies: ["SecureBank Corp", "DataVault Systems", "National Security LLC"]
                }
            ];

            const selectedScenario = attackScenarios[Math.floor(Math.random() * attackScenarios.length)];
            const selectedCompany = selectedScenario.companies[Math.floor(Math.random() * selectedScenario.companies.length)];
            
            console.log(`[CorrelationEngine] Selected scenario: ${selectedScenario.theme} at ${selectedCompany}`);

            // ✅ GENERATE UNIQUE RESOURCE POOLS
            const userPool = this.generateRandomUserPool();
            const devicePool = this.generateRandomDevicePool();
            const ipPool = this.generateRandomIPPool();
            const domainPool = this.generateRandomMaliciousDomains();

            const allEvents = [];
            const usedCombinations = new Set();

            // ✅ STEP 1: CREATE TRUE POSITIVE EVENTS (3-4 events)
            const tpCount = Math.min(selectedScenario.maliciousEvents.length, 4);
            console.log(`[CorrelationEngine] Creating ${tpCount} True Positive events`);

            for (let i = 0; i < tpCount; i++) {
                const eventType = selectedScenario.maliciousEvents[i];
                const eventData = this.generateUniqueEvent(
                    eventType, userPool, devicePool, ipPool, domainPool, 
                    usedCombinations, i * 5 // 5 minute intervals
                );
                
                // ✅ USE NEW CLASSIFICATION ENGINE
                const classification = classifyEvent(eventType);
                const logData = {
                    ...eventData,
                    // Add classification metadata
                    verdict: classification.verdict,
                    justification: classification.reasoning,
                    default_classification: classification.default_classification,
                    verdict_confidence: classification.confidence,
                    admin_notes: classification.admin_notes
                };

                allEvents.push(logData);
                console.log(`[CorrelationEngine] Added TP event: ${eventType} -> ${classification.classification}`);
            }

            // ✅ STEP 2: ADD EXACTLY 1 FALSE POSITIVE
            const fpEventType = selectedScenario.falsePositiveEvent;
            const fpEventData = this.generateUniqueEvent(
                fpEventType, userPool, devicePool, ipPool, domainPool,
                usedCombinations, (tpCount + 1) * 5
            );
            
            const fpClassification = classifyEvent(fpEventType);
            const fpLogData = {
                ...fpEventData,
                verdict: fpClassification.verdict,
                justification: fpClassification.reasoning, 
                default_classification: fpClassification.default_classification,
                verdict_confidence: fpClassification.confidence,
                admin_notes: fpClassification.admin_notes
            };

            allEvents.push(fpLogData);
            console.log(`[CorrelationEngine] Added FP event: ${fpEventType} -> ${fpClassification.classification}`);

            // ✅ STEP 3: ADD ESCALATE TO TIER 2 EVENTS (fill to 10 total)
            const remainingSlots = 10 - allEvents.length;
            const escalateEventsNeeded = Math.min(remainingSlots, selectedScenario.escalateEvents.length);
            
            console.log(`[CorrelationEngine] Adding ${escalateEventsNeeded} Escalate to Tier 2 events`);

            for (let i = 0; i < escalateEventsNeeded; i++) {
                const eventType = selectedScenario.escalateEvents[i];
                const eventData = this.generateUniqueEvent(
                    eventType, userPool, devicePool, ipPool, domainPool,
                    usedCombinations, (allEvents.length + 1) * 5
                );

                const escalateClassification = classifyEvent(eventType);
                const escalateLogData = {
                    ...eventData,
                    verdict: escalateClassification.verdict,
                    justification: escalateClassification.reasoning,
                    default_classification: escalateClassification.default_classification,
                    verdict_confidence: escalateClassification.confidence,
                    admin_notes: escalateClassification.admin_notes
                };

                allEvents.push(escalateLogData);
                console.log(`[CorrelationEngine] Added Escalate event: ${eventType} -> ${escalateClassification.classification}`);
            }

            // ✅ STEP 4: VALIDATE SCENARIO BALANCE
            const balanceValidation = validateScenarioBalance(allEvents);
            console.log('[CorrelationEngine] Scenario balance validation:', balanceValidation);

            if (!balanceValidation.isBalanced) {
                console.warn('[CorrelationEngine] Scenario is not properly balanced:', balanceValidation.recommendations);
            }

            // ✅ STEP 5: SHUFFLE EVENTS TO AVOID PREDICTABLE PATTERNS
            const shuffledEvents = this.shuffleArray([...allEvents]);

            // ✅ STEP 6: GENERATE SCENARIO NARRATIVE USING AI
            const scenarioData = await this.generateScenarioNarrative(
                selectedScenario.theme, 
                selectedCompany,
                randomDifficulty,
                selectedScenario.category,
                balanceValidation
            );

            // ✅ RETURN COMPLETE SCENARIO
            const finalScenario = {
                ...scenarioData,
                difficulty: randomDifficulty,
                category: selectedScenario.category,
                logs: shuffledEvents,
                total_logs: shuffledEvents.length,
                data_sources_used: [...new Set(shuffledEvents.map(log => log.log_source))],
                final_verdict: {
                    verdict: "Mixed Analysis Required",
                    true_positives: balanceValidation.truePositives,
                    false_positives: balanceValidation.falsePositives,
                    escalate_count: balanceValidation.escalateToTier2
                },
                investigation_summary: `תרחיש ${selectedScenario.theme} עם ${balanceValidation.truePositives} איומים אמיתיים, ${balanceValidation.falsePositives} חיובי שגוי, ו-${balanceValidation.escalateToTier2} אירועים הדורשים חקירה נוספת.`,
                correlation_id: `CORR-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
            };

            console.log(`[CorrelationEngine] Generated complete scenario with proper classification balance`);
            return finalScenario;

        } catch (error) {
            console.error('[CorrelationEngine] Error generating scenario:', error);
            throw error;
        }
    }

    // ✅ HELPER METHOD: Generate unique event to prevent duplicates
    generateUniqueEvent(eventType, userPool, devicePool, ipPool, domainPool, usedCombinations, timeOffsetMinutes) {
        let attempts = 0;
        let eventData;
        let combinationKey;

        do {
            const randomUser = userPool[Math.floor(Math.random() * userPool.length)];
            const randomDevice = devicePool[Math.floor(Math.random() * devicePool.length)];
            const randomIp = ipPool[Math.floor(Math.random() * ipPool.length)];
            const randomDomain = domainPool[Math.floor(Math.random() * domainPool.length)];

            // Generate the event using the intelligent log generator
            eventData = generateConsistentLog({
                type: eventType,
                targetUser: randomUser,
                targetDevice: randomDevice,
                sourceIp: randomIp,
                maliciousDomain: randomDomain,
                timestampOffsetMinutes: timeOffsetMinutes + Math.floor(Math.random() * 10) // Add some randomness to timing
            });

            // Create a unique key to prevent duplicates
            combinationKey = `${eventType}-${randomUser}-${randomDevice}-${eventData.story_context?.substring(0, 50)}`;
            attempts++;

        } while (usedCombinations.has(combinationKey) && attempts < 10);

        if (attempts >= 10) {
            console.warn(`[CorrelationEngine] Could not generate unique combination for ${eventType}, using last attempt`);
        }

        usedCombinations.add(combinationKey);
        return eventData;
    }

    // ✅ HELPER METHOD: Generate random user pool
    generateRandomUserPool() {
        const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'Chris', 'Anna', 'James', 'Maria'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Wilson'];
        
        const users = [];
        for (let i = 0; i < 8; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            users.push(`${firstName.charAt(0).toLowerCase()}.${lastName.toLowerCase()}`);
        }
        return users;
    }

    // ✅ HELPER METHOD: Generate random device pool
    generateRandomDevicePool() {
        const deviceTypes = ['DESKTOP', 'LAPTOP', 'SERVER', 'WORKSTATION'];
        const deviceSuffixes = ['01', '02', '03', '04', '05', 'A1', 'B2', 'X9'];
        
        const devices = [];
        for (let i = 0; i < 8; i++) {
            const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
            const suffix = deviceSuffixes[Math.floor(Math.random() * deviceSuffixes.length)];
            devices.push(`${type}-${suffix}`);
        }
        return devices;
    }

    // ✅ HELPER METHOD: Generate random IP pool
    generateRandomIPPool() {
        const ips = [];
        for (let i = 0; i < 10; i++) {
            const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
            ips.push(ip);
        }
        return ips;
    }

    // ✅ HELPER METHOD: Generate malicious domain pool
    generateRandomMaliciousDomains() {
        return [
            'malicious-site.com',
            'fake-bank.net',
            'phishing-portal.org',
            'suspicious-domain.co',
            'evil-payload.biz',
            'threat-actor.info',
            'bad-downloads.net',
            'malware-host.com'
        ];
    }

    // ✅ HELPER METHOD: Shuffle array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ✅ HELPER METHOD: Generate scenario narrative using AI
    async generateScenarioNarrative(theme, company, difficulty, category, balanceStats) {
        try {
            const prompt = `
Create a cybersecurity investigation scenario with the following parameters:
- Theme: ${theme}
- Company: ${company}
- Difficulty: ${difficulty}
- Category: ${category}
- Events: ${balanceStats.truePositives} true positives, ${balanceStats.falsePositives} false positive, ${balanceStats.escalateToTier2} escalation events

Generate a JSON response with:
1. scenario_name: Creative and specific title for this investigation
2. scenario_description: Detailed background story explaining what happened at the company
3. investigation_summary: Brief summary of what the analyst should expect to find

Make it realistic and engaging for SOC analysts training.
`;

            const response = await InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        scenario_name: { type: "string" },
                        scenario_description: { type: "string" },
                        investigation_summary: { type: "string" }
                    }
                }
            });

            return response;

        } catch (error) {
            console.error('[CorrelationEngine] Error generating AI narrative:', error);
            
            // Fallback narrative
            return {
                scenario_name: `${theme} at ${company}`,
                scenario_description: `A security incident has been detected at ${company}. The SOC team needs to investigate ${balanceStats.truePositives} suspicious events, identify ${balanceStats.falsePositives} false positive, and escalate ${balanceStats.escalateToTier2} events for further analysis.`,
                investigation_summary: `Investigate the sequence of events to determine the scope and impact of the ${category.toLowerCase()} incident.`
            };
        }
    }
}