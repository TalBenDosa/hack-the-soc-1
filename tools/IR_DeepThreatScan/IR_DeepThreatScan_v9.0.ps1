<#
.SYNOPSIS
    SDEMA IRT : Deep Threat Scan v9.0 - live-response compromise assessment for a single Windows host.

.DESCRIPTION
    Collects volatile and persistent artifacts (processes, network, persistence, event logs,
    Sysmon, Microsoft Defender, file system), evaluates them against an IoC / behaviour rule base
    mapped to MITRE ATT&CK, scores every finding with a NIST SP 800-30 style Impact x Confidence
    matrix, correlates findings into incident hypotheses and writes:
      * a self-contained interactive HTML report (works offline, no CDN)
      * a full JSON export (can be re-rendered with -ReportFromJson)
      * Findings / IoC CSV files and a Markdown executive summary for tickets
      * a scan log and a SHA-256 manifest of all outputs (chain of custody)

    The scan is READ-ONLY: nothing on the host is modified, quarantined or deleted.
    Requirements: Windows PowerShell 5.1 or PowerShell 7+. No Python or other runtime is needed.
    Run elevated (as Administrator) for full coverage.

.PARAMETER OutputPath
    Root output folder. Every run writes to <OutputPath>\<HOST>_<yyyyMMdd_HHmmss>.
.PARAMETER ScanProfile
    Quick | Standard | Deep. Controls event volume, file-system breadth and hashing.
.PARAMETER LookbackHours
    Event log look-back window in hours (default 72).
.PARAMETER FileLookbackDays
    Only files created/modified within this many days are analysed (default 30).
.PARAMETER IocFile
    Optional threat-intel feed. JSON: { "ips":[], "domains":[], "hashes":[], "tools":[] }
    or a TXT/CSV file with one indicator per line (IP / domain / MD5 / SHA1 / SHA256 auto-detected).
.PARAMETER CaseId
    Case / ticket number printed on the report.
.PARAMETER Analyst
    Analyst name printed on the report.
.PARAMETER NoOpen
    Do not open the HTML report when the scan finishes.
.PARAMETER SkipFileScan
    Skip the file-system sweeps (fastest triage).
.PARAMETER ReportFromJson
    Re-render the HTML / Markdown reports from a previously saved scan JSON (no scanning).

.EXAMPLE
    .\IR_DeepThreatScan_v9.0.ps1
.EXAMPLE
    .\IR_DeepThreatScan_v9.0.ps1 -CaseId IR-2026-114 -ScanProfile Deep -IocFile .\iocs.json
.EXAMPLE
    .\IR_DeepThreatScan_v9.0.ps1 -ReportFromJson C:\SDEMAAuditReport\PC01_20261018_101500\ThreatScan.json
#>
[CmdletBinding()]
param (
    [string]$OutputPath = "C:\SDEMAAuditReport",
    [ValidateSet('Quick', 'Standard', 'Deep')]
    [string]$ScanProfile = 'Standard',
    [ValidateRange(1, 8760)]
    [int]$LookbackHours = 72,
    [ValidateRange(1, 365)]
    [int]$FileLookbackDays = 30,
    [string]$IocFile = '',
    [string]$CaseId = '',
    [string]$Analyst = $env:USERNAME,
    [switch]$NoOpen,
    [switch]$SkipFileScan,
    [string]$ReportFromJson = ''
)

# SDEMA-DTS-SELF (marker used to ignore this script's own PowerShell script-block logs)
$ScriptVersion = '9.0'
if (-not $env:COMPUTERNAME) { $env:COMPUTERNAME = [Environment]::MachineName }
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Continue'
$startTime = Get-Date

# ============================================================================
# Configuration
# ============================================================================

$script:ProfileSettings = @{
    Quick    = @{ MaxEvents = 1500;  SysmonMaxEvents = 5000;  AllUsers = $false; FileDepth = 2; MaxFiles = 3000;  RansomMaxFiles = 20000;  HashAll = $false }
    Standard = @{ MaxEvents = 5000;  SysmonMaxEvents = 25000; AllUsers = $true;  FileDepth = 4; MaxFiles = 15000; RansomMaxFiles = 60000;  HashAll = $false }
    Deep     = @{ MaxEvents = 20000; SysmonMaxEvents = 80000; AllUsers = $true;  FileDepth = 7; MaxFiles = 60000; RansomMaxFiles = 200000; HashAll = $true }
}

$script:RiskRank = @{ 'Critical' = 4; 'High' = 3; 'Moderate' = 2; 'Low' = 1; 'Info' = 0 }
$script:BruteForceThreshold = 10
$script:SysRoot = if ($env:SystemRoot) { $env:SystemRoot.ToLower() } else { 'c:\windows' }

# MITRE ATT&CK techniques referenced by the rule base: Id -> (Name, Tactic)
$script:Attack = @{
    'T1003'     = @('OS Credential Dumping', 'Credential Access')
    'T1003.001' = @('LSASS Memory', 'Credential Access')
    'T1003.002' = @('Security Account Manager', 'Credential Access')
    'T1003.003' = @('NTDS', 'Credential Access')
    'T1021.001' = @('Remote Desktop Protocol', 'Lateral Movement')
    'T1021.002' = @('SMB/Windows Admin Shares', 'Lateral Movement')
    'T1027'     = @('Obfuscated Files or Information', 'Defense Evasion')
    'T1036'     = @('Masquerading', 'Defense Evasion')
    'T1036.001' = @('Invalid Code Signature', 'Defense Evasion')
    'T1036.002' = @('Right-to-Left Override', 'Defense Evasion')
    'T1036.003' = @('Rename System Utilities', 'Defense Evasion')
    'T1036.004' = @('Masquerade Task or Service', 'Defense Evasion')
    'T1036.005' = @('Match Legitimate Name or Location', 'Defense Evasion')
    'T1036.007' = @('Double File Extension', 'Defense Evasion')
    'T1046'     = @('Network Service Discovery', 'Discovery')
    'T1047'     = @('Windows Management Instrumentation', 'Execution')
    'T1053.005' = @('Scheduled Task', 'Persistence')
    'T1055'     = @('Process Injection', 'Defense Evasion')
    'T1059.001' = @('PowerShell', 'Execution')
    'T1059.003' = @('Windows Command Shell', 'Execution')
    'T1059.005' = @('Visual Basic', 'Execution')
    'T1068'     = @('Exploitation for Privilege Escalation', 'Privilege Escalation')
    'T1069.002' = @('Domain Groups', 'Discovery')
    'T1070'     = @('Indicator Removal', 'Defense Evasion')
    'T1070.001' = @('Clear Windows Event Logs', 'Defense Evasion')
    'T1070.004' = @('File Deletion', 'Defense Evasion')
    'T1071'     = @('Application Layer Protocol', 'Command and Control')
    'T1078'     = @('Valid Accounts', 'Initial Access')
    'T1087.002' = @('Domain Account', 'Discovery')
    'T1098'     = @('Account Manipulation', 'Persistence')
    'T1102'     = @('Web Service', 'Command and Control')
    'T1105'     = @('Ingress Tool Transfer', 'Command and Control')
    'T1110.001' = @('Password Guessing', 'Credential Access')
    'T1110.003' = @('Password Spraying', 'Credential Access')
    'T1112'     = @('Modify Registry', 'Defense Evasion')
    'T1127.001' = @('MSBuild', 'Defense Evasion')
    'T1134.001' = @('Token Impersonation/Theft', 'Privilege Escalation')
    'T1134.004' = @('Parent PID Spoofing', 'Defense Evasion')
    'T1136.001' = @('Local Account', 'Persistence')
    'T1136.002' = @('Domain Account', 'Persistence')
    'T1137.002' = @('Office Test', 'Persistence')
    'T1140'     = @('Deobfuscate/Decode Files or Information', 'Defense Evasion')
    'T1197'     = @('BITS Jobs', 'Defense Evasion')
    'T1204.002' = @('Malicious File', 'Execution')
    'T1218.004' = @('InstallUtil', 'Defense Evasion')
    'T1218.005' = @('Mshta', 'Defense Evasion')
    'T1218.007' = @('Msiexec', 'Defense Evasion')
    'T1218.009' = @('Regsvcs/Regasm', 'Defense Evasion')
    'T1218.010' = @('Regsvr32', 'Defense Evasion')
    'T1218.011' = @('Rundll32', 'Defense Evasion')
    'T1219'     = @('Remote Access Software', 'Command and Control')
    'T1482'     = @('Domain Trust Discovery', 'Discovery')
    'T1484.001' = @('Group Policy Modification', 'Defense Evasion')
    'T1486'     = @('Data Encrypted for Impact', 'Impact')
    'T1489'     = @('Service Stop', 'Impact')
    'T1490'     = @('Inhibit System Recovery', 'Impact')
    'T1491.001' = @('Internal Defacement', 'Impact')
    'T1505.001' = @('SQL Stored Procedures', 'Persistence')
    'T1505.003' = @('Web Shell', 'Persistence')
    'T1543.003' = @('Windows Service', 'Persistence')
    'T1546'     = @('Event Triggered Execution', 'Persistence')
    'T1546.002' = @('Screensaver', 'Persistence')
    'T1546.003' = @('WMI Event Subscription', 'Persistence')
    'T1546.007' = @('Netsh Helper DLL', 'Persistence')
    'T1546.008' = @('Accessibility Features', 'Persistence')
    'T1546.010' = @('AppInit DLLs', 'Persistence')
    'T1546.012' = @('Image File Execution Options Injection', 'Persistence')
    'T1547'     = @('Boot or Logon Autostart Execution', 'Persistence')
    'T1547.001' = @('Registry Run Keys / Startup Folder', 'Persistence')
    'T1547.004' = @('Winlogon Helper DLL', 'Persistence')
    'T1547.005' = @('Security Support Provider', 'Persistence')
    'T1548.002' = @('Bypass User Account Control', 'Privilege Escalation')
    'T1556.002' = @('Password Filter DLL', 'Credential Access')
    'T1557.001' = @('LLMNR/NBT-NS Poisoning', 'Credential Access')
    'T1558'     = @('Steal or Forge Kerberos Tickets', 'Credential Access')
    'T1558.003' = @('Kerberoasting', 'Credential Access')
    'T1562.001' = @('Disable or Modify Tools', 'Defense Evasion')
    'T1562.002' = @('Disable Windows Event Logging', 'Defense Evasion')
    'T1562.004' = @('Disable or Modify System Firewall', 'Defense Evasion')
    'T1562.010' = @('Downgrade Attack', 'Defense Evasion')
    'T1564.003' = @('Hidden Window', 'Defense Evasion')
    'T1565.001' = @('Stored Data Manipulation', 'Impact')
    'T1567.002' = @('Exfiltration to Cloud Storage', 'Exfiltration')
    'T1569.002' = @('Service Execution', 'Execution')
    'T1571'     = @('Non-Standard Port', 'Command and Control')
    'T1572'     = @('Protocol Tunneling', 'Command and Control')
    'T1574.009' = @('Path Interception by Unquoted Path', 'Persistence')
    'T1588.002' = @('Tool', 'Resource Development')
    'T1620'     = @('Reflective Code Loading', 'Defense Evasion')
    'T1014'     = @('Rootkit', 'Defense Evasion')
    'T1059'     = @('Command and Scripting Interpreter', 'Execution')
    'T1548'     = @('Abuse Elevation Control Mechanism', 'Privilege Escalation')
    'T1553.005' = @('Mark-of-the-Web Bypass', 'Defense Evasion')
    'T1564'     = @('Hide Artifacts', 'Defense Evasion')
    'T1110'     = @('Brute Force', 'Credential Access')
}

$script:TacticOrder = @('Resource Development', 'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
    'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Command and Control', 'Exfiltration', 'Impact')

# Response playbook: technique (or parent technique) -> recommended analyst action
$script:Playbook = [ordered]@{
    'T1486'     = 'Treat as ACTIVE RANSOMWARE: isolate the host now, disable the affected accounts, take backups offline, identify the encrypting process and check other hosts for the same note/extension.'
    'T1490'     = 'Recovery inhibition is a ransomware precursor: isolate the host, protect backups, and identify the account/process that ran the command (see evidence).'
    'T1491'     = 'Ransomware impact on the desktop: follow the ransomware playbook (isolate, preserve, scope).'
    'T1489'     = 'Mass service/process stopping is a pre-encryption step: isolate the host and check for encryption activity.'
    'T1003'     = 'Assume credentials on this host are compromised: reset passwords of logged-on and privileged accounts, review their logons elsewhere, enable LSA protection (RunAsPPL) and Credential Guard.'
    'T1558'     = 'Identify the requesting account; rotate the targeted service-account passwords (long, random) and prefer AES / gMSA.'
    'T1556'     = 'Remove the unauthorised password-filter DLL after acquisition; assume passwords changed since installation are captured.'
    'T1557'     = 'Disable LLMNR/NBT-NS, locate the poisoning host and reset credentials that may have been captured.'
    'T1055'     = 'Capture memory of the source and target processes before termination (e.g. winpmem) and analyse (Volatility malfind); determine the origin of the source binary.'
    'T1620'     = 'Capture process memory; reflective loading is rarely benign - identify the loader and its parent.'
    'T1059'     = 'Decode and review the full script/command (full text is in the JSON export); identify the parent process and delivery vector; block any URL/domain involved.'
    'T1027'     = 'Decode the obfuscated content and review it; treat as malicious until proven otherwise.'
    'T1140'     = 'Decode the payload and review it; identify what was written to disk or executed next.'
    'T1105'     = 'Block the remote URL/IP at proxy/firewall, retrieve the downloaded file and hash/sandbox it, hunt for the same indicator fleet-wide.'
    'T1071'     = 'Block the remote endpoint, search proxy/firewall/DNS logs for other hosts talking to it, and acquire the communicating binary for analysis.'
    'T1102'     = 'Validate the business need for this web service; check proxy logs for uploads/downloads and block if unsanctioned.'
    'T1571'     = 'Identify the listening binary and its origin; block the port at the host firewall if unsanctioned.'
    'T1572'     = 'Tunnelling tools bypass perimeter controls: confirm authorisation, otherwise kill the process and block its relay endpoints.'
    'T1219'     = 'Confirm the remote-access tool is sanctioned; if not, remove it, block its domains and review its connection logs for attacker sessions.'
    'T1547'     = 'Document then remove the autostart entry after evidence collection; acquire and hash the referenced binary/script and use its timestamps for the timeline.'
    'T1543'     = 'Acquire the service binary, review who created the service (System 7045 / Security 4697) and remove it after evidence collection.'
    'T1053'     = 'Export the task XML, acquire the referenced payload, review the task author/creation time, then disable it.'
    'T1546'     = 'Export the hijack configuration, acquire the referenced binary, then restore the default value.'
    'T1137'     = 'Remove the Office persistence key after acquisition and review recent Office activity of the user.'
    'T1197'     = 'Review the BITS job (bitsadmin /info /verbose), acquire the downloaded file and cancel the job.'
    'T1505'     = 'Inspect the web root for recently modified scripts (web shells), review web server logs for the related requests and patch the exposed application.'
    'T1562'     = 'Re-enable the disabled security control/logging, determine who made the change and when; assume adversary presence and escalate.'
    'T1070'     = 'Log clearing destroys evidence: escalate, collect remaining logs immediately and check central logging (SIEM) for the cleared period.'
    'T1112'     = 'Revert the registry change and determine the modifying process/account and time.'
    'T1110'     = 'Block the source, check for a successful logon from the same source (4624), enforce lockout/MFA and verify the targeted accounts.'
    'T1078'     = 'Validate the logon with the account owner, review the session activity and restrict remote access exposure.'
    'T1021'     = 'Validate the remote session; trace the lateral-movement source and restrict RDP/SMB exposure.'
    'T1136'     = 'Verify the account creation against change management; disable unauthorised accounts.'
    'T1098'     = 'Verify the group-membership change; remove unauthorised members from privileged groups and review the actor.'
    'T1036'     = 'Acquire the file, hash and sandbox it, determine how it arrived (Zone.Identifier, e-mail, browser) and quarantine it via EDR.'
    'T1204'     = 'Identify the delivery vector (e-mail/attachment/download), quarantine the file and check other recipients.'
    'T1218'     = 'Review the full command line and its parent; proxy execution via signed binaries indicates hands-on activity - trace the source.'
    'T1127'     = 'Review the MSBuild project file referenced; inline tasks executing code are rarely legitimate on non-developer hosts.'
    'T1047'     = 'Identify the remote source of the WMI execution (4624 type 3 at that time) and the command executed.'
    'T1569'     = 'Remote service execution suggests lateral movement: find the source host (4624 type 3, 7045) and the credentials used.'
    'T1134'     = 'Investigate the process tree; parent spoofing or token theft indicates an active attacker on the host.'
    'T1068'     = 'Check the driver on loldrivers.io, enable the Microsoft Vulnerable Driver Blocklist (HVCI) and investigate who loaded it.'
    'T1548'     = 'Re-enable UAC (EnableLUA=1) and determine when and by whom it was disabled.'
    'T1565'     = 'Restore the hosts file, identify the redirected domains and the process that modified it.'
    'T1567'     = 'Determine what data was transferred and where; review proxy logs and engage the data-breach process if needed.'
    'T1482'     = 'Active Directory reconnaissance suggests hands-on-keyboard activity: identify the account and hunt for follow-on lateral movement.'
    'T1069'     = 'Identify the account performing reconnaissance and hunt for follow-on activity.'
    'T1087'     = 'Identify the account performing reconnaissance and hunt for follow-on activity.'
    'T1046'     = 'Identify who ran the scanner and why; network scanning from an endpoint often precedes lateral movement.'
    'T1574'     = 'Quote the service ImagePath and check whether a planted binary exists in the intercepted path.'
    'T1484'     = 'Review recent GPO changes (AD event 5136) and the account that made them.'
    'T1588'     = 'Offensive tooling on the host: acquire it, determine when it arrived and what it was used for; escalate.'
}

# ============================================================================
# Indicator & rule base
# ============================================================================

$script:IocDb = @{
    WhitelistedPublishers = @(
        'Microsoft Corporation', 'Microsoft Windows', 'Microsoft Windows Publisher', 'Google LLC', 'Mozilla Corporation',
        'Oracle Corporation', 'NVIDIA Corporation', 'Intel Corporation', 'Advanced Micro Devices, Inc.', 'VMware, Inc.',
        'Citrix Systems, Inc.', 'Amazon Web Services, Inc.', 'Docker Inc', 'HashiCorp', 'The Document Foundation',
        'VideoLAN', 'Wireshark Foundation, Inc.', 'Adobe Inc.', 'Zoom Video Communications, Inc.', 'Apple Inc.', 'Dell Inc', 'HP Inc.', 'Lenovo'
    )

    # Known C2 infrastructure (from v8.6) - extended at runtime by -IocFile
    KnownC2IPs = @('45.133.1.145', '185.220.101.182', '194.147.78.163', '46.161.40.109',
        '91.219.236.232', '185.246.188.73', '198.98.51.189', '103.94.157.5')
    KnownMaliciousDomains = @()
    # Legitimate services frequently abused for staging/exfiltration/C2 (lower confidence)
    SuspiciousServiceDomains = @('transfer.sh', 'pastebin.com', 'paste.ee', 'temp.sh', 'file.io', 'gofile.io', 'anonfiles.com',
        'ngrok.io', 'ngrok-free.app', 'trycloudflare.com', 'api.telegram.org', 'webhook.site', 'requestbin.net', 'interact.sh',
        'oast.fun', 'burpcollaborator.net', 'duckdns.org', 'ddns.net', 'no-ip.org', 'hopto.org', 'serveo.net', 'portmap.io',
        'localtonet.com', 'tempmail24.org', 'guerrillamail.info', '10minutemail.net', 'temp-mail.io', 'mailinator.net')
    KnownMalwareHashes = @()

    # Offensive tools: file name -> ATT&CK technique
    OffensiveTools = @{
        'mimikatz.exe' = 'T1003'; 'mimidrv.sys' = 'T1003'; 'mimilib.dll' = 'T1003'; 'lazagne.exe' = 'T1003'; 'nanodump.exe' = 'T1003.001'
        'dumpert.exe' = 'T1003.001'; 'outflank-dumpert.exe' = 'T1003.001'; 'safetykatz.exe' = 'T1003'; 'sharpkatz.exe' = 'T1003'
        'pypykatz.exe' = 'T1003'; 'sharpdpapi.exe' = 'T1003'; 'sharpchrome.exe' = 'T1003'
        'rubeus.exe' = 'T1558'; 'kerbrute.exe' = 'T1110.003'; 'certify.exe' = 'T1558'; 'certipy.exe' = 'T1558'; 'koh.exe' = 'T1134.001'; 'whisker.exe' = 'T1558'
        'sharphound.exe' = 'T1087.002'; 'bloodhound.exe' = 'T1087.002'; 'seatbelt.exe' = 'T1087.002'; 'sharpup.exe' = 'T1068'
        'winpeas.exe' = 'T1068'; 'winpeasx64.exe' = 'T1068'; 'winpeasany.exe' = 'T1068'
        'juicypotato.exe' = 'T1134.001'; 'godpotato.exe' = 'T1134.001'; 'roguepotato.exe' = 'T1134.001'; 'sweetpotato.exe' = 'T1134.001'
        'printspoofer.exe' = 'T1134.001'; 'printspoofer64.exe' = 'T1134.001'
        'responder.exe' = 'T1557.001'; 'inveigh.exe' = 'T1557.001'; 'crackmapexec.exe' = 'T1021.002'
    }
    # Dual-use admin tools frequently abused (lower confidence, verify authorisation)
    DualUseTools = @{
        'procdump.exe' = 'T1003.001'; 'procdump64.exe' = 'T1003.001'; 'psexec.exe' = 'T1569.002'; 'psexec64.exe' = 'T1569.002'
        'paexec.exe' = 'T1569.002'; 'adfind.exe' = 'T1087.002'; 'advanced_ip_scanner.exe' = 'T1046'; 'netscan.exe' = 'T1046'
        'nmap.exe' = 'T1046'; 'rclone.exe' = 'T1567.002'; 'ngrok.exe' = 'T1572'; 'plink.exe' = 'T1572'; 'chisel.exe' = 'T1572'
    }
    RemoteAccessRegex = '(?i)^(teamviewer|anydesk|splashtop|ateraagent|screenconnect|connectwise|vncserver|tvnserver|uvnc_service|winvnc|rustdesk|mesh agent|meshagent|tacticalrmm|logmein|lmiguardian|kaseya|simplehelp|netsupport|client32|radmin|ammyy|dwagent|remotepc|gotoassist|zohoassist|supremo|sshd)'
    LateralServiceRegex = '(?i)^(psexesvc|paexec.*|remcom.*|csexecsvc|winexesvc|btobto|smbexec.*)$'

    # Allowed directories for critical system binaries (must be directly inside one of them)
    ProcessLocationRules = @{
        'svchost.exe' = @('system32', 'syswow64'); 'csrss.exe' = @('system32'); 'winlogon.exe' = @('system32')
        'lsass.exe' = @('system32'); 'explorer.exe' = @('', 'syswow64'); 'dwm.exe' = @('system32'); 'smss.exe' = @('system32')
        'wininit.exe' = @('system32'); 'services.exe' = @('system32'); 'spoolsv.exe' = @('system32'); 'taskhostw.exe' = @('system32')
        'lsaiso.exe' = @('system32'); 'conhost.exe' = @('system32'); 'rundll32.exe' = @('system32', 'syswow64')
    }
    CriticalNames = @('svchost.exe', 'lsass.exe', 'csrss.exe', 'winlogon.exe', 'services.exe', 'explorer.exe', 'smss.exe',
        'wininit.exe', 'spoolsv.exe', 'taskhostw.exe', 'dllhost.exe', 'conhost.exe', 'rundll32.exe')

    ParentChildRules = @(
        @{ Parents = @('winword.exe', 'excel.exe', 'powerpnt.exe', 'outlook.exe', 'onenote.exe', 'msaccess.exe', 'mspub.exe', 'visio.exe')
           Children = @('cmd.exe', 'powershell.exe', 'pwsh.exe', 'wscript.exe', 'cscript.exe', 'mshta.exe', 'rundll32.exe', 'regsvr32.exe', 'certutil.exe', 'bitsadmin.exe', 'schtasks.exe', 'msbuild.exe')
           Impact = 9; Confidence = 9; Mitre = 'T1204.002'; Title = 'Office application {0} spawned {1}' }
        @{ Parents = @('w3wp.exe', 'httpd.exe', 'nginx.exe', 'tomcat.exe', 'tomcat9.exe', 'php-cgi.exe', 'umworkerprocess.exe')
           Children = @('cmd.exe', 'powershell.exe', 'pwsh.exe', 'whoami.exe', 'net.exe', 'net1.exe', 'certutil.exe', 'rundll32.exe', 'wscript.exe', 'cscript.exe', 'nltest.exe')
           Impact = 10; Confidence = 9; Mitre = 'T1505.003'; Title = 'Web server process {0} spawned {1} (possible web shell)' }
        @{ Parents = @('sqlservr.exe')
           Children = @('cmd.exe', 'powershell.exe', 'pwsh.exe', 'certutil.exe', 'bitsadmin.exe')
           Impact = 9; Confidence = 8; Mitre = 'T1505.001'; Title = 'SQL Server spawned {1} (xp_cmdshell abuse)' }
        @{ Parents = @('wmiprvse.exe')
           Children = @('powershell.exe', 'pwsh.exe', 'cmd.exe', 'mshta.exe', 'rundll32.exe', 'regsvr32.exe')
           Impact = 8; Confidence = 7; Mitre = 'T1047'; Title = 'WMI provider host spawned {1} (WMI execution)' }
        @{ Parents = @('mshta.exe', 'wscript.exe', 'cscript.exe')
           Children = @('powershell.exe', 'pwsh.exe', 'cmd.exe', 'rundll32.exe', 'regsvr32.exe')
           Impact = 8; Confidence = 7; Mitre = 'T1059.005'; Title = 'Script host {0} spawned {1}' }
        @{ Parents = @('services.exe')
           Children = @('cmd.exe', 'powershell.exe', 'pwsh.exe')
           Impact = 8; Confidence = 6; Mitre = 'T1569.002'; Title = 'Service Control Manager launched {1} directly (service-based execution)' }
    )
    # Child -> allowed parents
    ExpectedParents = @{
        'svchost.exe' = @('services.exe', 'svchost.exe', 'msmpeng.exe'); 'lsass.exe' = @('wininit.exe'); 'services.exe' = @('wininit.exe')
        'lsaiso.exe' = @('wininit.exe'); 'csrss.exe' = @('smss.exe'); 'winlogon.exe' = @('smss.exe'); 'wininit.exe' = @('smss.exe')
        'runtimebroker.exe' = @('svchost.exe')
    }
    RenamedSystemBinaries = @('powershell.exe', 'cmd.exe', 'rundll32.exe', 'regsvr32.exe', 'mshta.exe', 'certutil.exe', 'wscript.exe',
        'cscript.exe', 'psexec.c', 'procdump', 'wmic.exe', 'bitsadmin.exe', 'msbuild.exe', 'installutil.exe', 'nltest.exe', 'reg.exe', 'schtasks.exe')
    LolBins = @('powershell.exe', 'pwsh.exe', 'rundll32.exe', 'regsvr32.exe', 'mshta.exe', 'certutil.exe', 'msbuild.exe',
        'installutil.exe', 'wscript.exe', 'cscript.exe', 'bitsadmin.exe', 'cmd.exe', 'regasm.exe', 'regsvcs.exe', 'msiexec.exe')
    ScriptHosts = @('powershell.exe', 'pwsh.exe', 'mshta.exe', 'wscript.exe', 'cscript.exe', 'cmd.exe', 'certutil.exe', 'bitsadmin.exe', 'msbuild.exe', 'installutil.exe')
    AccessibilityBinaries = @('sethc.exe', 'utilman.exe', 'osk.exe', 'magnify.exe', 'narrator.exe', 'displayswitch.exe', 'atbroker.exe')
    SecurityProductImages = '(?i)\\(msmpeng|mssense|senseir|sensendr|csfalconservice|csfalconcontainer|sentinelagent|sentinelservicehost|cylancesvc|repmgr|ekrn|avp|bdservicehost|sophosfilescanner|sophosed|savservice|mcshield|ccsvchst|xagt|taniumclient|elastic-endpoint|vmtoolsd|mrt|nissrv|securityhealthservice|wmiprvse|taskmgr|procexp64|procexp|csrss|wininit|services|lsass|smss|svchost|mpdefendercoreservice)\.exe$'

    SuspiciousPorts = @{
        4444  = @{ Description = 'Metasploit default handler port'; Impact = 9; Confidence = 6 }
        5555  = @{ Description = 'Common backdoor port';             Impact = 8; Confidence = 5 }
        6666  = @{ Description = 'IRC / backdoor port';              Impact = 7; Confidence = 5 }
        31337 = @{ Description = 'Back Orifice / elite port';        Impact = 9; Confidence = 8 }
        12345 = @{ Description = 'NetBus backdoor port';             Impact = 8; Confidence = 6 }
        1337  = @{ Description = 'Common hacker port';               Impact = 6; Confidence = 4 }
    }

    # (some names are concatenated so that this script never matches its own RANSOM-NOTE rule in script-block logs)
    RansomNoteNames = @(('HOW_TO_' + 'DECRYPT.txt'), ('DECRYPT_' + 'INSTRUCTIONS.txt'), ('README_FOR_' + 'DECRYPT.txt'), ('RECOVER_YOUR_' + 'FILES.txt'),
        ('HELP_' + 'DECRYPT.txt'), '!RECOVER_MY_FILES!.txt', 'How_To_Restore_Your_Files.txt', ('How_to_' + 'decrypt_files.txt'), 'decrypt_me.txt',
        ('Restore-My-' + 'Files.txt'), 'RyukReadMe.txt', 'RyukReadMe.html', 'ClopReadMe.txt', 'README_README.txt', 'akira_readme.txt',
        'instructions_read_me.txt', 'FILES ENCRYPTED.txt', 'readme.blacksuit.txt', 'CriticalBreachDetected.pdf', 'How To Restore Your Files.txt', 'info.hta')
    RansomNoteRegex = '(?i)^(how[_\s-]?to[_\s-]?(decrypt|restore|recover)|decrypt[_\s-]?(instructions|me|files)|recover[_\s-]?(your|my)[_\s-]?files|restore[_\s-]?my[_\s-]?files|help[_\s-]?decrypt|readme[_\s-]?for[_\s-]?decrypt|!!!read_me|recover-.+-files|.+\.readme\.txt$|[a-z0-9]{6,12}\.readme\.txt$|.*cactus\.readme)'
    RansomExtensions = @('.locked', '.encrypted', '.crypto', '.crypt', '.dharma', '.maze', '.ryuk', '.lockbit', '.lockbit3', '.conti',
        '.clop', '.blackcat', '.crypted', '.8base', '.lockedz', '.akira', '.royal', '.basta', '.play', '.rhysida', '.blacksuit',
        '.cactus', '.medusa', '.phobos', '.hive', '.babyk', '.deadbolt', '.avos', '.avos2', '.bianlian', '.qilin')

    VulnerableDrivers = @('rtcore64.sys', 'rtcore32.sys', 'gdrv.sys', 'dbutil_2_3.sys', 'dbutildrv2.sys', 'asio64.sys', 'aswarpot.sys',
        'kprocesshacker.sys', 'mhyprot2.sys', 'zamguard64.sys', 'zam64.sys', 'iqvw64e.sys', 'winring0x64.sys', 'truesight.sys',
        'ene.sys', 'atillk64.sys', 'cpuz141.sys', 'gmer64.sys', 'viragt64.sys', 'ksapi64.sys', 'mimidrv.sys', 'wfshbr64.sys',
        'nicm.sys', 'speedfan.sys', 'bs_def64.sys', 'ntiolib_x64.sys', 'amifldrv64.sys', 'procexp152.sys', 'hw.sys', 'physmem.sys')
    NamedPipeRules = @(
        @{ Regex = '^MSSE-\d+-server$';           Title = 'Cobalt Strike default named pipe (MSSE-*-server)'; Impact = 10; Confidence = 9; Mitre = 'T1071' }
        @{ Regex = '^msagent_[0-9a-f]{2,4}$';     Title = 'Cobalt Strike default SMB beacon pipe (msagent_*)'; Impact = 10; Confidence = 9; Mitre = 'T1071,T1021.002' }
        @{ Regex = '^postex_(ssh_)?[0-9a-f]{4}$'; Title = 'Cobalt Strike post-exploitation pipe (postex_*)'; Impact = 10; Confidence = 9; Mitre = 'T1071' }
        @{ Regex = '^status_[0-9a-f]{2}$';        Title = 'Cobalt Strike status pipe (status_*)'; Impact = 9; Confidence = 7; Mitre = 'T1071' }
        @{ Regex = '^(meterpreter|msf)';          Title = 'Metasploit named pipe'; Impact = 10; Confidence = 8; Mitre = 'T1071' }
        @{ Regex = '^gruntsvc$';                  Title = 'Covenant default named pipe'; Impact = 10; Confidence = 8; Mitre = 'T1071' }
        @{ Regex = '^(PSEXESVC|RemCom_communicaton|paexec)'; Title = 'PsExec-style remote execution pipe'; Impact = 8; Confidence = 7; Mitre = 'T1569.002,T1021.002' }
    )
}

