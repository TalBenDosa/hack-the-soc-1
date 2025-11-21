// --- Data Pools for Realistic Randomization ---
const usernames = ["j.doe", "a.smith", "m.williams", "svc_webapp", "admin_corp", "test_user", "SYSTEM"];
const domains = ["CORP", "LAB", "DEV", "PROD"];
const hostnames = ["DC01", "DC02", "WEBSRV01", "SQLSRV05", "CLIENT-W11-23", "APP-SVR-11"];
const logonProcesses = ["Kerberos", "Advapi", "NtLmSsp", "User32"];
const authPackages = ["Kerberos", "NTLM", "Negotiate"];
const groupNames = ["Domain Admins", "Enterprise Admins", "Schema Admins", "Account Operators", "Sales_Users", "Developers_Group"];
const processNames = ["lsass.exe", "services.exe", "winlogon.exe", "svchost.exe", "userinit.exe", "powershell.exe"];
const accessMasks = ["0x1", "0x2", "0x10000", "0x10002", "0x120089", "0x1f01ff"];
const kerberosFailureCodes = ["0x6", "0x7", "0x9", "0x12", "0x17", "0x18", "0x20"];

const eventCategories = {
    logon: [4624, 4625, 4776, 4768],
    user_management: [4720, 4722, 4723, 4724, 4725, 4726, 4732, 4733, 4740, 4767],
    gpo_change: [4739, 4704, 4705, 4717, 4719],
    file_access: [4663, 4656, 4670],
    kerberos: [4768, 4769, 4771, 4776]
};

