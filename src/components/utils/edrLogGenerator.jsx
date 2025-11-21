
/**
 * EDR (Endpoint Detection & Response) Log Generator
 * Generates realistic endpoint security logs for SOC training scenarios
 */

const processes = ["explorer.exe", "chrome.exe", "notepad.exe", "powershell.exe", "cmd.exe", "rundll32.exe", "svchost.exe"];
const suspiciousProcesses = ["powershell.exe", "cmd.exe", "rundll32.exe", "regsvr32.exe", "mshta.exe", "wscript.exe"];
const fileExtensions = [".exe", ".dll", ".bat", ".ps1", ".vbs", ".scr", ".com"];
const registryKeys = ["HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateProcessId = () => Math.floor(Math.random() * 9999) + 1000;
const generateRandomHash = () => Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const generateMacAddress = () => Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase();

export const generateEdrLog = (options = {}) => {
    const ioc = options.ioc || {};
    const eventTime = options.timestamp || new Date().toISOString();
    const details = options.details || "Endpoint security event detected";
    
    // Determine if this should be a suspicious or benign event
    // Keeping the comprehensive check for 'isSuspicious' to maintain functionality
    const isSuspicious = options.severity === 'High' || options.severity === 'Critical' || 
                        (options.event_type && (
                            options.event_type.toLowerCase().includes('malicious') ||
                            options.event_type.toLowerCase().includes('suspicious') ||
                            options.event_type.toLowerCase().includes('powershell')
                        ));
    
    const processName = isSuspicious ? getRandomElement(suspiciousProcesses) : getRandomElement(processes);
    
    // Determine parent process for macro execution or general
    const isMacroExecution = options.event_type?.toLowerCase().includes('macro');
    const parentProcess = isMacroExecution 
        ? getRandomElement(["WINWORD.EXE", "EXCEL.EXE"]) 
        : getRandomElement(processes);

    // Generate command line based on event type
    let commandLine = processName;
    if (processName === 'powershell.exe' && isSuspicious) {
        commandLine = `powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${btoa('malicious command')}`;
    } else if (processName === 'cmd.exe' && isSuspicious) {
        commandLine = `cmd.exe /c "whoami && net user && ipconfig"`;
    }
    
    // Make file path and name consistent
    const fileExtension = getRandomElement(fileExtensions);
    const fileName = `document${fileExtension}`;
    const filePath = `C:\\Users\\${ioc.user || 'jane.doe'}\\Downloads\\${fileName}`;

    // Outline changes outcome probability for suspicious events
    const outcome = isSuspicious ? (Math.random() > 0.3 ? 'failure' : 'success') : 'success';
    // 'reason' variable is no longer needed as 'event.reason' and 'rule.description' are removed.

    // Determine parent process executable path (keeping original logic for robustness)
    const parentProcessExecutablePath = (parentProcess === "WINWORD.EXE" || parentProcess === "EXCEL.EXE")
        ? `C:\\Program Files\\Microsoft Office\\root\\Office16\\${parentProcess}`
        : `C:\\Windows\\System32\\${parentProcess}`;

    const log = {
        "@timestamp": eventTime,
        "agent": {
            "version": "7.15.0",
            "type": "winlogbeat"
            // "ephemeral_id" removed as per outline
        },
        "event": {
            "category": "process",
            "type": "start", 
            "action": "ProcessCreate",
            "outcome": outcome,
            // "reason" removed as per outline
        },
        "process": {
            "pid": generateProcessId(),
            "name": processName,
            "executable": `C:\\Windows\\System32\\${processName}`,
            "command_line": commandLine,
            "working_directory": "C:\\Windows\\System32\\", // Added trailing slash as per outline
            "start": eventTime
        },
        "process_parent": {
            "pid": generateProcessId(),
            "name": parentProcess,
            // Keeping conditional path for parent process executable for robustness
            "executable": parentProcessExecutablePath 
        },
        "user": {
            // Keeping default value for robustness
            "name": ioc.user || 'jane.doe',
            "domain": "COMPANY"
        },
        "host": {
            // Keeping default value for robustness
            "name": options.device?.name || 'Employee Laptop', 
            // Keeping default value for robustness
            "ip": [ioc.ip || "10.10.170.105"],
            "mac": [generateMacAddress()], // Using new helper function
            "os": {
                "family": "windows",
                "version": "10.0",
                "name": "Windows 10 Pro"
            }
        },
        "file": {
            "path": filePath,
            "name": fileName, 
            "hash": {
                "sha256": ioc.maliciousHash || generateRandomHash(),
                "md5": generateRandomHash().substring(0, 32)
            }
        },
        "network": {
            "direction": "outbound",
            "protocol": "tcp"
        },
        "destination": {
            // Removed default fallbacks as per outline for cleaner output
            "ip": ioc.c2Domain || ioc.attackerIp,
            "domain": ioc.c2Domain, 
            "port": 443
        },
        "rule": {
            "name": "Suspicious Process Execution",
            "id": "EDR-897",
            // "description" removed as per outline
        },
        "tags": [
            "malicious",
            "edr",
            "process",
            isMacroExecution ? "macro" : "execution" 
        ],
        
        // The message field is now the single source of truth for the event summary inside the raw log.
        // Other descriptive fields like rule.description and analysis_notes are removed to avoid redundancy.
        "message": `EDR alert: Suspicious process '${processName}' initiated by '${parentProcess}'. Outcome: ${outcome}.`
        // "analysis_notes" removed as per outline
    };

    return log;
};
