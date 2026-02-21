---
title: Real-Time & Monitoring
description: SSE broadcaster, resource watchers, and cluster health monitoring for the KubeOrch core backend.
---

## SSE Broadcaster

The `SSEBroadcaster` is a singleton pub/sub hub for all real-time streams, initialized once at startup via `GetSSEBroadcaster()` using `sync.Once` for thread-safe initialization.

The broadcaster holds a `subscribers` map keyed by stream key (e.g., `workflow:<id>`, `resource:<id>`), with each key mapping to a slice of buffered Go channels. `Subscribe(streamKey, bufferSize)` creates and registers a channel. `Publish(event)` fans out to all subscribers for that key in a non-blocking manner -- if a subscriber's channel buffer is full, the event is dropped for that subscriber rather than blocking the publisher. This prevents a slow frontend client from stalling resource watcher updates for all other clients.

The broadcaster is stopped during graceful shutdown before the HTTP server is shut down, ensuring that all open SSE streams are terminated cleanly rather than being cut mid-stream.

## Resource Watcher

`ResourceWatcher` establishes Kubernetes informer watch loops for resources deployed by the workflow executor. The watcher maps 14 resource types to their GroupVersionResource (GVR) identifiers:

```
deployment, service, statefulset, daemonset, job, cronjob,
ingress, configmap, secret, pvc, pod, replicaset, hpa, networkpolicy
```

Each watch loop runs with exponential backoff on failure: 5 seconds base delay, 60 seconds maximum. On any resource change event, the watcher:

1. Runs a type-specific status extractor to determine the resource's current health
2. Writes the updated status to MongoDB via `updateWorkflowStatus`
3. Publishes a `StreamEvent` to both `workflow:<id>` and `resource:<id>` stream keys via `SSEBroadcaster`

Frontend clients subscribed to those SSE streams receive the updates immediately without polling.

The `ResourceWatcherManager` is a centralized singleton lifecycle manager for all active Kubernetes informer watch loops. The manager tracks which workflow resources are being watched and handles starting and stopping watchers as workflows are executed or archived. All active watchers are stopped as the first step of graceful shutdown, ensuring open connections to the Kubernetes API server are released before the HTTP server begins its shutdown sequence.

## Cluster Health Monitor

`ClusterHealthMonitor` runs as a singleton background service, initialized once at startup via `GetClusterHealthMonitor()`. Its design avoids spawning unbounded goroutines when many clusters are registered:

- The monitor wakes every 60 seconds and calls `checkAllClusters()`
- `checkAllClusters()` uses a fixed pool of 5 worker goroutines to process all registered clusters concurrently. This caps the number of simultaneous Kubernetes API calls regardless of how many clusters are registered
- Each worker calls `checkClusterHealth()`, which attempts a lightweight API server ping via `KubernetesClusterService` and writes the result (reachable/unreachable, latency, timestamp) to MongoDB
- A `metadataStalenessThreshold` of 10 minutes is enforced: if a cluster's metadata has not been refreshed within that window, it is treated as stale and re-fetched on the next cycle
- `CheckSingleCluster()` is a synchronous variant used by cluster CRUD endpoints to provide immediate reachability feedback when a user registers or edits a cluster, without waiting for the next background cycle
