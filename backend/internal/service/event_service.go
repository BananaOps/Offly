package service

import (
	"context"
	"regexp"
	"strings"

	"absence-management/internal/storage"
	pb "absence-management/proto/absence/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Les événements sont datés au jour, comme les fériés : l'application ne
// manipule pas d'heures (design.md §4).
var isoDate = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

type EventServiceServer struct {
	pb.UnimplementedEventServiceServer
	storage storage.Storage
}

func NewEventServiceServer(store storage.Storage) *EventServiceServer {
	return &EventServiceServer{storage: store}
}

func toPbEvent(e *storage.Event) *pb.Event {
	return &pb.Event{
		Id:        e.ID,
		Name:      e.Name,
		StartDate: e.StartDate,
		EndDate:   e.EndDate,
		Category:  e.Category,
		Location:  e.Location,
		Url:       e.URL,
	}
}

// normalize valide et complète les champs d'un événement. La date de fin est
// facultative : un événement d'un seul jour porte la même date aux deux bornes,
// ce qui évite à chaque lecteur (grille, écran, tri) de gérer le cas vide.
func normalize(name, start, end, category, location, url string) (*storage.Event, error) {
	event := &storage.Event{
		Name:      strings.TrimSpace(name),
		StartDate: strings.TrimSpace(start),
		EndDate:   strings.TrimSpace(end),
		Category:  strings.TrimSpace(category),
		Location:  strings.TrimSpace(location),
		URL:       strings.TrimSpace(url),
	}

	if event.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "le nom de l'événement est obligatoire")
	}
	if !isoDate.MatchString(event.StartDate) {
		return nil, status.Error(codes.InvalidArgument, "date de début attendue au format AAAA-MM-JJ")
	}
	if event.EndDate == "" {
		event.EndDate = event.StartDate
	}
	if !isoDate.MatchString(event.EndDate) {
		return nil, status.Error(codes.InvalidArgument, "date de fin attendue au format AAAA-MM-JJ")
	}
	// Les dates ISO se comparent lexicalement.
	if event.EndDate < event.StartDate {
		return nil, status.Error(codes.InvalidArgument, "la date de fin précède la date de début")
	}
	return event, nil
}

func (s *EventServiceServer) CreateEvent(ctx context.Context, req *pb.CreateEventRequest) (*pb.CreateEventResponse, error) {
	event, err := normalize(req.Name, req.StartDate, req.EndDate, req.Category, req.Location, req.Url)
	if err != nil {
		return nil, err
	}
	event.ID = uuid.New().String()

	if err := s.storage.CreateEvent(event); err != nil {
		return nil, err
	}
	return &pb.CreateEventResponse{Event: toPbEvent(event)}, nil
}

func (s *EventServiceServer) GetEvents(ctx context.Context, req *pb.GetEventsRequest) (*pb.GetEventsResponse, error) {
	events, err := s.storage.GetEvents(strings.TrimSpace(req.From), strings.TrimSpace(req.To))
	if err != nil {
		return nil, err
	}

	pbEvents := make([]*pb.Event, 0, len(events))
	for _, e := range events {
		pbEvents = append(pbEvents, toPbEvent(e))
	}
	return &pb.GetEventsResponse{Events: pbEvents}, nil
}

func (s *EventServiceServer) UpdateEvent(ctx context.Context, req *pb.UpdateEventRequest) (*pb.UpdateEventResponse, error) {
	event, err := normalize(req.Name, req.StartDate, req.EndDate, req.Category, req.Location, req.Url)
	if err != nil {
		return nil, err
	}
	event.ID = req.Id

	if err := s.storage.UpdateEvent(event); err != nil {
		return nil, status.Error(codes.NotFound, "événement introuvable")
	}
	return &pb.UpdateEventResponse{Event: toPbEvent(event)}, nil
}

func (s *EventServiceServer) DeleteEvent(ctx context.Context, req *pb.DeleteEventRequest) (*pb.DeleteEventResponse, error) {
	if err := s.storage.DeleteEvent(req.Id); err != nil {
		return &pb.DeleteEventResponse{Success: false}, err
	}
	return &pb.DeleteEventResponse{Success: true}, nil
}
