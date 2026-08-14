[CmdletBinding()]
param(
    [ValidateSet("config", "up", "status", "logs", "down")]
    [string]$Action = "status",
    [switch]$Build,
    [string]$Service
)

$ErrorActionPreference = "Stop"
$auditProject = "vietfuture_audit"
$repoRoot = Split-Path -Parent $PSScriptRoot
$baseCompose = Join-Path $repoRoot "docker-compose.yml"
$auditCompose = Join-Path $repoRoot "docker-compose.audit.yml"
$composeArgs = @(
    "compose",
    "-p", $auditProject,
    "-f", $baseCompose,
    "-f", $auditCompose
)

if (-not (Test-Path -LiteralPath $baseCompose) -or -not (Test-Path -LiteralPath $auditCompose)) {
    throw "Audit compose files are missing."
}

if ($Action -ne "config") {
    & docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker daemon is not available."
    }
}

switch ($Action) {
    "config" {
        & docker @composeArgs config
    }
    "up" {
        $upArgs = @($composeArgs + @("up", "-d", "--wait", "--wait-timeout", "600"))
        if ($Build) {
            $upArgs += "--build"
        }
        & docker @upArgs
    }
    "status" {
        & docker @composeArgs ps
    }
    "logs" {
        $logArgs = @($composeArgs + @("logs", "--tail", "200"))
        if ($Service) {
            $logArgs += $Service
        }
        & docker @logArgs
    }
    "down" {
        # The project name is a constant and the overlay removes shared
        # container names, so this only removes audit containers/volumes.
        & docker @composeArgs down --volumes --remove-orphans
    }
}

if ($LASTEXITCODE -ne 0) {
    throw "Audit stack action '$Action' failed with exit code $LASTEXITCODE."
}
