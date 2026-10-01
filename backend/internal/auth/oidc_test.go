package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"strings"
	"testing"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
)

const (
	testIssuer   = "https://login.microsoftonline.com/tenant-id/v2.0"
	testClientID = "offly-client-id"
)

func newTestKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	k, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	return k
}

func testVerifier(key *rsa.PrivateKey) *Verifier {
	return newVerifier(func(*jwt.Token) (interface{}, error) { return &key.PublicKey, nil }, testIssuer, testClientID)
}

func signRS256(t *testing.T, key *rsa.PrivateKey, claims jwt.MapClaims) string {
	t.Helper()
	s, err := jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func baseClaims() jwt.MapClaims {
	return jwt.MapClaims{
		"iss":   testIssuer,
		"aud":   testClientID, // Entra ID: audience is a plain string
		"exp":   time.Now().Add(time.Hour).Unix(),
		"email": "jane@contoso.com",
	}
}

func TestVerifyToken_EntraStringAudience(t *testing.T) {
	key := newTestKey(t)
	if _, err := testVerifier(key).VerifyToken(signRS256(t, key, baseClaims())); err != nil {
		t.Fatalf("valid Entra-style token rejected: %v", err)
	}
}

func TestVerifyToken_ArrayAudience(t *testing.T) {
	key := newTestKey(t)
	c := baseClaims()
	c["aud"] = []string{"other", testClientID}
	if _, err := testVerifier(key).VerifyToken(signRS256(t, key, c)); err != nil {
		t.Fatalf("token with array aud rejected: %v", err)
	}
}

// Regression: a string "aud" used to skip the audience check entirely, so a
// token issued by the same tenant for ANOTHER application was accepted.
func TestVerifyToken_RejectsForeignAudience(t *testing.T) {
	key := newTestKey(t)
	c := baseClaims()
	c["aud"] = "another-app-client-id"
	if _, err := testVerifier(key).VerifyToken(signRS256(t, key, c)); err == nil {
		t.Fatal("token issued for another application must be rejected")
	}
}

func TestVerifyToken_RejectsWrongIssuer(t *testing.T) {
	key := newTestKey(t)
	c := baseClaims()
	c["iss"] = "https://login.microsoftonline.com/other-tenant/v2.0"
	if _, err := testVerifier(key).VerifyToken(signRS256(t, key, c)); err == nil {
		t.Fatal("token from another issuer must be rejected")
	}
}

func TestVerifyToken_RejectsExpiredAndMissingExp(t *testing.T) {
	key := newTestKey(t)
	c := baseClaims()
	c["exp"] = time.Now().Add(-time.Hour).Unix()
	if _, err := testVerifier(key).VerifyToken(signRS256(t, key, c)); err == nil {
		t.Fatal("expired token must be rejected")
	}
	delete(c, "exp")
	if _, err := testVerifier(key).VerifyToken(signRS256(t, key, c)); err == nil {
		t.Fatal("token without exp must be rejected")
	}
}

func TestVerifyToken_RejectsHMAC(t *testing.T) {
	key := newTestKey(t)
	// Algorithm confusion: an HS256 token must never be accepted.
	s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, baseClaims()).SignedString([]byte("secret"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := testVerifier(key).VerifyToken(s); err == nil {
		t.Fatal("HS256 token must be rejected")
	}
}

func TestVerifyIDToken_Nonce(t *testing.T) {
	key := newTestKey(t)
	v := testVerifier(key)
	c := baseClaims()
	c["nonce"] = "n-123"
	tok := signRS256(t, key, c)

	if _, err := v.VerifyIDToken(tok, "n-123"); err != nil {
		t.Fatalf("matching nonce rejected: %v", err)
	}
	if _, err := v.VerifyIDToken(tok, "other"); err == nil || !strings.Contains(err.Error(), "nonce") {
		t.Fatalf("mismatching nonce must be rejected, got %v", err)
	}
	if _, err := v.VerifyIDToken(tok, ""); err == nil {
		t.Fatal("missing expected nonce must be rejected")
	}
}
