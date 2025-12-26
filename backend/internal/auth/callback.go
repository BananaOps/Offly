package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"absence-management/internal/storage"

	"github.com/google/uuid"
)

// CallbackHandler handles the OAuth2 callback from Dex
// It exchanges the authorization code for tokens using the client secret
func CallbackHandler(store storage.Storage, v *Verifier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get authorization code from query params
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing authorization code", http.StatusBadRequest)
			return
		}

		// Exchange code for tokens
		issuerURL := os.Getenv("AUTH_ISSUER_URL")
		clientID := os.Getenv("AUTH_CLIENT_ID")
		clientSecret := os.Getenv("AUTH_CLIENT_SECRET")
		
		if issuerURL == "" || clientID == "" || clientSecret == "" {
			http.Error(w, "Auth not configured", http.StatusInternalServerError)
			return
		}

		// Prepare token request
		tokenURL := issuerURL + "/token"
		data := url.Values{}
		data.Set("grant_type", "authorization_code")
		data.Set("code", code)
		data.Set("client_id", clientID)
		data.Set("client_secret", clientSecret)
		data.Set("redirect_uri", "http://localhost:8080/api/v1/auth/callback")

		// Make token request
		resp, err := http.PostForm(tokenURL, data)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to exchange token: %v", err), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			http.Error(w, fmt.Sprintf("Token exchange failed: %s", string(body)), http.StatusUnauthorized)
			return
		}

		// Parse token response
		var tokenResp struct {
			IDToken      string `json:"id_token"`
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			ExpiresIn    int    `json:"expires_in"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
			http.Error(w, "Failed to parse token response", http.StatusInternalServerError)
			return
		}

		if tokenResp.IDToken == "" {
			http.Error(w, "No ID token in response", http.StatusInternalServerError)
			return
		}

		// Verify the ID token
		claims, err := v.VerifyToken(tokenResp.IDToken)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid token: %v", err), http.StatusUnauthorized)
			return
		}

		// Extract user info from claims
		email, _ := claims["email"].(string)
		if email == "" {
			http.Error(w, "Email claim missing", http.StatusBadRequest)
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

		// Get groups from claims (used for role determination only)
		var groupsFromToken []string
		if groupsRaw, ok := claims["groups"].([]interface{}); ok {
			for _, g := range groupsRaw {
				if s, ok := g.(string); ok {
					groupsFromToken = append(groupsFromToken, s)
				}
			}
		}

		// Check if user exists
		users, _ := store.GetUsers()
		var existing *storage.User
		for _, u := range users {
			if u.Email == email {
				existing = u
				break
			}
		}

		var user *storage.User
		if existing == nil {
			// Create new user without department or team assignment
			user = &storage.User{
				ID:    uuid.New().String(),
				Name:  name,
				Email: email,
			}
			if err := store.CreateUser(user); err != nil {
				http.Error(w, "Failed to create user", http.StatusInternalServerError)
				return
			}
		} else {
			// Update existing user's name in case it changed
			existing.Name = name
			_ = store.UpdateUser(existing)
			user = existing
		}

		// Set secure HTTP-only cookie with the ID token
		http.SetCookie(w, &http.Cookie{
			Name:     "auth_token",
			Value:    tokenResp.IDToken,
			Path:     "/",
			MaxAge:   tokenResp.ExpiresIn,
			HttpOnly: true,
			Secure:   false, // Set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
		})

		// Redirect to frontend
		http.Redirect(w, r, "http://localhost:3000/?logged_in=true", http.StatusFound)
	}
}

// MeHandler returns the current user info from the cookie
func MeHandler(v *Verifier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Get token from cookie
		cookie, err := r.Cookie("auth_token")
		if err != nil || cookie.Value == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{"authenticated": false})
			return
		}

		// Verify token
		claims, err := v.VerifyToken(cookie.Value)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{"authenticated": false})
			return
		}

		email, _ := claims["email"].(string)
		name, _ := claims["name"].(string)
		if name == "" {
			name = email
		}

		var groups []string
		if groupsRaw, ok := claims["groups"].([]interface{}); ok {
			for _, g := range groupsRaw {
				if s, ok := g.(string); ok {
					groups = append(groups, s)
				}
			}
		}

		role := "user"
		for _, g := range groups {
			if g == "admin" {
				role = "admin"
				break
			}
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"authenticated": true,
			"email":         email,
			"name":          name,
			"role":          role,
			"groups":        groups,
		})
	}
}

// LogoutHandler clears the auth cookie
func LogoutHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.SetCookie(w, &http.Cookie{
			Name:     "auth_token",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
		})
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}
}
