package models

import (
	"time"

	"github.com/google/uuid"
)

type Status string

const (
	StatusDraft       Status = "DRAFT"
	StatusSubmitted   Status = "SUBMITTED"
	StatusUnderReview Status = "UNDER_REVIEW"
	StatusApproved    Status = "APPROVED"
	StatusRejected    Status = "REJECTED"
)

type Category string

const (
	CategoryGrant       Category = "GRANT"
	CategoryLoan        Category = "LOAN"
	CategoryProcurement Category = "PROCUREMENT"
	CategoryOther       Category = "OTHER"
)

func (c Category) Valid() bool {
	return c == CategoryGrant || c == CategoryLoan || c == CategoryProcurement || c == CategoryOther
}

type Application struct {
	ID          uuid.UUID `json:"id"`
	OwnerID     uuid.UUID `json:"owner_id"`
	Title       string    `json:"title"`
	Category    Category  `json:"category"`
	Description string    `json:"description"`
	Amount      *float64  `json:"amount"`
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ApplicationDetail struct {
	Application
	OwnerName string     `json:"owner_name"`
	AuditLogs []AuditLog `json:"audit_logs"`
}

type ApplicationInput struct {
	Title       string
	Category    Category
	Description string
	Amount      *float64
}
