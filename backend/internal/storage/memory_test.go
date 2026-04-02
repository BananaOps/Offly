package storage

import (
	"testing"
	"time"
)

func TestMemoryStorage_Absence(t *testing.T) {
	s := NewMemoryStorage()

	now := time.Now()
	absence := &Absence{
		ID:        "abs-1",
		UserID:    "user-1",
		StartDate: now,
		EndDate:   now.Add(24 * time.Hour),
		Reason:    "vacation",
		Status:    "pending",
	}

	if err := s.CreateAbsence(absence); err != nil {
		t.Fatalf("CreateAbsence: %v", err)
	}

	got, err := s.GetAbsenceByID("abs-1")
	if err != nil || got.Reason != "vacation" {
		t.Fatalf("GetAbsenceByID: %v, got %v", err, got)
	}

	absences, err := s.GetAbsences("user-1", now.Add(-time.Hour), now.Add(48*time.Hour))
	if err != nil || len(absences) != 1 {
		t.Fatalf("GetAbsences: expected 1, got %d (err %v)", len(absences), err)
	}

	// Outside range — should not match
	absences, _ = s.GetAbsences("user-1", now.Add(48*time.Hour), now.Add(96*time.Hour))
	if len(absences) != 0 {
		t.Fatalf("GetAbsences out of range: expected 0, got %d", len(absences))
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

func TestMemoryStorage_User(t *testing.T) {
	s := NewMemoryStorage()

	user := &User{ID: "u-1", Name: "Alice", Email: "alice@example.com"}
	if err := s.CreateUser(user); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	users, err := s.GetUsers()
	if err != nil || len(users) != 1 || users[0].Name != "Alice" {
		t.Fatalf("GetUsers: %v %v", err, users)
	}

	user.Name = "Alice Updated"
	if err := s.UpdateUser(user); err != nil {
		t.Fatalf("UpdateUser: %v", err)
	}
	users, _ = s.GetUsers()
	if users[0].Name != "Alice Updated" {
		t.Fatalf("UpdateUser: expected updated name, got %s", users[0].Name)
	}

	if err := s.DeleteUser("u-1"); err != nil {
		t.Fatalf("DeleteUser: %v", err)
	}
	users, _ = s.GetUsers()
	if len(users) != 0 {
		t.Fatalf("DeleteUser: expected 0 users, got %d", len(users))
	}
}

func TestMemoryStorage_Department(t *testing.T) {
	s := NewMemoryStorage()

	dept := &Department{ID: "d-1", Name: "Engineering"}
	if err := s.CreateDepartment(dept); err != nil {
		t.Fatalf("CreateDepartment: %v", err)
	}

	depts, err := s.GetDepartments()
	if err != nil || len(depts) != 1 {
		t.Fatalf("GetDepartments: %v", err)
	}

	dept.Name = "R&D"
	_ = s.UpdateDepartment(dept)
	depts, _ = s.GetDepartments()
	if depts[0].Name != "R&D" {
		t.Fatalf("UpdateDepartment: expected R&D, got %s", depts[0].Name)
	}

	_ = s.DeleteDepartment("d-1")
	depts, _ = s.GetDepartments()
	if len(depts) != 0 {
		t.Fatalf("DeleteDepartment: expected 0, got %d", len(depts))
	}
}

func TestMemoryStorage_Team(t *testing.T) {
	s := NewMemoryStorage()

	team := &Team{ID: "t-1", Name: "Backend", DepartmentID: "d-1"}
	_ = s.CreateTeam(team)
	_ = s.CreateTeam(&Team{ID: "t-2", Name: "Frontend", DepartmentID: "d-2"})

	all, _ := s.GetTeams("")
	if len(all) != 2 {
		t.Fatalf("GetTeams all: expected 2, got %d", len(all))
	}

	filtered, _ := s.GetTeams("d-1")
	if len(filtered) != 1 || filtered[0].Name != "Backend" {
		t.Fatalf("GetTeams filtered: expected 1 Backend team")
	}

	team.Name = "Backend Updated"
	_ = s.UpdateTeam(team)
	filtered, _ = s.GetTeams("d-1")
	if filtered[0].Name != "Backend Updated" {
		t.Fatalf("UpdateTeam: expected updated name")
	}

	_ = s.DeleteTeam("t-1")
	all, _ = s.GetTeams("")
	if len(all) != 1 {
		t.Fatalf("DeleteTeam: expected 1 remaining, got %d", len(all))
	}
}

func TestMemoryStorage_Holiday(t *testing.T) {
	s := NewMemoryStorage()

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

	h := &Holiday{ID: "h-1", Date: "2024-01-01", Name: "New Year Updated", Country: "FR", Year: 2024}
	_ = s.UpdateHoliday(h)

	_ = s.DeleteHoliday("h-1")
	remaining, _ := s.GetHolidays("FR", 0)
	if len(remaining) != 1 {
		t.Fatalf("DeleteHoliday: expected 1 FR remaining, got %d", len(remaining))
	}
}
