# ==============================================================================
# VoltIQ EV Intelligence Platform — Multi-Stage Production Dockerfile
# Serves React client, Express API, and WebSocket from a single container.
# ==============================================================================

# ---- Stage 1: Build ----
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Upgrade npm to 11 to fix npm 10 workspace bug ("Cannot read properties of null (reading 'edgesOut')")
RUN npm install -g npm@11

# Copy workspace root manifests first (npm workspaces)
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

# Install ALL dependencies fresh on Linux (avoids Windows lockfile missing native bindings)
RUN rm -f package-lock.json && npm install

# Copy shared types (imported by both client and server)
COPY shared ./shared

# Copy and build client
COPY client ./client
RUN npm run build:client

# Copy and build server
COPY server ./server
RUN npm run build:server

# ---- Stage 2: Production Runtime ----
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_DIST_PATH=/app/client/dist

# Copy workspace root manifests for production install (no Windows lockfile)
COPY package.json ./
COPY server/package.json ./server/package.json

# Install only production dependencies for the server
RUN npm install --omit=dev --workspace=server --include-workspace-root

# Copy built server output (tsc output: server/dist/server/src/...)
COPY --from=build /app/server/dist ./server/dist

# Copy built client bundle
COPY --from=build /app/client/dist ./client/dist

# Copy shared types (runtime JS imports)
COPY --from=build /app/shared ./shared

EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
