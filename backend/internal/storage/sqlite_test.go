package storage

import (
	"testing"
	"time"
)

func newTestSQLite(t *testing.T) *SQLiteStorage {
	t.Helper()
	s, err := NewSQLiteStorage(":memory:")
	if err != nil {
		t.Fatalf("NewSQLiteStorage: %v", err)
	}
	return s
}

func TestSQLiteStorage_Absence(t *testing.T) {
	s := newTestSQLite(t)

	// SQLite requires a user to exist for the foreign key, but FK enforcement
	// is disabled by default in go-sqlite3, so we can insert absences directly.
	now := time.Now().UTC().Truncate(time.Second)
	absence := &Absence{
		ID:        "abs-1",
		UserID:    "user-1",
		StartDate: now,
		EndDate:   now.Add(24 * time.Hour),
		Reason:    "sick",
		Status:    "pending",
	}

	if err := s.CreateAbsence(absence); err != nil {
		t.Fatalf("CreateAbsence: %v", err)
	}

	got, err := s.GetAbsenceByID("abs-1")
	if err != nil {
		t.Fatalf("GetAbsenceByID: %v", err)
	}
	if got.Reason != "sick" {
		t.Fatalf("expected reason=sick, got %s", got.Reason)
	}

	absences, err := s.GetAbsences("user-1", now.Add(-time.Hour), now.Add(48*time.Hour))
	if err != nil || len(absences) != 1 {
		t.Fatalf("GetAbsences: expected 1, got %d (err %v)", len(absences), err)
	}

	absence.Status = "approved"
	if err := s.UpdateAbsence(absence); err != nil {
		t.Fatalf("UpdateAbsence: %v", err)
	}
	got, _ = s.GetAbsenceByID("abs-1")
	if got.Status != "approved" {
		t.Fatalf("UpdateAbsence: expected approved, got %s", got.Status)
	}

	if err := s.DeleteAbsence("abs-1"); err != nil {
		t.Fatalf("DeleteAbsence: %v", err)
	}
	if _, err := s.GetAbsenceByID("abs-1"); err == nil {
		t.Fatal("expected error after delete")
	}
}

func TestSQLiteStorage_User(t *testing.T) {
	s := newTestSQLite(t)

	user := &User{ID: "u-1", Name: "Bob", Email: "bob@example.com", Country: "FR"}
	if err := s.CreateUser(user); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	users, err := s.GetUsers()
	if err != nil || len(users) != 1 || users[0].Name != "Bob" {
		t.Fatalf("GetUsers: %v %v", err, users)
	}

	user.Name = "Bob Updated"
	user.JobProfile = "Engineer"
	if err := s.UpdateUser(user); err != nil {
		t.Fatalf("UpdateUser: %v", err)
	}
	users, _ = s.GetUsers()
	if users[0].Name != "Bob Updated" || users[0].JobProfile != "Engineer" {
		t.Fatalf("UpdateUser: unexpected values %+v", users[0])
	}

	if err := s.DeleteUser("u-1"); err != nil {
		t.Fatalf("DeleteUser: %v", err)
	}
	users, _ = s.GetUsers()
	if len(users) != 0 {
		t.Fatalf("DeleteUser: expected 0, got %d", len(users))
	}
}

func TestSQLiteStorage_Department(t *testing.T) {
	s := newTestSQLite(t)

	dept := &Department{ID: "d-1", Name: "Engineering"}
	if err := s.CreateDepartment(dept); err != nil {
		t.Fatalf("CreateDepartment: %v", err)
	}

	depts, err := s.GetDepartments()
	if err != nil || len(depts) != 1 || depts[0].Name != "Engineering" {
		t.Fatalf("GetDepartments: %v %v", err, depts)
	}

	dept.Name = "R&D"
	if err := s.UpdateDepartment(dept); err != nil {
		t.Fatalf("UpdateDepartment: %v", err)
	}
	depts, _ = s.GetDepartments()
	if depts[0].Name != "R&D" {
		t.Fatalf("UpdateDepartment: expected R&D, got %s", depts[0].Name)
	}

	if err := s.DeleteDepartment("d-1"); err != nil {
		t.Fatalf("DeleteDepartment: %v", err)
	}
	depts, _ = s.GetDepartments()
	if len(depts) != 0 {
		t.Fatalf("DeleteDepartment: expected 0, got %d", len(depts))
	}
}

func TestSQLiteStorage_Team(t *testing.T) {
	s := newTestSQLite(t)

	_ = s.CreateDepartment(&Department{ID: "d-1", Name: "Eng"})
	_ = s.CreateDepartment(&Department{ID: "d-2", Name: "Design"})

	_ = s.CreateTeam(&Team{ID: "t-1", Name: "Backend", DepartmentID: "d-1"})
	_ = s.CreateTeam(&Team{ID: "t-2", Name: "Frontend", DepartmentID: "d-2"})

	all, err := s.GetTeams("")
	if err != nil || len(all) != 2 {
		t.Fatalf("GetTeams all: expected 2, got %d (%v)", len(all), err)
	}

	filtered, _ := s.GetTeams("d-1")
	if len(filtered) != 1 || filtered[0].Name != "Backend" {
		t.Fatalf("GetTeams filtered: expected 1 Backend, got %v", filtered)
	}

	if err := s.UpdateTeam(&Team{ID: "t-1", Name: "Backend Updated", DepartmentID: "d-1"}); err != nil {
		t.Fatalf("UpdateTeam: %v", err)
	}
	filtered, _ = s.GetTeams("d-1")
	if filtered[0].Name != "Backend Updated" {
		t.Fatalf("UpdateTeam: expected updated name")
	}

	if err := s.DeleteTeam("t-1"); err != nil {
		t.Fatalf("DeleteTeam: %v", err)
	}
	all, _ = s.GetTeams("")
	if len(all) != 1 {
		t.Fatalf("DeleteTeam: expected 1 remaining, got %d", len(all))
	}
}

func TestSQLiteStorage_Holiday(t *testing.T) {
	s := newTestSQLite(t)

	_ = s.CreateHoliday(&Holiday{ID: "h-1", Date: "2024-01-01", Name: "New Year", Country: "FR", Year: 2024})
	_ = s.CreateHoliday(&Holiday{ID: "h-2", Date: "2024-07-14", Name: "Bastille Day", Country: "FR", Year: 2024})
	_ = s.CreateHoliday(&Holiday{ID: "h-3", Date: "2024-12-25", Name: "Christmas", Country: "DE", Year: 2024})

	all, _ := s.GetHolidays("", 0)
	if len(all) != 3 {
		t.Fatalf("GetHolidays all: expected 3, got %d", len(all))
	}

	fr, _ := s.GetHolidays("FR", 0)
	if len(fr) != 2 {
		t.Fatalf("GetHolidays FR: expected 2, got %d", len(fr))
	}

	fr2024, _ := s.GetHolidays("FR", 2024)
	if len(fr2024) != 2 {
		t.Fatalf("GetHolidays FR 2024: expected 2, got %d", len(fr2024))
	}

	_ = s.UpdateHoliday(&Holiday{ID: "h-1", Date: "2024-01-01", Name: "New Year Updated", Country: "FR", Year: 2024})
	_ = s.DeleteHoliday("h-1")

	remaining, _ := s.GetHolidays("FR", 0)
	if len(remaining) != 1 || remaining[0].Name != "Bastille Day" {
		t.Fatalf("after delete: expected 1 FR holiday remaining")
	}
}
