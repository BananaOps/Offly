# Skaffold Quick Start

## Installation

### macOS
```bash
brew install skaffold
```

### Linux
```bash
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
sudo install skaffold /usr/local/bin/
```

### Windows
```powershell
choco install skaffold
```

## Local Kubernetes Cluster

Choose one of these options:

### Option 1: Minikube
```bash
# Install
brew install minikube  # macOS
# or download from https://minikube.sigs.k8s.io/docs/start/

# Start
minikube start --cpus=4 --memory=8192

# Enable ingress (optional)
minikube addons enable ingress
```

### Option 2: Kind
```bash
# Install
brew install kind  # macOS
# or: go install sigs.k8s.io/kind@latest

# Create cluster
kind create cluster --name offly

# Load images (if needed)
kind load docker-image bananaops/offly-backend:latest --name offly
```

### Option 3: Docker Desktop
Enable Kubernetes in Docker Desktop settings.

## Quick Start Commands

### 1. Start Development
```bash
# Using Task
task skaffold:dev

# Or directly
skaffold dev -f skaffold.local.yaml
```

### 2. Access Application
Once deployed, Skaffold will automatically forward ports:
- REST API: http://localhost:8080/api/v1
- gRPC: localhost:50051
- MongoDB: localhost:27017

### 3. Make Changes
Edit any file and Skaffold will automatically:
- Rebuild the image
- Redeploy to Kubernetes
- Sync files when possible (faster)

### 4. View Logs
Logs are streamed automatically. To filter:
```bash
# In another terminal
kubectl logs -f -n offly-local -l app.kubernetes.io/name=offly
```

### 5. Stop Development
Press `Ctrl+C` in the terminal running Skaffold.

To clean up:
```bash
task skaffold:delete
# or
skaffold delete
```

## Configuration Files

- `skaffold.yaml` - Production configuration
- `skaffold.dev.yaml` - Development with hot reload
- `skaffold.local.yaml` - Local cluster optimized
- `skaffold.profiles.yaml` - Multiple environment profiles

## Common Issues

### Port already in use
```bash
# Find process using port
lsof -i :8080

# Kill it or use different port
skaffold dev --port-forward=false
kubectl port-forward svc/offly-local 8081:8080 -n offly-local
```

### Image pull errors
```bash
# Ensure local build is enabled
skaffold dev --default-repo=""
```

### MongoDB connection fails
```bash
# Check MongoDB pod
kubectl get pods -n offly-local
kubectl logs -n offly-local offly-local-mongodb-0

# Connect manually
kubectl exec -it -n offly-local offly-local-mongodb-0 -- mongosh
```

### Helm deployment fails
```bash
# Check Helm release
helm list -n offly-local
helm status offly-local -n offly-local

# Debug
skaffold render -f skaffold.local.yaml > debug.yaml
```

## Tips

1. **Use local config for development**: `skaffold dev -f skaffold.local.yaml`
2. **Skip tests for faster builds**: `skaffold dev --skip-tests`
3. **Build only**: `skaffold build --file-output=build.json`
4. **Tail logs**: `skaffold dev --tail`
5. **Cleanup**: Always run `skaffold delete` when done

## Next Steps

- Read [SKAFFOLD.md](../SKAFFOLD.md) for detailed documentation
- Check [helm/offly/README.md](../helm/offly/README.md) for Helm chart options
- See [QUICKSTART.md](../QUICKSTART.md) for general setup

## Resources

- [Skaffold Documentation](https://skaffold.dev/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
