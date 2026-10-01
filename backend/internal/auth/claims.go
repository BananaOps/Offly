package auth

import (
	"log"
	"strings"
)

// EmailFromClaims returns the user's email. Providers do not all emit the
// "email" claim (Entra ID only does when the optional claim is configured and
// the account has a mail attribute), so fall back to preferred_username / upn
// when they look like an email address.
func EmailFromClaims(claims map[string]interface{}) string {
	for _, key := range []string{"email", "preferred_username", "upn"} {
		if v, _ := claims[key].(string); strings.Contains(v, "@") {
			return v
		}
	}
	return ""
}

// NameFromClaims returns a display name: "name", then "preferred_username",
// then the local part of the email.
func NameFromClaims(claims map[string]interface{}, email string) string {
	if name, _ := claims["name"].(string); name != "" {
		return name
	}
	if username, _ := claims["preferred_username"].(string); username != "" {
		return username
	}
	if at := strings.IndexByte(email, '@'); at > 0 {
		return email[:at]
	}
	return email
}

// GroupsFromClaims returns the groups carried by the configured groups claim
// (AUTH_GROUPS_CLAIM, default "groups"). Accepts a JSON array or a single string.
//
// Entra ID: when a user belongs to too many groups the token carries a
// "_claim_names" overage pointer instead of the list; this is logged and the
// user is treated as having no group — configure the app registration to emit
// only the groups assigned to the application to avoid it.
func GroupsFromClaims(claims map[string]interface{}) []string {
	claim := groupsClaim()
	var groups []string
	switch raw := claims[claim].(type) {
	case []interface{}:
		for _, g := range raw {
			if s, ok := g.(string); ok && s != "" {
				groups = append(groups, s)
			}
		}
	case []string:
		groups = append(groups, raw...)
	case string:
		if raw != "" {
			groups = append(groups, raw)
		}
	}
	if groups == nil {
		if names, ok := claims["_claim_names"].(map[string]interface{}); ok {
			if _, overage := names[claim]; overage {
				log.Printf("auth: %q claim overage (too many groups) — no groups taken into account", claim)
			}
		}
	}
	return groups
}
