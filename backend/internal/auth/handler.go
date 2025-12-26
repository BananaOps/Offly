package auth

import (
	"encoding/json"
	"net/http"
    "os"
    "strings"

	"absence-management/internal/storage"

	"github.com/google/uuid"
)

// EnsureUserHandler verifies the bearer token and ensures a corresponding user exists.
// It creates a user with claims-derived fields if missing.
func EnsureUserHandler(store storage.Storage, v *Verifier) http.HandlerFunc {
    type resp struct {
        ID      string `json:"id"`
        Name    string `json:"name"`
        Email   string `json:"email"`
        Country string `json:"country,omitempty"`
    }

    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")

        if v == nil {
            w.WriteHeader(http.StatusServiceUnavailable)
            _ = json.NewEncoder(w).Encode(map[string]string{"error": "OIDC verifier not initialized"})
            return
        }

        claims, err := v.VerifyBearer(r)
        if err != nil {
            w.WriteHeader(http.StatusUnauthorized)
            _ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
            return
        }

        email, _ := claims["email"].(string)
        if email == "" {
            // Dex may include email in ID token when scope includes email
            w.WriteHeader(http.StatusBadRequest)
            _ = json.NewEncoder(w).Encode(map[string]string{"error": "email claim missing"})
            return
        }
        name, _ := claims["name"].(string)
        if name == "" {
            // fallback to preferred_username or given_name + family_name
            if pu, _ := claims["preferred_username"].(string); pu != "" {
                name = pu
            } else {
                given, _ := claims["given_name"].(string)
                family, _ := claims["family_name"].(string)
                if given != "" || family != "" {
                    if given != "" && family != "" {
                        name = given + " " + family
                    } else if given != "" {
                        name = given
                    } else {
                        name = family
                    }
                } else {
                    name = email
                }
            }
        }

        // Check if user exists by email
        users, _ := store.GetUsers()
        var existing *storage.User
        for _, u := range users {
            if u.Email == email {
                existing = u
                break
            }
        }

        var u *storage.User
        if existing == nil {
            // Create new user
            u = &storage.User{
                ID:    uuid.New().String(),
                Name:  name,
                Email: email,
            }
            if err := store.CreateUser(u); err != nil {
                w.WriteHeader(http.StatusInternalServerError)
                _ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to create user"})
                return
            }
        } else {
            u = existing
        }

        // Read groups claim if present (Dex emits this when groups scope is requested).
        var groupsFromToken []string
        if groupsRaw, ok := claims["groups"].([]interface{}); ok {
            for _, g := range groupsRaw {
                if s, ok := g.(string); ok {
                    groupsFromToken = append(groupsFromToken, s)
                }
            }
        }

        // Assign groups via Teams under a dedicated Department using env-configurable rules.
        // Env:
        // - AUTH_DOMAIN_DEPARTMENT: department name (default: bananaops.tech)
        // - AUTH_ADMIN_EMAILS: comma-separated admin emails (fallback if groups claim not present)
        // - AUTH_ADMIN_GROUP: group name from token claim for admin (default: admin)
        // - AUTH_GROUP_ADMIN: admin team name (default: admin)
        // - AUTH_GROUP_USER: user team name (default: user)
        domainDept := os.Getenv("AUTH_DOMAIN_DEPARTMENT")
        if domainDept == "" {
            domainDept = "bananaops.tech"
        }

        // Determine if user is admin from groups claim or email list
        adminGroupName := os.Getenv("AUTH_ADMIN_GROUP")
        if adminGroupName == "" { adminGroupName = "admin" }
        isAdmin := false
        for _, g := range groupsFromToken {
            if g == adminGroupName {
                isAdmin = true
                break
            }
        }
        if !isAdmin {
            // Fallback: check email list
            adminList := os.Getenv("AUTH_ADMIN_EMAILS")
            if adminList == "" {
                adminList = "elie.copter@bananaops.tech"
            }
            adminEmails := map[string]struct{}{}
            for _, e := range strings.Split(adminList, ",") {
                e = strings.TrimSpace(e)
                if e != "" {
                    adminEmails[e] = struct{}{}
                }
            }
            _, isAdmin = adminEmails[email]
        }

        adminTeamName := os.Getenv("AUTH_GROUP_ADMIN")
        if adminTeamName == "" { adminTeamName = "admin" }
        userTeamName := os.Getenv("AUTH_GROUP_USER")
        if userTeamName == "" { userTeamName = "user" }

        depts, _ := store.GetDepartments()
        var dept *storage.Department
            for _, d := range depts {
                if d.Name == domainDept {
                    dept = d
                    break
                }
            }
            if dept == nil {
                dept = &storage.Department{ID: uuid.New().String(), Name: domainDept}
                _ = store.CreateDepartment(dept)
            }

            teams, _ := store.GetTeams(dept.ID)
            var userTeam *storage.Team
            var adminTeam *storage.Team
            for _, t := range teams {
                if t.Name == userTeamName {
                    userTeam = t
                } else if t.Name == adminTeamName {
                    adminTeam = t
                }
            }
            if userTeam == nil {
                userTeam = &storage.Team{ID: uuid.New().String(), Name: userTeamName, DepartmentID: dept.ID}
                _ = store.CreateTeam(userTeam)
            }
            if adminTeam == nil {
                adminTeam = &storage.Team{ID: uuid.New().String(), Name: adminTeamName, DepartmentID: dept.ID}
                _ = store.CreateTeam(adminTeam)
            }

            // Assign department and team to the user.
            u.DepartmentID = dept.ID
            if isAdmin {
                u.TeamID = adminTeam.ID
            } else {
                u.TeamID = userTeam.ID
            }
            _ = store.UpdateUser(u)

            _ = json.NewEncoder(w).Encode(resp{ID: u.ID, Name: u.Name, Email: u.Email, Country: u.Country})
    }
}
