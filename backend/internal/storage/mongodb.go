package storage

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/mongo"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoStorage struct {
	client      *mongo.Client
	db          *mongo.Database
	absences    *mongo.Collection
	users       *mongo.Collection
	departments *mongo.Collection
	teams       *mongo.Collection
	holidays    *mongo.Collection
}

type AbsenceDoc struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	UserID    string             `bson:"user_id"`
	StartDate time.Time          `bson:"start_date"`
	EndDate   time.Time          `bson:"end_date"`
	Reason    string             `bson:"reason"`
	Status    string             `bson:"status"`
}

type UserDoc struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	Name         string             `bson:"name"`
	Email        string             `bson:"email"`
	DepartmentID string             `bson:"department_id,omitempty"`
	TeamID       string             `bson:"team_id,omitempty"`
	Country      string             `bson:"country,omitempty"`
}

type DepartmentDoc struct {
	ID   primitive.ObjectID `bson:"_id,omitempty"`
	Name string             `bson:"name"`
}

type TeamDoc struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	Name         string             `bson:"name"`
	DepartmentID string             `bson:"department_id"`
}

type HolidayDoc struct {
	ID      primitive.ObjectID `bson:"_id,omitempty"`
	Date    string             `bson:"date"`
	Name    string             `bson:"name"`
	Country string             `bson:"country"`
	Year    int                `bson:"year"`
}

func NewMongoStorage(uri, dbName string) (*MongoStorage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	db := client.Database(dbName)

	return &MongoStorage{
		client:      client,
		db:          db,
		absences:    db.Collection("absences"),
		users:       db.Collection("users"),
		departments: db.Collection("departments"),
		teams:       db.Collection("teams"),
		holidays:    db.Collection("holidays"),
	}, nil
}

func (s *MongoStorage) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.client.Disconnect(ctx)
}

func (s *MongoStorage) CreateAbsence(absence *Absence) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	doc := AbsenceDoc{
		UserID:    absence.UserID,
		StartDate: absence.StartDate,
		EndDate:   absence.EndDate,
		Reason:    absence.Reason,
		Status:    absence.Status,
	}

	result, err := s.absences.InsertOne(ctx, doc)
	if err != nil {
		return err
	}

	absence.ID = result.InsertedID.(primitive.ObjectID).Hex()
	return nil
}

func (s *MongoStorage) GetAbsences(userID string, startDate, endDate time.Time) ([]*Absence, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	if userID != "" {
		filter["user_id"] = userID
	}

	// Si des dates sont fournies, trouver les absences qui se chevauchent avec la période
	// Une absence chevauche si: absence.start_date <= endDate ET absence.end_date >= startDate
	if !startDate.IsZero() && !endDate.IsZero() {
		filter["$and"] = []bson.M{
			{"start_date": bson.M{"$lte": endDate}},
			{"end_date": bson.M{"$gte": startDate}},
		}
	} else if !startDate.IsZero() {
		filter["end_date"] = bson.M{"$gte": startDate}
	} else if !endDate.IsZero() {
		filter["start_date"] = bson.M{"$lte": endDate}
	}

	cursor, err := s.absences.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var absences []*Absence
	for cursor.Next(ctx) {
		var doc AbsenceDoc
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		absences = append(absences, &Absence{
			ID:        doc.ID.Hex(),
			UserID:    doc.UserID,
			StartDate: doc.StartDate,
			EndDate:   doc.EndDate,
			Reason:    doc.Reason,
			Status:    doc.Status,
		})
	}

	return absences, nil
}

