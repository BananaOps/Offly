// Package mcp exposes Offly's data as a Model Context Protocol server, so that
// LLM agents can answer questions about absences, teams and public holidays.
//
// The tools are read-only by design. Write operations are deliberately absent:
// the ownership rules enforced by rbacMiddleware in cmd/server/main.go live in
// the HTTP layer and are not reachable from here, so exposing writes would let
// any caller create or delete absences on behalf of anyone.
package mcp

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"absence-management/internal/storage"

	mcpsdk "github.com/modelcontextprotocol/go-sdk/mcp"
)

const dateLayout = "2006-01-02"

// Handler returns an http.Handler serving the MCP streamable HTTP transport.
// Mount it on a path (Offly uses /mcp) of an existing http.ServeMux.
func Handler(store storage.Storage, version string) http.Handler {
	server := NewServer(store, version)
	return mcpsdk.NewStreamableHTTPHandler(
		func(*http.Request) *mcpsdk.Server { return server },
		nil,
	)
}

// NewServer builds the MCP server and registers every tool.
func NewServer(store storage.Storage, version string) *mcpsdk.Server {
	server := mcpsdk.NewServer(&mcpsdk.Implementation{
		Name:        "offly",
		Title:       "Offly — Time Off Manager",
		Description: "Query absences, teams, users and public holidays managed by Offly.",
		Version:     version,
	}, nil)

	t := &tools{store: store}
	readOnly := func(title string) *mcpsdk.ToolAnnotations {
		return &mcpsdk.ToolAnnotations{Title: title, ReadOnlyHint: true}
	}

	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "list_users",
		Description: "List every registered user with their team, country and job profile.",
		Annotations: readOnly("List users"),
	}, t.listUsers)

	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "list_teams",
		Description: "List teams, optionally restricted to one department.",
		Annotations: readOnly("List teams"),
	}, t.listTeams)

	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name: "list_absences",
		Description: "List absences overlapping a date range. " +
			"Use it to answer questions such as who is off during a given week.",
		Annotations: readOnly("List absences"),
	}, t.listAbsences)

	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name:        "list_holidays",
		Description: "List public holidays, optionally filtered by country and year.",
		Annotations: readOnly("List public holidays"),
	}, t.listHolidays)

	mcpsdk.AddTool(server, &mcpsdk.Tool{
		Name: "team_presence",
		Description: "Report who is present and who is away in a team on a single day, " +
			"accounting for both absences and the public holidays of each member's country.",
		Annotations: readOnly("Team presence for a day"),
	}, t.teamPresence)

	return server
}

type tools struct {
	store storage.Storage
}

// --- list_users ---

type ListUsersInput struct{}

type UserOut struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	TeamID     string `json:"teamId,omitempty"`
	TeamName   string `json:"teamName,omitempty"`
	Country    string `json:"country,omitempty"`
	JobProfile string `json:"jobProfile,omitempty"`
}

type ListUsersOutput struct {
	Users []UserOut `json:"users"`
}

func (t *tools) listUsers(ctx context.Context, _ *mcpsdk.CallToolRequest, _ ListUsersInput) (*mcpsdk.CallToolResult, ListUsersOutput, error) {
	users, err := t.store.GetUsers()
	if err != nil {
		return nil, ListUsersOutput{}, fmt.Errorf("failed to load users: %w", err)
	}
	teamNames, err := t.teamNames()
	if err != nil {
		return nil, ListUsersOutput{}, err
	}

	out := ListUsersOutput{Users: make([]UserOut, 0, len(users))}
	for _, u := range users {
		out.Users = append(out.Users, toUserOut(u, teamNames))
	}
	sort.Slice(out.Users, func(i, j int) bool { return out.Users[i].Name < out.Users[j].Name })
	return nil, out, nil
}

// --- list_teams ---

type ListTeamsInput struct {
	DepartmentID string `json:"departmentId,omitempty" jsonschema:"Only return teams of this department; omit for all teams"`
}

