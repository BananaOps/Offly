package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"absence-management/internal/storage"
)

func requestWithContext(key contextKey, val any) *http.Request {
	r, _ := http.NewRequest(http.MethodGet, "/", nil)
	return r.WithContext(context.WithValue(r.Context(), key, val))
}

func TestGetUserEmail(t *testing.T) {
	r := requestWithContext(userEmailKey, "alice@example.com")
	if got := GetUserEmail(r); got != "alice@example.com" {
		t.Fatalf("expected alice@example.com, got %s", got)
	}

	r2, _ := http.NewRequest(http.MethodGet, "/", nil)
	if got := GetUserEmail(r2); got != "" {
		t.Fatalf("expected empty, got %s", got)
	}
}

func TestGetUserID(t *testing.T) {
	r := requestWithContext(userIDKey, "uid-123")
	if got := GetUserID(r); got != "uid-123" {
		t.Fatalf("expected uid-123, got %s", got)
	}
}

func TestGetUserGroups(t *testing.T) {
	r := requestWithContext(userGroupsKey, []string{"admin", "dev"})
	groups := GetUserGroups(r)
	if len(groups) != 2 || groups[0] != "admin" {
		t.Fatalf("unexpected groups: %v", groups)
	}

	r2, _ := http.NewRequest(http.MethodGet, "/", nil)
	if GetUserGroups(r2) != nil {
		t.Fatal("expected nil groups for unauthenticated request")
	}
}

func TestIsAdmin(t *testing.T) {
	t.Setenv("AUTH_ADMIN_EMAILS", "admin@example.com, boss@example.com")

	adminReq := requestWithContext(userEmailKey, "admin@example.com")
	if !IsAdmin(adminReq) {
		t.Fatal("expected admin@example.com to be admin")
	}

	userReq := requestWithContext(userEmailKey, "user@example.com")
	if IsAdmin(userReq) {
		t.Fatal("expected user@example.com to not be admin")
	}

	emptyReq, _ := http.NewRequest(http.MethodGet, "/", nil)
	if IsAdmin(emptyReq) {
		t.Fatal("expected unauthenticated request to not be admin")
	}
}

func TestIsAdmin_NoEnvVar(t *testing.T) {
	t.Setenv("AUTH_ADMIN_EMAILS", "")
	t.Setenv("ADMIN_EMAILS", "")

	r := requestWithContext(userEmailKey, "admin@example.com")
	if IsAdmin(r) {
		t.Fatal("expected false when no admin emails configured")
	}
}

func TestRequireAdmin(t *testing.T) {
	t.Setenv("AUTH_ADMIN_EMAILS", "admin@example.com")

	handler := RequireAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Admin request — should pass through
	adminReq := requestWithContext(userEmailKey, "admin@example.com")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, adminReq)
	if rr.Code != http.StatusOK {
		t.Fatalf("admin: expected 200, got %d", rr.Code)
	}

	// Non-admin request — should return 403
	userReq := requestWithContext(userEmailKey, "user@example.com")
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, userReq)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("non-admin: expected 403, got %d", rr.Code)
	}
}

func TestAuthMiddleware_Disabled(t *testing.T) {
	t.Setenv("AUTH_ENABLED", "false")

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	store := storage.NewMemoryStorage()
	middleware := AuthMiddleware(nil, store, false)(next)

	r, _ := http.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	middleware.ServeHTTP(rr, r)

	if !called {
		t.Fatal("expected next handler to be called when auth is disabled")
	}
}

func TestAuthMiddleware_NilVerifier_Required(t *testing.T) {
	t.Setenv("AUTH_ENABLED", "true")

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	store := storage.NewMemoryStorage()
	middleware := AuthMiddleware(nil, store, true)(next)

	r, _ := http.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	middleware.ServeHTTP(rr, r)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when verifier is nil and auth required, got %d", rr.Code)
	}
}

func TestAuthMiddleware_NilVerifier_Optional(t *testing.T) {
	t.Setenv("AUTH_ENABLED", "true")

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	store := storage.NewMemoryStorage()
	middleware := AuthMiddleware(nil, store, false)(next)

	r, _ := http.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	middleware.ServeHTTP(rr, r)

	if !called {
		t.Fatal("expected next handler to be called when verifier is nil and auth is optional")
	}
}

func TestAuthMiddleware_NoToken_Optional(t *testing.T) {
	t.Setenv("AUTH_ENABLED", "true")

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	store := storage.NewMemoryStorage()
	// Non-nil verifier with a dummy issuer — token verification will fail
	v := &Verifier{issuer: "http://localhost:5556/dex", clientID: "test"}
	middleware := AuthMiddleware(v, store, false)(next)

	r, _ := http.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	middleware.ServeHTTP(rr, r)

	if !called {
		t.Fatal("expected next handler to be called when no token and auth is optional")
	}
	_ = rr
}
