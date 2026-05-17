# ─── Stage 1: build ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install all deps (including dev) for the TypeScript build.
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ─── Stage 2: runtime ───────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# PORT is intentionally NOT set here — Render injects its own PORT (usually 10000).
# Local Docker runs can pass `-e PORT=4000` or rely on the app's 4000 fallback.

# Production-only deps to keep the image small.
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Compiled JS only — no source or tsx in the runtime image.
COPY --from=builder /app/dist ./dist

# Run as the non-root `node` user already present in the base image.
USER node
EXPOSE 4000
CMD ["node", "dist/src/index.js"]
