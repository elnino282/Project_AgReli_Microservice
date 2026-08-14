param(
    [string]$ComposeFile = "docker-compose.yml"
)

$ErrorActionPreference = "Stop"
$serviceNames = @(
    "identity-service", "crop-catalog-service", "ai-service", "farm-service",
    "season-service", "inventory-service", "finance-service", "incident-service",
    "sustainability-service", "marketplace-service", "admin-reporting-service", "delivery-service"
)

$configJson = docker compose -f $ComposeFile config --format json
if ($LASTEXITCODE -ne 0) {
    throw "docker compose config failed"
}
$config = $configJson | ConvertFrom-Json

foreach ($serviceName in $serviceNames) {
    $service = $config.services.$serviceName
    if ($null -ne $service.ports -and @($service.ports).Count -gt 0) {
        throw "$serviceName publishes a host port; internal trust boundary is open"
    }
}

if ($null -eq $config.services.'api-gateway'.ports -or @($config.services.'api-gateway'.ports).Count -eq 0) {
    throw "api-gateway must remain the application ingress"
}

Write-Output "Compose boundary verified: only the gateway is application ingress."
