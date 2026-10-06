package auth

import (
	"reflect"
	"testing"
)

func TestEmailFromClaims(t *testing.T) {
	tests := []struct {
		name   string
		claims map[string]interface{}
		want   string
	}{
		{"email claim", map[string]interface{}{"email": "a@x.io", "preferred_username": "b@x.io"}, "a@x.io"},
		{"entra without email: preferred_username", map[string]interface{}{"preferred_username": "jane@contoso.com"}, "jane@contoso.com"},
		{"upn fallback", map[string]interface{}{"upn": "bob@contoso.com"}, "bob@contoso.com"},
		{"non-email username ignored", map[string]interface{}{"preferred_username": "jane"}, ""},
		{"none", map[string]interface{}{}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EmailFromClaims(tt.claims); got != tt.want {
				t.Errorf("EmailFromClaims() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestNameFromClaims(t *testing.T) {
	if got := NameFromClaims(map[string]interface{}{"name": "Jane Doe"}, "jane@x.io"); got != "Jane Doe" {
		t.Errorf("got %q", got)
	}
	if got := NameFromClaims(map[string]interface{}{}, "jane@x.io"); got != "jane" {
		t.Errorf("got %q", got)
	}
}

func TestGroupsFromClaims(t *testing.T) {
	t.Run("array", func(t *testing.T) {
		got := GroupsFromClaims(map[string]interface{}{"groups": []interface{}{"g1", "g2", 3}})
		if !reflect.DeepEqual(got, []string{"g1", "g2"}) {
			t.Errorf("got %v", got)
		}
	})
	t.Run("single string", func(t *testing.T) {
		got := GroupsFromClaims(map[string]interface{}{"groups": "g1"})
		if !reflect.DeepEqual(got, []string{"g1"}) {
			t.Errorf("got %v", got)
		}
	})
	t.Run("custom claim (e.g. Entra app roles)", func(t *testing.T) {
		t.Setenv("AUTH_GROUPS_CLAIM", "roles")
		got := GroupsFromClaims(map[string]interface{}{"roles": []interface{}{"Offly.Admin"}, "groups": []interface{}{"ignored"}})
		if !reflect.DeepEqual(got, []string{"Offly.Admin"}) {
			t.Errorf("got %v", got)
		}
	})
	t.Run("entra overage yields no group", func(t *testing.T) {
		got := GroupsFromClaims(map[string]interface{}{"_claim_names": map[string]interface{}{"groups": "src1"}})
		if got != nil {
			t.Errorf("got %v, want nil", got)
		}
	})
}

func TestIsAdminIdentity(t *testing.T) {
	t.Setenv("AUTH_ADMIN_GROUPS", "admins-oid, other-admins")
	t.Setenv("AUTH_ADMIN_EMAILS", "Boss@X.io")

	if !IsAdminIdentity("someone@x.io", []string{"users", "admins-oid"}) {
		t.Error("member of an admin group must be admin")
	}
	if !IsAdminIdentity("boss@x.io", nil) {
		t.Error("admin email (case-insensitive) must be admin")
	}
	if IsAdminIdentity("someone@x.io", []string{"users"}) {
		t.Error("non admin must not be admin")
	}
}

func TestIsAdminIdentity_SingularAlias(t *testing.T) {
	t.Setenv("AUTH_ADMIN_GROUPS", "")
	t.Setenv("AUTH_ADMIN_GROUP", "admin")
	if !IsAdminIdentity("a@x.io", []string{"admin"}) {
		t.Error("AUTH_ADMIN_GROUP alias must be honoured")
	}
}

func TestIsAllowedIdentity(t *testing.T) {
	t.Run("no restriction", func(t *testing.T) {
		t.Setenv("AUTH_ALLOWED_GROUPS", "")
		if !IsAllowedIdentity("a@x.io", nil) {
			t.Error("everyone allowed when AUTH_ALLOWED_GROUPS is empty")
		}
	})
	t.Run("restricted", func(t *testing.T) {
		t.Setenv("AUTH_ALLOWED_GROUPS", "users-oid")
		t.Setenv("AUTH_ADMIN_GROUPS", "admins-oid")
		if !IsAllowedIdentity("a@x.io", []string{"users-oid"}) {
			t.Error("member of an allowed group must be allowed")
		}
		if !IsAllowedIdentity("a@x.io", []string{"admins-oid"}) {
			t.Error("admins are always allowed")
		}
		if IsAllowedIdentity("a@x.io", []string{"guests"}) {
			t.Error("non member must be denied")
		}
	})
}

func TestRoleFor(t *testing.T) {
	t.Setenv("AUTH_ADMIN_GROUPS", "admins-oid")
	if RoleFor("a@x.io", []string{"admins-oid"}) != "admin" || RoleFor("a@x.io", nil) != "user" {
		t.Error("unexpected role mapping")
	}
}
