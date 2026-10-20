# Dockerfile for React Frontend
# Practical 11: Containerization with Docker and Docker Compose
# Multi-stage build: Build React + Vite app and serve on port 5173

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy source code
COPY . .

# Build the production React app
RUN npm run build

# Stage 2: Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install minimal production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and config from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.js ./

# Expose Vite preview port
EXPOSE 5173

# Serve built application on port 5173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