// --- Helper Functions ---
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateRandomIP = (isLocal = false) => isLocal
    ? `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`
    : `${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
const generatePID = () => Math.floor(Math.random() * 60000) + 1000;
const generateGUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});
const generateSID = (domain, rid) => `S-1-5-21-${Math.floor(Math.random() * 1e9)}-${Math.floor(Math.random() * 1e9)}-${Math.floor(Math.random() * 1e9)}-${rid || (Math.floor(Math.random() * 8000) + 1000)}`;
const toHex = (val) => `0x${val.toString(16)}`;

// --- Category-Specific Log Generators ---

const _generateLogonEvent = (options) => {
    const eventID = options.eventID || getRandomElement(eventCategories.logon);
    const isSuccess = eventID === 4624;
    const user = getRandomElement(usernames);
    const domain = getRandomElement(domains);

    return {
        EventID: eventID,
        LogonType: getRandomElement([2, 3, 10]),
        LogonProcessName: getRandomElement(logonProcesses),
        AuthenticationPackageName: getRandomElement(authPackages),
        Status: isSuccess ? toHex(0) : toHex(3221225578), // 0xc000006a
        SubStatus: isSuccess ? toHex(0) : toHex(3221225582), // 0xc000006e
        TargetUserName: user,
        TargetDomainName: domain,
        TargetSid: generateSID(domain),
        WorkstationName: getRandomElement(hostnames),
        IpAddress: generateRandomIP(),
        IpPort: Math.floor(Math.random() * 20000) + 40000,
        LogonGuid: generateGUID(),
        TransmittedServices: '-',
        LmPackageName: '-',
        KeyLength: 0,
        ProcessName: `C:\\Windows\\System32\\${getRandomElement(processNames)}`,
        ProcessId: toHex(generatePID()),
        ImpersonationLevel: '%%1833', // Impersonation
        RestrictedAdminMode: 'No',
        AuthenticationLevel: '6',
        CallerProcessName: '-',
        SubjectUserSid: `S-1-0-0`,
        SubjectUserName: '-',
        SubjectDomainName: '-',
        SubjectLogonId: toHex(0),
        LogonId: toHex(Math.floor(Math.random() * 1e8)),
        SourceNetworkAddress: generateRandomIP(),
        SourcePort: Math.floor(Math.random() * 20000) + 40000,
    };
};

const _generateUserManagementEvent = (options) => {
    const eventID = options.eventID || getRandomElement(eventCategories.user_management);
    const subjectUser = getRandomElement(usernames.filter(u => u.includes('admin')));
    const subjectDomain = getRandomElement(domains);
    const targetUser = getRandomElement(usernames);
    const targetDomain = getRandomElement(domains);
    const group = getRandomElement(groupNames);

    return {
        EventID: eventID,
        TargetUserName: targetUser,
        TargetDomainName: targetDomain,
        TargetSid: generateSID(targetDomain),
        SamAccountName: targetUser,
        DisplayName: targetUser.replace('.', ' ').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        UserPrincipalName: `${targetUser}@${targetDomain}.local`,
        GroupName: group,
        GroupDomain: targetDomain,
        GroupSid: generateSID(targetDomain, 512), // Domain Admins RID
        MemberSid: generateSID(targetDomain),
        MemberName: `${targetDomain}\\${targetUser}`,
        ChangedAttributes: 'userAccountControl',
        OldValue: toHex(514), // Disabled
        NewValue: toHex(512), // Enabled
        SubjectUserSid: generateSID(subjectDomain),
        SubjectUserName: subjectUser,
        SubjectDomainName: subjectDomain,
        SubjectLogonId: toHex(Math.floor(Math.random() * 1e8)),
        CallerProcessName: `C:\\Windows\\System32\\${getRandomElement(processNames)}`,
        ProcessId: toHex(generatePID()),
    };
};

const _generateGPOChangeEvent = (options) => {
    const eventID = options.eventID || getRandomElement(eventCategories.gpo_change);
    const subjectUser = getRandomElement(usernames.filter(u => u.includes('admin')));
    const subjectDomain = getRandomElement(domains);

    return {
        EventID: eventID,
        PrivilegeList: 'SeSecurityPrivilege',
        PolicyChanged: 'System Access',
        GPOName: 'Default Domain Policy',
        GPODomain: subjectDomain,
        GPOSid: generateSID(subjectDomain, 512),
        OldValue: 'Audit: Force audit policy subcategory settings (Windows Vista or later) to override audit policy category settings. = Disabled',
        NewValue: 'Audit: Force audit policy subcategory settings (Windows Vista or later) to override audit policy category settings. = Enabled',
        SubjectUserName: subjectUser,
        SubjectUserSid: generateSID(subjectDomain),
        SubjectDomainName: subjectDomain,
        SubjectLogonId: toHex(Math.floor(Math.random() * 1e8)),
    };
};

const _generateFileAccessEvent = (options) => {
    const eventID = options.eventID || getRandomElement(eventCategories.file_access);
    const user = getRandomElement(usernames);
    const domain = getRandomElement(domains);
    const process = getRandomElement(processNames);
    
    return {
        EventID: eventID,
        ObjectName: 'C:\\SensitiveData\\Financials_Q4.xlsx',
        ObjectType: 'File',
        AccessMask: getRandomElement(accessMasks),
        AccessList: '%%4416', // ReadData
        HandleId: toHex(Math.floor(Math.random() * 1e8)),
        ProcessId: toHex(generatePID()),
        ProcessName: `C:\\Windows\\System32\\${process}`,
        SubjectUserName: user,
        SubjectDomainName: domain,
        SubjectUserSid: generateSID(domain),
        SubjectLogonId: toHex(Math.floor(Math.random() * 1e8)),
    };
};

const _generateKerberosEvent = (options) => {
    const eventID = options.eventID || getRandomElement(eventCategories.kerberos);
    const isFailure = eventID === 4771;
    const user = getRandomElement(usernames);
    const domain = getRandomElement(domains);

    return {
        EventID: eventID,
        TargetUserName: user,
        TargetDomainName: domain,
        ServiceName: isFailure ? `krbtgt/${domain}` : `cifs/${getRandomElement(hostnames)}`,
        TicketOptions: toHex(1073741824), // 0x40000000
        Status: isFailure ? getRandomElement(kerberosFailureCodes) : toHex(0),
        FailureCode: isFailure ? getRandomElement(kerberosFailureCodes) : toHex(0),
        IpAddress: `::ffff:${generateRandomIP()}`,
        IpPort: Math.floor(Math.random() * 20000) + 40000,
        SubjectUserName: user,
        SubjectDomainName: domain,
        SubjectUserSid: generateSID(domain),
        SubjectLogonId: toHex(Math.floor(Math.random() * 1e8)),
    };
};

/**
 * Generates a realistic, randomized Active Directory / Domain Controller log.
 * @param {object} options - Options to customize the log. Can specify 'category' or 'eventID'.
 * @returns {object} A comprehensive AD/DC log object.
 */
export const generateActiveDirectoryLog = (options = {}) => {
    const category = options.category || getRandomElement(Object.keys(eventCategories));
    let specificEventData;

    switch (category) {
        case 'user_management':
            specificEventData = _generateUserManagementEvent(options);
            break;
        case 'gpo_change':
            specificEventData = _generateGPOChangeEvent(options);
            break;
        case 'file_access':
            specificEventData = _generateFileAccessEvent(options);
            break;
        case 'kerberos':
            specificEventData = _generateKerberosEvent(options);
            break;
        case 'logon':
        default:
            specificEventData = _generateLogonEvent(options);
            break;
    }

    const time = new Date(Date.now() - Math.floor(Math.random() * 1000 * 3600 * 24));

    // Add general fields to the specific event data
    const fullEvent = {
        ...specificEventData,
        TimeGenerated: time.toISOString(),
        ComputerName: `${getRandomElement(hostnames)}.${getRandomElement(domains)}.local`,
        // General Fields
        EventRecordID: Math.floor(Math.random() * 1e9),
        Keywords: "Audit Success",
        TaskCategory: "Logon",
        Level: "Information",
        Opcode: "Info",
        Channel: "Security",
        ProviderName: "Microsoft-Windows-Security-Auditing",
        SecurityId: `S-1-5-18`,
        EventData: { ...specificEventData } // Nesting for clarity
    };

    return fullEvent;
};