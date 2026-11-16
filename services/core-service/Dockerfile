FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre AS runtime
RUN groupadd --system syndetis && useradd --system --gid syndetis --home-dir /app syndetis
WORKDIR /app
COPY --from=build --chown=syndetis:syndetis /workspace/target/core-service-0.0.1-SNAPSHOT.jar app.jar
USER syndetis
EXPOSE 8082
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
