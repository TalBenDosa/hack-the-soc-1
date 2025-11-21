
/**
 * Office 365 Log Generator
 * Generates realistic Office 365/Exchange Online logs for SOC training scenarios
 */

const operations = [
    'EmailReceived', 'EmailSent', 'EmailDeleted', 'EmailMoved', 'UrlClicked', 
    'FileDownloaded', 'FileUploaded', 'SharePointAccess', 'TeamsMessage', 'UserLogin'
];

const workloads = ['Exchange', 'SharePoint', 'OneDrive', 'Teams', 'AzureActiveDirectory'];
const clientInfo = [
    'Microsoft Outlook 16.0', 'Outlook Web App', 'Microsoft Teams', 'Mobile App',
    'SharePoint Online', 'OneDrive for Business'
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateCorrelationId = () => `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;

export const generateOffice365Log = (options = {}) => {
    const ioc = options.ioc || {};
    const eventTime = options.timestamp || new Date().toISOString();
    const details = options.details || "Office 365 activity detected";
    
    // Determine if this should be a suspicious or normal event
    const isSuspicious = options.severity === 'High' || options.severity === 'Critical' || 
                        (options.event_type && (
                            options.event_type.toLowerCase().includes('malicious') ||
                            options.event_type.toLowerCase().includes('phishing') ||
                            options.event_type.toLowerCase().includes('suspicious')
                        ));

    const operation = getRandomElement(operations);
    const workload = getRandomElement(workloads);
    const clientApp = getRandomElement(clientInfo);
    const correlationId = generateCorrelationId();
    const recordType = workload === 'Exchange' ? 'ExchangeAdmin' : 'SharePointFileOperation';
    
    // -- FIX: Make URL consistent with IOCs --
    const phishingDomain = ioc.c2Domain || 'microsoft-security-alert.org';
    const suspiciousUrl = isSuspicious ? 
        `https://${phishingDomain}/account-suspended?user=${encodeURIComponent(ioc.email || 'user@company.com')}` :
        'https://sharepoint.company.com/documents/report.xlsx';
    
    // Raw Office 365 audit log structure (no duplicated fields)
    const rawLog = {
        '@timestamp': eventTime,
        'CreationTime': eventTime,
        'Id': `${correlationId}-${Date.now()}`,
        'RecordType': recordType,
        'Operation': operation, // Technical operation
        'OrganizationId': 'company-tenant-id',
        'UserType': 'Regular',
        'UserKey': `user_${ioc.user?.replace(/[^a-zA-Z0-9]/g, '_') || 'sarah_johnson'}`,
        'Workload': workload,
        'Version': 1,
        'ObjectId': isSuspicious ? suspiciousUrl : 'company-document.xlsx',
        
        // User context (only in raw log)
        'UserId': ioc.email || 'sarah.johnson@company.com',
        'ClientIP': ioc.ip || '192.168.10.21',
        'UserAgent': 'Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.12345)',
        
        // Activity details
        'Activity': operation, // Use technical operation name
        'ItemName': isSuspicious ? 'suspicious-email.html' : 'monthly-report.pdf',
        'Site': workload === 'SharePoint' ? 'https://company.sharepoint.com/sites/finance' : null,
        'SourceFileName': isSuspicious ? null : 'Q4_Financial_Report.xlsx',
        'DestinationFileName': isSuspicious ? 'account_verification_required.html' : null,
        
        // Email-specific fields with more context
        ...(workload === 'Exchange' && {
            'Subject': isSuspicious ? `URGENT: Account Suspended for ${ioc.email || 'user@company.com'}` : 'Monthly Finance Report',
            'Recipients': [ioc.email || 'sarah.johnson@company.com'],
            'Sender': isSuspicious ? `security-alert@${phishingDomain}` : 'finance@company.com',
            'MessageId': `<${correlationId}@company.com>`,
            'NetworkMessageId': `${correlationId}-network`,
            'InternetMessageId': `<${Date.now()}@exchange.company.com>`,
            'AuthenticationDetails': `pass (sender SPF authenticated)`, // Add more context
            'Threats': isSuspicious ? ['Phishing'] : []
        }),
        
        // Security context
        'ResultStatus': isSuspicious ? 'PartiallySucceeded' : 'Succeeded',
        'LogonError': isSuspicious ? 'SuspiciousActivity' : null,
        'CorrelationId': correlationId,
        
        // Client information
        'ClientAppId': 'outlook-client-app-id',
        'ClientInfoString': clientApp,
        'ClientRequestId': `client-${correlationId}`,
        'ClientVersion': '16.0.12345.20000',
        
        // Additional metadata (Office 365 specific)
        'AzureActiveDirectoryEventType': 'AccountLogon',
        'ExtendedProperties': [
            { Name: 'RequestType', Value: operation },
            { Name: 'CorrelationId', Value: correlationId }
        ],
        
        // Tags for categorization
        'EventSource': 'Office365',
        'Platform': 'Cloud',
        'TenantId': 'company-tenant-123456'
    };

    return rawLog;
};
