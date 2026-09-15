package main

import "testing"

// Le chart Helm injecte HTTP_PORT et GRPC_PORT : une valeur ignorée ferait pointer
// le Service vers un port sur lequel rien n'écoute.
func TestEnvPort(t *testing.T) {
	cases := []struct {
		name, env, def, want string
	}{
		{"absent", "", "8080", "8080"},
		{"valide", "9090", "8080", "9090"},
		{"non numérique", "abc", "8080", "8080"},
		{"hors bornes", "70000", "8080", "8080"},
		{"zéro", "0", "8080", "8080"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if c.env != "" {
				t.Setenv("TEST_PORT", c.env)
			}
			if got := envPort("TEST_PORT", c.def); got != c.want {
				t.Errorf("envPort(%q) = %q, want %q", c.env, got, c.want)
			}
		})
	}
}
