FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
USER node
EXPOSE 7332
CMD ["node", "src/server.js"]
