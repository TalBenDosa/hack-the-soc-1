export const generateAwsLog = (options = {}) => {
    const { ioc = {}, details, severity, event_type, timestamp } = options;
    const eventTime = timestamp || new Date().toISOString();

    const randomAwsRegion = () => {
        const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
        return regions[Math.floor(Math.random() * regions.length)];
    };

    // Generate realistic public IP (external, not internal)
    const generatePublicSourceIp = () => {
        const publicRanges = [
            () => `203.0.113.${Math.floor(Math.random() * 255)}`, // TEST-NET-3 (documentation)
            () => `198.51.100.${Math.floor(Math.random() * 255)}`, // TEST-NET-2
            () => `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` // General public range
        ];
        return publicRanges[Math.floor(Math.random() * publicRanges.length)]();
    };

    // Real AWS event names and their contexts
    const awsEventTemplates = {
        's3_data_exfiltration': {
            eventName: 'GetObject',
            service: 's3',
            description: 'Multiple files downloaded from sensitive S3 buckets',
            resources: ['arn:aws:s3:::company-financial-data/*', 'arn:aws:s3:::hr-documents/*'],
            apiCalls: Math.floor(Math.random() * 50) + 20, // 20-70 calls
            objects_downloaded: Math.floor(Math.random() * 100) + 30
        },
        'privilege_escalation': {
            eventName: 'AttachUserPolicy',
            service: 'iam',
            description: 'User granted elevated permissions outside normal hours',
            resources: ['arn:aws:iam::123456789012:user/mark.johnson', 'arn:aws:iam::123456789012:policy/AdminAccess'],
            policies_attached: ['AdminAccess', 'PowerUserAccess']
        },
        'unusual_enumeration': {
            eventName: 'ListBuckets',
            service: 's3',
            description: 'Extensive enumeration of S3 resources',
            apiCalls: Math.floor(Math.random() * 30) + 15,
            buckets_discovered: Math.floor(Math.random() * 20) + 5
        },
        'secrets_access': {
            eventName: 'GetParameter',
            service: 'ssm',
            description: 'Access to multiple sensitive parameters in Systems Manager',
            parameters_accessed: ['database-password', 'api-key-prod', 'encryption-key'],
            apiCalls: Math.floor(Math.random() * 15) + 5
        },
        'compute_abuse': {
            eventName: 'RunInstances',
            service: 'ec2',
            description: 'Unauthorized EC2 instances launched for cryptocurrency mining',
            instances_launched: Math.floor(Math.random() * 5) + 2,
            instance_types: ['c5.2xlarge', 'c5.4xlarge']
        }
    };

    // Select appropriate event based on context or random
    const eventKey = event_type?.toLowerCase().includes('download') ? 's3_data_exfiltration' : 
                     event_type?.toLowerCase().includes('privilege') ? 'privilege_escalation' :
                     Object.keys(awsEventTemplates)[Math.floor(Math.random() * Object.keys(awsEventTemplates).length)];
    
    const selectedEvent = awsEventTemplates[eventKey];

    // Generate realistic AWS user identity
    const userName = ioc.user || ioc.username || 'mark.johnson';
    const userEmail = ioc.email || `${userName}@company.com`;
    const accountId = `${Math.floor(Math.random() * 900000000000) + 100000000000}`; // 12-digit account ID
    const userArn = `arn:aws:iam::${accountId}:user/${userName}`;

    // Generate realistic user agent
    const userAgents = [
        'aws-cli/2.8.5 Python/3.9.16 Windows/10 exe/AMD64 prompt/off command/s3.cp',
        'aws-sdk-go/1.44.142 (go1.19.3; windows; amd64)',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'aws-cli/1.27.84 Python/3.8.10 Linux/5.4.0-74-generic botocore/1.29.84'
    ];

    const sourceIp = generatePublicSourceIp();
    const region = randomAwsRegion();

    // Build detailed event description
    const eventDetails = (() => {
        switch(eventKey) {
            case 's3_data_exfiltration':
                return `User ${userName} made ${selectedEvent.apiCalls} GetObject API calls within 15 minutes, downloading ${selectedEvent.objects_downloaded} files from sensitive buckets: company-financial-data, hr-documents. Unusual volume detected.`;
            case 'privilege_escalation':
                return `User ${userName} was granted AdminAccess policy outside normal business hours. Previous role: ReadOnlyAccess. Escalation not approved through standard process.`;
            case 'unusual_enumeration':
                return `User ${userName} performed ${selectedEvent.apiCalls} ListBuckets calls, discovering ${selectedEvent.buckets_discovered} S3 buckets. Pattern suggests reconnaissance activity.`;
            case 'secrets_access':
                return `User ${userName} accessed ${selectedEvent.parameters_accessed.length} sensitive SSM parameters: ${selectedEvent.parameters_accessed.join(', ')}. Access from unusual IP location.`;
            case 'compute_abuse':
                return `User ${userName} launched ${selectedEvent.instances_launched} compute-optimized EC2 instances (${selectedEvent.instance_types.join(', ')}) in unusual region. Suspected cryptocurrency mining activity.`;
            default:
                return selectedEvent.description;
        }
    })();

    const log = {
        "@timestamp": eventTime,
        "event": {
            "provider": "AWS",
            "category": "cloud",
            "action": selectedEvent.eventName,
            "outcome": "success",
            "kind": "event"
        },
        "cloud": {
            "provider": "aws",
            "region": region,
            "account": {
                "id": accountId
            }
        },
        "user": {
            "name": userName,
            "id": userArn
        },
        "user_identity": {
            "type": "IAMUser",
            "principalId": `AIDA${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
            "arn": userArn,
            "accountId": accountId,
            "userName": userName
        },
        "source": {
            "ip": sourceIp,
            "geo": {
                "country": "Unknown",
                "region": "Unknown"
            }
        },
        "aws": {
            "account_id": accountId,
            "region": region,
            "event_name": selectedEvent.eventName,
            "event_source": `${selectedEvent.service}.amazonaws.com`,
            "event_version": "1.08",
            "service": selectedEvent.service,
            "api_version": "2006-03-01",
            "request_id": `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`,
            "resources": selectedEvent.resources || [],
            "user_agent": userAgents[Math.floor(Math.random() * userAgents.length)],
            "vpc_endpoint_id": selectedEvent.service === 's3' ? `vpce-${Math.random().toString(36).substring(2, 10)}` : null
        },
        "network": {
            "direction": "outbound",
            "protocol": "https"
        },
        "tls": {
            "version": "1.2",
            "cipher": "ECDHE-RSA-AES128-GCM-SHA256"
        },
        "details": eventDetails,
        "severity": severity || "High",
        "labels": {
            "anomaly_type": "volume_anomaly",
            "risk_score": Math.floor(Math.random() * 30) + 70, // 70-100 for high-risk
            "baseline_deviation": `${Math.floor(Math.random() * 400) + 200}%` // 200-600% above normal
        }
    };

    // Add specific metadata based on event type
    if (eventKey === 's3_data_exfiltration') {
        log.aws.s3 = {
            bucket_names: ['company-financial-data', 'hr-documents', 'customer-pii'],
            objects_accessed: selectedEvent.objects_downloaded,
            total_bytes_downloaded: Math.floor(Math.random() * 10000000000) + 1000000000, // 1-10GB
            api_calls_count: selectedEvent.apiCalls
        };
    }

    if (eventKey === 'privilege_escalation') {
        log.aws.iam = {
            policies_attached: selectedEvent.policies_attached,
            previous_permissions: ['ReadOnlyAccess'],
            escalation_time: eventTime,
            approval_status: 'not_approved'
        };
    }

    return log;
};

// Utility function to generate CloudTrail-specific logs
export const generateCloudTrailLog = (eventName, options = {}) => {
    return generateAwsLog({
        ...options,
        event_type: eventName
    });
};