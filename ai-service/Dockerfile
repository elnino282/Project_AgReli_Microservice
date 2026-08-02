FROM maven:3.9-eclipse-temurin-23-alpine AS builder

WORKDIR /build

# settings.xml mirrors every repo to https://repo.maven.apache.org/maven2
# (no aliyun, no third-party proxy). Maven Central direct is the single
# source of truth so the build no longer depends on a flaky mirror.
COPY settings.xml /root/.m2/settings.xml

# Pre-warm a BuildKit cache mount with every runtime + provided dependency
# the service needs. The cache survives across docker compose build
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

EXPOSE 8083

USER appuser

ENTRYPOINT ["java", "-jar", "app.jar"]
