package auth

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"absence-management/internal/storage"

	jwt "github.com/golang-jwt/jwt/v5"
)

// fakeProvider is a minimal OIDC token endpoint that checks the PKCE verifier
// and returns an ID token carrying the given claims.
func fakeProvider(t *testing.T, sign func(jwt.MapClaims) string, claims jwt.MapClaims) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Errorf("parse form: %v", err)
		}
		if r.Form.Get("code") != "the-code" || r.Form.Get("client_secret") != "s3cret" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if r.Form.Get("code_verifier") == "" || r.Form.Get("redirect_uri") != "https://offly.example.com/api/v1/auth/callback" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"id_token": sign(claims), "expires_in": 3600})
	}))
}

func setLoginEnv(t *testing.T) {
	t.Setenv("AUTH_CLIENT_SECRET", "s3cret")
	t.Setenv("AUTH_REDIRECT_URL", "https://offly.example.com/api/v1/auth/callback")
	t.Setenv("AUTH_POST_LOGIN_REDIRECT_URL", "https://offly.example.com/")
	t.Setenv("AUTH_SCOPES", "openid profile email")
}

// login runs LoginHandler and returns its redirect URL and flow cookies.
func login(t *testing.T, v *Verifier) (*url.URL, []*http.Cookie) {
	t.Helper()
	rec := httptest.NewRecorder()
	LoginHandler(v)(rec, httptest.NewRequest(http.MethodGet, "/api/v1/auth/login", nil))
	if rec.Code != http.StatusFound {
		t.Fatalf("login status = %d", rec.Code)
	}
	loc, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatal(err)
	}
	return loc, rec.Result().Cookies()
}

func TestLoginHandler_BuildsAuthorizationRequest(t *testing.T) {
	setLoginEnv(t)
	v := testVerifier(newTestKey(t))
	v.authorizationURL = "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize"

	loc, cookies := login(t, v)
	q := loc.Query()
	if loc.Host != "login.microsoftonline.com" || loc.Path != "/tenant-id/oauth2/v2.0/authorize" {
		t.Errorf("unexpected authorization endpoint %s", loc)
	}
	for k, want := range map[string]string{
		"client_id":             testClientID,
		"redirect_uri":          "https://offly.example.com/api/v1/auth/callback",
		"response_type":         "code",
		"scope":                 "openid profile email",
		"code_challenge_method": "S256",
	} {
		if q.Get(k) != want {
			t.Errorf("%s = %q, want %q", k, q.Get(k), want)
		}
	}

	byName := map[string]string{}
	for _, c := range cookies {
		byName[c.Name] = c.Value
		if !c.HttpOnly || !c.Secure {
			t.Errorf("cookie %s must be HttpOnly and Secure", c.Name)
		}
	}
	if q.Get("state") == "" || q.Get("state") != byName[stateCookieName] {
		t.Error("state must be sent and stored in a cookie")
	}
	if q.Get("nonce") == "" || q.Get("nonce") != byName[nonceCookieName] {
		t.Error("nonce must be sent and stored in a cookie")
	}
	sum := sha256.Sum256([]byte(byName[pkceVerifierCookieName]))
	if q.Get("code_challenge") != base64.RawURLEncoding.EncodeToString(sum[:]) {
		t.Error("code_challenge must be the S256 of the stored verifier")
	}
}

// callback replays the provider redirect with the flow cookies of a login.
func callback(t *testing.T, v *Verifier, store storage.Storage, state string, cookies []*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/callback?code=the-code&state="+url.QueryEscape(state), nil)
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	CallbackHandler(store, v)(rec, req)
	return rec
}

func TestCallback_FullFlow(t *testing.T) {
	setLoginEnv(t)
	t.Setenv("AUTH_ALLOWED_GROUPS", "users-oid")
	key := newTestKey(t)
	v := testVerifier(key)
	v.authorizationURL = "https://idp.example.com/authorize"

	loc, cookies := login(t, v)
	nonce := loc.Query().Get("nonce")

	claims := baseClaims()
	delete(claims, "email") // Entra without the optional email claim
	claims["preferred_username"] = "jane@contoso.com"
	claims["name"] = "Jane Doe"
	claims["nonce"] = nonce
	claims["groups"] = []interface{}{"users-oid"}
	provider := fakeProvider(t, func(c jwt.MapClaims) string { return signRS256(t, key, c) }, claims)
	defer provider.Close()
	v.tokenURL = provider.URL

	store := storage.NewMemoryStorage()
	rec := callback(t, v, store, loc.Query().Get("state"), cookies)
	if rec.Code != http.StatusFound {
		t.Fatalf("callback status = %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Location"); got != "https://offly.example.com/?logged_in=true" {
		t.Errorf("post-login redirect = %q", got)
	}
	var session bool
	for _, c := range rec.Result().Cookies() {
		if c.Name == authTokenCookieName && c.Value != "" && c.HttpOnly && c.Secure {
			session = true
		}
	}
	if !session {
		t.Error("session cookie not set")
	}
	users, _ := store.GetUsers()
	if len(users) != 1 || users[0].Email != "jane@contoso.com" || users[0].Name != "Jane Doe" {
		t.Errorf("user not provisioned: %+v", users)
	}
}

func TestCallback_RejectsStateMismatch(t *testing.T) {
	setLoginEnv(t)
	v := testVerifier(newTestKey(t))
	v.authorizationURL = "https://idp.example.com/authorize"
	v.tokenURL = "https://idp.example.com/token"

	_, cookies := login(t, v)
	if rec := callback(t, v, storage.NewMemoryStorage(), "forged-state", cookies); rec.Code != http.StatusBadRequest {
		t.Fatalf("forged state: status = %d, want 400", rec.Code)
	}
	if rec := callback(t, v, storage.NewMemoryStorage(), "whatever", nil); rec.Code != http.StatusBadRequest {
		t.Fatalf("no flow cookies: status = %d, want 400", rec.Code)
	}
}

func TestCallback_DeniesUserOutsideAllowedGroups(t *testing.T) {
	setLoginEnv(t)
	t.Setenv("AUTH_ALLOWED_GROUPS", "users-oid")
	key := newTestKey(t)
	v := testVerifier(key)
	v.authorizationURL = "https://idp.example.com/authorize"

	loc, cookies := login(t, v)
	claims := baseClaims()
	claims["nonce"] = loc.Query().Get("nonce")
	claims["groups"] = []interface{}{"guests"}
	provider := fakeProvider(t, func(c jwt.MapClaims) string { return signRS256(t, key, c) }, claims)
	defer provider.Close()
	v.tokenURL = provider.URL

	store := storage.NewMemoryStorage()
	if rec := callback(t, v, store, loc.Query().Get("state"), cookies); rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
	if users, _ := store.GetUsers(); len(users) != 0 {
		t.Error("denied user must not be provisioned")
	}
}

func TestCallback_RejectsReplayedNonce(t *testing.T) {
	setLoginEnv(t)
	key := newTestKey(t)
	v := testVerifier(key)
	v.authorizationURL = "https://idp.example.com/authorize"

	loc, cookies := login(t, v)
	claims := baseClaims()
	claims["nonce"] = "nonce-from-another-login"
	provider := fakeProvider(t, func(c jwt.MapClaims) string { return signRS256(t, key, c) }, claims)
	defer provider.Close()
	v.tokenURL = provider.URL

	if rec := callback(t, v, storage.NewMemoryStorage(), loc.Query().Get("state"), cookies); rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}