func (s *MongoStorage) UpdateAbsence(absence *Absence) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(absence.ID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"start_date": absence.StartDate,
			"end_date":   absence.EndDate,
			"reason":     absence.Reason,
			"status":     absence.Status,
		},
	}

	_, err = s.absences.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (s *MongoStorage) DeleteAbsence(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = s.absences.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (s *MongoStorage) CreateUser(user *User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	doc := UserDoc{
		Name:         user.Name,
		Email:        user.Email,
		DepartmentID: user.DepartmentID,
		TeamID:       user.TeamID,
		Country:      user.Country,
	}

	result, err := s.users.InsertOne(ctx, doc)
	if err != nil {
		return err
	}

	user.ID = result.InsertedID.(primitive.ObjectID).Hex()
	return nil
}

func (s *MongoStorage) GetUsers() ([]*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := s.users.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []*User
	for cursor.Next(ctx) {
		var doc UserDoc
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		users = append(users, &User{
			ID:           doc.ID.Hex(),
			Name:         doc.Name,
			Email:        doc.Email,
			DepartmentID: doc.DepartmentID,
			TeamID:       doc.TeamID,
			Country:      doc.Country,
		})
	}

	return users, nil
}

func (s *MongoStorage) UpdateUser(user *User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(user.ID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"name":          user.Name,
			"email":         user.Email,
			"department_id": user.DepartmentID,
			"team_id":       user.TeamID,
			"country":       user.Country,
		},
	}

	_, err = s.users.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (s *MongoStorage) DeleteUser(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = s.users.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (s *MongoStorage) CreateDepartment(dept *Department) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	doc := DepartmentDoc{
		Name: dept.Name,
	}

	result, err := s.departments.InsertOne(ctx, doc)
	if err != nil {
		return err
	}

	dept.ID = result.InsertedID.(primitive.ObjectID).Hex()
	return nil
}

func (s *MongoStorage) GetDepartments() ([]*Department, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := s.departments.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var departments []*Department
	for cursor.Next(ctx) {
		var doc DepartmentDoc
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		departments = append(departments, &Department{
			ID:   doc.ID.Hex(),
			Name: doc.Name,
		})
	}

	return departments, nil
}

func (s *MongoStorage) CreateTeam(team *Team) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	doc := TeamDoc{
		Name:         team.Name,
		DepartmentID: team.DepartmentID,
	}

	result, err := s.teams.InsertOne(ctx, doc)
	if err != nil {
		return err
	}

	team.ID = result.InsertedID.(primitive.ObjectID).Hex()
	return nil
}

func (s *MongoStorage) GetTeams(departmentID string) ([]*Team, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	if departmentID != "" {
		filter["department_id"] = departmentID
	}

	cursor, err := s.teams.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var teams []*Team
	for cursor.Next(ctx) {
		var doc TeamDoc
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		teams = append(teams, &Team{
			ID:           doc.ID.Hex(),
			Name:         doc.Name,
			DepartmentID: doc.DepartmentID,
		})
	}

	return teams, nil
}

func (s *MongoStorage) UpdateDepartment(dept *Department) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(dept.ID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"name": dept.Name,
		},
	}

	_, err = s.departments.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (s *MongoStorage) DeleteDepartment(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = s.departments.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (s *MongoStorage) UpdateTeam(team *Team) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(team.ID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"name":          team.Name,
			"department_id": team.DepartmentID,
		},
	}

	_, err = s.teams.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (s *MongoStorage) DeleteTeam(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = s.teams.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (s *MongoStorage) CreateHoliday(holiday *Holiday) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	doc := HolidayDoc{
		Date:    holiday.Date,
		Name:    holiday.Name,
		Country: holiday.Country,
		Year:    holiday.Year,
	}

	result, err := s.holidays.InsertOne(ctx, doc)
	if err != nil {
		return err
	}

	holiday.ID = result.InsertedID.(primitive.ObjectID).Hex()
	return nil
}

func (s *MongoStorage) GetHolidays(country string, year int) ([]*Holiday, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{}
	if country != "" {
		filter["country"] = country
	}
	if year > 0 {
		filter["year"] = year
	}

	cursor, err := s.holidays.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var holidays []*Holiday
	for cursor.Next(ctx) {
		var doc HolidayDoc
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		holidays = append(holidays, &Holiday{
			ID:      doc.ID.Hex(),
			Date:    doc.Date,
			Name:    doc.Name,
			Country: doc.Country,
			Year:    doc.Year,
		})
	}

	return holidays, nil
}

func (s *MongoStorage) UpdateHoliday(holiday *Holiday) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(holiday.ID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"date":    holiday.Date,
			"name":    holiday.Name,
			"country": holiday.Country,
			"year":    holiday.Year,
		},
	}

	_, err = s.holidays.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

func (s *MongoStorage) DeleteHoliday(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = s.holidays.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}
