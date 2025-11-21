package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"

	"absence-management/internal/service"
	"absence-management/internal/storage"
	pb "absence-management/proto"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Initialiser le storage (MongoDB ou Memory)
	var store storage.Storage
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	mongoStore, err := storage.NewMongoStorage(mongoURI, "offly")
	if err != nil {
		log.Printf("Failed to connect to MongoDB: %v, using in-memory storage", err)
		store = storage.NewMemoryStorage()
	} else {
		log.Println("Connected to MongoDB")
		store = mongoStore
	}

	// Démarrer le serveur gRPC
	go startGRPCServer(store)

	// Démarrer la gateway REST
	if err := startRESTGateway(); err != nil {
		log.Fatalf("Failed to start REST gateway: %v", err)
	}
}

func startGRPCServer(store storage.Storage) {
	lis, err := net.Listen("tcp", ":50051")
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

func startRESTGateway() error {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}

	if err := pb.RegisterAbsenceServiceHandlerFromEndpoint(ctx, mux, "localhost:50051", opts); err != nil {
		return err
	}
	if err := pb.RegisterUserServiceHandlerFromEndpoint(ctx, mux, "localhost:50051", opts); err != nil {
		return err
	}
	if err := pb.RegisterOrganizationServiceHandlerFromEndpoint(ctx, mux, "localhost:50051", opts); err != nil {
		return err
	}
	if err := pb.RegisterHolidayServiceHandlerFromEndpoint(ctx, mux, "localhost:50051", opts); err != nil {
		return err
	}

	// Create main HTTP handler with API and static files
	mainHandler := http.NewServeMux()

	// Health check endpoint
	mainHandler.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API routes
	mainHandler.Handle("/api/", corsMiddleware(mux))

	// Serve static files from web/dist
	fs := http.FileServer(http.Dir("./web/dist"))
	mainHandler.Handle("/", spaHandler(fs))

	log.Println("REST gateway and web server listening on :8080")
	return http.ListenAndServe(":8080", mainHandler)
}

// spaHandler handles Single Page Application routing
func spaHandler(staticHandler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if file exists
		path := "./web/dist" + r.URL.Path
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// File doesn't exist, serve index.html for SPA routing
			http.ServeFile(w, r, "./web/dist/index.html")
			return
		}
		// File exists, serve it
		staticHandler.ServeHTTP(w, r)
	})
}

func corsMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		h.ServeHTTP(w, r)
	})
}
