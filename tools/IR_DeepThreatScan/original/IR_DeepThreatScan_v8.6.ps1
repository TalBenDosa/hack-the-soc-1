[CmdletBinding()]
param (
    [string]$OutputPath = "C:\SDEMAAuditReport"
)

# --- FIX: Removed 'SilentlyContinue' to show real errors ---
# Set error preferences for the script
# $ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

# Record script start time for execution duration calculation
$startTime = Get-Date

# Initialize a global variable to hold all collected artifacts
$script:collections = @{
    networkConnections   = [System.Collections.Generic.List[object]]::new()
    services             = [System.Collections.Generic.List[object]]::new()
    registryMods         = [System.Collections.Generic.List[object]]::new()
    startupProgs         = [System.Collections.Generic.List[object]]::new()
    scheduledTasks       = [System.Collections.Generic.List[object]]::new()
    failedLogins         = [System.Collections.Generic.List[object]]::new()
    accountChanges       = [System.Collections.Generic.List[object]]::new()
    runningProcesses     = [System.Collections.Generic.List[object]]::new()
    suspiciousFiles      = [System.Collections.Generic.List[object]]::new()
    ransomwareTTPs       = [System.Collections.Generic.List[object]]::new()
    suspiciousPSEvents   = [System.Collections.Generic.List[object]]::new()
    ransomwareFiles      = [System.Collections.Generic.List[object]]::new()
    highVolumeFileEvents = [System.Collections.Generic.List[object]]::new()
    processInjectionEvents = [System.Collections.Generic.List[object]]::new()
    unsignedDrivers      = [System.Collections.Generic.List[object]]::new()
    iocMatches           = [System.Collections.Generic.List[object]]::new()
    processedEventHashes = [System.Collections.Generic.HashSet[string]]::new()
}

