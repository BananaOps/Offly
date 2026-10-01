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

func TestOrganizationService_TeamDeduplicatesByName(t *testing.T) {
	svc := NewOrganizationServiceServer(newMemStore())
	ctx := context.Background()

	first, err := svc.CreateTeam(ctx, &pb.CreateTeamRequest{Name: "Backend"})
	if err != nil {
		t.Fatalf("CreateTeam: %v", err)
	}

	// Même nom à la casse et aux espaces près : on récupère l'équipe existante,
	// pas une seconde. C'est ce que l'interface attend pour signaler le doublon.
	again, err := svc.CreateTeam(ctx, &pb.CreateTeamRequest{Name: "  backend "})
	if err != nil || again.Team.Id != first.Team.Id {
		t.Fatalf("expected the existing team, got %v (%v)", again, err)
	}

	list, _ := svc.GetTeams(ctx, &pb.GetTeamsRequest{})
	if len(list.Teams) != 1 {
		t.Fatalf("expected 1 team, got %d", len(list.Teams))
	}
}

func TestOrganizationService_RenameKeepsDepartment(t *testing.T) {
	svc := NewOrganizationServiceServer(newMemStore())
	ctx := context.Background()

	created, _ := svc.CreateTeam(ctx, &pb.CreateTeamRequest{Name: "Backend", DepartmentId: "d-1"})

	// Le renommage depuis l'interface n'envoie pas de département.
	updated, err := svc.UpdateTeam(ctx, &pb.UpdateTeamRequest{Id: created.Team.Id, Name: "Plateforme"})
	if err != nil || updated.Team.DepartmentId != "d-1" {
		t.Fatalf("rename dropped the department: %v (%v)", updated, err)
	}
}

func TestOrganizationService_DeleteTeamDetachesMembers(t *testing.T) {
	store := newMemStore()
	svc := NewOrganizationServiceServer(store)
	users := NewUserServiceServer(store)
	ctx := context.Background()

	team, _ := svc.CreateTeam(ctx, &pb.CreateTeamRequest{Name: "Backend"})
	created, err := users.CreateUser(ctx, &pb.CreateUserRequest{
		Name: "Alice", Email: "alice@offly.io", TeamId: team.Team.Id,
	})
	if err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	if _, err := svc.DeleteTeam(ctx, &pb.DeleteTeamRequest{Id: team.Team.Id}); err != nil {
		t.Fatalf("DeleteTeam: %v", err)
	}

	// Sans détachement, la personne garderait un team_id fantôme et sortirait
	// de l'interface : ni dans une équipe, ni dans « Sans équipe ».
	after, _ := users.GetUsers(ctx, &pb.GetUsersRequest{})
	for _, u := range after.Users {
		if u.Id == created.User.Id && u.TeamId != "" {
			t.Fatalf("expected an empty team_id, got %q", u.TeamId)
		}
	}
}

// --- EventService ---

func TestEventService_CRUD(t *testing.T) {
	svc := NewEventServiceServer(newMemStore())
	ctx := context.Background()

	created, err := svc.CreateEvent(ctx, &pb.CreateEventRequest{
		Name:      "DevOps REX",
		StartDate: "2026-11-17",
		Category:  "conference",
		Location:  "Paris",
		Url:       "https://devopsrex.fr",
	})
	if err != nil {
		t.Fatalf("CreateEvent: %v", err)
	}
	// Date de fin omise : un événement d'un jour porte la même date aux deux bornes.
	if created.Event.EndDate != "2026-11-17" {
		t.Fatalf("expected end_date to default to start_date, got %q", created.Event.EndDate)
	}
	if created.Event.Id == "" {
		t.Fatal("expected a non-empty id")
	}

	list, err := svc.GetEvents(ctx, &pb.GetEventsRequest{})
	if err != nil || len(list.Events) != 1 {
		t.Fatalf("GetEvents: %d events (%v)", len(list.Events), err)
	}

	updated, err := svc.UpdateEvent(ctx, &pb.UpdateEventRequest{
		Id: created.Event.Id, Name: "DevOps REX 2026", StartDate: "2026-11-17", EndDate: "2026-11-18",
	})
	if err != nil || updated.Event.Name != "DevOps REX 2026" || updated.Event.EndDate != "2026-11-18" {
		t.Fatalf("UpdateEvent: %v (%v)", updated, err)
	}

	del, err := svc.DeleteEvent(ctx, &pb.DeleteEventRequest{Id: created.Event.Id})
	if err != nil || !del.Success {
		t.Fatalf("DeleteEvent: %v (%v)", del, err)
	}
}

func TestEventService_Validation(t *testing.T) {
	svc := NewEventServiceServer(newMemStore())
	ctx := context.Background()

	cases := []struct {
		label string
		req   *pb.CreateEventRequest
	}{
		{"nom vide", &pb.CreateEventRequest{Name: "  ", StartDate: "2026-01-05"}},
		{"date absente", &pb.CreateEventRequest{Name: "MixIT"}},
		{"date mal formée", &pb.CreateEventRequest{Name: "MixIT", StartDate: "05/01/2026"}},
		{"fin avant début", &pb.CreateEventRequest{Name: "MixIT", StartDate: "2026-01-05", EndDate: "2026-01-04"}},
	}
	for _, c := range cases {
		if _, err := svc.CreateEvent(ctx, c.req); err == nil {
			t.Fatalf("%s : création acceptée alors qu'elle devait être refusée", c.label)
		}
	}
}

