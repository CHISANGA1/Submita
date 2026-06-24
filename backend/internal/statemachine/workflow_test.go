package statemachine

import (
	"errors"
	"testing"

	"workflow/internal/models"
)

func TestValidate(t *testing.T) {
	tests := []struct {
		name     string
		from, to models.Status
		role     models.Role
		comment  string
		want     error
	}{
		{"submit", models.StatusDraft, models.StatusSubmitted, models.RoleApplicant, "", nil},
		{"start review", models.StatusSubmitted, models.StatusUnderReview, models.RoleReviewer, "", nil},
		{"approve", models.StatusUnderReview, models.StatusApproved, models.RoleReviewer, "", nil},
		{"reject under review", models.StatusUnderReview, models.StatusRejected, models.RoleReviewer, "reason", nil},
		{"return", models.StatusUnderReview, models.StatusDraft, models.RoleReviewer, "changes", nil},
		{"reject submitted", models.StatusSubmitted, models.StatusRejected, models.RoleReviewer, "reason", nil},
		{"illegal draft approval", models.StatusDraft, models.StatusApproved, models.RoleApplicant, "", ErrIllegalTransition},
		{"reviewer cannot submit", models.StatusDraft, models.StatusSubmitted, models.RoleReviewer, "", ErrUnauthorizedRole},
		{"applicant cannot approve", models.StatusUnderReview, models.StatusApproved, models.RoleApplicant, "", ErrUnauthorizedRole},
		{"reject needs comment", models.StatusUnderReview, models.StatusRejected, models.RoleReviewer, "", ErrCommentRequired},
		{"return needs comment", models.StatusUnderReview, models.StatusDraft, models.RoleReviewer, "  ", ErrCommentRequired},
		{"approved terminal", models.StatusApproved, models.StatusSubmitted, models.RoleApplicant, "", ErrIllegalTransition},
		{"rejected terminal", models.StatusRejected, models.StatusDraft, models.RoleApplicant, "", ErrIllegalTransition},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Validate(tt.from, tt.to, tt.role, tt.comment); !errors.Is(got, tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}
