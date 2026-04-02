package service

import (
	"absence-management/internal/storage"
	pb "absence-management/proto/absence/v1"
	"context"
	"strings"

	"github.com/google/uuid"
)

type HolidayServiceServer struct {
	pb.UnimplementedHolidayServiceServer
	storage storage.Storage
}

func NewHolidayServiceServer(store storage.Storage) *HolidayServiceServer {
	return &HolidayServiceServer{storage: store}
}

func (s *HolidayServiceServer) CreateHoliday(ctx context.Context, req *pb.CreateHolidayRequest) (*pb.CreateHolidayResponse, error) {
	holiday := &storage.Holiday{
		ID:      uuid.New().String(),
		Date:    req.Date,
		Name:    req.Name,
		Country: strings.ToUpper(req.Country),
		Year:    int(req.Year),
	}

	if err := s.storage.CreateHoliday(holiday); err != nil {
		return nil, err
	}

	return &pb.CreateHolidayResponse{Holiday: &pb.Holiday{
		Id:      holiday.ID,
		Date:    holiday.Date,
		Name:    holiday.Name,
		Country: holiday.Country,
		Year:    int32(holiday.Year),
	}}, nil
}

func (s *HolidayServiceServer) GetHolidays(ctx context.Context, req *pb.GetHolidaysRequest) (*pb.GetHolidaysResponse, error) {
	holidays, err := s.storage.GetHolidays(strings.ToUpper(req.Country), int(req.Year))
	if err != nil {
		return nil, err
	}

	var pbHolidays []*pb.Holiday
	for _, h := range holidays {
		pbHolidays = append(pbHolidays, &pb.Holiday{
			Id:      h.ID,
			Date:    h.Date,
			Name:    h.Name,
			Country: h.Country,
			Year:    int32(h.Year),
		})
	}

	return &pb.GetHolidaysResponse{Holidays: pbHolidays}, nil
}

func (s *HolidayServiceServer) UpdateHoliday(ctx context.Context, req *pb.UpdateHolidayRequest) (*pb.UpdateHolidayResponse, error) {
	holiday := &storage.Holiday{
		ID:      req.Id,
		Date:    req.Date,
		Name:    req.Name,
		Country: strings.ToUpper(req.Country),
		Year:    int(req.Year),
	}

	if err := s.storage.UpdateHoliday(holiday); err != nil {
		return nil, err
	}

	return &pb.UpdateHolidayResponse{Holiday: &pb.Holiday{
		Id:      holiday.ID,
		Date:    holiday.Date,
		Name:    holiday.Name,
		Country: holiday.Country,
		Year:    int32(holiday.Year),
	}}, nil
}

func (s *HolidayServiceServer) DeleteHoliday(ctx context.Context, req *pb.DeleteHolidayRequest) (*pb.DeleteHolidayResponse, error) {
	if err := s.storage.DeleteHoliday(req.Id); err != nil {
		return &pb.DeleteHolidayResponse{Success: false}, err
	}
	return &pb.DeleteHolidayResponse{Success: true}, nil
}

func (s *HolidayServiceServer) ImportHolidays(ctx context.Context, req *pb.ImportHolidaysRequest) (*pb.ImportHolidaysResponse, error) {
	count := 0
	for _, h := range req.Holidays {
		holiday := &storage.Holiday{
			ID:      uuid.New().String(),
			Date:    h.Date,
			Name:    h.Name,
			Country: strings.ToUpper(h.Country),
			Year:    int(h.Year),
		}
		if err := s.storage.CreateHoliday(holiday); err == nil {
			count++
		}
	}
	return &pb.ImportHolidaysResponse{ImportedCount: int32(count)}, nil
}
