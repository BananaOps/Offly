package storage

import "time"

type Absence struct {
	ID        string
	UserID    string
	StartDate time.Time
	EndDate   time.Time
	Reason    string
	Status    string
}

type User struct {
	ID           string
	Name         string
	Email        string
	DepartmentID string
	TeamID       string
	Country      string
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

	CreateHoliday(holiday *Holiday) error
	GetHolidays(country string, year int) ([]*Holiday, error)
	UpdateHoliday(holiday *Holiday) error
	DeleteHoliday(id string) error
}
