package auth

import (
	"os"
	"strings"
)

// Auth settings are read from the environment at call time (same convention as
// the rest of the package), which keeps them trivially overridable in tests.
//
// Provider-agnostic: the defaults match the bundled Dex setup, every value can
// be overridden to target any OIDC provider (Microsoft Entra ID, Keycloak, …).
//
//	AUTH_REDIRECT_URL              OIDC redirect URI registered at the provider
//	                               (default http://localhost:8080/api/v1/auth/callback)
//	AUTH_POST_LOGIN_REDIRECT_URL   where the browser lands after login
//	                               (default http://localhost:3000/)
//	AUTH_SCOPES                    space-separated scopes (default "openid profile email groups";
//	                               Entra ID: "openid profile email" — "groups" is not a valid Entra scope)
//	AUTH_GROUPS_CLAIM              claim holding the user's groups (default "groups")
//	AUTH_ADMIN_GROUPS              comma-separated groups granted the admin role
//	                               (Entra ID: group object IDs). AUTH_ADMIN_GROUP is accepted as an alias.
//	AUTH_ALLOWED_GROUPS            comma-separated groups allowed to log in; empty = any authenticated user
//	AUTH_ADMIN_EMAILS              comma-separated admin emails (ADMIN_EMAILS fallback)

const (
	defaultRedirectURL      = "http://localhost:8080/api/v1/auth/callback"
	defaultPostLoginURL     = "http://localhost:3000/"
	defaultScopes           = "openid profile email groups"
	defaultGroupsClaim      = "groups"
	callbackCookiePath      = "/api/v1/auth"
	stateCookieName         = "oidc_state"
	nonceCookieName         = "oidc_nonce"
	pkceVerifierCookieName  = "oidc_pkce"
	authTokenCookieName     = "auth_token"
	loginFlowCookieLifetime = 600 // seconds allowed to complete the provider login
)

func envOr(name, def string) string {
	if v := strings.TrimSpace(os.Getenv(name)); v != "" {
		return v
	}
	return def
}

// csvEnv returns the trimmed, non-empty values of the first non-empty variable.
func csvEnv(names ...string) []string {
	for _, name := range names {
		raw := os.Getenv(name)
		if strings.TrimSpace(raw) == "" {
			continue
		}
		var out []string
		for _, v := range strings.Split(raw, ",") {
			if v = strings.TrimSpace(v); v != "" {
				out = append(out, v)
			}
		}
		return out
	}
	return nil
}

func redirectURL() string  { return envOr("AUTH_REDIRECT_URL", defaultRedirectURL) }
func postLoginURL() string { return envOr("AUTH_POST_LOGIN_REDIRECT_URL", defaultPostLoginURL) }
func scopes() string       { return envOr("AUTH_SCOPES", defaultScopes) }
func groupsClaim() string  { return envOr("AUTH_GROUPS_CLAIM", defaultGroupsClaim) }

func adminGroups() []string   { return csvEnv("AUTH_ADMIN_GROUPS", "AUTH_ADMIN_GROUP") }
func allowedGroups() []string { return csvEnv("AUTH_ALLOWED_GROUPS") }
func adminEmails() []string   { return csvEnv("AUTH_ADMIN_EMAILS", "ADMIN_EMAILS") }

func intersects(a, b []string) bool {
	for _, x := range a {
		for _, y := range b {
			if x == y {
				return true
			}
		}
	}
	return false
}

// IsAdminIdentity reports whether the identity holds the admin role: its email
// is listed in AUTH_ADMIN_EMAILS, or it belongs to one of AUTH_ADMIN_GROUPS.
func IsAdminIdentity(email string, groups []string) bool {
	if email != "" {
		for _, a := range adminEmails() {
			if strings.EqualFold(a, email) {
				return true
			}
		}
	}
	return intersects(groups, adminGroups())
}

// IsAllowedIdentity reports whether the identity may use the application.
// With AUTH_ALLOWED_GROUPS unset every authenticated user is allowed; otherwise
// the user must belong to one of them (admins are always allowed).
func IsAllowedIdentity(email string, groups []string) bool {
	allowed := allowedGroups()
	if len(allowed) == 0 {
		return true
	}
	return intersects(groups, allowed) || IsAdminIdentity(email, groups)
}

// RoleFor returns the Offly role ("admin" or "user") of an identity.
func RoleFor(email string, groups []string) string {
	if IsAdminIdentity(email, groups) {
		return "admin"
	}
	return "user"
}
