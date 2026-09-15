package mcp

import (
	"context"
	"testing"
	"time"

	"absence-management/internal/storage"
)

// newTestStore builds an in-memory store with two teams, three users spread
// across two countries, one absence and one French public holiday.
func newTestStore(t *testing.T) storage.Storage {
	t.Helper()
	store := storage.NewMemoryStorage()

	if err := store.CreateTeam(&storage.Team{ID: "team-be", Name: "Backend"}); err != nil {
		t.Fatalf("CreateTeam: %v", err)
	}
	if err := store.CreateTeam(&storage.Team{ID: "team-fe", Name: "Frontend"}); err != nil {
		t.Fatalf("CreateTeam: %v", err)
	}

	users := []*storage.User{
		{ID: "u-alice", Name: "Alice", Email: "alice@offly.io", TeamID: "team-be", Country: "FR"},
		{ID: "u-bob", Name: "Bob", Email: "bob@offly.io", TeamID: "team-be", Country: "US"},
		{ID: "u-carol", Name: "Carol", Email: "carol@offly.io", TeamID: "team-fe", Country: "FR"},
	}
	for _, u := range users {
		if err := store.CreateUser(u); err != nil {
			t.Fatalf("CreateUser: %v", err)
		}
	}

	// Alice is off on 2026-07-10 (full day).
	if err := store.CreateAbsence(&storage.Absence{
		ID:        "abs-1",
		UserID:    "u-alice",
		StartDate: time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 7, 10, 23, 59, 59, 0, time.UTC),
		Reason:    "Time Off",
	}); err != nil {
		t.Fatalf("CreateAbsence: %v", err)
	}

	// Bastille Day: a holiday for FR members only.
	if err := store.CreateHoliday(&storage.Holiday{
		ID: "hol-1", Date: "2026-07-14", Name: "Fête Nationale", Country: "FR", Year: 2026,
	}); err != nil {
		t.Fatalf("CreateHoliday: %v", err)
	}

	return store
}

func TestListUsers(t *testing.T) {
	tl := &tools{store: newTestStore(t)}

	_, out, err := tl.listUsers(context.Background(), nil, ListUsersInput{})
	if err != nil {
		t.Fatalf("listUsers: %v", err)
	}
	if len(out.Users) != 3 {
		t.Fatalf("expected 3 users, got %d", len(out.Users))
	}
	// Sorted by name.
	if out.Users[0].Name != "Alice" || out.Users[2].Name != "Carol" {
		t.Errorf("users not sorted by name: %v", out.Users)
	}
	if out.Users[0].TeamName != "Backend" {
		t.Errorf("expected Alice's team name to be resolved, got %q", out.Users[0].TeamName)
	}
}

func TestListTeamsCountsMembers(t *testing.T) {
	tl := &tools{store: newTestStore(t)}

	_, out, err := tl.listTeams(context.Background(), nil, ListTeamsInput{})
	if err != nil {
		t.Fatalf("listTeams: %v", err)
	}
	counts := map[string]int{}
	for _, team := range out.Teams {
		counts[team.Name] = team.MemberCount
	}
	if counts["Backend"] != 2 {
		t.Errorf("expected Backend to have 2 members, got %d", counts["Backend"])
	}
	if counts["Frontend"] != 1 {
		t.Errorf("expected Frontend to have 1 member, got %d", counts["Frontend"])
	}
}

func TestListAbsencesWithinRange(t *testing.T) {
	tl := &tools{store: newTestStore(t)}
	ctx := context.Background()

	_, out, err := tl.listAbsences(ctx, nil, ListAbsencesInput{
		StartDate: "2026-07-01", EndDate: "2026-07-31",
	})
	if err != nil {
		t.Fatalf("listAbsences: %v", err)
	}
	if len(out.Absences) != 1 {
		t.Fatalf("expected 1 absence in July, got %d", len(out.Absences))
	}
	got := out.Absences[0]
	if got.UserName != "Alice" {
		t.Errorf("expected the absence to name Alice, got %q", got.UserName)
	}
	if got.TeamName != "Backend" {
		t.Errorf("expected team name to fall back to the user's team, got %q", got.TeamName)
	}
	if got.Kind != "full_day" {
		t.Errorf("expected kind full_day, got %q", got.Kind)
	}

	// A range that does not overlap must come back empty, not nil-panic.
	_, empty, err := tl.listAbsences(ctx, nil, ListAbsencesInput{
		StartDate: "2026-08-01", EndDate: "2026-08-31",
	})
	if err != nil {
		t.Fatalf("listAbsences (August): %v", err)
	}
	if len(empty.Absences) != 0 {
		t.Errorf("expected no absence in August, got %d", len(empty.Absences))
	}
}

