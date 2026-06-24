package models

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID            uuid.UUID `json:"id"`
	ApplicationID uuid.UUID `json:"application_id"`
	ActorID       uuid.UUID `json:"actor_id"`
	ActorName     string    `json:"actor_name"`
	FromStatus    *Status   `json:"from_status"`
	ToStatus      Status    `json:"to_status"`
	Comment       *string   `json:"comment"`
	CreatedAt     time.Time `json:"created_at"`
}
