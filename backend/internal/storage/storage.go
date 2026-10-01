package storage

import "time"

type Absence struct {
	ID        string
	UserID    string
	StartDate time.Time
	EndDate   time.Time
	Reason    string
	Status    string
	TeamName  string
}

type User struct {
	ID           string
	Name         string
	Email        string
	DepartmentID string
	TeamID       string
	Country      string
	JobProfile   string
}

type Department struct {
	ID   string
	Name string
}

type Team struct {
	ID           string
	Name         string
	DepartmentID string
}

// Event — un événement d'équipe (conférence, repas, midi jeux). Les dates sont
// des jours pleins au format AAAA-MM-JJ, comme Holiday : l'application ne
// manipule pas d'heures. Un événement d'un jour porte la même date aux deux bornes.
type Event struct {
	ID        string
	Name      string
	StartDate string
	EndDate   string
	Category  string
	Location  string
	URL       string
}

type Holiday struct {
	ID      string
	Date    string
	Name    string
	Country string
	Year    int
}

type Storage interface {
	CreateAbsence(absence *Absence) error
	GetAbsences(userID string, startDate, endDate time.Time) ([]*Absence, error)
	GetAbsenceByID(id string) (*Absence, error)
	UpdateAbsence(absence *Absence) error
	DeleteAbsence(id string) error

	CreateUser(user *User) error
	GetUsers() ([]*User, error)
	UpdateUser(user *User) error
	DeleteUser(id string) error

	CreateDepartment(dept *Department) error
	GetDepartments() ([]*Department, error)
	UpdateDepartment(dept *Department) error
	DeleteDepartment(id string) error

	CreateTeam(team *Team) error
	GetTeams(departmentID string) ([]*Team, error)
	UpdateTeam(team *Team) error
	DeleteTeam(id string) error

	// GetEvents retient tout événement chevauchant [from, to] ; bornes vides =
	// tous les événements.
	CreateEvent(event *Event) error
	GetEvents(from, to string) ([]*Event, error)
	UpdateEvent(event *Event) error
	DeleteEvent(id string) error

	CreateHoliday(holiday *Holiday) error
	GetHolidays(country string, year int) ([]*Holiday, error)
	UpdateHoliday(holiday *Holiday) error
	DeleteHoliday(id string) error
}
