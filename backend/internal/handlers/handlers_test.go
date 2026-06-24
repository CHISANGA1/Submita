package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"workflow/internal/auth"
	"workflow/internal/models"
	"workflow/internal/statemachine"
	"workflow/internal/store"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type fakeStore struct {
	transitionErr error
	updateErr     error
	detailErr     error
}

func (fakeStore) UserByEmail(context.Context, string) (models.User, error) { return models.User{}, nil }
func (fakeStore) UserByID(context.Context, uuid.UUID) (models.User, error) { return models.User{}, nil }
func (fakeStore) ListApplications(context.Context, models.User) ([]models.Application, error) {
	return []models.Application{}, nil
}
func (fakeStore) CreateApplication(_ context.Context, owner uuid.UUID, in models.ApplicationInput) (models.Application, error) {
	return models.Application{ID: uuid.New(), OwnerID: owner, Title: in.Title, Category: in.Category, Description: in.Description, Amount: in.Amount, Status: models.StatusDraft}, nil
}
func (f fakeStore) ApplicationDetail(context.Context, uuid.UUID, models.User) (models.ApplicationDetail, error) {
	return models.ApplicationDetail{}, f.detailErr
}
func (f fakeStore) UpdateApplication(context.Context, uuid.UUID, models.User, models.ApplicationInput) (models.Application, error) {
	return models.Application{}, f.updateErr
}
func (fakeStore) DeleteApplication(context.Context, uuid.UUID, models.User) error { return nil }
func (f fakeStore) TransitionApplication(context.Context, uuid.UUID, models.User, models.Status, string) (models.Application, error) {
	return models.Application{}, f.transitionErr
}

func TestApplicationsRequireAuthentication(t *testing.T) {
	h := New(fakeStore{}, auth.Manager{Secret: []byte("test-secret")})
	r := httptest.NewRequest(http.MethodGet, "/api/applications/", nil)
	w := httptest.NewRecorder()
	h.Router("http://localhost").ServeHTTP(w, r)
	require.Equal(t, http.StatusUnauthorized, w.Code)
	require.Contains(t, w.Body.String(), `"code":"UNAUTHORIZED"`)
}

func TestApplicantCannotApprove(t *testing.T) {
	manager := auth.Manager{Secret: []byte("test-secret")}
	user := models.User{ID: uuid.New(), Role: models.RoleApplicant}
	token, err := manager.Sign(user)
	require.NoError(t, err)
	h := New(fakeStore{transitionErr: statemachine.ErrUnauthorizedRole}, manager)
	r := httptest.NewRequest(http.MethodPost, "/api/applications/"+uuid.NewString()+"/transition", strings.NewReader(`{"to":"APPROVED"}`))
	r.Header.Set("Authorization", "Bearer "+token)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.Router("http://localhost").ServeHTTP(w, r)
	require.Equal(t, http.StatusForbidden, w.Code)
	require.Contains(t, w.Body.String(), `"code":"UNAUTHORIZED"`)
}

func TestCreateValidation(t *testing.T) {
	manager := auth.Manager{Secret: []byte("test-secret")}
	token, _ := manager.Sign(models.User{ID: uuid.New(), Role: models.RoleApplicant})
	h := New(fakeStore{}, manager)
	r := httptest.NewRequest(http.MethodPost, "/api/applications/", strings.NewReader(`{"title":" ","category":"BAD","description":"","amount":-1}`))
	r.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	h.Router("http://localhost").ServeHTTP(w, r)
	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Contains(t, w.Body.String(), `"code":"VALIDATION_ERROR"`)
}

func TestApplicantCannotUpdateNonDraft(t *testing.T) {
	manager := auth.Manager{Secret: []byte("test-secret")}
	token, _ := manager.Sign(models.User{ID: uuid.New(), Role: models.RoleApplicant})
	h := New(fakeStore{updateErr: store.ErrNotDraft}, manager)
	body := `{"title":"Valid title","category":"GRANT","description":"Valid description","amount":10}`
	r := httptest.NewRequest(http.MethodPut, "/api/applications/"+uuid.NewString(), strings.NewReader(body))
	r.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	h.Router("http://localhost").ServeHTTP(w, r)
	require.Equal(t, http.StatusConflict, w.Code)
	require.Contains(t, w.Body.String(), `"code":"ILLEGAL_TRANSITION"`)
}

func TestApplicantCannotReadAnotherOwnersApplication(t *testing.T) {
	manager := auth.Manager{Secret: []byte("test-secret")}
	token, _ := manager.Sign(models.User{ID: uuid.New(), Role: models.RoleApplicant})
	h := New(fakeStore{detailErr: store.ErrNotFound}, manager)
	r := httptest.NewRequest(http.MethodGet, "/api/applications/"+uuid.NewString(), nil)
	r.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	h.Router("http://localhost").ServeHTTP(w, r)
	require.Equal(t, http.StatusNotFound, w.Code)
}

func TestCORSAllowsConfiguredOrigins(t *testing.T) {
	h := New(fakeStore{}, auth.Manager{Secret: []byte("test-secret")})
	r := httptest.NewRequest(http.MethodOptions, "/api/applications", nil)
	r.Header.Set("Origin", "https://workflow.vercel.app")
	w := httptest.NewRecorder()

	h.Router("https://workflow.vercel.app, https://app.example.com").ServeHTTP(w, r)

	require.Equal(t, http.StatusNoContent, w.Code)
	require.Equal(t, "https://workflow.vercel.app", w.Header().Get("Access-Control-Allow-Origin"))
	require.Equal(t, "Origin", w.Header().Get("Vary"))
}

func TestCORSDoesNotAllowUnknownOrigins(t *testing.T) {
	h := New(fakeStore{}, auth.Manager{Secret: []byte("test-secret")})
	r := httptest.NewRequest(http.MethodOptions, "/api/applications", nil)
	r.Header.Set("Origin", "https://unknown.example.com")
	w := httptest.NewRecorder()

	h.Router("https://workflow.vercel.app").ServeHTTP(w, r)

	require.Equal(t, http.StatusNoContent, w.Code)
	require.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}