# --- Enhanced IoC Database for Full Scan ---
$script:iocDatabase = @{
    # --- NEW: Whitelisted Publishers (for reducing false positives) ---
    whitelistedPublishers = @(
        "Microsoft Corporation",
        "Google LLC",
        "Mozilla Corporation",
        "Oracle Corporation",
        "NVIDIA Corporation",
        "Intel Corporation",
        "Advanced Micro Devices, Inc.",
        "VMware, Inc.",
        "Citrix Systems, Inc.",
        "Amazon Web Services, Inc.",
        "Docker Inc",
        "HashiCorp",
        "The Document Foundation", # LibreOffice
        "VideoLAN", # VLC
        "Wireshark Foundation, Inc."
    )

    # Known Command & Control Infrastructure (verified from threat feeds)
    knownC2IPs = @(
        "45.133.1.145", "185.220.101.182", "194.147.78.163", "46.161.40.109",
        "91.219.236.232", "185.246.188.73", "198.98.51.189", "103.94.157.5"
    )
    
    # Verified malicious domains from recent campaigns
    knownMaliciousDomains = @(
        "tempmail24.org", "guerrillamail.info", "10minutemail.net",
        "temp-mail.io", "mailinator.net", "transfer.sh", "pastebin.com"
    )
    
    # Known malware file hashes (SHA1 - This list is now actively used)
    # (PLACEHOLDER - Add verified malware hashes from your threat intelligence feeds)
    knownMalwareHashes = @(
        # e.g., "ADC83B19E793491B1C61A436C4AB41DD625D81C2" # Sample SHA1
    )
    
    # High-confidence malicious tools (no false positives)
    confirmedMaliciousTools = @(
        "mimikatz.exe", "bloodhound.exe", "sharphound.exe", "rubeus.exe",
        "certify.exe", "seatbelt.exe", "winpeas.exe", "juicypotato.exe",
        "godpotato.exe", "printspoofer.exe", "roguepotato.exe", "sweetpotato.exe",
        "procdump64.exe", "nanodump.exe", "dumpert.exe", "outflank-dumpert.exe"
    )
    
    # Known Malicious Service Names
    knownMaliciousServiceNames = @(
        "PSEXESVC", "BstkSVC", "TeamViewer", "AnyDesk", "Splashtop", "Atera",
        "ScreenConnect", "RemCom_Service", "OpenSSHd", "VNC Server"
    )

    # Suspicious process names in wrong contexts
    processLocationRules = @{
        "svchost.exe" = @("C:\Windows\System32\", "C:\Windows\SysWOW64\")
        "csrss.exe" = @("C:\Windows\System32\")
        "winlogon.exe" = @("C:\Windows\System32\")
        "lsass.exe" = @("C:\Windows\System32\")
        "explorer.exe" = @("C:\Windows\")
        "dwm.exe" = @("C:\Windows\System32\")
        "smss.exe" = @("C:\Windows\System32\")
        "wininit.exe" = @("C:\Windows\System32\")
        "services.exe" = @("C:\Windows\System32\")
    }
    
    # Suspicious Parent-Child Process Relationships
    suspiciousParentChildRules = @(
        @{ Parent = "winword.exe"; Child = "cmd.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> CMD)"; Mitre = "T1566.001" },
        @{ Parent = "winword.exe"; Child = "powershell.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> PowerShell)"; Mitre = "T1566.001" },
        @{ Parent = "excel.exe"; Child = "cmd.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> CMD)"; Mitre = "T1566.001" },
        @{ Parent = "excel.exe"; Child = "powershell.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> PowerShell)"; Mitre = "T1566.001" },
        @{ Parent = "powerpnt.exe"; Child = "cmd.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> CMD)"; Mitre = "T1566.001" },
        @{ Parent = "powerpnt.exe"; Child = "powershell.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> PowerShell)"; Mitre = "T1566.001" },
        @{ Parent = "outlook.exe"; Child = "cmd.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> CMD)"; Mitre = "T1566.001" },
        @{ Parent = "outlook.exe"; Child = "powershell.exe"; Impact = 9; Confidence = 9; Finding = "Suspicious Parent-Child (Office -> PowerShell)"; Mitre = "T1566.001" },
        @{ Parent = "w3wp.exe"; Child = "cmd.exe"; Impact = 10; Confidence = 9; Finding = "Suspicious Parent-Child (Web Server -> Shell)"; Mitre = "T1505.003" },
        @{ Parent = "w3wp.exe"; Child = "powershell.exe"; Impact = 10; Confidence = 9; Finding = "Suspicious Parent-Child (Web Server -> Shell)"; Mitre = "T1505.003" },
        @{ Parent = "w3wp.exe"; Child = "whoami.exe"; Impact = 8; Confidence = 8; Finding = "Suspicious Parent-Child (Web Server Recon)"; Mitre = "T1033" }
    )
    
    # Anomalous Parent Rules (Child process *must* have this parent)
    anomalousParentRules = @{
        "svchost.exe" = "services.exe";
        "lsass.exe" = "wininit.exe";
        "csrss.exe" = "smss.exe";
        "winlogon.exe" = "smss.exe"
    }

    # Verified ransomware indicators
    ransomwareIndicators = @{
        # --- ENHANCED: Added more extensions ---
        extensions = @(
            ".locked", ".encrypted", ".crypto", ".crypt", ".dharma", ".maze", ".ryuk", ".lockbit", ".lockbit3",
            ".conti", ".clop", ".blackcat", ".readme", ".crypted", ".8base", ".lockedz"
        )
        
        # --- ENHANCED: Added more note names ---
        fileNames = @(
            "HOW_TO_DECRYPT.txt", "DECRYPT_INSTRUCTIONS.txt", "README_FOR_DECRYPT.txt", 
            "RECOVER_YOUR_FILES.txt", "README.txt", "HELP_DECRYPT.txt", "!RECOVER_MY_FILES!.txt",
            "How_To_Restore_Your_Files.txt", "How_to_decrypt_files.txt", "decrypt_me.txt"
        )
    }
    
    # --- NEW: Ransomware Registry Indicators ---
    ransomwareRegistryIndicators = @(
        @{ Path = "HKCU:\Control Panel\Desktop"; Key = "Wallpaper"; ValuePattern = ".*(decrypt|recover|readme).*\.(bmp|jpg|png)$" }
    )

    # Suspicious PowerShell patterns (high confidence)
    suspiciousPowerShellPatterns = @(
        "IEX\s*\(\s*New-Object\s+Net\.WebClient\s*\)\.DownloadString",
        "powershell\s+-enc\s+[A-Za-z0-9+/=]{100,}", # Look for long encoded strings
        "System\.Convert\]\:\:FromBase64String",
        "Invoke-Expression.*DownloadString",
        "-WindowStyle\s+Hidden.*-ExecutionPolicy\s+Bypass",
        "Start-Process.*-WindowStyle\s+Hidden",
        "Get-GPO.*(Invoke-GPUpdate|Set-GPPermissions|New-GPLink)", # AD/GPO abuse
        "System\.Reflection\.Assembly\]\:\:Load", # Reflective loading
        "Invoke-Mimikatz", "Invoke-BloodHound", "Invoke-Shellcode"
    )
    
    # Advanced Command Line / LOLBAS Patterns
    advancedCommandLinePatterns = @(
        "certutil.*(-urlcache|-f|-split|-addstore)",
        "bitsadmin.*(/transfer|/create)",
        "reg\.exe\s+(save|export)\s+hklm", # Dumping SAM/SYSTEM hives
        "schtasks\.exe.*(/create|/run).*(cmd|powershell)",
        "wmic\.exe.*process\s+call\s+create",
        "rundll32\.exe\s+javascript:",
        "mshta\.exe\s+(http|vbscript)",
        "InstallUtil\.exe",
        "RegSvcs\.exe",
        "RegAsm\.exe",
        # --- NEW: Check for ransom notes in startup ---
        "(readme|decrypt|recover|how_to).*\.(txt|html)$" 
    )
    
    # Suspicious Registry Keys for Persistence/Hijacking
    suspiciousRegistryKeys = @(
        "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options",
        "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SilentProcessExit",
        "HKCU\Software\Classes\*\shell",
        "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Approved",
        "HKLM\SYSTEM\CurrentControlSet\Control\Lsa\Security Packages"
    )

    # Legitimate software paths (whitelist to reduce false positives)
    legitimatePaths = @(
        "C:\Program Files\",
        "C:\Program Files (x86)\",
        "C:\Windows\System32\",
        "C:\Windows\SysWOW64\",
        "C:\Windows\WinSxS\"
    )
    
    # Port-based indicators with context
    suspiciousPortActivity = @{
        4444 = @{ Description = "Metasploit Default"; Impact = 9; Confidence = 5; RequiredContext = "External" }
        5555 = @{ Description = "Common Backdoor"; Impact = 8; Confidence = 5; RequiredContext = "External" }
        6666 = @{ Description = "IRC/Backdoor"; Impact = 7; Confidence = 5; RequiredContext = "External" }
        31337 = @{ Description = "Back Orifice"; Impact = 9; Confidence = 8; RequiredContext = "Any" }
        12345 = @{ Description = "NetBus"; Impact = 9; Confidence = 8; RequiredContext = "Any" }
        1337 = @{ Description = "Elite/Hacker Port"; Impact = 6; Confidence = 2; RequiredContext = "External" }
        8080 = @{ Description = "Common Alt-Web/C2"; Impact = 5; Confidence = 2; RequiredContext = "External" }
        8443 = @{ Description = "Common Alt-Web/C2"; Impact = 5; Confidence = 2; RequiredContext = "External" }
    }

    # --- ENHANCED: Ransomware TTP commands (regex patterns) ---
    ransomwareTTPs = @(
        'vssadmin\s+delete\s+shadows',
        'wbadmin\s+delete\s+catalog',
        'bcdedit\s+/set\s+\{.*\}\s+bootstatuspolicy\s+ignoreallfailures',
        'bcdedit\s+/set\s+\{.*\}\s+recoveryenabled\s+no',
        'wevtutil\s+cl\s+(Security|System|Application)',
        'net\s+stop\s+(SQL|VSS|MSSQL|Exchange|BackupExec)',
        'fsutil\s+reparsepoint\s+delete', # NEW
        'taskkill\s+/f\s+/im\s+(sql|oracle|word|excel|powerpnt|winword|outlook|access|visio|onenote|msaccess|teamviewer|anydesk|veeam)'
    )
}

# --- Helper Functions ---

function Get-SafeExecutablePath {
    param([string]$CommandLine)
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return "" }
    try {
        $cleanValue = $CommandLine.Trim()
        if ($cleanValue.StartsWith('"')) {
            $endQuote = $cleanValue.IndexOf('"', 1)
            if ($endQuote -gt 0) { $cleanValue = $cleanValue.Substring(1, $endQuote - 1) }
        } else {
            $spaceIndex = $cleanValue.IndexOf(' ')
            if ($spaceIndex -gt 0) { $cleanValue = $cleanValue.Substring(0, $spaceIndex) }
        }
        $invalidChars = [System.IO.Path]::GetInvalidPathChars()
        foreach ($char in $invalidChars) { if ($cleanValue.Contains($char)) { return "" } }
        if ($cleanValue -match '[<>"|?*]') { return "" }
        return $cleanValue
    } catch { return "" }
}

function Get-FileSignature {
    param([string]$FilePath)
    try {
        $sig = Get-AuthenticodeSignature -FilePath $FilePath -ErrorAction Stop
        if ($sig.Status -eq "Valid") {
            # --- ENHANCED: Return publisher for whitelisting ---
            return "Valid (Publisher: $($sig.SignerCertificate.Subject))"
        } else {
            return $sig.Status.ToString() # e.g., "HashMismatch", "UnknownError", "UntrustedRoot"
        }
    } catch {
        if ($_.Exception.Message -like "*file was not signed*") {
            return "NotSigned"
        }
        return "AccessDenied"
    }
}

function Get-FileEntropy {
    param([string]$FilePath)
    try {
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        if ($bytes.Length -eq 0) { return 0 } # Handle empty files
        $byteCounts = $bytes | Group-Object -AsHashTable -NoElement
        $entropy = 0
        $totalBytes = $bytes.Length
        foreach ($byte in $byteCounts.Keys) {
            $probability = $byteCounts[$byte] / $totalBytes
            $entropy -= $probability * [Math]::Log($probability, 2)
        }
        return [Math]::Round($entropy, 2)
    } catch {
        return -1 # Access Denied or other error
    }
}

# --- IoC Detection Functions ---

function Test-AdvancedIoC {
    param(
        [string]$Value,
        [string]$Type,
        [string]$Context = "",
        [string]$SourceCategory = ""
    )
    
    $iocMatches = @()
    if ([string]::IsNullOrWhiteSpace($Value)) { return $iocMatches }
    
    try {
        switch ($Type) {
            "IP" {
                if ($script:iocDatabase.knownC2IPs -contains $Value) {
                    $iocMatches += [PSCustomObject]@{
                        IoC = $Value; Type = "Known C2 Infrastructure"
                        Impact = 10; Confidence = 10 # V-High, V-High
                        Description = "IP address associated with confirmed command & control infrastructure"
                        ThreatIntel = "C2 Tracker Database"; Context = $Context; Category = $SourceCategory
                    }
                }
            }
            "Domain" {
                foreach ($domain in $script:iocDatabase.knownMaliciousDomains) {
                    if ($Value -like "*$([regex]::Escape($domain))") {
                        $iocMatches += [PSCustomObject]@{
                            IoC = $Value; Type = "Known Malicious Domain"
                            Impact = 8; Confidence = 10 # High, V-High
                            Description = "Domain confirmed as malicious in threat intelligence feeds"
                            ThreatIntel = "Verified Threat Feed"; Context = $Context; Category = $SourceCategory
                        }
                    }
                }
            }
            "Hash" {
                if ($script:iocDatabase.knownMalwareHashes -contains $Value.ToUpper()) {
                    $iocMatches += [PSCustomObject]@{
                        IoC = $Value; Type = "Known Malware Hash"
                        Impact = 10; Confidence = 10 # V-High, V-High
                        Description = "File hash matches confirmed malware sample"
                        ThreatIntel = "Malware Database"; Context = $Context; Category = $SourceCategory
                    }
                }
            }
            "Process" {
                $processName = [System.IO.Path]::GetFileNameWithoutExtension($Value).ToLower()
                if ("$processName.exe" -in $script:iocDatabase.confirmedMaliciousTools) {
                    $iocMatches += [PSCustomObject]@{
                        IoC = $Value; Type = "Known Malicious Tool"
                        Impact = 10; Confidence = 9 # V-High, High
                        Description = "Process matches confirmed penetration testing/malicious tool"
                        ThreatIntel = "Security Tool Database"; Context = $Context; Category = $SourceCategory
                    }
                }
            }
            # --- NEW: Service Name Check ---
            "ServiceName" {
                if ($script:iocDatabase.knownMaliciousServiceNames -contains $Value) {
                    $iocMatches += [PSCustomObject]@{
                        IoC = $Value; Type = "Known Malicious Service"
                        Impact = 9; Confidence = 8 # V-High, High
                        Description = "Service name is associated with remote access tools or malware"
                        ThreatIntel = "Malicious Service Database"; Context = $Context; Category = $SourceCategory
                    }
                }
            }
            "FilePath" {
                $fileName = ""
                $safePath = Get-SafeExecutablePath -CommandLine $Value
                if ($safePath) {
                    $fileName = [System.IO.Path]::GetFileName($safePath).ToLower()
                    if ($script:iocDatabase.processLocationRules.ContainsKey($fileName)) {
                        $legitimateLocations = $script:iocDatabase.processLocationRules[$fileName]
                        $isLegitimateLocation = $false
                        foreach ($legitPath in $legitimateLocations) {
                            if ($safePath.ToLower().StartsWith($legitPath.ToLower())) {
                                $isLegitimateLocation = $true; break
                            }
                        }
                        if (-not $isLegitimateLocation) {
                            $iocMatches += [PSCustomObject]@{
                                IoC = $Value; Type = "Process Impersonation"
                                Impact = 9; Confidence = 8 # V-High, High
                                Description = "System process '$fileName' executing from suspicious location"
                                ThreatIntel = "Process Location Analysis"; Context = $Context; Category = $SourceCategory
                            }
                        }
                    }
                    if ("$fileName" -in $script:iocDatabase.confirmedMaliciousTools) {
                        $iocMatches += [PSCustomObject]@{
                            IoC = $Value; Type = "Known Malicious Tool"
                            Impact = 10; Confidence = 9 # V-High, High
                            Description = "File matches confirmed penetration testing/malicious tool: $fileName"
                            ThreatIntel = "Security Tool Database"; Context = $Context; Category = $SourceCategory
                        }
                    }
                }
            }
            "CommandLine" {
                foreach ($pattern in $script:iocDatabase.suspiciousPowerShellPatterns) {
                    if ($Value -match $pattern) {
                        $iocMatches += [PSCustomObject]@{
                            IoC = $Value; Type = "Suspicious PowerShell Pattern"
                            Impact = 8; Confidence = 8 # High, High
                            Description = "Command line contains pattern associated with malicious PowerShell usage"
                            ThreatIntel = "PowerShell Attack Patterns"; Context = $Context; Category = $SourceCategory
                        }; break
                    }
                }
                # --- NEW: Check advanced command line patterns ---
                foreach ($pattern in $script:iocDatabase.advancedCommandLinePatterns) {
                    if ($Value -match $pattern) {
                        # --- ENHANCED: Check for ransom note in command line ---
                        $type = "Suspicious LOLBAS Pattern"
                        $desc = "Command line contains pattern associated with Living-off-the-Land (LOLBAS) techniques"
                        $impact = 9; $conf = 8
                        if ($pattern -like "*readme*") {
                            $type = "Ransom Note in Command Line"
                            $desc = "Command line contains a reference to a ransom note (e.g., in a startup key)"
                            $impact = 10; $conf = 9
                        }
                        
                        $iocMatches += [PSCustomObject]@{
                            IoC = $Value; Type = $type
                            Impact = $impact; Confidence = $conf
                            Description = $desc
                            ThreatIntel = "LOLBAS Attack Patterns"; Context = $Context; Category = $SourceCategory
                        }; break
                    }
                }
                if ($Value -match '(http|https|ftp)\://') {
                     $iocMatches += [PSCustomObject]@{
                        IoC = $Value; Type = "URL in Command Line"
                        Impact = 7; Confidence = 5 # High, Moderate
                        Description = "Command line contains a URL, potential download cradle"
                        ThreatIntel = "Heuristic"; Context = $Context; Category = $SourceCategory
                    }
                }
            }
            # --- NEW: Registry Key Check ---
            "RegistryKey" {
                 foreach ($key in $script:iocDatabase.suspiciousRegistryKeys) {
                    if ($Value -like "$key*") {
                        $iocMatches += [PSCustomObject]@{
                            IoC = $Value; Type = "Suspicious Registry Key"
                            Impact = 9; Confidence = 8 # V-High, High
                            Description = "Registry key is commonly used for persistence or hijacking (e.g., IFEO)"
                            ThreatIntel = "Registry Persistence DB"; Context = $Context; Category = $SourceCategory
                        }
                    }
                }
            }
            "Port" {
                if ($script:iocDatabase.suspiciousPortActivity.ContainsKey([int]$Value)) {
                    $portInfo = $script:iocDatabase.suspiciousPortActivity[[int]$Value]
                    $shouldFlag = $false
                    if ($portInfo.RequiredContext -eq "Any") { $shouldFlag = $true }
                    elseif ($portInfo.RequiredContext -eq "External" -and $Context -eq "External") { $shouldFlag = $true }
                    
                    if ($shouldFlag) {
                        $iocMatches += [PSCustomObject]@{
                            IoC = $Value; Type = "Suspicious Port Activity"
                            Impact = $portInfo.Impact; Confidence = $portInfo.Confidence
                            Description = $portInfo.Description; ThreatIntel = "Port Intelligence Database"
                            Context = $Context; Category = $SourceCategory
                        }
                    }
                }
            }
        }
    } catch {
        Write-Warning "IoC check failed for '$Value' (Type: $Type): $_"
    }
    
    foreach ($match in $iocMatches) {
        $script:collections.iocMatches.Add($match)
    }
    return $iocMatches
}

# --- Enhanced Data Collection Functions ---

# --- LOG ANALYSIS FUNCTIONS ---

# --- NEW FUNCTION: Check for Process Injection (Sysmon EID 8) ---
function Get-ProcessInjectionEvents {
    Write-Host "  Scanning Sysmon logs for process injection (EID 8)..." -ForegroundColor Cyan
    $timeWindowMinutes = 1440 # 24 hours
    $startTime = (Get-Date).AddMinutes(-$timeWindowMinutes)

    try {
        $filter = @{
            LogName   = 'Microsoft-Windows-Sysmon/Operational'
            ID        = 8 # Sysmon EID 8: CreateRemoteThread
            StartTime = $startTime
        }
        
        $events = Get-WinEvent -FilterHashtable $filter -ErrorAction Stop
        
        if ($events.Count -eq 0) {
            Write-Host "  No Sysmon EID 8 (CreateRemoteThread) events found in the last $timeWindowMinutes minutes."
            return
        }
        
        foreach ($event in $events) {
            $sourceImage = $event.Properties[4].Value
            $targetImage = $event.Properties[7].Value
            
            # Filter out common FPs like lsass->lsass or svchost->svchost
            if ($sourceImage -eq $targetImage) { continue }
            
            # Filter FPs from AV, monitoring, etc.
            if ($sourceImage -like "*CrowdStrike*" -or $sourceImage -like "*Defender*") { continue }
            
            $impact = 10; $confidence = 8; $finding = "Process Injection Detected (Sysmon EID 8)"
            if ($sourceImage -like "*powershell.exe" -or $sourceImage -like "*wscript.exe" -or $sourceImage -like "*cscript.exe") {
                $finding = "Script-based Process Injection Detected (Sysmon EID 8)"
                $confidence = 9
            }

            $script:collections.processInjectionEvents.Add([PSCustomObject]@{
                TimeCreated   = $event.TimeCreated
                SourceProcess = $sourceImage
                TargetProcess = $targetImage
                SourcePID     = $event.Properties[1].Value
                TargetPID     = $event.Properties[6].Value
                SourceLog     = "Sysmon EID 8"
                Impact        = $impact; Confidence = $confidence
                MitreReference = "T1055"; Finding = $finding
            })
        }

    } catch {
        Write-Warning "Could not scan Sysmon EID 8 logs. (Ensure Sysmon is installed and logging EID 8)"
    }
}

function Get-HighVolumeFileEvents {
    Write-Host "  Scanning Sysmon logs for mass file creation (ransomware behavior)..." -ForegroundColor Cyan
    $threshold = 100 # Number of file creations in the time window to trigger an alert
    $timeWindowMinutes = 60
    $startTime = (Get-Date).AddMinutes(-$timeWindowMinutes)

    try {
        $filter = @{
            LogName   = 'Microsoft-Windows-Sysmon/Operational'
            ID        = 11 # Sysmon EID 11: FileCreate
            StartTime = $startTime
        }
        
        $events = Get-WinEvent -FilterHashtable $filter -ErrorAction Stop
        
        if ($events.Count -eq 0) {
            Write-Host "  No Sysmon EID 11 (FileCreate) events found in the last $timeWindowMinutes minutes."
            return
        }

        # Group events by ProcessId and Image (process path)
        $groupedEvents = $events | Group-Object -Property @($_.Properties[1].Value, $_.Properties[4].Value) # Group by ProcessID and Image
        
        foreach ($group in $groupedEvents) {
            if ($group.Count -gt $threshold) {
                $processId = $group.Group[0].Properties[1].Value
                $imagePath = $group.Group[0].Properties[4].Value
                
                $script:collections.highVolumeFileEvents.Add([PSCustomObject]@{
                    ProcessPath   = $imagePath
                    ProcessID     = $processId
                    FileEventCount = $group.Count
                    TimeWindowMinutes = $timeWindowMinutes
                    SourceLog     = "Sysmon EID 11"
                    Impact        = 10; Confidence = 8 # V-High Impact, High Confidence
                    MitreReference = "T1486"; Finding = "Potential Mass File Encryption (Ransomware)"
                })
            }
        }

    } catch {
        Write-Warning "Could not scan Sysmon EID 11 logs. (Ensure Sysmon is installed and logging EID 11)"
    }
}

function Get-RansomwareTTPs {
    Write-Host "  Scanning event logs for ransomware TTPs..." -ForegroundColor Cyan
    $regexPattern = ($script:iocDatabase.ransomwareTTPs -join '|')
    
    # 1. Check PowerShell Event Logs (EID 4104)
    try {
        Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; ID=4104} -MaxEvents 1000 | ForEach-Object {
            $eventKey = "$($_.ProviderName):$($_.RecordId)"
            if ($script:processedEventHashes.Contains($eventKey)) { continue }
            $scriptBlock = $_.Properties[0].Value
            if ($scriptBlock -match $regexPattern) {
                $script:collections.ransomwareTTPs.Add([PSCustomObject]@{
                    TimeCreated   = $_.TimeCreated; MatchedString = $Matches[0]; FullCommand = $scriptBlock
                    SourceLog     = "PowerShell EID 4104"
                    Impact        = 10; Confidence = 9 # V-High Impact, High Confidence
                    MitreReference = "T1490"; Finding = "Ransomware TTP (PowerShell)"
                })
                $script:processedEventHashes.Add($eventKey) | Out-Null
            }
        }
    } catch { Write-Warning "Could not scan PowerShell 4104 logs. (Ensure Script Block Logging is enabled)" }

    # 2. Check Security Event Logs (EID 4688)
    try {
        Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4688} -MaxEvents 2000 | ForEach-Object {
            $eventKey = "$($_.ProviderName):$($_.RecordId)"
            if ($script:processedEventHashes.Contains($eventKey)) { continue }
            $commandLine = $_.Properties[5].Value
            if ($commandLine -match $regexPattern) {
                $script:collections.ransomwareTTPs.Add([PSCustomObject]@{
                    TimeCreated   = $_.TimeCreated; MatchedString = $Matches[0]; FullCommand = $commandLine
                    SourceLog     = "Security EID 4688"
                    Impact        = 10; Confidence = 9 # V-High Impact, High Confidence
                    MitreReference = "T1490"; Finding = "Ransomware TTP (Process)"
                })
                $script:processedEventHashes.Add($eventKey) | Out-Null
            }
        }
    } catch { Write-Warning "Could not scan Security 4688 logs. (Ensure Process Creation Auditing is enabled)" }

    # 3. Check System Event Logs (EID 7040/7045)
    try {
        Get-WinEvent -FilterHashtable @{LogName='System'; ID=@(7040, 7045)} -MaxEvents 500 | ForEach-Object {
            $eventKey = "$($_.ProviderName):$($_.RecordId)"
            if ($script:processedEventHashes.Contains($eventKey)) { continue }
            $commandLine = $_.Message
            if ($commandLine -match $regexPattern) {
                $script:collections.ransomwareTTPs.Add([PSCustomObject]@{
                    TimeCreated   = $_.TimeCreated; MatchedString = $Matches[0]; FullCommand = $commandLine
                    SourceLog     = "System EID 7040/7045"
                    Impact        = 10; Confidence = 9 # V-High Impact, High Confidence
                    MitreReference = "T1543.003"; Finding = "Ransomware TTP (Service)"
                })
                $script:processedEventHashes.Add($eventKey) | Out-Null
            }
        }
    } catch { Write-Warning "Could not scan System 7040/7045 logs." }
}

function Get-SuspiciousPSTranscripts {
    Write-Host "  Scanning PowerShell script block logs (EID 4104) for malware..." -ForegroundColor Cyan
    $regexPattern = ($script:iocDatabase.suspiciousPowerShellPatterns -join '|')
    
    try {
        Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-PowerShell/Operational'; ID=4104} -MaxEvents 1000 | ForEach-Object {
            $eventKey = "$($_.ProviderName):$($_.RecordId)"
            if ($script:processedEventHashes.Contains($eventKey)) { continue }
            $scriptBlock = $_.Properties[0].Value
            $timeCreated = $_.TimeCreated
            
            if ($scriptBlock -match $regexPattern) {
                $finding = "Suspicious PowerShell Script Block"
                $impact = 8; $confidence = 8; $mitre = "T1059.001"
                
                if ($scriptBlock -match "Invoke-Mimikatz") {
                    $finding = "Credential Dumping (Mimikatz)"; $impact = 10; $confidence = 9; $mitre = "T1003"
                } elseif ($scriptBlock -like "*FromBase64String*") {
                    $finding = "Obfuscated PowerShell (Base64)"; $impact = 9; $confidence = 8
                }

                $script:collections.suspiciousPSEvents.Add([PSCustomObject]@{
                    TimeCreated   = $timeCreated; MatchedString = $Matches[0]; ScriptBlock = $scriptBlock
                    SourceLog     = "PowerShell EID 4104"
                    Impact        = $impact; Confidence = $confidence
                    MitreReference = $mitre; Finding = $finding
                })
                $script:processedEventHashes.Add($eventKey) | Out-Null
            }
        }
    } catch {
        Write-Warning "Unable to collect PowerShell EID 4104 (Script Block Logging) events. Ensure it is enabled."
    }
}

function Get-FailedLogins {
    Write-Host "  Collecting failed login attempts (Security EID 4625)..." -ForegroundColor Cyan
    try {
        Get-WinEvent -FilterHashtable @{LogName = 'Security'; ID = 4625} -MaxEvents 250 | ForEach-Object {
            $sourceIP = $_.Properties[19].Value
            $iocResults = @()
            if ($sourceIP -and $sourceIP -ne "-" -and $sourceIP -ne "127.0.0.1") {
                $iocResults += Test-AdvancedIoC -Value $sourceIP -Type "IP" -Context "Failed Login" -SourceCategory "Authentication"
            }
            
            $impact = 5; $confidence = 2; $finding = "Failed Login Attempt"
            if ($iocResults.Count -gt 0) {
                $impact = $iocResults[0].Impact
                $confidence = $iocResults[0].Confidence
                $finding = "IoC Match: Failed Login"
            }
            
            $script:collections.failedLogins.Add([PSCustomObject]@{
                TimeCreated    = $_.TimeCreated; TargetUserName = $_.Properties[5].Value; SourceIP = $sourceIP
                LogonType      = $_.Properties[10].Value; FailureReason  = $_.Properties[8].Value
                IoC_Count      = $iocResults.Count
                IoC_Types      = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
                Impact         = $impact; Confidence = $confidence
                MitreReference = "T1110"; Finding = $finding
            })
        }
    } catch { Write-Warning "Unable to collect failed login events" }
}

function Get-AccountChanges {
    Write-Host "  Collecting account changes (Security EID 47xx)..." -ForegroundColor Cyan
    try {
        Get-WinEvent -FilterHashtable @{LogName = 'Security'; ID = @(4720, 4726, 4732, 4728)} -MaxEvents 100 | ForEach-Object {
            $type = switch ($_.Id) {
                4720 { "User Account Created" }
                4726 { "User Account Deleted" }
                4732 { "Member Added to Local Group" }
                4728 { "Member Added to Global Group" }
            }
            $script:collections.accountChanges.Add([PSCustomObject]@{
                TimeCreated    = $_.TimeCreated; EventId = $_.Id; AccountName = $_.Properties[0].Value
                ChangeType     = $type; PerformedBy = $_.Properties[4].Value
                IoC_Count      = 0; IoC_Types = ""
                Impact         = 9; Confidence = 8 # V-High Impact, High Confidence
                MitreReference = "T1136"; Finding = "Account Modification"
            })
        }
    } catch { Write-Warning "Unable to collect account change events" }
}

# --- SYSTEM STATE FUNCTIONS ---

function Get-NetworkConnections {
    Write-Host "  Collecting active network connections..." -ForegroundColor Cyan
    Get-NetTCPConnection | Where-Object { 
        $_.State -eq 'Established' -and $_.LocalAddress -notin @('127.0.0.1', '::1')
    } | ForEach-Object {
        $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        $isExternal = -not ($_.RemoteAddress -match "^192\.168\." -or $_.RemoteAddress -match "^10\." -or $_.RemoteAddress -match "^172\.(1[6-9]|2[0-9]|3[01])\." -or $_.RemoteAddress -eq "::1")
        $contextType = if ($isExternal) { "External" } else { "Internal" }
        
        $iocResults = @()
        $iocResults += Test-AdvancedIoC -Value $_.RemoteAddress -Type "IP" -Context $contextType -SourceCategory "Network"
        $iocResults += Test-AdvancedIoC -Value $_.RemotePort -Type "Port" -Context $contextType -SourceCategory "Network"
        if ($process) {
            $iocResults += Test-AdvancedIoC -Value $process.Name -Type "Process" -Context "Network Connection" -SourceCategory "Network"
            if ($process.Path) {
                $iocResults += Test-AdvancedIoC -Value $process.Path -Type "FilePath" -Context "Network Process" -SourceCategory "Network"
            }
        }
        
        $impact = 1; $confidence = 1; $finding = "Network Connection"
        if ($iocResults.Count -gt 0) {
            # Get the highest impact/confidence from all matches
            $impact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
            $confidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
            $finding = "IoC Match: Network Connection"
        }

        $script:collections.networkConnections.Add([PSCustomObject]@{
            LocalAddress    = $_.LocalAddress; LocalPort = $_.LocalPort; RemoteAddress = $_.RemoteAddress; RemotePort = $_.RemotePort
            ProcessName     = if($process) { $process.Name } else { "Unknown" }
            ProcessPath     = if($process) { $process.Path } else { "Unknown" }
            ProcessID       = $_.OwningProcess; IsExternal = $isExternal
            IoC_Count       = $iocResults.Count
            IoC_Types       = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
            Impact          = $impact; Confidence = $confidence
            MitreReference  = "T1049"; Finding = $finding
        })
    }
}

function Get-ServiceAnalysis {
    Write-Host "  Collecting and analyzing services..." -ForegroundColor Cyan
    Get-WmiObject Win32_Service | ForEach-Object {
        $iocResults = @()
        if ($_.PathName) {
            $iocResults += Test-AdvancedIoC -Value $_.PathName -Type "FilePath" -Context "Service Executable" -SourceCategory "Services"
            $iocResults += Test-AdvancedIoC -Value $_.PathName -Type "CommandLine" -Context "Service Command" -SourceCategory "Services"
        }
        $iocResults += Test-AdvancedIoC -Value $_.Name -Type "Process" -Context "Service Name" -SourceCategory "Services"
        # --- NEW: Check Service Name ---
        $iocResults += Test-AdvancedIoC -Value $_.Name -Type "ServiceName" -Context "Service Name" -SourceCategory "Services"
        
        $suspiciousPath = $_.PathName -and ($_.PathName -notlike "*system32*" -and $_.PathName -notlike "*Program Files*")
        $autoNotRunning = $_.StartMode -eq 'Auto' -and $_.State -ne 'Running'

        $impact = 1; $confidence = 1; $finding = "Normal Service"
        if ($iocResults.Count -gt 0) {
            $impact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
            $confidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
            $finding = "IoC Match: Service"
        } elseif ($suspiciousPath) {
            $impact = 8; $confidence = 5; $finding = "Service with Suspicious Path"
        } elseif ($autoNotRunning) {
            $impact = 5; $confidence = 2; $finding = "Auto Service Not Running"
        }
        
        $script:collections.services.Add([PSCustomObject]@{
            ServiceName     = $_.Name; DisplayName = $_.DisplayName; StartMode = $_.StartMode
            ServicePath     = $_.PathName; State = $_.State; StartName = $_.StartName
            IoC_Count       = $iocResults.Count
            IoC_Types       = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
            Impact          = $impact; Confidence = $confidence
            MitreReference  = "T1543.003"; Finding = $finding
        })
    }
}

function Get-RunningProcesses {
    Write-Host "  Collecting and analyzing running processes..." -ForegroundColor Cyan
    $processCimData = Get-CimInstance Win32_Process | Group-Object -AsHashTable -Property ProcessId
    
    # --- NEW: Create a Process ID -> Name lookup table for fast parent lookup ---
    $processLookup = @{}
    Get-Process | ForEach-Object {
        try { $processLookup[$_.Id] = $_.ProcessName.ToLower() + ".exe" } catch {}
    }
    # --- End New ---

    Get-Process | ForEach-Object {
        $proc = $_; $procInfo = $null; $commandLine = "Unknown"; $parentPID = "Unknown"
        $signature = "NotChecked"; $missingInfo = $false; $hasPath = $false
        $parentName = "Unknown" # NEW

        try {
            if ($processCimData.ContainsKey($proc.Id)) {
                $procInfo = $processCimData[$proc.Id][0]
                $commandLine = $procInfo.CommandLine; $parentPID = $procInfo.ParentProcessId
                # --- NEW: Get parent name from our lookup table ---
                if ($processLookup.ContainsKey($parentPID)) {
                    $parentName = $processLookup[$parentPID]
                }
                # --- End New ---
            }
            $hasPath = -not [string]::IsNullOrWhiteSpace($proc.Path)
            if ($hasPath) {
                $missingInfo = [string]::IsNullOrWhiteSpace($proc.CompanyName) -and [string]::IsNullOrWhiteSpace($proc.Description)
            } else {
                $missingInfo = $true
            }
        } catch {}
        
        $iocResults = @()
        $iocResults += Test-AdvancedIoC -Value $proc.ProcessName -Type "Process" -Context "Running Process" -SourceCategory "Processes"
        if ($hasPath) {
            $iocResults += Test-AdvancedIoC -Value $proc.Path -Type "FilePath" -Context "Process Executable" -SourceCategory "Processes"
        }
        if ($commandLine -and $commandLine -ne "Unknown") {
            $iocResults += Test-AdvancedIoC -Value $commandLine -Type "CommandLine" -Context "Process Command Line" -SourceCategory "Processes"
        }
        
        # Determine finding and severity
        $impact = 1; $confidence = 1; $finding = "Running Process"; $mitre = "T1057"
        $currentProcessName = $proc.ProcessName.ToLower() + ".exe"

        # --- Parent-Child Relationship Analysis ---
        $parentChildRuleMatch = $false
        # 1. Check for known-bad relationships
        foreach ($rule in $script:iocDatabase.suspiciousParentChildRules) {
            if ($parentName -eq $rule.Parent -and $currentProcessName -eq $rule.Child) {
                $impact = $rule.Impact
                $confidence = $rule.Confidence
                $finding = $rule.Finding
                $mitre = $rule.Mitre
                $parentChildRuleMatch = $true
                break
            }
        }
        
        # 2. Check for anomalous parents (if no bad relationship already found)
        if (-not $parentChildRuleMatch -and $parentName -ne "Unknown") {
            if ($script:iocDatabase.anomalousParentRules.ContainsKey($currentProcessName)) {
                $expectedParent = $script:iocDatabase.anomalousParentRules[$currentProcessName]
                if ($parentName -ne $expectedParent -and $parentName -ne "system" -and $parentName -ne "idle") {
                     # Check for svchost, which can also be parented by a parent svchost (services.exe -> svchost.exe -> svchost.exe)
                    if ($currentProcessName -eq "svchost.exe" -and $parentName -eq "svchost.exe") {
                        # This is likely OK, do nothing
                    } else {
                        $impact = 8
                        $confidence = 8
                        $finding = "Anomalous Parent: $currentProcessName parented by $parentName (Expected $expectedParent)"
                        $mitre = "T1134.004"
                        $parentChildRuleMatch = $true
                    }
                }
            }
        }
        # --- End Parent-Child Analysis ---

        # --- ENHANCED: Heuristics (only apply if no P-C rule matched) ---
        if (-not $parentChildRuleMatch) {
            $suspiciousLocation = $false
            if ($hasPath) {
                $isLegitimate = $false
                foreach ($legitPath in $script:iocDatabase.legitimatePaths) {
                    if ($proc.Path.ToLower().StartsWith($legitPath.ToLower())) { $isLegitimate = $true; break }
                }
                $suspiciousLocation = -not $isLegitimate
            }
            
            # --- NEW: Get signature for all non-standard processes ---
            if ($hasPath -and $suspiciousLocation) {
                $signature = Get-FileSignature -FilePath $proc.Path
            }
            
            # --- NEW: Check against whitelisted publishers ---
            $isWhitelisted = $false
            if ($signature -like "Valid*") {
                foreach ($pub in $script:iocDatabase.whitelistedPublishers) {
                    if ($signature -like "*$pub*") {
                        $isWhitelisted = $true; break
                    }
                }
            }
            
            if ($iocResults.Count -gt 0) {
                $impact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
                $confidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
                $finding = "IoC Match: Running Process"
            } 
            # --- NEW: Unsigned process in system dir (classic) ---
            elseif ($hasPath -and ($proc.Path -like "C:\Windows\System32\*" -or $proc.Path -like "C:\Windows\SysWOW64\*") -and $signature -eq 'NotSigned') {
                 $impact = 10; $confidence = 9; $finding = "Untrusted/Unsigned Process in System Directory"; $mitre = "T1036.001"
            }
            # --- NEW: Unsigned process in user space (suspicious) ---
            elseif ($suspiciousLocation -and $signature -eq 'NotSigned' -and -not $isWhitelisted) {
                 $impact = 8; $confidence = 8; $finding = "Unsigned Process in Suspicious Location"; $mitre = "T1036.005"
            }
            # --- MODIFIED: Reduced FP by checking whitelist ---
            elseif ($suspiciousLocation -and $missingInfo -and -not $isWhitelisted) {
                $impact = 8; $confidence = 5; $finding = "Suspicious Process (Bad Location + No Info)"; $mitre = "T1036.005"
            } elseif ($suspiciousLocation -and -not $isWhitelisted) {
                $impact = 5; $confidence = 2; $finding = "Process in Suspicious Location"
            } elseif ($missingInfo -and -not $isWhitelisted) {
                $impact = 5; $confidence = 2; $finding = "Process Missing Metadata (or Access Denied)"
            }
        }
        # --- End Enhanced Heuristics ---

        $script:collections.runningProcesses.Add([PSCustomObject]@{
            ProcessName    = $proc.ProcessName; ProcessID = $proc.Id; ParentPID = $parentPID
            ParentName     = $parentName # NEW
            ExecutablePath = if ($hasPath) { $proc.Path } else { "Access Denied" }
            Description    = if ($hasPath) { $proc.Description } else { "Access Denied" }
            CompanyName    = if ($hasPath) { $proc.CompanyName } else { "Access Denied" }
            CommandLine    = $commandLine; SignatureStatus = $signature; MissingMetadata = $missingInfo
            IoC_Count      = $iocResults.Count
            IoC_Types      = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
            Impact         = $impact; Confidence = $confidence
            MitreReference = $mitre; Finding = $finding # Updated Mitre/Finding
        })
    }
}

# --- PERSISTENCE FUNCTIONS ---

function Get-RegistryModifications {
    Write-Host "  Collecting registry autostart entries..." -ForegroundColor Cyan
    # Combine standard run keys with new suspicious keys
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
        "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Run"
    )
    
    # --- NEW: Scan additional suspicious keys ---
    foreach ($keyPath in $script:iocDatabase.suspiciousRegistryKeys) {
        if (Test-Path $keyPath) { $regPaths += $keyPath }
    }
    # --- End New Scan ---

    foreach ($path in $regPaths) {
        # Check if the path is a key that might contain subkeys (like IFEO)
        if ($path -like "*Image File Execution Options*" -or $path -like "*SilentProcessExit*") {
            # Recurse one level to get debugger/monitor settings
            Get-ChildItem -Path $path -ErrorAction SilentlyContinue | ForEach-Object {
                $subKey = $_
                $subKey.GetValueNames() | ForEach-Object {
                    $valueName = $_
                    $valueData = $subKey.GetValue($valueName)
                    $fullKeyPath = "$($subKey.Name)\$valueName"

                    $iocResults = @()
                    $iocResults += Test-AdvancedIoC -Value $fullKeyPath -Type "RegistryKey" -Context "Registry Hijack Key" -SourceCategory "Registry"
                    $iocResults += Test-AdvancedIoC -Value $valueData -Type "FilePath" -Context "Registry Hijack Value" -SourceCategory "Registry"
                    
                    $impact = 9; $confidence = 8; $finding = "Suspicious Registry Entry (IFEO/Hijack)"
                    if ($iocResults.Count -gt 0) {
                        $impact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
                        $confidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
                        $finding = "IoC Match: Registry Hijack"
                    }

                    $script:collections.registryMods.Add([PSCustomObject]@{
                        RegistryHive   = if ($path -like "HKLM:*") { "HKLM" } else { "HKCU" }
                        RegistryPath   = $subKey.Name; KeyName = $valueName; Value = $valueData
                        IoC_Count      = $iocResults.Count
                        IoC_Types      = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
                        Impact         = $impact; Confidence = $confidence
                        MitreReference = "T1546.012"; Finding = $finding
                    })
                }
            }
        } else {
            # Original scan for Run keys
            Get-ItemProperty -Path $path -ErrorAction SilentlyContinue | Select-Object * -ExcludeProperty PS* | ForEach-Object {
                $_.PSObject.Properties | Where-Object { $_.Name -notlike "PS*" -and $_.Name -ne "(default)" } | ForEach-Object {
                    $iocResults = @()
                    $iocResults += Test-AdvancedIoC -Value $_.Value -Type "FilePath" -Context "Registry Autostart" -SourceCategory "Registry"
                    $iocResults += Test-AdvancedIoC -Value $_.Value -Type "CommandLine" -Context "Registry Command" -SourceCategory "Registry"
                    $iocResults += Test-AdvancedIoC -Value $path -Type "RegistryKey" -Context "Registry Autostart" -SourceCategory "Registry"

                    $impact = 8; $confidence = 5; $finding = "Registry Autostart Entry"
                    if ($iocResults.Count -gt 0) {
                        $impact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
                        $confidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
                        $finding = "IoC Match: Registry Autostart"
                    }

                    $script:collections.registryMods.Add([PSCustomObject]@{
                        RegistryHive   = if ($path -like "HKLM:*") { "HKLM" } else { "HKCU" }
                        RegistryPath   = $path; KeyName = $_.Name; Value = $_.Value
                        IoC_Count      = $iocResults.Count
                        IoC_Types      = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
                        Impact         = $impact; Confidence = $confidence
                        MitreReference = "T1547.001"; Finding = $finding
                    })
                }
            }
        }
    }
    
    # --- NEW: Check for Ransomware Registry Indicators ---
    foreach ($rule in $script:iocDatabase.ransomwareRegistryIndicators) {
        try {
            $value = (Get-ItemProperty -Path $rule.Path -Name $rule.Key -ErrorAction Stop).($rule.Key)
            if ($value -match $rule.ValuePattern) {
                $script:collections.registryMods.Add([PSCustomObject]@{
                    RegistryHive   = if ($rule.Path -like "HKLM:*") { "HKLM" } else { "HKCU" }
                    RegistryPath   = $rule.Path; KeyName = $rule.Key; Value = $value
                    IoC_Count      = 1
                    IoC_Types      = "Ransomware TTP"
                    Impact         = 10; Confidence = 9
                    MitreReference = "T1562.001"; Finding = "Ransomware TTP: Desktop Wallpaper Changed to Ransom Note"
                })
            }
        } catch {}
    }
}

function Get-StartupPrograms {
    Write-Host "  Collecting startup programs (folders)..." -ForegroundColor Cyan
    $startupFolders = @(
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup"
    )
    
    foreach ($folder in $startupFolders) {
        Get-ChildItem -Path $folder -ErrorAction SilentlyContinue | ForEach-Object {
            $iocResults = @()
            $iocResults += Test-AdvancedIoC -Value $_.FullName -Type "FilePath" -Context "Startup Program" -SourceCategory "Startup"
            
            $impact = 8; $confidence = 5; $finding = "Startup Program"
            if ($iocResults.Count -gt 0) {
                $impact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
                $confidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
                $finding = "IoC Match: Startup Program"
            }
            
            $script:collections.startupProgs.Add([PSCustomObject]@{
                FileName       = $_.Name; FilePath = $_.FullName; CreationTime = $_.CreationTime
                FileSize       = $_.Length
                FolderType     = if ($folder -like "*$env:APPDATA*") { "User" } else { "System" }
                IoC_Count      = $iocResults.Count
                IoC_Types      = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
                Impact         = $impact; Confidence = $confidence
                MitreReference = "T1547.001"; Finding = $finding
            })
        }
    }
}

function Get-TaskSchedulerAnalysis {
    Write-Host "  Collecting scheduled tasks..." -ForegroundColor Cyan
    Get-ScheduledTask | Where-Object State -ne 'Disabled' | ForEach-Object {
        $isSystemTask = $_.TaskPath -like "\Microsoft\*"
        $isHighPriv = $_.Principal.RunLevel -eq 'Highest'
        $iocResults = @()
        $actionsString = "Error"
        try {
            $actionsString = ($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -join '; '
            if ($actionsString) {
                $iocResults += Test-AdvancedIoC -Value $actionsString -Type "FilePath" -Context "Scheduled Task" -SourceCategory "Tasks"
                $iocResults += Test-AdvancedIoC -Value $actionsString -Type "CommandLine" -Context "Task Command" -SourceCategory "Tasks"
            }
        } catch {}

        $impact = 1; $confidence = 1; $finding = "System Task"
        if ($iocResults.Count -gt 0) {
            $impact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
            $confidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
            $finding = "IoC Match: Scheduled Task"
        } elseif ($isHighPriv -and -not $isSystemTask) {
            $impact = 9; $confidence = 5; $finding = "High Privilege Custom Task"
        } elseif (-not $isSystemTask) {
            $impact = 5; $confidence = 2; $finding = "Custom Scheduled Task"
        }
        
        $script:collections.scheduledTasks.Add([PSCustomObject]@{
            TaskName       = $_.TaskName; TaskPath = $_.TaskPath; State = $_.State
            Author         = $_.Principal.UserId; RunLevel = $_.Principal.RunLevel
            Actions        = $actionsString; IsSystemTask = $isSystemTask
            IoC_Count      = $iocResults.Count
            IoC_Types      = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
            Impact         = $impact; Confidence = $confidence
            MitreReference = "T1053.005"; Finding = $finding
        })
    }
}

# --- FILE SYSTEM FUNCTIONS ---

# --- NEW FUNCTION: Scan for new, unsigned drivers ---
function Get-UnsignedDrivers {
    Write-Host "  Scanning for new, unsigned kernel drivers..." -ForegroundColor Cyan
    $driverPath = "C:\Windows\System32\drivers"
    $minDate = (Get-Date).AddDays(-90)
    
    try {
        Get-ChildItem -Path $driverPath -Filter "*.sys" -File -ErrorAction Stop | ForEach-Object {
            $file = $_
            # Check for new, non-Microsoft drivers
            if ($file.CreationTime -gt $minDate) {
                $signature = Get-FileSignature -FilePath $file.FullName
                
                # Flag if NOT signed, or signed by someone other than Microsoft
                if ($signature -eq "NotSigned" -or ($signature -like "Valid*" -and $signature -notlike "*Microsoft*")) {
                    $script:collections.unsignedDrivers.Add([PSCustomObject]@{
                        DriverName     = $file.Name
                        DriverPath     = $file.FullName
                        CreationTime   = $file.CreationTime
                        Signature      = $signature
                        Impact       = 9; Confidence = 8
                        MitreReference = "T1547.006"; Finding = "New, Non-Microsoft, or Unsigned Driver"
                    })
                }
            }
        }
    } catch {
        Write-Warning "Could not scan driver directory. Error: $_"
    }
}

function Get-SuspiciousFiles {
    Write-Host "  Scanning for suspicious files (recent executables in user space)..." -ForegroundColor Cyan
    $deepScanPaths = @(
        "$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop", "C:\Users\Public", "C:\PerfLogs"
    )
    $shallowScanPaths = @(
        "$env:TEMP", "$env:APPDATA", "$env:LOCALAPPDATA"
    )
    $suspiciousExtensions = @("*.exe", "*.dll", "*.bat", "*.ps1", "*.vbs", "*.scr", "*.com", "*.pif", "*.jar")
    $excludeDirs = @("*node_modules*", "*cache*", "*NuGet*", "*vcpkg*", "*npm*")
    $minSize = 10KB
    $minDate = (Get-Date).AddDays(-30)

    $processFile = {
        param($file)
        $entropy = "NotChecked"; $finding = "Suspicious File in User Location"
        $impact = 5; $confidence = 2; $runHeavyScan = $false
        $hash = "NotCalculated"; $vtLink = "N/A"; $iocResults = @()
        $signature = "NotChecked"

        try {
            # --- ENHANCED: Get signature to check for whitelist ---
            $signature = Get-FileSignature -FilePath $file.FullName
            if ($signature -like "Valid*") {
                foreach ($pub in $script:iocDatabase.whitelistedPublishers) {
                    if ($signature -like "*$pub*") {
                        return # Skip this file, it's from a whitelisted publisher
                    }
                }
            }
            # --- End Whitelist Check ---

            $versionInfo = Get-Item -Path $file.FullName | Select-Object -ExpandProperty VersionInfo
            $hasNoMetadata = [string]::IsNullOrWhiteSpace($versionInfo.CompanyName) -and [string]::IsNullOrWhiteSpace($versionInfo.FileDescription)
            $hasDoubleExtension = $file.Name -match '\.(pdf|doc|txt|jpg|png)\.(exe|bat|ps1|vbs|scr)$'

            if ($hasDoubleExtension) {
                $finding = "Suspicious File (Double Extension)"; $impact = 9; $confidence = 8; $runHeavyScan = $true
            } elseif ($hasNoMetadata -and $signature -eq "NotSigned") {
                $finding = "Suspicious Unsigned File (No Metadata)"; $impact = 8; $confidence = 5; $runHeavyScan = $true
            } elseif ($hasNoMetadata) {
                $finding = "Suspicious File (No Metadata)"; $impact = 7; $confidence = 4; $runHeavyScan = $true
            }
        } catch {
            $finding = "Suspicious File (Access Error)"; $impact = 5; $confidence = 2; $runHeavyScan = $false
        }

        if ($runHeavyScan) {
            $entropy = Get-FileEntropy -FilePath $file.FullName
            try {
                $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA1).Hash
                $vtLink = "https://www.virustotal.com/gui/file/$hash"
                $iocResults += Test-AdvancedIoC -Value $hash -Type "Hash" -Context "Suspicious File Hash" -SourceCategory "FileSystem"
            } catch { $hash = "Access Denied"; $vtLink = "N/A" }
            if ($entropy -ge 7.5) {
                $finding = "High Entropy File (Packed/Encrypted)"; $impact = 9; $confidence = 8
            }
        }
        
        $iocResults += Test-AdvancedIoC -Value $file.FullName -Type "FilePath" -Context "Suspicious File" -SourceCategory "FileSystem"
        $iocResults += Test-AdvancedIoC -Value $file.FullName -Type "FileName" -Context "Suspicious File" -SourceCategory "FileSystem"
        
        if ($iocResults.Count -gt 0) {
            $maxImpact = ($iocResults | Measure-Object -Property Impact -Maximum).Maximum
            $maxConfidence = ($iocResults | Measure-Object -Property Confidence -Maximum).Maximum
            if ($maxImpact -gt $impact) { $impact = $maxImpact }
            if ($maxConfidence -gt $confidence) { $confidence = $maxConfidence }
            $finding = "IoC Match: Suspicious File"
        }

        $script:collections.suspiciousFiles.Add([PSCustomObject]@{
            FileName       = $file.Name; FilePath = $file.FullName; FileSize = $file.Length
            CreationTime   = $file.CreationTime; Extension = $file.Extension; SHA1Hash = $hash
            Signature      = $signature # NEW
            Entropy        = $entropy; VirusTotalLink = $vtLink
            IoC_Count      = $iocResults.Count
            IoC_Types      = ($iocResults | Select-Object -ExpandProperty Type -Unique) -join ", "
            Impact         = $impact; Confidence = $confidence
            MitreReference = "T1036"; Finding = $finding
        })
    }

    foreach ($path in $deepScanPaths) {
        if (-not (Test-Path $path)) { continue }
        Get-ChildItem -Path $path -Include $suspiciousExtensions -File -Recurse -Exclude $excludeDirs -ErrorAction SilentlyContinue | Where-Object { 
            $_.CreationTime -gt $minDate -and $_.Length -gt $minSize
        } | ForEach-Object { & $processFile -file $_ }
    }
    foreach ($path in $shallowScanPaths) {
        if (-not (Test-Path $path)) { continue }
        Get-ChildItem -Path $path -Include $suspiciousExtensions -File -Recurse -Depth 3 -Exclude $excludeDirs -ErrorAction SilentlyContinue | Where-Object { 
            $_.CreationTime -gt $minDate -and $_.Length -gt $minSize
        } | ForEach-Object { & $processFile -file $_ }
    }
}

function Get-RansomwareFileIndicators {
    Write-Host "  Scanning file system for ransom notes and extensions..." -ForegroundColor Cyan
    $scanPaths = @(
        "$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Documents", "C:\Users\Public"
    )
    $ransomNoteNames = $script:iocDatabase.ransomwareIndicators.fileNames
    $ransomExtensions = $script:iocDatabase.ransomwareIndicators.extensions
    
    foreach ($path in $scanPaths) {
        if (-not (Test-Path $path)) { continue }
        
        Get-ChildItem -Path $path -File -Recurse -Depth 3 -ErrorAction SilentlyContinue | Where-Object { 
            $_.Name -in $ransomNoteNames -and $_.CreationTime -gt (Get-Date).AddDays(-30) 
        } | ForEach-Object {
            $script:collections.ransomwareFiles.Add([PSCustomObject]@{
                FileName = $_.Name; FilePath = $_.FullName; FileSize = $_.Length; CreationTime = $_.CreationTime
                Type = "Ransom Note"; Impact = 10; Confidence = 10 # V-High, V-High
                MitreReference = "T1486"; Finding = "Ransom Note Detected"
            })
        }
        
        Get-ChildItem -Path $path -File -Recurse -Depth 3 -ErrorAction SilentlyContinue | Where-Object { 
            $ransomExtensions -contains $_.Extension -and $_.CreationTime -gt (Get-Date).AddDays(-7) 
        } | ForEach-Object {
            $script:collections.ransomwareFiles.Add([PSCustomObject]@{
                FileName = $_.Name; FilePath = $_.FullName; FileSize = $_.Length; CreationTime = $_.CreationTime
                Type = "Encrypted File"; Impact = 10; Confidence = 10 # V-High, V-High
                MitreReference = "T1486"; Finding = "Encrypted File Extension (Ransomware)"
            })
        }
    }
}

# --- Risk Scoring and Report Generation ---

# --- NIST 800-30 Risk Matrix Function ---
# --- FIX: Replaced ALL switch statements with if/elseif/else to prevent parsing errors ---
# --- FIX: Risk capping logic was adjusted to be < 7 instead of < 5 ---
function Get-RiskLevel {
    param(
        [int]$Impact,     # Scale 1-10
        [int]$Confidence  # Scale 1-10
    )
    
    # Map 1-10 scales to 5-level matrix
    $impMap = 1 # Default to Very Low
    if ($Impact -ge 9) { $impMap = 5 }
    elseif ($Impact -ge 7) { $impMap = 4 }
    elseif ($Impact -ge 5) { $impMap = 3 }
    elseif ($Impact -ge 3) { $impMap = 2 }

    $confMap = 1 # Default to Very Low
    if ($Confidence -ge 9) { $confMap = 5 }
    elseif ($Confidence -ge 7) { $confMap = 4 }
    elseif ($Confidence -ge 5) { $confMap = 3 }
    elseif ($Confidence -ge 3) { $confMap = 2 }

    $matrix = @(
        # Rows: Confidence (5=VH -> 1=VL) | Cols: Impact (1=VL -> 5=VH)
        # VL  L   M   H   VH Impact ->
        @( 1,  1,  1,  1,  2 ), # VL Confidence
        @( 1,  1,  1,  2,  3 ), # L  Confidence
        @( 1,  1,  2,  3,  3 ), # M  Confidence
        @( 1,  2,  3,  3,  4 ), # H  Confidence
        @( 2,  2,  3,  4,  4 )  # VH Confidence
    )
    $riskValue = $matrix[$confMap - 1][$impMap - 1] # Indices are 0-based
    
    # --- FIXED: Risk Capping Logic based on User Rule ---
    # If Confidence is less than 7 (i.e., not 'High' or 'Very High'), the risk cannot be High or Critical.
    if ($Confidence -lt 7) { # <-- THIS LINE WAS CHANGED FROM -lt 5
        if ($riskValue -gt 2) { # If the matrix returned High (3) or Critical (4)
            $riskValue = 2     # Cap the risk at Moderate (2)
        }
    }
    # --- End Fix ---
    
    # The case value comes first, then the action block (just the string here)
    if ($riskValue -eq 4) { return "Critical" }
    elseif ($riskValue -eq 3) { return "High" }
    elseif ($riskValue -eq 2) { return "Moderate" }
    else { return "Low" }
}

function Calculate-RiskScore {
    $findings = @()
    $iocMatches = 0
    $totalFindings = 0
    $overallRiskLevel = "Low" # Start at Low
    $highestRiskFinding = "No significant security concerns identified."
    
    $riskLevels = @{ "Critical" = 0; "High" = 0; "Moderate" = 0; "Low" = 0 }
    $riskMap = @{ "Critical" = 4; "High" = 3; "Moderate" = 2; "Low" = 1 }
    $currentMaxRisk = 1 # Start at Low

    foreach ($collection in $script:collections.GetEnumerator()) {
        $collectionName = $collection.Key
        if ($collectionName -in @('iocMatches', 'processedEventHashes')) { continue }
        
        foreach ($item in $collection.Value) {
            if (-not $item.PSObject.Properties.Name -contains 'Impact') { continue }
            
            $totalFindings++
            
            # --- FIX: Safely parse Impact/Confidence before passing to Get-RiskLevel ---
            # This prevents "Cannot convert..." errors if a value is $null or ""
            $impactValue = 0
            $confidenceValue = 0
            [int]::TryParse($item.Impact, [ref]$impactValue)
            [int]::TryParse($item.Confidence, [ref]$confidenceValue)
            
            $findingRiskLevel = Get-RiskLevel -Impact $impactValue -Confidence $confidenceValue
            # --- End Fix ---
            
            $riskLevels[$findingRiskLevel]++
            
            $findings += [PSCustomObject]@{
                Category = $collectionName; Finding = $item.Finding; Impact = $item.Impact
                Confidence = $item.Confidence; Risk = $findingRiskLevel
                MitreReference = $item.MitreReference
                IoC_Count = if ($item.PSObject.Properties.Name -contains 'IoC_Count') { $item.IoC_Count } else { 0 }
                Details  = $item
            }
            
            $findingRiskValue = $riskMap[$findingRiskLevel]
            if ($findingRiskValue -gt $currentMaxRisk) {
                $currentMaxRisk = $findingRiskValue
                $overallRiskLevel = $findingRiskLevel
                $highestRiskFinding = "Risk set by finding '$($item.Finding)' in category '$collectionName' (Impact: $($item.Impact)/10, Confidence: $($item.Confidence)/10)"
            }
            
            if ($item.PSObject.Properties.Name -contains 'IoC_Count' -and $item.IoC_Count -gt 0) {
                $iocMatches += $item.IoC_Count
            }
        }
    }
    
    $highConfidenceIoCs = ($script:collections.iocMatches | Where-Object { $_.Confidence -ge 9 }).Count
    
    # --- Cross-Correlation Logic ---
    $correlatedFindings = @()
    # Find high-risk processes (Risk Level Moderate+)
    $highRiskProcesses = $findings | Where-Object { $_.Category -eq 'runningProcesses' -and $riskMap[$_.Risk] -ge 2 }
    # Find high-risk network connections (Risk Level Moderate+)
    $highRiskNetwork = $findings | Where-Object { $_.Category -eq 'networkConnections' -and $riskMap[$_.Risk] -ge 2 }

    foreach ($proc in $highRiskProcesses) {
        $procPID = $proc.Details.ProcessID
        # Find network connections from this high-risk process
        $linkedConnections = $highRiskNetwork | Where-Object { $_.Details.ProcessID -eq $procPID }
        
        foreach ($conn in $linkedConnections) {
            $correlation = [PSCustomObject]@{
                Finding      = "Correlated Critical Finding"
                Process      = $proc.Details.ProcessName
                ProcessID    = $procPID
                ProcessRisk  = $proc.Risk
                ProcessDesc  = $proc.Finding
                Connection   = "$($conn.Details.RemoteAddress):$($conn.Details.RemotePort)"
                ConnectionRisk = $conn.Risk
                ConnectionDesc = $conn.Finding
                Risk         = "Critical" # Correlated findings are always Critical
            }
            $correlatedFindings += $correlation
            
            # Elevate overall risk to Critical
            if ($currentMaxRisk -lt 4) {
                $currentMaxRisk = 4
                $overallRiskLevel = "Critical"
                $highestRiskFinding = "Risk set by Correlated Finding: Suspicious process '$($proc.Details.ProcessName)' (Risk: $($proc.Risk)) seen communicating with suspicious endpoint '$($conn.Details.RemoteAddress)' (Risk: $($conn.Risk))."
            }
            $riskLevels["Critical"]++
        }
    }
    # --- End Cross-Correlation ---

    return @{
        criticalFindings = $riskLevels["Critical"]
        highFindings     = $riskLevels["High"]
        mediumFindings   = $riskLevels["Moderate"]
        lowFindings      = $riskLevels["Low"]
        allFindings      = $findings
        totalIoCMatches  = $iocMatches
        highConfidenceIoCs = $highConfidenceIoCs
        iocFindings      = $script:collections.iocMatches
        correlatedFindings = $correlatedFindings # NEW
        totalFindings    = $totalFindings
        riskLevel        = $overallRiskLevel
        riskJustification = $highestRiskFinding
    }
}

function Generate-EnhancedHtmlReport {
    param(
        [hashtable]$reportData,
        [string]$filePath
    )
    
    $riskScoring = $reportData.riskScoring
    $chartData = "['Risk Level', 'Count'], ['Critical', $($riskScoring.criticalFindings)], ['High', $($riskScoring.highFindings)], ['Moderate', $($riskScoring.mediumFindings)], ['Low', $($riskScoring.lowFindings)]"
    
    $riskLevel = $riskScoring.riskLevel
    $riskColor = switch ($riskLevel) {
        "Critical" { "#e74c3c" }
        "High"     { "#f39c12" }
        "Moderate" { "#f1c40f" }
        default    { "#2ecc71" } # Low
    }
    
    # --- REMOVED: IoC Chart Data ---
    
    # --- NEW: Build Triage Summary Data ---
    $triageFindings = [System.Collections.Generic.List[string]]::new()
    
    # 1. Check all regular findings
    $highRiskFindings = $riskScoring.allFindings | Where-Object { $_.Risk -in @('Critical', 'High') }
    foreach ($item in $highRiskFindings) {
        $finding = $item.Finding
        switch -Wildcard ($finding) {
            "*Ransom Note*"           { $triageFindings.Add("<strong>Ransom Notes:</strong> Ransom notes were found on the filesystem. (T1486)") }
            "*Encrypted File*"        { $triageFindings.Add("<strong>Encrypted Files:</strong> Files with common ransomware extensions were found. (T1486)") }
            "*Mass File Encryption*"  { $triageFindings.Add("<strong>Behavioral Ransomware:</strong> A process created a high volume of files (Sysmon EID 11). (T1486)") }
            "*Ransomware TTP*"        { $triageFindings.Add("<strong>Ransomware TTP:</strong> Malicious commands (e.g., shadow copy deletion) were detected. (T1490)") }
            "*Process Injection*"     { $triageFindings.Add("<strong>Process Injection:</strong> A process injected code into another (Sysmon EID 8). (T1055)") }
            "*Credential Dumping*"    { $triageFindings.Add("<strong>Credential Dumping:</strong> PowerShell logs show Mimikatz or credential access TTPs. (T1003)") }
            "*Mimikatz*"              { $triageFindings.Add("<strong>Credential Dumping:</strong> PowerShell logs show Mimikatz or credential access TTPs. (T1003)") }
            "*Anomalous Parent*"      { $triageFindings.Add("<strong>Anomalous Parent:</strong> A critical system process has an incorrect parent. (T1134.004)") }
            "*Unsigned Process in System Directory*" { $triageFindings.Add("<strong>Untrusted System Process:</strong> An unsigned process is running from System32. (T1036.005)") }
            "*Unsigned Driver*"       { $triageFindings.Add("<strong>Untrusted Driver:</strong> A new, unsigned kernel driver was found. (T1547.006)") }
            "*Parent-Child (Office*"  { $triageFindings.Add("<strong>Suspicious Parent-Child:</strong> A Microsoft Office app spawned a command shell. (T1566.001)") }
        }
    }
    
    # 2. Check all high-confidence IoC matches
    $highConfIoCs = $riskScoring.iocFindings | Where-Object { $_.Confidence -ge 9 }
    foreach ($item in $highConfIoCs) {
         switch -Wildcard ($item.Type) {
            "*C2 Infrastructure*"     { $triageFindings.Add("<strong>C2 Communication:</strong> Network connection to a known C2 server was detected. (T1071)") }
            "*Malware Hash*"          { $triageFindings.Add("<strong>Known Malware:</strong> A file with a known-bad malware hash was found. (T1036)") }
            "*Malicious Tool*"        { $triageFindings.Add("<strong>Malicious Tool:</strong> A known hacking tool (e.g., Mimikatz, BloodHound) was found. (T1003)") }
         }
    }

    $uniqueTriageFindings = $triageFindings | Select-Object -Unique
    $triageHtml = ""
    if ($uniqueTriageFindings.Count -gt 0) {
        foreach ($item in $uniqueTriageFindings) {
            $triageHtml += "<li>$item</li>"
        }
    } else {
        if ($riskLevel -in @('Critical', 'High')) {
            $triageHtml = "<li><strong>High-Risk Correlated Finding:</strong> The overall risk was elevated due to a correlation between a suspicious process and a suspicious network connection. Review the 'Correlated Findings' and 'Top Priority Findings' tables for details.</li>"
        } elseif ($riskLevel -eq 'Moderate') {
             $triageHtml = "<li><strong>Moderate Risk Findings:</strong> No high-confidence threats were found, but several moderate-risk items were detected. Review 'Top Priority Findings'.</li>"
        } else {
             $triageHtml = "<li><strong style='color: #2ecc71;'>No high-priority triage items found.</strong> The scan detected only low-risk or informational findings.</li>"
        }
    }
    # --- END Triage Summary Data ---

    $htmlHead = @"
    <head>
        <title>SDEMA IRT : Full Threat Scan Report - $($reportData.metadata.computerName)</title>
        <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f8f9fa; color: #333; line-height: 1.6; }
            .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; font-size: 2.5em; }
            h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; margin-top: 30px; font-size: 1.8em; }
            .executive-summary { background: linear-gradient(135deg, #485563 0%, #29323c 100%); color: white; padding: 25px; border-radius: 8px; margin-bottom: 30px; }
            .risk-score { font-size: 3em; font-weight: bold; text-align: center; margin: 20px 0; padding: 20px; border-radius: 8px; background-color: $riskColor; color: white; }
            .risk-details { text-align: center; font-size: 1.1em; margin-top: -15px; }
            
            /* --- REMOVED ioc-summary --- */
            
            /* --- NEW: Triage Summary Box --- */
            .triage-summary { 
                border: 3px solid $riskColor; 
                background: #fff; 
                padding: 25px; 
                border-radius: 8px; 
            }
            .triage-summary h2 { 
                margin-top: 0; 
                color: $riskColor; 
                border-bottom: 2px solid $riskColor; 
            }
            .triage-list { 
                list-style-type: none; 
                padding-left: 0; 
            }
            .triage-list li { 
                font-size: 1.1em; 
                padding: 10px; 
                border-bottom: 1px solid #ecf0f1; 
            }
            .triage-list li:last-child { 
                border-bottom: none; 
            }
            .triage-list li strong { 
                color: #c0392b; /* Red for emphasis */
            }

            /* --- NEW: Correlated Finding Box --- */
            .correlation-summary { background: #e74c3c; border: 2px solid #c0392b; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .correlation-summary h2 { color: white; border-bottom: 1px solid #c0392b; }
            .correlation-item { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; margin-bottom: 10px; }
            .correlation-label { font-weight: bold; }
            
            .metadata-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .metadata-item { background: #ecf0f1; padding: 15px; border-radius: 6px; border-left: 4px solid #3498db; }
            .metadata-label { font-weight: bold; color: #2c3e50; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 0.9em; table-layout: fixed; }
            th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; word-break: break-all; }
            th { background: linear-gradient(135deg, #3498db, #2980b9); color: white; font-weight: 600; position: sticky; top: 0; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            tr:hover { background-color: #e3f2fd; }
            .risk-critical { background-color: #ffebee !important; color: #c62828; font-weight: bold; }
            .risk-high { background-color: #fff3e0 !important; color: #e65100; font-weight: 500; }
            .risk-moderate { background-color: #fffde7 !important; }
            .risk-low { background-color: #f1f8e9 !important; }
            .ioc-match { border-left: 5px solid #e74c3c !important; }
            .chart { width: 100%; height: 400px; margin: 20px 0; }
            .finding-count { display: inline-block; padding: 5px 10px; border-radius: 15px; color: white; font-weight: bold; margin-left: 10px; }
            .count-critical { background-color: #e74c3c; }
            .count-high { background-color: #f39c12; }
            .count-moderate { background-color: #f1c40f; }
            .count-low { background-color: #2ecc71; }
            .count-ioc { background-color: #9b59b6; }
            .collapsible { background-color: #34495e; color: white; cursor: pointer; padding: 15px; border: none; text-align: left; outline: none; font-size: 16px; border-radius: 5px; margin-bottom: 5px; width: 100%; }
            .collapsible:hover { background-color: #2c3e50; }
            .content { padding: 0; display: none; overflow-x: auto; background-color: white; }
            .ioc-badge { background-color: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 5px; }
            td a { color: #2980b9; text-decoration: none; font-weight: bold; }
            td a:hover { text-decoration: underline; }
        </style>
        <script type="text/javascript">
            google.charts.load('current', {'packages':['corechart']});
            google.charts.setOnLoadCallback(drawCharts);
            function drawCharts() {
                var severityData = google.visualization.arrayToDataTable([$chartData]);
                var severityOptions = {
                    title: 'Findings by NIST Risk Level', pieHole: 0.4,
                    colors: ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71'],
                    backgroundColor: 'transparent', chartArea: {width: '90%', height: '80%'},
                    titleTextStyle: {fontSize: 18, bold: true}, legend: {position: 'bottom', textStyle: {fontSize: 12}}
                };
                var severityChart = new google.visualization.PieChart(document.getElementById('severitychart'));
                severityChart.draw(severityData, severityOptions);
                
                // --- REMOVED IoC Chart ---
            }
            
            function toggleContent(element) {
                element.classList.toggle("active");
                var content = element.nextElementSibling;
                if (content.style.display === "block") {
                    content.style.display = "none";
                } else {
                    content.style.display = "block";
                }
            }

            // --- NEW SEARCH FUNCTION ---
            function filterReport() {
                // 1. Get input value and convert to lowercase
                let query = document.getElementById('searchInput').value.toLowerCase();
                
                // 2. Get all tables in the document
                let allTables = document.querySelectorAll('table');
                
                // 3. Loop through each table
                allTables.forEach(function(table) {
                    let rows = table.getElementsByTagName('tr');
                    
                    // 4. Loop through all rows (skip the header row 'th')
                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i];
                        
                        // Skip header rows
                        if (row.getElementsByTagName('th').length > 0) {
                            continue;
                        }
                        
                        let rowText = row.textContent || row.innerText;
                        
                        // 5. Check if row text includes the query
                        if (rowText.toLowerCase().indexOf(query) > -1) {
                            row.style.display = ""; // Show the row
                        } else {
                            row.style.display = "none"; // Hide the row
                        }
                    }
                });
            }
            // --- END NEW SEARCH FUNCTION ---
        </script>
    </head>
"@
    
    $htmlBody = @"
<body>
<h1>SDEMA IRT : Full Threat Scan Report v8.6</h1>

<div class='container'>
    <input type='text' id='searchInput' onkeyup='filterReport()' placeholder='Search all report data...' style='width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;'>
    <p style='font-size: 0.9em; color: #555; margin-top: 5px;'>Tip: Expand all artifact sections before searching to filter all data.</p>
</div>
<div class='container executive-summary'>
    <h2 style='color: white; border: none; margin-top: 0;'>Executive Summary</h2>
    <div class='risk-score'>OVERALL RISK LEVEL: $riskLevel</div>
    <div class='risk-details'>
        <p style='font-size: 0.8em; text-align: center; margin: 10px 20px 0 20px;'>
            <strong>Justification:</strong> $($riskScoring.riskJustification)
        </p>
    </div>
</div>
"@

    # --- NEW: Add Correlated Findings Box ---
    if ($riskScoring.correlatedFindings.Count -gt 0) {
        $htmlBody += "<div class='container correlation-summary'>"
        $htmlBody += "<h2>High-Confidence Correlated Findings</h2>"
        foreach ($item in $riskScoring.correlatedFindings) {
            $htmlBody += "<div class='correlation-item'>"
            $htmlBody += "<strong>$($item.Finding)</strong><br>"
            $htmlBody += "<span class='correlation-label'>Suspicious Process:</span> $($item.Process) (PID: $($item.ProcessID))<br>"
            $htmlBody += "<span class='correlation-label'>Process Finding:</span> $($item.ProcessDesc) (Risk: $($item.ProcessRisk))<br>"
            $htmlBody += "<span class='correlation-label'>Suspicious Connection:</span> $($item.Connection)<br>"
            $htmlBody += "<span class='correlation-label'>Connection Finding:</span> $($item.ConnectionDesc) (Risk: $($item.ConnectionRisk))"
            $htmlBody += "</div>"
        }
        $htmlBody += "</div>"
    }
    # --- End New Section ---

    # --- REMOVED IOC SUMMARY BLOCK ---

    $htmlBody += @"
<div class='container triage-summary'>
    <h2 style='color: $riskColor; border-bottom-color: $riskColor;'>Triage Summary & Analyst's Next Steps</h2>
    <ul class='triage-list'>
        $triageHtml
    </ul>
</div>
<div class='container'>
    <h2>Risk Overview (Based on NIST 800-30 Model)</h2>
    <div style='display: flex; justify-content: center; min-height: 400px;'>
        <div id='severitychart' class='chart' style='width: 80%;'></div>
    </div>
    <div style='text-align: center; margin-top: 20px;'>
        <span class='finding-count count-critical'>Critical: $($riskScoring.criticalFindings)</span>
        <span class='finding-count count-high'>High: $($riskScoring.highFindings)</span>
        <span class='finding-count count-moderate'>Moderate: $($riskScoring.mediumFindings)</span>
        <span class='finding-count count-low'>Low: $($riskScoring.lowFindings)</span>
        <span class='finding-count count-ioc'>Total IoCs: $($riskScoring.totalIoCMatches)</span>
    </div>
</div>

<div class='container'>
    <h2>System Information</h2>
    <div class='metadata-grid'>
        <div class='metadata-item'><span class='metadata-label'>Computer Name:</span><br>$($reportData.metadata.computerName)</div>
        <div class='metadata-item'><span class='metadata-label'>DNS Hostname:</span><br>$($reportData.metadata.dnsHostName)</div>
        <div class='metadata-item'><span class='metadata-label'>Domain:</span><br>$($reportData.metadata.domain)</div>
        <div class='metadata-item'><span class='metadata-label'>Analysis Date:</span><br>$($reportData.metadata.dateCollected)</div>
        <div class='metadata-item'><span class='metadata-label'>OS Version:</span><br>$($reportData.metadata.osVersion)</div>
        <div class='metadata-item'><span class='metadata-label'>User Name:</span><br>$($reportData.metadata.collector)</div>
        <div class='metadata-item'><span class='metadata-label'>IP Address:</span><br>$($reportData.metadata.ipAddress)</div>
        <div class='metadata-item'><span class='metadata-label'>Risk Level:</span><br><strong style='color: $riskColor;'>$riskLevel</strong></div>
    </div>
</div>

<div class='container'>
    <h2>Top Priority Findings (Risk Level: Moderate+)</h2>
"@
    
    # --- Start Priority Table ---
    # Sort by the new Risk property
    $priorityFindings = $riskScoring.allFindings | Where-Object { $_.Risk -in @('Critical', 'High', 'Moderate') } | Sort-Object { $riskMap[$_.Risk] } -Descending
    if ($priorityFindings.Count -gt 0) {
        $htmlBody += "<table><tr><th>Category</th><th>Finding</th><th>Risk Level</th><th>Impact</th><th>Confidence</th><th>MITRE</th><th>Details</th></tr>"
        foreach ($item in $priorityFindings) {
            $riskClass = "risk-" + $item.Risk.ToLower()
            
            # Extract key details from the full object
            $details = ""
            switch ($item.Category) {
                'runningProcesses' { $details = "Process: $($item.Details.ProcessName) (PID: $($item.Details.ProcessID))<br>Parent: $($item.Details.ParentName) (PID: $($item.Details.ParentPID))<br>Path: $($item.Details.ExecutablePath)<br>Signature: $($item.Details.SignatureStatus)<br>CMD: $($item.Details.CommandLine)" }
                'suspiciousFiles'  { 
                    $details = "File: $($item.Details.FileName)<br>Path: $($item.Details.FilePath)<br>Signature: $($item.Details.Signature)<br>"
                    if ($item.Details.VirusTotalLink -like 'http*') {
                        $details += "Hash: <a href='$($item.Details.VirusTotalLink)' target='_blank'>$($item.Details.SHA1Hash) (Check VT)</a>"
                    } else {
                        $details += "Hash: $($item.Details.SHA1Hash)"
                    }
                }
                'ransomwareTTPs'   { $details = "Log: $($item.Details.SourceLog)<br>Match: $($item.Details.MatchedString)" }
                'highVolumeFileEvents' { $details = "Process: $($item.Details.ProcessPath) (PID: $($item.Details.ProcessID))<br>Count: $($item.Details.FileEventCount) files created in $($item.Details.TimeWindowMinutes) mins" }
                'processInjectionEvents' { $details = "Source: $($item.Details.SourceProcess) (PID: $($item.Details.SourcePID))<br>Target: $($item.Details.TargetProcess) (PID: $($item.Details.TargetPID))" }
                'unsignedDrivers'  { $details = "Driver: $($item.Details.DriverName)<br>Created: $($item.Details.CreationTime)<br>Signature: $($item.Details.Signature)" }
                'suspiciousPSEvents' { $details = "Match: $($item.Details.MatchedString)<br>Block: $($item.Details.ScriptBlock | ForEach-Object { [System.Security.SecurityElement]::Escape($_) } | Select-Object -First 100)..." }
                'services'         { $details = "Service: $($item.Details.ServiceName)<br>Path: $($item.Details.ServicePath)<br>State: $($item.Details.State)" }
                'registryMods'     { $details = "Key: $($item.Details.KeyName)<br>Path: $($item.Details.RegistryPath)<br>Value: $($item.Details.Value)" }
                'scheduledTasks'   { $details = "Task: $($item.Details.TaskName)<br>Action: $($item.Details.Actions)" }
                'failedLogins'     { $details = "User: $($item.Details.TargetUserName)<br>From: $($item.Details.SourceIP)" }
                'accountChanges'   { $details = "Type: $($item.Details.ChangeType)<br>Account: $($item.Details.AccountName)" }
                'ransomwareFiles'  { $details = "File: $($item.Details.FileName)<br>Path: $($item.Details.FilePath)" }
                default            { $details = $item.Details.ToString() }
            }
            
            $htmlBody += "<tr class='$riskClass'>
                            <td>$($item.Category)</td>
                            <td>$($item.Finding)</td>
                            <td>$($item.Risk)</td>
                            <td>$($item.Impact)/10</td>
                            <td>$($item.Confidence)/10</td>
                            <td>$($item.MitreReference)</td>
                            <td>$details</td>
                         </tr>"
        }
        $htmlBody += "</table>"
    } else {
        $htmlBody += "<p>No findings with Moderate risk or higher were detected.</p>"
    }
    $htmlBody += "</div>"
    # --- End Priority Table ---
    
    $htmlBody += "<h2>All Collected Artifacts</h2>"

    foreach ($artifactType in $reportData.artifacts.GetEnumerator() | Where-Object { $_.Name -notin @('iocMatches', 'processedEventHashes') } | Sort-Object Name) {
        if ($artifactType.Value.Count -gt 0) {
            $categoryName = switch ($artifactType.Name) {
                'networkConnections' { 'Network Connections' }
                'services'           { 'Windows Services' }
                'registryMods'       { 'Registry Autostart & Hijack Entries' }
                'startupProgs'       { 'Startup Programs' }
                'scheduledTasks'     { 'Scheduled Tasks' }
                'failedLogins'       { 'Failed Login Attempts' }
                'accountChanges'     { 'Account Changes' }
                'runningProcesses'   { 'Running Processes' }
                'suspiciousFiles'    { 'Suspicious Files (User Space)' }
                'ransomwareTTPs'     { 'Ransomware TTPs (Event Logs)' }
                'suspiciousPSEvents' { 'Suspicious PowerShell Events (EID 4104)' }
                'ransomwareFiles'    { 'Ransomware File Indicators' }
                'highVolumeFileEvents' { 'Mass File Creation (Sysmon EID 11)' }
                'processInjectionEvents' { 'Process Injection (Sysmon EID 8)' }
                'unsignedDrivers'    { 'New/Unsigned Drivers' }
                default              { $artifactType.Name }
            }
            
            $iocCount = ($artifactType.Value | Where-Object { $_.PSObject.Properties.Name -contains 'IoC_Count' -and $_.IoC_Count -gt 0 }).Count
            $iocBadge = if ($iocCount -gt 0) { "<span class='ioc-badge'>$iocCount IoCs</span>" } else { "" }
            
            $htmlBody += "<div class='container'>"
            $htmlBody += "<button type='button' class='collapsible' onclick='toggleContent(this)'>$categoryName ($($artifactType.Value.Count) items)$iocBadge</button>"
            $htmlBody += "<div class='content'><table><tr>"
            
            # Create headers, but hide the VirusTotalLink column as it's redundant
            $artifactType.Value[0].PSObject.Properties | Where-Object { $_.Name -ne 'VirusTotalLink' } | ForEach-Object { 
                $htmlBody += "<th>$($_.Name)</th>" 
            }
            $htmlBody += "</tr>"
            
            # Add rows with severity-based styling and IoC highlighting
            $allFindingsForType = $riskScoring.allFindings | Where-Object { $_.Category -eq $artifactType.Name }
            
            $artifactType.Value | ForEach-Object {
                $row = $_
                # Find the corresponding calculated finding
                $finding = $allFindingsForType | Where-Object { $_.Details -eq $row } | Select-Object -First 1
                
                $riskClass = "risk-low" # Default
                if ($finding) {
                    $riskClass = "risk-" + $finding.Risk.ToLower()
                }
                
                $iocClass = if ($row.PSObject.Properties.Name -contains 'IoC_Count' -and $row.IoC_Count -gt 0) { " ioc-match" } else { "" }
                
                $htmlBody += "<tr class='$riskClass$iocClass'>"
                # Iterate properties, skipping the VT link column
                $row.PSObject.Properties | Where-Object { $_.Name -ne 'VirusTotalLink' } | ForEach-Object { 
                    $prop = $_
                    $cellValue = if ($prop.Value -is [DateTime]) { 
                                    $prop.Value.ToString("yyyy-MM-dd HH:mm:ss") 
                                 } else { 
                                    [System.Security.SecurityElement]::Escape($prop.Value) 
                                 }
                    
                    # Check if this is the SHA1Hash column AND a VT link exists for this row
                    if ($prop.Name -eq 'SHA1Hash' -and $row.PSObject.Properties['VirusTotalLink'] -and $row.VirusTotalLink -like 'http*') {
                        $cellValue = "<a href='$($row.VirusTotalLink)' target='_blank'>$($prop.Value)</a>"
                    }

                    $htmlBody += "<td>$cellValue</td>" 
                }
                $htmlBody += "</tr>"
            }
            $htmlBody += "</table></div></div>"
        }
    }
    
    $htmlBody += "</body>"
    
    $htmlContent = "<html>$htmlHead$htmlBody</html>"
    $htmlContent | Out-File -FilePath $filePath -Encoding UTF8
}

# --- Main Execution Block ---

try {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "SDEMA IRT : Full Threat Scan v8.6" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    
    New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null
    
    $collectionFunctions = @(
        'Get-ProcessInjectionEvents', # NEW: High-priority Sysmon scan
        'Get-HighVolumeFileEvents',   # High-priority behavioral scan
        'Get-RansomwareTTPs',         # High-priority log scan
        'Get-SuspiciousPSTranscripts',  # High-priority log scan
        'Get-RansomwareFileIndicators', # High-priority file scan
        'Get-UnsignedDrivers',        # NEW: High-priority file scan
        'Get-NetworkConnections',
        'Get-ServiceAnalysis', 
        'Get-RegistryModifications',    # Now enhanced for ransomware
        'Get-StartupPrograms',
        'Get-TaskSchedulerAnalysis',
        'Get-FailedLogins',
        'Get-AccountChanges',
        'Get-RunningProcesses',         # Optimized with P-C Analysis & FP Reduction
        'Get-SuspiciousFiles'           # Optimized with FP Reduction
    )
    
    $totalFunctions = $collectionFunctions.Count
    $currentFunction = 0
    
    foreach ($func in $collectionFunctions) {
        $currentFunction++
        $percentage = [math]::Round(($currentFunction / $totalFunctions) * 100, 1)
        Write-Host "[$percentage%] $func" -ForegroundColor Yellow
        try {
            & $func
        }
        catch {
            Write-Warning "Error in $func : $_"
        }
    }
    
    Write-Host "`nCalculating risk scores (NIST 800-30 Model)..." -ForegroundColor Cyan
    $riskMetrics = Calculate-RiskScore
    
    $ipAddresses = (Get-NetIPAddress | Where-Object { $_.AddressFamily -eq 'IPv4' -and $_.PrefixOrigin -ne 'WellKnown' }).IPAddress
    if (-not $ipAddresses) { $ipAddresses = @("Unknown") }
    
    # --- Get FQDN and Domain ---
    $compSystem = Get-CimInstance Win32_ComputerSystem
    $dnsHostName = $compSystem.DNSHostName
    $domain = $compSystem.Domain
    
    $results = @{
        metadata = @{
            computerName  = $env:COMPUTERNAME
            dnsHostName   = $dnsHostName
            domain        = $domain
            dateCollected = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
            osVersion     = (Get-CimInstance Win32_OperatingSystem).Caption
            collector     = $env:USERNAME
            ipAddress     = $ipAddresses -join ', '
            scriptVersion = "8.6 Full Scan " # Updated Version
        }
        artifacts = $script:collections
        riskScoring = $riskMetrics
    }
    
    # Generate reports
    $htmlReportPath = "$OutputPath\FullThreatScan_Report_v8.8.html"
    $jsonReportPath = "$OutputPath\FullThreatScan_Report_v8.8.json"
    $iocReportPath = "$OutputPath\IoC_Matches_v8.8.csv"
    
    Write-Host "`nGenerating enhanced reports..." -ForegroundColor Cyan
    
    try {
        Generate-EnhancedHtmlReport -reportData $results -filePath $htmlReportPath
        Write-Host "  HTML Report: $htmlReportPath" -ForegroundColor Green
    } catch { Write-Warning "Error generating HTML report: $_.Exception.Message" }
    
    try {
        $results | ConvertTo-Json -Depth 10 | Out-File $jsonReportPath -Encoding UTF8
        Write-Host "  JSON Report: $jsonReportPath" -ForegroundColor Green
    } catch { Write-Warning "Error generating JSON report: $_.Exception.Message" }

    if ($riskMetrics.iocFindings -and $riskMetrics.iocFindings.Count -gt 0) {
        try {
            $riskMetrics.iocFindings | Export-Csv -Path $iocReportPath -NoTypeInformation -Encoding UTF8
            Write-Host "  IoC Report: $iocReportPath" -ForegroundColor Green
        } catch { Write-Warning "Error generating IoC report: $_.Exception.Message" }
    }
    
    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host "SCAN SUMMARY (NIST 800-30 Model)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    
    $riskLevel = $riskMetrics.riskLevel
    $riskColor = switch ($riskLevel) {
        "Critical" { "Red" }
        "High"     { "Yellow" }
        "Moderate" { "Cyan" }
        default    { "Green" } # Low
    }
    
    Write-Host "OVERALL RISK LEVEL: $riskLevel" -ForegroundColor $riskColor
    Write-Host "Justification: $($riskMetrics.riskJustification)" -ForegroundColor $riskColor
    
    # --- NEW: Show Correlated Findings in Console ---
    if ($riskMetrics.correlatedFindings.Count -gt 0) {
        Write-Host "`nCRITICAL CORRELATED FINDINGS:" -ForegroundColor Red
        $riskMetrics.correlatedFindings | ForEach-Object {
            Write-Host "  [CRITICAL] Suspicious Process '$($_.Process)' (Risk: $($_.ProcessRisk)) -> Suspicious Connection '$($_.Connection)' (Risk: $($_.ConnectionRisk))" -ForegroundColor Red
        }
    }

    Write-Host "`nCritical Findings: $($riskMetrics.criticalFindings)" -ForegroundColor Red
    Write-Host "High Findings:     $($riskMetrics.highFindings)" -ForegroundColor Yellow  
    Write-Host "Moderate Findings: $($riskMetrics.mediumFindings)" -ForegroundColor Cyan
    Write-Host "Total IoC Matches: $($riskMetrics.totalIoCMatches)" -ForegroundColor Magenta
    Write-Host "High-Confidence IoCs:  $($riskMetrics.highConfidenceIoCs)" -ForegroundColor Magenta
    
    if ($riskMetrics.totalIoCMatches -gt 0) {
        Write-Host "`nTOP IoC MATCHES:" -ForegroundColor Yellow
        $riskMetrics.iocFindings | Sort-Object Confidence -Descending | Select-Object -First 5 | ForEach-Object {
            Write-Host "  [Impact: $($_.Impact)/10, Conf: $($_.Confidence)/10] $($_.Type): $($_.IoC)" -ForegroundColor Red
            Write-Host "    Context: $($_.Context) | $($_.Description)" -ForegroundColor Gray
        }
    }
    
    # --- NEW: Show Top Parent-Child Findings in Console ---
    $pcFindings = $riskMetrics.allFindings | Where-Object { $_.Category -eq 'runningProcesses' -and ($_.Finding -like "*Parent-Child*" -or $_.Finding -like "*Anomalous Parent*") } | Sort-Object { $riskMap[$_.Risk] } -Descending
    if ($pcFindings.Count -gt 0) {
        Write-Host "`nTOP PARENT-CHILD FINDINGS:" -ForegroundColor Yellow
        $pcFindings | Select-Object -First 5 | ForEach-Object {
            Write-Host "  [$($_.Risk)] $($_.Finding)" -ForegroundColor Red
            Write-Host "    Process: $($_.Details.ProcessName) (PID: $($_.Details.ProcessID))" -ForegroundColor Gray
            Write-Host "    Parent:  $($_.Details.ParentName) (PID: $($_.Details.ParentPID))" -ForegroundColor Gray
        }
    }

    # --- NEW: Show Top Ransomware Findings in Console ---
    $ransomwareFindings = $riskMetrics.allFindings | Where-Object { 
        $_.Finding -like "*Ransomware*" -or $_.Finding -like "*Ransom Note*" -or $_.Finding -like "*Encrypted File*" -or $_.Finding -like "*Mass File*" 
    } | Sort-Object { $riskMap[$_.Risk] } -Descending
    if ($ransomwareFindings.Count -gt 0) {
        Write-Host "`nTOP RANSOMWARE-RELATED FINDINGS:" -ForegroundColor Red
        $ransomwareFindings | Select-Object -First 5 | ForEach-Object {
            Write-Host "  [$($_.Risk)] $($_.Finding)" -ForegroundColor Red
            Write-Host "    Category: $($_.Category)" -ForegroundColor Gray
            Write-Host "    Details:  $($_.Details | Out-String -Width 80 | Select-Object -First 2 | ForEach-Object { $_.Trim() })" -ForegroundColor Gray
        }
    }
    
    Write-Host "`nReports Generated:" -ForegroundColor Cyan
    Write-Host "  HTML Report: $htmlReportPath" -ForegroundColor White
    
    try {
        Start-Process $htmlReportPath
        Write-Host "`nHTML report opened in default browser" -ForegroundColor Green
    } catch {
        Write-Host "`nCould not auto-open HTML report" -ForegroundColor Yellow
    }
    
}
catch {
    Write-Error "A critical error occurred: $_"
    Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
}
finally {
    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host "Scan completed in: $((Get-Date) - $startTime)" -ForegroundColor Cyan
    Write-Host "Output Directory: $OutputPath" -ForegroundColor Cyan
}

Write-Host "`nScript execution finished." -ForegroundColor Green
