package service

import (
	"absence-management/internal/storage"
	pb "absence-management/proto"
	"context"

	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type AbsenceServiceServer struct {
	pb.UnimplementedAbsenceServiceServer
	storage storage.Storage
}

func NewAbsenceServiceServer(store storage.Storage) *AbsenceServiceServer {
	return &AbsenceServiceServer{storage: store}
}

func (s *AbsenceServiceServer) CreateAbsence(ctx context.Context, req *pb.CreateAbsenceRequest) (*pb.Absence, error) {
	// Resolve team name snapshot: use provided name if given, else look up from user's current team
	teamName := req.TeamName
	if teamName == "" {
		users, err := s.storage.GetUsers()
		if err == nil {
			for _, u := range users {
				if u.ID == req.UserId && u.TeamID != "" {
					teams, err2 := s.storage.GetTeams("")
					if err2 == nil {
						for _, t := range teams {
							if t.ID == u.TeamID {
								teamName = t.Name
								break
							}
						}
					}
					break
				}
			}
		}
	}

	absence := &storage.Absence{
		ID:        uuid.New().String(),
		UserID:    req.UserId,
		StartDate: req.StartDate.AsTime(),
		EndDate:   req.EndDate.AsTime(),
		Reason:    req.Reason,
		Status:    "pending",
		TeamName:  teamName,
	}

	if err := s.storage.CreateAbsence(absence); err != nil {
		return nil, err
	}

	return &pb.Absence{
		Id:        absence.ID,
		UserId:    absence.UserID,
		StartDate: timestamppb.New(absence.StartDate),
		EndDate:   timestamppb.New(absence.EndDate),
		Reason:    absence.Reason,
		Status:    absence.Status,
		TeamName:  absence.TeamName,
	}, nil
}

func (s *AbsenceServiceServer) GetAbsences(ctx context.Context, req *pb.GetAbsencesRequest) (*pb.GetAbsencesResponse, error) {
	startDate := req.StartDate.AsTime()
	endDate := req.EndDate.AsTime()

	absences, err := s.storage.GetAbsences(req.UserId, startDate, endDate)
	if err != nil {
		return nil, err
	}

	var pbAbsences []*pb.Absence
	for _, a := range absences {
		pbAbsences = append(pbAbsences, &pb.Absence{
			Id:        a.ID,
			UserId:    a.UserID,
			StartDate: timestamppb.New(a.StartDate),
			EndDate:   timestamppb.New(a.EndDate),
			Reason:    a.Reason,
			Status:    a.Status,
			TeamName:  a.TeamName,
		})
	}

	return &pb.GetAbsencesResponse{Absences: pbAbsences}, nil
}

func (s *AbsenceServiceServer) UpdateAbsence(ctx context.Context, req *pb.UpdateAbsenceRequest) (*pb.Absence, error) {
	absence := &storage.Absence{
		ID:        req.Id,
		StartDate: req.StartDate.AsTime(),
		EndDate:   req.EndDate.AsTime(),
		Reason:    req.Reason,
		Status:    req.Status,
	}

	if err := s.storage.UpdateAbsence(absence); err != nil {
		return nil, err
	}

	return &pb.Absence{
		Id:        absence.ID,
		StartDate: timestamppb.New(absence.StartDate),
		EndDate:   timestamppb.New(absence.EndDate),
		Reason:    absence.Reason,
		Status:    absence.Status,
	}, nil
}

func (s *AbsenceServiceServer) DeleteAbsence(ctx context.Context, req *pb.DeleteAbsenceRequest) (*pb.DeleteAbsenceResponse, error) {
	if err := s.storage.DeleteAbsence(req.Id); err != nil {
		return &pb.DeleteAbsenceResponse{Success: false}, err
	}
	return &pb.DeleteAbsenceResponse{Success: true}, nil
}
