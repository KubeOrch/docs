---
title: Introduction
description: What is KubeOrch and why it exists.
---

KubeOrch is a visual Kubernetes orchestration platform that transforms the complexity of Kubernetes manifests into an intuitive drag-and-drop experience. Instead of writing hundreds of lines of YAML, users design their infrastructure visually on a canvas, connect components, and deploy with a single click.

## The Problem

Kubernetes is powerful but complex. Even deploying a simple web application requires writing multiple YAML manifests for Deployments, Services, Ingress, ConfigMaps, and more. This creates a steep learning curve and slows down development teams.

## The Solution

KubeOrch provides:

- **Visual Workflow Canvas** -- Drag Kubernetes resources onto a canvas and connect them visually
- **Smart Defaults** -- Every resource comes pre-configured with production-ready defaults
- **Auto-Wiring** -- Services automatically discover and link to their dependencies
- **One-Click Deploy** -- Transform your visual design into running Kubernetes resources instantly
- **Real-Time Feedback** -- Stream logs and resource status live from your clusters
- **Version Control** -- Track every change with built-in workflow versioning and diff comparison
- **Import Support** -- Import existing Docker Compose files or Git repositories and convert them to visual workflows

## Ecosystem Components

| Repository | Tech Stack | Purpose |
|-----------|------------|---------|
| **core** | Go, Gin, MongoDB, client-go | Backend API server handling workflow execution, K8s management, and real-time streaming |
| **ui** | Next.js 15, React Flow, Zustand, Tailwind | Visual frontend with drag-and-drop canvas and dashboard |
| **cli** | Go, Cobra, Docker Compose | Developer CLI (`orchcli`) for environment setup, service orchestration, and local development |
| **docs** | Astro, Starlight | This documentation site |

## Supported Kubernetes Resources

KubeOrch supports creating and managing these Kubernetes resource types through its visual canvas:

- **Deployment** -- Stateless workloads with configurable replicas, images, ports, and resources
- **StatefulSet** -- Stateful workloads with stable network identities and persistent storage
- **Service** -- ClusterIP, NodePort, and LoadBalancer service types
- **Ingress** -- HTTP routing with multi-path support and TLS
- **ConfigMap** -- Non-sensitive configuration data
- **Secret** -- Sensitive data (keys-only stored in DB, values pass-through to K8s)
- **PersistentVolumeClaim** -- Storage requests for stateful workloads
- **Job** -- Run-to-completion tasks
- **CronJob** -- Scheduled recurring tasks
- **DaemonSet** -- One pod per node workloads
- **HPA** -- Horizontal Pod Autoscaler for automatic scaling
- **NetworkPolicy** -- Network traffic control rules
- **Plugin (CRD)** -- Extensible Custom Resource Definition support
