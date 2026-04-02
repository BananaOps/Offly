package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	jwt "github.com/golang-jwt/jwt/v5"
)

// Verifier validates OIDC JWTs against a JWKS and basic claims.
type Verifier struct {
	jwks     keyfunc.Keyfunc
	issuer   string
	clientID string
}

// NewVerifierFromEnv initializes a Verifier using environment variables.
// AUTH_ISSUER_URL: e.g. http://localhost:5556/dex
// AUTH_CLIENT_ID: OIDC client id (e.g. wirety)
// AUTH_JWKS_URL: optional, defaults to issuer + "/keys"
func NewVerifierFromEnv() (*Verifier, error) {
	issuer := os.Getenv("AUTH_ISSUER_URL")
	if issuer == "" {
		issuer = "http://localhost:5556/dex"
	}
	clientID := os.Getenv("AUTH_CLIENT_ID")
	if clientID == "" {
		clientID = "wirety"
	}

	jwksURL := os.Getenv("AUTH_JWKS_URL")
	if jwksURL == "" {
		// Dex publishes JWKS at <issuer>/keys
		jwksURL = strings.TrimRight(issuer, "/") + "/keys"
	}

	// Create a keyfunc that auto-refreshes JWKS using defaults or TTL override.
	ttlStr := os.Getenv("AUTH_JWKS_CACHE_TTL")
	if ttlStr == "" {
		ttlStr = "3600" // default 60 minutes
	}
	ttl, _ := time.ParseDuration(ttlStr + "s")

	kf, err := keyfunc.NewDefaultOverrideCtx(context.Background(), []string{jwksURL}, keyfunc.Override{
		RefreshInterval: ttl,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create JWKS keyfunc: %w", err)
	}

	return &Verifier{jwks: kf, issuer: issuer, clientID: clientID}, nil
}

// VerifyBearer extracts and verifies the JWT from the Authorization header.
func (v *Verifier) VerifyBearer(r *http.Request) (jwt.MapClaims, error) {
	authz := r.Header.Get("Authorization")
	if authz == "" {
		return nil, errors.New("missing Authorization header")
	}
	parts := strings.SplitN(authz, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, errors.New("invalid Authorization header format")
	}
	return v.VerifyToken(parts[1])
}

// VerifyToken validates signature and standard claims (iss, aud/azp, exp).
func (v *Verifier) VerifyToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, v.jwks.Keyfunc)
	if err != nil {
		return nil, fmt.Errorf("token parse/verify failed: %w", err)
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid claims type")
	}

	// Basic claim checks
	if iss, _ := claims["iss"].(string); iss == "" || !strings.EqualFold(iss, v.issuer) {
		return nil, errors.New("issuer mismatch")
	}
	// Either aud contains clientID or azp equals clientID
	if aud, ok := claims["aud"].([]interface{}); ok {
		found := false
		for _, a := range aud {
			if s, _ := a.(string); s == v.clientID {
				found = true
				break
			}
		}
		if !found {
			// fallback to string aud
			if s, _ := claims["aud"].(string); s != v.clientID {
				return nil, errors.New("audience mismatch")
			}
		}
	} else if azp, _ := claims["azp"].(string); azp != "" {
		if azp != v.clientID {
			return nil, errors.New("authorized party mismatch")
		}
	}

	return claims, nil
}
