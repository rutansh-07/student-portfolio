# Practical 11: Containerization with Docker and Docker Compose

| Field | Details |
|---|---|
| **Course** | Advanced Web Development Frameworks (AWDF) - Semester 5 |
| **Student Name** | Rutansh Govardhan |
| **Roll Number** | 24DCE045 |
| **Course Outcome / Program Outcome** | CO5 / PO3, PO5 |
| **Topic** | Containerization with Docker and Docker Compose |

---

## 1. Aim
To containerize the full-stack application using Docker and orchestrate all services using Docker Compose.

---

## 2. Problem Statement & Objectives
* Write a multi-stage `Dockerfile` for the React frontend of the Task Management application (built and served on port `5173`).
* Write a `Dockerfile` for the Node.js / Express backend application (listening on port `5000`).
* Create a `docker-compose.yml` file that orchestrates all 3 services: **frontend**, **backend**, and **MongoDB**.
* Configure correct port mappings, environment variables, and an internal Docker bridge network (`app-network`) so that the services communicate seamlessly.
* Ensure the entire full-stack application boots with a single command: `docker-compose up` (or `docker compose up`), with zero manual configuration steps in between.

---

## 3. Architecture & Container Network Diagram

```
                              docker-compose.yml
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ▼                    ▼                    ▼
     ┌───────────────────────┐ ┌──────────────┐ ┌────────────────────┐
     │  frontend (Service)   │ │   backend    │ │  mongodb (Service) │
     │  React + Vite Preview │ │ Node/Express │ │  Official Image    │
     │  Port: 5173:5173      │ │  Port: 5000  │ │  Port: 27017:27017 │
     └───────────┬───────────┘ └──────┬───────┘ └─────────┬──────────┘
                 │                    │                   │
                 │                    │  mongodb://mongodb:27017
                 │                    │───────────────────►
                 │                    │
                 └────────────────────┴───────────────────┘
                                  │
                       Bridge Network: app-network
                   (Internal DNS: frontend, backend, mongodb)
```

### Communication Flow:
1. **User Browser (Host):**
   * Accesses Frontend UI at `http://localhost:5173`
   * API requests route to Backend at `http://localhost:5000`
2. **Backend to Database (Internal Container Network):**
   * Express backend connects to MongoDB using the service name as host: `mongodb://mongodb:27017/task_management_db`
3. **Data Persistence:**
   * MongoDB database files persist via named volume `mongo-data` across container restarts.

---

## 4. Theory & Key Concepts

### 4.1 Containerization with Docker
Containers package application source code, runtime, system tools, and dependencies into an isolated, lightweight, immutable unit. This eliminates the "it works on my machine" problem and guarantees environment parity across development, testing, and production.

### 4.2 Multi-Stage Docker Builds
For the React frontend, a multi-stage build is utilized:
* **Stage 1 (Builder):** Installs all dependencies (including build tools like Vite) and compiles JSX into optimized static assets in `/app/dist`.
* **Stage 2 (Runner):** Uses a clean, minimal Alpine Linux image copying only the built `/app/dist` folder and production server, significantly reducing final image size and attack surface.

### 4.3 Multi-Container Orchestration with Docker Compose
`docker-compose.yml` defines the multi-container application specification:
* Declaratively specifies services, build contexts, environment variables, dependencies (`depends_on`), port mappings, and persistent volumes.
* Creates an isolated bridge network (`app-network`) with automatic service discovery via Docker's built-in DNS.

---

## 5. Implementation Files

### 5.1 Frontend `Dockerfile` (`student-portfolio/Dockerfile`)
```dockerfile
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
```

### 5.2 Backend `Dockerfile` (`student-portfolio/task-manager-api/Dockerfile`)
```dockerfile
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
```

### 5.3 Docker Compose File (`student-portfolio/docker-compose.yml`)
```yaml
version: '3.8'

# Practical 11: Containerization with Docker and Docker Compose
# Orchestrates 3 services: frontend, backend, and mongodb on an internal bridge network

services:
  # 1. MongoDB Database Service
  mongodb:
    image: mongo:latest
    container_name: task-manager-mongodb
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network

  # 2. Node.js & Express Backend API Service
  backend:
    build:
      context: ./task-manager-api
      dockerfile: Dockerfile
    container_name: task-manager-backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/task_management_db
      - JWT_SECRET=supersecretjwtkey_awdf_lab_2026
    depends_on:
      - mongodb
    networks:
      - app-network

  # 3. React Frontend Service (Built + Served on Port 5173)
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: task-manager-frontend
    restart: always
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:5000
    depends_on:
      - backend
    networks:
      - app-network

# Internal Docker bridge network for inter-service communication
networks:
  app-network:
    driver: bridge

# Persistent volume for MongoDB database files
volumes:
  mongo-data:
```

---

## 6. Commands to Run & Verify

### 1. Build and Start All Containers:
```bash
docker-compose up --build
```
*(Or in detached mode:)*
```bash
docker-compose up --build -d
```

### 2. Verify Running Containers:
```bash
docker-compose ps
```
**Expected Output:**
```text
NAME                     IMAGE                           COMMAND                  SERVICE      CREATED         STATUS         PORTS
task-manager-frontend    student-portfolio-frontend      "docker-entrypoint.s…"   frontend     1 minute ago    Up 1 minute    0.0.0.0:5173->5173/tcp
task-manager-backend     student-portfolio-backend       "docker-entrypoint.s…"   backend      1 minute ago    Up 1 minute    0.0.0.0:5000->5000/tcp
task-manager-mongodb     mongo:latest                    "docker-entrypoint.s…"   mongodb      1 minute ago    Up 1 minute    0.0.0.0:27017->27017/tcp
```

### 3. Check Service Logs:
```bash
# View backend logs (including MongoDB connection and Event-Driven logs):
docker-compose logs -f backend

# View frontend preview logs:
docker-compose logs -f frontend
```

### 4. Stop All Containers:
```bash
docker-compose down
```

---

## 7. Result
Successfully containerized the full-stack Student Portfolio & Task Management application. The React frontend, Express.js backend, and MongoDB database are defined in modular Dockerfiles and orchestrated as multi-container services using Docker Compose with dedicated port mappings (`5173`, `5000`, `27017`), volume persistence (`mongo-data`), and internal bridge networking (`app-network`). The entire application stack starts with a single `docker-compose up` command.

---

## 8. Conclusion
Docker and Docker Compose streamline the deployment and management of multi-tier web architectures. Multi-stage builds optimize production image size for the React frontend, while Docker Compose automates dependency resolution, environment configuration, and internal network routing. This guarantees environment consistency and production readiness across any host system.
