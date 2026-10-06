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

		email := EmailFromClaims(claims)
		if email == "" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "email claim missing"})
			return
		}
		if !IsAllowedIdentity(email, GroupsFromClaims(claims)) {
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "not a member of an allowed group"})
			return
		}

		u, err := upsertUser(store, email, NameFromClaims(claims, email))
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to create user"})
			return
		}

		_ = json.NewEncoder(w).Encode(resp{ID: u.ID, Name: u.Name, Email: u.Email, Country: u.Country})
	}
}

// upsertUser returns the user matching email (case-insensitive), creating it
// without department/team on first login and refreshing its name otherwise.
func upsertUser(store storage.Storage, email, name string) (*storage.User, error) {
	users, _ := store.GetUsers()
	for _, u := range users {
		if strings.EqualFold(u.Email, email) {
			u.Name = name
			_ = store.UpdateUser(u)
			return u, nil
		}
	}
	u := &storage.User{
		ID:    uuid.New().String(),
		Name:  name,
		Email: email,
	}
	if err := store.CreateUser(u); err != nil {
		return nil, err
	}
	return u, nil
}
