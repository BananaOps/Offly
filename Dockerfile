# Multi-stage build: Frontend + Backend in one image

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./

# Install frontend dependencies
RUN npm ci --only=production=false || npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.25-alpine AS backend-builder

WORKDIR /app

# Install build dependencies (gcc + musl-dev + sqlite-dev required for CGO/sqlite3)
RUN apk add --no-cache git protobuf-dev gcc musl-dev sqlite-dev

# Copy backend go modules
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source
COPY backend/ ./

# Build backend
ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-w -s -X main.Version=${VERSION} -X main.BuildDate=${BUILD_DATE} -X main.GitCommit=${VCS_REF}" \
    -o /app/bin/server cmd/server/main.go

# Stage 3: Final image
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata sqlite-libs

WORKDIR /app

RUN mkdir -p /app/data && chown -R nobody:nobody /app

ENV SQLITE_DB_PATH=/app/data/offly.db

# Copy backend binary
COPY --from=backend-builder /app/bin/server ./server

# Copy OpenAPI specs for Swagger UI
COPY --from=backend-builder /app/proto/*.swagger.json ./proto/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./web/dist

# Metadata
ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

LABEL org.opencontainers.image.title="Offly" \
      org.opencontainers.image.description="Time Off Manager - Full Stack Application" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/BananaOps/offly" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="BananaOps" \
      org.opencontainers.image.licenses="MIT"

# Expose ports
EXPOSE 50051 8080

# Run as non-root user
USER nobody

CMD ["./server"]
