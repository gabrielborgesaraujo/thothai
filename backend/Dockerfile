# --- Build: compila o jar com Maven + JDK 21 (alvo do projeto) ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Camada de cache das dependências (só refaz quando o pom muda).
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline

# Compila e empacota (testes rodam no CI/local, não na imagem).
COPY src ./src
RUN mvn -q -B -DskipTests clean package

# --- Runtime: apenas o JRE + o jar ---
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
