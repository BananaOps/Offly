package main

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"absence-management/internal/auth"
	"absence-management/internal/storage"

	jwt "github.com/golang-jwt/jwt/v5"
)

// Ces tests font se rencontrer les deux moitiés du produit : le RBAC par
// groupes (AUTH_ADMIN_GROUPS, AUTH_ALLOWED_GROUPS) et les écritures ouvertes
// par les écrans récents. Chacune se vérifie isolément ailleurs ; ici on épingle
// leur combinaison, qui est ce qu'une fusion peut casser sans qu'un compilateur
// ni un test unitaire ne s'en aperçoive.

const testClientID = "offly-client-id"

// fakeProvider sert un document de découverte OIDC et un JWKS portant la clé
// publique de test : `NewVerifierFromEnv` le consomme comme un vrai fournisseur.
func fakeProvider(t *testing.T, key *rsa.PrivateKey) string {
	t.Helper()

	mux := http.NewServeMux()
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)

	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{
			"issuer":                 server.URL,
			"authorization_endpoint": server.URL + "/auth",
			"token_endpoint":         server.URL + "/token",
			"jwks_uri":               server.URL + "/keys",
		})
	})
	mux.HandleFunc("/keys", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kty": "RSA",
			"kid": "test-key",
			"use": "sig",
			"alg": "RS256",
			"n":   base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
			"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
		}}})
	})

	return server.URL
}

func tokenFor(t *testing.T, key *rsa.PrivateKey, issuer, email string, groups []string) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"iss":    issuer,
		"aud":    testClientID,
		"exp":    time.Now().Add(time.Hour).Unix(),
		"email":  email,
		"groups": groups,
	})
	token.Header["kid"] = "test-key"

	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return signed
}

// rbacUnderTest monte le middleware réel sur un stockage mémoire peuplé d'une
// personne, et renvoie la fonction qui joue une requête.
func rbacUnderTest(t *testing.T, key *rsa.PrivateKey, issuer string) func(method, path, token string) int {
	t.Helper()

	store := storage.NewMemoryStorage()
	if err := store.CreateUser(&storage.User{ID: "u-jane", Name: "Jane", Email: "jane@contoso.com"}); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	// Sans ce drapeau, AuthMiddleware laisse passer sans identité : c'est aussi la
	// raison pour laquelle main.go ne monte le RBAC que lorsqu'il est armé.
	t.Setenv("AUTH_ENABLED", "true")
	t.Setenv("AUTH_ISSUER_URL", issuer)
	t.Setenv("AUTH_CLIENT_ID", testClientID)
	verifier, err := auth.NewVerifierFromEnv()
	if err != nil {
		t.Fatalf("NewVerifierFromEnv: %v", err)
	}

	handler := rbacMiddleware(store, verifier, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	return func(method, path, token string) int {
		req := httptest.NewRequest(method, path, strings.NewReader(`{"name":"x","startDate":"2026-01-05"}`))
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}
}

func TestRBAC_EventsAreOpenToAnyAuthenticatedUser(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	issuer := fakeProvider(t, key)
	t.Setenv("AUTH_ADMIN_GROUPS", "offly-admins")

	call := rbacUnderTest(t, key, issuer)
	member := tokenFor(t, key, issuer, "jane@contoso.com", []string{"dev-team"})
	admin := tokenFor(t, key, issuer, "root@contoso.com", []string{"offly-admins"})

	cases := []struct {
		label  string
		method string
		path   string
		token  string
		want   int
	}{
		// La lecture reste ouverte, y compris sans identité.
		{"lecture anonyme des événements", "GET", "/api/v1/events", "", http.StatusOK},
		// La règle du jour : proposer un événement ne demande pas d'être admin.
		{"création par un simple membre", "POST", "/api/v1/events", member, http.StatusOK},
		{"modification par un simple membre", "PUT", "/api/v1/events/e-1", member, http.StatusOK},
		{"suppression par un simple membre", "DELETE", "/api/v1/events/e-1", member, http.StatusOK},
		// … mais une identité reste exigée : un anonyme n'écrit pas.
		{"création anonyme refusée", "POST", "/api/v1/events", "", http.StatusUnauthorized},
		// Les équipes, elles, restent administrées.
		{"équipe créée par un membre : refus", "POST", "/api/v1/teams", member, http.StatusForbidden},
		{"équipe créée par un admin de groupe", "POST", "/api/v1/teams", admin, http.StatusOK},
		{"férié créé par un membre : refus", "POST", "/api/v1/holidays", member, http.StatusForbidden},
	}

	for _, c := range cases {
		t.Run(c.label, func(t *testing.T) {
			if got := call(c.method, c.path, c.token); got != c.want {
				t.Errorf("%s %s = %d, attendu %d", c.method, c.path, got, c.want)
			}
		})
	}
}

// Avec AUTH_ALLOWED_GROUPS, une identité hors des groupes autorisés est traitée
// comme anonyme : elle lit, mais n'écrit pas — pas même un événement, dont la
// règle est pourtant la plus permissive de l'application.
func TestRBAC_DisallowedGroupCannotWriteEvents(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	issuer := fakeProvider(t, key)
	t.Setenv("AUTH_ALLOWED_GROUPS", "offly-users")

	call := rbacUnderTest(t, key, issuer)
	outsider := tokenFor(t, key, issuer, "jane@contoso.com", []string{"another-tenant-group"})
	insider := tokenFor(t, key, issuer, "jane@contoso.com", []string{"offly-users"})

	if got := call("GET", "/api/v1/events", outsider); got != http.StatusOK {
		t.Errorf("lecture par une identité hors groupe = %d, attendu %d", got, http.StatusOK)
	}
	if got := call("POST", "/api/v1/events", outsider); got != http.StatusUnauthorized {
		t.Errorf("écriture par une identité hors groupe = %d, attendu %d", got, http.StatusUnauthorized)
	}
	if got := call("POST", "/api/v1/events", insider); got != http.StatusOK {
		t.Errorf("écriture par un membre autorisé = %d, attendu %d", got, http.StatusOK)
	}
}
