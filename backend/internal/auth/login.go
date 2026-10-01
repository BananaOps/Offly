package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"net/url"
	"strings"
)

// LoginHandler starts the OIDC authorization code flow: it generates state,
// nonce and a PKCE verifier, keeps them in short-lived HttpOnly cookies, and
// redirects the browser to the provider's authorization endpoint.
func LoginHandler(v *Verifier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if v == nil || v.authorizationURL == "" {
			http.Error(w, "Auth not configured", http.StatusServiceUnavailable)
			return
		}

		state, err1 := randomToken(32)
		nonce, err2 := randomToken(32)
		verifier, err3 := randomToken(48)
		if err1 != nil || err2 != nil || err3 != nil {
			http.Error(w, "Failed to start login", http.StatusInternalServerError)
			return
		}

		setFlowCookie(w, stateCookieName, state)
		setFlowCookie(w, nonceCookieName, nonce)
		setFlowCookie(w, pkceVerifierCookieName, verifier)

		challenge := sha256.Sum256([]byte(verifier))
		params := url.Values{}
		params.Set("client_id", v.clientID)
		params.Set("redirect_uri", redirectURL())
		params.Set("response_type", "code")
		params.Set("response_mode", "query")
		params.Set("scope", scopes())
		params.Set("state", state)
		params.Set("nonce", nonce)
		params.Set("code_challenge", base64.RawURLEncoding.EncodeToString(challenge[:]))
		params.Set("code_challenge_method", "S256")

		sep := "?"
		if strings.Contains(v.authorizationURL, "?") {
			sep = "&"
		}
		http.Redirect(w, r, v.authorizationURL+sep+params.Encode(), http.StatusFound)
	}
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// Login-flow cookies are scoped to the auth endpoints and live only long enough
// to complete the provider login. SameSite=Lax lets them ride along the
// top-level GET redirect back from the provider.
func setFlowCookie(w http.ResponseWriter, name, value string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     callbackCookiePath,
		MaxAge:   loginFlowCookieLifetime,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}

func clearFlowCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     callbackCookiePath,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}

func readFlowCookie(r *http.Request, name string) string {
	c, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	return c.Value
}