type TeamOut struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DepartmentID string `json:"departmentId,omitempty"`
	MemberCount  int    `json:"memberCount"`
}

type ListTeamsOutput struct {
	Teams []TeamOut `json:"teams"`
}

func (t *tools) listTeams(ctx context.Context, _ *mcpsdk.CallToolRequest, in ListTeamsInput) (*mcpsdk.CallToolResult, ListTeamsOutput, error) {
	teams, err := t.store.GetTeams(in.DepartmentID)
	if err != nil {
		return nil, ListTeamsOutput{}, fmt.Errorf("failed to load teams: %w", err)
	}
	users, err := t.store.GetUsers()
	if err != nil {
		return nil, ListTeamsOutput{}, fmt.Errorf("failed to load users: %w", err)
	}

	members := make(map[string]int, len(teams))
	for _, u := range users {
		members[u.TeamID]++
	}

	out := ListTeamsOutput{Teams: make([]TeamOut, 0, len(teams))}
	for _, team := range teams {
		out.Teams = append(out.Teams, TeamOut{
			ID:           team.ID,
			Name:         team.Name,
			DepartmentID: team.DepartmentID,
			MemberCount:  members[team.ID],
		})
	}
	sort.Slice(out.Teams, func(i, j int) bool { return out.Teams[i].Name < out.Teams[j].Name })
	return nil, out, nil
}

// --- list_absences ---

type ListAbsencesInput struct {
	StartDate string `json:"startDate" jsonschema:"Start of the range, YYYY-MM-DD (inclusive)"`
	EndDate   string `json:"endDate" jsonschema:"End of the range, YYYY-MM-DD (inclusive)"`
	UserID    string `json:"userId,omitempty" jsonschema:"Restrict to a single user; omit for everyone"`
}

