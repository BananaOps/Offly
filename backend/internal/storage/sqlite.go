package storage

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type SQLiteStorage struct {
	db *sql.DB
}

// NewSQLiteStorage creates a new SQLite storage with initialized schema
func NewSQLiteStorage(dbPath string) (*SQLiteStorage, error) {
	if dbPath != "" && dbPath != ":memory:" {
		dbDir := filepath.Dir(dbPath)
		if dbDir != "." && dbDir != "" {
			if err := os.MkdirAll(dbDir, 0o755); err != nil {
				return nil, fmt.Errorf("failed to create sqlite directory %s: %w", dbDir, err)
			}
		}
	}

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping sqlite database: %w", err)
	}

	storage := &SQLiteStorage{db: db}

	// Initialize schema
	if err := storage.initSchema(); err != nil {
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	log.Printf("SQLite storage initialized at %s", dbPath)
	return storage, nil
}

func (s *SQLiteStorage) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS departments (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS teams (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		department_id TEXT NOT NULL,
		FOREIGN KEY(department_id) REFERENCES departments(id)
	);

	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		department_id TEXT,
		team_id TEXT,
		country TEXT,
		job_profile TEXT,
		FOREIGN KEY(department_id) REFERENCES departments(id),
		FOREIGN KEY(team_id) REFERENCES teams(id)
	);

	CREATE TABLE IF NOT EXISTS absences (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		start_date DATETIME NOT NULL,
		end_date DATETIME NOT NULL,
		reason TEXT,
		status TEXT,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS holidays (
		id TEXT PRIMARY KEY,
		date TEXT NOT NULL,
		name TEXT NOT NULL,
		country TEXT NOT NULL,
		year INTEGER NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_absences_user_id ON absences(user_id);
	CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(start_date, end_date);
	CREATE INDEX IF NOT EXISTS idx_holidays_country_year ON holidays(country, year);
	CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
	`

	_, err := s.db.Exec(schema)
	if err != nil {
		return err
	}
	// Migration: add job_profile column if it doesn't exist (for existing databases)
	_, _ = s.db.Exec(`ALTER TABLE users ADD COLUMN job_profile TEXT`)
	return nil
}

// Absence operations
func (s *SQLiteStorage) CreateAbsence(absence *Absence) error {
	query := `INSERT INTO absences (id, user_id, start_date, end_date, reason, status) 
			  VALUES (?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, absence.ID, absence.UserID, absence.StartDate, absence.EndDate, absence.Reason, absence.Status)
	return err
}

func (s *SQLiteStorage) GetAbsences(userID string, startDate, endDate time.Time) ([]*Absence, error) {
	var query string
	var args []interface{}
	
	if userID == "" {
		// Get all absences that overlap with date range
		// Overlap: absence.start_date <= endDate AND absence.end_date >= startDate
		query = `SELECT id, user_id, start_date, end_date, reason, status 
				  FROM absences 
				  WHERE start_date <= ? AND end_date >= ?`
		args = []interface{}{endDate, startDate}
	} else {
		// Get absences for specific user that overlap with date range
		query = `SELECT id, user_id, start_date, end_date, reason, status 
				  FROM absences 
				  WHERE user_id = ? AND start_date <= ? AND end_date >= ?`
		args = []interface{}{userID, endDate, startDate}
	}
	
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var absences []*Absence
	for rows.Next() {
		a := &Absence{}
		if err := rows.Scan(&a.ID, &a.UserID, &a.StartDate, &a.EndDate, &a.Reason, &a.Status); err != nil {
			return nil, err
		}
		absences = append(absences, a)
	}
	return absences, rows.Err()
}

func (s *SQLiteStorage) UpdateAbsence(absence *Absence) error {
	query := `UPDATE absences 
			  SET user_id = ?, start_date = ?, end_date = ?, reason = ?, status = ? 
			  WHERE id = ?`
	_, err := s.db.Exec(query, absence.UserID, absence.StartDate, absence.EndDate, absence.Reason, absence.Status, absence.ID)
	return err
}

func (s *SQLiteStorage) GetAbsenceByID(id string) (*Absence, error) {
	query := `SELECT id, user_id, start_date, end_date, reason, status FROM absences WHERE id = ?`
	row := s.db.QueryRow(query, id)
	a := &Absence{}
	if err := row.Scan(&a.ID, &a.UserID, &a.StartDate, &a.EndDate, &a.Reason, &a.Status); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *SQLiteStorage) DeleteAbsence(id string) error {
	_, err := s.db.Exec("DELETE FROM absences WHERE id = ?", id)
	return err
}

// User operations
func (s *SQLiteStorage) CreateUser(user *User) error {
	query := `INSERT INTO users (id, name, email, department_id, team_id, country, job_profile) 
			  VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, user.ID, user.Name, user.Email, user.DepartmentID, user.TeamID, user.Country, user.JobProfile)
	return err
}

func (s *SQLiteStorage) GetUsers() ([]*User, error) {
	rows, err := s.db.Query("SELECT id, name, email, department_id, team_id, country, job_profile FROM users")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		u := &User{}
		var deptID, teamID, country, jobProfile sql.NullString
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &deptID, &teamID, &country, &jobProfile); err != nil {
			return nil, err
		}
		u.DepartmentID = deptID.String
		u.TeamID = teamID.String
		u.Country = country.String
		u.JobProfile = jobProfile.String
		users = append(users, u)
	}
	return users, rows.Err()
}

func (s *SQLiteStorage) UpdateUser(user *User) error {
	query := `UPDATE users 
			  SET name = ?, email = ?, department_id = ?, team_id = ?, country = ?, job_profile = ? 
			  WHERE id = ?`
	_, err := s.db.Exec(query, user.Name, user.Email, user.DepartmentID, user.TeamID, user.Country, user.JobProfile, user.ID)
	return err
}

func (s *SQLiteStorage) DeleteUser(id string) error {
	_, err := s.db.Exec("DELETE FROM users WHERE id = ?", id)
	return err
}

// Department operations
func (s *SQLiteStorage) CreateDepartment(dept *Department) error {
	query := `INSERT INTO departments (id, name) VALUES (?, ?)`
	_, err := s.db.Exec(query, dept.ID, dept.Name)
	return err
}

func (s *SQLiteStorage) GetDepartments() ([]*Department, error) {
	rows, err := s.db.Query("SELECT id, name FROM departments")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var departments []*Department
	for rows.Next() {
		d := &Department{}
		if err := rows.Scan(&d.ID, &d.Name); err != nil {
			return nil, err
		}
		departments = append(departments, d)
	}
	return departments, rows.Err()
}

func (s *SQLiteStorage) UpdateDepartment(dept *Department) error {
	query := `UPDATE departments SET name = ? WHERE id = ?`
	_, err := s.db.Exec(query, dept.Name, dept.ID)
	return err
}

func (s *SQLiteStorage) DeleteDepartment(id string) error {
	_, err := s.db.Exec("DELETE FROM departments WHERE id = ?", id)
	return err
}

// Team operations
func (s *SQLiteStorage) CreateTeam(team *Team) error {
	query := `INSERT INTO teams (id, name, department_id) VALUES (?, ?, ?)`
	_, err := s.db.Exec(query, team.ID, team.Name, team.DepartmentID)
	return err
}

func (s *SQLiteStorage) GetTeams(departmentID string) ([]*Team, error) {
	var rows *sql.Rows
	var err error
	
	if departmentID == "" {
		rows, err = s.db.Query("SELECT id, name, department_id FROM teams")
	} else {
		rows, err = s.db.Query("SELECT id, name, department_id FROM teams WHERE department_id = ?", departmentID)
	}
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var teams []*Team
	for rows.Next() {
		t := &Team{}
		if err := rows.Scan(&t.ID, &t.Name, &t.DepartmentID); err != nil {
			return nil, err
		}
		teams = append(teams, t)
	}
	return teams, rows.Err()
}

func (s *SQLiteStorage) UpdateTeam(team *Team) error {
	query := `UPDATE teams SET name = ?, department_id = ? WHERE id = ?`
	_, err := s.db.Exec(query, team.Name, team.DepartmentID, team.ID)
	return err
}

func (s *SQLiteStorage) DeleteTeam(id string) error {
	_, err := s.db.Exec("DELETE FROM teams WHERE id = ?", id)
	return err
}

// Holiday operations
func (s *SQLiteStorage) CreateHoliday(holiday *Holiday) error {
	query := `INSERT INTO holidays (id, date, name, country, year) VALUES (?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, holiday.ID, holiday.Date, holiday.Name, holiday.Country, holiday.Year)
	return err
}

func (s *SQLiteStorage) GetHolidays(country string, year int) ([]*Holiday, error) {
	var query string
	var args []interface{}

	switch {
	case country != "" && year > 0:
		query = `SELECT id, date, name, country, year FROM holidays WHERE UPPER(country) = UPPER(?) AND year = ?`
		args = []interface{}{country, year}
	case country != "" && year == 0:
		query = `SELECT id, date, name, country, year FROM holidays WHERE UPPER(country) = UPPER(?)`
		args = []interface{}{country}
	case country == "" && year > 0:
		query = `SELECT id, date, name, country, year FROM holidays WHERE year = ?`
		args = []interface{}{year}
	default:
		query = `SELECT id, date, name, country, year FROM holidays`
		args = []interface{}{}
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var holidays []*Holiday
	for rows.Next() {
		h := &Holiday{}
		if err := rows.Scan(&h.ID, &h.Date, &h.Name, &h.Country, &h.Year); err != nil {
			return nil, err
		}
		holidays = append(holidays, h)
	}
	return holidays, rows.Err()
}

func (s *SQLiteStorage) UpdateHoliday(holiday *Holiday) error {
	query := `UPDATE holidays SET date = ?, name = ?, country = ?, year = ? WHERE id = ?`
	_, err := s.db.Exec(query, holiday.Date, holiday.Name, holiday.Country, holiday.Year, holiday.ID)
	return err
}

func (s *SQLiteStorage) DeleteHoliday(id string) error {
	_, err := s.db.Exec("DELETE FROM holidays WHERE id = ?", id)
	return err
}
