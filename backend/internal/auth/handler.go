package auth

import (
	"encoding/json"
	"net/http"
	"strings"

	"absence-management/internal/storage"

	"github.com/google/uuid"
)

// EnsureUserHandler verifies the bearer token and ensures a corresponding user exists.
// It creates a user with claims-derived fields if missing.
func EnsureUserHandler(store storage.Storage, v *Verifier) http.HandlerFunc {
	type resp struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Email   string `json:"email"`
		Country string `json:"country,omitempty"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if v == nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "OIDC verifier not initialized"})
			return
		}

		claims, err := v.VerifyBearer(r)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		email, _ := claims["email"].(string)
		if email == "" {
			// Dex may include email in ID token when scope includes email
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "email claim missing"})
			return
		}

		// Use name from claims, fallback to username from email
		name, _ := claims["name"].(string)
		if name == "" {
			// Try preferred_username
			if username, ok := claims["preferred_username"].(string); ok && username != "" {
				name = username
			} else {
				// Extract username from email (e.g., vincent.team@bananaops.tech -> vincent.team)
				if atIndex := strings.IndexByte(email, '@'); atIndex > 0 {
					name = email[:atIndex]
				} else {
					name = email
				}
			}
		}

		// Check if user exists by email
		users, _ := store.GetUsers()
		var existing *storage.User
		for _, u := range users {
			if u.Email == email {
				existing = u
				break
			}
		}

		var u *storage.User
		if existing == nil {
			// Create new user without department or team assignment
			u = &storage.User{
				ID:    uuid.New().String(),
				Name:  name,
				Email: email,
			}
			if err := store.CreateUser(u); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to create user"})
				return
			}
		} else {
			// Update existing user's name in case it changed
			existing.Name = name
			_ = store.UpdateUser(existing)
			u = existing
		}

		_ = json.NewEncoder(w).Encode(resp{ID: u.ID, Name: u.Name, Email: u.Email, Country: u.Country})
	}
}
