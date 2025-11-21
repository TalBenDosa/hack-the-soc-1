import { InvokeLLM } from "@/integrations/Core";

/**
 * Generates highly realistic and detailed Windows Security Event Logs.
 * This generator covers multiple categories including logon events, user management,
 * policy changes, file access, and Kerberos activity, with all relevant fields.
 */
export class AdvancedLogGenerator {
    constructor() {
        this.sampleUsernames = ['j.smith', 'a.jones', 'b.williams', 'm.brown', 'd.davis', 'Administrator', 'Guest', 'svc_backup', 'svc_sql'];
        this.sampleHostnames = ['DC01', 'SRV-APP01', 'SRV-WEB02', 'DESKTOP-ABC123', 'LAPTOP-XYZ789', 'WS-FIN-05'];
        this.sampleDomains = ['CORP', 'AD', 'INTERNAL'];
        this.sampleProcessNames = ['svchost.exe', 'explorer.exe', 'lsass.exe', 'services.exe', 'userinit.exe', 'winlogon.exe', 'mmc.exe'];
        this.sampleGroupNames = ['Domain Admins', 'Enterprise Admins', 'Server Operators', 'Finance Dept', 'HR Team'];
        this.sampleGPONames = ['Default Domain Policy', 'Password Policy', 'Firewall Settings', 'Desktop Wallpaper Policy'];
        this.sampleFilePaths = ['C:\\confidential\\project_x.docx', 'D:\\HR\\salaries_q4.xlsx', 'C:\\Windows\\System32\\ntdll.dll', 'C:\\Users\\a.jones\\Documents\\report.pdf'];
    }

    /**
     * Builds the detailed prompt for the AI to generate Windows logs.
     * @param {number} count - The number of logs to generate.
     * @param {string} scenario - The specific scenario to generate logs for.
     * @returns {string} The complete prompt for the InvokeLLM integration.
     */
    buildPrompt(count, scenario) {
        return `
Generate ${count} realistic and diverse Windows Security Event Logs for the following scenario: **${scenario}**.

**CRITICAL REQUIREMENT:** Each generated log MUST be structured accurately based on its EventID. You MUST include all relevant fields for that specific event type. Also, include all "General Fields" in every single log.

---
### LOG CATEGORIES AND REQUIRED FIELDS ###

**1. Logon Events (EventIDs: 4624, 4625, 4776, 4768)**
*   **Fields:** EventID, LogonType, LogonProcessName, AuthenticationPackageName, Status, SubStatus, TargetUserName, TargetDomainName, TargetSid, WorkstationName, IpAddress, IpPort, LogonGuid, TransmittedServices, LmPackageName, KeyLength, ProcessName, ProcessId, ImpersonationLevel, RestrictedAdminMode, AuthenticationLevel, CallerProcessName, SubjectUserSid, SubjectUserName, SubjectDomainName, SubjectLogonId, LogonId.

**2. User/Group Management (EventIDs: 4720, 4722, 4724, 4732, 4767)**
*   **Fields:** EventID, TargetUserName, TargetDomainName, TargetSid, SamAccountName, DisplayName, UserPrincipalName, GroupName, GroupDomain, GroupSid, MemberSid, MemberName, ChangedAttributes, OldValue, NewValue, SubjectUserSid, SubjectUserName, SubjectDomainName, SubjectLogonId, CallerProcessName, ProcessId.

**3. GPO/Privilege Changes (EventIDs: 4739, 4704, 4719)**
*   **Fields:** EventID, PrivilegeList, PolicyChanged, GPOName, GPODomain, GPOSid, OldValue, NewValue, SubjectUserName, SubjectUserSid, SubjectDomainName, SubjectLogonId.

**4. File/Object Access (EventIDs: 4663, 4656, 4670)**
*   **Fields:** EventID, ObjectName, ObjectType, AccessMask, AccessList, HandleId, ProcessId, ProcessName, SubjectUserName, SubjectDomainName, SubjectUserSid, SubjectLogonId.

**5. Kerberos Events (EventIDs: 4768, 4769, 4771)**
*   **Fields:** EventID, TargetUserName, TargetDomainName, ServiceName, TicketOptions, Status, FailureCode, IpAddress, IpPort, SubjectUserName, SubjectDomainName, SubjectUserSid, SubjectLogonId.

**General Fields (MUST be in EVERY event):**
*   TimeGenerated, ComputerName, EventRecordID, EventData, Keywords, TaskCategory, Level, Opcode, Channel, ProviderName, SecurityId, Message (the full event message text).

---
**INSTRUCTIONS:**
- Generate a JSON array of log objects.
- Ensure data is realistic (e.g., SIDs start with S-1-5, GUIDs are in correct format).
- For failure events (like 4625, 4771), use appropriate non-zero Status/FailureCode values.
- Make the 'Message' field a descriptive text that summarizes the event, consistent with real Windows logs.
- Randomize all values like usernames, hostnames, IPs, SIDs, and timestamps to create a diverse dataset.
`;
    }

