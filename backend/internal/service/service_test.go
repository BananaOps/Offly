package service

import (
	"context"
	"testing"
	"time"

	"absence-management/internal/storage"
	pb "absence-management/proto/absence/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func newMemStore() storage.Storage {
	return storage.NewMemoryStorage()
}

// --- AbsenceService ---

func TestAbsenceService_CreateAndGet(t *testing.T) {
	svc := NewAbsenceServiceServer(newMemStore())
	ctx := context.Background()

	start := time.Now().UTC()
	end := start.Add(48 * time.Hour)

	resp, err := svc.CreateAbsence(ctx, &pb.CreateAbsenceRequest{
		UserId:    "u-1",
		StartDate: timestamppb.New(start),
		EndDate:   timestamppb.New(end),
		Reason:    "vacation",
	})
	if err != nil {
		t.Fatalf("CreateAbsence: %v", err)
	}
	if resp.Absence.Status != "pending" {
		t.Fatalf("expected status=pending, got %s", resp.Absence.Status)
	}
	if resp.Absence.Id == "" {
		t.Fatal("expected non-empty ID")
	}

	list, err := svc.GetAbsences(ctx, &pb.GetAbsencesRequest{
		UserId:    "u-1",
		StartDate: timestamppb.New(start.Add(-time.Hour)),
		EndDate:   timestamppb.New(end.Add(time.Hour)),
	})
	if err != nil || len(list.Absences) != 1 {
		t.Fatalf("GetAbsences: expected 1, got %d (%v)", len(list.Absences), err)
	}
}

func TestAbsenceService_UpdateAndDelete(t *testing.T) {
	svc := NewAbsenceServiceServer(newMemStore())
	ctx := context.Background()

	start := time.Now().UTC()
	end := start.Add(24 * time.Hour)

	created, _ := svc.CreateAbsence(ctx, &pb.CreateAbsenceRequest{
		UserId:    "u-1",
		StartDate: timestamppb.New(start),
		EndDate:   timestamppb.New(end),
		Reason:    "sick",
	})

	updated, err := svc.UpdateAbsence(ctx, &pb.UpdateAbsenceRequest{
		Id:        created.Absence.Id,
		StartDate: timestamppb.New(start),
		EndDate:   timestamppb.New(end),
		Reason:    "sick",
		Status:    "approved",
	})
	if err != nil || updated.Absence.Status != "approved" {
		t.Fatalf("UpdateAbsence: %v, got %v", err, updated)
	}

	del, err := svc.DeleteAbsence(ctx, &pb.DeleteAbsenceRequest{Id: created.Absence.Id})
	if err != nil || !del.Success {
		t.Fatalf("DeleteAbsence: %v %v", err, del)
	}
}

// --- UserService ---

func TestUserService_CreateAndGet(t *testing.T) {
	svc := NewUserServiceServer(newMemStore())
	ctx := context.Background()

	resp, err := svc.CreateUser(ctx, &pb.CreateUserRequest{
		Name:    "Alice",
		Email:   "alice@example.com",
		Country: "fr",
	})
	if err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if resp.User.Country != "FR" {
		t.Fatalf("expected country=FR, got %s", resp.User.Country)
	}

	// Creating again with same email should return existing user
	resp2, err := svc.CreateUser(ctx, &pb.CreateUserRequest{
		Name:  "Alice Duplicate",
		Email: "alice@example.com",
	})
	if err != nil {
		t.Fatalf("CreateUser duplicate: %v", err)
	}
	if resp2.User.Id != resp.User.Id {
		t.Fatal("expected same ID for duplicate email")
	}

	list, err := svc.GetUsers(ctx, &pb.GetUsersRequest{})
	if err != nil || len(list.Users) != 1 {
		t.Fatalf("GetUsers: expected 1, got %d (%v)", len(list.Users), err)
	}
}

func TestUserService_UpdateAndDelete(t *testing.T) {
	svc := NewUserServiceServer(newMemStore())
	ctx := context.Background()

	created, _ := svc.CreateUser(ctx, &pb.CreateUserRequest{Name: "Bob", Email: "bob@example.com"})

	updated, err := svc.UpdateUser(ctx, &pb.UpdateUserRequest{
		Id:      created.User.Id,
		Name:    "Bob Updated",
		Email:   "bob@example.com",
		Country: "de",
		Title:   "Engineer",
	})
	if err != nil || updated.User.Name != "Bob Updated" || updated.User.Country != "DE" {
		t.Fatalf("UpdateUser: %v %+v", err, updated)
	}

	del, err := svc.DeleteUser(ctx, &pb.DeleteUserRequest{Id: created.User.Id})
	if err != nil || !del.Success {
		t.Fatalf("DeleteUser: %v %v", err, del)
	}
}

