package service

import (
	"absence-management/internal/storage"
	pb "absence-management/proto"
	"context"

	"github.com/google/uuid"
)

type OrganizationServiceServer struct {
	pb.UnimplementedOrganizationServiceServer
	storage storage.Storage
}

func NewOrganizationServiceServer(store storage.Storage) *OrganizationServiceServer {
	return &OrganizationServiceServer{storage: store}
}

func (s *OrganizationServiceServer) CreateDepartment(ctx context.Context, req *pb.CreateDepartmentRequest) (*pb.Department, error) {
	dept := &storage.Department{
		ID:   uuid.New().String(),
		Name: req.Name,
	}

	if err := s.storage.CreateDepartment(dept); err != nil {
		return nil, err
	}

	return &pb.Department{
		Id:   dept.ID,
		Name: dept.Name,
	}, nil
}

func (s *OrganizationServiceServer) GetDepartments(ctx context.Context, req *pb.GetDepartmentsRequest) (*pb.GetDepartmentsResponse, error) {
	depts, err := s.storage.GetDepartments()
	if err != nil {
		return nil, err
	}

	var pbDepts []*pb.Department
	for _, d := range depts {
		pbDepts = append(pbDepts, &pb.Department{
			Id:   d.ID,
			Name: d.Name,
		})
	}

	return &pb.GetDepartmentsResponse{Departments: pbDepts}, nil
}

func (s *OrganizationServiceServer) CreateTeam(ctx context.Context, req *pb.CreateTeamRequest) (*pb.Team, error) {
	team := &storage.Team{
		ID:           uuid.New().String(),
		Name:         req.Name,
		DepartmentID: req.DepartmentId,
	}

	if err := s.storage.CreateTeam(team); err != nil {
		return nil, err
	}

	return &pb.Team{
		Id:           team.ID,
		Name:         team.Name,
		DepartmentId: team.DepartmentID,
	}, nil
}

func (s *OrganizationServiceServer) GetTeams(ctx context.Context, req *pb.GetTeamsRequest) (*pb.GetTeamsResponse, error) {
	teams, err := s.storage.GetTeams(req.DepartmentId)
	if err != nil {
		return nil, err
	}

	var pbTeams []*pb.Team
	for _, t := range teams {
		pbTeams = append(pbTeams, &pb.Team{
			Id:           t.ID,
			Name:         t.Name,
			DepartmentId: t.DepartmentID,
		})
	}

	return &pb.GetTeamsResponse{Teams: pbTeams}, nil
}

func (s *OrganizationServiceServer) UpdateDepartment(ctx context.Context, req *pb.UpdateDepartmentRequest) (*pb.Department, error) {
	dept := &storage.Department{
		ID:   req.Id,
		Name: req.Name,
	}

	if err := s.storage.UpdateDepartment(dept); err != nil {
		return nil, err
	}

	return &pb.Department{
		Id:   dept.ID,
		Name: dept.Name,
	}, nil
}

func (s *OrganizationServiceServer) DeleteDepartment(ctx context.Context, req *pb.DeleteDepartmentRequest) (*pb.DeleteDepartmentResponse, error) {
	if err := s.storage.DeleteDepartment(req.Id); err != nil {
		return &pb.DeleteDepartmentResponse{Success: false}, err
	}
	return &pb.DeleteDepartmentResponse{Success: true}, nil
}

func (s *OrganizationServiceServer) UpdateTeam(ctx context.Context, req *pb.UpdateTeamRequest) (*pb.Team, error) {
	team := &storage.Team{
		ID:           req.Id,
		Name:         req.Name,
		DepartmentID: req.DepartmentId,
	}

	if err := s.storage.UpdateTeam(team); err != nil {
		return nil, err
	}

	return &pb.Team{
		Id:           team.ID,
		Name:         team.Name,
		DepartmentId: team.DepartmentID,
	}, nil
}

func (s *OrganizationServiceServer) DeleteTeam(ctx context.Context, req *pb.DeleteTeamRequest) (*pb.DeleteTeamResponse, error) {
	if err := s.storage.DeleteTeam(req.Id); err != nil {
		return &pb.DeleteTeamResponse{Success: false}, err
	}
	return &pb.DeleteTeamResponse{Success: true}, nil
}
