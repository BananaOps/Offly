package storage

import (
	"sync"
	"time"
)

type MemoryStorage struct {
	absences    map[string]*Absence
	users       map[string]*User
	departments map[string]*Department
	teams       map[string]*Team
	holidays    map[string]*Holiday
	mu          sync.RWMutex
}

func NewMemoryStorage() Storage {
	return &MemoryStorage{
		absences:    make(map[string]*Absence),
		users:       make(map[string]*User),
		departments: make(map[string]*Department),
		teams:       make(map[string]*Team),
		holidays:    make(map[string]*Holiday),
	}
}

func (s *MemoryStorage) CreateAbsence(absence *Absence) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.absences[absence.ID] = absence
	return nil
}

func (s *MemoryStorage) GetAbsences(userID string, startDate, endDate time.Time) ([]*Absence, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Absence
	for _, a := range s.absences {
		if userID != "" && a.UserID != userID {
			continue
		}

		// Si des dates sont fournies, trouver les absences qui se chevauchent avec la période
		// Une absence chevauche si: absence.start_date <= endDate ET absence.end_date >= startDate
		if !startDate.IsZero() && !endDate.IsZero() {
			// Vérifier le chevauchement
			if a.StartDate.After(endDate) || a.EndDate.Before(startDate) {
				continue
			}
		} else if !startDate.IsZero() {
			// Si seulement startDate est fourni, prendre les absences qui finissent après
			if a.EndDate.Before(startDate) {
				continue
			}
		} else if !endDate.IsZero() {
			// Si seulement endDate est fourni, prendre les absences qui commencent avant
			if a.StartDate.After(endDate) {
				continue
			}
		}

		result = append(result, a)
	}
	return result, nil
}

func (s *MemoryStorage) UpdateAbsence(absence *Absence) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.absences[absence.ID] = absence
	return nil
}

func (s *MemoryStorage) DeleteAbsence(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.absences, id)
	return nil
}

func (s *MemoryStorage) CreateUser(user *User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[user.ID] = user
	return nil
}

func (s *MemoryStorage) GetUsers() ([]*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*User
	for _, u := range s.users {
		result = append(result, u)
	}
	return result, nil
}

func (s *MemoryStorage) UpdateUser(user *User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[user.ID] = user
	return nil
}

func (s *MemoryStorage) CreateDepartment(dept *Department) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.departments[dept.ID] = dept
	return nil
}

func (s *MemoryStorage) GetDepartments() ([]*Department, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Department
	for _, d := range s.departments {
		result = append(result, d)
	}
	return result, nil
}

func (s *MemoryStorage) CreateTeam(team *Team) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.teams[team.ID] = team
	return nil
}

func (s *MemoryStorage) GetTeams(departmentID string) ([]*Team, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Team
	for _, t := range s.teams {
		if departmentID != "" && t.DepartmentID != departmentID {
			continue
		}
		result = append(result, t)
	}
	return result, nil
}

func (s *MemoryStorage) DeleteUser(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.users, id)
	return nil
}

func (s *MemoryStorage) UpdateDepartment(dept *Department) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.departments[dept.ID] = dept
	return nil
}

func (s *MemoryStorage) DeleteDepartment(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.departments, id)
	return nil
}

func (s *MemoryStorage) UpdateTeam(team *Team) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.teams[team.ID] = team
	return nil
}

func (s *MemoryStorage) DeleteTeam(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.teams, id)
	return nil
}

func (s *MemoryStorage) CreateHoliday(holiday *Holiday) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.holidays[holiday.ID] = holiday
	return nil
}

func (s *MemoryStorage) GetHolidays(country string, year int) ([]*Holiday, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Holiday
	for _, h := range s.holidays {
		if country != "" && h.Country != country {
			continue
		}
		if year > 0 && h.Year != year {
			continue
		}
		result = append(result, h)
	}
	return result, nil
}

func (s *MemoryStorage) UpdateHoliday(holiday *Holiday) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.holidays[holiday.ID] = holiday
	return nil
}

func (s *MemoryStorage) DeleteHoliday(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.holidays, id)
	return nil
}
