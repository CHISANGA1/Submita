package models

import (
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleApplicant Role = "APPLICANT"
	RoleReviewer  Role = "REVIEWER"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
}
