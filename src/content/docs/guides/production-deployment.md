---
title: Production Deployment
description: Deploy KubeOrch to production using Docker Compose or Kubernetes.
---

This guide covers deploying KubeOrch in a production environment.

## Prerequisites

- Docker and Docker Compose v2+
- A domain name (optional but recommended)
- TLS certificate (Let's Encrypt or similar)
- MongoDB 6.0+ instance (or use the bundled container)

## Option 1: Docker Compose (Recommended for Small Teams)

### 1. Create the Environment File

```bash
cat > .env <<EOF
# Core Backend
GIN_MODE=release
PORT=8080
MONGO_URI=mongodb://mongo:27017/kubeorch
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)
TOKEN_TTL=24h

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# MongoDB
MONGO_INITDB_DATABASE=kubeorch
EOF
```

### 2. Create the Compose File

```yaml
# docker-compose.production.yml
services:
  core:
    image: ghcr.io/kubeorch/core:latest
    restart: unless-stopped
    env_file: .env
    ports:
      - "8080:8080"
    depends_on:
      mongo:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  ui:
    image: ghcr.io/kubeorch/ui:latest
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=https://your-domain.com/api
    ports:
      - "3000:3000"
    depends_on:
      - core

  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo_data:
```

### 3. Start the Stack

```bash
docker compose -f docker-compose.production.yml up -d
```

### 4. Verify

```bash
# Check all services are running
docker compose -f docker-compose.production.yml ps

# Check core health
curl http://localhost:8080/health
```

## Option 2: Kubernetes

### 1. Create the Namespace

```bash
kubectl create namespace kubeorch
```

### 2. Create Secrets

```bash
kubectl create secret generic kubeorch-secrets \
  --namespace kubeorch \
  --from-literal=jwt-secret=$(openssl rand -hex 32) \
  --from-literal=encryption-key=$(openssl rand -hex 16) \
  --from-literal=mongo-uri=mongodb://mongo:27017/kubeorch
```

### 3. Deploy MongoDB

```yaml
# mongo.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
  namespace: kubeorch
spec:
  serviceName: mongo
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:7
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: data
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongo
  namespace: kubeorch
spec:
  selector:
    app: mongo
  ports:
    - port: 27017
```

### 4. Deploy Core Backend

```yaml
# core.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core
  namespace: kubeorch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: core
  template:
    metadata:
      labels:
        app: core
    spec:
      containers:
        - name: core
          image: ghcr.io/kubeorch/core:latest
          ports:
            - containerPort: 8080
          env:
            - name: GIN_MODE
              value: release
            - name: PORT
              value: "8080"
            - name: MONGO_URI
              valueFrom:
                secretKeyRef:
                  name: kubeorch-secrets
                  key: mongo-uri
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: kubeorch-secrets
                  key: jwt-secret
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: kubeorch-secrets
                  key: encryption-key
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: core
  namespace: kubeorch
spec:
  selector:
    app: core
  ports:
    - port: 8080
```

### 5. Deploy UI Frontend

```yaml
# ui.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ui
  namespace: kubeorch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ui
  template:
    metadata:
      labels:
        app: ui
    spec:
      containers:
        - name: ui
          image: ghcr.io/kubeorch/ui:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_API_URL
              value: https://your-domain.com/api
---
apiVersion: v1
kind: Service
metadata:
  name: ui
  namespace: kubeorch
spec:
  selector:
    app: ui
  ports:
    - port: 3000
```

### 6. Create Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubeorch
  namespace: kubeorch
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - your-domain.com
      secretName: kubeorch-tls
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: core
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ui
                port:
                  number: 3000
```

### 7. Apply All Manifests

```bash
kubectl apply -f mongo.yaml
kubectl apply -f core.yaml
kubectl apply -f ui.yaml
kubectl apply -f ingress.yaml
```

## TLS/HTTPS Configuration

### With Docker Compose (nginx reverse proxy)

Add an nginx service to your compose file:

```yaml
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - core
      - ui
```

### With Kubernetes

Use [cert-manager](https://cert-manager.io/) for automatic TLS:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

Then create a ClusterIssuer for Let's Encrypt and reference it in the Ingress annotation as shown above.

## Database Backup and Recovery

### Backup

```bash
# Docker Compose
docker compose exec mongo mongodump --out /data/backup
docker compose cp mongo:/data/backup ./backup-$(date +%Y%m%d)

# Kubernetes
kubectl exec -n kubeorch mongo-0 -- mongodump --out /data/backup
kubectl cp kubeorch/mongo-0:/data/backup ./backup-$(date +%Y%m%d)
```

### Restore

```bash
# Docker Compose
docker compose cp ./backup mongo:/data/backup
docker compose exec mongo mongorestore /data/backup

# Kubernetes
kubectl cp ./backup kubeorch/mongo-0:/data/backup
kubectl exec -n kubeorch mongo-0 -- mongorestore /data/backup
```

### Automated Backups

For production, schedule regular backups using a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongo-backup
  namespace: kubeorch
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mongo:7
              command:
                - mongodump
                - --uri=mongodb://mongo:27017/kubeorch
                - --out=/backup/$(date +\%Y\%m\%d)
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              persistentVolumeClaim:
                claimName: backup-pvc
          restartPolicy: OnFailure
```

## Environment Variables Reference

See the [Configuration](/reference/configuration) page for all available environment variables.
