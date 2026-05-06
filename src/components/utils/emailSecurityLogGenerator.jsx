/**
 * Email Security Log Generator
 * Generates realistic mail gateway / email security logs for SOC training.
 * Covers: BEC, QR-code phishing, HTML smuggling, spearphishing, callback phishing.
 * Format aligned with Proofpoint / Mimecast / Microsoft Defender for Office 365.
 */

const getRandomFromArray = (array) => array[Math.floor(Math.random() * array.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateMessageId = () =>
    `<${Math.random().toString(36).substring(2, 10)}.${randomInt(100000, 999999)}@${getRandomFromArray(['mail', 'smtp', 'mx', 'relay'])}.${getRandomFromArray(['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com'])}>`;

const generateHash = (length = 64) => {
    const chars = '0123456789abcdef';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Sender pools
const internalDomains = ['acmecorp.com', 'techfirm.io', 'globalinc.net', 'securecorp.org'];
const spoofedSenders = [
    'cfo@acm3corp.com', 'finance-noreply@acmec0rp.com', 'ceo@g1obalinc.net',
    'it-support@techfirn.io', 'payroll@acmecorp-hr.com', 'billing@securec0rp.org'
];
const maliciousSendingIps = [
    '45.142.212.100', '185.220.101.45', '91.240.118.172', '194.165.16.77',
    '37.120.233.226', '5.188.206.14', '93.115.27.56', '178.73.215.171'
];

// Attachment types by attack
const attachmentTypes = {
    bec: [],  // BEC usually has no attachment
    phishing: [
        { name: 'Invoice_Q4_2024.html', ext: 'html', size: randomInt(80000, 250000) },
        { name: 'Secure_Document.htm', ext: 'htm', size: randomInt(50000, 180000) },
        { name: 'Payment_Details.zip', ext: 'zip', size: randomInt(200000, 800000) },
    ],
    malware: [
        { name: 'resume_2024.docx', ext: 'docx', size: randomInt(150000, 400000) },
        { name: 'PO_38291.xlsm', ext: 'xlsm', size: randomInt(180000, 600000) },
        { name: 'contract_draft.iso', ext: 'iso', size: randomInt(1000000, 4000000) },
        { name: 'report_final.lnk', ext: 'lnk', size: randomInt(1500, 4000) },
        { name: 'setup_v2.exe', ext: 'exe', size: randomInt(500000, 2500000) },
    ],
    qr_phishing: [
        { name: 'secure_verification.png', ext: 'png', size: randomInt(40000, 120000) },
        { name: 'important_notice.pdf', ext: 'pdf', size: randomInt(100000, 500000) },
    ],
};

// Mail gateway verdicts & actions
const ACTIONS = {
    BLOCK: 'block',
    QUARANTINE: 'quarantine',
    DELIVER: 'deliver',
    DELIVER_MODIFIED: 'deliver_modified',
    REJECT: 'reject',
};

// Attack scenarios
const SCENARIOS = {
    BEC: 'bec',
    QR_PHISHING: 'qr_code_phishing',
    HTML_SMUGGLING: 'html_smuggling',
    SPEARPHISHING: 'spearphishing_attachment',
    CALLBACK_PHISHING: 'callback_phishing',
    MALWARE_ATTACHMENT: 'malware_attachment',
    CREDENTIAL_HARVEST: 'credential_harvesting',
    CLEAN: 'clean_email',
};

const selectScenario = (options = {}) => {
    const { event_type, severity } = options;
    if (event_type) {
        const t = event_type.toLowerCase();
        if (t.includes('bec') || t.includes('wire transfer') || t.includes('ceo fraud')) return SCENARIOS.BEC;
        if (t.includes('qr')) return SCENARIOS.QR_PHISHING;
        if (t.includes('html smuggling') || t.includes('smuggl')) return SCENARIOS.HTML_SMUGGLING;
        if (t.includes('spear')) return SCENARIOS.SPEARPHISHING;
        if (t.includes('callback') || t.includes('telephone')) return SCENARIOS.CALLBACK_PHISHING;
        if (t.includes('malware') || t.includes('macro') || t.includes('iso')) return SCENARIOS.MALWARE_ATTACHMENT;
        if (t.includes('phishing') || t.includes('credential')) return SCENARIOS.CREDENTIAL_HARVEST;
    }
    if (severity === 'Critical') return getRandomFromArray([SCENARIOS.BEC, SCENARIOS.MALWARE_ATTACHMENT, SCENARIOS.HTML_SMUGGLING]);
    if (severity === 'High') return getRandomFromArray([SCENARIOS.SPEARPHISHING, SCENARIOS.QR_PHISHING, SCENARIOS.CREDENTIAL_HARVEST]);
    return getRandomFromArray(Object.values(SCENARIOS));
};

export const generateEmailSecurityLog = (options = {}) => {
    const { ioc = {}, severity, timestamp } = options;
    const eventTime = timestamp || new Date().toISOString();
    const scenario = selectScenario(options);
    const internalDomain = ioc.domain || getRandomFromArray(internalDomains);

    // Recipient — internal employee
    const recipientNames = ['john.smith', 'sarah.johnson', 'mike.chen', 'emily.davis', 'finance.team', 'hr.admin', 'ceo.assistant'];
    const recipient = `${ioc.username || getRandomFromArray(recipientNames)}@${internalDomain}`;
    const senderIp = ioc.attackerIp || getRandomFromArray(maliciousSendingIps);

    let sender, subject, attachment, verdict, threat_name, action,
        spam_score, url_count, attachment_count, policy,
        spf_result, dkim_result, dmarc_result,
        qr_code_detected, html_smuggling_detected, callback_number,
        sender_score, personalization_score, gateway, threat_category;

    gateway = getRandomFromArray(['Proofpoint EFD', 'Microsoft Defender for Office 365', 'Mimecast SEG', 'Cisco Secure Email']);

    switch (scenario) {
        case SCENARIOS.BEC: {
            // Spoofed executive impersonation — no attachment, urgent wire transfer request
            sender = ioc.sender || getRandomFromArray(spoofedSenders);
            subject = getRandomFromArray([
                'Urgent: Wire Transfer Required Today',
                'Confidential — Please Process Payment',
                'Action Required: Vendor Invoice Payment',
                'Immediate Wire Transfer — Do Not Delay',
            ]);
            attachment = null;
            attachment_count = 0;
            url_count = 0;
            spam_score = randomInt(10, 35);     // BEC often bypasses spam filters
            spf_result = 'fail';
            dkim_result = 'none';
            dmarc_result = 'fail';
            verdict = 'phishing';
            threat_name = 'BEC.Wire.Transfer.Fraud';
            action = getRandomFromArray([ACTIONS.QUARANTINE, ACTIONS.DELIVER]);
            policy = 'BEC-Detection-Policy';
            sender_score = randomInt(0, 20);
            personalization_score = randomInt(70, 95);
            qr_code_detected = false;
            html_smuggling_detected = false;
            callback_number = null;
            threat_category = 'Business Email Compromise';
            break;
        }
        case SCENARIOS.QR_PHISHING: {
            sender = `noreply@${getRandomFromArray(['notifications', 'security', 'alerts', 'support'])}.${getRandomFromArray(['microsofts-auth.com', 'secure-0365.net', 'mfa-verify.io'])}`;
            subject = getRandomFromArray([
                'Action Required: Verify Your Microsoft Account',
                'Security Alert: Scan QR to Re-Authenticate',
                'Your MFA Token Has Expired — Scan to Renew',
                'Confirm Your Identity to Avoid Account Suspension',
            ]);
            attachment = getRandomFromArray(attachmentTypes.qr_phishing);
            attachment_count = 1;
            url_count = 0;           // URL is inside QR — evades URL scanners
            spam_score = randomInt(15, 45);
            spf_result = 'pass';     // Attacker controls the sending domain
            dkim_result = 'pass';
            dmarc_result = 'pass';   // Passes auth — why it's dangerous
            verdict = 'phishing';
            threat_name = 'Phishing.QRCode.MFA.Bypass';
            action = getRandomFromArray([ACTIONS.QUARANTINE, ACTIONS.DELIVER]);
            policy = 'Advanced-Threat-Protection';
            sender_score = randomInt(20, 50);
            personalization_score = randomInt(40, 65);
            qr_code_detected = true;
            html_smuggling_detected = false;
            callback_number = null;
            threat_category = 'QR Code Phishing';
            break;
        }
        case SCENARIOS.HTML_SMUGGLING: {
            sender = `${getRandomFromArray(['invoice', 'statement', 'document', 'shared'])}@${getRandomFromArray(['docushare.net', 'secure-files.io', 'filelink-cdn.com'])}`;
            subject = getRandomFromArray([
                'Your Shared Document Is Ready',
                'Please Review: Signed Contract',
                'New Invoice from Vendor — Action Required',
            ]);
            attachment = getRandomFromArray(attachmentTypes.phishing);
            attachment_count = 1;
            url_count = 1;
            spam_score = randomInt(5, 30);
            spf_result = 'pass';
            dkim_result = 'pass';
            dmarc_result = 'pass';
            verdict = 'malicious';
            threat_name = 'Trojan.HTMLSmuggling.JS.Dropper';
            action = getRandomFromArray([ACTIONS.BLOCK, ACTIONS.QUARANTINE]);
            policy = 'Attachment-Sandbox-Policy';
            sender_score = randomInt(30, 60);
            personalization_score = randomInt(30, 55);
            qr_code_detected = false;
            html_smuggling_detected = true;
            callback_number = null;
            threat_category = 'HTML Smuggling';
            break;
        }
        case SCENARIOS.SPEARPHISHING: {
            sender = `${getRandomFromArray(['recruiter', 'hr', 'vendor', 'partner'])}@${getRandomFromArray(['talentlink.io', 'staffbridge.com', 'global-recruit.net'])}`;
            subject = getRandomFromArray([
                `${recipient.split('@')[0].split('.')[0]}, Your Resume Has Been Reviewed`,
                'Exclusive Job Offer — Confidential',
                'Partnership Proposal — Please Review Attached',
                'Q4 Financial Report — For Your Eyes Only',
            ]);
            attachment = getRandomFromArray(attachmentTypes.malware);
            attachment_count = 1;
            url_count = randomInt(0, 2);
            spam_score = randomInt(5, 25);
            spf_result = 'pass';
            dkim_result = getRandomFromArray(['pass', 'fail']);
            dmarc_result = getRandomFromArray(['pass', 'fail']);
            verdict = 'malicious';
            threat_name = `Trojan.Downloader.${getRandomFromArray(['Emotet', 'Qakbot', 'IcedID', 'DarkGate', 'Latrodectus'])}`;
            action = getRandomFromArray([ACTIONS.BLOCK, ACTIONS.QUARANTINE]);
            policy = 'Malware-Detection-Policy';
            sender_score = randomInt(10, 40);
            personalization_score = randomInt(60, 90);
            qr_code_detected = false;
            html_smuggling_detected = false;
            callback_number = null;
            threat_category = 'Spearphishing Attachment';
            break;
        }
        case SCENARIOS.CALLBACK_PHISHING: {
            sender = `noreply@${getRandomFromArray(['subscriptions', 'billing', 'support', 'renewals'])}.${getRandomFromArray(['geeksquad-support.com', 'norton-billing.net', 'mcafee-renew.io'])}`;
            const fakeNumber = `1-800-${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
            subject = getRandomFromArray([
                `Your Norton Subscription Renewing at $${randomInt(300, 500)} — Call to Cancel`,
                `Geek Squad Invoice #${randomInt(10000, 99999)} — Call If Unauthorized`,
                `McAfee Auto-Renewal Notice — Call 1-800-xxx-xxxx to Dispute`,
            ]);
            attachment = null;
            attachment_count = 0;
            url_count = 0;
            spam_score = randomInt(20, 55);
            spf_result = 'pass';
            dkim_result = 'pass';
            dmarc_result = 'pass';
            verdict = 'phishing';
            threat_name = 'Phishing.CallbackScam.TechSupport';
            action = getRandomFromArray([ACTIONS.QUARANTINE, ACTIONS.DELIVER_MODIFIED]);
            policy = 'Phishing-Detection-Policy';
            sender_score = randomInt(20, 50);
            personalization_score = randomInt(20, 45);
            qr_code_detected = false;
            html_smuggling_detected = false;
            callback_number = fakeNumber;
            threat_category = 'Callback Phishing';
            break;
        }
        case SCENARIOS.MALWARE_ATTACHMENT: {
            sender = `${getRandomFromArray(['hr', 'payroll', 'finance', 'admin'])}@${getRandomFromArray(['ext-vendor.com', 'global-supplier.net', 'partner-portal.io'])}`;
            const malFile = getRandomFromArray(attachmentTypes.malware);
            subject = getRandomFromArray([
                'Q4 Payroll Summary — Confidential',
                `PO #${randomInt(10000, 99999)} — Please Approve`,
                'Updated Employee Benefits Package',
                `Invoice #INV-${randomInt(1000, 9999)}`,
            ]);
            attachment = malFile;
            attachment_count = 1;
            url_count = randomInt(0, 3);
            spam_score = randomInt(5, 40);
            spf_result = getRandomFromArray(['pass', 'fail', 'softfail']);
            dkim_result = getRandomFromArray(['pass', 'fail']);
            dmarc_result = spf_result === 'fail' ? 'fail' : getRandomFromArray(['pass', 'fail']);
            verdict = 'malicious';
            threat_name = `Trojan.${getRandomFromArray(['LummaC2', 'AsyncRAT', 'AgentTesla', 'Formbook', 'XLoader', 'SnakeKeylogger'])}`;
            action = ACTIONS.BLOCK;
            policy = 'Malware-Detection-Policy';
            sender_score = randomInt(0, 30);
            personalization_score = randomInt(25, 60);
            qr_code_detected = false;
            html_smuggling_detected = false;
            callback_number = null;
            threat_category = 'Malware Attachment';
            break;
        }
        case SCENARIOS.CREDENTIAL_HARVEST: {
            sender = `security-alert@${getRandomFromArray(['microsoftonline-verify.com', 'o365-secure.net', 'sharepoint-auth.io', 'teams-notification.xyz'])}`;
            subject = getRandomFromArray([
                'Your Password Will Expire in 24 Hours',
                'Unusual Sign-In Activity Detected on Your Account',
                'Action Required: Re-Verify Your Microsoft 365 Credentials',
                'Your OneDrive Storage is Full — Verify to Expand',
            ]);
            attachment = null;
            attachment_count = 0;
            url_count = randomInt(1, 3);
            spam_score = randomInt(20, 60);
            spf_result = getRandomFromArray(['fail', 'softfail', 'pass']);
            dkim_result = getRandomFromArray(['fail', 'pass']);
            dmarc_result = 'fail';
            verdict = 'phishing';
            threat_name = 'Phishing.CredentialHarvest.O365Lure';
            action = getRandomFromArray([ACTIONS.BLOCK, ACTIONS.QUARANTINE]);
            policy = 'Phishing-Detection-Policy';
            sender_score = randomInt(5, 35);
            personalization_score = randomInt(35, 70);
            qr_code_detected = false;
            html_smuggling_detected = false;
            callback_number = null;
            threat_category = 'Credential Harvesting';
            break;
        }
        default: {
            sender = `newsletter@${getRandomFromArray(['legit-vendor.com', 'update-service.io', 'notifications.net'])}`;
            subject = 'Monthly Newsletter';
            attachment = null;
            attachment_count = 0;
            url_count = randomInt(2, 10);
            spam_score = randomInt(0, 15);
            spf_result = 'pass';
            dkim_result = 'pass';
            dmarc_result = 'pass';
            verdict = 'clean';
            threat_name = null;
            action = ACTIONS.DELIVER;
            policy = 'Default-Policy';
            sender_score = randomInt(70, 100);
            personalization_score = randomInt(5, 20);
            qr_code_detected = false;
            html_smuggling_detected = false;
            callback_number = null;
            threat_category = 'Clean';
        }
    }

    const attachmentHash = attachment ? generateHash(64) : null;
    const messageId = generateMessageId();

    return {
        '@timestamp': eventTime,
        timestamp: eventTime,
        event: {
            kind: 'alert',
            category: ['email'],
            type: ['info'],
            action: `email_${action}`,
            outcome: ['block', 'quarantine', 'reject'].includes(action) ? 'success' : 'failure',
            dataset: 'email.security',
            provider: gateway,
        },
        email: {
            from: { address: sender },
            to: { address: recipient },
            subject,
            message_id: messageId,
            attachments: attachment ? [{
                file: {
                    name: attachment.name,
                    extension: attachment.ext,
                    size: attachment.size,
                    hash: { sha256: attachmentHash },
                },
            }] : [],
        },
        source: {
            ip: senderIp,
        },
        // raw_log_data matching SOURCE_SCHEMAS['Email Security / Mail Gateway']
        raw_log_data: {
            sender,
            recipient,
            subject,
            message_id: messageId,
            src_ip: senderIp,
            attachment_name: attachment?.name || null,
            attachment_hash: attachmentHash,
            attachment_size: attachment?.size || 0,
            verdict,
            threat_name: threat_name || 'none',
            action,
            policy,
            url_count,
            attachment_count,
            spam_score,
            // Extended email auth fields
            spf_result,
            dkim_result,
            dmarc_result,
            dmarc_alignment: dmarc_result === 'pass' ? 'aligned' : 'unaligned',
            sender_score,
            // 2024-specific threat indicators
            qr_code_detected,
            html_smuggling_detected,
            callback_number_detected: !!callback_number,
            callback_number: callback_number || null,
            personalization_score,
            ai_generated_probability: personalization_score > 80 ? randomInt(60, 95) : randomInt(5, 40),
            // Gateway metadata
            gateway,
            sandbox_detonated: ['malicious', 'phishing'].includes(verdict),
            sandbox_verdict: ['malicious', 'phishing'].includes(verdict) ? verdict : 'clean',
            url_reputation_score: url_count > 0 ? randomInt(0, verdict === 'clean' ? 100 : 40) : null,
            threat_category,
            threat_score: verdict === 'malicious' ? randomInt(80, 100) : verdict === 'phishing' ? randomInt(60, 95) : randomInt(0, 30),
        },
        labels: {
            scenario_type: scenario,
            threat_category,
        },
    };
};
