export const generateAzureLog = (options = {}) => {
    const { ioc = {}, details, severity, event_type, timestamp } = options;
    const eventTime = timestamp || new Date().toISOString();

    const randomApp = () => {
        const apps = ["Microsoft Azure PowerShell", "Office 365 Shell WCSS-Client", "Microsoft Office"];
        return apps[Math.floor(Math.random() * apps.length)];
    };
    
    const externalIp = () => `${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const user = ioc.user || ioc.username || "test-user@example.com";
    const sourceIP = ioc.ip || externalIp();
    const eventName = event_type || "Successful user login";

    const log = {
        "id": `azure-${crypto.randomUUID()}`,
        "category": "SignInLogs",
        "time": eventTime,
        "operationName": eventName,
        "operationVersion": "1.0",
        "resultType": severity === "High" ? "50126" : "0", // 50126 is common failure code
        "resultSignature": severity === "High" ? "InvalidCredentials" : "None",
        "resultDescription": severity === "High" ? "Invalid username or password or Invalid on-premise username or password." : "Successfully signed in.",
        "durationMs": Math.floor(Math.random() * 1000),
        "correlationId": crypto.randomUUID(),
        "identity": user,
        "level": severity === "High" ? "Warning" : "Informational",
        "location": "US",
        "properties": {
            "userPrincipalName": user,
            "appDisplayName": randomApp(),
            "ipAddress": sourceIP,
            "clientAppUsed": "Browser",
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
            "deviceDetail": {
                "operatingSystem": "Windows",
                "browser": "Chrome"
            },
            "authenticationRequirement": "singleFactorAuthentication",
            "conditionalAccessStatus": "notApplicated",
            "riskDetail": severity === "High" ? "anomalousToken" : "none",
            "riskLevelAggregated": severity === "High" ? "medium" : "none",
            "riskLevelDuringSignIn": severity === "High" ? "medium" : "none"
        }
    };

    if(details) {
        log.properties.custom_details = details;
    }

    return log;
};