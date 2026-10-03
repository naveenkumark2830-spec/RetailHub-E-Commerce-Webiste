# Multi-stage Dockerfile for RetailHub E-Commerce & Telemetry Platform

# ====================================================
# Stage 1: Build React Frontend
# ====================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ====================================================
# Stage 2: Build TypeScript Backend API
# ====================================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ====================================================
# Stage 3: Production Container Runner
# ====================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy compiled backend code
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy compiled frontend static bundle for SPA serving
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose backend API and web portal port
EXPOSE 5000

# Container Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Launch platform server
CMD ["node", "backend/dist/index.js"]