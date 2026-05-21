# Stoic AgentOS API — Railway Dockerfile
FROM node:22-alpine

WORKDIR /app
COPY api/package*.json ./
RUN npm ci --production && npm install tsx

COPY api/src ./src
COPY api/tsconfig.json ./tsconfig.json

ENV PORT=4444
EXPOSE 4444

CMD ["npx", "tsx", "src/server.ts"]

