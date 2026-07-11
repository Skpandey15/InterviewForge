# Parameterized build for both Spring services.
#   docker build -t aip/auth-service        --build-arg MODULE=auth-service        backend/
#   docker build -t aip/interview-platform  --build-arg MODULE=interview-platform  backend/
FROM maven:3.9-eclipse-temurin-17 AS build
ARG MODULE
WORKDIR /workspace

# Resolve dependencies first so source edits don't bust the dependency layer.
COPY pom.xml .
COPY auth-service/pom.xml auth-service/
COPY interview-platform/pom.xml interview-platform/
RUN mvn -q -pl ${MODULE} -am dependency:go-offline

COPY . .
RUN mvn -q -DskipTests -pl ${MODULE} -am package

FROM eclipse-temurin:17-jre-alpine
ARG MODULE
RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app
COPY --from=build /workspace/${MODULE}/target/${MODULE}-*.jar app.jar
# JVM respects container memory limits; tune Xmx via JAVA_TOOL_OPTIONS in k8s.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
