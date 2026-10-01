package auth

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"absence-management/internal/storage"
)

// CallbackHandler handles the OAuth2 callback from the OIDC provider: it checks
// the state, exchanges the authorization code (client secret + PKCE verifier)
// for tokens, verifies the ID token (signature, iss, aud, exp, nonce), enforces
// AUTH_ALLOWED_GROUPS, provisions the user and sets the session cookie.
func CallbackHandler(store storage.Storage, v *Verifier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if v == nil || v.tokenURL == "" {
			http.Error(w, "Auth not configured", http.StatusServiceUnavailable)
			return
		}

		// Provider-side errors (e.g. user cancelled, missing consent).
		if e := r.URL.Query().Get("error"); e != "" {
			http.Error(w, fmt.Sprintf("Login failed: %s %s", e, r.URL.Query().Get("error_description")), http.StatusUnauthorized)
			return
		}

		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing authorization code", http.StatusBadRequest)
			return
		}

		// CSRF protection: the state returned by the provider must match ours.
		expectedState := readFlowCookie(r, stateCookieName)
		gotState := r.URL.Query().Get("state")
		if expectedState == "" || subtle.ConstantTimeCompare([]byte(expectedState), []byte(gotState)) != 1 {
			http.Error(w, "Invalid login state — please retry", http.StatusBadRequest)
			return
		}
		nonce := readFlowCookie(r, nonceCookieName)
		pkceVerifier := readFlowCookie(r, pkceVerifierCookieName)
		for _, name := range []string{stateCookieName, nonceCookieName, pkceVerifierCookieName} {
			clearFlowCookie(w, name)
		}

		clientSecret := os.Getenv("AUTH_CLIENT_SECRET")
		if clientSecret == "" {
			http.Error(w, "Auth not configured", http.StatusInternalServerError)
			return
		}

		data := url.Values{}
		data.Set("grant_type", "authorization_code")
		data.Set("code", code)
		data.Set("client_id", v.clientID)
		data.Set("client_secret", clientSecret)
		data.Set("redirect_uri", redirectURL())
		if pkceVerifier != "" {
			data.Set("code_verifier", pkceVerifier)
		}

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.PostForm(v.tokenURL, data) //nolint:gosec // token URL comes from operator config / provider discovery
		if err != nil {
			http.Error(w, "Failed to exchange token", http.StatusBadGateway)
			log.Printf("auth: token exchange failed: %v", err)
			return
		}
		defer func() { _ = resp.Body.Close() }()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
			log.Printf("auth: token exchange returned HTTP %d: %s", resp.StatusCode, string(body))
			http.Error(w, "Token exchange failed", http.StatusUnauthorized)
			return
		}

		var tokenResp struct {
			IDToken   string `json:"id_token"`
			ExpiresIn int    `json:"expires_in"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
			http.Error(w, "Failed to parse token response", http.StatusInternalServerError)
			return
		}
		if tokenResp.IDToken == "" {
			http.Error(w, "No ID token in response", http.StatusInternalServerError)
			return
		}

		claims, err := v.VerifyIDToken(tokenResp.IDToken, nonce)
		if err != nil {
			log.Printf("auth: invalid ID token: %v", err)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		email := EmailFromClaims(claims)
		if email == "" {
			http.Error(w, "Email claim missing", http.StatusBadRequest)
			return
		}
		groups := GroupsFromClaims(claims)
		if !IsAllowedIdentity(email, groups) {
			log.Printf("auth: access denied for %s (not in AUTH_ALLOWED_GROUPS)", email)
			http.Error(w, "Access denied: you are not a member of a group allowed to use Offly", http.StatusForbidden)
			return
		}

		if _, err := upsertUser(store, email, NameFromClaims(claims, email)); err != nil {
			http.Error(w, "Failed to create user", http.StatusInternalServerError)
			return
		}

		maxAge := tokenResp.ExpiresIn
		if maxAge <= 0 {
			maxAge = 3600
		}
		// Requires HTTPS in production (Secure: true enforces TLS)
		http.SetCookie(w, &http.Cookie{
			Name:     authTokenCookieName,
			Value:    tokenResp.IDToken,
			Path:     "/",
			MaxAge:   maxAge,
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})

		http.Redirect(w, r, postLoginRedirect(), http.StatusFound)
	}
}

// postLoginRedirect appends logged_in=true to AUTH_POST_LOGIN_REDIRECT_URL.
func postLoginRedirect() string {
	target := postLoginURL()
	u, err := url.Parse(target)
	if err != nil {
		return target
	}
	q := u.Query()
	q.Set("logged_in", "true")
	u.RawQuery = q.Encode()
	return u.String()
}

// MeHandler returns the current user info from the session cookie.
func MeHandler(v *Verifier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		unauthenticated := func() {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"authenticated": false})
		}

		cookie, err := r.Cookie(authTokenCookieName)
		if err != nil || cookie.Value == "" || v == nil {
			unauthenticated()
			return
		}
		claims, err := v.VerifyToken(cookie.Value)
		if err != nil {
			unauthenticated()
			return
		}

		email := EmailFromClaims(claims)
		groups := GroupsFromClaims(claims)
		if email == "" || !IsAllowedIdentity(email, groups) {
			unauthenticated()
			return
		}
		name, _ := claims["name"].(string)
		if name == "" {
			name = email
		}

		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"authenticated": true,
			"email":         email,
			"name":          name,
			"role":          RoleFor(email, groups),
		})
	}
}

// LogoutHandler clears the auth cookie
func LogoutHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.SetCookie(w, &http.Cookie{
			Name:     authTokenCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
	}
}
