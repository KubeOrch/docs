---
title: Troubleshooting
description: Common issues and solutions when running KubeOrch.
---

This page covers common problems and their solutions.

## Installation Issues

### orchcli init fails with "Docker not found"

**Cause**: Docker is not installed or not in your PATH.

**Solution**:
```bash
# Verify Docker is installed
docker --version

# If not installed, orchcli can auto-install it
# Or install manually: https://docs.docker.com/get-docker/

# Ensure Docker daemon is running
docker info
```

### orchcli init hangs during repository cloning

**Cause**: Network issues or GitHub authentication problems.

**Solution**:
```bash
# Test GitHub connectivity
git ls-remote https://github.com/KubeOrch/core.git

# If using SSH, verify your key
ssh -T git@github.com

# If behind a proxy, configure git
git config --global http.proxy http://proxy:port
```

### npm install fails for @kubeorch/cli

**Cause**: Node.js version too old or npm registry issues.

**Solution**:
```bash
# Requires Node.js 18+
node --version

# Clear npm cache and retry
npm cache clean --force
npm install -g @kubeorch/cli
```

## Startup Issues

### Services fail to start with "port already in use"

**Cause**: Another process is using port 8080 (core) or 3000 (ui).

**Solution**:
```bash
# Find what's using the port
# Linux/macOS
lsof -i :8080
lsof -i :3000

# Windows
netstat -ano | findstr :8080

# Kill the process or change the port in .env
PORT=8081 orchcli start
```

### MongoDB connection refused

**Cause**: MongoDB container hasn't finished starting or crashed.

**Solution**:
```bash
# Check MongoDB container status
docker compose ps mongo

# View MongoDB logs
docker compose logs mongo

# If the container keeps restarting, check disk space
df -h

# Remove corrupted data and restart (WARNING: data loss)
# docker compose down -v && docker compose up -d
```

### Core backend crashes on startup with "JWT_SECRET required"

**Cause**: Missing required environment variables.

**Solution**:
```bash
# Generate and set required secrets
export JWT_SECRET=$(openssl rand -hex 32)
export ENCRYPTION_KEY=$(openssl rand -hex 16)

# Or add to your .env file
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)" >> .env
```

## Cluster Connection Issues

### "Unable to connect to cluster" error

**Cause**: Invalid credentials, network issues, or expired tokens.

**Solutions**:

1. **Verify the cluster is reachable**:
```bash
kubectl cluster-info
```

2. **Check token validity**:
```bash
# If using service account token
kubectl get secret <sa-secret> -o jsonpath='{.data.token}' | base64 -d
```

3. **Test from the KubeOrch container**:
```bash
docker compose exec core wget -qO- --no-check-certificate \
  https://<cluster-api-server>:6443/healthz
```

4. **For minikube users**: Ensure the API server is accessible from Docker:
```bash
# Get minikube IP
minikube ip

# Use the IP instead of localhost when adding the cluster in KubeOrch
```

### Cluster shows "Unhealthy" status

**Cause**: Health check failing (runs every 60 seconds).

**Solution**:
```bash
# Check cluster health manually
kubectl get nodes
kubectl get componentstatuses

# Check KubeOrch logs for health check errors
docker compose logs core | grep -i "health"
```

## Workflow Issues

### Workflow deployment fails with "namespace not found"

**Cause**: The target namespace doesn't exist on the cluster.

**Solution**:
```bash
kubectl create namespace <namespace-name>
```

Or use the default namespace when deploying workflows.

### Nodes show "Error" state after deployment

**Cause**: Kubernetes resource creation failed.

**Solution**:
1. Click the node to view the error details in the diagnostics panel
2. Use the auto-fix suggestions if available
3. Check the Kubernetes events:
```bash
kubectl get events -n <namespace> --sort-by=.metadata.creationTimestamp
```

### Real-time status not updating

**Cause**: SSE connection dropped or resource watcher not running.

**Solution**:
1. Refresh the browser page to re-establish SSE connection
2. Check core logs for watcher errors:
```bash
docker compose logs core | grep -i "watcher\|sse"
```

## Build Issues

### Container build fails with "Nixpacks error"

**Cause**: Nixpacks cannot detect the project type or build configuration.

**Solution**:
1. Ensure the Git repository has a recognized project structure
2. Check that the repository URL is accessible from the KubeOrch container
3. View build logs for specific errors in the Build section

### Build logs not streaming

**Cause**: WebSocket connection issue.

**Solution**:
1. Check browser console for WebSocket errors
2. Ensure no proxy is blocking WebSocket connections
3. If using nginx, add WebSocket support:
```nginx
location /ws {
    proxy_pass http://core:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Authentication Issues

### "Invalid credentials" on login

**Cause**: Wrong email/password or account doesn't exist.

**Solution**:
1. Verify the email is correct
2. If first time, register a new account at `/register`
3. The first registered user automatically gets admin privileges

### OAuth login redirects to error page

**Cause**: OAuth provider misconfiguration.

**Solution**:
1. Verify the OAuth callback URL matches your deployment URL
2. Check the provider configuration in environment variables:
```bash
# Example for GitHub OAuth
OAUTH_GITHUB_CLIENT_ID=your-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-client-secret
OAUTH_GITHUB_CALLBACK_URL=https://your-domain.com/v1/api/auth/oauth/github/callback
```
3. Check core logs for OAuth errors:
```bash
docker compose logs core | grep -i "oauth"
```

### JWT token expired errors

**Cause**: Token TTL exceeded (default: 24 hours).

**Solution**: The UI should automatically refresh tokens. If issues persist:
1. Clear browser local storage
2. Log out and log back in
3. Check that the `TOKEN_TTL` environment variable is set correctly

## Performance Issues

### UI is slow or unresponsive

**Possible causes and solutions**:
1. **Too many nodes on canvas**: Simplify workflows or split into smaller ones
2. **Browser memory**: Close other tabs, check browser task manager
3. **API latency**: Check core response times in browser network tab

### API responses are slow

**Possible causes and solutions**:
1. **MongoDB queries**: Check MongoDB logs for slow queries
```bash
docker compose logs mongo | grep -i "slow"
```
2. **Resource watcher overload**: Too many clusters being monitored
3. **Container resources**: Increase Docker memory/CPU limits

## Getting Help

If your issue isn't listed here:

1. Search [existing issues](https://github.com/KubeOrch/core/issues) on GitHub
2. Open a new issue with:
   - KubeOrch version
   - Steps to reproduce
   - Error logs (`docker compose logs`)
   - Environment details (OS, Docker version, Kubernetes version)
3. Join the community on Slack: `#kubeorch`
