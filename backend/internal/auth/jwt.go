package auth

import (
	"time"

	"workflow/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID uuid.UUID   `json:"user_id"`
	Role   models.Role `json:"role"`
	jwt.RegisteredClaims
}

type Manager struct{ Secret []byte }

func (m Manager) Sign(user models.User) (string, error) {
	now := time.Now().UTC()
	claims := Claims{UserID: user.ID, Role: user.Role, RegisteredClaims: jwt.RegisteredClaims{
		Subject: user.ID.String(), IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.Secret)
}

func (m Manager) Parse(raw string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, jwt.ErrSignatureInvalid
		}
		return m.Secret, nil
	})
	if err != nil || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return token.Claims.(*Claims), nil
}