# Behaviour rules applied to every command line / script block / autostart value.
# NOTE: literal keywords use a one-character class (e.g. 'Amsi[U]tils') so that this script's
# own text never matches its rules when PowerShell script-block logging records it.
$script:CmdRuleDefs = @(
    # --- Execution / obfuscation ---
    @{ Id = 'PS-ENC';      Impact = 8;  Confidence = 7; Mitre = 'T1027,T1059.001'; Title = 'Encoded PowerShell command';
       Pattern = '(?i)(powershell|pwsh)(\.exe)?\s(.*\s)?[-/](e|ec|en|enc|enco|encod|encode|encodedcommand)\s+[A-Za-z0-9+/=]{40,}' }
    @{ Id = 'PS-CRADLE';   Impact = 9;  Confidence = 9; Mitre = 'T1059.001,T1105'; Title = 'PowerShell download cradle (download and execute)';
       Pattern = '(?i)(\bie[x]\b|invoke-e[x]pression).{0,120}(download[s]tring|download[d]ata|[i]nvoke-webrequest|\bi[w]r\b|net\.webclient|start-bitstransfe[r])|(download[s]tring|download[d]ata).{0,120}\|\s*(\bie[x]\b|invoke-e[x]pression)' }
    @{ Id = 'PS-B64';      Impact = 6;  Confidence = 5; Mitre = 'T1140'; Title = 'Base64 decoding inside PowerShell';
       Pattern = '(?i)\[(System\.)?Convert\]::FromBase64Strin[g]' }
    @{ Id = 'PS-HIDDEN';   Impact = 7;  Confidence = 6; Mitre = 'T1059.001,T1564.003'; Title = 'Hidden PowerShell window with execution-policy bypass';
       Pattern = '(?i)\s[-/]w(indowstyle)?\s+h(idden)?\b.*\s[-/]ex(ecutionpolicy)?\s+bypas[s]|\s[-/]ex(ecutionpolicy)?\s+bypas[s].*\s[-/]w(indowstyle)?\s+h(idden)?\b' }
    @{ Id = 'PS-REFLECT';  Impact = 8;  Confidence = 7; Mitre = 'T1620'; Title = 'Reflective .NET assembly loading';
       Pattern = '(?i)Reflection\.Assembl[y]\]::Load|\[Reflection\.Assembl[y]\]::\(' }
    @{ Id = 'PS-OFFENSE';  Impact = 10; Confidence = 9; Mitre = 'T1059.001,T1003'; Title = 'Offensive PowerShell framework function';
       Pattern = '(?i)Invoke-(Mimikat[z]|BloodHoun[d]|Shellcod[e]|Kerberoas[t]|ReflectivePEInjectio[n]|TokenManipulatio[n]|SMBExe[c]|WMIExe[c]|DCSyn[c]|PowerShellTc[p]|Rubeu[s]|Inveig[h])|PowerSploi[t]|Get-GPPPasswor[d]|Out-Minidum[p]|Invoke-Nin[j]aCopy' }
    @{ Id = 'PS-AMSI';     Impact = 9;  Confidence = 9; Mitre = 'T1562.001'; Title = 'AMSI bypass attempt';
       Pattern = '(?i)Amsi[U]tils|amsi[I]nitFailed|Amsi[S]canBuffer|amsi[C]ontext' }
    @{ Id = 'DEF-TAMPER';  Impact = 9;  Confidence = 8; Mitre = 'T1562.001'; Title = 'Microsoft Defender tampering';
       Pattern = '(?i)Set-MpPreferenc[e].*-Disable(RealtimeMonitoring|BehaviorMonitoring|IOAVProtection|ScriptScanning|IntrusionPreventionSystem)\s+(\$true|1)|Add-MpPreferenc[e].*-Exclusion(Path|Process|Extension)|\bsc(\.exe)?\s+(stop|config|delete)\s+WinDefen[d]' }
    @{ Id = 'GPO-ABUSE';   Impact = 7;  Confidence = 5; Mitre = 'T1484.001'; Title = 'Group Policy modification via PowerShell';
       Pattern = '(?i)(New-GPLin[k]|Set-GPPermission[s]|Set-GPRegistryValu[e])' }
    # --- Credential access ---
    @{ Id = 'LSASS-COMSVCS'; Impact = 10; Confidence = 10; Mitre = 'T1003.001'; Title = 'LSASS memory dump via comsvcs.dll (rundll32 export #24)';
       Pattern = '(?i)comsvc[s](\.dll)?[,\s]+(#\+?24|MiniDum[p])' }
    @{ Id = 'LSASS-PROCDUMP'; Impact = 10; Confidence = 9; Mitre = 'T1003.001'; Title = 'LSASS dump via ProcDump';
       Pattern = '(?i)procdum[p](64)?(\.exe)?\s.*(-ma\s+lsas[s]|\blsas[s](\.exe)?\b)' }
    @{ Id = 'HIVE-SAVE';   Impact = 10; Confidence = 9; Mitre = 'T1003.002'; Title = 'Registry hive dump (SAM / SYSTEM / SECURITY)';
       Pattern = '(?i)\breg(\.exe)?\s+(save|export)\s+(hklm|hkey_local_machine)\\(sa[m]|syste[m]|securit[y])\b' }
    @{ Id = 'NTDS';        Impact = 10; Confidence = 8; Mitre = 'T1003.003'; Title = 'NTDS.dit extraction attempt';
       Pattern = '(?i)ntdsuti[l].*(\bifm\b|create\s+full)|\\ntds\.di[t]\b|vssadmi[n](\.exe)?\s+create\s+shado[w]' }
    @{ Id = 'WDIGEST';     Impact = 9;  Confidence = 8; Mitre = 'T1112,T1003.001'; Title = 'WDigest plaintext credential caching enabled';
       Pattern = '(?i)UseLogon[C]redential\D{0,40}\b1\b' }
    # --- Discovery ---
    @{ Id = 'AD-RECON';    Impact = 6;  Confidence = 6; Mitre = 'T1482,T1069.002'; Title = 'Active Directory reconnaissance';
       Pattern = '(?i)nltes[t](\.exe)?\s+/(domain_trusts|dclist)|\bnet1?(\.exe)?\s+group\s+(domain admin[s]|enterprise admin[s])|adfin[d](\.exe)?\s' }
    # --- Defense evasion / LOLBAS / ingress ---
    @{ Id = 'CERTUTIL';    Impact = 8;  Confidence = 8; Mitre = 'T1105,T1140'; Title = 'Certutil used to download or decode a payload';
       Pattern = '(?i)certuti[l](\.exe)?\s.*[-/](urlcach[e]|verifyct[l]|decod[e]|decodehe[x])\b' }
    @{ Id = 'BITSADMIN';   Impact = 8;  Confidence = 7; Mitre = 'T1197,T1105'; Title = 'BITSAdmin transfer / notify abuse';
       Pattern = '(?i)bitsadmi[n](\.exe)?\s.*/(transfe[r]|addfil[e]|SetNotifyCmdLin[e])' }
    @{ Id = 'MSHTA';       Impact = 9;  Confidence = 8; Mitre = 'T1218.005'; Title = 'MSHTA executing remote or inline script';
       Pattern = '(?i)msht[a](\.exe)?\s.*(https?://|vbscrip[t]:|javascrip[t]:)' }
    @{ Id = 'RUNDLL-JS';   Impact = 9;  Confidence = 9; Mitre = 'T1218.011'; Title = 'Rundll32 JavaScript execution';
       Pattern = '(?i)rundll3[2](\.exe)?\s.*javascrip[t]:' }
    @{ Id = 'RUNDLL-USER'; Impact = 7;  Confidence = 6; Mitre = 'T1218.011'; Title = 'Rundll32 loading a DLL from a user-writable path';
       Pattern = '(?i)rundll3[2](\.exe)?\s+.*\\(appdata|temp|users\\public|programdata|downloads)\\[^,]*\.(dll|dat|tmp|bin|png|jpg)\b' }
    @{ Id = 'REGSVR-SCT';  Impact = 9;  Confidence = 9; Mitre = 'T1218.010'; Title = 'Regsvr32 remote scriptlet (Squiblydoo)';
       Pattern = '(?i)regsvr3[2](\.exe)?\s.*/i:\s*https?://|regsvr3[2].*scrob[j]\.dll' }
    @{ Id = 'MSIEXEC-NET'; Impact = 8;  Confidence = 7; Mitre = 'T1218.007'; Title = 'Msiexec installing a remote package';
       Pattern = '(?i)msiexe[c](\.exe)?\s.*/(i|package)\s*https?://' }
    @{ Id = 'WMIC-CREATE'; Impact = 8;  Confidence = 7; Mitre = 'T1047'; Title = 'WMIC process creation (local or remote execution)';
       Pattern = '(?i)wmi[c](\.exe)?\s.*process\s+call\s+creat[e]' }
    @{ Id = 'SCHTASK-NEW'; Impact = 8;  Confidence = 7; Mitre = 'T1053.005'; Title = 'Scheduled task created with a script / user-path payload';
       Pattern = '(?i)schtask[s](\.exe)?\s+/create\s.*(powershell|cmd(\.exe)?\s*/c|msht[a]|rundll3[2]|regsvr3[2]|wscrip[t]|cscrip[t]|\\appdata\\|\\temp\\|\\users\\public\\)' }
    @{ Id = 'DOTNET-LOL';  Impact = 8;  Confidence = 6; Mitre = 'T1218.004,T1218.009'; Title = '.NET utility proxy execution (InstallUtil / RegSvcs / RegAsm)';
       Pattern = '(?i)\b(InstallUti[l]|RegSvc[s]|RegAs[m])(\.exe)?\s.*(/u\b|/logfile=|\\appdata\\|\\temp\\|\\users\\public\\)' }
    @{ Id = 'MSBUILD';     Impact = 8;  Confidence = 7; Mitre = 'T1127.001'; Title = 'MSBuild project executed from a user-writable path';
       Pattern = '(?i)msbuil[d](\.exe)?\s.*\\(appdata|temp|users\\public|programdata)\\.*\.(xml|csproj|proj|txt)\b' }
    @{ Id = 'URL';         Impact = 5;  Confidence = 4; Mitre = 'T1105'; Title = 'URL present in command line';
       Pattern = '(?i)\b(https?|ftp)://[^\s"''<>]+' }
    @{ Id = 'RANSOM-NOTE'; Impact = 10; Confidence = 8; Mitre = 'T1486'; Title = 'Ransom note referenced in a command / autostart';
       Pattern = '(?i)(how_to_decryp[t]|decrypt_instruction[s]|recover_your_file[s]|restore-my-file[s]|readme_for_decryp[t]|help_decryp[t])[^\s]*\.(txt|html?|hta)\b' }
    # --- Impact / ransomware TTPs ---
    @{ Id = 'VSS-DELETE';  Impact = 10; Confidence = 9; Mitre = 'T1490'; Title = 'Shadow copy deletion';
       Pattern = '(?i)vssadmi[n](\.exe)?\s+(delete\s+shadow[s]|resize\s+shadowstorag[e])|wmi[c](\.exe)?\s+shadowcop[y]\s+delete|Win32_Shadow[C]opy.{0,80}\.(Delete|Remove)|Get-WmiObject\s+Win32_Shadow[C]opy.{0,40}Remove-WmiObjec[t]' }
    @{ Id = 'WBADMIN';     Impact = 10; Confidence = 9; Mitre = 'T1490'; Title = 'Backup catalog deletion';
       Pattern = '(?i)wbadmi[n](\.exe)?\s+delete\s+(catalo[g]|systemstatebacku[p]|backu[p])' }
    @{ Id = 'BCDEDIT';     Impact = 10; Confidence = 9; Mitre = 'T1490'; Title = 'Windows boot recovery disabled';
       Pattern = '(?i)bcdedi[t](\.exe)?\s.*(bootstatuspolic[y]\s+ignoreallfailure[s]|recoveryenable[d]\s+(no|off))' }
    @{ Id = 'LOG-CLEAR';   Impact = 9;  Confidence = 9; Mitre = 'T1070.001'; Title = 'Event log clearing command';
       Pattern = '(?i)wevtuti[l](\.exe)?\s+(cl|clear-lo[g])\s|Clear-Event[L]og|Remove-Event[L]og|\[System\.Diagnostics\.Eventing\.Reader\.EventLogSession\]::GlobalSession\.ClearLo[g]' }
    @{ Id = 'SVC-STOP';    Impact = 8;  Confidence = 7; Mitre = 'T1489'; Title = 'Stopping database / backup / security services';
       Pattern = '(?i)\bnet1?(\.exe)?\s+stop\s+"?[^"]*(sql|vss|backu[p]|veea[m]|sopho[s]|exchang[e]|memta[s]|mepoc[s]|wbengin[e])' }
    @{ Id = 'TASKKILL';    Impact = 8;  Confidence = 7; Mitre = 'T1489'; Title = 'Killing database / office processes (pre-encryption)';
       Pattern = '(?i)taskkil[l](\.exe)?\s+/f\s+/im\s+(sql|oracl[e]|winwor[d]|exce[l]|powerpn[t]|outloo[k]|msacces[s]|vis[i]o|onenot[e]|teamvie[w]er|anydes[k]|veea[m])' }
    @{ Id = 'FSUTIL';      Impact = 8;  Confidence = 7; Mitre = 'T1070'; Title = 'Fsutil anti-forensics (USN journal / reparse point deletion)';
       Pattern = '(?i)fsuti[l](\.exe)?\s+(usn\s+deletejourna[l]|reparsepoint\s+delet[e])' }
    @{ Id = 'CIPHER-WIPE'; Impact = 7;  Confidence = 6; Mitre = 'T1070.004'; Title = 'Free-space wipe (cipher /w)';
       Pattern = '(?i)ciphe[r](\.exe)?\s+/w:' }
    @{ Id = 'FW-DISABLE';  Impact = 8;  Confidence = 8; Mitre = 'T1562.004'; Title = 'Firewall disabled via command';
       Pattern = '(?i)nets[h](\.exe)?\s+(advfirewall\s+set\s+\w+\s+state\s+of[f]|firewall\s+set\s+opmode\s+(mode=)?disabl[e])|Set-NetFirewallProfil[e].*-Enabled\s+(False|0)' }
    @{ Id = 'RDP-ENABLE';  Impact = 7;  Confidence = 6; Mitre = 'T1021.001,T1112'; Title = 'RDP enabled via command / registry';
       Pattern = '(?i)fDenyTSConnection[s]\D{0,40}\b0\b' }
    @{ Id = 'USER-ADD';    Impact = 8;  Confidence = 8; Mitre = 'T1136.001,T1098'; Title = 'Account created or added to Administrators via command';
       Pattern = '(?i)\bnet1?(\.exe)?\s+user\s+\S+\s+\S+\s+/ad[d]|\bnet1?(\.exe)?\s+localgroup\s+"?administrator[s]"?\s+\S+\s+/ad[d]' }
    @{ Id = 'RCLONE';      Impact = 9;  Confidence = 7; Mitre = 'T1567.002'; Title = 'Rclone data transfer (possible exfiltration)';
       Pattern = '(?i)rclon[e](\.exe)?\s+(copy|sync|move)\s' }
)

# ============================================================================
# Generic helpers
# ============================================================================

function Initialize-ScanState {
    $script:State = @{
        Findings           = [System.Collections.Generic.List[object]]::new()
        IocMatches         = [System.Collections.Generic.List[object]]::new()
        Coverage           = [System.Collections.Generic.List[object]]::new()
        Inventory          = [ordered]@{}
        HostInfo           = [ordered]@{}
        PostureChecks      = [System.Collections.Generic.List[object]]::new()
        Seen               = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
        Network            = [System.Collections.Generic.List[object]]::new()
        PersistenceTargets = [System.Collections.Generic.List[object]]::new()
        SuccessLogons      = [System.Collections.Generic.List[object]]::new()
        FailedLogonIps     = @{}
        ShadowCopyCount    = -1
        Current            = $null
    }
    $script:SigCache = @{}
    $script:CmdRules = foreach ($d in $script:CmdRuleDefs) {
        [PSCustomObject]@{
            Id = $d.Id; Title = $d.Title; Impact = $d.Impact; Confidence = $d.Confidence; Mitre = $d.Mitre
            Regex = New-Object System.Text.RegularExpressions.Regex ($d.Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        }
    }
    $script:Telemetry = @{ Sysmon = $false; ScriptBlockLogging = $false; ProcessAudit = $false; CmdLineAudit = $false }
}

function Test-IsAdmin {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        return (New-Object Security.Principal.WindowsPrincipal $id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { return $false }
}

function ConvertTo-DisplayString {
    param($Value, [int]$Max = 4000)
    if ($null -eq $Value) { return '' }
    if ($Value -is [datetime]) { return $Value.ToString('yyyy-MM-dd HH:mm:ss') }
    if ($Value -is [string]) { $s = $Value }
    elseif ($Value -is [System.Collections.IDictionary]) { $s = (($Value.Keys | ForEach-Object { "$_=$($Value[$_])" }) -join '; ') }
    elseif ($Value -is [System.Collections.IEnumerable]) { $s = (@($Value) | ForEach-Object { ConvertTo-DisplayString $_ 500 }) -join '; ' }
    else { $s = [string]$Value }
    if ($s.Length -gt $Max) { $s = $s.Substring(0, $Max) + ' ...[truncated]' }
    return $s
}

function Add-CollectorNote {
    param([string]$Note)
    if ($script:State.Current) { $script:State.Current.Notes.Add($Note) }
}

function Set-CollectorStatus {
    param([ValidateSet('OK', 'Partial', 'Skipped', 'Failed')][string]$Status)
    if (-not $script:State.Current) { return }
    $order = @{ 'OK' = 0; 'Partial' = 1; 'Skipped' = 2; 'Failed' = 3 }
    if ($order[$Status] -gt $order[$script:State.Current.Status]) { $script:State.Current.Status = $Status }
}

function Add-Inventory {
    param([string]$Name, [System.Collections.IDictionary]$Record)
    if (-not $script:State.Inventory.Contains($Name)) {
        $script:State.Inventory[$Name] = [System.Collections.Generic.List[object]]::new()
    }
    $rec = [ordered]@{}
    foreach ($k in $Record.Keys) { $rec[$k] = ConvertTo-DisplayString $Record[$k] 2000 }
    $script:State.Inventory[$Name].Add($rec)
    if ($script:State.Current) { $script:State.Current.Items++ }
}

function Add-PostureCheck {
    param([string]$Area, [string]$Check, [string]$Value, [ValidateSet('Good', 'Warning', 'Bad', 'Info')][string]$Status, [string]$Detail = '')
    $script:State.PostureChecks.Add([PSCustomObject]@{ Area = $Area; Check = $Check; Value = $Value; Status = $Status; Detail = $Detail })
}

function Get-RiskLevel {
    # NIST SP 800-30 style 5x5 matrix (Impact x Confidence, both 1-10).
    param([int]$Impact, [int]$Confidence)
    if ($Impact -le 2) { return 'Info' }
    $impMap = 1
    if ($Impact -ge 9) { $impMap = 5 } elseif ($Impact -ge 7) { $impMap = 4 } elseif ($Impact -ge 5) { $impMap = 3 } elseif ($Impact -ge 3) { $impMap = 2 }
    $confMap = 1
    if ($Confidence -ge 9) { $confMap = 5 } elseif ($Confidence -ge 7) { $confMap = 4 } elseif ($Confidence -ge 5) { $confMap = 3 } elseif ($Confidence -ge 3) { $confMap = 2 }
    $matrix = @(
        # VL  L   M   H   VH  <- Impact
        @( 1,  1,  1,  1,  2 ), # VL confidence
        @( 1,  1,  1,  2,  3 ), # L
        @( 1,  1,  2,  3,  3 ), # M
        @( 1,  2,  3,  3,  4 ), # H
        @( 2,  2,  3,  4,  4 )  # VH
    )
    $riskValue = $matrix[$confMap - 1][$impMap - 1]
    # Rule kept from v8.6: below 'High' confidence (7) a finding cannot be rated High or Critical.
    if ($Confidence -lt 7 -and $riskValue -gt 2) { $riskValue = 2 }
    switch ($riskValue) { 4 { return 'Critical' } 3 { return 'High' } 2 { return 'Moderate' } default { return 'Low' } }
}

function New-Reason {
    param([string]$Title, [int]$Impact, [int]$Confidence, [string]$Mitre = '', [string]$Detail = '',
          [string]$IocValue = '', [string]$IocType = '', [string]$ThreatIntel = '')
    [PSCustomObject]@{ Title = $Title; Impact = $Impact; Confidence = $Confidence; Mitre = $Mitre; Detail = $Detail
                       IocValue = $IocValue; IocType = $IocType; ThreatIntel = $ThreatIntel }
}

function Get-MitreList {
    param([string[]]$Values)
    $out = [System.Collections.Generic.List[string]]::new()
    foreach ($v in $Values) {
        if (-not $v) { continue }
        foreach ($t in ($v -split '[,;\s]+')) { if ($t -and -not $out.Contains($t)) { $out.Add($t) } }
    }
    return $out
}

function Get-TechniqueInfo {
    param([string]$Id)
    if ($script:Attack.ContainsKey($Id)) { return $script:Attack[$Id] }
    $base = ($Id -split '\.')[0]
    if ($script:Attack.ContainsKey($base)) { return $script:Attack[$base] }
    return @($Id, 'Other')
}

function Get-Recommendation {
    param([string[]]$Techniques)
    foreach ($t in $Techniques) {
        if (-not $t) { continue }
        $base = ($t -split '\.')[0]
        if ($script:Playbook.Contains($t)) { return $script:Playbook[$t] }
        if ($script:Playbook.Contains($base)) { return $script:Playbook[$base] }
    }
    return 'Review the evidence and validate with the system owner whether the activity is authorised.'
}

function Add-Finding {
    param(
        [Parameter(Mandatory = $true)][string]$Category,
        [string]$Title = '',
        [object[]]$Reasons = @(),
        [int]$Impact = 0,
        [int]$Confidence = 0,
        [string]$Mitre = '',
        [System.Collections.IDictionary]$Evidence = $null,
        [string]$Entity = '',
        [string]$Source = '',
        $Time = $null,
        [int]$ProcessId = -1,
        [string]$Path = '',
        [string]$RemoteIp = '',
        [string]$User = '',
        [string[]]$Tags = @(),
        [string[]]$Related = @(),
        [ValidateSet('Threat', 'Posture')][string]$Kind = 'Threat',
        [string]$DedupeKey = '',
        [string]$Recommendation = '',
        [switch]$PassThru
    )
    if ($DedupeKey -and -not $script:State.Seen.Add("F|$DedupeKey")) { return }
    $Reasons = @($Reasons | Where-Object { $null -ne $_ })

    if ($Reasons.Count -gt 0) {
        $sorted = @($Reasons | Sort-Object -Property @{ Expression = { $script:RiskRank[(Get-RiskLevel $_.Impact $_.Confidence)] }; Descending = $true },
                                                     @{ Expression = { $_.Impact }; Descending = $true },
                                                     @{ Expression = { $_.Confidence }; Descending = $true })
        $top = $sorted[0]
        if (-not $Title) { $Title = $top.Title }
        if ($top.Impact -gt $Impact) { $Impact = $top.Impact }
        if ($top.Confidence -gt $Confidence) { $Confidence = $top.Confidence }
        # Corroboration: each additional independent signal adds confidence (max +2).
        $support = @($sorted | Select-Object -Skip 1 | Where-Object { $_.Confidence -ge 4 -and $_.Title -ne $top.Title }).Count
        if ($support -gt 0) { $Confidence = [Math]::Min(10, $Confidence + [Math]::Min(2, $support)) }
    }
    if ($Impact -lt 1) { $Impact = 1 }
    if ($Confidence -lt 1) { $Confidence = 1 }

    $mitreList = @(Get-MitreList (@($Reasons | ForEach-Object { $_.Mitre }) + @($Mitre)))
    $tactics = [System.Collections.Generic.List[string]]::new()
    foreach ($t in $mitreList) { $tac = (Get-TechniqueInfo $t)[1]; if (-not $tactics.Contains($tac)) { $tactics.Add($tac) } }

    $id = 'F-{0:D4}' -f ($script:State.Findings.Count + 1)
    $ev = [ordered]@{}
    if ($Evidence) { foreach ($k in $Evidence.Keys) { $v = ConvertTo-DisplayString $Evidence[$k]; if ($v -ne '') { $ev[$k] = $v } } }

    $reasonText = @($Reasons | ForEach-Object {
        $line = '{0} (impact {1}/10, confidence {2}/10)' -f $_.Title, $_.Impact, $_.Confidence
        if ($_.Detail) { $line += ' - ' + (ConvertTo-DisplayString $_.Detail 300) }
        $line
    })
    $iocText = [System.Collections.Generic.List[string]]::new()
    foreach ($r in $Reasons) {
        if (-not $r.IocValue) { continue }
        $iocText.Add("$($r.IocType): $($r.IocValue)")
        $script:State.IocMatches.Add([PSCustomObject]@{
            FindingId = $id; IoC = $r.IocValue; Type = $r.IocType; Description = $r.Title
            Impact = $r.Impact; Confidence = $r.Confidence; ThreatIntel = $r.ThreatIntel; Category = $Category; Entity = $Entity
        })
    }

    $timeText = ''
    if ($Time -is [datetime]) { $timeText = $Time.ToString('yyyy-MM-dd HH:mm:ss') } elseif ($Time) { $timeText = [string]$Time }
    if (-not $Recommendation) { $Recommendation = Get-Recommendation $mitreList }

    $finding = [PSCustomObject][ordered]@{
        Id             = $id
        Kind           = $Kind
        Category       = $Category
        Title          = $Title
        Risk           = (Get-RiskLevel $Impact $Confidence)
        Impact         = $Impact
        Confidence     = $Confidence
        Mitre          = ($mitreList -join ', ')
        Tactics        = ($tactics -join ', ')
        Entity         = $Entity
        Source         = $Source
        Time           = $timeText
        ProcessId      = $ProcessId
        Path           = $Path
        RemoteIp       = $RemoteIp
        User           = $User
        Tags           = @($Tags)
        Related        = @($Related)
        Reasons        = @($reasonText)
        IoCs           = @($iocText)
        Evidence       = $ev
        Recommendation = $Recommendation
    }
    $script:State.Findings.Add($finding)
    if ($PassThru) { return $finding }
}

function Get-LeafName {
    param([string]$Path)
    if (-not $Path) { return '' }
    $p = $Path.Trim().Trim('"')
    return (($p -split '[\\/]')[-1]).ToLower()
}

function Resolve-NormalPath {
    param([string]$Path)
    if (-not $Path) { return '' }
    $p = [Environment]::ExpandEnvironmentVariables($Path.Trim().Trim('"'))
    $p = $p -replace '^\\\?\?\\', '' -replace '^\\\\\?\\', ''
    if ($p -match '^(?i)\\SystemRoot\\') { $p = $env:SystemRoot + $p.Substring(11) }
    elseif ($p -match '^(?i)system32\\') { $p = Join-Path $env:SystemRoot $p }
    return $p
}

function Get-ExecutablePath {
    # Extracts the executable / script path from a command line (quoted or unquoted, with env vars).
    param([string]$CommandLine)
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return '' }
    $cl = [Environment]::ExpandEnvironmentVariables($CommandLine.Trim())
    if ($cl.StartsWith('"')) {
        $end = $cl.IndexOf('"', 1)
        if ($end -gt 1) { return (Resolve-NormalPath $cl.Substring(1, $end - 1)) }
    }
    $m = [regex]::Match($cl, '^(?i)(.+?\.(exe|dll|sys|bat|cmd|ps1|vbs|vbe|js|jse|wsf|hta|scr|com|cpl|msi|jar))(\s|,|$)')
    if ($m.Success) { return (Resolve-NormalPath $m.Groups[1].Value) }
    $first = ($cl -split '\s+')[0]
    return (Resolve-NormalPath $first)
}

function Get-ReferencedScriptPaths {
    # Script / DLL files referenced as arguments (e.g. powershell -File x.ps1, wscript x.vbs, rundll32 x.dll,Entry)
    param([string]$CommandLine)
    if (-not $CommandLine) { return }
    $ms = [regex]::Matches([Environment]::ExpandEnvironmentVariables($CommandLine), '(?i)([a-z]:\\[^"<>|*?\r\n]+?\.(ps1|vbs|vbe|js|jse|wsf|hta|bat|cmd|dll))\b')
    foreach ($m in $ms) { $m.Groups[1].Value }
}

function Test-UserWritablePath {
    param([string]$Path)
    if (-not $Path) { return $false }
    $p = $Path.ToLower()
    return ($p -match '\\appdata\\|\\temp\\|\\tmp\\|\\downloads\\|\\desktop\\|\\documents\\|^[a-z]:\\users\\public\\|^[a-z]:\\perflogs\\|\\\$recycle\.bin\\|\\windows\\temp\\|\\windows\\tasks\\|\\windows\\tracing\\|\\windows\\debug\\|^[a-z]:\\programdata\\[^\\]+$|^[a-z]:\\[^\\]+\.(exe|dll|bat|ps1|vbs|js)$|^[a-z]:\\intel\\|^[a-z]:\\recovery\\')
}

function Test-StandardPath {
    param([string]$Path)
    if (-not $Path) { return $false }
    $p = $Path.ToLower()
    $roots = @("$($script:SysRoot)\", "$($env:ProgramFiles)\".ToLower(), "$(${env:ProgramFiles(x86)})\".ToLower(), "$($env:ProgramData)\microsoft\".ToLower())
    foreach ($r in $roots) {
        if ($r.Length -gt 2 -and $p.StartsWith($r)) {
            if ($r -eq "$($script:SysRoot)\" -and $p -match '\\windows\\(temp|tasks|tracing|debug)\\') { return $false }
            return $true
        }
    }
    return $false
}

function Get-EditDistance {
    param([string]$A, [string]$B)
    $n = $A.Length; $m = $B.Length
    if ([Math]::Abs($n - $m) -gt 2) { return 99 }
    $d = New-Object 'int[,]' ($n + 1), ($m + 1)
    for ($i = 0; $i -le $n; $i++) { $d[$i, 0] = $i }
    for ($j = 0; $j -le $m; $j++) { $d[0, $j] = $j }
    for ($i = 1; $i -le $n; $i++) {
        for ($j = 1; $j -le $m; $j++) {
            $cost = if ($A[$i - 1] -eq $B[$j - 1]) { 0 } else { 1 }
            $d[$i, $j] = [Math]::Min([Math]::Min($d[($i - 1), $j] + 1, $d[$i, ($j - 1)] + 1), $d[($i - 1), ($j - 1)] + $cost)
        }
    }
    return $d[$n, $m]
}

function Test-IsPrivateAddress {
    param([string]$Ip)
    if (-not $Ip) { return $true }
    $addr = $null
    if (-not [System.Net.IPAddress]::TryParse(($Ip -replace '%.*$', ''), [ref]$addr)) { return $true }
    if ($addr.IsIPv4MappedToIPv6) { $addr = $addr.MapToIPv4() }
    if ([System.Net.IPAddress]::IsLoopback($addr) -or $addr.Equals([System.Net.IPAddress]::Any) -or $addr.Equals([System.Net.IPAddress]::IPv6Any)) { return $true }
    $b = $addr.GetAddressBytes()
    if ($addr.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) {
        return ($b[0] -eq 10 -or ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31) -or ($b[0] -eq 192 -and $b[1] -eq 168) -or
                ($b[0] -eq 169 -and $b[1] -eq 254) -or ($b[0] -eq 100 -and $b[1] -ge 64 -and $b[1] -le 127) -or $b[0] -eq 127 -or $b[0] -eq 0 -or $b[0] -ge 224)
    }
    return ($addr.IsIPv6LinkLocal -or $addr.IsIPv6SiteLocal -or $addr.IsIPv6Multicast -or (($b[0] -band 0xfe) -eq 0xfc))
}

function Resolve-Sid {
    param([string]$Sid)
    if (-not $Sid) { return '' }
    try { return (New-Object System.Security.Principal.SecurityIdentifier $Sid).Translate([System.Security.Principal.NTAccount]).Value } catch { return $Sid }
}

function Get-CertField {
    param([string]$Subject, [string]$Field)
    if (-not $Subject) { return '' }
    $m = [regex]::Match($Subject, "(?:^|,\s*)$Field=(""[^""]+""|[^,]+)")
    if ($m.Success) { return $m.Groups[1].Value.Trim('"').Trim() }
    return ''
}

function Get-FileSignatureInfo {
    param([string]$Path)
    if (-not $Path) { return [PSCustomObject]@{ Status = 'NoPath'; Publisher = ''; Subject = ''; Trusted = $false } }
    $key = $Path.ToLower()
    if ($script:SigCache.ContainsKey($key)) { return $script:SigCache[$key] }
    $info = $null
    try {
        if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
            $info = [PSCustomObject]@{ Status = 'FileNotFound'; Publisher = ''; Subject = ''; Trusted = $false }
        } else {
            $s = Get-AuthenticodeSignature -LiteralPath $Path -ErrorAction Stop
            $subj = if ($s.SignerCertificate) { $s.SignerCertificate.Subject } else { '' }
            $pub = Get-CertField $subj 'O'
            if (-not $pub) { $pub = Get-CertField $subj 'CN' }
            $status = $s.Status.ToString()
            $info = [PSCustomObject]@{ Status = $status; Publisher = $pub; Subject = $subj
                                       Trusted = ($status -eq 'Valid' -and $script:IocDb.WhitelistedPublishers -contains $pub) }
        }
    } catch {
        $info = [PSCustomObject]@{ Status = 'Error'; Publisher = ''; Subject = ''; Trusted = $false }
    }
    $script:SigCache[$key] = $info
    return $info
}

function Get-FileSha256 {
    param([string]$Path)
    try { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256 -ErrorAction Stop).Hash } catch { return '' }
}

function Get-FileHashesForIoc {
    # SHA256 always; SHA1/MD5 only when the IoC feed contains hashes of that length.
    param([string]$Path)
    $out = [ordered]@{ SHA256 = (Get-FileSha256 $Path) }
    if ($script:HashAlgos -contains 'SHA1') { try { $out.SHA1 = (Get-FileHash -LiteralPath $Path -Algorithm SHA1 -ErrorAction Stop).Hash } catch {} }
    if ($script:HashAlgos -contains 'MD5')  { try { $out.MD5 = (Get-FileHash -LiteralPath $Path -Algorithm MD5 -ErrorAction Stop).Hash } catch {} }
    return $out
}

function Initialize-EntropyHelper {
    $script:FastEntropy = $false
    try {
        if (-not ('SdemaDts.Entropy' -as [type])) {
            Add-Type -ErrorAction Stop -TypeDefinition @'
namespace SdemaDts {
    public static class Entropy {
        public static double Compute(string path, int maxBytes) {
            using (var fs = new System.IO.FileStream(path, System.IO.FileMode.Open, System.IO.FileAccess.Read, System.IO.FileShare.ReadWrite)) {
                long total = 0; long[] counts = new long[256]; byte[] buf = new byte[65536]; int n;
                while (total < maxBytes && (n = fs.Read(buf, 0, buf.Length)) > 0) {
                    for (int i = 0; i < n; i++) { counts[buf[i]]++; }
                    total += n;
                }
                if (total == 0) { return 0; }
                double e = 0;
                for (int i = 0; i < 256; i++) { if (counts[i] > 0) { double p = (double)counts[i] / total; e -= p * System.Math.Log(p, 2); } }
                return System.Math.Round(e, 2);
            }
        }
    }
}
'@
        }
        $script:FastEntropy = $true
    } catch { $script:FastEntropy = $false }
}

function Get-FileEntropy {
    param([string]$Path)
    try {
        if ($script:FastEntropy) { return [SdemaDts.Entropy]::Compute($Path, 16MB) }
        # Fallback (Constrained Language / no compiler): sample the first 512 KB
        $fs = [System.IO.File]::OpenRead($Path)
        try { $len = [int][Math]::Min($fs.Length, 512KB); $buf = New-Object byte[] $len; $null = $fs.Read($buf, 0, $len) } finally { $fs.Dispose() }
        if ($len -eq 0) { return 0 }
        $counts = New-Object 'int[]' 256
        foreach ($b in $buf) { $counts[$b]++ }
        $e = 0.0
        foreach ($c in $counts) { if ($c -gt 0) { $p = $c / $len; $e -= $p * [Math]::Log($p, 2) } }
        return [Math]::Round($e, 2)
    } catch { return -1 }
}

function Get-MotwInfo {
    # Mark-of-the-Web (Zone.Identifier ADS) - tells where a file was downloaded from.
    param([string]$Path)
    try {
        $z = Get-Content -LiteralPath $Path -Stream Zone.Identifier -ErrorAction Stop
        $zone = ''; $hostUrl = ''; $ref = ''
        foreach ($l in $z) {
            if ($l -match '^ZoneId=(\d)') { $zone = $Matches[1] }
            elseif ($l -match '^HostUrl=(.+)$') { $hostUrl = $Matches[1] }
            elseif ($l -match '^ReferrerUrl=(.+)$') { $ref = $Matches[1] }
        }
        return [PSCustomObject]@{ ZoneId = $zone; HostUrl = $hostUrl; ReferrerUrl = $ref }
    } catch { return $null }
}

function Get-UrlHost {
    param([string]$Url)
    try { return ([uri]$Url).Host.ToLower() } catch { return '' }
}

