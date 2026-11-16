FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system syndetis \
    && useradd --system --gid syndetis --home-dir /app syndetis \
    && mkdir -p /app/keys \
    && chown -R syndetis:syndetis /app
WORKDIR /app
COPY --from=build --chown=syndetis:syndetis /workspace/target/auth-service-0.0.1-SNAPSHOT.jar app.jar
COPY --chown=syndetis:syndetis docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod 500 /app/docker-entrypoint.sh
USER syndetis
EXPOSE 8081
ENTRYPOINT ["/app/docker-entrypoint.sh"]
