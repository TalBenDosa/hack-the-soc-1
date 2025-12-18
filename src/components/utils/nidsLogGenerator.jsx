import { InvokeLLM } from "@/integrations/Core";

/**
 * Generates highly realistic and detailed Network Intrusion Detection/Prevention System (NIDS/IPS) logs.
 * This generator covers various NIDS/IPS events like exploit attempts, malicious payload detection,
 * and policy violations with comprehensive field coverage.
 */
export class NIDSLogGenerator {
    constructor() {
        this.vendors = ['Snort', 'Suricata', 'Cisco Firepower', 'Palo Alto Networks', 'Fortinet FortiGate'];
        this.attackTypes = ['Exploit Attempt', 'Malicious Payload', 'Network Scan', 'Denial of Service', 'Policy Violation', 'Web Application Attack'];
        this.protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS', 'FTP', 'SMB'];
        this.severities = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
    }

    /**
     * Builds the comprehensive prompt for AI to generate realistic NIDS/IPS logs.
     * @param {number} count - Number of logs to generate.
     * @param {string} scenario - Specific NIDS/IPS scenario context.
     * @returns {string} Complete prompt for InvokeLLM.
     */
    buildNIDSPrompt(count, scenario) {
        return `
Generate ${count} realistic and diverse Network Intrusion Detection/Prevention System (NIDS/IPS) logs for cybersecurity training.

**Scenario Context:** ${scenario}

**CRITICAL REQUIREMENT:** Each generated log MUST contain ALL of the following fields with realistic, diverse, and randomized values. Logs should represent different types of network threats and alerts.

**Required Fields - ALL MUST BE PRESENT IN EVERY LOG:**

**🔑 General & Event Fields:**
- event_time (string: ISO 8601 format)
- event_type (string: intrusion, alert, exploit_attempt, malicious_payload)
- event_id (string: unique log identifier)
- sensor_id (string: unique sensor/appliance ID)
- vendor (string: e.g., Snort, Suricata, Cisco)
- product (string: e.g., Firepower, PAN-OS)
- product_version (string)
- log_source (string: Network Tap, Span Port, Virtual Sensor)
- severity (string: Critical, High, Medium, Low, Informational)
- priority (integer: 1-5)
- confidence_level (integer: 0-100)
- classification (string: e.g., A Network Trojan was detected)
- protocol (string: TCP, UDP, ICMP, etc.)

**🎯 Detection & Signature Fields:**
- signature_id (integer: e.g., 2001219)
- signature_name (string: e.g., ET POLICY PE EXE or DLL Windows file download)
- signature_revision (integer)
- attack_type (string: Exploit Attempt, Network Scan, etc.)
- attack_category (string: Web Application, Malware, Reconnaissance)
- threat_name (string)
- cve_id (string: CVE identifier if applicable, else null)
- reference_url (string: URL to vulnerability details)
- mitre_technique_id (string: e.g., T1190, T1059.001)
- mitre_tactic (string: e.g., Initial Access, Execution)
- malware_family (string, or null)
- rule_id (string)
- rule_action (string: alert, drop, reset, block)
- policy_id (integer)
- policy_name (string)

**🌐 Network & Communication Fields:**
- src_ip (string: source IP)
- src_port (integer: source port)
- src_mac (string: source MAC address)
- src_zone (string: e.g., Untrust, DMZ)
- dst_ip (string: destination IP)
- dst_port (integer: destination port)
- dst_mac (string: destination MAC address)
- dst_zone (string: e.g., Trust, Internal)
- interface_in (string)
- interface_out (string)
- direction (string: inbound, outbound, lateral)
- nat_src_ip (string, or null)
- nat_dst_ip (string, or null)
- application (string: http, dns, ssl)
- session_id (string)
- bytes_sent (integer)
- bytes_received (integer)
- packets_sent (integer)
- packets_received (integer)
- duration (integer: in seconds)
- tcp_flags (string: e.g., S, SA, FIN, PSH)

**🧠 Payload & Context Fields:**
- payload_snippet (string: hex or text representation of payload, or null)
- http_method (string: GET, POST, PUT, etc., or null)
- http_host (string: hostname from HTTP header)
- http_uri (string: requested URI path)
- user_agent (string)
- file_name (string, if applicable)
- file_type (string)
- file_hash_md5 (string, if applicable)
- file_hash_sha256 (string, if applicable)
- content_type (string)
- email_subject (string, if applicable)
- email_sender (string)
- email_recipient (string)

**🌍 GeoIP & ASN Fields:**
- geoip_src_country (string)
- geoip_src_region (string)
- geoip_dst_country (string)
- geoip_dst_region (string)
- asn (string: Autonomous System Number)
- organization (string: e.g., Google LLC, Amazon Web Services)
- isp (string)

**👤 User & Device Fields (if available):**
- user_name (string, or null)
- user_domain (string, or null)
- device_name (string, or null)
- device_id (string, or null)
- os_version (string, or null)
- endpoint_group (string, or null)

**🔄 Response & Remediation Fields:**
- action_taken (string: same as rule_action)
- action_status (string: success, failed)
- was_blocked (boolean)
- was_reset (boolean)
- was_alerted_only (boolean)
- was_dropped (boolean)
- response_time (integer: in milliseconds)
- remediation_status (string: Not Required, Successful, Failed)
- follow_up_required (boolean)

**Realism Guidelines:**
- Ensure all fields are present in every log. Use 'null' or 'N/A' only where contextually appropriate (e.g., email fields in a non-email protocol).
- The action_taken and was_blocked/was_dropped fields should be consistent with rule_action.
- event_type should align with signature_name and attack_type.

Generate a JSON array of these log objects.
`;
    }

    /**
     * Main function to generate logs using AI.
     * @param {number} count - The number of logs to generate.
     * @param {string} scenario - A hint for the type of logs to generate.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of log objects.
     */
    async generateLogs(count, scenario) {
        const prompt = this.buildNIDSPrompt(count, scenario);
        try {
            console.log('[NIDSLogGenerator] Generating NIDS/IPS logs with scenario:', scenario);
            const response = await InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        logs: {
                            type: "array",
                            items: { type: "object" }
                        }
                    }
                }
            });

            if (response && response.logs) {
                console.log(`[NIDSLogGenerator] Successfully generated ${response.logs.length} NIDS/IPS logs.`);
                return response.logs;
            }
            if (typeof response === 'string') {
                const parsed = JSON.parse(response);
                return parsed.logs || parsed;
            }
            return response.logs || response;
        } catch (error) {
            console.error("[NIDSLogGenerator] Failed to generate or parse NIDS/IPS logs:", error);
            return [{
                event_time: new Date().toISOString(),
                event_type: 'alert',
                signature_name: 'Error/Fallback NIDS Log',
                severity: 'High',
                action_taken: 'error',
                error_details: error.message
            }];
        }
    }
}

export const generateNIDSLogs = async (count, scenario) => {
    const generator = new NIDSLogGenerator();
    return await generator.generateLogs(count, scenario);
};

// Main export for backward compatibility - accepts options object
export const generateNidsLog = async (options = {}) => {
    const count = options.count || 1;
    const scenario = options.scenario || 'Generic network intrusion detection';
    const generator = new NIDSLogGenerator();
    const logs = await generator.generateLogs(count, scenario);
    return logs[0] || logs; // Return first log for single generation
};