package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"absence-management/internal/auth"
	"absence-management/internal/service"
	"absence-management/internal/storage"
	pb "absence-management/proto/absence/v1"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Initialize storage based on STORAGE_TYPE env var
	// Options: "sqlite" (default), "mongodb", "hybrid"
	storageType := os.Getenv("STORAGE_TYPE")
	if storageType == "" {
		storageType = "sqlite"
	}

	var store storage.Storage
	var err error

	switch storageType {
	case "sqlite":
		dbPath := os.Getenv("SQLITE_DB_PATH")
		if dbPath == "" {
			dbPath = "./offly.db"
		}
		log.Printf("Initializing SQLite storage at %q...", dbPath)
		store, err = storage.NewSQLiteStorage(dbPath)
		if err != nil {
			log.Fatalf("Failed to initialize SQLite storage: %v", err)
		}
	case "mongodb", "hybrid":
		mongoURI := os.Getenv("MONGO_URI")
		if mongoURI == "" {
			mongoURI = "mongodb://localhost:27017"
		}
		log.Printf("Initializing hybrid storage with MongoDB at %q...", mongoURI)
		store = storage.NewHybridStorage(mongoURI, "offly")
	default:
		log.Fatalf("Unknown storage type: %q (supported: sqlite, mongodb, hybrid)", storageType)
	}

	// Démarrer le serveur gRPC
	go startGRPCServer(store)

	// Démarrer la gateway REST
	if err := startRESTGateway(store); err != nil {
		log.Fatalf("Failed to start REST gateway: %v", err)
	}
}

func startGRPCServer(store storage.Storage) {
	lis, err := net.Listen("tcp", "127.0.0.1:50051")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()

	pb.RegisterAbsenceServiceServer(grpcServer, service.NewAbsenceServiceServer(store))
	pb.RegisterUserServiceServer(grpcServer, service.NewUserServiceServer(store))
	pb.RegisterOrganizationServiceServer(grpcServer, service.NewOrganizationServiceServer(store))
	pb.RegisterHolidayServiceServer(grpcServer, service.NewHolidayServiceServer(store))

	log.Println("gRPC server listening on :50051")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}

func startRESTGateway(store storage.Storage) error {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}

	if err := pb.RegisterAbsenceServiceHandlerFromEndpoint(ctx, mux, "127.0.0.1:50051", opts); err != nil {
		return err
	}
	if err := pb.RegisterUserServiceHandlerFromEndpoint(ctx, mux, "127.0.0.1:50051", opts); err != nil {
		return err
	}
	if err := pb.RegisterOrganizationServiceHandlerFromEndpoint(ctx, mux, "127.0.0.1:50051", opts); err != nil {
		return err
	}
	if err := pb.RegisterHolidayServiceHandlerFromEndpoint(ctx, mux, "127.0.0.1:50051", opts); err != nil {
		return err
	}

	// Create main HTTP handler with API and static files
	mainHandler := http.NewServeMux()

	// OIDC optional verifier based on AUTH_ENABLED
	authEnabled := os.Getenv("AUTH_ENABLED") == "true"
	var v *auth.Verifier
	if authEnabled {
		var err error
		v, err = auth.NewVerifierFromEnv()
		if err != nil {
			log.Printf("Failed to init OIDC verifier: %v", err)
		}
	}

	// Health check endpoint
	mainHandler.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Swagger UI
	mainHandler.HandleFunc("/docs", serveSwaggerUI)
	mainHandler.HandleFunc("/docs/", serveSwaggerUI)

	// Serve OpenAPI spec
	mainHandler.Handle("/openapi/", http.StripPrefix("/openapi/", http.FileServer(http.Dir("./proto/absence/v1"))))

	// API routes
	// Auth config endpoint (always available for the frontend to know if SSO is enabled)
	mainHandler.HandleFunc("/api/v1/auth/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		issuer := os.Getenv("AUTH_ISSUER_URL")
		clientID := os.Getenv("AUTH_CLIENT_ID")
		if issuer == "" {
			issuer = ""
		}
		if clientID == "" {
			clientID = ""
		}
		_, _ = w.Write([]byte("{\"enabled\":" + map[bool]string{true: "true", false: "false"}[authEnabled] + ",\"issuerUrl\":\"" + issuer + "\",\"clientId\":\"" + clientID + "\"}"))
	})

	if authEnabled {
		mainHandler.Handle("/api/v1/auth/callback", auth.CallbackHandler(store, v))
		mainHandler.Handle("/api/v1/auth/me", corsMiddleware(auth.MeHandler(v)))
		mainHandler.Handle("/api/v1/auth/logout", corsMiddleware(auth.LogoutHandler()))
		mainHandler.Handle("/api/v1/auth/ensure-user", corsMiddleware(auth.EnsureUserHandler(store, v)))
		// Wrap API with RBAC middleware when auth is enabled
		mainHandler.Handle("/api/", corsMiddleware(rbacMiddleware(store, v, mux)))
	} else {
		mainHandler.Handle("/api/", corsMiddleware(mux))
	}

	// Serve static files from web/dist
	fs := http.FileServer(http.Dir("./web/dist"))
	mainHandler.Handle("/", spaHandler(fs))

	log.Println("REST gateway and web server listening on :8080")
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mainHandler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	return srv.ListenAndServe()
}

