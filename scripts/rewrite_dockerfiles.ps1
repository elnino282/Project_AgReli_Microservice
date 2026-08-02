#!/usr/bin/env pwsh
# Replaces each service's Dockerfile with a Maven-Central-only version that
# no longer depends on maven.aliyun.com.
#
# Speed-ups baked in:
#   1. BuildKit `--mount=type=cache,target=/root/.m2/repository` so Maven's
#      local repo is persisted across `docker compose build` invocations and
#      shared between services that have overlapping deps. Without this,
#      every service re-downloads ~300 MB even though they share most deps.
#   2. A SECOND `RUN` pre-warms the cache via `dependency:resolve` so we
#      don't pay for source/javadoc jars that `package` doesn't need.
#   3. `-T 1C` parallel module execution; harmless for single-module services
#      but lets the multi-module ones fly.
#   4. `-Dmaven.artifact.threads=12` widens Maven Wagon's parallel HTTP
#      fetches when the link is slow.
#
# Run from the repo root:
#     pwsh scripts/rewrite_dockerfiles.ps1
#
# To seed the BuildKit cache with the developer's local ~/.m2 (Windows:
# %USERPROFILE%\.m2\repository), run BEFORE `docker compose build`:
#
#     docker buildx create --use --name=vietfuture-builder
#     docker buildx build --builder=vietfuture-builder --load ^
#         --cache-from=type=local,src=./.buildx-cache ^
#         --cache-to=type=local,dest=./.buildx-cache ^
#         -f finance-service/Dockerfile finance-service
#
# The first invocation seeds .buildx-cache/, subsequent `docker compose
# build` calls reuse it.

$ErrorActionPreference = 'Stop'

$script:RepoRoot = (Resolve-Path "$PSScriptRoot/..").Path
$sharedSettings = Join-Path $script:RepoRoot 'shared-config/settings.xml'

if (-not (Test-Path $sharedSettings)) {
    Write-Error "Shared settings.xml not found at $sharedSettings"
    exit 1
}

$services = @(
    @{ Name = 'finance-service';             Port = 8081 },
    @{ Name = 'incident-service';            Port = 8081 },
    @{ Name = 'ai-service';                  Port = 8083 },
    @{ Name = 'identity-service';            Port = 8081 },
    @{ Name = 'crop-catalog-service';        Port = 8082 },
    @{ Name = 'admin-reporting-service';     Port = 8081 },
    @{ Name = 'inventory-service';           Port = 8081 },
    @{ Name = 'season-service';              Port = 8081 },
    @{ Name = 'api-gateway';                 Port = 8000 },
    @{ Name = 'marketplace-service';         Port = 8081 },
    @{ Name = 'farm-service';                Port = 8081 },
    @{ Name = 'sustainability-service';      Port = 8081 },
    @{ Name = 'delivery-service';            Port = 8092 }
)

foreach ($svc in $services) {
    $dir = Join-Path $script:RepoRoot $svc.Name
    if (-not (Test-Path $dir)) {
        Write-Warning "Skipping $($svc.Name) (directory not found)"
        continue
    }

    Copy-Item -Force $sharedSettings (Join-Path $dir 'settings.xml')

    $dockerfile = Join-Path $dir 'Dockerfile'
    $body = @"
FROM maven:3.9-eclipse-temurin-23-alpine AS builder

WORKDIR /build

# settings.xml mirrors every repo to https://repo.maven.apache.org/maven2
# (no aliyun, no third-party proxy). Maven Central direct is the single
# source of truth so the build no longer depends on a flaky mirror.
COPY settings.xml /root/.m2/settings.xml

# Pre-warm a BuildKit cache mount with every runtime + provided dependency
# the service needs. The cache survives across `docker compose build`
# invocations and is shared between services that share Spring Boot deps,
# so the second service to build only fetches what the first one didn't.
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn -B -s /root/.m2/settings.xml -T 1C -Dmaven.artifact.threads=12 \
        dependency:resolve -DskipTests || true

COPY src src

# Build the fat jar from the same cache. Only the missing artifacts are
# pulled, and they're pulled in parallel via Maven Wagon's 12-thread pool.
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn -B -s /root/.m2/settings.xml -T 1C -Dmaven.artifact.threads=12 \
        package -DskipTests

FROM eclipse-temurin:23-jre-alpine AS runtime

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /build/target/*.jar app.jar

EXPOSE $($svc.Port)

USER appuser

ENTRYPOINT ["java", "-jar", "app.jar"]
"@
    Set-Content -Path $dockerfile -Value $body -Encoding UTF8
    Write-Host "Wrote $dockerfile"
}