function Get-UserProfilePaths {
    $list = [System.Collections.Generic.List[string]]::new()
    if ($script:Prof.AllUsers) {
        try {
            foreach ($p in @(Get-CimInstance Win32_UserProfile -ErrorAction Stop)) {
                if (-not $p.Special -and $p.LocalPath -and (Test-Path -LiteralPath $p.LocalPath)) { $list.Add($p.LocalPath) }
            }
        } catch {}
        if ($list.Count -eq 0) {
            foreach ($d in @(Get-ChildItem -Path "$env:SystemDrive\Users" -Directory -ErrorAction SilentlyContinue)) {
                if ($d.Name -notin @('Public', 'Default', 'Default User', 'All Users')) { $list.Add($d.FullName) }
            }
        }
    }
    if ($env:USERPROFILE -and -not $list.Contains($env:USERPROFILE)) { $list.Add($env:USERPROFILE) }
    return $list
}

$script:ExcludeDirRegex = '(?i)^(node_modules|\.git|\.svn|\.hg|site-packages|__pycache__|NuGet|npm-cache|\.npm|\.nuget|vcpkg|Cache|Code Cache|GPUCache|cache2|CacheStorage|Service Worker|IndexedDB|WinSxS|assembly|DriverStore|\.vscode|\.cargo|\.rustup|go|pkg)$'

function Get-FilesLimited {
    # Fast, depth-limited enumeration that skips reparse points, excluded folders and inaccessible paths.
    param([string]$Root, [int]$Depth = 3, [string[]]$Extensions = @(), [datetime]$Since = [datetime]::MinValue, [int]$MaxFiles = 10000)
    $results = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
    if (-not $Root -or -not [System.IO.Directory]::Exists($Root)) { return $results }
    $extSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($e in $Extensions) { [void]$extSet.Add($e) }
    $stack = New-Object System.Collections.Stack
    $stack.Push(@($Root, 0))
    $capped = $false
    while ($stack.Count -gt 0) {
        $item = $stack.Pop(); $dirPath = [string]$item[0]; $lvl = [int]$item[1]
        $di = New-Object System.IO.DirectoryInfo $dirPath
        $files = $null
        try { $files = $di.GetFiles() } catch { $files = @() }
        foreach ($f in $files) {
            if ($extSet.Count -gt 0 -and -not $extSet.Contains($f.Extension)) { continue }
            if ($f.LastWriteTime -lt $Since -and $f.CreationTime -lt $Since) { continue }
            $results.Add($f)
            if ($results.Count -ge $MaxFiles) { $capped = $true; break }
        }
        if ($capped) { break }
        if ($lvl -lt $Depth) {
            $subs = $null
            try { $subs = $di.GetDirectories() } catch { $subs = @() }
            foreach ($s in $subs) {
                if (($s.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
                if ($s.Name -match $script:ExcludeDirRegex) { continue }
                $stack.Push(@($s.FullName, ($lvl + 1)))
            }
        }
    }
    if ($capped) { Add-CollectorNote "File cap ($MaxFiles) reached under $Root - results are partial"; Set-CollectorStatus 'Partial' }
    return $results
}

function Get-EventDataMap {
    # Parses EventData by field NAME (v8.6 used fixed property indexes, which were wrong for several events).
    param($EventRecord)
    $map = @{}
    try {
        $xml = [xml]$EventRecord.ToXml()
        foreach ($d in @($xml.Event.EventData.Data)) {
            if ($null -ne $d -and $d.Name) { $map[$d.Name] = [string]$d.'#text' }
        }
    } catch {}
    return $map
}

function Get-EventsSafe {
    param([hashtable]$Filter, [int]$MaxEvents = 1000)
    $logName = $Filter.LogName
    $ids = if ($Filter.ContainsKey('Id')) { ($Filter.Id -join ',') } else { '*' }
    try {
        $events = @(Get-WinEvent -FilterHashtable $Filter -MaxEvents $MaxEvents -ErrorAction Stop)
        $note = "${logName} [$ids]: $($events.Count) events"
        if ($events.Count -ge $MaxEvents) { $note += " (cap reached - increase -ScanProfile for more)" }
        Add-CollectorNote $note
        return $events
    } catch {
        $msg = $_.Exception.Message
        if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*' -or $msg -like '*No events were found*') {
            Add-CollectorNote "${logName} [$ids]: no events in window"
        } elseif ($msg -like '*There is not an event log*' -or $msg -like '*could not be found*' -or $msg -like '*not found*') {
            Add-CollectorNote "${logName}: log not present on this host"; Set-CollectorStatus 'Partial'
        } elseif ($msg -like '*unauthorized*' -or $msg -like '*Access is denied*' -or $msg -like '*privilege*') {
            Add-CollectorNote "${logName}: access denied (run elevated)"; Set-CollectorStatus 'Partial'
        } else {
            Add-CollectorNote "${logName}: $msg"; Set-CollectorStatus 'Partial'
        }
        return
    }
}

# ============================================================================
# Indicator tests (return reason objects)
# ============================================================================

function Import-IocFeed {
    param([string]$Path)
    if (-not $Path) { return }
    if (-not (Test-Path -LiteralPath $Path)) { Write-Warning "IoC file not found: $Path"; return }
    $ips = @(); $domains = @(); $hashes = @(); $tools = @()
    try {
        if ($Path -match '\.json$') {
            $j = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
            $ips = @($j.ips); $domains = @($j.domains); $hashes = @($j.hashes) + @($j.sha256) + @($j.sha1) + @($j.md5); $tools = @($j.tools)
        } else {
            foreach ($line in (Get-Content -LiteralPath $Path)) {
                $v = (($line -split '[,;\t]')[0]).Trim().Trim('"')
                if (-not $v -or $v.StartsWith('#')) { continue }
                if ($v -match '^[A-Fa-f0-9]{32}$|^[A-Fa-f0-9]{40}$|^[A-Fa-f0-9]{64}$') { $hashes += $v }
                elseif ($v -match '^\d{1,3}(\.\d{1,3}){3}$' -or $v -match '^[0-9a-fA-F:]+:[0-9a-fA-F:]+$') { $ips += $v }
                elseif ($v -match '\.(exe|dll|sys)$') { $tools += $v }
                elseif ($v -match '^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') { $domains += $v }
            }
        }
    } catch { Write-Warning "Could not parse IoC file: $($_.Exception.Message)"; return }
    $script:IocDb.KnownC2IPs += @($ips | Where-Object { $_ })
    $script:IocDb.KnownMaliciousDomains += @($domains | Where-Object { $_ } | ForEach-Object { $_.ToLower().TrimStart('.') })
    $script:IocDb.KnownMalwareHashes += @($hashes | Where-Object { $_ } | ForEach-Object { $_.ToUpper() })
    foreach ($t in @($tools | Where-Object { $_ })) { $script:IocDb.OffensiveTools[$t.ToLower()] = 'T1588.002' }
    $script:IocFeedInfo = [ordered]@{ Path = $Path; IPs = @($ips).Count; Domains = @($domains).Count; Hashes = @($hashes).Count; Tools = @($tools).Count }
}

function Initialize-IocSets {
    $script:C2Set = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($i in $script:IocDb.KnownC2IPs) { [void]$script:C2Set.Add($i) }
    $script:HashSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($h in $script:IocDb.KnownMalwareHashes) { [void]$script:HashSet.Add($h) }
    $script:HashAlgos = @('SHA256')
    if (@($script:IocDb.KnownMalwareHashes | Where-Object { $_.Length -eq 40 }).Count -gt 0) { $script:HashAlgos += 'SHA1' }
    if (@($script:IocDb.KnownMalwareHashes | Where-Object { $_.Length -eq 32 }).Count -gt 0) { $script:HashAlgos += 'MD5' }
}

function Test-IpIoc {
    param([string]$Ip)
    if ($Ip -and $script:C2Set.Contains($Ip)) {
        New-Reason 'Connection with known C2 infrastructure' 10 10 'T1071' "IP $Ip is listed as command-and-control" $Ip 'IP' 'C2 tracker / IoC feed'
    }
}

function Test-DomainMatch {
    param([string]$Domain, [string[]]$List)
    if (-not $Domain) { return $null }
    $d = $Domain.ToLower().TrimEnd('.')
    foreach ($x in $List) { if ($x -and ($d -eq $x -or $d.EndsWith(".$x"))) { return $x } }
    return $null
}

function Test-DomainIoc {
    param([string]$Domain)
    $hit = Test-DomainMatch $Domain $script:IocDb.KnownMaliciousDomains
    if ($hit) { return (New-Reason 'Known malicious domain' 10 9 'T1071' "domain $Domain matches $hit" $Domain 'Domain' 'IoC feed') }
    $hit = Test-DomainMatch $Domain $script:IocDb.SuspiciousServiceDomains
    if ($hit) { return (New-Reason "Abusable web service ($hit) - staging / exfiltration / tunnelling" 5 5 'T1102' "domain $Domain" $Domain 'Domain' 'Abused-services list') }
}

function Test-HashIoc {
    param([System.Collections.IDictionary]$Hashes)
    if (-not $Hashes) { return }
    foreach ($k in $Hashes.Keys) {
        $h = $Hashes[$k]
        if ($h -and $script:HashSet.Contains($h)) {
            return (New-Reason 'File hash matches known malware' 10 10 'T1204.002' "$k $h" $h "Hash ($k)" 'IoC feed')
        }
    }
}

function Test-ToolName {
    param([string]$Leaf)
    if (-not $Leaf) { return }
    $l = $Leaf.ToLower()
    if ($script:IocDb.OffensiveTools.ContainsKey($l)) {
        return (New-Reason "Known offensive / hacking tool: $l" 10 9 $script:IocDb.OffensiveTools[$l] 'file name match' $l 'Tool' 'Offensive tool list')
    }
    if ($script:IocDb.DualUseTools.ContainsKey($l)) {
        return (New-Reason "Dual-use admin tool commonly abused by attackers: $l" 6 5 $script:IocDb.DualUseTools[$l] 'verify that its use is authorised' $l 'Tool' 'Dual-use tool list')
    }
}

function Test-RemoteAccessTool {
    param([string]$Name)
    if ($Name -and $Name -match $script:IocDb.RemoteAccessRegex) {
        New-Reason "Remote-access software ($Name) - verify it is sanctioned" 6 6 'T1219' 'RMM tools are a common ransomware access vector'
    }
}

function Test-CommandLine {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return }
    # Remove quote / caret / backtick obfuscation before matching
    $norm = $Text -replace '[\"\^`]', ''
    foreach ($r in $script:CmdRules) {
        $m = $r.Regex.Match($norm)
        if ($m.Success) {
            $val = $m.Value; if ($val.Length -gt 160) { $val = $val.Substring(0, 160) + '...' }
            New-Reason $r.Title $r.Impact $r.Confidence $r.Mitre "matched: $val"
        }
    }
}

function Test-PathAnomaly {
    param([string]$Image)
    if (-not $Image -or $Image -notmatch '\\') { return }
    $leaf = Get-LeafName $Image
    $full = (Resolve-NormalPath $Image).ToLower()
    $dir = ''
    $idx = $full.LastIndexOf('\')
    if ($idx -gt 0) { $dir = $full.Substring(0, $idx) }
    if ($script:IocDb.ProcessLocationRules.ContainsKey($leaf)) {
        $ok = $false
        foreach ($sub in $script:IocDb.ProcessLocationRules[$leaf]) {
            $allowed = if ($sub) { "$($script:SysRoot)\$sub" } else { $script:SysRoot }
            if ($dir -eq $allowed) { $ok = $true; break }
        }
        if (-not $ok) { New-Reason "System binary name '$leaf' running from an unexpected location" 9 8 'T1036.005' $full }
        return
    }
    foreach ($crit in $script:IocDb.CriticalNames) {
        if ($leaf -ne $crit -and (Get-EditDistance $leaf $crit) -eq 1) {
            New-Reason "File name imitates system binary '$crit' (typosquatting)" 8 6 'T1036.005' $full
            return
        }
    }
}

function Get-ProcessReasons {
    # Rules shared by live processes, Security 4688 and Sysmon EID 1.
    param([string]$Image, [string]$CommandLine, [string]$ParentImage, [string]$OriginalFileName = '')
    $out = [System.Collections.Generic.List[object]]::new()
    $leaf = Get-LeafName $Image
    $parentLeaf = Get-LeafName $ParentImage
    foreach ($r in @(Test-CommandLine $CommandLine)) { $out.Add($r) }
    foreach ($r in @(Test-ToolName $leaf)) { $out.Add($r) }
    foreach ($r in @(Test-PathAnomaly $Image)) { $out.Add($r) }
    if ($OriginalFileName) {
        $orig = $OriginalFileName.ToLower() -replace '\.mui$', ''
        if ($orig -ne $leaf) {
            $tool = Test-ToolName $orig
            if ($tool -and $tool.Impact -ge 10) {
                $out.Add((New-Reason "Renamed offensive tool ($orig running as $leaf)" 10 10 'T1036.003' "OriginalFileName=$OriginalFileName" $orig 'Tool' 'PE version info'))
            } elseif ($script:IocDb.RenamedSystemBinaries -contains $orig -and $leaf -notin @('powershell_ise.exe', 'pwsh.exe')) {
                $out.Add((New-Reason "Renamed system utility ($orig running as $leaf)" 8 8 'T1036.003' "OriginalFileName=$OriginalFileName"))
            }
        }
    }
    if ($parentLeaf) {
        foreach ($rule in $script:IocDb.ParentChildRules) {
            if ($rule.Parents -contains $parentLeaf -and $rule.Children -contains $leaf) {
                $out.Add((New-Reason ($rule.Title -f $parentLeaf, $leaf) $rule.Impact $rule.Confidence $rule.Mitre "parent=$parentLeaf child=$leaf"))
                break
            }
        }
        if ($parentLeaf -notin @('(exited)', 'system', 'idle', 'registry')) {
            $exp = $script:IocDb.ExpectedParents[$leaf]
            if ($exp -and -not ($exp -contains $parentLeaf)) {
                $out.Add((New-Reason "Anomalous parent for $leaf ($parentLeaf, expected $($exp -join ' / '))" 8 8 'T1134.004,T1036.005' "parent=$ParentImage"))
            }
        }
    }
    return $out
}

function Get-AutorunReasons {
    # Evaluates an autostart command (Run key, task action, startup item, WMI consumer...).
    param([string]$Command, [switch]$CheckSignature)
    $out = [System.Collections.Generic.List[object]]::new()
    if ([string]::IsNullOrWhiteSpace($Command)) { return $out }
    foreach ($r in @(Test-CommandLine $Command)) { $out.Add($r) }
    $exe = Get-ExecutablePath $Command
    $leaf = Get-LeafName $exe
    foreach ($r in @(Test-ToolName $leaf)) { $out.Add($r) }
    foreach ($r in @(Test-PathAnomaly $exe)) { $out.Add($r) }
    if ($exe -and (Test-UserWritablePath $exe)) {
        $sig = Get-FileSignatureInfo $exe
        if ($sig.Status -eq 'Valid' -and $sig.Trusted) {
            # Signed, allow-listed software installed per-user (Teams, OneDrive...) - not suspicious by itself
        } elseif ($sig.Status -in @('NotSigned', 'HashMismatch', 'NotTrusted', 'UnknownError')) {
            $out.Add((New-Reason 'Autostart runs an unsigned binary from a user-writable location' 8 7 'T1547.001,T1036.005' "$exe [$($sig.Status)]"))
        } elseif ($sig.Status -eq 'FileNotFound') {
            $out.Add((New-Reason 'Autostart points to a missing file in a user-writable location' 4 5 'T1547.001' $exe))
        } else {
            $out.Add((New-Reason 'Autostart runs from a user-writable location' 6 5 'T1547.001' "$exe [$($sig.Status) $($sig.Publisher)]"))
        }
    } elseif ($CheckSignature -and $exe -and -not (Test-StandardPath $exe)) {
        $sig = Get-FileSignatureInfo $exe
        if ($sig.Status -eq 'HashMismatch') { $out.Add((New-Reason 'Autostart binary has a broken signature (tampered file)' 9 8 'T1036.001' $exe)) }
        elseif ($sig.Status -eq 'NotSigned') { $out.Add((New-Reason 'Autostart runs an unsigned binary outside standard program folders' 6 5 'T1547.001' $exe)) }
    }
    if ($script:IocDb.ScriptHosts -contains $leaf) {
        $out.Add((New-Reason "Autostart launches a script host / LOLBin ($leaf)" 7 6 'T1547.001,T1059' 'script hosts in autostart locations are a common persistence technique'))
    }
    if ($leaf -in @('rundll32.exe', 'regsvr32.exe')) {
        foreach ($ref in @(Get-ReferencedScriptPaths $Command)) {
            if (Test-UserWritablePath $ref) { $out.Add((New-Reason "Autostart loads a DLL from a user-writable path via $leaf" 8 7 'T1218.011,T1547.001' $ref)) }
        }
    }
    foreach ($ref in @(Get-ReferencedScriptPaths $Command)) {
        if ($ref -match '\.(ps1|vbs|vbe|js|jse|wsf|hta|bat|cmd)$' -and (Test-Path -LiteralPath $ref -PathType Leaf)) {
            foreach ($r in @(Get-ScriptContentReasons $ref)) { $out.Add($r) }
        }
    }
    return $out
}

function Get-ScriptContentReasons {
    # Reads the first 64 KB of a script file and applies the command-line rules to it.
    param([string]$Path)
    try {
        $fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
        try {
            $len = [int][Math]::Min($fs.Length, 64KB); $buf = New-Object byte[] $len; $null = $fs.Read($buf, 0, $len)
        } finally { $fs.Dispose() }
        $text = [System.Text.Encoding]::UTF8.GetString($buf)
        if ($text.IndexOf([char]0) -ge 0) { $text = [System.Text.Encoding]::Unicode.GetString($buf) }
        foreach ($r in @(Test-CommandLine $text)) {
            $r.Detail = "in script $Path - $($r.Detail)"
            $r
        }
    } catch {}
}

# ============================================================================
# Collectors - host posture & telemetry
# ============================================================================

function Get-RegValue {
    param([string]$Path, [string]$Name)
    try { return (Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction Stop).$Name } catch { return $null }
}

function Get-SystemPosture {
    $hi = $script:State.HostInfo
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
    $hi['Computer Name'] = $env:COMPUTERNAME
    $hi['DNS Host Name'] = $cs.DNSHostName
    $hi['Domain'] = $cs.Domain
    $hi['Operating System'] = "$($os.Caption) (build $($os.BuildNumber))"
    if ($os.LastBootUpTime) {
        $up = (Get-Date) - $os.LastBootUpTime
        $hi['Last Boot'] = '{0} (uptime {1}d {2}h)' -f $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm'), $up.Days, $up.Hours
    }
    $role = [int]$cs.DomainRole
    $hi['Domain Role'] = switch ($role) { 0 { 'Standalone Workstation' } 1 { 'Member Workstation' } 2 { 'Standalone Server' } 3 { 'Member Server' } 4 { 'Backup Domain Controller' } 5 { 'Primary Domain Controller' } default { 'Unknown' } }
    $script:IsDomainController = $role -ge 4
    $script:IsWorkstation = $role -le 1
    $hi['Interactive User'] = $cs.UserName
    try { $hi['Time Zone'] = (Get-TimeZone).Id } catch {}
    $hi['Manufacturer / Model'] = "$($cs.Manufacturer) $($cs.Model)"
    $ips = @()
    try { $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.PrefixOrigin -ne 'WellKnown' } | ForEach-Object { $_.IPAddress }) } catch {}
    $hi['IP Addresses'] = if ($ips) { $ips -join ', ' } else { 'Unknown' }
    $hi['Scanner Account'] = "$env:USERDOMAIN\$env:USERNAME"
    $hi['Running Elevated'] = if ($script:IsAdmin) { 'Yes' } else { 'NO - coverage is limited' }
    $hi['PowerShell'] = $PSVersionTable.PSVersion.ToString()

    # ---- Telemetry ----
    $sysmonSvc = Get-Service -Name 'Sysmon64', 'Sysmon' -ErrorAction SilentlyContinue | Select-Object -First 1
    $sysmonLog = $null
    try { $sysmonLog = Get-WinEvent -ListLog 'Microsoft-Windows-Sysmon/Operational' -ErrorAction Stop } catch {}
    $script:Telemetry.Sysmon = [bool]($sysmonLog -and $sysmonLog.RecordCount -gt 0)
    if ($sysmonSvc -and $sysmonSvc.Status -ne 'Running') {
        Add-PostureCheck 'Telemetry' 'Sysmon' "Installed but $($sysmonSvc.Status)" 'Bad' 'Sysmon service is not running'
        Add-Finding -Category 'DefenseEvasion' -Title 'Sysmon is installed but not running' -Impact 8 -Confidence 7 -Mitre 'T1562.001' -Entity $sysmonSvc.Name -Source 'Service state' -Tags 'evasion' -Evidence ([ordered]@{ Service = $sysmonSvc.Name; Status = $sysmonSvc.Status })
    } elseif ($script:Telemetry.Sysmon) {
        Add-PostureCheck 'Telemetry' 'Sysmon' "Running ($($sysmonLog.RecordCount) records)" 'Good'
    } else {
        Add-PostureCheck 'Telemetry' 'Sysmon' 'Not installed' 'Warning' 'Injection / mass-encryption / LSASS-access / DNS detections are unavailable'
    }

    $sbl = Get-RegValue 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging' 'EnableScriptBlockLogging'
    $script:Telemetry.ScriptBlockLogging = ($sbl -eq 1)
    if ($sbl -eq 1) { Add-PostureCheck 'Telemetry' 'PowerShell Script Block Logging (4104)' 'Enabled' 'Good' }
    else { Add-PostureCheck 'Telemetry' 'PowerShell Script Block Logging (4104)' 'Not enforced by policy' 'Warning' 'Only blocks Windows considers suspicious are logged' }

    $cmdAudit = Get-RegValue 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System\Audit' 'ProcessCreationIncludeCmdLine_Enabled'
    $script:Telemetry.CmdLineAudit = ($cmdAudit -eq 1)
    $procAudit = 'Unknown'
    try {
        $out = & auditpol.exe /get /subcategory:'{0CCE922B-69AE-11D9-BED3-505054503030}' /r 2>$null
        $row = @($out | Where-Object { $_ -match '0CCE922B' }) | Select-Object -First 1
        if ($row) {
            $cols = $row -split ','
            $setting = $cols[4]
            $script:Telemetry.ProcessAudit = ($setting -match 'Success|1|3')
            $procAudit = $setting
        }
    } catch {}
    $status = if ($script:Telemetry.ProcessAudit -and $script:Telemetry.CmdLineAudit) { 'Good' } elseif ($script:Telemetry.ProcessAudit) { 'Warning' } else { 'Warning' }
    Add-PostureCheck 'Telemetry' 'Process creation auditing (4688)' ("Audit: $procAudit; command line: " + $(if ($cmdAudit -eq 1) { 'yes' } else { 'no' })) $status

    try {
        $sec = Get-WinEvent -ListLog Security -ErrorAction Stop
        $oldest = Get-WinEvent -LogName Security -MaxEvents 1 -Oldest -ErrorAction Stop
        $hours = [Math]::Round(((Get-Date) - $oldest.TimeCreated).TotalHours, 1)
        $st = if ($oldest.TimeCreated -gt $script:Since) { 'Warning' } else { 'Good' }
        Add-PostureCheck 'Telemetry' 'Security log retention' ("{0} MB max, {1} records, oldest {2} ({3}h)" -f [Math]::Round($sec.MaximumSizeInBytes / 1MB), $sec.RecordCount, $oldest.TimeCreated.ToString('yyyy-MM-dd HH:mm'), $hours) $st $(if ($st -eq 'Warning') { 'Log does not cover the whole look-back window' } else { '' })
    } catch { Add-PostureCheck 'Telemetry' 'Security log retention' 'Unavailable (requires elevation)' 'Info' }

    # ---- Hardening ----
    try {
        foreach ($fw in @(Get-NetFirewallProfile -ErrorAction Stop)) {
            if ($fw.Enabled) { Add-PostureCheck 'Hardening' "Firewall ($($fw.Name))" 'Enabled' 'Good' }
            else {
                Add-PostureCheck 'Hardening' "Firewall ($($fw.Name))" 'DISABLED' 'Bad'
                Add-Finding -Kind Posture -Category 'Posture' -Title "Windows Firewall profile '$($fw.Name)' is disabled" -Impact 5 -Confidence 6 -Mitre 'T1562.004' -Entity "Firewall $($fw.Name)" -Source 'Get-NetFirewallProfile'
            }
        }
    } catch { Add-PostureCheck 'Hardening' 'Firewall' 'Unknown' 'Info' }

    $rdpDeny = Get-RegValue 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' 'fDenyTSConnections'
    $nla = Get-RegValue 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' 'UserAuthentication'
    if ($rdpDeny -eq 0) {
        if ($nla -eq 1) { Add-PostureCheck 'Hardening' 'Remote Desktop' 'Enabled (NLA required)' 'Info' }
        else {
            Add-PostureCheck 'Hardening' 'Remote Desktop' 'Enabled WITHOUT NLA' 'Bad'
            Add-Finding -Kind Posture -Category 'Posture' -Title 'RDP is enabled without Network Level Authentication' -Impact 5 -Confidence 6 -Mitre 'T1021.001' -Entity 'RDP-Tcp' -Source 'Registry'
        }
    } else { Add-PostureCheck 'Hardening' 'Remote Desktop' 'Disabled' 'Good' }

    $lua = Get-RegValue 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'EnableLUA'
    if ($lua -eq 0) {
        Add-PostureCheck 'Hardening' 'User Account Control' 'DISABLED' 'Bad'
        Add-Finding -Kind Posture -Category 'Posture' -Title 'User Account Control is disabled (EnableLUA=0)' -Impact 6 -Confidence 6 -Mitre 'T1548.002' -Entity 'EnableLUA' -Source 'Registry'
    } else { Add-PostureCheck 'Hardening' 'User Account Control' 'Enabled' 'Good' }

    $ppl = Get-RegValue 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa' 'RunAsPPL'
    Add-PostureCheck 'Hardening' 'LSA protection (RunAsPPL)' $(if ($ppl -ge 1) { 'Enabled' } else { 'Not enabled' }) $(if ($ppl -ge 1) { 'Good' } else { 'Warning' }) 'Protects LSASS against credential dumping'

    try {
        $dg = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction Stop
        $cg = @($dg.SecurityServicesRunning) -contains 1
        Add-PostureCheck 'Hardening' 'Credential Guard' $(if ($cg) { 'Running' } else { 'Not running' }) $(if ($cg) { 'Good' } else { 'Info' })
    } catch {}

    $wdKey = 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest'
    $wd = Get-RegValue $wdKey ('UseLogon' + 'Credential')
    if ($wd -eq 1) {
        Add-PostureCheck 'Hardening' 'WDigest plaintext credentials' 'ENABLED' 'Bad' 'Classic attacker change to harvest clear-text passwords'
        Add-Finding -Category 'CredentialAccess' -Title 'WDigest clear-text credential caching is enabled' -Impact 8 -Confidence 8 -Mitre 'T1112,T1003.001' -Entity $wdKey -Source 'Registry' -Tags 'credtheft' -Evidence ([ordered]@{ Key = $wdKey; Value = 1 })
    } else { Add-PostureCheck 'Hardening' 'WDigest plaintext credentials' 'Disabled' 'Good' }

    try {
        $smb = Get-SmbServerConfiguration -ErrorAction Stop
        if ($smb.EnableSMB1Protocol) {
            Add-PostureCheck 'Hardening' 'SMBv1 server' 'ENABLED' 'Bad'
            Add-Finding -Kind Posture -Category 'Posture' -Title 'SMBv1 server protocol is enabled' -Impact 4 -Confidence 6 -Entity 'SMB1' -Source 'Get-SmbServerConfiguration' -Recommendation 'Disable SMBv1 (Set-SmbServerConfiguration -EnableSMB1Protocol $false) unless a documented legacy dependency exists.'
        } else { Add-PostureCheck 'Hardening' 'SMBv1 server' 'Disabled' 'Good' }
    } catch {}

    try {
        $admins = @(Get-LocalGroupMember -SID 'S-1-5-32-544' -ErrorAction Stop)
        foreach ($a in $admins) { Add-Inventory 'localAdministrators' ([ordered]@{ Name = $a.Name; Type = $a.ObjectClass; Source = $a.PrincipalSource; SID = $a.SID }) }
        Add-PostureCheck 'Accounts' 'Local Administrators members' "$($admins.Count) members" 'Info' (($admins | ForEach-Object { $_.Name }) -join ', ')
    } catch { Add-CollectorNote 'Local administrators could not be enumerated' }
    try {
        foreach ($u in @(Get-LocalUser -ErrorAction Stop)) {
            Add-Inventory 'localUsers' ([ordered]@{ Name = $u.Name; Enabled = $u.Enabled; LastLogon = $u.LastLogon; PasswordLastSet = $u.PasswordLastSet; Description = $u.Description; SID = $u.SID })
            if ($u.SID -like '*-501' -and $u.Enabled) {
                Add-PostureCheck 'Accounts' 'Guest account' 'ENABLED' 'Bad'
                Add-Finding -Category 'Persistence' -Title 'Built-in Guest account is enabled' -Impact 6 -Confidence 7 -Mitre 'T1078' -Entity $u.Name -Source 'Get-LocalUser'
            }
        }
    } catch {}

    try {
        $sc = @(Get-CimInstance Win32_ShadowCopy -ErrorAction Stop)
        $script:State.ShadowCopyCount = $sc.Count
        Add-PostureCheck 'Recovery' 'Volume shadow copies' "$($sc.Count) present" $(if ($sc.Count -gt 0) { 'Good' } else { 'Warning' }) $(if ($sc.Count -eq 0) { 'No restore points - check whether they were deleted' } else { '' })
    } catch { Add-PostureCheck 'Recovery' 'Volume shadow copies' 'Unknown (requires elevation)' 'Info' }

    try {
        $hf = Get-HotFix -ErrorAction Stop | Where-Object { $_.InstalledOn } | Sort-Object InstalledOn -Descending | Select-Object -First 1
        if ($hf) {
            $age = [int]((Get-Date) - $hf.InstalledOn).TotalDays
            Add-PostureCheck 'Hardening' 'Last update installed' ("{0} on {1} ({2} days ago)" -f $hf.HotFixID, $hf.InstalledOn.ToString('yyyy-MM-dd'), $age) $(if ($age -gt 60) { 'Warning' } else { 'Good' })
        }
    } catch {}
}

function Get-DefenderStatus {
    $since = $script:Since
    $mpOk = $false
    try {
        $mp = Get-MpComputerStatus -ErrorAction Stop
        $mpOk = $true
        $mode = "$($mp.AMRunningMode)"
        Add-PostureCheck 'Antivirus' 'Microsoft Defender mode' $(if ($mode) { $mode } else { 'Normal' }) 'Info'
        if (-not $mp.RealTimeProtectionEnabled -and $mode -notmatch 'Passive|EDR') {
            Add-PostureCheck 'Antivirus' 'Defender real-time protection' 'DISABLED' 'Bad'
            Add-Finding -Category 'DefenseEvasion' -Title 'Microsoft Defender real-time protection is disabled' -Impact 8 -Confidence 8 -Mitre 'T1562.001' -Entity 'Microsoft Defender' -Source 'Get-MpComputerStatus' -Tags 'evasion' `
                -Evidence ([ordered]@{ RealTimeProtection = $mp.RealTimeProtectionEnabled; Antivirus = $mp.AntivirusEnabled; BehaviorMonitor = $mp.BehaviorMonitorEnabled; Mode = $mode })
        } else { Add-PostureCheck 'Antivirus' 'Defender real-time protection' $(if ($mp.RealTimeProtectionEnabled) { 'Enabled' } else { "Off ($mode - third-party AV)" }) $(if ($mp.RealTimeProtectionEnabled) { 'Good' } else { 'Info' }) }
        Add-PostureCheck 'Antivirus' 'Tamper Protection' $(if ($mp.IsTamperProtected) { 'On' } else { 'Off' }) $(if ($mp.IsTamperProtected) { 'Good' } else { 'Warning' })
        $age = [int]$mp.AntivirusSignatureAge
        Add-PostureCheck 'Antivirus' 'Signature age' "$age day(s)" $(if ($age -gt 7) { 'Warning' } else { 'Good' })
    } catch {
        Add-CollectorNote 'Microsoft Defender status unavailable (not installed, disabled or third-party AV)'
    }
    if ($script:IsWorkstation) {
        try {
            $av = @(Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction Stop)
            Add-PostureCheck 'Antivirus' 'Registered AV products' (($av | ForEach-Object { $_.displayName }) -join ', ') 'Info'
        } catch {}
    }

    # --- Exclusions ---
    if ($mpOk) {
        try {
            $pref = Get-MpPreference -ErrorAction Stop
            $sets = @(
                @{ Type = 'Path';      Values = @($pref.ExclusionPath) }
                @{ Type = 'Process';   Values = @($pref.ExclusionProcess) }
                @{ Type = 'Extension'; Values = @($pref.ExclusionExtension) }
            )
            $count = 0
            foreach ($s in $sets) {
                foreach ($x in $s.Values) {
                    if (-not $x -or "$x" -like 'N/A*') { continue }
                    $count++
                    Add-Inventory 'defenderExclusions' ([ordered]@{ Type = $s.Type; Value = $x })
                    $risky = $false
                    switch ($s.Type) {
                        'Path'      { $risky = ($x -match '^[a-zA-Z]:\\?\*?$' -or (Test-UserWritablePath "$x\") -or $x -match '(?i)%(temp|appdata|userprofile)%|\\users\\?$|^\*') }
                        'Process'   { $risky = ((Get-LeafName $x) -in $script:IocDb.LolBins -or (Test-UserWritablePath $x)) }
                        'Extension' { $risky = ($x.TrimStart('.', '*') -in @('exe', 'dll', 'ps1', 'bat', 'cmd', 'vbs', 'js', 'hta', 'scr', 'msi')) }
                    }
                    if ($risky) {
                        Add-Finding -Category 'DefenseEvasion' -Title "High-risk Defender exclusion ($($s.Type): $x)" -Impact 8 -Confidence 7 -Mitre 'T1562.001' -Entity $x -Source 'Get-MpPreference' -Tags 'evasion' `
                            -Evidence ([ordered]@{ ExclusionType = $s.Type; Value = $x; Note = 'Attackers add broad exclusions to run payloads undetected' })
                    }
                }
            }
            Add-PostureCheck 'Antivirus' 'Defender exclusions' "$count configured" $(if ($count -gt 0) { 'Warning' } else { 'Good' })
        } catch { Add-CollectorNote 'Defender exclusions unreadable (requires elevation)' }

        # --- Detections ---
        try {
            $threats = @{}
            foreach ($t in @(Get-MpThreat -ErrorAction SilentlyContinue)) { $threats[[string]$t.ThreatID] = $t }
            $detSince = (Get-Date).AddDays(-[Math]::Max($FileLookbackDays, [Math]::Ceiling($LookbackHours / 24)))
            foreach ($d in @(Get-MpThreatDetection -ErrorAction Stop | Where-Object { $_.InitialDetectionTime -ge $detSince })) {
                $t = $threats[[string]$d.ThreatID]
                $name = if ($t) { $t.ThreatName } else { "ThreatID $($d.ThreatID)" }
                $sev = if ($t) { [int]$t.SeverityID } else { 4 }
                $impact = switch ($sev) { 5 { 10 } 4 { 9 } 2 { 6 } 1 { 4 } default { 7 } }
                $unremediated = ($d.ThreatStatusID -in @(1, 5, 102, 103, 104, 105, 107)) -or ($d.ActionSuccess -eq $false)
                $conf = 10
                if (-not $unremediated) { $impact = [Math]::Max(4, $impact - 3); $conf = 9 }
                $tags = @('av')
                $mitre = ''
                if ($name -match '(?i)^Ransom') { $tags += 'ransomware'; $mitre = 'T1486' }
                elseif ($name -match '(?i)HackTool|Mimikatz|PWS|Lsass|CredDump') { $tags += 'credtheft'; $mitre = 'T1588.002' }
                elseif ($name -match '(?i)Backdoor|CobaltStrike|Meterpreter|Sliver|Beacon') { $tags += 'c2'; $mitre = 'T1071' }
                elseif ($name -match '(?i)^Trojan') { $mitre = 'T1204.002' }
                $res = @($d.Resources) -join '; '
                $title = if ($unremediated) { "Defender detection NOT remediated: $name" } else { "Defender detected (remediated): $name" }
                Add-Finding -Category 'Antivirus' -Title $title -Impact $impact -Confidence $conf -Mitre $mitre -Entity $name -Source 'Microsoft Defender' -Time $d.InitialDetectionTime -Tags $tags `
                    -Path (($res -replace '^(file|process|regkey):_', '') -split ';')[0] -User $d.DomainUser `
                    -Evidence ([ordered]@{ Threat = $name; Severity = $sev; Status = $d.ThreatStatusID; ActionSuccess = $d.ActionSuccess; Resources = $res; Process = $d.ProcessName; User = $d.DomainUser; Detected = $d.InitialDetectionTime }) `
                    -Recommendation 'Confirm the file is quarantined, identify how it arrived (parent process, download source) and hunt for the same threat name / hash on other hosts.'
            }
        } catch { Add-CollectorNote 'Defender detection history unavailable' }
    }

    # --- Defender operational events ---
    $ev = @(Get-EventsSafe @{ LogName = 'Microsoft-Windows-Windows Defender/Operational'; Id = @(1119, 5001, 5007, 5010, 5012, 5013); StartTime = $since } 500)
    foreach ($e in $ev) {
        $msg = "$($e.Message)"
        switch ($e.Id) {
            1119 { Add-Finding -Category 'Antivirus' -Title 'Defender failed to remediate a threat (EID 1119)' -Impact 9 -Confidence 10 -Mitre 'T1204.002' -Entity 'Microsoft Defender' -Time $e.TimeCreated -Source 'Defender 1119' -Evidence ([ordered]@{ Message = $msg }) -DedupeKey "DEF1119|$($e.RecordId)" }
            5001 { Add-Finding -Category 'DefenseEvasion' -Title 'Defender real-time protection was disabled (EID 5001)' -Impact 8 -Confidence 9 -Mitre 'T1562.001' -Entity 'Microsoft Defender' -Time $e.TimeCreated -Source 'Defender 5001' -Tags 'evasion' -DedupeKey "DEF5001|$($e.RecordId)" -Evidence ([ordered]@{ Message = $msg }) }
            5010 { Add-Finding -Category 'DefenseEvasion' -Title 'Defender malware scanning was disabled (EID 5010)' -Impact 8 -Confidence 9 -Mitre 'T1562.001' -Entity 'Microsoft Defender' -Time $e.TimeCreated -Source 'Defender 5010' -Tags 'evasion' -DedupeKey "DEF5010|$($e.RecordId)" }
            5012 { Add-Finding -Category 'DefenseEvasion' -Title 'Defender virus scanning was disabled (EID 5012)' -Impact 8 -Confidence 9 -Mitre 'T1562.001' -Entity 'Microsoft Defender' -Time $e.TimeCreated -Source 'Defender 5012' -Tags 'evasion' -DedupeKey "DEF5012|$($e.RecordId)" }
            5013 { Add-Finding -Category 'DefenseEvasion' -Title 'Tamper Protection blocked a change to Defender (EID 5013)' -Impact 7 -Confidence 8 -Mitre 'T1562.001' -Entity 'Microsoft Defender' -Time $e.TimeCreated -Source 'Defender 5013' -Tags 'evasion' -DedupeKey "DEF5013|$($e.RecordId)" -Evidence ([ordered]@{ Message = $msg }) }
            5007 {
                if ($msg -match '(?i)Exclusions') {
                    $m = [regex]::Match($msg, '(?i)New value:\s*(.+)')
                    Add-Finding -Category 'DefenseEvasion' -Title 'Defender exclusion configuration changed (EID 5007)' -Impact 7 -Confidence 7 -Mitre 'T1562.001' -Entity 'Microsoft Defender' -Time $e.TimeCreated -Source 'Defender 5007' -Tags 'evasion' `
                        -DedupeKey "DEF5007|$($e.RecordId)" -Evidence ([ordered]@{ Change = $(if ($m.Success) { $m.Groups[1].Value } else { $msg.Substring(0, [Math]::Min(600, $msg.Length)) }) })
                }
            }
        }
    }
}

