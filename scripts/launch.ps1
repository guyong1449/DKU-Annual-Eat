$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    Write-Host 'Node.js 22+ is required. Install it from https://nodejs.org and try again.'
    Read-Host 'Press Enter to close'
    exit 1
}
$nodeMajor = [int]((& $nodeCommand.Source --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) {
    Write-Host 'Please update Node.js to version 22 or later.'
    Read-Host 'Press Enter to close'
    exit 1
}
$privatePath = Join-Path $projectDir 'private'
New-Item -ItemType Directory -Path $privatePath -Force | Out-Null
Start-Process -FilePath $nodeCommand.Source -ArgumentList ('"' + (Join-Path $PSScriptRoot 'start.cjs') + '"') -WorkingDirectory $projectDir -WindowStyle Hidden
