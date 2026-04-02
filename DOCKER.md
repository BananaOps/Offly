# Docker Deployment Guide

Offly uses a single Docker image that containbackend (Go) and frontend (React). The backend serves the frontend static files and provides the API.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start the application with MongoDB
docker-compose up -d

# View logs
docker-compose logs -f offly

# Stop the application
docker-compose down
```

Access the application:
- Web UI: http://localhost:8080
- REST API: http://localhost:8080/api/v1
- gRPC: localhost:50051

### Using Docker Run

```bash
# Pull the image
docker pull bananaops/offly:latest

# Run with in-memory storage
docker run -p 8080:8080 -p 50051:50051 bananaops/offly:latest

# Run with MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:7
docker run -p 8080:8080 -p 50051:50051 \
  -e MONGO_URI=mongodb://host.docker.internal:27017 \
  bananaops/offly:latest
```

## Building the Image

### Build locally

```bash
# Build the image
docker build -t offly:local .

# Run it
docker run -p 8080:8080 -p 50051:50051 offly:local
```

### Build with custom API URL

```bash
docker build \
  --build-arg VITE_API_URL=/api/v1 \
  -t offly:custom .
```

### Build with version info

```bash
docker build \
  --build-arg VERSION=1.0.0 \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  -t offly:1.0.0 .
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `GRPC_PORT` | gRPC server port | `50051` |
| `HTTP_PORT` | HTTP server port | `8080` |

## Architecture

The Docker image is built in three stages:

1. **Frontend Build**: Builds the React application with Vite
2. **Backend Build**: Compiles the Go backend
3. **Final Image**: Combines backend binary and frontend static files

The backend serves:
- `/api/*` - REST API endpoints
- `/*` - Frontend static files (SPA routing)

## Production Deployment

### Docker Swarm

```yaml
version: '3.8'

services:
  offly:
    image: bananaops/offly:latest
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      MONGO_URI: mongodb://mongodb:27017
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

### Kubernetes

See [helm/offly/README.md](helm/offly/README.md) for Helm chart deployment.

### Health Checks

```bash
# HTTP health check
curl http://localhost:8080/api/v1/health

# Docker health check
docker run -d \
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  -p 8080:8080 -p 50051:50051 \
  bananaops/offly:latest
```

## Troubleshooting

### Frontend not loading

Check that the backend can find the static files:
```bash
docker exec -it offly-app ls -la /app/web/dist
```

### MongoDB connection issues

Check MongoDB is accessible:
```bash
docker exec -it offly-app ping mongodb
```

### View logs

```bash
# Docker Compose
docker-compose logs -f offly

# Docker run
docker logs -f offly-app
```

### Rebuild without cache

```bash
docker build --no-cache -t offly:latest .
```

## Multi-Architecture Support

The image supports both AMD64 and ARM64 architectures:

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t bananaops/offly:latest \
  --push \
  .
```

## Size Optimization

The final image is optimized for size:
- Uses Alpine Linux base image
- Multi-stage build removes build dependencies
- Static binary with no runtime dependencies
- Compressed frontend assets

Expected image size: ~50-80 MB

## Security

- Runs as non-root user (`nobody`)
- No shell in final image
- Minimal attack surface
- Regular security updates via base image

## Support

For issues with Docker deployment:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Open an issue: https://github.com/BananaOps/offly/issues

