package auth

import (
	"absence-management/internal/storage"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
)

type contextKey string

const (
	userEmailKey contextKey = "user_email"
	userGroupsKey contextKey = "user_groups"
	userIDKey contextKey = "user_id"
)

// AuthMiddleware verifies Bearer token when AUTH_ENABLED=true and injects user info into request context.
// If AUTH_ENABLED=false, passes through without auth.
func AuthMiddleware(v *Verifier, store storage.Storage, required bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authEnabled := os.Getenv("AUTH_ENABLED") == "true"
			if !authEnabled {
				// Auth disabled, pass through
				next.ServeHTTP(w, r)
				return
			}

			if v == nil {
				if required {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusServiceUnavailable)
					_ = json.NewEncoder(w).Encode(map[string]string{"error": "auth not configured"})
					return
				}
				next.ServeHTTP(w, r)
				return
			}

			claims, err := v.VerifyBearer(r)
			if err != nil {
				if required {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusUnauthorized)
					_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
					return
				}
				// Optional auth, proceed without user context
				next.ServeHTTP(w, r)
				return
			}

			email, _ := claims["email"].(string)
			if email == "" {
				if required {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusUnauthorized)
					_ = json.NewEncoder(w).Encode(map[string]string{"error": "email claim missing"})
					return
				}
				next.ServeHTTP(w, r)
				return
			}

			// Extract groups from claims
			var groups []string
			if groupsRaw, ok := claims["groups"].([]interface{}); ok {
				for _, g := range groupsRaw {
					if s, ok := g.(string); ok {
						groups = append(groups, s)
					}
				}
			}

			// Find user ID by email
			users, _ := store.GetUsers()
			var userID string
			for _, u := range users {
				if u.Email == email {
					userID = u.ID
					break
				}
			}

			ctx := context.WithValue(r.Context(), userEmailKey, email)
			ctx = context.WithValue(ctx, userGroupsKey, groups)
			ctx = context.WithValue(ctx, userIDKey, userID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserEmail retrieves the authenticated user's email from request context.
func GetUserEmail(r *http.Request) string {
	if email, ok := r.Context().Value(userEmailKey).(string); ok {
		return email
	}
	return ""
}

// GetUserGroups retrieves the authenticated user's groups from request context.
func GetUserGroups(r *http.Request) []string {
	if groups, ok := r.Context().Value(userGroupsKey).([]string); ok {
		return groups
	}
	return nil
}

// GetUserID retrieves the authenticated user's ID from request context.
func GetUserID(r *http.Request) string {
	if id, ok := r.Context().Value(userIDKey).(string); ok {
		return id
	}
	return ""
}

// IsAdmin checks if the user has the admin group.
func IsAdmin(r *http.Request) bool {
	groups := GetUserGroups(r)
	adminGroup := os.Getenv("AUTH_ADMIN_GROUP")
	if adminGroup == "" {
		adminGroup = "admin"
	}
	for _, g := range groups {
		if g == adminGroup {
			return true
		}
	}
	return false
}

// RequireAdmin middleware returns 403 if user is not admin.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !IsAdmin(r) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "admin access required"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireOwnerOrAdmin checks if the user owns the resource (by userId param) or is admin.
func RequireOwnerOrAdmin(store storage.Storage, userIDParam string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if IsAdmin(r) {
				next.ServeHTTP(w, r)
				return
			}

			currentUserID := GetUserID(r)
			// Extract userId from request (path param or query)
			// For simplicity, assume it's in the URL path like /users/{id} or query ?userId=...
			pathUserID := strings.TrimPrefix(r.URL.Path, "/api/v1/users/")
			if idx := strings.Index(pathUserID, "/"); idx > 0 {
				pathUserID = pathUserID[:idx]
			}
			queryUserID := r.URL.Query().Get("userId")

			targetUserID := pathUserID
			if targetUserID == "" {
				targetUserID = queryUserID
			}

			if targetUserID != "" && targetUserID != currentUserID {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "access denied"})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
