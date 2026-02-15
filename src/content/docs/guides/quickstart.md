---
title: Quick Start
description: Get KubeOrch running locally in minutes using orchcli.
---

The fastest way to get KubeOrch running is with **orchcli**, the official developer CLI. It handles Docker Compose orchestration, repository cloning, and dependency installation automatically.

## Prerequisites

- **Docker** and **Docker Compose** (v2) installed and running
- **Git** installed (orchcli can auto-install it on Linux/macOS)

## Install orchcli

```bash
# Option 1: Shell script (Linux/macOS)
curl -sfL https://raw.githubusercontent.com/KubeOrch/cli/main/install.sh | sh

# Option 2: NPM (all platforms)
npm install -g @kubeorch/cli

# Option 3: Go
go install github.com/kubeorch/cli@latest
```

Verify installation:

```bash
orchcli --version
```

---

## Quick Start: Try KubeOrch (Production Mode)

Run the full platform from pre-built Docker images -- no source code needed.

```bash
# Create a project directory
mkdir kubeorch && cd kubeorch

# Initialize (production mode -- no repos cloned)
orchcli init

# Start all services in background
orchcli start -d
```

That's it. Open your browser:

| Service | URL |
|---------|-----|
| **UI** | [http://localhost:3001](http://localhost:3001) |
| **API** | [http://localhost:3000](http://localhost:3000) |
| **MongoDB** | `localhost:27017` |

### First Steps After Launch

1. **Register** -- Go to `http://localhost:3001/signup`. The first user automatically becomes admin.
2. **Add a Cluster** -- Dashboard > Clusters > Add Cluster. Connect using kubeconfig, bearer token, or another supported auth method.
3. **Create a Workflow** -- Workflows > New Workflow. Select your cluster, then drag resources onto the canvas.
4. **Deploy** -- Click the **Run** button to deploy your workflow to Kubernetes.

### Manage Services

```bash
orchcli status          # Check health of all services
orchcli logs -f         # Follow all logs
orchcli logs core       # View only Core API logs
orchcli stop            # Stop everything
orchcli stop -v         # Stop and remove volumes (clean slate)
```

---

## Development Setup: Full Stack

For contributing to both frontend and backend.

```bash
mkdir kubeorch && cd kubeorch

# Clone both repos + install dependencies
orchcli init --fork-ui --fork-core

# Start MongoDB in Docker
orchcli start -d

# Terminal 1: Start Core backend (hot reload with Air)
cd core && air

# Terminal 2: Start UI frontend (hot reload with Next.js)
cd ui && npm run dev
```

Edit files in `core/` or `ui/` -- changes hot-reload automatically.

---

## Development Setup: Frontend Only

For UI development without needing Go installed.

```bash
mkdir kubeorch && cd kubeorch

# Clone UI repo only
orchcli init --fork-ui

# Start MongoDB + Core API in Docker
orchcli start -d

# Start UI locally with hot reload
cd ui && npm run dev
```

The Core API runs from a Docker image at `localhost:3000`. You only need Node.js.

---

## Development Setup: Backend Only

For backend development without needing Node.js installed.

```bash
mkdir kubeorch && cd kubeorch

# Clone Core repo only
orchcli init --fork-core

# Start everything (Core with mounted code + hot reload via Air)
orchcli start -d
```

Your Core source code is volume-mounted into the Docker container. Edit files locally and they hot-reload inside Docker -- no Go installation required on the host.

---

## Contributing from a Fork

External contributors can clone from their own forks:

```bash
mkdir kubeorch && cd kubeorch

# Clone from your fork
orchcli init --fork-ui=youruser/ui --fork-core=youruser/core

# Upstream remote is auto-configured
cd ui && git remote -v
# origin    https://github.com/youruser/ui (fetch)
# upstream  https://github.com/KubeOrch/ui (fetch)

orchcli start -d
```

---

## Debugging

If something isn't working:

```bash
# Check service status and health
orchcli status

# Debug network connectivity between containers
orchcli debug

# Execute a command inside a container
orchcli exec core sh
orchcli exec ui sh

# View recent logs for a specific service
orchcli logs --tail 50 core
```

---

## Manual Setup (Without orchcli)

If you prefer manual setup without the CLI:

### 1. Start MongoDB

```bash
docker run -d --name kubeorch-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=kubeorch \
  mongo:8.0
```

### 2. Start the Core Backend

```bash
git clone https://github.com/KubeOrch/core.git && cd core
cp config.yaml.example config.yaml
# Edit config.yaml: set MONGO_URI, JWT_SECRET, ENCRYPTION_KEY
go run main.go
```

### 3. Start the UI

```bash
git clone https://github.com/KubeOrch/ui.git && cd ui
npm install
# Create .env.local with: NEXT_PUBLIC_API_URL=http://localhost:3000/v1/api
npm run dev
```

### Required Core Configuration

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string (e.g., `mongodb://localhost:27017/kubeorch`) |
| `JWT_SECRET` | Secret key for JWT tokens |
| `ENCRYPTION_KEY` | Key for encrypting cluster credentials at rest |