func TestEventService_RangeFiltersOnOverlap(t *testing.T) {
	svc := NewEventServiceServer(newMemStore())
	ctx := context.Background()

	for _, e := range []*pb.CreateEventRequest{
		{Name: "Repas d'équipe", StartDate: "2026-01-15"},
		{Name: "MixIT", StartDate: "2026-04-02", EndDate: "2026-04-03"},
		{Name: "Midi jeux", StartDate: "2026-09-10"},
	} {
		if _, err := svc.CreateEvent(ctx, e); err != nil {
			t.Fatalf("CreateEvent %s: %v", e.Name, err)
		}
	}

	// Une plage qui ne touche MixIT que par son dernier jour doit le retenir :
	// le filtre porte sur le chevauchement, pas sur la seule date de début.
	list, err := svc.GetEvents(ctx, &pb.GetEventsRequest{From: "2026-04-03", To: "2026-06-30"})
	if err != nil || len(list.Events) != 1 || list.Events[0].Name != "MixIT" {
		t.Fatalf("expected MixIT alone, got %v (%v)", list.Events, err)
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

// UpdateAbsence ne doit pas détacher l'absence de son propriétaire : la requête
// ne transporte pas de userId, le service doit donc le relire avant d'écrire.
func TestUpdateAbsencePreservesOwner(t *testing.T) {
	store := storage.NewMemoryStorage()
	svc := NewAbsenceServiceServer(store)
	ctx := context.Background()

	created, err := svc.CreateAbsence(ctx, &pb.CreateAbsenceRequest{
		UserId:    "user-42",
		StartDate: timestamppb.New(time.Date(2026, 9, 14, 0, 0, 0, 0, time.UTC)),
		EndDate:   timestamppb.New(time.Date(2026, 9, 14, 23, 59, 59, 0, time.UTC)),
		Reason:    "Time Off",
	})
	if err != nil {
		t.Fatalf("CreateAbsence: %v", err)
	}
	id := created.Absence.Id

	// Passage journée -> matin, comme le fait le cycle de saisie de la grille.
	updated, err := svc.UpdateAbsence(ctx, &pb.UpdateAbsenceRequest{
		Id:        id,
		StartDate: timestamppb.New(time.Date(2026, 9, 14, 0, 0, 0, 0, time.UTC)),
		EndDate:   timestamppb.New(time.Date(2026, 9, 14, 11, 59, 59, 0, time.UTC)),
		Reason:    "Morning",
		Status:    "pending",
	})
	if err != nil {
		t.Fatalf("UpdateAbsence: %v", err)
	}
	if updated.Absence.UserId != "user-42" {
		t.Errorf("la réponse a perdu le userId: %q", updated.Absence.UserId)
	}

	stored, err := store.GetAbsenceByID(id)
	if err != nil {
		t.Fatalf("GetAbsenceByID: %v", err)
	}
	if stored.UserID != "user-42" {
		t.Errorf("l'absence stockée a perdu son propriétaire: %q", stored.UserID)
	}

	list, err := svc.GetAbsences(ctx, &pb.GetAbsencesRequest{
		UserId:    "user-42",
		StartDate: timestamppb.New(time.Date(2026, 9, 14, 0, 0, 0, 0, time.UTC)),
		EndDate:   timestamppb.New(time.Date(2026, 9, 14, 23, 59, 59, 0, time.UTC)),
	})
	if err != nil {
		t.Fatalf("GetAbsences: %v", err)
	}
	if len(list.Absences) != 1 {
		t.Fatalf("attendu 1 absence pour user-42 après update, obtenu %d", len(list.Absences))
	}
}

// Le client envoie job_profile ; historiquement seul title existait et le
// service écrasait alors le profil avec une chaîne vide.
func TestUpdateUserAcceptsJobProfile(t *testing.T) {
	store := storage.NewMemoryStorage()
	svc := NewUserServiceServer(store)
	ctx := context.Background()

	created, err := svc.CreateUser(ctx, &pb.CreateUserRequest{Name: "Amine", Email: "a@offly.io", Country: "fr"})
	if err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	id := created.User.Id

	got, err := svc.UpdateUser(ctx, &pb.UpdateUserRequest{
		Id: id, Name: "Amine", Email: "a@offly.io", Country: "FR", JobProfile: "dev",
	})
	if err != nil {
		t.Fatalf("UpdateUser: %v", err)
	}
	if got.User.JobProfile != "dev" {
		t.Errorf("job_profile perdu dans la réponse : %q", got.User.JobProfile)
	}

	users, _ := store.GetUsers()
	for _, u := range users {
		if u.ID == id && u.JobProfile != "dev" {
			t.Errorf("job_profile perdu en base : %q", u.JobProfile)
		}
	}

	// title reste accepté pour les clients qui ne connaissent que lui.
	legacy, err := svc.UpdateUser(ctx, &pb.UpdateUserRequest{
		Id: id, Name: "Amine", Email: "a@offly.io", Country: "FR", Title: "ops",
	})
	if err != nil {
		t.Fatalf("UpdateUser (title): %v", err)
	}
	if legacy.User.JobProfile != "ops" {
		t.Errorf("title ignoré : %q", legacy.User.JobProfile)
	}
}