type AbsenceOut struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	UserName  string `json:"userName,omitempty"`
	TeamName  string `json:"teamName,omitempty"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	Reason    string `json:"reason,omitempty"`
	Kind      string `json:"kind" jsonschema:"One of full_day, morning, afternoon"`
}

type ListAbsencesOutput struct {
	Absences []AbsenceOut `json:"absences"`
}

func (t *tools) listAbsences(ctx context.Context, _ *mcpsdk.CallToolRequest, in ListAbsencesInput) (*mcpsdk.CallToolResult, ListAbsencesOutput, error) {
	start, end, err := parseRange(in.StartDate, in.EndDate)
	if err != nil {
		return nil, ListAbsencesOutput{}, err
	}

	absences, err := t.store.GetAbsences(in.UserID, start, end)
	if err != nil {
		return nil, ListAbsencesOutput{}, fmt.Errorf("failed to load absences: %w", err)
	}
	users, err := t.store.GetUsers()
	if err != nil {
		return nil, ListAbsencesOutput{}, fmt.Errorf("failed to load users: %w", err)
	}
	teamNames, err := t.teamNames()
	if err != nil {
		return nil, ListAbsencesOutput{}, err
	}

	byID := make(map[string]*storage.User, len(users))
	for _, u := range users {
		byID[u.ID] = u
	}

	out := ListAbsencesOutput{Absences: make([]AbsenceOut, 0, len(absences))}
	for _, a := range absences {
		item := AbsenceOut{
			ID:        a.ID,
			UserID:    a.UserID,
			StartDate: a.StartDate.UTC().Format(time.RFC3339),
			EndDate:   a.EndDate.UTC().Format(time.RFC3339),
			Reason:    a.Reason,
			Kind:      absenceKind(a),
		}
		// TeamName is only persisted by the MongoDB backend; fall back to the
		// user's current team so the SQLite backend reports it too.
		item.TeamName = a.TeamName
		if u, ok := byID[a.UserID]; ok {
			item.UserName = u.Name
			if item.TeamName == "" {
				item.TeamName = teamNames[u.TeamID]
			}
		}
		out.Absences = append(out.Absences, item)
	}
	sort.Slice(out.Absences, func(i, j int) bool {
		if out.Absences[i].StartDate != out.Absences[j].StartDate {
			return out.Absences[i].StartDate < out.Absences[j].StartDate
		}
		return out.Absences[i].UserName < out.Absences[j].UserName
	})
	return nil, out, nil
}

// --- list_holidays ---

type ListHolidaysInput struct {
	Country string `json:"country,omitempty" jsonschema:"ISO 3166-1 alpha-2 country code, e.g. FR; omit for all countries"`
	Year    int    `json:"year,omitempty" jsonschema:"Calendar year, e.g. 2026; omit for all years"`
}

type HolidayOut struct {
	ID      string `json:"id"`
	Date    string `json:"date" jsonschema:"YYYY-MM-DD"`
	Name    string `json:"name"`
	Country string `json:"country"`
	Year    int    `json:"year"`
}

type ListHolidaysOutput struct {
	Holidays []HolidayOut `json:"holidays"`
}

func (t *tools) listHolidays(ctx context.Context, _ *mcpsdk.CallToolRequest, in ListHolidaysInput) (*mcpsdk.CallToolResult, ListHolidaysOutput, error) {
	holidays, err := t.store.GetHolidays(in.Country, in.Year)
	if err != nil {
		return nil, ListHolidaysOutput{}, fmt.Errorf("failed to load holidays: %w", err)
	}

	out := ListHolidaysOutput{Holidays: make([]HolidayOut, 0, len(holidays))}
	for _, h := range holidays {
		out.Holidays = append(out.Holidays, HolidayOut{
			ID: h.ID, Date: h.Date, Name: h.Name, Country: h.Country, Year: h.Year,
		})
	}
	sort.Slice(out.Holidays, func(i, j int) bool { return out.Holidays[i].Date < out.Holidays[j].Date })
	return nil, out, nil
}

// --- team_presence ---

type TeamPresenceInput struct {
	Date   string `json:"date" jsonschema:"Day to report on, YYYY-MM-DD"`
	TeamID string `json:"teamId,omitempty" jsonschema:"Team to report on; omit to cover every user"`
}

type MemberPresence struct {
	UserID  string `json:"userId"`
	Name    string `json:"name"`
	Present bool   `json:"present"`
	Reason  string `json:"reason,omitempty" jsonschema:"Why the member is away: the absence reason, or the public holiday name"`
	Kind    string `json:"kind,omitempty" jsonschema:"One of full_day, morning, afternoon, public_holiday"`
}

type TeamPresenceOutput struct {
	Date         string           `json:"date"`
	TeamID       string           `json:"teamId,omitempty"`
	TeamName     string           `json:"teamName,omitempty"`
	TotalMembers int              `json:"totalMembers"`
	PresentCount int              `json:"presentCount"`
	Members      []MemberPresence `json:"members"`
}

func (t *tools) teamPresence(ctx context.Context, _ *mcpsdk.CallToolRequest, in TeamPresenceInput) (*mcpsdk.CallToolResult, TeamPresenceOutput, error) {
	day, err := time.Parse(dateLayout, in.Date)
	if err != nil {
		return nil, TeamPresenceOutput{}, fmt.Errorf("invalid date %q, expected YYYY-MM-DD", in.Date)
	}
	start, end := dayBounds(day)

	users, err := t.store.GetUsers()
	if err != nil {
		return nil, TeamPresenceOutput{}, fmt.Errorf("failed to load users: %w", err)
	}
	absences, err := t.store.GetAbsences("", start, end)
	if err != nil {
		return nil, TeamPresenceOutput{}, fmt.Errorf("failed to load absences: %w", err)
	}
	teamNames, err := t.teamNames()
	if err != nil {
		return nil, TeamPresenceOutput{}, err
	}

	members := make([]*storage.User, 0, len(users))
	for _, u := range users {
		if in.TeamID == "" || u.TeamID == in.TeamID {
			members = append(members, u)
		}
	}

	absenceByUser := make(map[string]*storage.Absence, len(absences))
	for _, a := range absences {
		if _, seen := absenceByUser[a.UserID]; !seen {
			absenceByUser[a.UserID] = a
		}
	}

	// Public holidays are per country; only load the ones the members need.
	holidayByCountry := make(map[string]*storage.Holiday)
	dateStr := day.Format(dateLayout)
	for _, u := range members {
		country := u.Country
		if country == "" {
			continue
		}
		if _, done := holidayByCountry[country]; done {
			continue
		}
		holidayByCountry[country] = nil
		holidays, err := t.store.GetHolidays(country, day.Year())
		if err != nil {
			return nil, TeamPresenceOutput{}, fmt.Errorf("failed to load holidays for %s: %w", country, err)
		}
		for _, h := range holidays {
			if h.Date == dateStr {
				holidayByCountry[country] = h
				break
			}
		}
	}

	out := TeamPresenceOutput{
		Date:         dateStr,
		TeamID:       in.TeamID,
		TeamName:     teamNames[in.TeamID],
		TotalMembers: len(members),
		Members:      make([]MemberPresence, 0, len(members)),
	}
	for _, u := range members {
		entry := MemberPresence{UserID: u.ID, Name: u.Name, Present: true}
		if a, off := absenceByUser[u.ID]; off {
			entry.Present = false
			entry.Reason = a.Reason
			entry.Kind = absenceKind(a)
		} else if h := holidayByCountry[u.Country]; h != nil {
			entry.Present = false
			entry.Reason = h.Name
			entry.Kind = "public_holiday"
		}
		if entry.Present {
			out.PresentCount++
		}
		out.Members = append(out.Members, entry)
	}
	sort.Slice(out.Members, func(i, j int) bool { return out.Members[i].Name < out.Members[j].Name })
	return nil, out, nil
}

// --- helpers ---

func (t *tools) teamNames() (map[string]string, error) {
	teams, err := t.store.GetTeams("")
	if err != nil {
		return nil, fmt.Errorf("failed to load teams: %w", err)
	}
	names := make(map[string]string, len(teams))
	for _, team := range teams {
		names[team.ID] = team.Name
	}
	return names, nil
}

func toUserOut(u *storage.User, teamNames map[string]string) UserOut {
	return UserOut{
		ID:         u.ID,
		Name:       u.Name,
		Email:      u.Email,
		TeamID:     u.TeamID,
		TeamName:   teamNames[u.TeamID],
		Country:    u.Country,
		JobProfile: u.JobProfile,
	}
}

// dayBounds returns the UTC 00:00:00 -> 23:59:59 window of a day, matching the
// convention the web UI uses when it stores absences.
func dayBounds(day time.Time) (time.Time, time.Time) {
	y, m, d := day.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC),
		time.Date(y, m, d, 23, 59, 59, 0, time.UTC)
}

func parseRange(startDate, endDate string) (time.Time, time.Time, error) {
	start, err := time.Parse(dateLayout, startDate)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid startDate %q, expected YYYY-MM-DD", startDate)
	}
	end, err := time.Parse(dateLayout, endDate)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid endDate %q, expected YYYY-MM-DD", endDate)
	}
	if end.Before(start) {
		return time.Time{}, time.Time{}, fmt.Errorf("endDate %s is before startDate %s", endDate, startDate)
	}
	from, _ := dayBounds(start)
	_, to := dayBounds(end)
	return from, to, nil
}

// absenceKind derives the half-day flavour the UI encodes in the reason text.
// The markers match what AbsenceGrid.tsx writes when creating an absence.
func absenceKind(a *storage.Absence) string {
	switch {
	case strings.Contains(a.Reason, "Morning"):
		return "morning"
	case strings.Contains(a.Reason, "Afternoon"):
		return "afternoon"
	default:
		return "full_day"
	}
}
