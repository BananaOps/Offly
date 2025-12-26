package storage

import (
	"log"
	"sync"
	"time"
)

// HybridStorage utilise la mémoire comme cache et synchronise avec MongoDB
type HybridStorage struct {
	memory      *MemoryStorage
	mongo       *MongoStorage
	mongoURI    string
	dbName      string
	mu          sync.RWMutex
	reconnectCh chan struct{}
}

func NewHybridStorage(mongoURI, dbName string) *HybridStorage {
	h := &HybridStorage{
		memory:      NewMemoryStorage().(*MemoryStorage),
		mongoURI:    mongoURI,
		dbName:      dbName,
		reconnectCh: make(chan struct{}, 1),
	}

	// Essayer de se connecter à MongoDB
	mongoStore, err := NewMongoStorage(mongoURI, dbName)
	if err != nil {
		log.Printf("Starting with in-memory storage, will retry MongoDB connection")
	} else {
		h.mongo = mongoStore
		log.Println("Connected to MongoDB")
	}

	// Démarrer la goroutine de reconnexion
	go h.reconnectLoop()

	return h
}

func (h *HybridStorage) reconnectLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		h.mu.RLock()
		hasMongo := h.mongo != nil
		h.mu.RUnlock()

		if !hasMongo {
			log.Println("Attempting to reconnect to MongoDB...")
			mongoStore, err := NewMongoStorage(h.mongoURI, h.dbName)
			if err != nil {
				log.Printf("MongoDB reconnection failed: %v", err)
				continue
			}

			h.mu.Lock()
			h.mongo = mongoStore
			h.mu.Unlock()

			log.Println("Successfully reconnected to MongoDB, syncing data...")
			h.syncToMongo()
		}
	}
}

func (h *HybridStorage) syncToMongo() {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if h.mongo == nil {
		return
	}

	// Synchroniser les utilisateurs
	users, _ := h.memory.GetUsers()
	for _, user := range users {
		if err := h.mongo.CreateUser(user); err != nil {
			log.Printf("Failed to sync user %s: %v", user.ID, err)
		}
	}

	// Synchroniser les départements
	depts, _ := h.memory.GetDepartments()
	for _, dept := range depts {
		if err := h.mongo.CreateDepartment(dept); err != nil {
			log.Printf("Failed to sync department %s: %v", dept.ID, err)
		}
	}

	// Synchroniser les équipes
	teams, _ := h.memory.GetTeams("")
	for _, team := range teams {
		if err := h.mongo.CreateTeam(team); err != nil {
			log.Printf("Failed to sync team %s: %v", team.ID, err)
		}
	}

	// Synchroniser les absences
	absences, _ := h.memory.GetAbsences("", time.Time{}, time.Time{})
	for _, absence := range absences {
		if err := h.mongo.CreateAbsence(absence); err != nil {
			log.Printf("Failed to sync absence %s: %v", absence.ID, err)
		}
	}

	// Synchroniser les jours fériés
	holidays, _ := h.memory.GetHolidays("", 0)
	for _, holiday := range holidays {
		if err := h.mongo.CreateHoliday(holiday); err != nil {
			log.Printf("Failed to sync holiday %s: %v", holiday.ID, err)
		}
	}

	log.Println("Data sync to MongoDB completed")
}

func (h *HybridStorage) getStorage() Storage {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if h.mongo != nil {
		return h.mongo
	}
	return h.memory
}

// Implémentation de l'interface Storage

func (h *HybridStorage) CreateAbsence(absence *Absence) error {
	// Toujours écrire en mémoire
	if err := h.memory.CreateAbsence(absence); err != nil {
		return err
	}

	// Essayer d'écrire dans MongoDB si disponible
	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.CreateAbsence(absence); err != nil {
			log.Printf("Failed to write to MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) GetAbsences(userID string, startDate, endDate time.Time) ([]*Absence, error) {
	return h.getStorage().GetAbsences(userID, startDate, endDate)
}

func (h *HybridStorage) GetAbsenceByID(id string) (*Absence, error) {
	return h.getStorage().GetAbsenceByID(id)
}

func (h *HybridStorage) UpdateAbsence(absence *Absence) error {
	if err := h.memory.UpdateAbsence(absence); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.UpdateAbsence(absence); err != nil {
			log.Printf("Failed to update in MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) DeleteAbsence(id string) error {
	if err := h.memory.DeleteAbsence(id); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.DeleteAbsence(id); err != nil {
			log.Printf("Failed to delete from MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) CreateUser(user *User) error {
	if err := h.memory.CreateUser(user); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.CreateUser(user); err != nil {
			log.Printf("Failed to write to MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) GetUsers() ([]*User, error) {
	return h.getStorage().GetUsers()
}

func (h *HybridStorage) UpdateUser(user *User) error {
	if err := h.memory.UpdateUser(user); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.UpdateUser(user); err != nil {
			log.Printf("Failed to update in MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) DeleteUser(id string) error {
	if err := h.memory.DeleteUser(id); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.DeleteUser(id); err != nil {
			log.Printf("Failed to delete from MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) CreateDepartment(dept *Department) error {
	if err := h.memory.CreateDepartment(dept); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.CreateDepartment(dept); err != nil {
			log.Printf("Failed to write to MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) GetDepartments() ([]*Department, error) {
	return h.getStorage().GetDepartments()
}

func (h *HybridStorage) UpdateDepartment(dept *Department) error {
	if err := h.memory.UpdateDepartment(dept); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.UpdateDepartment(dept); err != nil {
			log.Printf("Failed to update in MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) DeleteDepartment(id string) error {
	if err := h.memory.DeleteDepartment(id); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.DeleteDepartment(id); err != nil {
			log.Printf("Failed to delete from MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) CreateTeam(team *Team) error {
	if err := h.memory.CreateTeam(team); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.CreateTeam(team); err != nil {
			log.Printf("Failed to write to MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) GetTeams(departmentID string) ([]*Team, error) {
	return h.getStorage().GetTeams(departmentID)
}

func (h *HybridStorage) UpdateTeam(team *Team) error {
	if err := h.memory.UpdateTeam(team); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.UpdateTeam(team); err != nil {
			log.Printf("Failed to update in MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) DeleteTeam(id string) error {
	if err := h.memory.DeleteTeam(id); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.DeleteTeam(id); err != nil {
			log.Printf("Failed to delete from MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) CreateHoliday(holiday *Holiday) error {
	if err := h.memory.CreateHoliday(holiday); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.CreateHoliday(holiday); err != nil {
			log.Printf("Failed to write to MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) GetHolidays(country string, year int) ([]*Holiday, error) {
	return h.getStorage().GetHolidays(country, year)
}

func (h *HybridStorage) UpdateHoliday(holiday *Holiday) error {
	if err := h.memory.UpdateHoliday(holiday); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.UpdateHoliday(holiday); err != nil {
			log.Printf("Failed to update in MongoDB: %v", err)
		}
	}

	return nil
}

func (h *HybridStorage) DeleteHoliday(id string) error {
	if err := h.memory.DeleteHoliday(id); err != nil {
		return err
	}

	h.mu.RLock()
	mongo := h.mongo
	h.mu.RUnlock()

	if mongo != nil {
		if err := mongo.DeleteHoliday(id); err != nil {
			log.Printf("Failed to delete from MongoDB: %v", err)
		}
	}

	return nil
}
