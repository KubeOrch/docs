---
title: Importing Projects
description: How to import Docker Compose files and Git repositories into KubeOrch workflows.
---

KubeOrch can automatically convert existing projects into visual workflows, saving you from manually recreating infrastructure.

## Supported Import Sources

| Source | How It Works |
|--------|-------------|
| **Docker Compose file** | Upload a `docker-compose.yml` file directly |
| **GitHub repository** | Provide a GitHub URL -- KubeOrch clones and detects compose files |
| **GitLab repository** | Provide a GitLab URL |
| **Generic Git URL** | Any `.git` URL |

## What Gets Converted

The import system analyzes your Docker Compose file and creates equivalent Kubernetes resources:

| Docker Compose | Kubernetes (KubeOrch Node) |
|---------------|---------------------------|
| `services:` entry | **Deployment** node (with image, ports, replicas) |
| `ports:` mapping | **Service** node (ClusterIP/NodePort) |
| `environment:` vars | **ConfigMap** or env vars on the Deployment |
| `volumes:` named | **PersistentVolumeClaim** node |
| `depends_on:` | **Edges** connecting dependent services |
| `build:` context | Flagged for Nixpacks build (source-to-image) |

## Import Flow

### File Upload

1. Click **Import** in the workflow canvas toolbar
2. Select **Upload File**
3. Choose your `docker-compose.yml` file
4. Preview the detected services, suggested nodes, and edges
5. Adjust if needed, then click **Apply**

### Git Repository

1. Click **Import** in the workflow canvas toolbar
2. Select **From Git**
3. Paste the repository URL (e.g., `https://github.com/org/project`)
4. Optionally specify a branch (defaults to `main`)
5. KubeOrch clones the repo (progress streamed via SSE), detects compose files, and analyzes
6. Preview and apply

### API Usage

#### Synchronous (file upload)

```bash
# Upload a docker-compose.yml
curl -X POST http://localhost:3000/v1/api/import/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@docker-compose.yml"
```

#### Asynchronous (Git repository)

```bash
# Start analysis (returns session ID for long-running clone operations)
curl -X POST http://localhost:3000/v1/api/import/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "github",
    "url": "https://github.com/org/project",
    "branch": "main"
  }'

# Poll session status or stream via SSE
curl http://localhost:3000/v1/api/import/:sessionId
curl http://localhost:3000/v1/api/import/:sessionId/stream  # SSE
```

## Auto-Layout

Imported nodes are automatically positioned on the canvas using the layout engine. The engine:

1. Groups services with their related resources (Service, ConfigMap, PVC)
2. Arranges dependent services vertically based on `depends_on` relationships
3. Spaces nodes to avoid overlap

## Source Builds

If a Docker Compose service uses `build:` instead of `image:`, KubeOrch flags it for a source-to-image build. The build config includes:

- **repoUrl** -- Git repository URL
- **branch** -- Target branch
- **buildContext** -- Docker build context path
- **useNixpacks** -- Whether to use Nixpacks (auto-detected)
- **dockerfile** -- Path to Dockerfile (if not using Nixpacks)

Users can trigger the build from the Build page, which clones the repo, builds the image with Nixpacks, and pushes to a configured container registry.
