/**
 * DNS Log Generator
 * Generates realistic DNS security logs for SOC training scenarios.
 * Covers: DNS tunneling, DGA, C2 beaconing, exfiltration, newly registered domains.
 */

const getRandomFromArray = (array) => array[Math.floor(Math.random() * array.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Internal IP pool
const internalIps = [
    '10.0.1.45', '10.0.1.87', '10.0.2.112', '10.0.3.22', '192.168.1.101',
    '192.168.10.55', '172.16.5.33', '172.16.8.200', '10.10.0.77', '192.168.50.14'
];

// Legitimate DNS servers
const dnsServers = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '9.9.9.9', '208.67.222.222'];

// Malicious / C2 infrastructure (simulated realistic-looking domains)
const c2Domains = [
    'update-cdn-service.net', 'telemetry-api.io', 'cdn-edge-proxy.com',
    'analytics-collector.xyz', 'metrics-sync.net', 'infra-health-check.io',
    'svc-backend-api.com', 'cloud-relay-net.xyz', 'delivery-node-cdn.net',
    'status-check-api.io'
];

// DGA-like domain generator (mimics Emotet, Conficker, Mirai patterns)
const generateDgaDomain = () => {
    const tlds = ['.com', '.net', '.org', '.info', '.biz'];
    const length = randomInt(10, 18);
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let domain = '';
    for (let i = 0; i < length; i++) {
        domain += chars[Math.floor(Math.random() * chars.length)];
    }
    return domain + getRandomFromArray(tlds);
};

// DNS tunneling: encode fake data in subdomain labels
const generateTunnelingSubdomain = () => {
    const fakeData = btoa(`session_data_${randomInt(1000, 9999)}_secret_token_exfil`).replace(/=/g, '');
    const chunks = [];
    for (let i = 0; i < fakeData.length; i += 30) {
        chunks.push(fakeData.substring(i, i + 30));
    }
    const label = chunks[0].toLowerCase();
    return `${label}.${getRandomFromArray(c2Domains)}`;
};

// Response codes
const rcodes = { NOERROR: 0, NXDOMAIN: 3, SERVFAIL: 2, REFUSED: 5 };

// Query types
const queryTypes = {
    normal: ['A', 'AAAA', 'MX', 'NS', 'CNAME'],
    malicious: ['TXT', 'NULL', 'PRIVATE', 'A'],
    tunneling: ['TXT', 'NULL', 'MX'],
};

// Threat scenarios
const SCENARIOS = {
    DNS_TUNNELING: 'dns_tunneling',
    DGA: 'dga',
    C2_BEACON: 'c2_beacon',
    EXFILTRATION: 'exfiltration',
    NEWLY_REGISTERED: 'newly_registered',
    MALICIOUS_DOMAIN: 'malicious_domain',
    NON_STANDARD_PORT: 'non_standard_port',
    NXDOMAIN_FLOOD: 'nxdomain_flood',
};

const selectScenario = (options = {}) => {
    const { event_type, severity } = options;
    if (event_type) {
        const t = event_type.toLowerCase();
        if (t.includes('tunnel')) return SCENARIOS.DNS_TUNNELING;
        if (t.includes('dga') || t.includes('domain generation')) return SCENARIOS.DGA;
        if (t.includes('beacon') || t.includes('c2')) return SCENARIOS.C2_BEACON;
        if (t.includes('exfil')) return SCENARIOS.EXFILTRATION;
        if (t.includes('newly') || t.includes('registered')) return SCENARIOS.NEWLY_REGISTERED;
        if (t.includes('nxdomain') || t.includes('flood')) return SCENARIOS.NXDOMAIN_FLOOD;
        if (t.includes('port')) return SCENARIOS.NON_STANDARD_PORT;
    }
    if (severity === 'Critical' || severity === 'High') {
        return getRandomFromArray([
            SCENARIOS.DNS_TUNNELING, SCENARIOS.DGA, SCENARIOS.C2_BEACON, SCENARIOS.EXFILTRATION
        ]);
    }
    return getRandomFromArray(Object.values(SCENARIOS));
};

export const generateDnsLog = (options = {}) => {
    const { ioc = {}, severity, timestamp } = options;
    const eventTime = timestamp || new Date().toISOString();
    const scenario = selectScenario(options);
    const clientIp = ioc.ip || ioc.client_ip || getRandomFromArray(internalIps);
    const serverIp = getRandomFromArray(dnsServers);

    let query_name, query_type, response_code, response_ip, ttl,
        query_length, response_length, protocol, dst_port,
        threat_category, ioc_flag, anomaly_score, flags, transaction_id;

    transaction_id = randomInt(1000, 65535);
    flags = '0x0100';
    protocol = 'UDP';
    dst_port = 53;

    switch (scenario) {
        case SCENARIOS.DNS_TUNNELING: {
            query_name = generateTunnelingSubdomain();
            query_type = getRandomFromArray(queryTypes.tunneling);
            response_code = 'NOERROR';
            response_ip = ioc.attackerIp || `185.${randomInt(100, 220)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
            ttl = randomInt(1, 30);           // Very short TTL typical of tunneling
            query_length = randomInt(180, 250); // Long query = encoded data
            response_length = randomInt(200, 400);
            threat_category = 'DNS Tunneling';
            ioc_flag = true;
            anomaly_score = randomInt(85, 99);
            flags = '0x0100';
            break;
        }
        case SCENARIOS.DGA: {
            query_name = generateDgaDomain();
            query_type = 'A';
            response_code = 'NXDOMAIN';         // DGA mostly returns NXDOMAIN
            response_ip = null;
            ttl = 0;
            query_length = randomInt(20, 40);
            response_length = randomInt(40, 80);
            threat_category = 'Domain Generation Algorithm';
            ioc_flag = true;
            anomaly_score = randomInt(75, 95);
            break;
        }
        case SCENARIOS.C2_BEACON: {
            const c2Domain = ioc.domain || getRandomFromArray(c2Domains);
            query_name = c2Domain;
            query_type = 'A';
            response_code = 'NOERROR';
            response_ip = ioc.attackerIp || `91.${randomInt(100, 200)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
            ttl = randomInt(60, 300);
            query_length = randomInt(30, 60);
            response_length = randomInt(50, 120);
            threat_category = 'C2 Communication';
            ioc_flag = true;
            anomaly_score = randomInt(70, 90);
            break;
        }
        case SCENARIOS.EXFILTRATION: {
            // Data encoded as hex/base64 in subdomain labels of a C2 domain
            const encoded = Buffer ? Buffer.from(`uid=${randomInt(1000,9999)}&data=${randomInt(10000,99999)}`).toString('hex').substring(0, 40) : randomInt(100000, 999999).toString(16).padStart(40, '0');
            query_name = `${encoded}.exfil.${getRandomFromArray(c2Domains)}`;
            query_type = getRandomFromArray(['TXT', 'NULL', 'A']);
            response_code = 'NOERROR';
            response_ip = `45.${randomInt(60, 150)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
            ttl = randomInt(5, 30);
            query_length = randomInt(120, 200);
            response_length = randomInt(80, 180);
            threat_category = 'DNS Exfiltration';
            ioc_flag = true;
            anomaly_score = randomInt(88, 99);
            break;
        }
        case SCENARIOS.NEWLY_REGISTERED: {
            // Domain registered within the last 30 days - phishing pattern
            const phishingDomain = `${getRandomFromArray(['secure', 'login', 'update', 'account', 'verify'])}-${getRandomFromArray(['microsoft', 'paypal', 'amazon', 'google', 'apple'])}-${randomInt(100, 999)}.com`;
            query_name = phishingDomain;
            query_type = 'A';
            response_code = 'NOERROR';
            response_ip = `194.${randomInt(1, 200)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
            ttl = randomInt(60, 600);
            query_length = randomInt(30, 60);
            response_length = randomInt(50, 100);
            threat_category = 'Newly Registered Domain';
            ioc_flag = true;
            anomaly_score = randomInt(55, 75);
            break;
        }
        case SCENARIOS.NON_STANDARD_PORT: {
            const legitDomain = getRandomFromArray(c2Domains);
            query_name = legitDomain;
            query_type = 'A';
            response_code = 'NOERROR';
            response_ip = `23.${randomInt(1, 200)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
            ttl = randomInt(300, 3600);
            query_length = randomInt(25, 55);
            response_length = randomInt(45, 100);
            threat_category = 'Non-Standard DNS Port';
            ioc_flag = true;
            anomaly_score = randomInt(60, 80);
            protocol = 'TCP';
            dst_port = getRandomFromArray([5353, 8053, 5355, 853, 4434]);
            break;
        }
        case SCENARIOS.NXDOMAIN_FLOOD: {
            query_name = generateDgaDomain();
            query_type = 'A';
            response_code = 'NXDOMAIN';
            response_ip = null;
            ttl = 0;
            query_length = randomInt(18, 45);
            response_length = randomInt(35, 80);
            threat_category = 'NXDOMAIN Flood / DGA Scanning';
            ioc_flag = true;
            anomaly_score = randomInt(65, 85);
            break;
        }
        default: {
            query_name = getRandomFromArray(c2Domains);
            query_type = 'A';
            response_code = 'NOERROR';
            response_ip = `1.${randomInt(1, 200)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
            ttl = randomInt(300, 3600);
            query_length = randomInt(20, 50);
            response_length = randomInt(40, 100);
            threat_category = 'Suspicious DNS Query';
            ioc_flag = false;
            anomaly_score = randomInt(30, 60);
        }
    }

    return {
        '@timestamp': eventTime,
        timestamp: eventTime,
        event: {
            kind: 'event',
            category: ['network', 'dns'],
            type: ['connection', 'protocol'],
            action: 'dns_query',
            outcome: response_code === 'NOERROR' ? 'success' : 'failure',
            dataset: 'dns.log',
            provider: 'DNS Security',
        },
        dns: {
            question: {
                name: query_name,
                type: query_type,
                class: 'IN',
            },
            response_code,
            answers: response_ip ? [{
                name: query_name,
                type: query_type,
                ttl,
                data: response_ip,
            }] : [],
            header_flags: [flags],
            id: transaction_id,
        },
        network: {
            transport: protocol.toLowerCase(),
            protocol: 'dns',
            direction: 'outbound',
            community_id: `1:${Math.random().toString(36).substr(2, 20)}`,
        },
        source: {
            ip: clientIp,
            port: randomInt(49152, 65535),
        },
        destination: {
            ip: serverIp,
            port: dst_port,
        },
        threat: {
            indicator: {
                type: 'domain-name',
                name: threat_category,
                confidence: anomaly_score > 85 ? 'High' : anomaly_score > 65 ? 'Medium' : 'Low',
            },
        },
        // raw_log_data fields matching SOURCE_SCHEMAS.DNS in generateFullScenario
        raw_log_data: {
            query_name,
            query_type,
            response_code,
            response_ip: response_ip || 'N/A',
            client_ip: clientIp,
            client_port: randomInt(49152, 65535),
            server_ip: serverIp,
            query_class: 'IN',
            ttl: ttl || 0,
            flags,
            transaction_id,
            query_length,
            response_length,
            protocol,
            dst_port,
            // Extended threat context
            threat_category,
            ioc_detected: ioc_flag,
            anomaly_score,
            domain_age_days: scenario === SCENARIOS.NEWLY_REGISTERED ? randomInt(1, 30) : randomInt(100, 3000),
            domain_entropy: parseFloat((Math.random() * 2 + 2.5).toFixed(2)), // High entropy = DGA
            is_dga_candidate: scenario === SCENARIOS.DGA || scenario === SCENARIOS.NXDOMAIN_FLOOD,
            tunneling_indicators: scenario === SCENARIOS.DNS_TUNNELING ? {
                label_count: randomInt(4, 8),
                avg_label_length: randomInt(28, 50),
                entropy: parseFloat((Math.random() + 3.5).toFixed(2)),
            } : null,
        },
        labels: {
            scenario_type: scenario,
            threat_category,
        },
    };
};
