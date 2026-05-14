# Stoic AgentOS API — Railway Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY api/package*.json ./
RUN npm ci --production
COPY api/src ./src

ENV PORT=4444
EXPOSE 4444

CMD ["node", "src/server.js"]
