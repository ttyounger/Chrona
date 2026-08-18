$ErrorActionPreference = "Stop"
$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $projectDirectory ".server.pid"

try {
    $stopped = $false
    if (Test-Path -LiteralPath $pidFile) {
        $serverProcessId = [int](Get-Content -LiteralPath $pidFile -Raw)
        taskkill.exe /PID $serverProcessId /T /F | Out-Null
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
        $stopped = $true
    }

    $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq "node") {
            Stop-Process -Id $process.Id -Force
            $stopped = $true
        }
    }

    if ($stopped) {
        Write-Host "Chrona has stopped." -ForegroundColor Green
    }
    else {
        Write-Host "Chrona is not running." -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
}
catch {
    Write-Host "Failed to stop the service: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
