# Dockerfile for Node.js / Express Backend
# Practical 11: Containerization with Docker and Docker Compose

FROM node:20-alpine

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose backend API port
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
