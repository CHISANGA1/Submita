package store

import (
	"context"
	"errors"

	"workflow/internal/models"

	"github.com/google/uuid"
)

var (
	ErrNotFound  = errors.New("resource not found")
	ErrForbidden = errors.New("operation not permitted")
	ErrNotDraft  = errors.New("only draft applications can be changed")
)

type Store interface {
	UserByEmail(context.Context, string) (models.User, error)
	UserByID(context.Context, uuid.UUID) (models.User, error)
	ListApplications(context.Context, models.User) ([]models.Application, error)
	CreateApplication(context.Context, uuid.UUID, models.ApplicationInput) (models.Application, error)
	ApplicationDetail(context.Context, uuid.UUID, models.User) (models.ApplicationDetail, error)
	UpdateApplication(context.Context, uuid.UUID, models.User, models.ApplicationInput) (models.Application, error)
	DeleteApplication(context.Context, uuid.UUID, models.User) error
	TransitionApplication(context.Context, uuid.UUID, models.User, models.Status, string) (models.Application, error)
}
