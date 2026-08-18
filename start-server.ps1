$ErrorActionPreference = "Stop"
$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$standardLog = Join-Path $projectDirectory "startup.log"
$errorLog = Join-Path $projectDirectory "startup-error.log"
$serverUrl = "http://localhost:3000"

Set-Location -LiteralPath $projectDirectory
Set-Content -LiteralPath $standardLog -Value "" -Encoding UTF8
Set-Content -LiteralPath $errorLog -Value "" -Encoding UTF8

function Test-ServerReady {
    try {
        $response = Invoke-WebRequest -Uri $serverUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

try {
    Write-Host "Chrona" -ForegroundColor Cyan
    Write-Host "Working directory: $projectDirectory"

    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
        throw "Node.js is not installed. Please install Node.js and try again."
    }

    if (Test-ServerReady) {
        Write-Host "The service is already running. Opening the browser..." -ForegroundColor Yellow
        Start-Process $serverUrl
        Write-Host "You can close this window."
        Read-Host "Press Enter to exit"
        exit 0
    }

    if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory "node_modules"))) {
        Write-Host "Installing required components for the first run..."
        & npm.cmd install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw "Component installation failed. Check your network and try again."
        }
    }

    if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory ".next\BUILD_ID"))) {
        Write-Host "Preparing the application for the first run..."
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "Application preparation failed."
        }
    }

    Write-Host "Starting the local service..."
    $serverProcess = Start-Process -FilePath "cmd.exe" `
        -ArgumentList @("/d", "/c", "npm.cmd run start") `
        -WorkingDirectory $projectDirectory `
        -RedirectStandardOutput $standardLog `
        -RedirectStandardError $errorLog `
        -WindowStyle Hidden `
        -PassThru

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Seconds 1
        if ($serverProcess.HasExited) {
            throw "The local service stopped unexpectedly."
        }
        if (Test-ServerReady) {
            $ready = $true
            break
        }
        Write-Host "." -NoNewline
    }
    Write-Host ""

    if (-not $ready) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        throw "Startup timed out after 30 seconds."
    }

    Set-Content -LiteralPath (Join-Path $projectDirectory ".server.pid") -Value $serverProcess.Id -Encoding ASCII
    Start-Process $serverUrl
    Write-Host "Started successfully: $serverUrl" -ForegroundColor Green
    Write-Host "Keep this window open while using the system."
    Write-Host "Press Enter here when you want to stop the system."
    Read-Host

    if (-not $serverProcess.HasExited) {
        taskkill.exe /PID $serverProcess.Id /T /F | Out-Null
    }
    Remove-Item -LiteralPath (Join-Path $projectDirectory ".server.pid") -Force -ErrorAction SilentlyContinue
    Write-Host "The system has stopped."
}
catch {
    $message = $_.Exception.Message
    Add-Content -LiteralPath $errorLog -Value "`nLauncher error: $message" -Encoding UTF8
    Write-Host ""
    Write-Host "Startup failed: $message" -ForegroundColor Red
    Write-Host "Error log: $errorLog"
    exit 1
}
