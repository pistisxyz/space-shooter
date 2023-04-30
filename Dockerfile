FROM node:18-alpine

RUN apk update

RUN npm add -g pnpm

WORKDIR /app

COPY . .

RUN pnpm i

EXPOSE 8080

CMD [ "node", "server/main.js" ]