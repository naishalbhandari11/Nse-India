# ============================================================
# NSE Stock Analysis - IIS Publish Setup Script
# Run this as Administrator (Right-click -> Run with PowerShell as Admin)
# ============================================================

$ProjectPath = "C:\Users\bhand\Music\nse-stock-analysis-main"
$PythonExe   = "C:\Users\bhand\AppData\Local\Programs\Python\Python312\python.exe"
$SiteName    = "NSEStockAnalysis"
$AppPoolName = "NSEStockPool"
$Port        = 80

Write-Host "=== Step 1: Installing IIS Features ===" -ForegroundColor Cyan
Enable-WindowsOptionalFeature -Online -FeatureName `
    IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, `
    IIS-HttpErrors, IIS-ApplicationDevelopment, IIS-HealthAndDiagnostics, `
    IIS-HttpLogging, IIS-Security, IIS-RequestFiltering, `
    IIS-WebServerManagementTools, IIS-ManagementConsole, IIS-CGI `
    -All -NoRestart

Write-Host "=== Step 2: Downloading HttpPlatformHandler ===" -ForegroundColor Cyan
$hphUrl  = "https://download.microsoft.com/download/A/7/0/A703DA6E-B7A4-4509-A0F2-33FC405D5B8E/HttpPlatformHandler_amd64.msi"
$hphMsi  = "$env:TEMP\HttpPlatformHandler.msi"
Invoke-WebRequest -Uri $hphUrl -OutFile $hphMsi -UseBasicParsing
Write-Host "Installing HttpPlatformHandler..."
Start-Process msiexec.exe -ArgumentList "/i `"$hphMsi`" /quiet /norestart" -Wait

Write-Host "=== Step 3: Creating IIS App Pool ===" -ForegroundColor Cyan
Import-Module WebAdministration
if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName
}
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.idleTimeout -Value "00:00:00"

Write-Host "=== Step 4: Creating IIS Website ===" -ForegroundColor Cyan
if (Test-Path "IIS:\Sites\$SiteName") {
    Remove-Website -Name $SiteName
}
New-Website -Name $SiteName `
            -PhysicalPath $ProjectPath `
            -ApplicationPool $AppPoolName `
            -Port $Port `
            -Force

Write-Host "=== Step 5: Setting folder permissions ===" -ForegroundColor Cyan
$acl = Get-Acl $ProjectPath
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\$AppPoolName", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl $ProjectPath $acl

Write-Host "=== Step 6: Starting IIS ===" -ForegroundColor Cyan
Start-Service W3SVC -ErrorAction SilentlyContinue
Start-Website -Name $SiteName

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Site published at: http://localhost:$Port" -ForegroundColor Yellow
Write-Host "Logs at: $ProjectPath\logs\uvicorn.log" -ForegroundColor Yellow