    /**
     * Main function to generate logs using AI, with a robust fallback.
     * @param {number} count - The number of logs to generate.
     * @param {string} scenario - A hint for the type of logs to generate (e.g., 'logon_failure', 'user_created', 'all').
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of log objects.
     */
    async generateWindowsSecurityLogs(count = 10, scenario = 'mixed_activity') {
        const prompt = this.buildPrompt(count, scenario);
        const schema = this.getLogSchema();
        
        try {
            const response = await InvokeLLM({
                prompt,
                response_json_schema: schema,
                add_context_from_internet: false // Not needed for this task
            });

            if (response && response.logs && Array.isArray(response.logs)) {
                return response.logs;
            } else {
                console.warn('[LogGenerator] AI response format unexpected, using fallback.');
                return this.generateFallbackLogs(count, scenario);
            }
        } catch (error) {
            console.error('[LogGenerator] AI generation failed:', error);
            return this.generateFallbackLogs(count, scenario);
        }
    }

    /**
     * Defines the JSON schema for the expected AI response.
     * @returns {Object} The JSON schema definition.
     */
    getLogSchema() {
        // A comprehensive schema covering all possible fields.
        // All fields are optional to allow the AI to construct different event types.
        const allFields = {
            // General
            EventID: { type: "integer" }, TimeGenerated: { type: "string", format: "date-time" }, ComputerName: { type: "string" }, EventRecordID: { type: "integer" },
            EventData: { type: "string" }, Keywords: { type: "string" }, TaskCategory: { type: "string" }, Level: { type: "string" },
            Opcode: { type: "string" }, Channel: { type: "string" }, ProviderName: { type: "string" }, SecurityId: { type: "string" }, Message: { type: "string" },
            // Logon
            LogonType: { type: "integer" }, LogonProcessName: { type: "string" }, AuthenticationPackageName: { type: "string" }, Status: { type: "string" },
            SubStatus: { type: "string" }, TargetUserName: { type: "string" }, TargetDomainName: { type: "string" }, TargetSid: { type: "string" },
            WorkstationName: { type: "string" }, IpAddress: { type: "string" }, IpPort: { type: "string" }, LogonGuid: { type: "string" },
            TransmittedServices: { type: "string" }, LmPackageName: { type: "string" }, KeyLength: { type: "integer" }, ProcessName: { type: "string" },
            ProcessId: { type: "string" }, ImpersonationLevel: { type: "string" }, RestrictedAdminMode: { type: "string" }, AuthenticationLevel: { type: "string" },
            CallerProcessName: { type: "string" }, SubjectUserSid: { type: "string" }, SubjectUserName: { type: "string" }, SubjectDomainName: { type: "string" },
            SubjectLogonId: { type: "string" }, LogonId: { type: "string" },
            // User/Group
            SamAccountName: { type: "string" }, DisplayName: { type: "string" }, UserPrincipalName: { type: "string" }, GroupName: { type: "string" },
            GroupDomain: { type: "string" }, GroupSid: { type: "string" }, MemberSid: { type: "string" }, MemberName: { type: "string" },
            ChangedAttributes: { type: "string" }, OldValue: { type: "string" }, NewValue: { type: "string" },
            // GPO/Privilege
            PrivilegeList: { type: "string" }, PolicyChanged: { type: "string" }, GPOName: { type: "string" }, GPODomain: { type: "string" }, GPOSid: { type: "string" },
            // File Access
            ObjectName: { type: "string" }, ObjectType: { type: "string" }, AccessMask: { type: "string" }, AccessList: { type: "string" }, HandleId: { type: "string" },
            // Kerberos
            ServiceName: { type: "string" }, TicketOptions: { type: "string" }, FailureCode: { type: "string" },
        };

        return {
            type: "object",
            properties: {
                logs: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: allFields
                    }
                }
            }
        };
    }

    // --- FALLBACK GENERATION LOGIC ---

    generateFallbackLogs(count, scenario) {
        const logs = [];
        const scenarios = ['logon', 'user_management', 'policy', 'file_access', 'kerberos'];
        for (let i = 0; i < count; i++) {
            let currentScenario = scenario;
            if (scenario === 'mixed_activity' || !scenarios.includes(scenario)) {
                currentScenario = this.getRandom(scenarios);
            }
            switch (currentScenario) {
                case 'logon':
                    logs.push(this.generateSingleLogonEvent());
                    break;
                case 'user_management':
                    logs.push(this.generateSingleUserManagementEvent());
                    break;
                case 'policy':
                    logs.push(this.generateSingleGPOChangeEvent());
                    break;
                case 'file_access':
                    logs.push(this.generateSingleFileAccessEvent());
                    break;
                case 'kerberos':
                    logs.push(this.generateSingleKerberosEvent());
                    break;
                default:
                    logs.push(this.generateSingleLogonEvent());
            }
        }
        return logs;
    }

    createBaseEvent(eventId, level = 'Information') {
        const hostname = this.getRandom(this.sampleHostnames);
        return {
            EventID: eventId,
            TimeGenerated: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            ComputerName: `${hostname}.${this.getRandom(this.sampleDomains)}.local`,
            EventRecordID: Math.floor(Math.random() * 1000000) + 500000,
            Keywords: "0x8020000000000000",
            TaskCategory: "Logon",
            Level: level,
            Opcode: "Info",
            Channel: "Security",
            ProviderName: "Microsoft-Windows-Security-Auditing",
            SecurityId: "S-1-0-0",
        };
    }

    generateSingleLogonEvent() {
        const isSuccess = Math.random() > 0.3;
        const eventId = isSuccess ? 4624 : 4625;
        const user = this.getRandom(this.sampleUsernames);
        const domain = this.getRandom(this.sampleDomains);
        const base = this.createBaseEvent(eventId, isSuccess ? 'Information' : 'Audit Failure');
        const subjectUser = this.getRandom(this.sampleUsernames);

        return {
            ...base,
            LogonType: this.getRandom([2, 3, 10]),
            LogonProcessName: "Kerberos",
            AuthenticationPackageName: "Kerberos",
            Status: isSuccess ? "0x0" : "0xc000006d",
            SubStatus: isSuccess ? "0x0" : "0xc000006a",
            TargetUserName: user,
            TargetDomainName: domain,
            TargetSid: `S-1-5-21-${this.randNum(10)}-${this.randNum(10)}-${this.randNum(9)}-${this.randNum(4)}`,
            WorkstationName: this.getRandom(this.sampleHostnames),
            IpAddress: `192.168.${this.randNum(2)}.${this.randNum(3)}`,
            IpPort: this.randNum(5),
            LogonGuid: this.generateGuid(),
            SubjectUserSid: `S-1-5-21-${this.randNum(10)}-${this.randNum(10)}-${this.randNum(9)}-${this.randNum(4)}`,
            SubjectUserName: subjectUser,
            SubjectDomainName: domain,
            SubjectLogonId: "0x" + this.randHex(5),
            LogonId: "0x" + this.randHex(8),
            Message: isSuccess ? `An account was successfully logged on. User: ${user}` : `An account failed to log on. User: ${user}`,
        };
    }

    generateSingleUserManagementEvent() {
        const eventId = this.getRandom([4720, 4732]); // User Created, Member Added to Group
        const base = this.createBaseEvent(eventId);
        const subjectUser = this.getRandom(this.sampleUsernames);
        const targetUser = `new.user${this.randNum(3)}`;

        if (eventId === 4720) { // User Created
            return {
                ...base,
                TargetUserName: targetUser,
                TargetDomainName: base.ComputerName.split('.')[1],
                TargetSid: `S-1-5-21-...-${this.randNum(4)}`,
                SamAccountName: targetUser,
                SubjectUserName: subjectUser,
                Message: `A user account was created: ${targetUser} by ${subjectUser}.`,
            };
        } else { // Member Added to Group
            return {
                ...base,
                GroupName: this.getRandom(this.sampleGroupNames),
                MemberName: targetUser,
                SubjectUserName: subjectUser,
                Message: `User ${targetUser} was added to group ${this.getRandom(this.sampleGroupNames)} by ${subjectUser}.`,
            };
        }
    }
    
    generateSingleGPOChangeEvent() {
        const base = this.createBaseEvent(4739); // GPO Change
        return {
            ...base,
            GPOName: this.getRandom(this.sampleGPONames),
            GPODomain: base.ComputerName.split('.')[1] + '.local',
            SubjectUserName: 'Administrator',
            Message: `Group Policy Object "${this.getRandom(this.sampleGPONames)}" was changed.`
        };
    }
    
    generateSingleFileAccessEvent() {
        const base = this.createBaseEvent(4663); // Attempt to access an object
        const user = this.getRandom(this.sampleUsernames);
        return {
            ...base,
            ObjectName: this.getRandom(this.sampleFilePaths),
            ObjectType: "File",
            AccessMask: "0x2", // WriteData
            ProcessName: `C:\\Windows\\System32\\${this.getRandom(this.sampleProcessNames)}`,
            ProcessId: "0x" + this.randHex(4),
            SubjectUserName: user,
            Message: `An attempt was made to access an object. Subject: ${user}, Object: ${this.getRandom(this.sampleFilePaths)}`
        };
    }

    generateSingleKerberosEvent() {
        const isSuccess = Math.random() > 0.4;
        const eventId = isSuccess ? 4768 : 4771; // TGT request, Kerberos pre-authentication failed
        const base = this.createBaseEvent(eventId, isSuccess ? 'Information' : 'Audit Failure');
        const user = this.getRandom(this.sampleUsernames);
        return {
            ...base,
            TargetUserName: user,
            ServiceName: isSuccess ? `krbtgt/${base.ComputerName.split('.')[1].toUpperCase()}` : user,
            Status: isSuccess ? '0x0' : '0x18',
            FailureCode: isSuccess ? '0x0' : '0x18',
            IpAddress: `192.168.${this.randNum(2)}.${this.randNum(3)}`,
            Message: isSuccess ? `A Kerberos authentication ticket (TGT) was requested for user ${user}` : `Kerberos pre-authentication failed for user ${user}`
        };
    }


    // --- HELPER METHODS ---

    getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    randNum(digits) {
        return Math.floor(Math.random() * (10 ** digits));
    }
    
    randHex(len) {
        let maxlen = 8,
            min = Math.pow(16, Math.min(len, maxlen) - 1),
            max = Math.pow(16, Math.min(len, maxlen)) - 1,
            n = Math.floor(Math.random() * (max - min + 1)) + min,
            r = n.toString(16);
        while (r.length < len) {
            r = r + this.randHex(len - maxlen);
        }
        return r;
    }

    generateGuid() {
        return `${this.randHex(8)}-${this.randHex(4)}-${this.randHex(4)}-${this.randHex(4)}-${this.randHex(12)}`;
    }
}

// Export singleton instance for easy import
export const advancedLogGenerator = new AdvancedLogGenerator();

// Export main function for direct usage
export const generateWindowsSecurityLogs = (count, scenario) =>
    advancedLogGenerator.generateWindowsSecurityLogs(count, scenario);

export default AdvancedLogGenerator;