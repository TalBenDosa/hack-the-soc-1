<#
.SYNOPSIS
    Packages IR_DeepThreatScan_v9.0.ps1 into a stand-alone EXE (same packaging as the original v8.6 EXE: PS2EXE).

.DESCRIPTION
    Run on a Windows build machine. Requires the ps2exe module once:
        Install-Module ps2exe -Scope CurrentUser
    The resulting EXE needs only Windows PowerShell 5.1 (built into Windows 10/11 / Server 2016+). No Python required.

    Tip: sign the EXE with your code-signing certificate - unsigned PS2EXE binaries are often flagged by EDR/AV.

.EXAMPLE
    .\Build-Exe.ps1
.EXAMPLE
    .\Build-Exe.ps1 -SignCertThumbprint 0123ABCD...
#>
param(
    [string]$Version = '9.0.0.0',
    [string]$OutDir = (Join-Path $PSScriptRoot 'dist'),
    [string]$SignCertThumbprint = ''
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command Invoke-ps2exe -ErrorAction SilentlyContinue)) {
    Import-Module ps2exe -ErrorAction SilentlyContinue
    if (-not (Get-Command Invoke-ps2exe -ErrorAction SilentlyContinue)) { throw 'ps2exe module not found. Install it with: Install-Module ps2exe -Scope CurrentUser' }
}

$src = Join-Path $PSScriptRoot 'IR_DeepThreatScan_v9.0.ps1'
$null = New-Item -ItemType Directory -Force -Path $OutDir
$exe = Join-Path $OutDir 'IR_DeepThreatScan_v9.0.exe'

Invoke-ps2exe -inputFile $src -outputFile $exe -x64 -requireAdmin `
    -title 'SDEMA IRT Deep Threat Scan' -description 'Live-response compromise assessment and reporting' `
    -company 'SDEMA IRT' -product 'Deep Threat Scan' -copyright 'SDEMA IRT' -version $Version

if ($SignCertThumbprint) {
    $cert = Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $SignCertThumbprint } | Select-Object -First 1
    if (-not $cert) { throw "Certificate $SignCertThumbprint not found" }
    Set-AuthenticodeSignature -FilePath $exe -Certificate $cert -TimestampServer 'http://timestamp.digicert.com' -HashAlgorithm SHA256 | Out-Null
}

$hash = (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash
Write-Host "Built: $exe" -ForegroundColor Green
Write-Host "SHA256: $hash"
