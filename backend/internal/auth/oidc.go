package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	jwt "github.com/golang-jwt/jwt/v5"
)

// Verifier validates OIDC JWTs against the provider's JWKS and holds the
// provider endpoints used by the login flow.
type Verifier struct {
	keyFunc  jwt.Keyfunc
	issuer   string
	clientID string

	authorizationURL string
	tokenURL         string
}

// Signing algorithms accepted for ID tokens ("none" and HMAC are rejected).
var allowedSigningMethods = []string{
	"RS256", "RS384", "RS512",
	"PS256", "PS384", "PS512",
	"ES256", "ES384", "ES512",
}

// NewVerifierFromEnv initializes a Verifier using environment variables.
//
//	AUTH_ISSUER_URL          issuer, e.g. http://localhost:5556/dex or
//	                         https://login.microsoftonline.com/<tenant-id>/v2.0
//	AUTH_CLIENT_ID           OIDC client id (Entra ID: the application/client id)
//	AUTH_AUTHORIZATION_URL   optional override of the discovered authorization endpoint
//	AUTH_TOKEN_URL           optional override of the discovered token endpoint
//	AUTH_JWKS_URL            optional override of the discovered JWKS URI
//	AUTH_JWKS_CACHE_TTL      JWKS refresh interval in seconds (default 3600)
//
// Endpoints come from the issuer's OpenID discovery document
// (<issuer>/.well-known/openid-configuration). If discovery is unavailable they
// fall back to the Dex layout (<issuer>/auth, /token, /keys).
func NewVerifierFromEnv() (*Verifier, error) {
	issuer := strings.TrimRight(envOr("AUTH_ISSUER_URL", "http://localhost:5556/dex"), "/")
	clientID := envOr("AUTH_CLIENT_ID", "offly")

	disc, err := discover(issuer)
	if err != nil {
		log.Printf("auth: OIDC discovery failed (%v) — falling back to Dex-style endpoints", err)
		disc = &discoveryDocument{}
	}

	authorizationURL := firstNonEmpty(os.Getenv("AUTH_AUTHORIZATION_URL"), disc.AuthorizationEndpoint, issuer+"/auth")
	tokenURL := firstNonEmpty(os.Getenv("AUTH_TOKEN_URL"), disc.TokenEndpoint, issuer+"/token")
	jwksURL := firstNonEmpty(os.Getenv("AUTH_JWKS_URL"), disc.JWKSURI, issuer+"/keys")

	ttl, err := time.ParseDuration(envOr("AUTH_JWKS_CACHE_TTL", "3600") + "s")
	if err != nil || ttl <= 0 {
		ttl = time.Hour
	}
	kf, err := keyfunc.NewDefaultOverrideCtx(context.Background(), []string{jwksURL}, keyfunc.Override{
		RefreshInterval: ttl,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create JWKS keyfunc: %w", err)
	}

	v := newVerifier(kf.Keyfunc, issuer, clientID)
	v.authorizationURL = authorizationURL
	v.tokenURL = tokenURL
	log.Printf("auth: OIDC issuer=%s authorization=%s token=%s jwks=%s", issuer, authorizationURL, tokenURL, jwksURL)
	return v, nil
}

func newVerifier(keyFunc jwt.Keyfunc, issuer, clientID string) *Verifier {
	return &Verifier{keyFunc: keyFunc, issuer: issuer, clientID: clientID}
}

type discoveryDocument struct {
	Issuer                string `json:"issuer"`
	AuthorizationEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint         string `json:"token_endpoint"`
	JWKSURI               string `json:"jwks_uri"`
}

func discover(issuer string) (*discoveryDocument, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(issuer + "/.well-known/openid-configuration") //nolint:gosec // issuer comes from operator config
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discovery returned HTTP %d", resp.StatusCode)
	}
	var doc discoveryDocument
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil, fmt.Errorf("invalid discovery document: %w", err)
	}
	return &doc, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
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

// VerifyToken validates the signature (allowed algorithms only) and the
// standard claims: iss must equal the issuer, aud must contain the client id
// (string or array form — Entra ID uses a string), exp is required.
func (v *Verifier) VerifyToken(tokenString string) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, v.keyFunc,
		jwt.WithValidMethods(allowedSigningMethods),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.clientID),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("token parse/verify failed: %w", err)
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// VerifyIDToken verifies an ID token issued by the login flow, including its
// nonce (replay protection).
func (v *Verifier) VerifyIDToken(tokenString, expectedNonce string) (jwt.MapClaims, error) {
	claims, err := v.VerifyToken(tokenString)
	if err != nil {
		return nil, err
	}
	if nonce, _ := claims["nonce"].(string); expectedNonce == "" || nonce != expectedNonce {
		return nil, errors.New("nonce mismatch")
	}
	return claims, nil
}
