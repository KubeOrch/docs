---
title: Data Models
description: Core data structures used across the KubeOrch platform.
---

This page documents the key data models shared between the core backend and UI frontend.

## Workflow

The central entity -- represents a complete Kubernetes application topology.

```
Workflow
├── id                  ObjectID     Primary key
├── name                string       Display name
├── description         string       User description
├── cluster_id          string       Target Kubernetes cluster
├── status              enum         "draft" | "published" | "archived"
├── tags                string[]     User-defined tags
│
├── nodes               Node[]       Current canvas nodes
├── edges               Edge[]       Current canvas edges
│
├── versions            Version[]    (Legacy) embedded version history
├── current_version     int          Latest version number
│
├── owner_id            ObjectID     User who owns this workflow
├── team_id             string       (Optional) team ownership
│
├── created_at          timestamp
├── updated_at          timestamp
├── deleted_at          timestamp?   Soft delete
├── last_run_at         timestamp?
│
├── run_count           int          Total execution count
├── success_count       int          Successful runs
└── failure_count       int          Failed runs
```

## Workflow Node

A node on the canvas representing a Kubernetes resource.

```
WorkflowNode
├── id                  string       Unique node identifier
├── type                string       Resource type (see Node Types below)
├── position            { x, y }     Canvas coordinates
└── data                object       Type-specific configuration (see below)
```

## Workflow Edge

A connection between two nodes.

```
WorkflowEdge
├── id                  string       Unique edge identifier
├── source              string       Source node ID
├── target              string       Target node ID
├── sourceHandle        string?      Source port (for multi-port nodes like Ingress)
├── targetHandle        string?      Target port
└── type                string?      Edge rendering type
```

## Node Types and Data Structures

### Deployment

```
DeploymentNodeData
├── name                string       Deployment name
├── namespace           string?      Kubernetes namespace
├── image               string       Container image (e.g., "nginx:1.25")
├── replicas            number       Desired replica count
├── port                number       Container port
├── env                 object?      Environment variables (key-value)
├── envKeys             EnvVarEntry[]?  Env var key definitions
├── resources           object?      CPU/memory limits and requests
├── labels              object?      Kubernetes labels
├── volumeMounts        VolumeMount[]?  Mounted ConfigMaps/Secrets/PVCs
└── templateId          string?      Reference to template definition
```

### Service

```
ServiceNodeData
├── name                string       Service name
├── serviceType         enum         "ClusterIP" | "NodePort" | "LoadBalancer"
├── targetApp           string       Name of the target deployment
├── port                number       Service port
├── targetPort          number?      Container target port
├── ports               PortDef[]?   Multi-port definitions
├── selector            object?      Pod selector labels
└── _linkedDeployment   string?      (Internal) Linked deployment node ID
```

### Ingress

```
IngressNodeData
├── name                string       Ingress name
├── host                string?      Hostname (e.g., "app.example.com")
├── paths               IngressPath[] Multi-path routing rules
│   ├── id              string
│   ├── path            string       URL path (e.g., "/api")
│   ├── pathType        enum         "Prefix" | "Exact"
│   ├── serviceName     string?      Backend service name
│   ├── servicePort     number?      Backend service port
│   └── _linkedService  string?      Linked service node ID
├── ingressClassName    string?      Ingress controller class
├── tlsEnabled          boolean?     Enable TLS
├── tlsSecretName       string?      TLS certificate secret
└── annotations         object?      Controller-specific annotations
```

### ConfigMap

```
ConfigMapNodeData
├── name                string
├── data                object       Key-value pairs (stored in MongoDB)
└── mountPath           string?      Container mount path (default: /etc/config)
```

### Secret

```
SecretNodeData
├── name                string
├── secretType          enum         "Opaque" | "kubernetes.io/tls" | "kubernetes.io/dockerconfigjson"
├── keys                SecretKeyEntry[]   Key names only (values NOT stored in DB)
│   ├── id              string
│   └── name            string
└── mountPath           string?      Container mount path (default: /etc/secrets)
```

### StatefulSet

```
StatefulSetNodeData
├── name                string
├── serviceName         string       Headless service name (required)
├── image               string
├── replicas            number
├── port                number
├── volumeClaimTemplates VolumeClaimTemplate[]?  Storage templates
└── ... (env, resources, volumeMounts - same as Deployment)
```

### Job

```
JobNodeData
├── name                string
├── image               string
├── command             string[]?    Container command
├── args                string[]?    Command arguments
├── completions         number?      Required successful completions
├── parallelism         number?      Max concurrent pods
├── backoffLimit        number?      Retry limit
├── activeDeadlineSeconds number?    Max runtime
├── ttlSecondsAfterFinished number?  Auto-cleanup delay
└── restartPolicy       enum         "Never" | "OnFailure"
```

### CronJob

```
CronJobNodeData
├── name                string
├── schedule            string       Cron expression (e.g., "0 2 * * *")
├── image               string
├── concurrencyPolicy   enum         "Allow" | "Forbid" | "Replace"
├── suspend             boolean?
├── successfulJobsHistoryLimit number?
├── failedJobsHistoryLimit     number?
└── ... (command, args, env, resources - same as Job)
```

### Other Node Types

- **DaemonSet** -- Per-node workloads with `nodeSelector`, `tolerations`, `hostNetwork`
- **HPA** -- Auto-scaling with `minReplicas`, `maxReplicas`, CPU/memory targets
- **NetworkPolicy** -- Traffic control with `policyTypes`, ingress/egress rules
- **PersistentVolumeClaim** -- Storage with `storageClassName`, `accessModes`, `storage` size
- **Plugin** -- Dynamic CRD nodes with user-defined fields from `_pluginFields`

## Cluster

```
Cluster
├── id                  ObjectID
├── name                string       URL-safe unique name
├── displayName         string       Human-readable name
├── description         string?
├── server              string       Kubernetes API server URL
├── authType            enum         "kubeconfig" | "token" | "certificate" | "serviceaccount" | "oidc"
├── credentials         object       (Encrypted at rest, never returned in API)
├── status              enum         "connected" | "disconnected" | "error" | "unknown"
├── default             boolean      Is this the default cluster
├── metadata
│   ├── version         string       Kubernetes version
│   ├── platform        string       Platform (e.g., "minikube", "eks")
│   ├── nodeCount       number
│   ├── namespaces      string[]
│   └── capabilities    string[]
├── userId              ObjectID     Owner
├── sharedWith          ObjectID[]   Users with access
└── labels              object       User-defined labels
```

## User

```
User
├── id                  ObjectID
├── name                string
├── email               string       (Unique)
├── password            string       (bcrypt hash, omitted for OAuth users)
├── role                enum         "admin" | "user"
├── avatarUrl           string?      Gravatar or OAuth provider avatar
├── authProvider        string?      OAuth provider name (if applicable)
├── providerUserId      string?      External provider user ID
├── createdAt           timestamp
└── updatedAt           timestamp
```

## Build

```
Build
├── id                  ObjectID
├── userId              ObjectID
├── workflowId          ObjectID?
├── repoUrl             string       Git repository URL
├── branch              string       Target branch
├── registryId          string       Target container registry
├── imageName           string
├── imageTag            string
├── useNixpacks         boolean
├── status              enum         "pending" | "cloning" | "building" | "pushing" | "completed" | "failed" | "cancelled"
├── progress            number       0-100
├── finalImageRef       string?      Full image reference after push
└── duration            number?      Build time in ms
```
