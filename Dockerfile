
# VoltIQ full-stack production Dockerfile
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Install dependencies using the root npm workspace lockfile
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci

# Copy source code and build both applications
COPY shared ./shared
COPY client ./client
COPY server ./server

RUN npm run build

# Production runtime
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_DIST_PATH=/app/client/dist

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/shared ./shared
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
