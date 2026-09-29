package service

import (
	"absence-management/internal/storage"
	pb "absence-management/proto/absence/v1"
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Bornes ouvertes pour balayer toutes les absences d'une personne : SQLite
// compare les dates en SQL, un time.Time nul y exclurait toutes les lignes.
var (
	absenceEpoch   = time.Unix(0, 0).UTC()
	absenceForever = time.Date(9999, time.December, 31, 0, 0, 0, 0, time.UTC)
)

type UserServiceServer struct {
	pb.UnimplementedUserServiceServer
	storage storage.Storage
}

func NewUserServiceServer(store storage.Storage) *UserServiceServer {
	return &UserServiceServer{storage: store}
}

func (s *UserServiceServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
	// Check if user already exists (by email if present, else by exact name match)
	existingUsers, err := s.storage.GetUsers()
	if err == nil {
		for _, u := range existingUsers {
			if req.Email != "" && u.Email == req.Email {
				return &pb.CreateUserResponse{User: &pb.User{
					Id: u.ID, Name: u.Name, Email: u.Email,
					DepartmentId: u.DepartmentID, TeamId: u.TeamID,
					Country: u.Country, JobProfile: u.JobProfile,
				}}, nil
			}
			if req.Email == "" && u.Name == req.Name {
				return &pb.CreateUserResponse{User: &pb.User{
					Id: u.ID, Name: u.Name, Email: u.Email,
					DepartmentId: u.DepartmentID, TeamId: u.TeamID,
					Country: u.Country, JobProfile: u.JobProfile,
				}}, nil
			}
		}
	}

	user := &storage.User{
		ID:         uuid.New().String(),
		Name:       req.Name,
		Email:      req.Email,
		Country:    strings.ToUpper(req.Country),
		TeamID:     req.TeamId,
		JobProfile: req.JobProfile,
	}

	if err := s.storage.CreateUser(user); err != nil {
		return nil, err
	}

	return &pb.CreateUserResponse{User: &pb.User{
		Id:         user.ID,
		Name:       user.Name,
		Email:      user.Email,
		TeamId:     user.TeamID,
		Country:    user.Country,
		JobProfile: user.JobProfile,
	}}, nil
}

func (s *UserServiceServer) GetUsers(ctx context.Context, req *pb.GetUsersRequest) (*pb.GetUsersResponse, error) {
	users, err := s.storage.GetUsers()
	if err != nil {
		return nil, err
	}

	var pbUsers []*pb.User
	for _, u := range users {
		pbUsers = append(pbUsers, &pb.User{
			Id:           u.ID,
			Name:         u.Name,
			Email:        u.Email,
			DepartmentId: u.DepartmentID,
			TeamId:       u.TeamID,
			Country:      u.Country,
			JobProfile:   u.JobProfile,
		})
	}

	return &pb.GetUsersResponse{Users: pbUsers}, nil
}

func (s *UserServiceServer) AssignUserToDepartment(ctx context.Context, req *pb.AssignUserToDepartmentRequest) (*pb.AssignUserToDepartmentResponse, error) {
	users, _ := s.storage.GetUsers()
	for _, u := range users {
		if u.ID == req.UserId {
			u.DepartmentID = req.DepartmentId
			_ = s.storage.UpdateUser(u)
			return &pb.AssignUserToDepartmentResponse{User: &pb.User{
				Id:           u.ID,
				Name:         u.Name,
				Email:        u.Email,
				DepartmentId: u.DepartmentID,
				TeamId:       u.TeamID,
				Country:      u.Country,
				JobProfile:   u.JobProfile,
			}}, nil
		}
	}
	return nil, nil
}

func (s *UserServiceServer) AssignUserToTeam(ctx context.Context, req *pb.AssignUserToTeamRequest) (*pb.AssignUserToTeamResponse, error) {
	users, _ := s.storage.GetUsers()
	for _, u := range users {
		if u.ID == req.UserId {
			u.TeamID = req.TeamId
			_ = s.storage.UpdateUser(u)
			return &pb.AssignUserToTeamResponse{User: &pb.User{
				Id:           u.ID,
				Name:         u.Name,
				Email:        u.Email,
				DepartmentId: u.DepartmentID,
				TeamId:       u.TeamID,
				Country:      u.Country,
				JobProfile:   u.JobProfile,
			}}, nil
		}
	}
	return nil, nil
}

func (s *UserServiceServer) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
	users, _ := s.storage.GetUsers()
	for _, u := range users {
		if u.ID == req.Id {
			u.Name = req.Name
			u.Email = req.Email
			u.Country = strings.ToUpper(req.Country)
			// job_profile est le champ explicite ; title est l'ancien nom, conservé
			// pour les clients qui l'utilisent encore.
			if req.JobProfile != "" {
				u.JobProfile = req.JobProfile
			} else {
				u.JobProfile = req.Title
			}
			_ = s.storage.UpdateUser(u)
			return &pb.UpdateUserResponse{User: &pb.User{
				Id:         u.ID,
				Name:       u.Name,
				Email:      u.Email,
				TeamId:     u.TeamID,
				Country:    u.Country,
				JobProfile: u.JobProfile,
			}}, nil
		}
	}
	return nil, nil
}

func (s *UserServiceServer) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.DeleteUserResponse, error) {
	// Les absences de la personne partent avec elle : sans cela elles resteraient
	// en base sans porteur, invisibles dans l'interface et exportées par personne.
	if absences, err := s.storage.GetAbsences(req.Id, absenceEpoch, absenceForever); err == nil {
		for _, a := range absences {
			_ = s.storage.DeleteAbsence(a.ID)
		}
	}

	if err := s.storage.DeleteUser(req.Id); err != nil {
		return &pb.DeleteUserResponse{Success: false}, err
	}
	return &pb.DeleteUserResponse{Success: true}, nil
}
