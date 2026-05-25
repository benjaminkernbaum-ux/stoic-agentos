# ═══════════════════════════════════════════════════════
#  Stoic AgentOS API — Production Dockerfile
# ═══════════════════════════════════════════════════════
#  Multi-stage build for minimal image size.
#  - Stage 1: Install deps (cached layer)
#  - Stage 2: Production runtime (slim)
#  - Health check built-in for Railway/Docker Compose
#  - Proper signal handling (Node.js as PID 1 issue resolved)
#  - Non-root user for security

# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only package files first for better cache utilization
COPY api/package.json api/package-lock.json ./

# Install production deps + tsx for TypeScript execution
RUN npm ci --production && npm install tsx

# ── Stage 2: Production runtime ──
FROM node:22-alpine AS runtime

# Security: run as non-root
RUN addgroup -g 1001 -S stoic && \
    adduser -S stoic -u 1001 -G stoic

WORKDIR /app

# Copy installed deps from builder stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy source code
COPY api/src ./src
COPY api/tsconfig.json ./tsconfig.json

# Set ownership
RUN chown -R stoic:stoic /app

# Switch to non-root user
USER stoic

# Environment
ENV NODE_ENV=production
ENV PORT=4444

EXPOSE 4444

# Health check — Railway uses this + our /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4444/health || exit 1

# Use exec form to ensure Node receives SIGTERM directly (PID 1)
# This enables graceful shutdown in our production.ts handler
CMD ["npx", "tsx", "src/server.ts"]
