# Stoic AgentOS MCP Server — Railway Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY index.js ./

# Railway injects PORT automatically; default fallback for local testing
ENV PORT=3100
EXPOSE 3100

CMD ["node", "index.js"]