# ============================================================================
# Collectors - event logs
# ============================================================================

function Get-SecurityLogAnalysis {
    if (-not $script:IsAdmin) { Add-CollectorNote 'The Security log requires administrative rights'; Set-CollectorStatus 'Partial' }
    $since = $script:Since
    $max = $script:Prof.MaxEvents

    # ---- Failed logons (4625): brute force / spraying aggregated per source ----
    $byIp = @{}
    foreach ($e in @(Get-EventsSafe @{ LogName = 'Security'; Id = 4625; StartTime = $since } $max)) {
        $d = Get-EventDataMap $e
        $ip = $d['IpAddress']
        if (-not $ip -or $ip -eq '-') { $ip = '(local)' }
        if (-not $byIp.ContainsKey($ip)) {
            $byIp[$ip] = [PSCustomObject]@{
                Ip = $ip; Attempts = 0; First = $e.TimeCreated; Last = $e.TimeCreated
                Users = (New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase))
                Types = (New-Object 'System.Collections.Generic.HashSet[string]'); Hosts = (New-Object 'System.Collections.Generic.HashSet[string]')
                Status = (New-Object 'System.Collections.Generic.HashSet[string]')
            }
        }
        $g = $byIp[$ip]
        $g.Attempts++
        [void]$g.Users.Add(("{0}\{1}" -f $d['TargetDomainName'], $d['TargetUserName']))
        [void]$g.Types.Add([string]$d['LogonType'])
        if ($d['WorkstationName']) { [void]$g.Hosts.Add($d['WorkstationName']) }
        $sub = switch ($d['SubStatus']) { '0xc000006a' { 'bad password' } '0xc0000064' { 'unknown user' } '0xc0000234' { 'locked out' } '0xc0000072' { 'account disabled' } '0xc000006f' { 'outside logon hours' } '0xc0000071' { 'expired password' } default { $d['SubStatus'] } }
        [void]$g.Status.Add([string]$sub)
        if ($e.TimeCreated -lt $g.First) { $g.First = $e.TimeCreated }
        if ($e.TimeCreated -gt $g.Last) { $g.Last = $e.TimeCreated }
    }
    foreach ($g in $byIp.Values) {
        $external = -not (Test-IsPrivateAddress $g.Ip)
        Add-Inventory 'failedLogonSources' ([ordered]@{ SourceIp = $g.Ip; Attempts = $g.Attempts; DistinctAccounts = $g.Users.Count; Accounts = (@($g.Users) | Select-Object -First 15) -join ', '
            LogonTypes = (@($g.Types) -join ','); Workstations = (@($g.Hosts) -join ','); Reasons = (@($g.Status) -join ', '); FirstSeen = $g.First; LastSeen = $g.Last; External = $external })
        $reasons = @()
        $reasons += Test-IpIoc $g.Ip
        if ($g.Users.Count -ge 5 -and $g.Attempts -ge $script:BruteForceThreshold) {
            $reasons += New-Reason 'Password spraying: many accounts tried from one source' $(if ($external) { 8 } else { 7 }) 8 'T1110.003' "$($g.Users.Count) accounts / $($g.Attempts) attempts"
        } elseif ($g.Attempts -ge $script:BruteForceThreshold) {
            $reasons += New-Reason 'Brute force: repeated failed logons from one source' $(if ($external) { 8 } else { 6 }) 7 'T1110.001' "$($g.Attempts) attempts against $($g.Users.Count) account(s)"
        }
        if ($reasons.Count -gt 0) {
            $script:State.FailedLogonIps[$g.Ip] = $g.First
            Add-Finding -Category 'Authentication' -Reasons $reasons -Entity "Source $($g.Ip)" -RemoteIp $g.Ip -Time $g.Last -Source 'Security 4625' -Tags 'bruteforce' `
                -Evidence ([ordered]@{ SourceIp = $g.Ip; External = $external; Attempts = $g.Attempts; Accounts = (@($g.Users) | Select-Object -First 20); LogonTypes = @($g.Types); FailureReasons = @($g.Status); FirstSeen = $g.First; LastSeen = $g.Last })
        }
    }

    # ---- Successful network / RDP logons (4624) ----
    $agg = @{}
    foreach ($e in @(Get-EventsSafe @{ LogName = 'Security'; Id = 4624; StartTime = $since } $max)) {
        $d = Get-EventDataMap $e
        $type = 0; [void][int]::TryParse([string]$d['LogonType'], [ref]$type)
        if ($type -notin @(3, 10)) { continue }
        $ip = $d['IpAddress']
        if (-not $ip -or $ip -in @('-', '::1', '127.0.0.1')) { continue }
        if ($d['TargetUserName'] -like '*$' -or $d['TargetUserName'] -eq 'ANONYMOUS LOGON') { continue }
        $user = "{0}\{1}" -f $d['TargetDomainName'], $d['TargetUserName']
        $script:State.SuccessLogons.Add([PSCustomObject]@{ Ip = $ip; User = $user; Time = $e.TimeCreated; Type = $type; Auth = $d['AuthenticationPackageName'] })
        $k = "$ip|$user|$type"
        if (-not $agg.ContainsKey($k)) { $agg[$k] = [PSCustomObject]@{ Ip = $ip; User = $user; Type = $type; Count = 0; First = $e.TimeCreated; Last = $e.TimeCreated; Auth = $d['AuthenticationPackageName'] } }
        $a = $agg[$k]; $a.Count++
        if ($e.TimeCreated -lt $a.First) { $a.First = $e.TimeCreated }
        if ($e.TimeCreated -gt $a.Last) { $a.Last = $e.TimeCreated }
    }
    foreach ($a in $agg.Values) {
        $external = -not (Test-IsPrivateAddress $a.Ip)
        $typeName = if ($a.Type -eq 10) { 'RDP (10)' } else { 'Network (3)' }
        Add-Inventory 'remoteLogons' ([ordered]@{ SourceIp = $a.Ip; Account = $a.User; LogonType = $typeName; Auth = $a.Auth; Count = $a.Count; First = $a.First; Last = $a.Last; External = $external })
        $reasons = @()
        $reasons += Test-IpIoc $a.Ip
        if ($external -and $a.Type -eq 10) { $reasons += New-Reason 'RDP logon from an external (Internet) address' 7 7 'T1021.001,T1078' "$($a.User) from $($a.Ip)" }
        elseif ($external) { $reasons += New-Reason 'Network logon from an external (Internet) address' 6 6 'T1078' "$($a.User) from $($a.Ip) via $($a.Auth)" }
        if ($reasons.Count -gt 0) {
            Add-Finding -Category 'Authentication' -Reasons $reasons -Entity "$($a.User) from $($a.Ip)" -RemoteIp $a.Ip -User $a.User -Time $a.First -Source 'Security 4624' `
                -Evidence ([ordered]@{ Account = $a.User; SourceIp = $a.Ip; LogonType = $typeName; AuthPackage = $a.Auth; Logons = $a.Count; First = $a.First; Last = $a.Last })
        }
    }

    # ---- Security log cleared (1102) ----
    foreach ($e in @(Get-EventsSafe @{ LogName = 'Security'; Id = 1102; StartTime = $since } 50)) {
        $u = ''
        try { $x = [xml]$e.ToXml(); $u = "$($x.Event.UserData.LogFileCleared.SubjectDomainName)\$($x.Event.UserData.LogFileCleared.SubjectUserName)" } catch {}
        Add-Finding -Category 'DefenseEvasion' -Title 'Security event log was cleared' -Impact 9 -Confidence 9 -Mitre 'T1070.001' -Entity 'Security log' -User $u -Time $e.TimeCreated -Source 'Security 1102' -Tags 'evasion' -Evidence ([ordered]@{ ClearedBy = $u; Time = $e.TimeCreated })
    }

    # ---- Account management ----
    $privSid = '^S-1-5-32-(544|548|549|550|551|555|578|580)$|-(512|518|519|520)$'
    foreach ($e in @(Get-EventsSafe @{ LogName = 'Security'; Id = @(4720, 4722, 4724, 4726, 4728, 4732, 4756); StartTime = $since } 1000)) {
        $d = Get-EventDataMap $e
        $actor = "{0}\{1}" -f $d['SubjectDomainName'], $d['SubjectUserName']
        $target = "{0}\{1}" -f $d['TargetDomainName'], $d['TargetUserName']
        $member = $d['MemberName']
        if (-not $member -or $member -eq '-') { $member = Resolve-Sid $d['MemberSid'] }
        $action = switch ($e.Id) { 4720 { 'User account created' } 4722 { 'User account enabled' } 4724 { 'Password reset by another account' } 4726 { 'User account deleted' } default { 'Member added to group' } }
        $subject = if ($e.Id -in @(4728, 4732, 4756)) { "$member -> $target" } else { $target }
        Add-Inventory 'accountChanges' ([ordered]@{ Time = $e.TimeCreated; EventId = $e.Id; Action = $action; Target = $subject; PerformedBy = $actor })
        if ($e.Id -eq 4720) {
            $mitre = if ($script:IsDomainController) { 'T1136.002' } else { 'T1136.001' }
            Add-Finding -Category 'Persistence' -Title "User account created: $target" -Impact 7 -Confidence 6 -Mitre $mitre -Entity $target -User $actor -Time $e.TimeCreated -Source 'Security 4720' -Tags 'persistence' `
                -Evidence ([ordered]@{ NewAccount = $target; CreatedBy = $actor; Sid = $d['TargetSid'] })
        } elseif ($e.Id -in @(4728, 4732, 4756) -and ($d['TargetSid'] -match $privSid -or $d['TargetUserName'] -match '(?i)admin|operators|remote desktop')) {
            Add-Finding -Category 'Persistence' -Title "Account added to privileged group '$($d['TargetUserName'])'" -Impact 8 -Confidence 8 -Mitre 'T1098' -Entity $subject -User $actor -Time $e.TimeCreated -Source "Security $($e.Id)" -Tags 'persistence', 'privesc' `
                -Evidence ([ordered]@{ Member = $member; Group = $target; GroupSid = $d['TargetSid']; PerformedBy = $actor })
        }
    }

    # ---- Scheduled task created (4698) ----
    foreach ($e in @(Get-EventsSafe @{ LogName = 'Security'; Id = 4698; StartTime = $since } 300)) {
        $d = Get-EventDataMap $e
        $content = [string]$d['TaskContent']
        $cmd = [System.Net.WebUtility]::HtmlDecode(([regex]::Match($content, '(?s)<Command>(.*?)</Command>')).Groups[1].Value)
        $arg = [System.Net.WebUtility]::HtmlDecode(([regex]::Match($content, '(?s)<Arguments>(.*?)</Arguments>')).Groups[1].Value)
        $full = "$cmd $arg".Trim()
        $actor = "{0}\{1}" -f $d['SubjectDomainName'], $d['SubjectUserName']
        Add-Inventory 'taskCreationEvents' ([ordered]@{ Time = $e.TimeCreated; Task = $d['TaskName']; Command = $full; CreatedBy = $actor })
        $reasons = @(Get-AutorunReasons $full)
        if ($reasons.Count -gt 0) {
            Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre 'T1053.005' -Entity $d['TaskName'] -Path (Get-ExecutablePath $cmd) -User $actor -Time $e.TimeCreated -Source 'Security 4698' -Tags 'persistence' `
                -DedupeKey "TASK|$($d['TaskName'])|$full" -Evidence ([ordered]@{ Task = $d['TaskName']; Command = $full; CreatedBy = $actor })
        } elseif ($d['TaskName'] -notlike '\Microsoft\*') {
            Add-Finding -Category 'Persistence' -Title "Scheduled task created: $($d['TaskName'])" -Impact 4 -Confidence 5 -Mitre 'T1053.005' -Entity $d['TaskName'] -User $actor -Time $e.TimeCreated -Source 'Security 4698' `
                -Evidence ([ordered]@{ Task = $d['TaskName']; Command = $full; CreatedBy = $actor })
        }
    }

    # ---- Kerberoasting (domain controllers only) ----
    if ($script:IsDomainController) {
        $clients = @{}
        foreach ($e in @(Get-EventsSafe @{ LogName = 'Security'; Id = 4769; StartTime = $since } $max)) {
            $d = Get-EventDataMap $e
            if ($d['TicketEncryptionType'] -ne '0x17') { continue }
            $svc = $d['ServiceName']
            if (-not $svc -or $svc -like '*$' -or $svc -eq 'krbtgt') { continue }
            $k = "$($d['TargetUserName'])|$($d['IpAddress'])"
            if (-not $clients.ContainsKey($k)) { $clients[$k] = [PSCustomObject]@{ User = $d['TargetUserName']; Ip = $d['IpAddress']; Services = (New-Object 'System.Collections.Generic.HashSet[string]'); Last = $e.TimeCreated } }
            [void]$clients[$k].Services.Add($svc)
        }
        foreach ($c in $clients.Values) {
            if ($c.Services.Count -ge 5) {
                Add-Finding -Category 'CredentialAccess' -Title 'Possible Kerberoasting: RC4 service tickets requested for many SPNs' -Impact 8 -Confidence 7 -Mitre 'T1558.003' -Entity "$($c.User) from $($c.Ip)" -RemoteIp ($c.Ip -replace '^::ffff:', '') -User $c.User -Time $c.Last -Source 'Security 4769' -Tags 'credtheft' `
                    -Evidence ([ordered]@{ Account = $c.User; ClientIp = $c.Ip; DistinctServices = $c.Services.Count; Services = (@($c.Services) | Select-Object -First 25) })
            }
        }
    }
}

function Get-ServiceReasons {
    param([string]$Name, [string]$DisplayName, [string]$ImagePath)
    $out = [System.Collections.Generic.List[object]]::new()
    foreach ($r in @(Test-CommandLine $ImagePath)) { $out.Add($r) }
    if ($ImagePath -match '(?i)%COMSPEC%|\bcmd(\.exe)?"?\s*/[ck]\b|powershell|pwsh(\.exe)?\s|\bmshta\b|rundll32(\.exe)?\s+[^,]*\\(appdata|temp|users)') {
        $out.Add((New-Reason 'Service command line launches a shell / script host (PsExec / Cobalt Strike / Metasploit style)' 9 8 'T1569.002,T1543.003' $ImagePath))
    }
    if ($ImagePath -match '(?i)\\\\[^\\]+\\(ADMIN|C|IPC)\$\\') {
        $out.Add((New-Reason 'Service binary located on an administrative share (remote service execution)' 10 9 'T1569.002,T1021.002' $ImagePath))
    }
    if ($Name -match $script:IocDb.LateralServiceRegex) {
        $out.Add((New-Reason "Remote-execution service name ($Name)" 8 8 'T1569.002,T1021.002' 'PsExec / PAExec / RemCom / impacket style service'))
    }
    foreach ($r in @(Test-RemoteAccessTool $Name)) { $out.Add($r) }
    if (-not ($out | Where-Object { $_.Mitre -like '*T1219*' })) { foreach ($r in @(Test-RemoteAccessTool $DisplayName)) { $out.Add($r) } }
    $exe = Get-ExecutablePath $ImagePath
    foreach ($r in @(Test-ToolName (Get-LeafName $exe))) { $out.Add($r) }
    if ($exe -and (Test-UserWritablePath $exe)) {
        $out.Add((New-Reason 'Service binary in a user-writable location' 8 7 'T1543.003' $exe))
    }
    return $out
}

function Get-SystemLogAnalysis {
    $since = $script:Since
    foreach ($e in @(Get-EventsSafe @{ LogName = 'System'; Id = 7045; StartTime = $since } 500)) {
        $d = Get-EventDataMap $e
        $name = $d['ServiceName']; $img = $d['ImagePath']
        Add-Inventory 'serviceInstallEvents' ([ordered]@{ Time = $e.TimeCreated; Service = $name; ImagePath = $img; StartType = $d['StartType']; Account = $d['AccountName'] })
        $reasons = @(Get-ServiceReasons -Name $name -DisplayName $name -ImagePath $img)
        if ($reasons.Count -gt 0) {
            Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre 'T1543.003' -Entity $name -Path (Get-ExecutablePath $img) -Time $e.TimeCreated -Source 'System 7045' -Tags 'persistence' `
                -DedupeKey "SVCINST|$name|$img" -Evidence ([ordered]@{ Service = $name; ImagePath = $img; StartType = $d['StartType']; Account = $d['AccountName'] })
        } elseif ($img -notmatch '(?i)\\(windows\\system32\\drivers|windows\\system32\\DriverStore|program files)') {
            Add-Finding -Category 'Persistence' -Title "New service installed: $name" -Impact 4 -Confidence 5 -Mitre 'T1543.003' -Entity $name -Path (Get-ExecutablePath $img) -Time $e.TimeCreated -Source 'System 7045' `
                -DedupeKey "SVCINST|$name|$img" -Evidence ([ordered]@{ Service = $name; ImagePath = $img; Account = $d['AccountName'] })
        }
    }
    foreach ($e in @(Get-EventsSafe @{ LogName = 'System'; Id = 104; StartTime = $since } 50)) {
        Add-Finding -Category 'DefenseEvasion' -Title 'An event log was cleared (System 104)' -Impact 9 -Confidence 9 -Mitre 'T1070.001' -Entity 'Event log' -Time $e.TimeCreated -Source 'System 104' -Tags 'evasion' -Evidence ([ordered]@{ Message = $e.Message })
    }
    $critical = '(?i)^(WinDefend|Sense|WdNisSvc|EventLog|wscsvc|MpsSvc|SecurityHealthService|Sysmon|Sysmon64|VSS|wbengine|SDRSVC)$'
    foreach ($e in @(Get-EventsSafe @{ LogName = 'System'; Id = 7040; StartTime = $since } 500)) {
        $d = Get-EventDataMap $e
        if ($d['param4'] -match $critical -and $d['param3'] -match '(?i)disabled|deaktiviert|d.sactiv|disattivat|deshabilitad') {
            Add-Finding -Category 'DefenseEvasion' -Title "Security-relevant service set to disabled: $($d['param1'])" -Impact 8 -Confidence 8 -Mitre 'T1562.001' -Entity $d['param4'] -Time $e.TimeCreated -Source 'System 7040' -Tags 'evasion' `
                -Evidence ([ordered]@{ Service = $d['param1']; From = $d['param2']; To = $d['param3'] })
        }
    }
}

function Get-PowerShellLogAnalysis {
    $since = $script:Since
    $events = @(Get-EventsSafe @{ LogName = 'Microsoft-Windows-PowerShell/Operational'; Id = 4104; StartTime = $since } $script:Prof.MaxEvents)
    # Pass 1: large scripts are logged in several parts sharing one ScriptBlockId - find every part belonging to this scanner.
    $parsed = foreach ($e in $events) { [PSCustomObject]@{ Event = $e; Data = (Get-EventDataMap $e) } }
    $selfIds = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($p in $parsed) {
        $t = [string]$p.Data['ScriptBlockText']
        if ($p.Event.ProcessId -eq $PID -or $t.Contains('SDEMA-DTS-' + 'SELF') -or $t.Contains('$script:CmdRule' + 'Defs')) { [void]$selfIds.Add([string]$p.Data['ScriptBlockId']) }
    }
    if ($selfIds.Count -gt 0) { Add-CollectorNote "$($selfIds.Count) script block(s) belonging to this scanner ignored" }
    foreach ($p in $parsed) {
        $e = $p.Event; $d = $p.Data
        if ($selfIds.Contains([string]$d['ScriptBlockId'])) { continue }
        $text = [string]$d['ScriptBlockText']
        if (-not $text) { continue }
        $reasons = @(Test-CommandLine $text)
        if ($e.Level -eq 3) { $reasons += New-Reason 'Script block flagged as suspicious by PowerShell itself (Warning level)' 6 6 'T1059.001' }
        if ($reasons.Count -eq 0) { continue }
        $user = if ($e.UserId) { Resolve-Sid $e.UserId.Value } else { '' }
        $snippet = $text; if ($snippet.Length -gt 3000) { $snippet = $snippet.Substring(0, 3000) + ' ...[truncated]' }
        Add-Finding -Category 'Execution' -Reasons $reasons -Mitre 'T1059.001' -Entity "Script block $($d['ScriptBlockId'])" -Path $d['Path'] -User $user -Time $e.TimeCreated -Source 'PowerShell 4104' -Tags 'execution' `
            -DedupeKey ("4104|" + $text.GetHashCode()) -Evidence ([ordered]@{ ScriptBlockId = $d['ScriptBlockId']; Part = "$($d['MessageNumber'])/$($d['MessageTotal'])"; ScriptPath = $d['Path']; User = $user; ScriptBlock = $snippet })
    }
    # Windows PowerShell classic log: engine start (400) records the host command line - available even without 4104.
    foreach ($e in @(Get-EventsSafe @{ LogName = 'Windows PowerShell'; Id = 400; StartTime = $since } $script:Prof.MaxEvents)) {
        $msg = [string]$e.Message
        $hostApp = ([regex]::Match($msg, 'HostApplication=(.*)')).Groups[1].Value.Trim()
        $engine = ([regex]::Match($msg, 'EngineVersion=([\d\.]+)')).Groups[1].Value
        $reasons = @(Test-CommandLine $hostApp)
        if ($engine -like '2.*') { $reasons += New-Reason 'PowerShell v2 engine started (logging downgrade)' 7 7 'T1562.010' "EngineVersion=$engine" }
        if ($reasons.Count -eq 0) { continue }
        Add-Finding -Category 'Execution' -Reasons $reasons -Mitre 'T1059.001' -Entity 'PowerShell engine start' -Time $e.TimeCreated -Source 'Windows PowerShell 400' -Tags 'execution' `
            -DedupeKey "PS400|$hostApp" -Evidence ([ordered]@{ HostApplication = $hostApp; EngineVersion = $engine })
    }
}

function Get-ProcessCreationLogAnalysis {
    $events = @(Get-EventsSafe @{ LogName = 'Security'; Id = 4688; StartTime = $script:Since } $script:Prof.MaxEvents)
    $withCmd = 0
    foreach ($e in $events) {
        $d = Get-EventDataMap $e
        $img = $d['NewProcessName']; $cmd = $d['CommandLine']; $parent = $d['ParentProcessName']
        if ($cmd) { $withCmd++ }
        $reasons = @(Get-ProcessReasons -Image $img -CommandLine $cmd -ParentImage $parent)
        if ($reasons.Count -eq 0) { continue }
        $user = "{0}\{1}" -f $d['SubjectDomainName'], $d['SubjectUserName']
        Add-Finding -Category 'Execution' -Reasons $reasons -Entity (Get-LeafName $img) -Path $img -User $user -Time $e.TimeCreated -Source 'Security 4688' -Tags 'execution' `
            -DedupeKey "PROC|$img|$cmd" -Evidence ([ordered]@{ Process = $img; CommandLine = $cmd; Parent = $parent; User = $user; ProcessId = $d['NewProcessId'] })
    }
    if ($events.Count -gt 0 -and $withCmd -eq 0) { Add-CollectorNote '4688 events have no command line - enable "Include command line in process creation events"'; Set-CollectorStatus 'Partial' }
}

function Get-SysmonAnalysis {
    if (-not $script:Telemetry.Sysmon) { Add-CollectorNote 'Sysmon is not installed - skipped'; Set-CollectorStatus 'Skipped'; return }
    $events = @(Get-EventsSafe @{ LogName = 'Microsoft-Windows-Sysmon/Operational'; Id = @(1, 3, 8, 10, 11, 22); StartTime = $script:Since } $script:Prof.SysmonMaxEvents)
    $fileBuckets = @{}
    $lsassAccess = @{}
    foreach ($e in $events) {
        $d = Get-EventDataMap $e
        switch ($e.Id) {
            1 {
                $reasons = @(Get-ProcessReasons -Image $d['Image'] -CommandLine $d['CommandLine'] -ParentImage $d['ParentImage'] -OriginalFileName $d['OriginalFileName'])
                $hashes = [ordered]@{}
                foreach ($kv in ([string]$d['Hashes'] -split ',')) { $p = $kv -split '=', 2; if ($p.Count -eq 2) { $hashes[$p[0].Trim()] = $p[1].Trim() } }
                $hr = Test-HashIoc $hashes
                if ($hr) { $reasons += $hr }
                if ($reasons.Count -gt 0) {
                    Add-Finding -Category 'Execution' -Reasons $reasons -Entity (Get-LeafName $d['Image']) -Path $d['Image'] -User $d['User'] -Time $e.TimeCreated -Source 'Sysmon 1' -Tags 'execution' `
                        -DedupeKey "PROC|$($d['Image'])|$($d['CommandLine'])" -Evidence ([ordered]@{ Process = $d['Image']; CommandLine = $d['CommandLine']; Parent = $d['ParentImage']; ParentCommandLine = $d['ParentCommandLine']; User = $d['User']; OriginalFileName = $d['OriginalFileName']; Hashes = $d['Hashes']; ProcessId = $d['ProcessId'] })
                }
            }
            3 {
                $ip = $d['DestinationIp']; $img = $d['Image']; $port = $d['DestinationPort']
                $external = -not (Test-IsPrivateAddress $ip)
                $reasons = @()
                $reasons += Test-IpIoc $ip
                if ($d['DestinationHostname']) { $reasons += Test-DomainIoc $d['DestinationHostname'] }
                $pi = 0; [void][int]::TryParse([string]$port, [ref]$pi)
                if ($external -and $script:IocDb.SuspiciousPorts.ContainsKey($pi)) { $sp = $script:IocDb.SuspiciousPorts[$pi]; $reasons += New-Reason "Outbound connection to suspicious port $pi ($($sp.Description))" $sp.Impact $sp.Confidence 'T1571' "$ip`:$pi" }
                if ($external -and $script:IocDb.LolBins -contains (Get-LeafName $img) -and (Get-LeafName $img) -ne 'msiexec.exe') { $reasons += New-Reason "Script host / LOLBin connected to an external address ($(Get-LeafName $img))" 6 6 'T1071,T1105' "$ip`:$port" }
                if ($reasons.Count -gt 0) {
                    Add-Finding -Category 'Network' -Reasons $reasons -Entity "$(Get-LeafName $img) -> $ip`:$port" -Path $img -RemoteIp $ip -User $d['User'] -Time $e.TimeCreated -Source 'Sysmon 3' -Tags 'c2' `
                        -DedupeKey "NET|$img|$ip|$port" -Evidence ([ordered]@{ Process = $img; Destination = "$ip`:$port"; Hostname = $d['DestinationHostname']; ProcessId = $d['ProcessId']; User = $d['User'] })
                }
            }
            8 {
                $src = $d['SourceImage']; $tgt = $d['TargetImage']
                if (-not $src -or $src -eq $tgt -or $src -match $script:IocDb.SecurityProductImages) { continue }
                $reasons = @(New-Reason 'Remote thread created in another process (process injection)' 9 7 'T1055' "$src -> $tgt")
                if ($script:IocDb.ScriptHosts -contains (Get-LeafName $src) -or (Test-UserWritablePath $src)) { $reasons += New-Reason 'Injection source is a script host or runs from a user-writable path' 10 9 'T1055' $src }
                $tags = @('injection')
                if ((Get-LeafName $tgt) -eq 'lsass.exe') { $reasons += New-Reason 'Injection into LSASS' 10 9 'T1003.001' $tgt; $tags += 'credtheft' }
                Add-Finding -Category 'Injection' -Reasons $reasons -Entity "$(Get-LeafName $src) -> $(Get-LeafName $tgt)" -Path $src -Time $e.TimeCreated -Source 'Sysmon 8' -Tags $tags `
                    -DedupeKey "INJ|$src|$tgt" -Evidence ([ordered]@{ SourceProcess = $src; SourcePid = $d['SourceProcessId']; TargetProcess = $tgt; TargetPid = $d['TargetProcessId']; StartAddress = $d['StartAddress']; StartModule = $d['StartModule']; StartFunction = $d['StartFunction'] })
            }
            10 {
                if ((Get-LeafName $d['TargetImage']) -ne 'lsass.exe') { continue }
                $src = $d['SourceImage']
                if (-not $src -or $src -match $script:IocDb.SecurityProductImages) { continue }
                $acc = ([string]$d['GrantedAccess']).ToLower()
                if ($acc -notin @('0x1010', '0x1410', '0x1438', '0x143a', '0x1fffff', '0x1f3fff', '0x1f1fff', '0x1f0fff', '0x40', '0x10')) { continue }
                if (-not $lsassAccess.ContainsKey($src)) { $lsassAccess[$src] = [PSCustomObject]@{ Source = $src; Count = 0; Access = (New-Object 'System.Collections.Generic.HashSet[string]'); First = $e.TimeCreated; CallTrace = $d['CallTrace'] } }
                $lsassAccess[$src].Count++; [void]$lsassAccess[$src].Access.Add($acc)
            }
            11 {
                $img = $d['Image']; $target = [string]$d['TargetFilename']
                $leaf = Get-LeafName $target
                if ($leaf -match $script:IocDb.RansomNoteRegex -or ($script:IocDb.RansomNoteNames | Where-Object { $_.ToLower() -eq $leaf })) {
                    Add-Finding -Category 'Ransomware' -Title "Ransom note written by $(Get-LeafName $img)" -Impact 10 -Confidence 9 -Mitre 'T1486' -Entity $leaf -Path $img -Time $e.TimeCreated -Source 'Sysmon 11' -Tags 'ransomware' `
                        -DedupeKey "RNOTE11|$img|$leaf" -Evidence ([ordered]@{ Process = $img; NotePath = $target; ProcessId = $d['ProcessId'] })
                }
                if ($img -match '(?i)\\(msiexec|tiworker|trustedinstaller|svchost|msmpeng|onedrive|teams|ms-teams|chrome|msedge|firefox|explorer|searchindexer|dismhost|setup|wuauclt|musnotification)\.exe$') { continue }
                $bucket = "{0}|{1}|{2}" -f $d['ProcessId'], $img, $e.TimeCreated.ToString('yyyyMMddHH')
                if (-not $fileBuckets.ContainsKey($bucket)) { $fileBuckets[$bucket] = [PSCustomObject]@{ Image = $img; ProcessId = $d['ProcessId']; Hour = $e.TimeCreated.ToString('yyyy-MM-dd HH:00'); Count = 0; RansomExt = 0; Sample = [System.Collections.Generic.List[string]]::new() } }
                $b = $fileBuckets[$bucket]; $b.Count++
                $ext = [System.IO.Path]::GetExtension($leaf)
                if ($ext -and $script:IocDb.RansomExtensions -contains $ext.ToLower()) { $b.RansomExt++ }
                if ($b.Sample.Count -lt 8) { $b.Sample.Add($target) }
            }
            22 {
                $q = $d['QueryName']
                $r = Test-DomainIoc $q
                if ($r) {
                    Add-Finding -Category 'Network' -Reasons @($r) -Entity "$(Get-LeafName $d['Image']) -> $q" -Path $d['Image'] -Time $e.TimeCreated -Source 'Sysmon 22' -Tags 'c2' `
                        -DedupeKey "DNS|$($d['Image'])|$q" -Evidence ([ordered]@{ Query = $q; Process = $d['Image']; Result = $d['QueryResults'] })
                }
            }
        }
    }
    foreach ($a in $lsassAccess.Values) {
        $conf = if ($script:IocDb.ScriptHosts -contains (Get-LeafName $a.Source) -or (Test-UserWritablePath $a.Source) -or $a.CallTrace -match '(?i)UNKNOWN|dbghelp|dbgcore') { 9 } else { 7 }
        Add-Finding -Category 'CredentialAccess' -Title "LSASS memory accessed by $(Get-LeafName $a.Source)" -Impact 9 -Confidence $conf -Mitre 'T1003.001' -Entity "$(Get-LeafName $a.Source) -> lsass.exe" -Path $a.Source -Time $a.First -Source 'Sysmon 10' -Tags 'credtheft' `
            -Evidence ([ordered]@{ SourceProcess = $a.Source; Accesses = $a.Count; GrantedAccess = @($a.Access); CallTrace = $a.CallTrace })
    }
    foreach ($b in $fileBuckets.Values) {
        if ($b.Count -lt 300 -and $b.RansomExt -lt 20) { continue }
        $conf = if ($b.RansomExt -ge 20) { 9 } else { 6 }
        Add-Finding -Category 'Ransomware' -Title "Mass file creation by $(Get-LeafName $b.Image) ($($b.Count) files in one hour)" -Impact 10 -Confidence $conf -Mitre 'T1486' -Entity (Get-LeafName $b.Image) -Path $b.Image -Time $b.Hour -Source 'Sysmon 11' -Tags 'ransomware' `
            -Evidence ([ordered]@{ Process = $b.Image; ProcessId = $b.ProcessId; Hour = $b.Hour; FilesCreated = $b.Count; WithRansomwareExtension = $b.RansomExt; Sample = @($b.Sample) })
    }
}

# ============================================================================
# Collectors - live system state
# ============================================================================

function Get-RunningProcesses {
    $cimById = @{}
    foreach ($c in @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)) { $cimById[[int]$c.ProcessId] = $c }
    $gpById = @{}
    $gp = if ($script:IsAdmin) { @(Get-Process -IncludeUserName -ErrorAction SilentlyContinue) } else { @(Get-Process -ErrorAction SilentlyContinue) }
    foreach ($p in $gp) { $gpById[[int]$p.Id] = $p }
    $script:State.ProcessById = @{}

    foreach ($c in $cimById.Values) {
        $procId = [int]$c.ProcessId
        if ($procId -in @(0, 4)) { continue }
        $name = [string]$c.Name
        $path = [string]$c.ExecutablePath
        $cmd = [string]$c.CommandLine
        $ppid = [int]$c.ParentProcessId
        $created = $c.CreationDate
        $parentName = '(exited)'; $parentPath = ''
        $parent = $cimById[$ppid]
        if ($parent -and ($null -eq $created -or $null -eq $parent.CreationDate -or $parent.CreationDate -le $created)) {
            $parentName = ([string]$parent.Name).ToLower(); $parentPath = [string]$parent.ExecutablePath
        }
        $g = $gpById[$procId]
        $company = ''; $desc = ''; $user = ''
        if ($g) { try { $company = $g.Company; $desc = $g.Description } catch {}; if ($g.PSObject.Properties['UserName']) { $user = $g.UserName } }

        $reasons = [System.Collections.Generic.List[object]]::new()
        foreach ($r in @(Get-ProcessReasons -Image $(if ($path) { $path } else { $name }) -CommandLine $cmd -ParentImage $(if ($parentPath) { $parentPath } else { $parentName }))) { $reasons.Add($r) }
        foreach ($r in @(Test-RemoteAccessTool ($name -replace '\.exe$', ''))) { $reasons.Add($r) }

        $sigText = ''
        if ($path) {
            $isUser = Test-UserWritablePath $path
            $isStd = Test-StandardPath $path
            $leaf = $name.ToLower()
            if (-not $isStd -or $script:IocDb.CriticalNames -contains $leaf) {
                $sig = Get-FileSignatureInfo $path
                $sigText = "$($sig.Status) $($sig.Publisher)".Trim()
                $noMeta = [string]::IsNullOrWhiteSpace($company) -and [string]::IsNullOrWhiteSpace($desc)
                if ($sig.Status -eq 'HashMismatch') {
                    $reasons.Add((New-Reason 'Binary signature is invalid (file modified after signing)' 9 9 'T1036.001' $path))
                } elseif ($sig.Status -ne 'Valid') {
                    if ($path.ToLower().StartsWith("$($script:SysRoot)\")) {
                        $reasons.Add((New-Reason 'Unsigned binary running from the Windows directory' 9 8 'T1036.005' $path))
                    } elseif ($isUser) {
                        $c2 = if ($noMeta) { 8 } else { 7 }
                        $reasons.Add((New-Reason 'Unsigned process running from a user-writable location' 8 $c2 'T1036.005,T1204.002' "$path$(if ($noMeta) { ' (no version metadata)' })"))
                    } elseif (-not $isStd) {
                        $reasons.Add((New-Reason 'Unsigned process outside standard program folders' 5 4 'T1036.005' $path))
                    }
                }
            }
            if ($script:HashSet.Count -gt 0 -and ($isUser -or $reasons.Count -gt 0 -or $script:Prof.HashAll)) {
                foreach ($r in @(Test-HashIoc (Get-FileHashesForIoc $path))) { $reasons.Add($r) }
            }
        }

        $finding = $null
        if ($reasons.Count -gt 0) {
            $finding = Add-Finding -Category 'Process' -Reasons $reasons -Entity "$name (PID $procId)" -ProcessId $procId -Path $path -User $user -Time $created -Source 'Live process' -Tags 'process' -PassThru `
                -Evidence ([ordered]@{ Process = $name; PID = $procId; Parent = "$parentName (PID $ppid)"; Path = $path; CommandLine = $cmd; User = $user; Signature = $sigText; Company = $company; Description = $desc; Started = $created })
        }
        $script:State.ProcessById[$procId] = [PSCustomObject]@{ Name = $name; Path = $path; FindingId = $(if ($finding) { $finding.Id } else { '' }); Risk = $(if ($finding) { $finding.Risk } else { '' }) }
        Add-Inventory 'processes' ([ordered]@{ PID = $procId; Name = $name; PPID = $ppid; Parent = $parentName; Path = $path; CommandLine = $cmd; User = $user; Company = $company; Signature = $sigText; Started = $created; Flag = $(if ($finding) { "$($finding.Risk): $($finding.Title)" } else { '' }) })
    }
}

