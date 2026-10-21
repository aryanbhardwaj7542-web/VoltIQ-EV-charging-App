# Multi-stage Dockerfile for VoltIQ Production Deployment
# Stage 1: Build Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY shared/ ../shared/
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY shared/ ../shared/
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_DIST_PATH=/app/client/dist

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/package*.json ./server/
COPY --from=server-builder /app/shared ./shared

WORKDIR /app/server
RUN npm ci --only=production

# Copy static frontend bundle to serve directly via Express SPA fallback
COPY --from=client-builder /app/client/dist /app/client/dist

EXPOSE 3001
CMD ["node", "dist/server/src/index.js"]
