import { maliciousHashService } from './maliciousHashService';

const getRandomFromArray = (array) => array[Math.floor(Math.random() * array.length)];

// Windows User SIDs for realistic Windows events
const generateWindowsUserSid = (userName) => {
    const baseSid = "S-1-5-21-1234567890-987654321-123456789";
    const userRid = Math.floor(Math.random() * 9999) + 1000;
    return `${baseSid}-${userRid}`;
};

// Generate realistic file paths
const generateFilePath = (fileName, userName = 'user') => {
    const paths = [
        `C:\\Users\\${userName}\\Downloads\\${fileName}`,
        `C:\\Users\\${userName}\\Desktop\\${fileName}`,
        `C:\\Users\\${userName}\\Documents\\${fileName}`,
        `C:\\Temp\\${fileName}`,
        `C:\\Windows\\System32\\${fileName}`,
        `C:\\ProgramData\\${fileName}`
    ];
    return getRandomFromArray(paths);
};

// Generate parent process information
const generateParentProcess = () => {
    const parentProcesses = [
        { name: 'explorer.exe', pid: Math.floor(Math.random() * 9999) + 1000, path: 'C:\\Windows\\explorer.exe' },
        { name: 'chrome.exe', pid: Math.floor(Math.random() * 9999) + 1000, path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
        { name: 'outlook.exe', pid: Math.floor(Math.random() * 9999) + 1000, path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE' },
        { name: 'winword.exe', pid: Math.floor(Math.random() * 9999) + 1000, path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE' },
        { name: 'cmd.exe', pid: Math.floor(Math.random() * 9999) + 1000, path: 'C:\\Windows\\System32\\cmd.exe' }
    ];
    return getRandomFromArray(parentProcesses);
};

// Generate realistic command lines
const generateCommandLine = (fileName, malwareType) => {
    const commands = {
        'Ransomware': [
            `"${fileName}" -encrypt -all`,
            `powershell.exe -enc ${btoa('malicious powershell command')}`,
            `${fileName} /silent /encrypt`
        ],
        'Trojan': [
            `"${fileName}" -install -hide`,
            `${fileName} /quiet /background`,
            `rundll32.exe ${fileName},DllEntryPoint`
        ],
        'RAT': [
            `"${fileName}" -connect 192.168.1.100:4444`,
            `${fileName} -server -port 8080`,
            `powershell.exe -WindowStyle Hidden -File ${fileName}`
        ],
        'Cryptominer': [
            `"${fileName}" -pool stratum+tcp://pool.com:4444`,
            `${fileName} --donate-level=0 --pool=mining.com`,
            `powershell.exe -ExecutionPolicy Bypass -File ${fileName}`
        ]
    };
    
    const typeCommands = commands[malwareType] || commands['Trojan'];
    return getRandomFromArray(typeCommands);
};

export const generateEDRLog = async (options = {}) => {
export const generateEnhancedEdrLog = async (options = {}) => {
    const { ioc = {}, details, severity, event_type, timestamp } = options;
    const eventTime = timestamp || new Date().toISOString();

    // Generate realistic user information
    const userName = ioc.user || ioc.username || 'john.doe';
    const userEmail = ioc.email || `${userName}@company.com`;
    const userSid = generateWindowsUserSid(userName);
    const hostName = ioc.hostname || ioc.host || `${userName.split('.')[0]}-pc`;
    const sourceIp = ioc.ip || `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
    
    // Generate external destination (for network connections)
    const destinationIp = `203.0.113.${Math.floor(Math.random() * 255)}`;
    const destinationPort = getRandomFromArray([80, 443, 8080, 4444, 9999]);

    let maliciousFile = null;
    try {
        maliciousFile = await maliciousHashService.getRandomMaliciousHash();
    } catch (error) {
        console.warn('[EDR LOG] Failed to get malicious hash, using fallback:', error);
        maliciousFile = {
            file_name: 'malicious.exe',
            sha256: '5d41402abc4b2a76b9719d911017c592',
            malware_family: 'Trojan',
            file_size: 2048000
        };
    }

    const filePath = generateFilePath(maliciousFile.file_name, userName);
    const parentProcess = generateParentProcess();
    const commandLine = generateCommandLine(maliciousFile.file_name, maliciousFile.malware_family);
    const processId = Math.floor(Math.random() * 9999) + 1000;

    // Action results
    const actionResults = ['blocked', 'allowed', 'quarantined', 'deleted'];
    const actionResult = severity === 'Critical' ? getRandomFromArray(['blocked', 'quarantined']) : getRandomFromArray(actionResults);
    const wasBlocked = ['blocked', 'quarantined'].includes(actionResult);

    const log = {
        "@timestamp": eventTime,
        "agent": {
            "name": "EDR-Agent",
            "version": "7.15.2",
            "hostname": hostName,
            "type": "endpoint"
        },
        "event": {
            "kind": "alert",
            "category": ["malware", "process"],
            "type": ["start", "creation"],
            "action": event_type || "Process Creation",
            "outcome": wasBlocked ? "failure" : "success",
            "severity": severity === 'Critical' ? 4 : severity === 'High' ? 3 : 2,
            "provider": "Windows Defender ATP"
        },
        "host": {
            "name": hostName,
            "ip": [sourceIp],
            "os": {
                "family": "windows",
                "name": "Windows 10 Pro",
                "version": "10.0.19044"
            },
            "user": {
                "name": userName,
                "email": userEmail,
                "id": userSid,
                "domain": "COMPANY"
            }
        },
        "process": {
            "name": maliciousFile.file_name,
            "pid": processId,
            "executable": filePath,
            "command_line": commandLine,
            "working_directory": `C:\\Users\\${userName}\\Downloads`,
            "parent": {
                "name": parentProcess.name,
                "pid": parentProcess.pid,
                "executable": parentProcess.path
            },
            "hash": {
                "sha256": maliciousFile.sha256,
                "md5": maliciousFile.sha256.substring(0, 32) // Simulated MD5
            }
        },
        "file": {
            "name": maliciousFile.file_name,
            "path": filePath,
            "size": maliciousFile.file_size,
            "hash": {
                "sha256": maliciousFile.sha256,
                "md5": maliciousFile.sha256.substring(0, 32)
            },
            "pe": {
                "original_file_name": maliciousFile.file_name,
                "company": "Unknown Publisher",
                "description": maliciousFile.description || "Suspicious executable"
            }
        },
        "network": {
            "direction": "outbound",
            "transport": "tcp",
            "protocol": "tcp"
        },
        "source": {
            "ip": sourceIp,
            "port": Math.floor(Math.random() * 65535) + 1024
        },
        "destination": {
            "ip": destinationIp,
            "port": destinationPort,
            "domain": `malicious-c2-${Math.floor(Math.random() * 999)}.com`
        },
        "action": {
            "name": actionResult,
            "result": wasBlocked ? "blocked" : "allowed",
            "outcome": wasBlocked ? "success" : "failure"
        },
        "threat": {
            "indicator": {
                "file": {
                    "hash": {
                        "sha256": maliciousFile.sha256
                    }
                },
                "type": "file"
            },
            "technique": {
                "id": maliciousFile.mitre_techniques?.[0] || "T1204.002",
                "name": "User Execution: Malicious File"
            }
        },
        "rule": {
            "name": `Malicious ${maliciousFile.malware_family} Detection`,
            "description": `Detected execution of known ${maliciousFile.malware_family.toLowerCase()} sample`,
            "id": `EDR-${Math.floor(Math.random() * 9999)}`
        },
        "labels": {
            "malware_family": maliciousFile.malware_family,
            "threat_level": severity,
            "confidence": "high"
        },
        "details": details || `Malicious ${maliciousFile.malware_family.toLowerCase()} ${maliciousFile.file_name} executed by user ${userName}. File hash: ${maliciousFile.sha256}. Action: ${actionResult}.`,
        
        // Legacy fields for backward compatibility
        "user_name": userName,
        "user_email": userEmail,
        "device_name": hostName,
        "source_ip": sourceIp,
        "destination_host": destinationIp,
        "file_name": maliciousFile.file_name,
        "file_hash_sha256": maliciousFile.sha256,
        "was_blocked": wasBlocked,
        "log_level": severity,
        "severity": severity
    };

    return log;
};