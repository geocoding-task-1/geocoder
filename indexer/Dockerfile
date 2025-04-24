FROM gradle:8.13.0-jdk21 as build
WORKDIR /app

COPY . /app
RUN gradle build

FROM eclipse-temurin:23
WORKDIR /app
COPY --from=build /app/app/build/libs/app.jar /app/preprocess.jar

CMD [ "java", "-jar", "/app/preprocess.jar" ] 