function Get-NetworkConnections {
    $conns = @()
    try { $conns = @(Get-NetTCPConnection -ErrorAction Stop) } catch {
        Add-CollectorNote 'Get-NetTCPConnection unavailable - using netstat'
        foreach ($line in @(& netstat.exe -ano 2>$null)) {
            $m = [regex]::Match($line, '^\s*TCP\s+(\S+):(\d+)\s+(\S+):(\d+)\s+(\S+)\s+(\d+)')
            if ($m.Success) { $conns += [PSCustomObject]@{ LocalAddress = $m.Groups[1].Value.Trim('[', ']'); LocalPort = [int]$m.Groups[2].Value; RemoteAddress = $m.Groups[3].Value.Trim('[', ']'); RemotePort = [int]$m.Groups[4].Value; State = $(if ($m.Groups[5].Value -eq 'LISTENING') { 'Listen' } elseif ($m.Groups[5].Value -eq 'ESTABLISHED') { 'Established' } else { $m.Groups[5].Value }); OwningProcess = [int]$m.Groups[6].Value } }
        }
    }
    $procs = @{}
    foreach ($p in @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)) { $procs[[int]$p.ProcessId] = $p }

    foreach ($c in $conns) {
        $state = [string]$c.State
        if ($state -notin @('Established', 'Listen')) { continue }
        $p = $procs[[int]$c.OwningProcess]
        $pname = if ($p) { [string]$p.Name } else { 'Unknown' }
        $ppath = if ($p) { [string]$p.ExecutablePath } else { '' }
        if ($state -eq 'Listen') {
            if ($c.LocalAddress -in @('127.0.0.1', '::1')) { continue }
            Add-Inventory 'listeningPorts' ([ordered]@{ Address = $c.LocalAddress; Port = $c.LocalPort; PID = $c.OwningProcess; Process = $pname; Path = $ppath })
            $reasons = @()
            if ($script:IocDb.SuspiciousPorts.ContainsKey([int]$c.LocalPort)) { $reasons += New-Reason "Listening on a port associated with backdoors ($($c.LocalPort))" 8 7 'T1571' $script:IocDb.SuspiciousPorts[[int]$c.LocalPort].Description }
            if ($ppath -and (Test-UserWritablePath $ppath)) { $reasons += New-Reason 'Process from a user-writable location is listening for inbound connections' 8 7 'T1571' $ppath }
            if ($reasons.Count -gt 0) {
                Add-Finding -Category 'Network' -Reasons $reasons -Entity "$pname listening on $($c.LocalPort)" -ProcessId ([int]$c.OwningProcess) -Path $ppath -Source 'Live TCP listener' -Tags 'c2' `
                    -DedupeKey "LISTEN|$($c.OwningProcess)|$($c.LocalPort)" -Evidence ([ordered]@{ Process = $pname; PID = $c.OwningProcess; Path = $ppath; Listen = "$($c.LocalAddress):$($c.LocalPort)" })
            }
            continue
        }
        if ($c.RemoteAddress -in @('127.0.0.1', '::1') -or $c.LocalAddress -in @('127.0.0.1', '::1')) { continue }
        $external = -not (Test-IsPrivateAddress $c.RemoteAddress)
        $script:State.Network.Add([PSCustomObject]@{ ProcessId = [int]$c.OwningProcess; Process = $pname; Path = $ppath; Remote = $c.RemoteAddress; Port = [int]$c.RemotePort; External = $external })
        $reasons = @()
        $reasons += Test-IpIoc $c.RemoteAddress
        if ($external -and $script:IocDb.SuspiciousPorts.ContainsKey([int]$c.RemotePort)) { $sp = $script:IocDb.SuspiciousPorts[[int]$c.RemotePort]; $reasons += New-Reason "Connection to suspicious remote port $($c.RemotePort) ($($sp.Description))" $sp.Impact $sp.Confidence 'T1571' "$($c.RemoteAddress):$($c.RemotePort)" }
        $leaf = $pname.ToLower()
        if ($external -and $script:IocDb.LolBins -contains $leaf -and $leaf -ne 'msiexec.exe') { $reasons += New-Reason "Script host / LOLBin with an active external connection ($leaf)" 6 6 'T1071,T1105' "$($c.RemoteAddress):$($c.RemotePort)" }
        $f = $null
        if ($reasons.Count -gt 0) {
            $f = Add-Finding -Category 'Network' -Reasons $reasons -Entity "$pname -> $($c.RemoteAddress):$($c.RemotePort)" -ProcessId ([int]$c.OwningProcess) -Path $ppath -RemoteIp $c.RemoteAddress -Source 'Live TCP connection' -Tags 'c2' -PassThru `
                -Evidence ([ordered]@{ Process = $pname; PID = $c.OwningProcess; Path = $ppath; Local = "$($c.LocalAddress):$($c.LocalPort)"; Remote = "$($c.RemoteAddress):$($c.RemotePort)"; External = $external })
        }
        Add-Inventory 'networkConnections' ([ordered]@{ Local = "$($c.LocalAddress):$($c.LocalPort)"; Remote = "$($c.RemoteAddress):$($c.RemotePort)"; External = $external; PID = $c.OwningProcess; Process = $pname; Path = $ppath; Flag = $(if ($f) { "$($f.Risk): $($f.Title)" } else { '' }) })
    }

    try {
        foreach ($d in @(Get-DnsClientCache -ErrorAction Stop)) {
            $name = [string]$d.Entry
            if (-not $name) { continue }
            $r = Test-DomainIoc $name
            if ($r) {
                Add-Finding -Category 'Network' -Reasons @($r) -Entity $name -Source 'DNS client cache' -Tags 'c2' -DedupeKey "DNSCACHE|$name" -Evidence ([ordered]@{ Name = $name; Data = $d.Data; Type = $d.Type })
            }
            if ($script:Prof.HashAll) { Add-Inventory 'dnsCache' ([ordered]@{ Name = $name; Data = $d.Data; Type = $d.Type }) }
        }
    } catch { Add-CollectorNote 'DNS client cache unavailable' }
}

