# Offly Helm Chart

Modern time off and absence management system with Go backend (gRPC + REST) and React frontend.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- MongoDB (optional, can be deployed with this chart)

## Installing the Chart

To install the chart with the release name `offly`:

```bash
helm install offly ./helm/offly
```

To install with custom values:

```bash
helm install offly ./helm/offly -f custom-values.yaml
```

## Uninstalling the Chart

To uninstall/delete the `offly` deployment:

```bash
helm uninstall offly
```

## Configuration

The following table lists the configurable parameters of the Offly chart and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Image repository | `bananaops/offly` |
| `image.tag` | Image tag | `""` (uses appVersion) |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.http.port` | HTTP/REST API port | `8080` |
| `service.grpc.port` | gRPC port | `50051` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `traefik` |
| `ingress.hosts` | Ingress hosts configuration | `[{host: offly.local, paths: [{path: /, pathType: ImplementationSpecific}]}]` |
| `mongodb.enabled` | Enable MongoDB deployment | `true` |
| `mongodb.auth.enabled` | Enable MongoDB authentication | `false` |
| `env.db.host` | MongoDB host | `offly-mongodb` |
| `env.db.port` | MongoDB port | `27017` |
| `env.db.name` | MongoDB database name | `offly` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `256Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `autoscaling.enabled` | Enable horizontal pod autoscaling | `false` |
| `autoscaling.minReplicas` | Minimum number of replicas | `1` |
| `autoscaling.maxReplicas` | Maximum number of replicas | `2` |

## Examples

### Install with external MongoDB

```yaml
# custom-values.yaml
mongodb:
  enabled: false

env:
  db:
    host: my-external-mongodb.example.com
    port: 27017
    name: offly
```

```bash
helm install offly ./helm/offly -f custom-values.yaml
```

### Install with custom ingress

```yaml
# custom-values.yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: offly.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: offly-tls
      hosts:
        - offly.example.com
```

```bash
helm install offly ./helm/offly -f custom-values.yaml
```

### Enable autoscaling

```yaml
# custom-values.yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

```bash
helm install offly ./helm/offly -f custom-values.yaml
```

## Accessing the Application

After installation, follow the instructions in the NOTES output to access your Offly instance.

### Port Forwarding (for ClusterIP service)

```bash
# Forward HTTP/REST API
kubectl port-forward svc/offly 8080:8080

# Forward gRPC
kubectl port-forward svc/offly 50051:50051
```

Then access:
- REST API: http://localhost:8080/api/v1
- gRPC: localhost:50051

## Upgrading

To upgrade the chart:

```bash
helm upgrade offly ./helm/offly
```

## Dependencies

This chart depends on:
- [Bitnami MongoDB](https://github.com/bitnami/charts/tree/main/bitnami/mongodb) - Optional, enabled by default

To update dependencies:

```bash
helm dependency update ./helm/offly
```

## Support

For issues and questions, please visit: https://github.com/BananaOps/offly
