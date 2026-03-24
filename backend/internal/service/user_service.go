package service

import (
	"absence-management/internal/storage"
	pb "absence-management/proto"
	"context"

	"github.com/google/uuid"
)

type UserServiceServer struct {
	pb.UnimplementedUserServiceServer
	storage storage.Storage
}

func NewUserServiceServer(store storage.Storage) *UserServiceServer {
	return &UserServiceServer{storage: store}
}

func (s *UserServiceServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
	user := &storage.User{
		ID:      uuid.New().String(),
		Name:    req.Name,
		Email:   req.Email,
		Country: req.Country,
	}

	if err := s.storage.CreateUser(user); err != nil {
		return nil, err
	}

	return &pb.User{
		Id:      user.ID,
		Name:    user.Name,
		Email:   user.Email,
		Country: user.Country,
	}, nil
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
			Title:        u.JobProfile,
		})
	}

	return &pb.GetUsersResponse{Users: pbUsers}, nil
}

func (s *UserServiceServer) AssignUserToDepartment(ctx context.Context, req *pb.AssignUserRequest) (*pb.User, error) {
	users, _ := s.storage.GetUsers()
	for _, u := range users {
		if u.ID == req.UserId {
			u.DepartmentID = req.DepartmentId
			s.storage.UpdateUser(u)
			return &pb.User{
				Id:           u.ID,
				Name:         u.Name,
				Email:        u.Email,
				DepartmentId: u.DepartmentID,
				TeamId:       u.TeamID,
				Country:      u.Country,
			}, nil
		}
	}
	return nil, nil
}

func (s *UserServiceServer) AssignUserToTeam(ctx context.Context, req *pb.AssignUserRequest) (*pb.User, error) {
	users, _ := s.storage.GetUsers()
	for _, u := range users {
		if u.ID == req.UserId {
			u.TeamID = req.TeamId
			s.storage.UpdateUser(u)
			return &pb.User{
				Id:           u.ID,
				Name:         u.Name,
				Email:        u.Email,
				DepartmentId: u.DepartmentID,
				TeamId:       u.TeamID,
				Country:      u.Country,
			}, nil
		}
	}
	return nil, nil
}

func (s *UserServiceServer) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.User, error) {
	users, _ := s.storage.GetUsers()
	for _, u := range users {
		if u.ID == req.Id {
			u.Name = req.Name
			u.Email = req.Email
			u.Country = req.Country
			u.JobProfile = req.Title
			s.storage.UpdateUser(u)
			return &pb.User{
				Id:      u.ID,
				Name:    u.Name,
				Email:   u.Email,
				TeamId:  u.TeamID,
				Country: u.Country,
				Title:   u.JobProfile,
			}, nil
		}
	}
	return nil, nil
}

func (s *UserServiceServer) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.DeleteUserResponse, error) {
	if err := s.storage.DeleteUser(req.Id); err != nil {
		return &pb.DeleteUserResponse{Success: false}, err
	}
	return &pb.DeleteUserResponse{Success: true}, nil
}
