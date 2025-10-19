# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

COPY package.json ./

RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev || true; fi

COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]
