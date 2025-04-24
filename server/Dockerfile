FROM node:23-alpine AS build
WORKDIR /usr/src/app

COPY package.json yarn.lock ./
RUN yarn

COPY . .
RUN yarn build 

FROM node:23-alpine
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/ ./
COPY --from=build /usr/src/app/bin ./bin 

EXPOSE 8080
CMD [ "node", "bin/app.js" ]