function Get-NamedPipes {
    $pipes = @()
    try { $pipes = @([System.IO.Directory]::GetFiles('\\.\pipe\')) } catch { Add-CollectorNote 'Named pipes could not be enumerated'; Set-CollectorStatus 'Partial'; return }
    Add-CollectorNote "$($pipes.Count) named pipes enumerated"
    foreach ($p in $pipes) {
        $leaf = ($p -split '\\')[-1]
        foreach ($rule in $script:IocDb.NamedPipeRules) {
            if ($leaf -match $rule.Regex) {
                Add-Inventory 'suspiciousNamedPipes' ([ordered]@{ Pipe = $leaf; Rule = $rule.Title })
                Add-Finding -Category 'Network' -Title $rule.Title -Impact $rule.Impact -Confidence $rule.Confidence -Mitre $rule.Mitre -Entity "\\.\pipe\$leaf" -Source 'Named pipes' -Tags 'c2' -DedupeKey "PIPE|$leaf" `
                    -Evidence ([ordered]@{ Pipe = $leaf; Note = 'Default pipe names of offensive frameworks; confirm by locating the owning process (e.g. Sysinternals handle.exe / pipelist.exe)' })
                break
            }
        }
    }
}

function Get-ServiceAnalysis {
    $services = @(Get-CimInstance Win32_Service -ErrorAction SilentlyContinue)
    foreach ($s in $services) {
        $img = [string]$s.PathName
        $reasons = [System.Collections.Generic.List[object]]::new()
        foreach ($r in @(Get-ServiceReasons -Name $s.Name -DisplayName $s.DisplayName -ImagePath $img)) { $reasons.Add($r) }
        $exe = Get-ExecutablePath $img
        if ($exe -and -not (Test-StandardPath $exe) -and $s.StartMode -eq 'Auto') {
            $sig = Get-FileSignatureInfo $exe
            if ($sig.Status -eq 'HashMismatch') { $reasons.Add((New-Reason 'Service binary signature is invalid (tampered)' 9 9 'T1036.001,T1543.003' $exe)) }
            elseif ($sig.Status -eq 'NotSigned') { $reasons.Add((New-Reason 'Unsigned auto-start service binary outside standard folders' 6 6 'T1543.003' $exe)) }
        }
        if ($img -and $img -notmatch '^\s*"' -and $exe -match ' ' -and $exe -notmatch '(?i)^[a-z]:\\windows\\') {
            Add-Finding -Kind Posture -Category 'Posture' -Title "Unquoted service path with spaces: $($s.Name)" -Impact 4 -Confidence 6 -Mitre 'T1574.009' -Entity $s.Name -Path $exe -Source 'Win32_Service' -DedupeKey "UNQ|$($s.Name)" -Evidence ([ordered]@{ Service = $s.Name; PathName = $img })
        }
        if ($img -match '(?i)\\svchost\.exe') {
            $dll = Get-RegValue "HKLM:\SYSTEM\CurrentControlSet\Services\$($s.Name)\Parameters" 'ServiceDll'
            if ($dll) {
                $dllPath = Resolve-NormalPath $dll
                if (-not $dllPath.ToLower().StartsWith("$($script:SysRoot)\system32\") -and -not $dllPath.ToLower().StartsWith("$($script:SysRoot)\syswow64\")) {
                    $reasons.Add((New-Reason 'svchost-hosted service loads a DLL from outside System32' 9 8 'T1543.003' $dllPath))
                }
            }
        }
        if ($exe) { $script:State.PersistenceTargets.Add([PSCustomObject]@{ Mechanism = 'Service'; Name = $s.Name; Path = $exe }) }
        $f = $null
        if ($reasons.Count -gt 0) {
            $f = Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre 'T1543.003' -Entity $s.Name -Path $exe -ProcessId ([int]$s.ProcessId) -Source 'Win32_Service' -Tags 'persistence' -DedupeKey "SVC|$($s.Name)" -PassThru `
                -Evidence ([ordered]@{ Service = $s.Name; DisplayName = $s.DisplayName; PathName = $img; StartMode = $s.StartMode; State = $s.State; Account = $s.StartName })
        }
        Add-Inventory 'services' ([ordered]@{ Name = $s.Name; DisplayName = $s.DisplayName; State = $s.State; StartMode = $s.StartMode; Account = $s.StartName; PathName = $img; Flag = $(if ($f) { "$($f.Risk): $($f.Title)" } else { '' }) })
    }
    # Security services disabled via registry (language independent)
    $checks = @{ 'WinDefend' = 'T1562.001'; 'Sense' = 'T1562.001'; 'EventLog' = 'T1562.002'; 'Sysmon64' = 'T1562.001'; 'Sysmon' = 'T1562.001'; 'wscsvc' = 'T1562.001' }
    foreach ($k in $checks.Keys) {
        $start = Get-RegValue "HKLM:\SYSTEM\CurrentControlSet\Services\$k" 'Start'
        if ($start -eq 4) {
            $impact = if ($k -eq 'EventLog') { 9 } else { 7 }
            $conf = if ($k -eq 'WinDefend' -and $script:IsWorkstation) { 5 } else { 8 }
            Add-Finding -Category 'DefenseEvasion' -Title "Security service '$k' is disabled (Start=4)" -Impact $impact -Confidence $conf -Mitre $checks[$k] -Entity $k -Source 'Registry' -Tags 'evasion' -DedupeKey "SVCDIS|$k" `
                -Evidence ([ordered]@{ Service = $k; Start = $start; Note = $(if ($k -eq 'WinDefend') { 'May be expected when a third-party AV is installed' } else { '' }) })
        }
    }
}

function Get-RegistryHives {
    $hives = [System.Collections.Generic.List[object]]::new()
    $hives.Add([PSCustomObject]@{ Root = 'HKLM:'; Label = 'HKLM'; IsUser = $false })
    $found = $false
    foreach ($k in @(Get-ChildItem -Path 'Registry::HKEY_USERS' -ErrorAction SilentlyContinue)) {
        $sid = $k.PSChildName
        if ($sid -match '^S-1-5-21-[\d-]+$' -or $sid -eq 'S-1-5-18') {
            $hives.Add([PSCustomObject]@{ Root = "Registry::HKEY_USERS\$sid"; Label = "HKU\$(Resolve-Sid $sid)"; IsUser = $true })
            $found = $true
        }
    }
    if (-not $found) { $hives.Add([PSCustomObject]@{ Root = 'HKCU:'; Label = 'HKCU'; IsUser = $true }) }
    return $hives
}

function Add-AutorunEntry {
    param([string]$Location, [string]$Name, [string]$Command, [string]$Mitre = 'T1547.001', [object[]]$ExtraReasons = @())
    $exe = Get-ExecutablePath $Command
    $reasons = @(Get-AutorunReasons $Command) + @($ExtraReasons | Where-Object { $_ })
    if ($exe) { $script:State.PersistenceTargets.Add([PSCustomObject]@{ Mechanism = 'Autorun'; Name = "$Location\$Name"; Path = $exe }) }
    $f = $null
    if ($reasons.Count -gt 0) {
        $f = Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre $Mitre -Entity "$Location\$Name" -Path $exe -Source 'Registry autostart' -Tags 'persistence' -DedupeKey "AUTORUN|$Location|$Name|$Command" -PassThru `
            -Evidence ([ordered]@{ Location = $Location; ValueName = $Name; Command = $Command; ResolvedPath = $exe; FileExists = $(if ($exe) { Test-Path -LiteralPath $exe } else { $false }) })
    }
    Add-Inventory 'autoruns' ([ordered]@{ Location = $Location; Name = $Name; Command = $Command; Path = $exe; Flag = $(if ($f) { "$($f.Risk): $($f.Title)" } else { '' }) })
}

function Get-RegistryPersistence {
    $runKeys = @('SOFTWARE\Microsoft\Windows\CurrentVersion\Run', 'SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce',
        'SOFTWARE\Microsoft\Windows\CurrentVersion\RunServices', 'SOFTWARE\Microsoft\Windows\CurrentVersion\RunServicesOnce',
        'SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer\Run',
        'SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run', 'SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\RunOnce')
    foreach ($h in (Get-RegistryHives)) {
        foreach ($rk in $runKeys) {
            $path = "$($h.Root)\$rk"
            $item = Get-Item -LiteralPath $path -ErrorAction SilentlyContinue
            if (-not $item) { continue }
            foreach ($vn in $item.GetValueNames()) {
                if (-not $vn) { continue }
                Add-AutorunEntry -Location "$($h.Label)\$rk" -Name $vn -Command ([string]$item.GetValue($vn))
            }
        }
        # Winlogon Shell / Userinit
        $wl = "$($h.Root)\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
        $shell = Get-RegValue $wl 'Shell'
        if ($shell -and $shell.Trim().ToLower() -notin @('explorer.exe', "$($script:SysRoot)\explorer.exe")) {
            Add-AutorunEntry -Location "$($h.Label)\...\Winlogon" -Name 'Shell' -Command $shell -Mitre 'T1547.004' -ExtraReasons @(New-Reason 'Winlogon Shell value modified' 9 8 'T1547.004' $shell)
        }
        if (-not $h.IsUser) {
            $ui = Get-RegValue $wl 'Userinit'
            if ($ui -and ($ui.Trim().TrimEnd(',').ToLower() -notin @("$($script:SysRoot)\system32\userinit.exe", 'userinit.exe'))) {
                Add-AutorunEntry -Location 'HKLM\...\Winlogon' -Name 'Userinit' -Command $ui -Mitre 'T1547.004' -ExtraReasons @(New-Reason 'Winlogon Userinit value modified' 9 8 'T1547.004' $ui)
            }
        }
        # Windows\Load / Run (legacy user autostart)
        foreach ($vn in @('Load', 'Run')) {
            $v = Get-RegValue "$($h.Root)\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows" $vn
            if ($v) { Add-AutorunEntry -Location "$($h.Label)\...\Windows NT\CurrentVersion\Windows" -Name $vn -Command $v -ExtraReasons @(New-Reason "Legacy '$vn' autostart value is set" 7 6 'T1547.001' $v) }
        }
        # cmd.exe AutoRun
        $ar = Get-RegValue "$($h.Root)\SOFTWARE\Microsoft\Command Processor" 'AutoRun'
        if ($ar) { Add-AutorunEntry -Location "$($h.Label)\...\Command Processor" -Name 'AutoRun' -Command $ar -Mitre 'T1546' -ExtraReasons @(New-Reason 'cmd.exe AutoRun command configured' 7 6 'T1546' $ar) }
        if ($h.IsUser) {
            # Office Test persistence
            $ot = Get-RegValue "$($h.Root)\SOFTWARE\Microsoft\Office test\Special\Perf" '(default)'
            if ($ot) { Add-AutorunEntry -Location "$($h.Label)\...\Office test\Special\Perf" -Name '(default)' -Command $ot -Mitre 'T1137.002' -ExtraReasons @(New-Reason 'Office Test DLL persistence key present' 9 8 'T1137.002' $ot) }
            # Screensaver & wallpaper
            $desk = "$($h.Root)\Control Panel\Desktop"
            $scr = Get-RegValue $desk 'SCRNSAVE.EXE'
            if ($scr -and ($scr -notmatch '(?i)\.scr$' -or (Test-UserWritablePath $scr))) {
                Add-AutorunEntry -Location "$($h.Label)\Control Panel\Desktop" -Name 'SCRNSAVE.EXE' -Command $scr -Mitre 'T1546.002' -ExtraReasons @(New-Reason 'Screensaver points to a non-.scr or user-writable file' 8 7 'T1546.002' $scr)
            }
            $wp = Get-RegValue $desk 'Wallpaper'
            if ($wp -and $wp -match '(?i)(decrypt|recover|readme|ransom|encrypted|restore).*\.(bmp|jpg|jpeg|png)$') {
                Add-Finding -Category 'Ransomware' -Title 'Desktop wallpaper replaced with a ransom image' -Impact 10 -Confidence 9 -Mitre 'T1491.001' -Entity $wp -Path $wp -Source 'Registry' -Tags 'ransomware' -Evidence ([ordered]@{ Hive = $h.Label; Wallpaper = $wp })
            }
        }
    }

    # AppInit DLLs
    foreach ($k in @('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows NT\CurrentVersion\Windows')) {
        $v = Get-RegValue $k 'AppInit_DLLs'
        if ($v -and $v.Trim()) {
            $load = Get-RegValue $k 'LoadAppInit_DLLs'
            Add-AutorunEntry -Location $k -Name 'AppInit_DLLs' -Command $v -Mitre 'T1546.010' -ExtraReasons @(New-Reason "AppInit_DLLs configured (LoadAppInit_DLLs=$load)" $(if ($load -eq 1) { 8 } else { 5 }) 7 'T1546.010' $v)
        }
    }

    # LSA packages (SSP / authentication / password filters)
    $lsa = 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa'
    $defaults = @{
        'Security Packages'       = @('kerberos', 'msv1_0', 'schannel', 'wdigest', 'tspkg', 'pku2u', 'cloudap', 'negoexts', 'livessp', '')
        'Authentication Packages' = @('msv1_0', '')
        'Notification Packages'   = @('scecli', 'rassfm', '')
    }
    foreach ($vn in $defaults.Keys) {
        $vals = @(Get-RegValue $lsa $vn) + @(Get-RegValue "$lsa\OSConfig" $vn)
        foreach ($pkg in $vals) {
            if ($null -eq $pkg) { continue }
            $p = ([string]$pkg).Trim().Trim('"').ToLower()
            if ($defaults[$vn] -contains $p) { continue }
            $mitre = if ($vn -eq 'Notification Packages') { 'T1556.002' } else { 'T1547.005' }
            $impact = 9; $conf = 7
            if ($p -match 'mimilib|kiwi') { $impact = 10; $conf = 10 }
            elseif ($vn -eq 'Authentication Packages') { $impact = 8; $conf = 5 }
            Add-Finding -Category 'Persistence' -Title "Non-default LSA $($vn.ToLower()) entry: $p" -Impact $impact -Confidence $conf -Mitre $mitre -Entity "$lsa\$vn" -Path "$($script:SysRoot)\system32\$p.dll" -Source 'Registry' -Tags 'persistence', 'credtheft' `
                -DedupeKey "LSA|$vn|$p" -Evidence ([ordered]@{ Key = $lsa; Value = $vn; Entry = $p; Note = 'LSA packages are loaded into lsass.exe and can capture credentials' })
        }
    }

    # IFEO Debugger / SilentProcessExit
    foreach ($base in @('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows NT\CurrentVersion\Image File Execution Options')) {
        foreach ($k in @(Get-ChildItem -LiteralPath $base -ErrorAction SilentlyContinue)) {
            $name = $k.PSChildName.ToLower()
            $dbg = $k.GetValue('Debugger')
            if ($dbg) {
                $reasons = @()
                if ($script:IocDb.AccessibilityBinaries -contains $name) {
                    $reasons += New-Reason "Accessibility binary $name hijacked via IFEO Debugger (logon-screen backdoor)" 10 10 'T1546.008' $dbg
                } else {
                    $sig = Get-FileSignatureInfo (Get-ExecutablePath $dbg)
                    if ($sig.Trusted) { $reasons += New-Reason "IFEO Debugger set for $name (signed tool: $($sig.Publisher))" 4 5 'T1546.012' $dbg }
                    else { $reasons += New-Reason "IFEO Debugger hijack for $name" 9 8 'T1546.012' $dbg }
                }
                Add-AutorunEntry -Location "IFEO\$name" -Name 'Debugger' -Command $dbg -Mitre 'T1546.012' -ExtraReasons $reasons
            }
            $gf = $k.GetValue('GlobalFlag')
            $gfInt = 0
            if ($null -ne $gf) { try { $gfInt = if ("$gf" -match '^0x') { [Convert]::ToInt32("$gf", 16) } else { [int]$gf } } catch {} }
            if (($gfInt -band 0x200) -ne 0) {
                $mon = Get-RegValue "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SilentProcessExit\$($k.PSChildName)" 'MonitorProcess'
                if ($mon) {
                    Add-AutorunEntry -Location "SilentProcessExit\$name" -Name 'MonitorProcess' -Command $mon -Mitre 'T1546.012' -ExtraReasons @(New-Reason "SilentProcessExit monitor runs when $name exits" 9 8 'T1546.012' $mon)
                }
            }
        }
    }

    # Accessibility binaries replaced on disk (sticky keys backdoor)
    foreach ($b in $script:IocDb.AccessibilityBinaries) {
        $p = Join-Path "$env:SystemRoot\System32" $b
        if (-not (Test-Path -LiteralPath $p)) { continue }
        try {
            $vi = (Get-Item -LiteralPath $p -ErrorAction Stop).VersionInfo
            $orig = ([string]$vi.OriginalFilename).ToLower() -replace '\.mui$', ''
            $sig = Get-FileSignatureInfo $p
            if ($orig -and -not $orig.StartsWith(($b -replace '\.exe$', ''))) {
                Add-Finding -Category 'Persistence' -Title "Accessibility binary $b replaced by $orig (sticky-keys backdoor)" -Impact 10 -Confidence 9 -Mitre 'T1546.008' -Entity $p -Path $p -Source 'File version info' -Tags 'persistence', 'backdoor' `
                    -Evidence ([ordered]@{ File = $p; OriginalFilename = $vi.OriginalFilename; Signature = $sig.Status })
            } elseif ($sig.Status -notin @('Valid', 'Error')) {
                Add-Finding -Category 'Persistence' -Title "Accessibility binary $b is not validly signed" -Impact 9 -Confidence 8 -Mitre 'T1546.008' -Entity $p -Path $p -Source 'Authenticode' -Tags 'persistence' -Evidence ([ordered]@{ File = $p; Signature = $sig.Status })
            }
        } catch {}
    }

    # Netsh helper DLLs outside System32
    $ns = Get-Item -LiteralPath 'HKLM:\SOFTWARE\Microsoft\NetSh' -ErrorAction SilentlyContinue
    if ($ns) {
        foreach ($vn in $ns.GetValueNames()) {
            $dll = [string]$ns.GetValue($vn)
            if ($dll -match '\\' -and -not (Resolve-NormalPath $dll).ToLower().StartsWith("$($script:SysRoot)\system32\")) {
                Add-AutorunEntry -Location 'HKLM\SOFTWARE\Microsoft\NetSh' -Name $vn -Command $dll -Mitre 'T1546.007' -ExtraReasons @(New-Reason 'Netsh helper DLL registered outside System32' 8 7 'T1546.007' $dll)
            }
        }
    }

    # BootExecute
    $be = @(Get-RegValue 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' 'BootExecute')
    foreach ($v in $be) {
        if ($v -and $v -notmatch '(?i)^autocheck autochk') {
            Add-AutorunEntry -Location 'HKLM\...\Session Manager' -Name 'BootExecute' -Command $v -Mitre 'T1547' -ExtraReasons @(New-Reason 'Non-default BootExecute entry' 8 6 'T1547' $v)
        }
    }
}

function Get-StartupFolders {
    $folders = @("$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp")
    foreach ($p in (Get-UserProfilePaths)) { $folders += "$p\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup" }
    $shell = $null
    try { $shell = New-Object -ComObject WScript.Shell } catch {}
    foreach ($folder in ($folders | Select-Object -Unique)) {
        foreach ($f in @(Get-ChildItem -LiteralPath $folder -File -Force -ErrorAction SilentlyContinue)) {
            if ($f.Name -eq 'desktop.ini') { continue }
            $command = $f.FullName
            if ($f.Extension -eq '.lnk' -and $shell) {
                try { $sc = $shell.CreateShortcut($f.FullName); $command = ('"{0}" {1}' -f $sc.TargetPath, $sc.Arguments).Trim() } catch {}
            }
            $reasons = @(Get-AutorunReasons $command -CheckSignature)
            if ($f.Extension -match '(?i)^\.(bat|cmd|vbs|vbe|js|jse|wsf|hta|ps1|exe|scr|com|pif)$') {
                $reasons += New-Reason "Executable/script file placed directly in a Startup folder ($($f.Extension))" 7 6 'T1547.001' $f.FullName
                if ($f.Extension -match '(?i)^\.(bat|cmd|vbs|js|wsf|hta|ps1)$') { $reasons += @(Get-ScriptContentReasons $f.FullName) }
            }
            $exe = Get-ExecutablePath $command
            if ($exe) { $script:State.PersistenceTargets.Add([PSCustomObject]@{ Mechanism = 'Startup folder'; Name = $f.Name; Path = $exe }) }
            $fd = $null
            if ($reasons.Count -gt 0) {
                $fd = Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre 'T1547.001' -Entity $f.FullName -Path $exe -Time $f.CreationTime -Source 'Startup folder' -Tags 'persistence' -PassThru `
                    -Evidence ([ordered]@{ File = $f.FullName; Target = $command; Created = $f.CreationTime; Modified = $f.LastWriteTime; Size = $f.Length })
            }
            Add-Inventory 'startupItems' ([ordered]@{ File = $f.FullName; Target = $command; Created = $f.CreationTime; Flag = $(if ($fd) { "$($fd.Risk): $($fd.Title)" } else { '' }) })
        }
    }
}

function Get-ScheduledTaskAnalysis {
    $tasks = @()
    try { $tasks = @(Get-ScheduledTask -ErrorAction Stop | Where-Object { $_.State -ne 'Disabled' }) } catch { Add-CollectorNote 'Get-ScheduledTask unavailable on this OS'; Set-CollectorStatus 'Partial'; return }
    $recent = (Get-Date).AddDays(-$FileLookbackDays)
    foreach ($t in $tasks) {
        $isMs = $t.TaskPath -like '\Microsoft\*'
        $principal = [string]$t.Principal.UserId
        $isSystem = $principal -match '(?i)^(SYSTEM|S-1-5-18|NT AUTHORITY\\SYSTEM|LOCAL SERVICE|NETWORK SERVICE)$' -or ([string]$t.Principal.GroupId) -match '(?i)administrators|S-1-5-32-544'
        $regDate = $null
        try { if ($t.Date) { $regDate = [datetime]$t.Date } } catch {}
        foreach ($a in @($t.Actions)) {
            if (-not $a.PSObject.Properties['Execute'] -or -not $a.Execute) {
                $cls = if ($a.PSObject.Properties['ClassId']) { $a.ClassId } else { '' }
                Add-Inventory 'scheduledTasks' ([ordered]@{ Task = "$($t.TaskPath)$($t.TaskName)"; Action = "COM handler $cls"; RunAs = $principal; Author = $t.Author; Registered = $regDate; Flag = '' })
                continue
            }
            $exeRaw = [string]$a.Execute
            $command = if ($exeRaw -match '\s' -and -not $exeRaw.StartsWith('"')) { "`"$exeRaw`" $($a.Arguments)" } else { "$exeRaw $($a.Arguments)" }
            $command = $command.Trim()
            $reasons = [System.Collections.Generic.List[object]]::new()
            $base = @(Get-AutorunReasons $command -CheckSignature)
            $exe = Get-ExecutablePath $command
            foreach ($r in $base) {
                if ($isMs -and $r.Title -like 'Autostart launches a script host*') { continue }   # built-in tasks legitimately use script hosts
                $reasons.Add($r)
            }
            if ($exe -and (Test-UserWritablePath $exe)) {
                if ($isSystem) { $reasons.Add((New-Reason 'Task runs as SYSTEM/administrators from a user-writable path' 9 8 'T1053.005,T1548' $exe)) }
                if ($isMs) { $reasons.Add((New-Reason 'Task hidden in the \Microsoft\ namespace runs from a user-writable path' 9 8 'T1053.005,T1036.004' $exe)) }
            }
            if (-not $isMs -and $t.Settings.Hidden) { $reasons.Add((New-Reason 'Task is marked hidden' 5 5 'T1053.005,T1564' '')) }
            if ($reasons.Count -eq 0 -and -not $isMs -and $regDate -and $regDate -gt $recent) {
                $reasons.Add((New-Reason 'Recently registered non-Microsoft scheduled task' 4 5 'T1053.005' "registered $regDate"))
            }
            if ($exe) { $script:State.PersistenceTargets.Add([PSCustomObject]@{ Mechanism = 'Scheduled task'; Name = "$($t.TaskPath)$($t.TaskName)"; Path = $exe }) }
            $f = $null
            if ($reasons.Count -gt 0) {
                $f = Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre 'T1053.005' -Entity "$($t.TaskPath)$($t.TaskName)" -Path $exe -Time $regDate -Source 'Task Scheduler' -Tags 'persistence' -DedupeKey "TASKCFG|$($t.TaskPath)$($t.TaskName)|$command" -PassThru `
                    -Evidence ([ordered]@{ Task = "$($t.TaskPath)$($t.TaskName)"; Command = $command; RunAs = $principal; RunLevel = $t.Principal.RunLevel; Author = $t.Author; Registered = $regDate; Hidden = $t.Settings.Hidden; State = $t.State })
            }
            Add-Inventory 'scheduledTasks' ([ordered]@{ Task = "$($t.TaskPath)$($t.TaskName)"; Action = $command; RunAs = $principal; Author = $t.Author; Registered = $regDate; Flag = $(if ($f) { "$($f.Risk): $($f.Title)" } else { '' }) })
        }
    }
}

function Get-WmiPersistence {
    try {
        $filters = @(Get-CimInstance -Namespace root\subscription -ClassName __EventFilter -ErrorAction Stop)
        $consumers = @(Get-CimInstance -Namespace root\subscription -ClassName __EventConsumer -ErrorAction Stop)
        $bindings = @(Get-CimInstance -Namespace root\subscription -ClassName __FilterToConsumerBinding -ErrorAction Stop)
    } catch { Add-CollectorNote "WMI subscription namespace unreadable: $($_.Exception.Message)"; Set-CollectorStatus 'Partial'; return }
    foreach ($f in $filters) { Add-Inventory 'wmiFilters' ([ordered]@{ Name = $f.Name; Query = $f.Query; Namespace = $f.EventNamespace }) }
    foreach ($b in $bindings) { Add-Inventory 'wmiBindings' ([ordered]@{ Filter = "$($b.Filter)"; Consumer = "$($b.Consumer)" }) }
    foreach ($c in $consumers) {
        $cls = $c.CimClass.CimClassName
        $payload = switch ($cls) {
            'CommandLineEventConsumer'  { ("{0} {1}" -f $c.ExecutablePath, $c.CommandLineTemplate).Trim() }
            'ActiveScriptEventConsumer' { if ($c.ScriptText) { $c.ScriptText } else { $c.ScriptFileName } }
            default { '' }
        }
        Add-Inventory 'wmiConsumers' ([ordered]@{ Name = $c.Name; Class = $cls; Payload = $payload })
        if ($cls -notin @('CommandLineEventConsumer', 'ActiveScriptEventConsumer')) { continue }
        if ($c.Name -eq 'BVTConsumer' -and $payload -match '(?i)KernCap\.vbs') { continue }
        $reasons = @(New-Reason "WMI event subscription with $cls (fileless persistence)" 9 8 'T1546.003' $payload)
        $reasons += @(Test-CommandLine $payload)
        $filterQuery = ($bindings | Where-Object { "$($_.Consumer)" -like "*$($c.Name)*" } | ForEach-Object { "$($_.Filter)" }) -join '; '
        Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre 'T1546.003' -Entity "WMI consumer '$($c.Name)'" -Path (Get-ExecutablePath $payload) -Source 'WMI root\subscription' -Tags 'persistence' `
            -Evidence ([ordered]@{ Consumer = $c.Name; Class = $cls; Payload = $payload; BoundFilters = $filterQuery; Remove = 'Get-CimInstance -Namespace root\subscription -ClassName __FilterToConsumerBinding | Remove-CimInstance (after evidence collection)' })
        $exe = Get-ExecutablePath $payload
        if ($exe) { $script:State.PersistenceTargets.Add([PSCustomObject]@{ Mechanism = 'WMI subscription'; Name = $c.Name; Path = $exe }) }
    }
}

function Get-BitsJobs {
    try {
        Import-Module BitsTransfer -ErrorAction Stop
        $jobs = @(Get-BitsTransfer -AllUsers -ErrorAction Stop)
    } catch { Add-CollectorNote "BITS jobs unavailable: $($_.Exception.Message)"; Set-CollectorStatus 'Partial'; $jobs = @() }
    foreach ($j in $jobs) {
        foreach ($fl in @($j.FileList)) {
            $remote = [string]$fl.RemoteName; $local = [string]$fl.LocalName
            $hostName = Get-UrlHost $remote
            Add-Inventory 'bitsJobs' ([ordered]@{ Job = $j.DisplayName; Owner = $j.OwnerAccount; State = $j.JobState; Remote = $remote; Local = $local; Created = $j.CreationTime })
            $reasons = @()
            $reasons += Test-DomainIoc $hostName
            if ($hostName -and $hostName -notmatch '(?i)(microsoft|windowsupdate|windows\.com|office|msedge|live\.com|akamai|delivery\.mp|adobe|google)' -and (Test-UserWritablePath $local)) {
                $reasons += New-Reason 'BITS job downloading from a non-vendor host into a user-writable path' 6 6 'T1197' "$remote -> $local"
            }
            if ($reasons.Count -gt 0) {
                Add-Finding -Category 'Persistence' -Reasons $reasons -Mitre 'T1197' -Entity "BITS job '$($j.DisplayName)'" -Path $local -Time $j.CreationTime -Source 'BITS' -Tags 'persistence' `
                    -Evidence ([ordered]@{ Job = $j.DisplayName; Owner = $j.OwnerAccount; Remote = $remote; Local = $local; State = $j.JobState })
            }
        }
    }
    foreach ($e in @(Get-EventsSafe @{ LogName = 'Microsoft-Windows-Bits-Client/Operational'; Id = 59; StartTime = $script:Since } 2000)) {
        $d = Get-EventDataMap $e
        $url = $d['url']; $h = Get-UrlHost $url
        $r = Test-DomainIoc $h
        if ($r) {
            Add-Finding -Category 'Network' -Reasons @($r) -Mitre 'T1197' -Entity $url -Time $e.TimeCreated -Source 'BITS-Client 59' -Tags 'c2' -DedupeKey "BITS59|$url" -Evidence ([ordered]@{ Url = $url; Job = $d['name'] })
        }
    }
}

function Get-DriverAnalysis {
    $drivers = @(Get-CimInstance Win32_SystemDriver -ErrorAction SilentlyContinue)
    $recent = (Get-Date).AddDays(-90)
    foreach ($d in $drivers) {
        $path = Resolve-NormalPath ([string]$d.PathName)
        $leaf = Get-LeafName $path
        $reasons = @()
        if ($script:IocDb.VulnerableDrivers -contains $leaf) {
            $imp = if ($leaf -eq 'mimidrv.sys') { 10 } else { 9 }
            $reasons += New-Reason "Known vulnerable / abused driver ($leaf) - BYOVD" $imp 7 'T1068,T1562.001' 'see loldrivers.io'
        }
        if ($path -and (Test-UserWritablePath $path)) { $reasons += New-Reason 'Driver loaded from a user-writable location' 9 8 'T1543.003' $path }
        $sigText = ''
        if ($d.State -eq 'Running' -and $path -and (Test-Path -LiteralPath $path)) {
            $created = $null
            try { $created = (Get-Item -LiteralPath $path -ErrorAction Stop).CreationTime } catch {}
            $isNew = $created -and $created -gt $recent
            if ($isNew -or -not $path.ToLower().StartsWith("$($script:SysRoot)\system32\") -or $reasons.Count -gt 0) {
                $sig = Get-FileSignatureInfo $path
                $sigText = "$($sig.Status) $($sig.Publisher)".Trim()
                if ($sig.Status -eq 'NotSigned') { $reasons += New-Reason 'Running kernel driver is not signed' 9 8 'T1543.003,T1014' $path }
                elseif ($sig.Status -eq 'HashMismatch') { $reasons += New-Reason 'Running kernel driver has an invalid signature' 9 9 'T1543.003,T1036.001' $path }
            }
        }
        $f = $null
        if ($reasons.Count -gt 0) {
            $f = Add-Finding -Category 'Driver' -Reasons $reasons -Entity $d.Name -Path $path -Source 'Win32_SystemDriver' -Tags 'driver' -PassThru `
                -Evidence ([ordered]@{ Driver = $d.Name; DisplayName = $d.DisplayName; Path = $path; State = $d.State; StartMode = $d.StartMode; Signature = $sigText })
        }
        if ($d.State -eq 'Running') { Add-Inventory 'drivers' ([ordered]@{ Name = $d.Name; Path = $path; StartMode = $d.StartMode; Signature = $sigText; Flag = $(if ($f) { "$($f.Risk): $($f.Title)" } else { '' }) }) }
    }
}

function Get-PrefetchEvidence {
    $pf = "$env:SystemRoot\Prefetch"
    $files = @()
    try { $files = @(Get-ChildItem -LiteralPath $pf -Filter '*.pf' -ErrorAction Stop) } catch { Add-CollectorNote 'Prefetch not readable (requires elevation, or prefetch disabled on servers)'; Set-CollectorStatus 'Partial'; return }
    if ($files.Count -eq 0) { Add-CollectorNote 'Prefetch folder is empty (prefetch may be disabled)'; return }
    $recent = (Get-Date).AddDays(-$FileLookbackDays)
    foreach ($f in $files) {
        $exe = ($f.Name -replace '-[0-9A-F]{8}\.pf$', '').ToLower()
        $reasons = @()
        $r = Test-ToolName $exe
        if ($r) { $r.Title = "Evidence of execution: $($r.Title)"; $reasons += $r }
        if ($exe -in @('psexesvc.exe', 'paexec.exe', 'remcomsvc.exe')) { $reasons += New-Reason "Evidence of remote service execution ($exe ran on this host)" 8 8 'T1569.002,T1021.002' '' }
        if ($exe -in @('vssadmin.exe', 'wbadmin.exe', 'bcdedit.exe', 'wevtutil.exe', 'cipher.exe') -and $f.LastWriteTime -gt $script:Since) {
            Add-Inventory 'prefetchOfInterest' ([ordered]@{ Executable = $exe; LastRun = $f.LastWriteTime; FirstRun = $f.CreationTime })
        }
        if ($reasons.Count -gt 0) {
            Add-Finding -Category 'Execution' -Reasons $reasons -Entity $exe -Time $f.LastWriteTime -Source 'Prefetch' -Tags 'execution' -DedupeKey "PF|$($f.Name)" `
                -Evidence ([ordered]@{ Executable = $exe; PrefetchFile = $f.FullName; LastRun = $f.LastWriteTime; FirstRun = $f.CreationTime })
        }
        if ($f.LastWriteTime -gt $recent -and $script:Prof.HashAll) { Add-Inventory 'prefetchRecent' ([ordered]@{ Executable = $exe; LastRun = $f.LastWriteTime; FirstRun = $f.CreationTime }) }
    }
}

function Get-PowerShellHistory {
    foreach ($p in (Get-UserProfilePaths)) {
        $dir = "$p\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine"
        foreach ($h in @(Get-ChildItem -LiteralPath $dir -Filter '*_history.txt' -ErrorAction SilentlyContinue)) {
            $lines = @()
            try { $lines = @(Get-Content -LiteralPath $h.FullName -Tail 5000 -ErrorAction Stop) } catch { continue }
            Add-Inventory 'psHistoryFiles' ([ordered]@{ File = $h.FullName; Lines = $lines.Count; Modified = $h.LastWriteTime })
            for ($i = 0; $i -lt $lines.Count; $i++) {
                $reasons = @(Test-CommandLine $lines[$i])
                $reasons = @($reasons | Where-Object { $_.Title -ne 'URL present in command line' })
                if ($reasons.Count -eq 0) { continue }
                $user = Split-Path $p -Leaf
                Add-Finding -Category 'Execution' -Reasons $reasons -Mitre 'T1059.001' -Entity "PS history of $user" -User $user -Time $h.LastWriteTime -Source 'PSReadLine history' -Tags 'execution' `
                    -DedupeKey "PSH|$($h.FullName)|$($lines[$i])" -Evidence ([ordered]@{ HistoryFile = $h.FullName; Line = ($lines.Count - $i); Command = $lines[$i]; FileModified = $h.LastWriteTime; Note = 'Line number counted from the end of the file (most recent = 1)' })
            }
        }
    }
}

function Get-HostsFileAnalysis {
    $path = "$env:SystemRoot\System32\drivers\etc\hosts"
    $lines = @()
    try { $lines = @(Get-Content -LiteralPath $path -ErrorAction Stop) } catch { Add-CollectorNote 'hosts file unreadable'; return }
    foreach ($l in $lines) {
        $t = ($l -replace '#.*$', '').Trim()
        if (-not $t) { continue }
        $parts = $t -split '\s+'
        if ($parts.Count -lt 2) { continue }
        $ip = $parts[0]
        foreach ($name in ($parts | Select-Object -Skip 1)) {
            Add-Inventory 'hostsEntries' ([ordered]@{ IP = $ip; Name = $name })
            if ($name -match '(?i)(microsoft|windowsupdate|defender|smartscreen|symantec|norton|mcafee|kaspersky|eset|sophos|crowdstrike|sentinelone|virustotal|malwarebytes|bitdefender|trendmicro|avast|avg\.com|paloaltonetworks|cylance|carbonblack)') {
                Add-Finding -Category 'DefenseEvasion' -Title "hosts file redirects security / update domain $name" -Impact 8 -Confidence 8 -Mitre 'T1565.001,T1562.001' -Entity $name -Path $path -Source 'hosts file' -Tags 'evasion' -DedupeKey "HOSTS|$name" `
                    -Evidence ([ordered]@{ Entry = "$ip $name"; File = $path })
            }
            $r = Test-DomainIoc $name
            if ($r) { Add-Finding -Category 'Network' -Reasons @($r) -Entity $name -Path $path -Source 'hosts file' -DedupeKey "HOSTSIOC|$name" -Evidence ([ordered]@{ Entry = "$ip $name" }) }
        }
    }
}

# ============================================================================
# Collectors - file system
# ============================================================================

function Get-SuspiciousFiles {
    $since = (Get-Date).AddDays(-$FileLookbackDays)
    $exts = @('.exe', '.dll', '.scr', '.com', '.pif', '.bat', '.cmd', '.ps1', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.hta', '.jar', '.msi', '.iso', '.img', '.vhd', '.vhdx', '.one', '.lnk')
    $roots = [System.Collections.Generic.List[object]]::new()
    foreach ($p in (Get-UserProfilePaths)) {
        $roots.Add(@("$p\Downloads", $script:Prof.FileDepth)); $roots.Add(@("$p\Desktop", $script:Prof.FileDepth)); $roots.Add(@("$p\Documents", 2))
        $roots.Add(@("$p\AppData\Local\Temp", 3)); $roots.Add(@("$p\AppData\Roaming", 3)); $roots.Add(@("$p\AppData\Local", [Math]::Min(3, $script:Prof.FileDepth)))
    }
    $roots.Add(@("$env:SystemDrive\Users\Public", $script:Prof.FileDepth)); $roots.Add(@("$env:SystemDrive\PerfLogs", 3))
    $roots.Add(@("$env:ProgramData", 1)); $roots.Add(@("$env:SystemRoot\Temp", 2)); $roots.Add(@("$env:SystemDrive\", 0))
    $budget = $script:Prof.MaxFiles
    $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $scanned = 0
    foreach ($root in $roots) {
        if ($budget -le 0) { Add-CollectorNote 'File budget exhausted - some locations not scanned'; Set-CollectorStatus 'Partial'; break }
        $files = @(Get-FilesLimited -Root $root[0] -Depth $root[1] -Extensions $exts -Since $since -MaxFiles $budget)
        $budget -= $files.Count
        foreach ($file in $files) {
            if (-not $seen.Add($file.FullName)) { continue }
            $scanned++
            $reasons = [System.Collections.Generic.List[object]]::new()
            $name = $file.Name
            $ext = $file.Extension.ToLower()
            if ($name.IndexOf([char]0x202E) -ge 0) { $reasons.Add((New-Reason 'File name uses Right-to-Left Override character to disguise its extension' 10 9 'T1036.002' $name)) }
            if ($name -match '(?i)\.(pdf|docx?|xlsx?|pptx?|txt|jpe?g|png|gif|zip|rar|mp4)\s*\.(exe|scr|com|pif|bat|cmd|js|jse|vbs|vbe|hta|ps1|lnk)$') { $reasons.Add((New-Reason 'Double file extension (document disguised as executable)' 9 8 'T1036.007' $name)) }
            foreach ($r in @(Test-ToolName $name.ToLower())) { $reasons.Add($r) }
            $sigText = ''; $entropy = ''; $hashes = $null
            if ($ext -in @('.exe', '.dll', '.scr', '.com', '.pif')) {
                $sig = Get-FileSignatureInfo $file.FullName
                $sigText = "$($sig.Status) $($sig.Publisher)".Trim()
                if ($sig.Trusted -and $reasons.Count -eq 0) { continue }
                $vi = $null; try { $vi = $file.VersionInfo } catch {}
                $noMeta = (-not $vi) -or ([string]::IsNullOrWhiteSpace($vi.CompanyName) -and [string]::IsNullOrWhiteSpace($vi.FileDescription))
                if ($sig.Status -eq 'HashMismatch') { $reasons.Add((New-Reason 'Executable with invalid signature (modified after signing)' 9 8 'T1036.001' '')) }
                elseif ($sig.Status -ne 'Valid') {
                    $entropy = Get-FileEntropy $file.FullName
                    $hot = $file.FullName -match '(?i)^[a-z]:\\(users\\public|perflogs|programdata\\[^\\]+$|windows\\temp)|\\appdata\\local\\temp\\'
                    if ($entropy -ge 7.2) { $reasons.Add((New-Reason 'Unsigned executable with very high entropy (packed / encrypted)' 8 7 'T1027' "entropy $entropy")) }
                    elseif ($noMeta) { $reasons.Add((New-Reason 'Unsigned executable without version metadata' 7 $(if ($hot) { 6 } else { 4 }) 'T1036.005,T1204.002' '')) }
                    if ($hot) { $reasons.Add((New-Reason 'Unsigned executable in a high-abuse staging folder' 6 5 'T1036.005' (Split-Path $file.FullName -Parent))) }
                    if ($vi -and $vi.OriginalFilename) {
                        $orig = ([string]$vi.OriginalFilename).ToLower()
                        $tr = Test-ToolName $orig
                        if ($tr -and $orig -ne $name.ToLower()) { $reasons.Add((New-Reason "Renamed tool ($orig saved as $name)" $tr.Impact ([Math]::Min(10, $tr.Confidence + 1)) 'T1036.003' "OriginalFilename=$($vi.OriginalFilename)" $orig 'Tool' 'PE version info')) }
                    }
                }
            } elseif ($ext -in @('.ps1', '.bat', '.cmd', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.hta')) {
                foreach ($r in @(Get-ScriptContentReasons $file.FullName)) { if ($r.Title -ne 'URL present in command line') { $reasons.Add($r) } }
                if ($ext -in @('.hta', '.wsf', '.vbe', '.jse') -and $reasons.Count -eq 0) { $reasons.Add((New-Reason "Rarely legitimate script type ($ext) in a user location" 5 4 'T1059' '')) }
            } elseif ($ext -in @('.iso', '.img', '.vhd', '.vhdx') -and $file.DirectoryName -match '(?i)\\downloads$') {
                $reasons.Add((New-Reason "Disk image downloaded ($ext) - common Mark-of-the-Web bypass container" 5 4 'T1553.005,T1204.002' ''))
            } elseif ($ext -eq '.lnk') {
                continue
            }
            if ($script:Prof.HashAll -or $reasons.Count -gt 0) {
                $hashes = Get-FileHashesForIoc $file.FullName
                foreach ($r in @(Test-HashIoc $hashes)) { $reasons.Add($r) }
            }
            if ($reasons.Count -eq 0) { continue }
            $motw = Get-MotwInfo $file.FullName
            if ($motw -and $motw.HostUrl) {
                foreach ($r in @(Test-DomainIoc (Get-UrlHost $motw.HostUrl))) { $reasons.Add($r) }
            }
            if (-not $hashes) { $hashes = Get-FileHashesForIoc $file.FullName }
            $sha = $hashes.SHA256
            $f = Add-Finding -Category 'File' -Reasons $reasons -Entity $file.FullName -Path $file.FullName -Time $file.CreationTime -Source 'File system' -Tags 'file' -PassThru `
                -Evidence ([ordered]@{ File = $file.FullName; Size = $file.Length; Created = $file.CreationTime; Modified = $file.LastWriteTime; SHA256 = $sha; VirusTotal = $(if ($sha) { "https://www.virustotal.com/gui/file/$sha" } else { '' })
                    Signature = $sigText; Entropy = $entropy; DownloadedFrom = $(if ($motw) { $motw.HostUrl } else { '' }); Referrer = $(if ($motw) { $motw.ReferrerUrl } else { '' }); Zone = $(if ($motw) { $motw.ZoneId } else { '' }) })
            Add-Inventory 'flaggedFiles' ([ordered]@{ File = $file.FullName; Size = $file.Length; Created = $file.CreationTime; SHA256 = $sha; Signature = $sigText; DownloadedFrom = $(if ($motw) { $motw.HostUrl } else { '' }); Flag = "$($f.Risk): $($f.Title)" })
        }
    }
    Add-CollectorNote "$scanned candidate files analysed (modified in the last $FileLookbackDays days)"
}

function Get-RansomwareFileIndicators {
    $noteSince = (Get-Date).AddDays(-$FileLookbackDays)
    $extSince = (Get-Date).AddDays(-7)
    $roots = [System.Collections.Generic.List[string]]::new()
    foreach ($p in (Get-UserProfilePaths)) { foreach ($s in @('Desktop', 'Documents', 'Downloads', 'Pictures')) { $roots.Add("$p\$s") } }
    $roots.Add("$env:SystemDrive\Users\Public")
    if ($ScanProfile -eq 'Deep') {
        foreach ($dr in @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction SilentlyContinue)) { if ($dr.DeviceID -ne $env:SystemDrive) { $roots.Add("$($dr.DeviceID)\") } }
    }
    $noteNames = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($n in $script:IocDb.RansomNoteNames) { [void]$noteNames.Add($n) }
    $extSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($x in $script:IocDb.RansomExtensions) { [void]$extSet.Add($x) }
    $notes = @{}; $encrypted = @{}
    $budget = $script:Prof.RansomMaxFiles
    $total = 0
    foreach ($root in $roots) {
        if ($budget -le 0) { break }
        $files = @(Get-FilesLimited -Root $root -Depth $(if ($root.Length -le 3) { 3 } else { 4 }) -Since $noteSince -MaxFiles $budget)
        $budget -= $files.Count; $total += $files.Count
        foreach ($f in $files) {
            if ($noteNames.Contains($f.Name) -or $f.Name -match $script:IocDb.RansomNoteRegex) {
                if (-not $notes.ContainsKey($f.Name)) { $notes[$f.Name] = [System.Collections.Generic.List[object]]::new() }
                $notes[$f.Name].Add($f)
            }
            if ($extSet.Contains($f.Extension) -and $f.LastWriteTime -gt $extSince) {
                $e = $f.Extension.ToLower()
                if (-not $encrypted.ContainsKey($e)) { $encrypted[$e] = [System.Collections.Generic.List[object]]::new() }
                $encrypted[$e].Add($f)
            }
        }
    }
    Add-CollectorNote "$total recently modified files checked for ransom notes / extensions"
    foreach ($n in $notes.Keys) {
        $list = $notes[$n]
        $dirs = @($list | ForEach-Object { $_.DirectoryName } | Select-Object -Unique)
        $conf = if ($dirs.Count -ge 3) { 10 } else { 9 }
        $first = ($list | Sort-Object CreationTime | Select-Object -First 1)
        Add-Finding -Category 'Ransomware' -Title "Ransom note '$n' found in $($dirs.Count) folder(s)" -Impact 10 -Confidence $conf -Mitre 'T1486' -Entity $n -Path $first.FullName -Time $first.CreationTime -Source 'File system' -Tags 'ransomware' `
            -Evidence ([ordered]@{ NoteName = $n; Copies = $list.Count; Folders = ($dirs | Select-Object -First 15); FirstCreated = $first.CreationTime; Sample = $first.FullName })
    }
    foreach ($e in $encrypted.Keys) {
        $list = $encrypted[$e]
        $conf = if ($list.Count -ge 20) { 10 } elseif ($list.Count -ge 5) { 8 } else { 6 }
        $first = ($list | Sort-Object LastWriteTime | Select-Object -First 1)
        Add-Finding -Category 'Ransomware' -Title "$($list.Count) file(s) with ransomware extension '$e' modified in the last 7 days" -Impact 10 -Confidence $conf -Mitre 'T1486' -Entity "*$e" -Path $first.FullName -Time $first.LastWriteTime -Source 'File system' -Tags 'ransomware' `
            -Evidence ([ordered]@{ Extension = $e; Files = $list.Count; Earliest = $first.LastWriteTime; Sample = @($list | Select-Object -First 10 | ForEach-Object { $_.FullName }) })
    }
}

# ============================================================================
# Correlation, assessment and report model
# ============================================================================

function Get-FindingsByTag {
    param([string]$Tag, [string]$MinRisk = 'Low')
    $min = $script:RiskRank[$MinRisk]
    @($script:State.Findings | Where-Object { $_.Kind -eq 'Threat' -and $_.Tags -contains $Tag -and $script:RiskRank[$_.Risk] -ge $min })
}

function Invoke-Correlation {
    $threat = @($script:State.Findings | Where-Object { $_.Kind -eq 'Threat' -and $_.Category -ne 'Correlation' })
    $rank = $script:RiskRank

    # C1 - suspicious process with network activity
    foreach ($p in @($threat | Where-Object { $_.Category -eq 'Process' -and $rank[$_.Risk] -ge 2 -and $_.ProcessId -gt 0 })) {
        $conns = @($script:State.Network | Where-Object { $_.ProcessId -eq $p.ProcessId -and $_.External })
        if ($conns.Count -eq 0) { continue }
        $netFindings = @($threat | Where-Object { $_.Category -eq 'Network' -and $_.ProcessId -eq $p.ProcessId -and $rank[$_.Risk] -ge 2 })
        $endpoints = ($conns | Select-Object -First 10 | ForEach-Object { "$($_.Remote):$($_.Port)" }) -join ', '
        if ($netFindings.Count -gt 0) {
            Add-Finding -Category 'Correlation' -Title "Suspicious process $($p.Entity) is communicating with a suspicious endpoint" -Impact 10 -Confidence 9 -Mitre "$($p.Mitre), T1071" `
                -Entity $p.Entity -ProcessId $p.ProcessId -Path $p.Path -Source 'Correlation engine' -Tags 'c2', 'correlated' -Related (@($p.Id) + @($netFindings | ForEach-Object { $_.Id })) `
                -Evidence ([ordered]@{ ProcessFinding = "$($p.Id) [$($p.Risk)] $($p.Title)"; NetworkFindings = @($netFindings | ForEach-Object { "$($_.Id) [$($_.Risk)] $($_.Title)" }); ExternalEndpoints = $endpoints }) `
                -Recommendation 'Isolate the host, capture the process memory, block the remote endpoint and hunt for it fleet-wide.'
        } else {
            Add-Finding -Category 'Correlation' -Title "Suspicious process $($p.Entity) has active external connections" -Impact 8 -Confidence ([Math]::Min(9, $p.Confidence + 1)) -Mitre "$($p.Mitre), T1071" `
                -Entity $p.Entity -ProcessId $p.ProcessId -Path $p.Path -Source 'Correlation engine' -Tags 'c2', 'correlated' -Related @($p.Id) `
                -Evidence ([ordered]@{ ProcessFinding = "$($p.Id) [$($p.Risk)] $($p.Title)"; ExternalEndpoints = $endpoints }) `
                -Recommendation 'Identify the remote endpoints (reputation / WHOIS), capture the process memory and, if unknown, block and isolate.'
        }
    }

    # C2 - persistence pointing to a flagged binary
    $flaggedPaths = @{}
    foreach ($f in @($threat | Where-Object { $_.Path -and $_.Category -in @('Process', 'File', 'Injection', 'Execution', 'Antivirus') -and $rank[$_.Risk] -ge 2 })) {
        $k = $f.Path.ToLower(); if (-not $flaggedPaths.ContainsKey($k)) { $flaggedPaths[$k] = $f }
    }
    $done = @{}
    foreach ($t in $script:State.PersistenceTargets) {
        if (-not $t.Path) { continue }
        $k = $t.Path.ToLower()
        if ($flaggedPaths.ContainsKey($k) -and -not $done.ContainsKey("$k|$($t.Name)")) {
            $done["$k|$($t.Name)"] = $true
            $src = $flaggedPaths[$k]
            Add-Finding -Category 'Correlation' -Title "$($t.Mechanism) persistence launches a flagged binary ($(Get-LeafName $t.Path))" -Impact 10 -Confidence 9 -Mitre "T1547, $($src.Mitre)" `
                -Entity $t.Name -Path $t.Path -Source 'Correlation engine' -Tags 'persistence', 'correlated' -Related @($src.Id) `
                -Evidence ([ordered]@{ Mechanism = $t.Mechanism; Entry = $t.Name; Binary = $t.Path; BinaryFinding = "$($src.Id) [$($src.Risk)] $($src.Title)" }) `
                -Recommendation 'Malware with persistence: isolate, acquire the binary and the persistence entry, then remove both after evidence collection.'
        }
    }

    # C3 - injection from a flagged binary
    foreach ($inj in @($threat | Where-Object { $_.Category -eq 'Injection' -and $_.Path })) {
        $k = $inj.Path.ToLower()
        if ($flaggedPaths.ContainsKey($k) -and $flaggedPaths[$k].Id -ne $inj.Id) {
            Add-Finding -Category 'Correlation' -Title "Flagged binary $(Get-LeafName $inj.Path) performed process injection" -Impact 10 -Confidence 9 -Mitre 'T1055' -Entity $inj.Entity -Path $inj.Path -Source 'Correlation engine' -Tags 'injection', 'correlated' `
                -Related @($inj.Id, $flaggedPaths[$k].Id) -Evidence ([ordered]@{ Injection = "$($inj.Id) $($inj.Title)"; Binary = "$($flaggedPaths[$k].Id) $($flaggedPaths[$k].Title)" })
        }
    }

    # C4 - ransomware pattern
    $rSignals = [ordered]@{}
    foreach ($f in $threat) {
        if ($f.Title -like 'Ransom note*' -or $f.Title -like '*Ransom note*') { $rSignals['Ransom notes'] = $f.Id }
        elseif ($f.Title -like '*ransomware extension*') { $rSignals['Encrypted file extensions'] = $f.Id }
        elseif ($f.Title -like 'Mass file creation*') { $rSignals['Mass file creation'] = $f.Id }
        elseif ($f.Mitre -match 'T1490') { $rSignals['Recovery inhibition (shadow copy / backup deletion)'] = $f.Id }
        elseif ($f.Mitre -match 'T1489') { $rSignals['Service / process killing'] = $f.Id }
        elseif ($f.Mitre -match 'T1491') { $rSignals['Desktop defacement'] = $f.Id }
        elseif ($f.Category -eq 'Antivirus' -and $f.Tags -contains 'ransomware') { $rSignals['AV ransomware detection'] = $f.Id }
    }
    if ($rSignals.Count -ge 2) {
        if ($script:State.ShadowCopyCount -eq 0 -and $rSignals.Contains('Recovery inhibition (shadow copy / backup deletion)')) { $rSignals['No shadow copies remain'] = '' }
        Add-Finding -Category 'Correlation' -Title "Ransomware activity pattern: $($rSignals.Count) independent indicators" -Impact 10 -Confidence 10 -Mitre 'T1486, T1490' -Entity 'Host' -Source 'Correlation engine' -Tags 'ransomware', 'correlated' `
            -Related @($rSignals.Values | Where-Object { $_ }) -Evidence ([ordered]@{ Indicators = @($rSignals.Keys) }) `
            -Recommendation 'ACTIVE RANSOMWARE: isolate the host immediately (network containment, do not power off), disable compromised accounts, take backups offline and start the ransomware incident procedure.'
    }

    # C5 - credential theft pattern
    $cred = @($threat | Where-Object { $_.Mitre -match 'T1003|T1558|T1556|T1557' -or $_.Tags -contains 'credtheft' })
    $credKinds = @($cred | ForEach-Object { $_.Source } | Select-Object -Unique)
    if ($cred.Count -ge 2 -and $credKinds.Count -ge 2) {
        Add-Finding -Category 'Correlation' -Title "Credential theft pattern: $($cred.Count) related findings from $($credKinds.Count) sources" -Impact 10 -Confidence 9 -Mitre 'T1003' -Entity 'Host' -Source 'Correlation engine' -Tags 'credtheft', 'correlated' `
            -Related @($cred | Select-Object -First 15 | ForEach-Object { $_.Id }) -Evidence ([ordered]@{ Findings = @($cred | Select-Object -First 15 | ForEach-Object { "$($_.Id) [$($_.Risk)] $($_.Title)" }) })
    }

    # C6 - brute force followed by a successful logon from the same source
    foreach ($ip in @($script:State.FailedLogonIps.Keys)) {
        $firstFail = $script:State.FailedLogonIps[$ip]
        $ok = @($script:State.SuccessLogons | Where-Object { $_.Ip -eq $ip -and $_.Time -ge $firstFail })
        if ($ok.Count -gt 0) {
            $bf = @($threat | Where-Object { $_.RemoteIp -eq $ip -and $_.Tags -contains 'bruteforce' } | Select-Object -First 1)
            Add-Finding -Category 'Correlation' -Title "Possible successful brute force: logon from $ip after repeated failures" -Impact 10 -Confidence 9 -Mitre 'T1110, T1078' -Entity $ip -RemoteIp $ip -Time $ok[0].Time -Source 'Correlation engine' -Tags 'bruteforce', 'correlated' `
                -Related @($bf | ForEach-Object { $_.Id }) -Evidence ([ordered]@{ SourceIp = $ip; FirstFailure = $firstFail; SuccessfulLogons = @($ok | Select-Object -First 10 | ForEach-Object { "$($_.Time) $($_.User) (type $($_.Type))" }) }) `
                -Recommendation 'Treat the account(s) as compromised: reset the password, revoke sessions, review all activity of the account since the first successful logon and block the source.'
        }
    }

    # C7 - defence evasion together with other high-risk activity
    $evasion = @($threat | Where-Object { $_.Mitre -match 'T1070|T1562' -and $rank[$_.Risk] -ge 3 })
    $others = @($threat | Where-Object { $_.Mitre -notmatch 'T1070|T1562' -and $rank[$_.Risk] -ge 3 })
    if ($evasion.Count -gt 0 -and $others.Count -gt 0) {
        Add-Finding -Category 'Correlation' -Title 'Defence evasion observed alongside other high-risk activity' -Impact 9 -Confidence 8 -Mitre 'T1562.001, T1070' -Entity 'Host' -Source 'Correlation engine' -Tags 'evasion', 'correlated' `
            -Related @(@($evasion | Select-Object -First 5 | ForEach-Object { $_.Id }) + @($others | Select-Object -First 5 | ForEach-Object { $_.Id })) `
            -Evidence ([ordered]@{ Evasion = @($evasion | Select-Object -First 5 | ForEach-Object { "$($_.Id) $($_.Title)" }); Other = @($others | Select-Object -First 5 | ForEach-Object { "$($_.Id) $($_.Title)" }) }) `
            -Recommendation 'Disabling controls while other malicious activity is present indicates an active adversary: escalate to incident response and preserve evidence immediately.'
    }
}

function Get-AttackMatrix {
    param([object[]]$Findings)
    $byTactic = [ordered]@{}
    foreach ($t in $script:TacticOrder) { $byTactic[$t] = [ordered]@{} }
    foreach ($f in $Findings) {
        foreach ($tid in ($f.Mitre -split '[,\s]+' | Where-Object { $_ })) {
            $info = Get-TechniqueInfo $tid
            $tac = $info[1]
            if (-not $byTactic.Contains($tac)) { $byTactic[$tac] = [ordered]@{} }
            if (-not $byTactic[$tac].Contains($tid)) { $byTactic[$tac][$tid] = [PSCustomObject]@{ Id = $tid; Name = $info[0]; Count = 0; MaxRisk = 'Info'; FindingIds = [System.Collections.Generic.List[string]]::new() } }
            $cell = $byTactic[$tac][$tid]
            $cell.Count++
            if ($script:RiskRank[$f.Risk] -gt $script:RiskRank[$cell.MaxRisk]) { $cell.MaxRisk = $f.Risk }
            if ($cell.FindingIds.Count -lt 50) { $cell.FindingIds.Add($f.Id) }
        }
    }
    $out = foreach ($tac in $byTactic.Keys) {
        $cells = @($byTactic[$tac].Values | Sort-Object @{ Expression = { $script:RiskRank[$_.MaxRisk] }; Descending = $true }, @{ Expression = 'Count'; Descending = $true } |
            ForEach-Object { [ordered]@{ Id = $_.Id; Name = $_.Name; Count = $_.Count; MaxRisk = $_.MaxRisk; FindingIds = @($_.FindingIds) } })
        $max = 'Info'
        foreach ($c in $cells) { if ($script:RiskRank[$c.MaxRisk] -gt $script:RiskRank[$max]) { $max = $c.MaxRisk } }
        [ordered]@{ Tactic = $tac; MaxRisk = $(if ($cells.Count) { $max } else { '' }); Techniques = $cells }
    }
    return @($out)
}

function Get-Assessment {
    param([object[]]$Threat, [string]$Overall)
    $rank = $script:RiskRank
    $high = @($Threat | Where-Object { $rank[$_.Risk] -ge 3 })
    $tactics = @($high | ForEach-Object { $_.Tactics -split ',\s*' } | Where-Object { $_ } | Select-Object -Unique)
    $tags = @($high | ForEach-Object { $_.Tags } | Select-Object -Unique)
    $lines = [System.Collections.Generic.List[string]]::new()
    $headline = 'No evidence of compromise in the collected artifacts'
    if ($Threat | Where-Object { $_.Category -eq 'Correlation' -and $_.Tags -contains 'ransomware' }) { $headline = 'Likely ACTIVE RANSOMWARE incident' }
    elseif ($Threat | Where-Object { $_.Category -eq 'Correlation' -and $_.Tags -contains 'credtheft' }) { $headline = 'Likely credential theft on this host' }
    elseif ($Threat | Where-Object { $_.Category -eq 'Correlation' -and $_.Tags -contains 'bruteforce' }) { $headline = 'Likely account compromise via brute force' }
    elseif ($Threat | Where-Object { $_.Category -eq 'Correlation' -and $_.Tags -contains 'c2' -and $rank[$_.Risk] -ge 4 }) { $headline = 'Likely active malware with command-and-control' }
    elseif ($tactics.Count -ge 3) { $headline = 'Probable hands-on-keyboard intrusion (multiple attack stages observed)' }
    elseif ($Overall -in @('Critical', 'High')) { $headline = 'High-risk malicious activity detected - investigation required' }
    elseif ($Overall -eq 'Moderate') { $headline = 'Suspicious activity requiring analyst validation' }

    if ($high.Count -gt 0) {
        $ordered = @($script:TacticOrder | Where-Object { $tactics -contains $_ })
        $lines.Add("High/Critical findings span $($ordered.Count) ATT&CK tactic(s): $($ordered -join ' -> ').")
    }
    if ($tags -contains 'ransomware') { $lines.Add('Ransomware indicators are present (notes, encrypted extensions, recovery inhibition or mass file writes).') }
    if ($tags -contains 'credtheft') { $lines.Add('Credential-access activity was observed: credentials used on this host should be considered exposed.') }
    if ($tags -contains 'c2') { $lines.Add('Network indicators suggest command-and-control or data staging.') }
    if ($tags -contains 'persistence') { $lines.Add('Persistence mechanisms were found - malware is likely to survive a reboot.') }
    if ($tags -contains 'evasion') { $lines.Add('Security controls or logs were tampered with - absence of other evidence is less reliable.') }
    if ($tags -contains 'bruteforce') { $lines.Add('Password-guessing activity targeted this host.') }
    if ($high.Count -eq 0 -and $Overall -eq 'Moderate') { $lines.Add('Only moderate-risk items were found; each needs validation with the system owner before closing.') }
    if ($high.Count -eq 0 -and $Overall -in @('Low', 'Info')) { $lines.Add('Only low-risk / informational items were found.') }

    $gaps = [System.Collections.Generic.List[string]]::new()
    if (-not $script:IsAdmin) { $gaps.Add('the scan was not run elevated') }
    if (-not $script:Telemetry.Sysmon) { $gaps.Add('Sysmon is not installed') }
    if (-not $script:Telemetry.ScriptBlockLogging) { $gaps.Add('PowerShell script-block logging is not enforced') }
    if (-not $script:Telemetry.CmdLineAudit) { $gaps.Add('process command-line auditing is off') }
    $failed = @($script:State.Coverage | Where-Object { $_.Status -in @('Failed', 'Partial') } | ForEach-Object { $_.Label })
    if ($failed.Count -gt 0) { $gaps.Add("partial/failed collectors: $($failed -join ', ')") }
    if ($gaps.Count -gt 0) { $lines.Add("Visibility limits: $($gaps -join '; ').") }
    # Do not report 'no evidence' when most collectors could not run.
    $run = @($script:State.Coverage | Where-Object { $_.Status -ne 'Skipped' })
    $okCount = @($run | Where-Object { $_.Status -eq 'OK' }).Count
    if ($high.Count -eq 0 -and $run.Count -gt 0 -and ($okCount / $run.Count) -lt 0.5) {
        $headline = 'INCONCLUSIVE - visibility too limited to rule out compromise (re-run elevated)'
    }
    return [ordered]@{ Headline = $headline; Statements = @($lines); VisibilityGaps = @($gaps) }
}

function Get-Recommendations {
    param([object[]]$Threat, [string]$Overall)
    $rank = $script:RiskRank
    $recs = [ordered]@{}
    if ($Overall -eq 'Critical') {
        $recs['Contain the host now: isolate it from the network via EDR (keep it powered on) and notify the incident manager.'] = @{ Risk = 'Critical'; Ids = @() }
        $recs['Preserve volatile evidence before remediation: memory image (e.g. winpmem / Magnet RAM Capture) and a triage collection (KAPE / Velociraptor). Keep this report folder and its SHA-256 manifest.'] = @{ Risk = 'Critical'; Ids = @() }
    }
    foreach ($f in @($Threat | Where-Object { $rank[$_.Risk] -ge 2 } | Sort-Object @{ Expression = { $rank[$_.Risk] }; Descending = $true })) {
        $a = $f.Recommendation
        if (-not $recs.Contains($a)) { $recs[$a] = @{ Risk = $f.Risk; Ids = [System.Collections.Generic.List[string]]::new() } }
        if ($recs[$a].Ids -is [System.Collections.Generic.List[string]] -and $recs[$a].Ids.Count -lt 25) { $recs[$a].Ids.Add($f.Id) }
    }
    if ($Overall -in @('Critical', 'High')) {
        $recs['Scope the incident: hunt for the IoCs and file hashes in this report across the fleet (EDR / SIEM / proxy logs).'] = @{ Risk = $Overall; Ids = @() }
        $recs['Reset credentials of accounts that logged on to this host during the look-back window, starting with privileged accounts.'] = @{ Risk = $Overall; Ids = @() }
    }
    if ($recs.Count -eq 0) {
        $recs['No action required beyond normal monitoring; review Low findings and close the ticket with this report attached.'] = @{ Risk = 'Low'; Ids = @() }
    }
    $i = 0
    foreach ($k in $recs.Keys) {
        $i++
        [ordered]@{ Priority = $i; Risk = $recs[$k].Risk; Action = $k; FindingIds = @($recs[$k].Ids) }
    }
}

function New-ReportModel {
    $all = @($script:State.Findings | Sort-Object @{ Expression = { $script:RiskRank[$_.Risk] }; Descending = $true }, @{ Expression = 'Impact'; Descending = $true }, @{ Expression = 'Confidence'; Descending = $true })
    $threat = @($all | Where-Object { $_.Kind -eq 'Threat' })
    $posture = @($all | Where-Object { $_.Kind -eq 'Posture' })
    $counts = [ordered]@{ Critical = 0; High = 0; Moderate = 0; Low = 0; Info = 0 }
    foreach ($f in $threat) { $counts[$f.Risk]++ }
    $overall = 'Low'
    foreach ($lvl in @('Critical', 'High', 'Moderate')) { if ($counts[$lvl] -gt 0) { $overall = $lvl; break } }
    $justification = 'No findings above Low risk were identified.'
    if ($threat.Count -gt 0 -and $overall -ne 'Low') {
        $top = $threat[0]
        $justification = "Driven by $($top.Id) '$($top.Title)' ($($top.Category); impact $($top.Impact)/10, confidence $($top.Confidence)/10)."
    }
    $assessment = Get-Assessment -Threat $threat -Overall $overall
    $timeline = @($all | Where-Object { $_.Time } | Sort-Object Time | ForEach-Object { [ordered]@{ Time = $_.Time; Id = $_.Id; Risk = $_.Risk; Title = $_.Title; Entity = $_.Entity; Source = $_.Source } })
    $tacticsObserved = @($threat | Where-Object { $script:RiskRank[$_.Risk] -ge 2 } | ForEach-Object { $_.Tactics -split ',\s*' } | Where-Object { $_ } | Select-Object -Unique)
    $endTime = Get-Date
    $coverageOk = @($script:State.Coverage | Where-Object { $_.Status -eq 'OK' }).Count
    $coverageTotal = @($script:State.Coverage | Where-Object { $_.Status -ne 'Skipped' }).Count

    $inventory = [ordered]@{}
    foreach ($k in $script:State.Inventory.Keys) { $inventory[$k] = @($script:State.Inventory[$k]) }

    [ordered]@{
        schema   = 'sdema.deepthreatscan/9.0'
        metadata = [ordered]@{
            Tool = 'SDEMA IRT : Deep Threat Scan'; Version = $ScriptVersion; Host = $env:COMPUTERNAME
            Fqdn = $script:State.HostInfo['DNS Host Name']; Domain = $script:State.HostInfo['Domain']
            CaseId = $CaseId; Analyst = $Analyst; Collector = "$env:USERDOMAIN\$env:USERNAME"; Elevated = [bool]$script:IsAdmin
            ScanProfile = $ScanProfile; LookbackHours = $LookbackHours; FileLookbackDays = $FileLookbackDays
            Started = $startTime.ToString('yyyy-MM-dd HH:mm:ss'); Finished = $endTime.ToString('yyyy-MM-dd HH:mm:ss')
            DurationSec = [Math]::Round(($endTime - $startTime).TotalSeconds); TimeZone = $script:State.HostInfo['Time Zone']
            PowerShell = $PSVersionTable.PSVersion.ToString(); IocFeed = $script:IocFeedInfo
        }
        summary  = [ordered]@{
            OverallRisk = $overall; Justification = $justification; Headline = $assessment.Headline; Assessment = $assessment.Statements
            VisibilityGaps = $assessment.VisibilityGaps; Counts = $counts; PostureFindings = $posture.Count
            IocMatches = $script:State.IocMatches.Count; HighConfidenceIocs = @($script:State.IocMatches | Where-Object { $_.Confidence -ge 9 }).Count
            Correlations = @($threat | Where-Object { $_.Category -eq 'Correlation' }).Count; TacticsObserved = $tacticsObserved
            CoverageScore = $(if ($coverageTotal) { [int](100 * $coverageOk / $coverageTotal) } else { 0 })
        }
        hostInfo        = $script:State.HostInfo
        findings        = $all
        iocMatches      = @($script:State.IocMatches)
        recommendations = @(Get-Recommendations -Threat $threat -Overall $overall)
        attack          = @(Get-AttackMatrix -Findings $threat)
        timeline        = $timeline
        posture         = @($script:State.PostureChecks)
        coverage        = @($script:State.Coverage)
        inventory       = $inventory
    }
}

# ============================================================================
# Output writers
# ============================================================================

function Write-Utf8File {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding $false))
}

function ConvertTo-ReportJson {
    param($Model)
    if ($PSVersionTable.PSVersion.Major -lt 6) { Remove-TypeData -TypeName System.Array -ErrorAction SilentlyContinue }   # avoids {"value":[..],"Count":n} in PS 5.1
    return (ConvertTo-Json -InputObject $Model -Depth 12)
}

function Get-ModelArray {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [string]) { return @($Value) }
    if ($Value.PSObject -and $Value.PSObject.Properties['value'] -and $Value.PSObject.Properties['Count']) { return @($Value.value) }
    return @($Value)
}

function ConvertTo-MarkdownSummary {
    param($Model)
    $m = $Model.metadata; $s = $Model.summary
    $sb = New-Object System.Text.StringBuilder
    $nl = "`r`n"
    [void]$sb.Append("# Deep Threat Scan - $($m.Host)$nl$nl")
    [void]$sb.Append("| Field | Value |$nl|---|---|$nl")
    [void]$sb.Append("| Overall risk | **$($s.OverallRisk)** |$nl| Assessment | $($s.Headline) |$nl| Case | $($m.CaseId) |$nl| Analyst | $($m.Analyst) |$nl")
    [void]$sb.Append("| Scan | $($m.Started) - $($m.Finished) ($($m.ScanProfile), look-back $($m.LookbackHours)h, elevated: $($m.Elevated)) |$nl")
    [void]$sb.Append("| Findings | Critical $($s.Counts.Critical) / High $($s.Counts.High) / Moderate $($s.Counts.Moderate) / Low $($s.Counts.Low) |$nl")
    [void]$sb.Append("| IoC matches | $($s.IocMatches) (high confidence: $($s.HighConfidenceIocs)) |$nl$nl")
    [void]$sb.Append("**Justification:** $($s.Justification)$nl$nl")
    foreach ($a in (Get-ModelArray $s.Assessment)) { [void]$sb.Append("- $a$nl") }
    [void]$sb.Append("$nl## Recommended actions$nl$nl")
    foreach ($r in (Get-ModelArray $Model.recommendations)) {
        $ids = (Get-ModelArray $r.FindingIds) -join ', '
        [void]$sb.Append("$($r.Priority). [$($r.Risk)] $($r.Action)$(if ($ids) { " _($ids)_" })$nl")
    }
    [void]$sb.Append("$nl## Top findings$nl$nl| ID | Risk | Finding | Entity | MITRE | Time |$nl|---|---|---|---|---|---|$nl")
    $top = @(Get-ModelArray $Model.findings | Where-Object { $_.Kind -eq 'Threat' -and $_.Risk -in @('Critical', 'High', 'Moderate') } | Select-Object -First 25)
    foreach ($f in $top) {
        $ent = ([string]$f.Entity) -replace '\|', '/'
        if ($ent.Length -gt 80) { $ent = $ent.Substring(0, 80) + '...' }
        [void]$sb.Append("| $($f.Id) | $($f.Risk) | $(($f.Title -replace '\|', '/')) | ``$ent`` | $($f.Mitre) | $($f.Time) |$nl")
    }
    if ($top.Count -eq 0) { [void]$sb.Append("| - | - | No Moderate+ findings | - | - | - |$nl") }
    $iocs = @(Get-ModelArray $Model.iocMatches)
    if ($iocs.Count -gt 0) {
        [void]$sb.Append("$nl## Indicators of compromise$nl$nl| Type | Indicator | Finding |$nl|---|---|---|$nl")
        foreach ($i in ($iocs | Select-Object -First 50)) { [void]$sb.Append("| $($i.Type) | ``$($i.IoC)`` | $($i.FindingId) |$nl") }
    }
    $gaps = @(Get-ModelArray $s.VisibilityGaps)
    if ($gaps.Count -gt 0) { [void]$sb.Append("$nl## Visibility limits$nl$nl"); foreach ($g in $gaps) { [void]$sb.Append("- $g$nl") } }
    [void]$sb.Append("$nl_Generated by $($m.Tool) v$($m.Version). Full details in the HTML report and JSON export._$nl")
    return $sb.ToString()
}

function Export-FindingsCsv {
    param($Model, [string]$Path)
    $rows = foreach ($f in (Get-ModelArray $Model.findings)) {
        $ev = @()
        if ($f.Evidence) {
            if ($f.Evidence -is [System.Collections.IDictionary]) { foreach ($k in $f.Evidence.Keys) { $ev += "$k=$($f.Evidence[$k])" } }
            else { foreach ($p in $f.Evidence.PSObject.Properties) { $ev += "$($p.Name)=$($p.Value)" } }
        }
        [PSCustomObject][ordered]@{
            Id = $f.Id; Kind = $f.Kind; Risk = $f.Risk; Impact = $f.Impact; Confidence = $f.Confidence; Category = $f.Category; Title = $f.Title
            Entity = $f.Entity; Path = $f.Path; User = $f.User; RemoteIp = $f.RemoteIp; Time = $f.Time; Source = $f.Source; Mitre = $f.Mitre; Tactics = $f.Tactics
            Reasons = ((Get-ModelArray $f.Reasons) -join ' | '); IoCs = ((Get-ModelArray $f.IoCs) -join ' | '); Evidence = ($ev -join ' | '); Recommendation = $f.Recommendation
        }
    }
    if ($rows) { $rows | Export-Csv -LiteralPath $Path -NoTypeInformation -Encoding UTF8 }
}

function Write-HtmlReport {
    param([string]$Json, [string]$Path, [string]$Title)
    $bs = [string][char]92   # JSON unicode escapes keep "</script>" and HTML out of the data island
    $safeJson = $Json.Replace([string][char]60, $bs + "u003c").Replace([string][char]62, $bs + "u003e").Replace([string][char]38, $bs + "u0026")
    $html = $script:HtmlTemplate.Replace('__REPORT_TITLE__', [System.Net.WebUtility]::HtmlEncode($Title)).Replace('/*__REPORT_DATA__*/', $safeJson)
    Write-Utf8File -Path $Path -Content $html
}

function Write-ConsoleSummary {
    param($Model)
    $s = $Model.summary
    $color = switch ($s.OverallRisk) { 'Critical' { 'Red' } 'High' { 'Yellow' } 'Moderate' { 'Cyan' } default { 'Green' } }
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host 'SCAN SUMMARY' -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host "OVERALL RISK : $($s.OverallRisk)" -ForegroundColor $color
    Write-Host "ASSESSMENT   : $($s.Headline)" -ForegroundColor $color
    Write-Host "WHY          : $($s.Justification)" -ForegroundColor Gray
    Write-Host ("FINDINGS     : Critical {0} | High {1} | Moderate {2} | Low {3} | Posture {4}" -f $s.Counts.Critical, $s.Counts.High, $s.Counts.Moderate, $s.Counts.Low, $s.PostureFindings)
    Write-Host ("IoC MATCHES  : {0} (high confidence {1}) | Correlations {2} | Coverage {3}%" -f $s.IocMatches, $s.HighConfidenceIocs, $s.Correlations, $s.CoverageScore) -ForegroundColor Magenta
    $top = @(Get-ModelArray $Model.findings | Where-Object { $_.Kind -eq 'Threat' -and $_.Risk -in @('Critical', 'High') } | Select-Object -First 10)
    if ($top.Count -gt 0) {
        Write-Host "`nTOP FINDINGS:" -ForegroundColor Yellow
        foreach ($f in $top) {
            $c = if ($f.Risk -eq 'Critical') { 'Red' } else { 'Yellow' }
            Write-Host ("  [{0}] {1} {2}" -f $f.Risk, $f.Id, $f.Title) -ForegroundColor $c
            Write-Host ("        {0} | {1} | {2}" -f $f.Entity, $f.Mitre, $f.Source) -ForegroundColor Gray
        }
    }
    $recs = @(Get-ModelArray $Model.recommendations | Select-Object -First 5)
    if ($recs.Count -gt 0) {
        Write-Host "`nNEXT STEPS:" -ForegroundColor Cyan
        foreach ($r in $recs) { Write-Host ("  {0}. {1}" -f $r.Priority, $r.Action) -ForegroundColor White }
    }
    foreach ($g in (Get-ModelArray $s.VisibilityGaps)) { Write-Host "  ! Visibility: $g" -ForegroundColor DarkYellow }
}

# ============================================================================
# HTML report template (self-contained: no external scripts, fonts or CDNs)
# All data is rendered with textContent - host data can never inject HTML/JS.
# ============================================================================

$script:HtmlTemplate = @'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;">
<title>__REPORT_TITLE__</title>
<style>
:root{
  --bg:#f4f6f9;--panel:#ffffff;--panel2:#f8fafc;--ink:#1d2733;--muted:#5d6b7b;--line:#dde3ea;--accent:#1f5fae;
  --crit:#b3261e;--crit-bg:#fdecea;--high:#c25400;--high-bg:#fff1e5;--mod:#8a6d00;--mod-bg:#fff8db;--low:#2e7d32;--low-bg:#eaf5ea;--info:#607d8b;--info-bg:#eef2f5;
  --shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#0f141a;--panel:#171e26;--panel2:#1d2630;--ink:#e3e9ef;--muted:#9aa8b6;--line:#2b3641;--accent:#6aa7ef;
    --crit:#ff8a80;--crit-bg:#3b1715;--high:#ffb26b;--high-bg:#3a2412;--mod:#f2d061;--mod-bg:#352d0f;--low:#81c784;--low-bg:#16301a;--info:#a7bac6;--info-bg:#1f2a33;
    --shadow:none;
  }
}
:root[data-theme="dark"]{
  --bg:#0f141a;--panel:#171e26;--panel2:#1d2630;--ink:#e3e9ef;--muted:#9aa8b6;--line:#2b3641;--accent:#6aa7ef;
  --crit:#ff8a80;--crit-bg:#3b1715;--high:#ffb26b;--high-bg:#3a2412;--mod:#f2d061;--mod-bg:#352d0f;--low:#81c784;--low-bg:#16301a;--info:#a7bac6;--info-bg:#1f2a33;
  --shadow:none;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:14px/1.5 "Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif}
a{color:var(--accent)}
code,.mono{font-family:Consolas,"Cascadia Mono",Menlo,monospace;font-size:12.5px}
header.top{position:sticky;top:0;z-index:20;background:var(--panel);border-bottom:1px solid var(--line);box-shadow:var(--shadow)}
.top-inner{max-width:1500px;margin:0 auto;padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.brand{font-weight:700;letter-spacing:.2px}
.brand small{display:block;font-weight:400;color:var(--muted);font-size:12px}
.spacer{flex:1}
.btn{border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:6px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer}
.btn:hover{border-color:var(--accent)}
.layout{max-width:1500px;margin:0 auto;padding:16px;display:grid;grid-template-columns:200px minmax(0,1fr);gap:20px}
nav.toc{position:sticky;top:76px;align-self:start;font-size:13px}
nav.toc a{display:block;padding:5px 10px;border-radius:6px;color:var(--muted);text-decoration:none}
nav.toc a:hover{background:var(--panel);color:var(--ink)}
@media (max-width:1000px){.layout{grid-template-columns:minmax(0,1fr)} nav.toc{display:none}}
section.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin-bottom:18px;box-shadow:var(--shadow)}
section.card>h2{margin:0 0 12px;font-size:17px;display:flex;align-items:center;gap:8px}
section.card>h2 .sub{font-weight:400;color:var(--muted);font-size:13px}
.hero{display:grid;grid-template-columns:240px minmax(0,1fr);gap:20px}
@media (max-width:700px){.hero{grid-template-columns:minmax(0,1fr)}}
.verdict{border-radius:10px;padding:18px;text-align:center;color:#fff;display:flex;flex-direction:column;justify-content:center}
.verdict .lbl{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.9}
.verdict .lvl{font-size:34px;font-weight:800;line-height:1.1;margin:6px 0}
.v-critical{background:#b3261e}.v-high{background:#c25400}.v-moderate{background:#9a7b00}.v-low{background:#2e7d32}.v-info{background:#546e7a}
.headline{font-size:19px;font-weight:700;margin:0 0 6px}
.just{color:var(--muted);margin:0 0 10px}
ul.plain{margin:0;padding-left:18px}
ul.plain li{margin:3px 0}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:16px}
.kpi{border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:var(--panel2);cursor:default}
.kpi.click{cursor:pointer}.kpi.click:hover{border-color:var(--accent)}
.kpi .n{font-size:24px;font-weight:800}
.kpi .t{font-size:12px;color:var(--muted)}
.kpi.k-critical .n{color:var(--crit)}.kpi.k-high .n{color:var(--high)}.kpi.k-moderate .n{color:var(--mod)}.kpi.k-low .n{color:var(--low)}
.badge{display:inline-block;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:700;white-space:nowrap}
.r-critical{background:var(--crit-bg);color:var(--crit)}.r-high{background:var(--high-bg);color:var(--high)}.r-moderate{background:var(--mod-bg);color:var(--mod)}.r-low{background:var(--low-bg);color:var(--low)}.r-info{background:var(--info-bg);color:var(--info)}
.chip{display:inline-block;border:1px solid var(--line);border-radius:6px;padding:0 6px;margin:1px 3px 1px 0;font-size:12px;background:var(--panel2);cursor:pointer;color:var(--ink)}
.chip:hover{border-color:var(--accent)}
.chip.static{cursor:default}
ol.actions{margin:0;padding-left:0;list-style:none;counter-reset:a}
ol.actions li{display:grid;grid-template-columns:28px 26px minmax(0,1fr);gap:8px;align-items:start;padding:9px 0;border-bottom:1px solid var(--line)}
ol.actions li:last-child{border-bottom:none}
ol.actions .num{font-weight:800;color:var(--muted);text-align:right}
ol.actions li.done .txt{text-decoration:line-through;color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:12px}
.fcard{border:1px solid var(--line);border-left:5px solid var(--info);border-radius:8px;padding:12px 14px;background:var(--panel2)}
.fcard.b-critical{border-left-color:var(--crit)}.fcard.b-high{border-left-color:var(--high)}.fcard.b-moderate{border-left-color:var(--mod)}.fcard.b-low{border-left-color:var(--low)}
.fcard h3{margin:4px 0 6px;font-size:14.5px}
.fcard .meta{color:var(--muted);font-size:12px;word-break:break-all}
.fcard .why{margin:8px 0 6px;font-size:13px}
.fcard .act{font-size:12.5px;border-top:1px dashed var(--line);padding-top:6px;margin-top:6px}
.matrix{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.tcol{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel2)}
.tcol .th{padding:7px 9px;font-weight:700;font-size:12.5px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:6px}
.tcol.empty{opacity:.55}
.tech{margin:6px;padding:6px 8px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid transparent}
.tech:hover{border-color:var(--accent)}
.tech b{display:block;font-size:11.5px}
.tech.r-critical,.tech.r-high,.tech.r-moderate,.tech.r-low,.tech.r-info{font-weight:400}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.controls input[type=search],.controls select{border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:6px;padding:6px 9px;font:inherit;font-size:13px}
.controls input[type=search]{min-width:min(240px,100%);flex:1}
.toggle{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;user-select:none;background:var(--panel2)}
.toggle.off{opacity:.4;text-decoration:line-through}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px}
table.grid{border-collapse:collapse;width:100%;font-size:13px}
table.grid th{position:sticky;top:0;background:var(--panel2);text-align:left;padding:8px;border-bottom:1px solid var(--line);white-space:nowrap;cursor:pointer;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
table.grid td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top;word-break:break-word}
table.grid tr.row{cursor:pointer}
table.grid tr.row:hover td{background:var(--panel2)}
table.grid tr.detail td{background:var(--panel2);padding:12px 16px}
table.kv{border-collapse:collapse;width:100%;font-size:12.5px}
table.kv th{width:170px;text-align:left;color:var(--muted);font-weight:600;padding:4px 8px;vertical-align:top}
table.kv td{padding:4px 8px;word-break:break-all;white-space:pre-wrap;font-family:Consolas,"Cascadia Mono",Menlo,monospace}
.detail h4{margin:10px 0 4px;font-size:12.5px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
.tl{list-style:none;margin:0;padding:0;border-left:2px solid var(--line);margin-left:8px}
.tl li{position:relative;padding:4px 0 8px 16px}
.tl li:before{content:"";position:absolute;left:-7px;top:9px;width:12px;height:12px;border-radius:50%;background:var(--info)}
.tl li.d-critical:before{background:var(--crit)}.tl li.d-high:before{background:var(--high)}.tl li.d-moderate:before{background:var(--mod)}.tl li.d-low:before{background:var(--low)}
.tl .when{font-family:Consolas,Menlo,monospace;font-size:12px;color:var(--muted)}
.tl .day{font-weight:700;margin:10px 0 4px -8px;padding-left:0;list-style:none}
.tl .day:before{display:none}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:10px}
.pitem{display:grid;grid-template-columns:14px minmax(0,1fr);gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel2)}
.dot{width:10px;height:10px;border-radius:50%;margin-top:5px}
.s-good{background:var(--low)}.s-warning{background:var(--mod)}.s-bad{background:var(--crit)}.s-info{background:var(--info)}
.pitem .c{font-weight:600}.pitem .v{font-size:12.5px}.pitem .d{font-size:12px;color:var(--muted)}
.hostgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-bottom:14px}
.hostgrid div{background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:7px 10px;font-size:13px;word-break:break-word}
.hostgrid b{display:block;font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
.st{font-weight:700;font-size:12px}.st-ok{color:var(--low)}.st-partial{color:var(--mod)}.st-failed{color:var(--crit)}.st-skipped{color:var(--info)}
.muted{color:var(--muted)}
.empty-state{color:var(--muted);font-style:italic;padding:6px 0}
table.matrix5{border-collapse:collapse;font-size:12px;margin-top:8px}
table.matrix5 td,table.matrix5 th{border:1px solid var(--line);padding:6px 10px;text-align:center}
footer{max-width:1500px;margin:0 auto;padding:6px 16px 30px;color:var(--muted);font-size:12px}
.flash{outline:3px solid var(--accent);outline-offset:-3px}
@media print{
  header.top,nav.toc,.controls,.noprint,#inventory{display:none!important}
  .layout{display:block;padding:0}
  section.card{break-inside:avoid-page;box-shadow:none}
  body{background:#fff}
}
</style>
</head>
<body>
<script type="application/json" id="report-data">/*__REPORT_DATA__*/</script>
<header class="top"><div class="top-inner" id="topbar"></div></header>
<div class="layout">
  <nav class="toc" id="toc"></nav>
  <main id="main"></main>
</div>
<footer id="footer"></footer>
<script>
(function () {
  'use strict';
  var D;
  try { D = JSON.parse(document.getElementById('report-data').textContent); }
  catch (e) { document.getElementById('main').textContent = 'Report data could not be loaded: ' + e; return; }

  var RANK = { Critical: 4, High: 3, Moderate: 2, Low: 1, Info: 0 };
  var RISKS = ['Critical', 'High', 'Moderate', 'Low', 'Info'];
  function arr(x) {
    if (x === null || x === undefined) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === 'object' && Array.isArray(x.value)) return x.value;
    return [x];
  }
  function obj(x) { return (x && typeof x === 'object' && !Array.isArray(x)) ? x : {}; }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) add(el, c[i]); return; }
    if (typeof c === 'string' || typeof c === 'number' || typeof c === 'boolean') { el.appendChild(document.createTextNode(String(c))); return; }
    el.appendChild(c);
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function lc(s) { return String(s || '').toLowerCase(); }
  function badge(r) { r = r || 'Info'; return h('span', { 'class': 'badge r-' + lc(r) }, r); }
  function card(id, title, sub) {
    var s = h('section', { 'class': 'card', id: id }, h('h2', null, title, sub ? h('span', { 'class': 'sub' }, sub) : null));
    return s;
  }

  var meta = obj(D.metadata), sum = obj(D.summary), counts = obj(sum.Counts);
  var findings = arr(D.findings);
  var byId = {};
  findings.forEach(function (f) { byId[f.Id] = f; });
  var threat = findings.filter(function (f) { return f.Kind === 'Threat'; });
  var main = document.getElementById('main');
  var findingsApi = null;

  function idChip(id) {
    return h('span', { 'class': 'chip', title: byId[id] ? byId[id].Title : id, onclick: function () { if (findingsApi) findingsApi.focus(id); } }, id);
  }

  // ---------------- Top bar ----------------
  (function () {
    var bar = document.getElementById('topbar');
    add(bar, h('div', { 'class': 'brand' }, (meta.Tool || 'Deep Threat Scan') + ' v' + (meta.Version || ''),
      h('small', null, 'Host ' + (meta.Host || '?') + (meta.CaseId ? '  |  Case ' + meta.CaseId : '') + '  |  ' + (meta.Finished || ''))));
    add(bar, badge(sum.OverallRisk));
    add(bar, h('span', { 'class': 'spacer' }));
    add(bar, h('button', { 'class': 'btn', onclick: function () { window.print(); } }, 'Print / PDF'));
    add(bar, h('button', { 'class': 'btn', onclick: function () { if (findingsApi) findingsApi.exportCsv(); } }, 'Export findings CSV'));
    add(bar, h('button', { 'class': 'btn', onclick: function () {
      var root = document.documentElement;
      var cur = root.getAttribute('data-theme');
      var dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
    } }, 'Theme'));
  })();

  // ---------------- TOC ----------------
  var sections = [['summary', 'Executive summary'], ['actions', 'Response actions'], ['key', 'Key findings'], ['attack', 'MITRE ATT&CK'],
    ['timeline', 'Timeline'], ['findings', 'All findings'], ['iocs', 'Indicators (IoC)'], ['posture', 'Security posture'],
    ['coverage', 'Scan coverage'], ['inventory', 'Artifact inventory'], ['method', 'Methodology']];
  var toc = document.getElementById('toc');
  sections.forEach(function (s) { add(toc, h('a', { href: '#' + s[0] }, s[1])); });

  // ---------------- Executive summary ----------------
  (function () {
    var s = card('summary', 'Executive summary', meta.Started ? 'scan ' + meta.Started + ' - ' + meta.Finished : '');
    var risk = sum.OverallRisk || 'Low';
    var verdict = h('div', { 'class': 'verdict v-' + lc(risk) }, h('div', { 'class': 'lbl' }, 'Overall risk'), h('div', { 'class': 'lvl' }, risk),
      h('div', { 'class': 'lbl' }, (counts.Critical || 0) + ' critical  /  ' + (counts.High || 0) + ' high'));
    var right = h('div', null, h('p', { 'class': 'headline' }, sum.Headline || ''), h('p', { 'class': 'just' }, sum.Justification || ''));
    var ul = h('ul', { 'class': 'plain' });
    arr(sum.Assessment).forEach(function (a) { add(ul, h('li', null, a)); });
    add(right, ul);
    add(s, h('div', { 'class': 'hero' }, verdict, right));
    var k = h('div', { 'class': 'kpis' });
    RISKS.slice(0, 4).forEach(function (r) {
      add(k, h('div', { 'class': 'kpi click k-' + lc(r), title: 'Show ' + r + ' findings', onclick: function () { if (findingsApi) findingsApi.only(r); } },
        h('div', { 'class': 'n' }, String(counts[r] || 0)), h('div', { 'class': 't' }, r + ' findings')));
    });
    add(k, h('div', { 'class': 'kpi' }, h('div', { 'class': 'n' }, String(sum.IocMatches || 0)), h('div', { 'class': 't' }, 'IoC matches (' + (sum.HighConfidenceIocs || 0) + ' high conf.)')));
    add(k, h('div', { 'class': 'kpi' }, h('div', { 'class': 'n' }, String(sum.Correlations || 0)), h('div', { 'class': 't' }, 'Correlated findings')));
    add(k, h('div', { 'class': 'kpi' }, h('div', { 'class': 'n' }, String(arr(sum.TacticsObserved).length)), h('div', { 'class': 't' }, 'ATT&CK tactics observed')));
    add(k, h('div', { 'class': 'kpi' }, h('div', { 'class': 'n' }, String(sum.CoverageScore || 0) + '%'), h('div', { 'class': 't' }, 'Collectors fully successful')));
    add(s, k);
    var gaps = arr(sum.VisibilityGaps);
    if (gaps.length) add(s, h('p', { 'class': 'muted', style: 'margin:12px 0 0' }, 'Visibility limits: ' + gaps.join('; ') + '.'));
    add(main, s);
  })();

  // ---------------- Response actions ----------------
  (function () {
    var s = card('actions', 'Recommended response actions', 'prioritised, de-duplicated');
    var ol = h('ol', { 'class': 'actions' });
    arr(D.recommendations).forEach(function (r) {
      var li = h('li');
      var cb = h('input', { type: 'checkbox', title: 'Mark as done', onchange: function () { li.className = cb.checked ? 'done' : ''; } });
      var ids = arr(r.FindingIds);
      add(li, [h('span', { 'class': 'num' }, String(r.Priority) + '.'), cb,
        h('div', { 'class': 'txt' }, badge(r.Risk), ' ', r.Action, ids.length ? h('div', { style: 'margin-top:4px' }, ids.slice(0, 12).map(idChip), ids.length > 12 ? h('span', { 'class': 'muted' }, ' +' + (ids.length - 12) + ' more') : null) : null)]);
      add(ol, li);
    });
    add(s, ol);
    add(main, s);
  })();

  // ---------------- Key findings ----------------
  (function () {
    var s = card('key', 'Key findings', 'highest risk first');
    var top = threat.filter(function (f) { return RANK[f.Risk] >= 3; }).slice(0, 9);
    if (!top.length) top = threat.filter(function (f) { return RANK[f.Risk] >= 2; }).slice(0, 6);
    if (!top.length) { add(s, h('div', { 'class': 'empty-state' }, 'No Moderate or higher threat findings were identified.')); add(main, s); return; }
    var wrap = h('div', { 'class': 'cards' });
    top.forEach(function (f) {
      var reasons = arr(f.Reasons);
      add(wrap, h('div', { 'class': 'fcard b-' + lc(f.Risk) },
        h('div', null, badge(f.Risk), ' ', h('span', { 'class': 'chip', onclick: function () { findingsApi.focus(f.Id); } }, f.Id), ' ', h('span', { 'class': 'muted' }, f.Category)),
        h('h3', null, f.Title),
        h('div', { 'class': 'meta mono' }, f.Entity || ''),
        h('div', { 'class': 'meta' }, [f.Time ? 'Time: ' + f.Time : null, f.Source ? ' | Source: ' + f.Source : null, f.Mitre ? ' | ' + f.Mitre : null]),
        reasons.length ? h('div', { 'class': 'why' }, h('b', null, 'Why flagged: '), reasons.slice(0, 3).join(' ; ')) : null,
        h('div', { 'class': 'act' }, h('b', null, 'Action: '), f.Recommendation || '')));
    });
    add(s, wrap);
    add(main, s);
  })();

  // ---------------- ATT&CK matrix ----------------
  (function () {
    var s = card('attack', 'MITRE ATT&CK coverage', 'threat findings mapped to tactics and techniques - click a technique to filter');
    var m = h('div', { 'class': 'matrix' });
    arr(D.attack).forEach(function (t) {
      var techs = arr(t.Techniques);
      var col = h('div', { 'class': 'tcol' + (techs.length ? '' : ' empty') }, h('div', { 'class': 'th' }, t.Tactic, techs.length ? badge(t.MaxRisk) : null));
      techs.forEach(function (x) {
        add(col, h('div', { 'class': 'tech r-' + lc(x.MaxRisk), title: arr(x.FindingIds).join(', '), onclick: function () { findingsApi.filterText(x.Id); } },
          h('b', null, x.Id + '  (' + x.Count + ')'), x.Name));
      });
      add(m, col);
    });
    add(s, m);
    add(main, s);
  })();

  // ---------------- Timeline ----------------
  (function () {
    var s = card('timeline', 'Timeline of events', 'time-stamped findings, oldest first');
    var sel = h('select', null, ['Critical', 'High', 'Moderate', 'Low', 'Info'].map(function (r) { return h('option', { value: r, selected: r === 'Moderate' }, r + ' and above'); }));
    var list = h('ul', { 'class': 'tl' });
    function render() {
      list.textContent = '';
      var min = RANK[sel.value];
      var items = arr(D.timeline).filter(function (t) { return RANK[t.Risk] >= min; });
      if (!items.length) { add(list, h('li', { 'class': 'day' }, h('span', { 'class': 'empty-state' }, 'No time-stamped findings at this level.'))); return; }
      var day = '';
      items.forEach(function (t) {
        var d = String(t.Time).slice(0, 10);
        if (d !== day) { day = d; add(list, h('li', { 'class': 'day' }, d)); }
        add(list, h('li', { 'class': 'd-' + lc(t.Risk) }, h('span', { 'class': 'when' }, String(t.Time).slice(11) || String(t.Time)), '  ', badge(t.Risk), ' ', idChip(t.Id), ' ', t.Title,
          h('div', { 'class': 'muted mono', style: 'font-size:12px' }, (t.Entity || '') + (t.Source ? '  [' + t.Source + ']' : ''))));
      });
    }
    sel.addEventListener('change', render);
    add(s, h('div', { 'class': 'controls' }, 'Show ', sel));
    add(s, list);
    render();
    add(main, s);
  })();

  // ---------------- All findings ----------------
  (function () {
    var s = card('findings', 'All findings', findings.length + ' total - click a row for evidence');
    var state = { text: '', risks: { Critical: true, High: true, Moderate: true, Low: true, Info: true }, cat: '', kind: 'Threat', sort: 'Risk', dir: -1, open: {} };
    var search = h('input', { type: 'search', placeholder: 'Search title, entity, path, MITRE, evidence...' });
    var cats = {}; findings.forEach(function (f) { cats[f.Category] = 1; });
    var catSel = h('select', null, h('option', { value: '' }, 'All categories'), Object.keys(cats).sort().map(function (c) { return h('option', { value: c }, c); }));
    var kindSel = h('select', null, h('option', { value: 'Threat' }, 'Threat findings'), h('option', { value: 'Posture' }, 'Posture / hardening'), h('option', { value: '' }, 'Everything'));
    var toggles = {};
    var ctl = h('div', { 'class': 'controls' }, search, catSel, kindSel);
    RISKS.forEach(function (r) {
      var t = h('span', { 'class': 'toggle', onclick: function () { state.risks[r] = !state.risks[r]; t.className = 'toggle' + (state.risks[r] ? '' : ' off'); render(); } }, r);
      toggles[r] = t; add(ctl, t);
    });
    var countEl = h('span', { 'class': 'muted' });
    add(ctl, countEl);
    var cols = [['Id', 'ID'], ['Risk', 'Risk'], ['Title', 'Finding'], ['Category', 'Category'], ['Entity', 'Entity'], ['Mitre', 'MITRE'], ['Time', 'Time']];
    var thead = h('tr');
    cols.forEach(function (c) {
      add(thead, h('th', { onclick: function () { if (state.sort === c[0]) state.dir = -state.dir; else { state.sort = c[0]; state.dir = c[0] === 'Risk' ? -1 : 1; } render(); } }, c[1]));
    });
    var tbody = h('tbody');
    add(s, ctl);
    add(s, h('div', { 'class': 'tablewrap' }, h('table', { 'class': 'grid' }, h('thead', null, thead), tbody)));
    var current = [];

    function haystack(f) {
      if (!f._hay) {
        var ev = obj(f.Evidence), parts = [f.Id, f.Title, f.Entity, f.Path, f.Mitre, f.Tactics, f.Source, f.User, f.RemoteIp, f.Category].concat(arr(f.Reasons), arr(f.IoCs));
        for (var k in ev) parts.push(k + ' ' + ev[k]);
        f._hay = lc(parts.join(' \n '));
      }
      return f._hay;
    }
    function detail(f) {
      var d = h('div', { 'class': 'detail' });
      var reasons = arr(f.Reasons);
      if (reasons.length) { add(d, h('h4', null, 'Why it was flagged')); var ul = h('ul', { 'class': 'plain' }); reasons.forEach(function (r) { add(ul, h('li', null, r)); }); add(d, ul); }
      var ev = obj(f.Evidence), keys = Object.keys(ev);
      if (keys.length) {
        add(d, h('h4', null, 'Evidence'));
        var t = h('table', { 'class': 'kv' });
        keys.forEach(function (k) {
          var v = String(ev[k]);
          var cell = (k === 'VirusTotal' && /^https:\/\/www\.virustotal\.com\//.test(v)) ? h('a', { href: v, target: '_blank', rel: 'noopener noreferrer' }, v) : v;
          add(t, h('tr', null, h('th', null, k), h('td', null, cell)));
        });
        add(d, t);
      }
      var iocs = arr(f.IoCs);
      if (iocs.length) { add(d, h('h4', null, 'Indicators')); add(d, h('div', null, iocs.map(function (i) { return h('span', { 'class': 'chip static mono' }, i); }))); }
      add(d, [h('h4', null, 'Recommended action'), h('div', null, f.Recommendation || '')]);
      var rel = arr(f.Related);
      if (rel.length) add(d, [h('h4', null, 'Related findings'), h('div', null, rel.map(idChip))]);
      add(d, h('div', { 'class': 'muted', style: 'margin-top:8px;font-size:12px' },
        'Impact ' + f.Impact + '/10, confidence ' + f.Confidence + '/10 | Source: ' + (f.Source || '-') + (f.Tactics ? ' | Tactics: ' + f.Tactics : '') + (f.User ? ' | User: ' + f.User : '')));
      return d;
    }
    function filtered() {
      var q = lc(state.text);
      var out = findings.filter(function (f) {
        if (state.kind && f.Kind !== state.kind) return false;
        if (!state.risks[f.Risk]) return false;
        if (state.cat && f.Category !== state.cat) return false;
        if (q && haystack(f).indexOf(q) < 0) return false;
        return true;
      });
      out.sort(function (a, b) {
        var x, y;
        if (state.sort === 'Risk') { x = RANK[a.Risk] * 1000 + a.Impact * 10 + a.Confidence; y = RANK[b.Risk] * 1000 + b.Impact * 10 + b.Confidence; }
        else { x = lc(a[state.sort]); y = lc(b[state.sort]); }
        return x < y ? -state.dir : x > y ? state.dir : 0;
      });
      return out;
    }
    function render() {
      current = filtered();
      tbody.textContent = '';
      countEl.textContent = current.length + ' shown';
      if (!current.length) { add(tbody, h('tr', null, h('td', { colspan: '7', 'class': 'empty-state' }, 'No findings match the current filters.'))); return; }
      current.slice(0, 1500).forEach(function (f) {
        var tr = h('tr', { 'class': 'row', id: 'row-' + f.Id },
          h('td', { 'class': 'mono', style: 'white-space:nowrap' }, f.Id), h('td', null, badge(f.Risk)), h('td', null, f.Title), h('td', null, f.Category),
          h('td', { 'class': 'mono', style: 'max-width:340px' }, f.Entity || ''), h('td', { 'class': 'mono' }, f.Mitre || ''), h('td', { 'class': 'mono', style: 'white-space:nowrap' }, f.Time || ''));
        var dr = h('tr', { 'class': 'detail', style: state.open[f.Id] ? '' : 'display:none' }, h('td', { colspan: '7' }));
        if (state.open[f.Id]) add(dr.firstChild, detail(f));
        tr.addEventListener('click', function () {
          state.open[f.Id] = !state.open[f.Id];
          if (state.open[f.Id] && !dr.firstChild.firstChild) add(dr.firstChild, detail(f));
          dr.style.display = state.open[f.Id] ? '' : 'none';
        });
        add(tbody, [tr, dr]);
      });
      if (current.length > 1500) add(tbody, h('tr', null, h('td', { colspan: '7', 'class': 'muted' }, 'Showing first 1500 rows - refine the filters or use the CSV/JSON export.')));
    }
    var timer = null;
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { state.text = search.value; render(); }, 150); });
    catSel.addEventListener('change', function () { state.cat = catSel.value; render(); });
    kindSel.addEventListener('change', function () { state.kind = kindSel.value; render(); });
    render();
    add(main, s);

    function csvCell(v) { v = (v === null || v === undefined) ? '' : String(v); return '"' + v.replace(/"/g, '""') + '"'; }
    findingsApi = {
      focus: function (id) {
        var f = byId[id]; if (!f) return;
        state.kind = ''; kindSel.value = ''; state.cat = ''; catSel.value = ''; state.text = ''; search.value = '';
        RISKS.forEach(function (r) { state.risks[r] = true; toggles[r].className = 'toggle'; });
        state.open[id] = true; render();
        var row = document.getElementById('row-' + id);
        if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('flash'); setTimeout(function () { row.classList.remove('flash'); }, 1800); }
      },
      only: function (risk) {
        RISKS.forEach(function (r) { state.risks[r] = (r === risk); toggles[r].className = 'toggle' + (state.risks[r] ? '' : ' off'); });
        state.kind = 'Threat'; kindSel.value = 'Threat'; render();
        document.getElementById('findings').scrollIntoView({ behavior: 'smooth' });
      },
      filterText: function (t) { state.text = t; search.value = t; state.kind = ''; kindSel.value = ''; render(); document.getElementById('findings').scrollIntoView({ behavior: 'smooth' }); },
      exportCsv: function () {
        var head = ['Id', 'Kind', 'Risk', 'Impact', 'Confidence', 'Category', 'Title', 'Entity', 'Path', 'User', 'RemoteIp', 'Time', 'Source', 'Mitre', 'Reasons', 'Evidence', 'Recommendation'];
        var lines = [head.join(',')];
        current.forEach(function (f) {
          var ev = obj(f.Evidence), evs = Object.keys(ev).map(function (k) { return k + '=' + ev[k]; }).join(' | ');
          lines.push([f.Id, f.Kind, f.Risk, f.Impact, f.Confidence, f.Category, f.Title, f.Entity, f.Path, f.User, f.RemoteIp, f.Time, f.Source, f.Mitre, arr(f.Reasons).join(' | '), evs, f.Recommendation].map(csvCell).join(','));
        });
        var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var a = h('a', { href: URL.createObjectURL(blob), download: 'findings_' + (meta.Host || 'host') + '.csv' });
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }
    };
  })();

  // ---------------- IoCs ----------------
  (function () {
    var list = arr(D.iocMatches);
    var s = card('iocs', 'Indicators of compromise', list.length + ' matched');
    if (!list.length) { add(s, h('div', { 'class': 'empty-state' }, 'No indicator from the IoC base / feed matched on this host.')); add(main, s); return; }
    var tb = h('tbody');
    list.slice().sort(function (a, b) { return (b.Confidence * 10 + b.Impact) - (a.Confidence * 10 + a.Impact); }).forEach(function (i) {
      add(tb, h('tr', null, h('td', null, i.Type), h('td', { 'class': 'mono' }, i.IoC), h('td', null, i.Description), h('td', null, i.Impact + '/' + i.Confidence),
        h('td', null, i.ThreatIntel || ''), h('td', null, idChip(i.FindingId))));
    });
    add(s, h('div', { 'class': 'tablewrap' }, h('table', { 'class': 'grid' }, h('thead', null, h('tr', null, ['Type', 'Indicator', 'Description', 'Impact/Conf', 'Source', 'Finding'].map(function (x) { return h('th', null, x); }))), tb)));
    add(main, s);
  })();

  // ---------------- Posture ----------------
  (function () {
    var s = card('posture', 'Security posture & telemetry', 'hardening gaps reduce detection and increase attack surface');
    var groups = {};
    arr(D.posture).forEach(function (p) { (groups[p.Area] = groups[p.Area] || []).push(p); });
    Object.keys(groups).forEach(function (g) {
      add(s, h('h3', { style: 'font-size:14px;margin:12px 0 6px' }, g));
      var grid = h('div', { 'class': 'pgrid' });
      groups[g].forEach(function (p) {
        add(grid, h('div', { 'class': 'pitem' }, h('span', { 'class': 'dot s-' + lc(p.Status) }),
          h('div', null, h('div', { 'class': 'c' }, p.Check), h('div', { 'class': 'v' }, p.Value), p.Detail ? h('div', { 'class': 'd' }, p.Detail) : null)));
      });
      add(s, grid);
    });
    if (!Object.keys(groups).length) add(s, h('div', { 'class': 'empty-state' }, 'Posture checks were not collected.'));
    add(main, s);
  })();

  // ---------------- Coverage ----------------
  (function () {
    var s = card('coverage', 'Scan coverage & host details', 'what was collected, and what could not be');
    var hg = h('div', { 'class': 'hostgrid' });
    var hi = obj(D.hostInfo);
    Object.keys(hi).forEach(function (k) { add(hg, h('div', null, h('b', null, k), String(hi[k]))); });
    add(hg, h('div', null, h('b', null, 'Scan profile'), (meta.ScanProfile || '') + ', events ' + meta.LookbackHours + 'h, files ' + meta.FileLookbackDays + 'd'));
    add(hg, h('div', null, h('b', null, 'Analyst'), meta.Analyst || '-'));
    add(hg, h('div', null, h('b', null, 'Duration'), (meta.DurationSec || 0) + ' s'));
    var feed = obj(meta.IocFeed);
    add(hg, h('div', null, h('b', null, 'IoC feed'), feed.Path ? feed.Path + ' (' + feed.IPs + ' IPs, ' + feed.Domains + ' domains, ' + feed.Hashes + ' hashes)' : 'Built-in indicators only'));
    add(s, hg);
    var tb = h('tbody');
    arr(D.coverage).forEach(function (c) {
      add(tb, h('tr', null, h('td', null, c.Label), h('td', null, h('span', { 'class': 'st st-' + lc(c.Status) }, c.Status)), h('td', null, String(c.Items)), h('td', null, String(c.Findings)),
        h('td', null, c.DurationSec + ' s'), h('td', { style: 'font-size:12px' }, arr(c.Notes).join(' | '))));
    });
    add(s, h('div', { 'class': 'tablewrap' }, h('table', { 'class': 'grid' }, h('thead', null, h('tr', null, ['Collector', 'Status', 'Items', 'Findings', 'Time', 'Notes'].map(function (x) { return h('th', null, x); }))), tb)));
    add(main, s);
  })();

  // ---------------- Inventory ----------------
  (function () {
    var inv = obj(D.inventory);
    var names = Object.keys(inv).filter(function (k) { return arr(inv[k]).length; });
    var s = card('inventory', 'Artifact inventory', 'raw collected artifacts (' + names.length + ' datasets)');
    if (!names.length) { add(s, h('div', { 'class': 'empty-state' }, 'No inventory data.')); add(main, s); return; }
    var sel = h('select', null, names.map(function (n) { return h('option', { value: n }, n + ' (' + arr(inv[n]).length + ')'); }));
    var q = h('input', { type: 'search', placeholder: 'Filter rows...' });
    var flaggedOnly = h('input', { type: 'checkbox' });
    var wrap = h('div', { 'class': 'tablewrap' });
    var limit = 200;
    var more = h('button', { 'class': 'btn noprint', style: 'margin-top:8px', onclick: function () { limit += 500; render(); } }, 'Show more');
    function render() {
      var rows = arr(inv[sel.value]);
      var term = lc(q.value);
      if (term) rows = rows.filter(function (r) { return lc(Object.keys(r).map(function (k) { return r[k]; }).join(' ')).indexOf(term) >= 0; });
      if (flaggedOnly.checked) rows = rows.filter(function (r) { return r.Flag; });
      var cols = {};
      rows.slice(0, 50).forEach(function (r) { Object.keys(r).forEach(function (k) { cols[k] = 1; }); });
      var keys = Object.keys(cols);
      var t = h('table', { 'class': 'grid' }, h('thead', null, h('tr', null, keys.map(function (k) { return h('th', null, k); }))));
      var tb = h('tbody');
      rows.slice(0, limit).forEach(function (r) {
        var risk = r.Flag ? String(r.Flag).split(':')[0] : '';
        add(tb, h('tr', null, keys.map(function (k) { return h('td', { 'class': k === 'Flag' && risk ? 'r-' + lc(risk) : null }, r[k] === undefined ? '' : String(r[k])); })));
      });
      if (!rows.length) add(tb, h('tr', null, h('td', { colspan: String(keys.length || 1), 'class': 'empty-state' }, 'No rows.')));
      add(t, tb);
      wrap.textContent = ''; add(wrap, t);
      more.style.display = rows.length > limit ? '' : 'none';
    }
    sel.addEventListener('change', function () { limit = 200; render(); });
    q.addEventListener('input', function () { limit = 200; render(); });
    flaggedOnly.addEventListener('change', render);
    add(s, h('div', { 'class': 'controls' }, sel, q, h('label', null, flaggedOnly, ' flagged rows only')));
    add(s, [wrap, more]);
    render();
    add(main, s);
  })();

  // ---------------- Methodology ----------------
  (function () {
    var s = card('method', 'Methodology');
    add(s, h('p', null, 'Every finding is scored on Impact (damage if real, 1-10) and Confidence (likelihood it is malicious, 1-10), mapped to a 5x5 risk matrix (NIST SP 800-30 style). ' +
      'Findings with confidence below 7 are capped at Moderate. Each additional independent signal on the same artifact adds +1 confidence (max +2). ' +
      'The correlation engine links findings (process <-> network, persistence <-> flagged binary, ransomware / credential-theft / brute-force patterns) and raises the risk when they corroborate each other.'));
    var lv = ['Very low', 'Low', 'Moderate', 'High', 'Very high'];
    var mx = [[1, 1, 1, 1, 2], [1, 1, 1, 2, 3], [1, 1, 2, 3, 3], [1, 2, 3, 3, 4], [2, 2, 3, 4, 4]];
    var names = { 1: 'Low', 2: 'Moderate', 3: 'High', 4: 'Critical' };
    var t = h('table', { 'class': 'matrix5' }, h('tr', null, h('th', null, 'Confidence \\ Impact'), lv.map(function (x) { return h('th', null, x); })));
    for (var r = 4; r >= 0; r--) {
      add(t, h('tr', null, h('th', null, lv[r]), mx[r].map(function (v) { return h('td', { 'class': 'r-' + lc(names[v]) }, names[v]); })));
    }
    add(s, h('div', { style: 'overflow-x:auto' }, t));
    add(s, h('p', { 'class': 'muted', style: 'margin-top:10px' }, 'The scan is read-only and point-in-time. Absence of findings is not proof of absence of compromise - see the visibility limits and scan coverage sections. ' +
      'Posture findings describe hardening gaps and do not raise the overall threat risk.'));
    add(main, s);
  })();

  add(document.getElementById('footer'), (meta.Tool || '') + ' v' + (meta.Version || '') + '  |  host ' + (meta.Host || '') + '  |  generated ' + (meta.Finished || '') +
    '  |  collector ' + (meta.Collector || '') + (meta.Elevated ? ' (elevated)' : ' (NOT elevated)'));
})();
</script>
</body>
</html>
'@

# ============================================================================
# Main
# ============================================================================

function Invoke-Collector {
    param([string]$Name, [string]$Label, [scriptblock]$Action, [int]$Index, [int]$Total, [string]$SkipReason = '')
    $c = [PSCustomObject]@{ Name = $Name; Label = $Label; Status = 'OK'; Items = 0; Findings = 0; DurationSec = 0; Notes = [System.Collections.Generic.List[string]]::new() }
    $script:State.Current = $c
    Write-Host ("[{0,2}/{1}] {2,-42}" -f $Index, $Total, $Label) -ForegroundColor Yellow -NoNewline
    $before = $script:State.Findings.Count
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    if ($SkipReason) {
        $c.Status = 'Skipped'; $c.Notes.Add($SkipReason)
    } else {
        try { $null = & $Action }
        catch { $c.Status = 'Failed'; $c.Notes.Add("Error: $($_.Exception.Message)") }
    }
    $sw.Stop()
    $c.DurationSec = [Math]::Round($sw.Elapsed.TotalSeconds, 1)
    $c.Findings = $script:State.Findings.Count - $before
    $color = switch ($c.Status) { 'OK' { 'Green' } 'Partial' { 'DarkYellow' } 'Skipped' { 'DarkGray' } default { 'Red' } }
    Write-Host (" {0,-8} {1,4} findings  {2,6}s" -f $c.Status, $c.Findings, $c.DurationSec) -ForegroundColor $color
    $script:State.Coverage.Add([PSCustomObject]@{ Name = $c.Name; Label = $c.Label; Status = $c.Status; Items = $c.Items; Findings = $c.Findings; DurationSec = $c.DurationSec; Notes = @($c.Notes) })
    $script:State.Current = $null
}

function Invoke-ReportOnly {
    param([string]$JsonPath)
    if (-not (Test-Path -LiteralPath $JsonPath)) { throw "JSON file not found: $JsonPath" }
    $json = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $JsonPath).Path)
    $model = $json | ConvertFrom-Json
    $dir = Split-Path -Parent (Resolve-Path -LiteralPath $JsonPath).Path
    $base = [System.IO.Path]::GetFileNameWithoutExtension($JsonPath)
    $html = Join-Path $dir "$base.html"
    Write-HtmlReport -Json $json -Path $html -Title ("Deep Threat Scan - {0} - {1}" -f $model.metadata.Host, $model.summary.OverallRisk)
    Write-Utf8File -Path (Join-Path $dir "$base`_ExecutiveSummary.md") -Content (ConvertTo-MarkdownSummary $model)
    Write-ConsoleSummary $model
    Write-Host "`nReport re-generated: $html" -ForegroundColor Green
    if (-not $NoOpen) { try { Start-Process $html } catch {} }
}

# Tests dot-source this file with $global:DTS_SkipMain = $true to load the functions only.
if (-not $global:DTS_SkipMain) {
    if ($ReportFromJson) {
        try { Invoke-ReportOnly -JsonPath $ReportFromJson } catch { Write-Error $_ }
        return
    }

    Write-Host '============================================================' -ForegroundColor Green
    Write-Host "SDEMA IRT : Deep Threat Scan v$ScriptVersion" -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor Green

    $script:IsAdmin = Test-IsAdmin
    $script:Prof = $script:ProfileSettings[$ScanProfile]
    $script:Since = (Get-Date).AddHours(-$LookbackHours)
    $script:IocFeedInfo = $null
    Initialize-ScanState
    Import-IocFeed -Path $IocFile
    Initialize-IocSets
    Initialize-EntropyHelper

    if (-not $script:IsAdmin) {
        Write-Warning 'Not running as Administrator: Security log, Prefetch, Defender exclusions and some process details will be missing. Re-run elevated for full coverage.'
    }
    Write-Host ("Profile: {0} | Event look-back: {1}h | File look-back: {2}d | Elevated: {3}" -f $ScanProfile, $LookbackHours, $FileLookbackDays, $script:IsAdmin) -ForegroundColor Cyan

    $runDir = Join-Path $OutputPath ("{0}_{1}" -f $env:COMPUTERNAME, $startTime.ToString('yyyyMMdd_HHmmss'))
    $null = New-Item -ItemType Directory -Force -Path $runDir
    $logPath = Join-Path $runDir 'ScanLog.txt'
    $transcript = $false
    try { Start-Transcript -LiteralPath $logPath -ErrorAction Stop | Out-Null; $transcript = $true } catch {}

    $fileSkip = if ($SkipFileScan) { 'Skipped by -SkipFileScan' } else { '' }
    $collectors = @(
        @{ Name = 'Get-SystemPosture';             Label = 'Host posture & telemetry' }
        @{ Name = 'Get-DefenderStatus';            Label = 'Microsoft Defender status & detections' }
        @{ Name = 'Get-SecurityLogAnalysis';       Label = 'Security log (logons, accounts, tasks)' }
        @{ Name = 'Get-SystemLogAnalysis';         Label = 'System log (services, log clearing)' }
        @{ Name = 'Get-PowerShellLogAnalysis';     Label = 'PowerShell logs (4104 / 400)' }
        @{ Name = 'Get-ProcessCreationLogAnalysis'; Label = 'Process creation log (4688)' }
        @{ Name = 'Get-SysmonAnalysis';            Label = 'Sysmon (1/3/8/10/11/22)' }
        @{ Name = 'Get-RunningProcesses';          Label = 'Running processes' }
        @{ Name = 'Get-NetworkConnections';        Label = 'Network connections & DNS cache' }
        @{ Name = 'Get-NamedPipes';                Label = 'Named pipes' }
        @{ Name = 'Get-ServiceAnalysis';           Label = 'Services' }
        @{ Name = 'Get-RegistryPersistence';       Label = 'Registry persistence (all users)' }
        @{ Name = 'Get-StartupFolders';            Label = 'Startup folders' }
        @{ Name = 'Get-ScheduledTaskAnalysis';     Label = 'Scheduled tasks' }
        @{ Name = 'Get-WmiPersistence';            Label = 'WMI event subscriptions' }
        @{ Name = 'Get-BitsJobs';                  Label = 'BITS jobs' }
        @{ Name = 'Get-DriverAnalysis';            Label = 'Kernel drivers' }
        @{ Name = 'Get-PrefetchEvidence';          Label = 'Prefetch (execution evidence)' }
        @{ Name = 'Get-PowerShellHistory';         Label = 'PowerShell console history' }
        @{ Name = 'Get-HostsFileAnalysis';         Label = 'hosts file' }
        @{ Name = 'Get-SuspiciousFiles';           Label = 'Suspicious files (user space)'; Skip = $fileSkip }
        @{ Name = 'Get-RansomwareFileIndicators';  Label = 'Ransom notes & encrypted files'; Skip = $fileSkip }
    )
    $i = 0
    foreach ($col in $collectors) {
        $i++
        $fn = $col.Name
        Invoke-Collector -Name $fn -Label $col.Label -Index $i -Total $collectors.Count -SkipReason ([string]$col.Skip) -Action ([scriptblock]::Create("& $fn"))
    }

    Write-Host "`nCorrelating findings..." -ForegroundColor Cyan
    try { Invoke-Correlation } catch { Write-Warning "Correlation error: $($_.Exception.Message)" }

    Write-Host 'Building reports...' -ForegroundColor Cyan
    $model = New-ReportModel
    $json = ConvertTo-ReportJson $model
    $base = 'ThreatScan_{0}_{1}' -f $env:COMPUTERNAME, $startTime.ToString('yyyyMMdd_HHmmss')
    $paths = [ordered]@{
        Html     = Join-Path $runDir "$base.html"
        Json     = Join-Path $runDir "$base.json"
        Findings = Join-Path $runDir "$base`_Findings.csv"
        IoC      = Join-Path $runDir "$base`_IoC.csv"
        Summary  = Join-Path $runDir "$base`_ExecutiveSummary.md"
    }
    try { Write-Utf8File -Path $paths.Json -Content $json } catch { Write-Warning "JSON export failed: $($_.Exception.Message)" }
    try { Write-HtmlReport -Json $json -Path $paths.Html -Title ("Deep Threat Scan - {0} - {1}" -f $env:COMPUTERNAME, $model.summary.OverallRisk) } catch { Write-Warning "HTML report failed: $($_.Exception.Message)" }
    try { Export-FindingsCsv -Model $model -Path $paths.Findings } catch { Write-Warning "Findings CSV failed: $($_.Exception.Message)" }
    if ($script:State.IocMatches.Count -gt 0) {
        try { $script:State.IocMatches | Export-Csv -LiteralPath $paths.IoC -NoTypeInformation -Encoding UTF8 } catch { Write-Warning "IoC CSV failed: $($_.Exception.Message)" }
    }
    try { Write-Utf8File -Path $paths.Summary -Content (ConvertTo-MarkdownSummary $model) } catch { Write-Warning "Markdown summary failed: $($_.Exception.Message)" }

    Write-ConsoleSummary $model
    if ($transcript) { try { Stop-Transcript | Out-Null } catch {} }

    # Chain of custody: SHA-256 of every output file
    $manifest = Join-Path $runDir 'manifest.sha256.txt'
    $lines = foreach ($f in @(Get-ChildItem -LiteralPath $runDir -File | Where-Object { $_.Name -ne 'manifest.sha256.txt' })) {
        '{0}  {1}' -f (Get-FileSha256 $f.FullName).ToLower(), $f.Name
    }
    Write-Utf8File -Path $manifest -Content (($lines -join "`r`n") + "`r`n")

    Write-Host "`nOutputs ($runDir):" -ForegroundColor Cyan
    foreach ($k in $paths.Keys) { if (Test-Path -LiteralPath $paths[$k]) { Write-Host ("  {0,-9} {1}" -f $k, $paths[$k]) -ForegroundColor White } }
    Write-Host ("  {0,-9} {1}" -f 'Manifest', $manifest) -ForegroundColor White
    Write-Host ("`nScan completed in {0:mm\:ss}" -f ((Get-Date) - $startTime)) -ForegroundColor Green
    if (-not $NoOpen -and (Test-Path -LiteralPath $paths.Html)) { try { Start-Process $paths.Html } catch { Write-Host 'Could not open the HTML report automatically.' -ForegroundColor Yellow } }
}