func TestUserService_AssignDepartmentAndTeam(t *testing.T) {
	store := newMemStore()
	svc := NewUserServiceServer(store)
	ctx := context.Background()

	_ = store.CreateUser(&storage.User{ID: "u-1", Name: "Carol", Email: "carol@example.com"})

	u, err := svc.AssignUserToDepartment(ctx, &pb.AssignUserToDepartmentRequest{UserId: "u-1", DepartmentId: "d-1"})
	if err != nil || u.User.DepartmentId != "d-1" {
		t.Fatalf("AssignUserToDepartment: %v %v", err, u)
	}

	u2, err := svc.AssignUserToTeam(ctx, &pb.AssignUserToTeamRequest{UserId: "u-1", TeamId: "t-1"})
	if err != nil || u2.User.TeamId != "t-1" {
		t.Fatalf("AssignUserToTeam: %v %v", err, u2)
	}
}

// --- OrganizationService ---

func TestOrganizationService_Department(t *testing.T) {
	svc := NewOrganizationServiceServer(newMemStore())
	ctx := context.Background()

	resp, err := svc.CreateDepartment(ctx, &pb.CreateDepartmentRequest{Name: "Engineering"})
	if err != nil || resp.Department.Name != "Engineering" || resp.Department.Id == "" {
		t.Fatalf("CreateDepartment: %v %v", err, resp)
	}

	list, err := svc.GetDepartments(ctx, &pb.GetDepartmentsRequest{})
	if err != nil || len(list.Departments) != 1 {
		t.Fatalf("GetDepartments: expected 1, got %d (%v)", len(list.Departments), err)
	}

	updated, err := svc.UpdateDepartment(ctx, &pb.UpdateDepartmentRequest{Id: resp.Department.Id, Name: "R&D"})
	if err != nil || updated.Department.Name != "R&D" {
		t.Fatalf("UpdateDepartment: %v %v", err, updated)
	}

	del, err := svc.DeleteDepartment(ctx, &pb.DeleteDepartmentRequest{Id: resp.Department.Id})
	if err != nil || !del.Success {
		t.Fatalf("DeleteDepartment: %v %v", err, del)
	}
}

func TestOrganizationService_Team(t *testing.T) {
	svc := NewOrganizationServiceServer(newMemStore())
	ctx := context.Background()

	resp, err := svc.CreateTeam(ctx, &pb.CreateTeamRequest{Name: "Backend", DepartmentId: "d-1"})
	if err != nil || resp.Team.Name != "Backend" || resp.Team.DepartmentId != "d-1" {
		t.Fatalf("CreateTeam: %v %v", err, resp)
	}

	list, err := svc.GetTeams(ctx, &pb.GetTeamsRequest{DepartmentId: "d-1"})
	if err != nil || len(list.Teams) != 1 {
		t.Fatalf("GetTeams: expected 1, got %d (%v)", len(list.Teams), err)
	}

	updated, err := svc.UpdateTeam(ctx, &pb.UpdateTeamRequest{Id: resp.Team.Id, Name: "Backend Updated", DepartmentId: "d-1"})
	if err != nil || updated.Team.Name != "Backend Updated" {
		t.Fatalf("UpdateTeam: %v %v", err, updated)
	}

	del, err := svc.DeleteTeam(ctx, &pb.DeleteTeamRequest{Id: resp.Team.Id})
	if err != nil || !del.Success {
		t.Fatalf("DeleteTeam: %v %v", err, del)
	}
}

// --- HolidayService ---

func TestHolidayService_CRUD(t *testing.T) {
	svc := NewHolidayServiceServer(newMemStore())
	ctx := context.Background()

	resp, err := svc.CreateHoliday(ctx, &pb.CreateHolidayRequest{
		Date:    "2024-07-14",
		Name:    "Bastille Day",
		Country: "fr",
		Year:    2024,
	})
	if err != nil || resp.Holiday.Country != "FR" || resp.Holiday.Id == "" {
		t.Fatalf("CreateHoliday: %v %v", err, resp)
	}

	list, err := svc.GetHolidays(ctx, &pb.GetHolidaysRequest{Country: "fr", Year: 2024})
	if err != nil || len(list.Holidays) != 1 {
		t.Fatalf("GetHolidays: expected 1, got %d (%v)", len(list.Holidays), err)
	}

	_, err = svc.UpdateHoliday(ctx, &pb.UpdateHolidayRequest{
		Id:      resp.Holiday.Id,
		Date:    "2024-07-14",
		Name:    "Bastille Day Updated",
		Country: "fr",
		Year:    2024,
	})
	if err != nil {
		t.Fatalf("UpdateHoliday: %v", err)
	}

	del, err := svc.DeleteHoliday(ctx, &pb.DeleteHolidayRequest{Id: resp.Holiday.Id})
	if err != nil || !del.Success {
		t.Fatalf("DeleteHoliday: %v %v", err, del)
	}
}

func TestHolidayService_ImportHolidays(t *testing.T) {
	svc := NewHolidayServiceServer(newMemStore())
	ctx := context.Background()

	resp, err := svc.ImportHolidays(ctx, &pb.ImportHolidaysRequest{
		Holidays: []*pb.CreateHolidayRequest{
			{Date: "2024-01-01", Name: "New Year", Country: "FR", Year: 2024},
			{Date: "2024-12-25", Name: "Christmas", Country: "FR", Year: 2024},
		},
	})
	if err != nil || resp.ImportedCount != 2 {
		t.Fatalf("ImportHolidays: expected 2 imported, got %d (%v)", resp.ImportedCount, err)
	}
}
