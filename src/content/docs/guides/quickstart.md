---
title: Quick Start
description: Get KubeOrch running locally in minutes using orchcli.
---

The fastest way to get KubeOrch running is with **orchcli**, the official developer CLI. It handles Docker Compose orchestration, repository cloning, dependency installation, and configuration automatically.

## Prerequisites

- **Docker** and **Docker Compose** (v2) installed and running
- **Git** installed (orchcli can auto-install it on Linux/macOS)

Depending on your setup path, you may also need:

| Setup | Additional Requirements |
|-------|----------------------|
| Production Mode | None -- everything runs in Docker |
| Frontend Development | **Node.js 20+** |
| Backend Development | None -- Go runs inside Docker via Air |
| Full Stack Development | **Node.js 20+** and **Go 1.25+** |
| Manual Setup | **Node.js 20+** and **Go 1.25+** |

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

# Initialize and start
orchcli init
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

For contributing to both frontend and backend. Requires **Node.js 20+** and **Go 1.25+**.

```bash
mkdir kubeorch && cd kubeorch

# Clone both repos, install deps, and generate config files
orchcli init --fork-ui --fork-core

# Start MongoDB in Docker
orchcli start -d
```

Then in separate terminals:

```bash
# Terminal 1: Start Core backend (hot reload with Air)
cd core && air

# Terminal 2: Start UI frontend (hot reload with Next.js)
cd ui && npm run dev
```

In this mode, `orchcli start -d` only runs **MongoDB** in Docker. Both Core and UI run on your host machine with hot reload.

`orchcli init` automatically generates:
- `core/config.yaml` -- with random JWT secret, encryption key, and MongoDB URI pointing to `localhost:27017`
- `ui/.env.local` -- with `NEXT_PUBLIC_API_URL` pointing to the Core API

Edit files in `core/` or `ui/` -- changes hot-reload automatically.

---

## Development Setup: Frontend Only

For UI development without needing Go installed. Requires **Node.js 20+**.

```bash
mkdir kubeorch && cd kubeorch

# Clone UI repo, install deps, and generate .env.local
orchcli init --fork-ui

# Start MongoDB + Core API in Docker
orchcli start -d

# Start UI locally with hot reload
cd ui && npm run dev
```

In this mode, `orchcli start -d` runs **MongoDB and Core API** in Docker. The Core API is available at `localhost:3000`. You only need Node.js.

`orchcli init` automatically generates `ui/.env.local` with the API URL.

---

## Development Setup: Backend Only

For backend development without needing Node.js installed. No Go installation required on the host either -- the Core code is volume-mounted into a Docker container running Air for hot reload.

```bash
mkdir kubeorch && cd kubeorch

# Clone Core repo, install deps, and generate config.yaml
orchcli init --fork-core

# Start everything (Core with mounted code + hot reload via Air)
orchcli start -d
```

In this mode, `orchcli start -d` runs **MongoDB, Core (via Air), and UI** all in Docker. Your Core source code is volume-mounted, so edits on the host hot-reload inside the container.

`orchcli init` automatically generates `core/config.yaml` with default values.

---

## Contributing from a Fork

External contributors can clone from their own forks:

```bash
mkdir kubeorch && cd kubeorch

# Clone from your fork (config files are auto-generated)
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
orchcli exec mongodb mongosh kubeorchestra

# View recent logs for a specific service
orchcli logs --tail 50 core
```

---

## Manual Setup (Without orchcli)

If you prefer manual setup without the CLI. Requires **Node.js 20+** and **Go 1.25+**.

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
```

Edit `config.yaml` with these minimal values for local development:

```yaml
MONGO_URI: "mongodb://localhost:27017/kubeorch"
JWT_SECRET: "any-secret-key-for-local-dev"
ENCRYPTION_KEY: "any-encryption-key-for-local-dev"
PORT: 3000
GIN_MODE: debug
```

Then start the server:

```bash
go run main.go
```

### 3. Start the UI

```bash
git clone https://github.com/KubeOrch/ui.git && cd ui
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/v1/api
```

Then start the dev server:

```bash
npm run dev
```

The UI will be available at `http://localhost:3001`.

### Required Core Configuration

These are the key settings. For the full reference including authentication providers (OIDC, OAuth2), CORS, and all available options, see the [Configuration Reference](/reference/configuration/).

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string (e.g., `mongodb://localhost:27017/kubeorch`) |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `ENCRYPTION_KEY` | No | Key for encrypting cluster credentials at rest |
| `PORT` | No | Server port (default: `3000`) |
| `GIN_MODE` | No | `debug` or `release` (default: `debug`) |
| `BASE_URL` | No | Backend URL for OAuth callbacks (default: `http://localhost:3000`) |
| `FRONTEND_URL` | No | Frontend URL for OAuth redirects (default: `http://localhost:3001`) |