// spaHandler handles Single Page Application routing
func spaHandler(staticHandler http.Handler) http.Handler {
	const baseDir = "./web/dist"
	absBase, _ := filepath.Abs(baseDir)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Clean and validate path to prevent directory traversal
		clean := filepath.Join(absBase, filepath.Clean("/"+r.URL.Path))
		if !strings.HasPrefix(clean, absBase) {
			http.NotFound(w, r)
			return
		}
		if _, err := os.Stat(clean); os.IsNotExist(err) {
			// File doesn't exist, serve index.html for SPA routing
			http.ServeFile(w, r, filepath.Join(baseDir, "index.html"))
			return
		}
		// File exists, serve it
		staticHandler.ServeHTTP(w, r)
	})
}

func serveSwaggerUI(w http.ResponseWriter, r *http.Request) {
	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Offly API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                urls: [
                    { url: "/openapi/absence.swagger.json", name: "Offly API" }
                ],
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                layout: "StandaloneLayout"
            });
            window.ui = ui;
        };
    </script>
</body>
</html>`
	w.Header().Set("Content-Type", "text/html")
	_, _ = w.Write([]byte(html))
}

func corsMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		h.ServeHTTP(w, r)
	})
}

// rbacMiddleware applies role-based access control to API endpoints when AUTH_ENABLED=true
// Rules:
// - Unauthenticated: GET only
// - Users (non-admin): GET all, PUT/POST/DELETE only their own profile and absences
// - Admins: Full access
func rbacMiddleware(store storage.Storage, v *auth.Verifier, next http.Handler) http.Handler {
	return auth.AuthMiddleware(v, store, false)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// If GET request, allow everyone (read-only for unauthenticated)
		if r.Method == "GET" {
			next.ServeHTTP(w, r)
			return
		}

		// For non-GET methods, require authentication
		userEmail := auth.GetUserEmail(r)
		if userEmail == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"authentication required for write operations"}`))
			return
		}

		// Admins have full access
		if auth.IsAdmin(r) {
			next.ServeHTTP(w, r)
			return
		}

		// Non-admin users can only modify their own profile and absences
		userID := auth.GetUserID(r)
		path := r.URL.Path

		// Check if request is for user's own profile (including sub-resources like /users/{id}/department)
		if strings.HasPrefix(path, "/api/v1/users/") {
			// Extract user ID from path: /api/v1/users/{id} or /api/v1/users/{id}/...
			pathAfterUsers := strings.TrimPrefix(path, "/api/v1/users/")
			// Skip if it's just /users (POST to create new user)
			if pathAfterUsers == "" || pathAfterUsers == "/" {
				// This is POST /users to create a new user - deny for non-admins
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_, _ = w.Write([]byte(`{"error":"only admins can create users"}`))
				return
			}

			pathUserID := pathAfterUsers
			if slashIdx := strings.IndexByte(pathAfterUsers, '/'); slashIdx > 0 {
				pathUserID = pathAfterUsers[:slashIdx]
			}

			// Allow PUT/POST on own profile
			if (r.Method == "PUT" || r.Method == "POST") && pathUserID == userID {
				log.Printf("RBAC - %q user profile: currentUserID=%q, pathUserID=%q, match=true", r.Method, userID, pathUserID)
				next.ServeHTTP(w, r)
				return
			}

			// Trying to modify someone else's profile
			if r.Method == "PUT" || r.Method == "POST" {
				log.Printf("RBAC - %q user profile: currentUserID=%q, pathUserID=%q, match=false - DENIED", r.Method, userID, pathUserID)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_, _ = w.Write([]byte(`{"error":"can only modify your own profile"}`))
				return
			}
		}

		// Check if request is for user's own absences
		if len(path) >= len("/api/v1/absences") && path[:len("/api/v1/absences")] == "/api/v1/absences" {
			// For absences, we need to check if the absence belongs to the user
			if r.Method == "POST" {
				// Read body to check if user is creating their own absence
				bodyBytes, err := io.ReadAll(r.Body)
				if err != nil {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					_, _ = w.Write([]byte(`{"error":"failed to read request body"}`))
					return
				}
				// Restore body for later use
				r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

				// Parse JSON to check userId
				var reqBody map[string]interface{}
				if err := json.Unmarshal(bodyBytes, &reqBody); err != nil {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					_, _ = w.Write([]byte(`{"error":"invalid request body"}`))
					return
				}

				// Check if userId in body matches authenticated user
				if reqUserID, ok := reqBody["userId"].(string); ok && reqUserID == userID {
					next.ServeHTTP(w, r)
					return
				}

				// Deny if trying to create absence for another user
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_, _ = w.Write([]byte(`{"error":"can only create absences for yourself"}`))
				return
			}
			// For PUT/DELETE, verify that absence belongs to current user
			if r.Method == "PUT" || r.Method == "DELETE" {
				// Extract absence ID from path: /api/v1/absences/{id}
				pathAfterPrefix := strings.TrimPrefix(path, "/api/v1/absences/")
				idEnd := strings.IndexByte(pathAfterPrefix, '/')
				absenceID := pathAfterPrefix
				if idEnd > 0 {
					absenceID = pathAfterPrefix[:idEnd]
				}
				if absenceID == "" {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					_, _ = w.Write([]byte(`{"error":"absence id missing in path"}`))
					return
				}
				// Load absence and verify ownership
				absence, err := store.GetAbsenceByID(absenceID)
				if err == nil && absence != nil && absence.UserID == userID {
					next.ServeHTTP(w, r)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_, _ = w.Write([]byte(`{"error":"can only modify your own absences"}`))
				return
			}
		}

		// Deny access to organization/holiday modifications for non-admins
		if (len(path) >= len("/api/v1/departments") && path[:len("/api/v1/departments")] == "/api/v1/departments") ||
			(len(path) >= len("/api/v1/teams") && path[:len("/api/v1/teams")] == "/api/v1/teams") ||
			(len(path) >= len("/api/v1/holidays") && path[:len("/api/v1/holidays")] == "/api/v1/holidays") {
			// Allow if user is admin
			if auth.IsAdmin(r) {
				next.ServeHTTP(w, r)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"error":"admin access required to modify organization or holidays"}`))
			return
		}

		// Default deny for other endpoints
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":"access denied"}`))
	}))
}
