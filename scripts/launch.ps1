$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path $projectDir 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodePath = $nodeCommand.Source }
}
if (-not (Test-Path -LiteralPath $nodePath)) {
    Write-Host 'Node.js 22+ is required. Install it from https://nodejs.org and try again.'
    Read-Host 'Press Enter to close'
    exit 1
}
$nodeMajor = [int]((& $nodePath --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) {
    Write-Host 'Please update Node.js to version 22 or later.'
    Read-Host 'Press Enter to close'
    exit 1
}
& $nodePath (Join-Path $PSScriptRoot 'launch.cjs')
exit $LASTEXITCODE