func TestListAbsencesRejectsBadDates(t *testing.T) {
	tl := &tools{store: newTestStore(t)}
	ctx := context.Background()

	if _, _, err := tl.listAbsences(ctx, nil, ListAbsencesInput{
		StartDate: "10/07/2026", EndDate: "2026-07-31",
	}); err == nil {
		t.Error("expected an error for a non YYYY-MM-DD startDate")
	}

	if _, _, err := tl.listAbsences(ctx, nil, ListAbsencesInput{
		StartDate: "2026-07-31", EndDate: "2026-07-01",
	}); err == nil {
		t.Error("expected an error when endDate precedes startDate")
	}
}

func TestTeamPresenceCountsAbsence(t *testing.T) {
	tl := &tools{store: newTestStore(t)}

	_, out, err := tl.teamPresence(context.Background(), nil, TeamPresenceInput{
		Date: "2026-07-10", TeamID: "team-be",
	})
	if err != nil {
		t.Fatalf("teamPresence: %v", err)
	}
	if out.TeamName != "Backend" {
		t.Errorf("expected team name Backend, got %q", out.TeamName)
	}
	if out.TotalMembers != 2 || out.PresentCount != 1 {
		t.Fatalf("expected 1 of 2 present, got %d of %d", out.PresentCount, out.TotalMembers)
	}
	byName := map[string]MemberPresence{}
	for _, m := range out.Members {
		byName[m.Name] = m
	}
	if byName["Alice"].Present {
		t.Error("Alice is on leave and should not be present")
	}
	if !byName["Bob"].Present {
		t.Error("Bob should be present")
	}
}

// A public holiday only takes out the members of that country.
func TestTeamPresenceHonoursCountryHoliday(t *testing.T) {
	tl := &tools{store: newTestStore(t)}

	_, out, err := tl.teamPresence(context.Background(), nil, TeamPresenceInput{
		Date: "2026-07-14", TeamID: "team-be",
	})
	if err != nil {
		t.Fatalf("teamPresence: %v", err)
	}
	byName := map[string]MemberPresence{}
	for _, m := range out.Members {
		byName[m.Name] = m
	}
	if byName["Alice"].Present {
		t.Error("Alice is French and should be off on Bastille Day")
	}
	if byName["Alice"].Kind != "public_holiday" {
		t.Errorf("expected kind public_holiday for Alice, got %q", byName["Alice"].Kind)
	}
	if !byName["Bob"].Present {
		t.Error("Bob is American and should still be present on Bastille Day")
	}
	if out.PresentCount != 1 {
		t.Errorf("expected 1 present member, got %d", out.PresentCount)
	}
}

func TestListHolidaysFiltersByCountry(t *testing.T) {
	tl := &tools{store: newTestStore(t)}
	ctx := context.Background()

	_, fr, err := tl.listHolidays(ctx, nil, ListHolidaysInput{Country: "FR", Year: 2026})
	if err != nil {
		t.Fatalf("listHolidays: %v", err)
	}
	if len(fr.Holidays) != 1 || fr.Holidays[0].Name != "Fête Nationale" {
		t.Fatalf("expected the French holiday, got %+v", fr.Holidays)
	}

	_, us, err := tl.listHolidays(ctx, nil, ListHolidaysInput{Country: "US", Year: 2026})
	if err != nil {
		t.Fatalf("listHolidays: %v", err)
	}
	if len(us.Holidays) != 0 {
		t.Errorf("expected no US holiday, got %+v", us.Holidays)
	}
}

func TestAbsenceKind(t *testing.T) {
	cases := map[string]string{
		"Time Off":               "full_day",
		"☀️ Time Off (Morning)":  "morning",
		"🌙 Time Off (Afternoon)": "afternoon",
	}
	for reason, want := range cases {
		if got := absenceKind(&storage.Absence{Reason: reason}); got != want {
			t.Errorf("absenceKind(%q) = %q, want %q", reason, got, want)
		}
	}
}

// NewServer must register every tool without panicking on schema inference.
func TestNewServerRegistersTools(t *testing.T) {
	if srv := NewServer(newTestStore(t), "test"); srv == nil {
		t.Fatal("NewServer returned nil")
	}
}
