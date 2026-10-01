package storage

import (
	"fmt"
	"os"
	"testing"
	"time"
)

// Le stockage hybride ne se teste qu'avec un vrai MongoDB : c'est précisément la
// rencontre des deux magasins qui pose problème, et MongoStorage n'a pas de
// double en mémoire. Le test est donc ignoré par défaut.
//
//	docker run -d -p 27018:27017 mongo:7
//	OFFLY_TEST_MONGO_URI=mongodb://localhost:27018 go test ./internal/storage/ -run Hybrid
func newTestHybrid(t *testing.T) *HybridStorage {
	t.Helper()

	uri := os.Getenv("OFFLY_TEST_MONGO_URI")
	if uri == "" {
		t.Skip("OFFLY_TEST_MONGO_URI non défini — test hybride ignoré")
	}

	// Une base par exécution : les documents d'un test ne doivent pas peser sur
	// le suivant, et MongoStorage n'offre aucun nettoyage.
	h := NewHybridStorage(uri, fmt.Sprintf("offly_test_%d", time.Now().UnixNano()))
	if h.mongo == nil {
		t.Fatalf("MongoDB injoignable sur %s", uri)
	}
	return h
}

// Régression : MongoDB réassigne l'identifiant à l'insertion (ObjectID), alors
// que les lectures viennent de lui dès qu'il est disponible. Quand la mémoire
// était écrite en premier, elle restait indexée sur l'UUID d'origine : toute
// modification portant l'identifiant renvoyé par la lecture échouait en
// « event not found ». C'est le bug du renommage d'un événement.
func TestHybridStorage_UpdateAfterCreateFindsTheRecord(t *testing.T) {
	h := newTestHybrid(t)

	event := &Event{ID: "uuid-local", Name: "Midi jeux", StartDate: "2026-10-02", EndDate: "2026-10-02"}
	if err := h.CreateEvent(event); err != nil {
		t.Fatalf("CreateEvent: %v", err)
	}

	// L'identifiant que voit l'appelant est celui des lectures.
	listed, err := h.GetEvents("", "")
	if err != nil || len(listed) != 1 {
		t.Fatalf("GetEvents: %d événements (%v)", len(listed), err)
	}
	if listed[0].ID != event.ID {
		t.Fatalf("identifiants divergents : lecture %q, création %q", listed[0].ID, event.ID)
	}

	renamed := &Event{ID: listed[0].ID, Name: "Midi jeux de société", StartDate: "2026-10-02", EndDate: "2026-10-02"}
	if err := h.UpdateEvent(renamed); err != nil {
		t.Fatalf("UpdateEvent avec l'identifiant renvoyé par la lecture: %v", err)
	}

	after, _ := h.GetEvents("", "")
	if len(after) != 1 || after[0].Name != "Midi jeux de société" {
		t.Fatalf("renommage non appliqué : %+v", after)
	}
}

// Même divergence, côté équipes : elle y était muette, parce que
// MemoryStorage.UpdateTeam insère au lieu d'échouer. La copie mémoire gagnait
// une seconde entrée, et servait l'ancien nom dès que MongoDB tombait.
func TestHybridStorage_MemoryStaysUsableAsFallback(t *testing.T) {
	h := newTestHybrid(t)

	team := &Team{ID: "uuid-local", Name: "Backend"}
	if err := h.CreateTeam(team); err != nil {
		t.Fatalf("CreateTeam: %v", err)
	}
	if err := h.UpdateTeam(&Team{ID: team.ID, Name: "Plateforme"}); err != nil {
		t.Fatalf("UpdateTeam: %v", err)
	}

	// On coupe MongoDB : les lectures retombent sur la mémoire, qui doit porter
	// exactement une équipe, au nom à jour.
	h.mu.Lock()
	h.mongo = nil
	h.mu.Unlock()

	teams, err := h.GetTeams("")
	if err != nil {
		t.Fatalf("GetTeams: %v", err)
	}
	if len(teams) != 1 {
		t.Fatalf("attendu 1 équipe en mémoire, obtenu %d : %+v", len(teams), teams)
	}
	if teams[0].Name != "Plateforme" {
		t.Fatalf("la mémoire sert un nom périmé : %q", teams[0].Name)
	}
}
