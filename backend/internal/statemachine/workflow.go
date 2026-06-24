package statemachine

import (
	"errors"
	"strings"

	"workflow/internal/models"
)

type Transition struct {
	From         models.Status
	To           models.Status
	AllowedRole  models.Role
	NeedsComment bool
}

var transitions = []Transition{
	{models.StatusDraft, models.StatusSubmitted, models.RoleApplicant, false},
	{models.StatusSubmitted, models.StatusUnderReview, models.RoleReviewer, false},
	{models.StatusUnderReview, models.StatusApproved, models.RoleReviewer, false},
	{models.StatusUnderReview, models.StatusRejected, models.RoleReviewer, true},
	{models.StatusUnderReview, models.StatusDraft, models.RoleReviewer, true},
	{models.StatusSubmitted, models.StatusRejected, models.RoleReviewer, true},
}

var (
	ErrIllegalTransition = errors.New("transition not allowed from current status")
	ErrUnauthorizedRole  = errors.New("your role cannot perform this transition")
	ErrCommentRequired   = errors.New("a comment is required for this action")
)

func Validate(from, to models.Status, role models.Role, comment string) error {
	for _, transition := range transitions {
		if transition.From == from && transition.To == to {
			if transition.AllowedRole != role {
				return ErrUnauthorizedRole
			}
			if transition.NeedsComment && strings.TrimSpace(comment) == "" {
				return ErrCommentRequired
			}
			return nil
		}
	}
	return ErrIllegalTransition
}
