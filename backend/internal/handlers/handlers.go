package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"workflow/internal/auth"
	"workflow/internal/models"
	"workflow/internal/statemachine"
	"workflow/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	Store    store.Store
	JWT      auth.Manager
	Validate *validator.Validate
}

type applicationRequest struct {
	Title       string          `json:"title" validate:"required,max=200"`
	Category    models.Category `json:"category" validate:"required"`
	Description string          `json:"description" validate:"required,max=10000"`
	Amount      *float64        `json:"amount" validate:"omitempty,gte=0"`
}

func New(s store.Store, jwt auth.Manager) *Handler {
	return &Handler{Store: s, JWT: jwt, Validate: validator.New()}
}

func (h *Handler) Router(frontendOrigin string) http.Handler {
	r := chi.NewRouter()
	r.Use(cors(frontendOrigin))
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		success(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/login", h.login)
		r.With(h.JWT.Middleware).Get("/me", h.me)
	})
	// Register the collection without a trailing slash to match the public API,
	// while retaining the slash form below for browser/client tolerance.
	r.With(h.JWT.Middleware).Get("/api/applications", h.listApplications)
	r.With(h.JWT.Middleware, auth.RequireRole(models.RoleApplicant)).Post("/api/applications", h.createApplication)
	r.Route("/api/applications", func(r chi.Router) {
		r.Use(h.JWT.Middleware)
		r.Get("/", h.listApplications)
		r.With(auth.RequireRole(models.RoleApplicant)).Post("/", h.createApplication)
		r.Get("/{id}", h.applicationDetail)
		r.With(auth.RequireRole(models.RoleApplicant)).Put("/{id}", h.updateApplication)
		r.With(auth.RequireRole(models.RoleApplicant)).Delete("/{id}", h.deleteApplication)
		r.Post("/{id}/transition", h.transition)
	})
	return r
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email    string `json:"email" validate:"required,email"`
		Password string `json:"password" validate:"required"`
	}
	if !decode(w, r, &request) || h.Validate.Struct(request) != nil {
		apiError(w, http.StatusBadRequest, "invalid email or password", "VALIDATION_ERROR")
		return
	}
	u, err := h.Store.UserByEmail(r.Context(), strings.TrimSpace(request.Email))
	if err != nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(request.Password)) != nil {
		apiError(w, http.StatusUnauthorized, "invalid credentials", "UNAUTHORIZED")
		return
	}
	token, err := h.JWT.Sign(u)
	if err != nil {
		internalError(w, err)
		return
	}
	success(w, http.StatusOK, map[string]any{"token": token, "user": u})
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	identity, _ := auth.UserFromContext(r.Context())
	u, err := h.Store.UserByID(r.Context(), identity.ID)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	success(w, http.StatusOK, u)
}

func (h *Handler) listApplications(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.UserFromContext(r.Context())
	apps, err := h.Store.ListApplications(r.Context(), u)
	if err != nil {
		internalError(w, err)
		return
	}
	success(w, http.StatusOK, apps)
}

func (h *Handler) createApplication(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.UserFromContext(r.Context())
	in, ok := h.readApplication(w, r)
	if !ok {
		return
	}
	a, err := h.Store.CreateApplication(r.Context(), u.ID, in)
	if err != nil {
		internalError(w, err)
		return
	}
	success(w, http.StatusCreated, a)
}

func (h *Handler) applicationDetail(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	u, _ := auth.UserFromContext(r.Context())
	detail, err := h.Store.ApplicationDetail(r.Context(), id, u)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	success(w, http.StatusOK, detail)
}

func (h *Handler) updateApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	in, ok := h.readApplication(w, r)
	if !ok {
		return
	}
	u, _ := auth.UserFromContext(r.Context())
	a, err := h.Store.UpdateApplication(r.Context(), id, u, in)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	success(w, http.StatusOK, a)
}

func (h *Handler) deleteApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	u, _ := auth.UserFromContext(r.Context())
	if err := h.Store.DeleteApplication(r.Context(), id, u); err != nil {
		writeStoreError(w, err)
		return
	}
	success(w, http.StatusOK, nil)
}

func (h *Handler) transition(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var request struct {
		To      models.Status `json:"to" validate:"required"`
		Comment string        `json:"comment"`
	}
	if !decode(w, r, &request) || h.Validate.Struct(request) != nil {
		apiError(w, http.StatusBadRequest, "target status is required", "VALIDATION_ERROR")
		return
	}
	if !validTarget(request.To) {
		apiError(w, http.StatusBadRequest, "invalid target status", "VALIDATION_ERROR")
		return
	}
	u, _ := auth.UserFromContext(r.Context())
	a, err := h.Store.TransitionApplication(r.Context(), id, u, request.To, request.Comment)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	success(w, http.StatusOK, a)
}

func (h *Handler) readApplication(w http.ResponseWriter, r *http.Request) (models.ApplicationInput, bool) {
	var request applicationRequest
	if !decode(w, r, &request) {
		return models.ApplicationInput{}, false
	}
	request.Title = strings.TrimSpace(request.Title)
	request.Description = strings.TrimSpace(request.Description)
	if h.Validate.Struct(request) != nil || !request.Category.Valid() {
		apiError(w, http.StatusBadRequest, "title, category and description are required; amount cannot be negative", "VALIDATION_ERROR")
		return models.ApplicationInput{}, false
	}
	return models.ApplicationInput{Title: request.Title, Category: request.Category, Description: request.Description, Amount: request.Amount}, true
}

func parseID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		apiError(w, http.StatusBadRequest, "invalid application id", "VALIDATION_ERROR")
		return uuid.Nil, false
	}
	return id, true
}

func validTarget(s models.Status) bool {
	return s == models.StatusDraft || s == models.StatusSubmitted || s == models.StatusUnderReview || s == models.StatusApproved || s == models.StatusRejected
}

func decode(w http.ResponseWriter, r *http.Request, dest any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dest); err != nil {
		apiError(w, http.StatusBadRequest, "invalid request body", "VALIDATION_ERROR")
		return false
	}
	return true
}

func success(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"data": data})
}
func apiError(w http.ResponseWriter, status int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message, "code": code})
}
func internalError(w http.ResponseWriter, err error) {
	slog.Error("request failed", "error", err)
	apiError(w, http.StatusInternalServerError, "internal server error", "INTERNAL_ERROR")
}

func writeStoreError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		apiError(w, http.StatusNotFound, "application not found", "NOT_FOUND")
	case errors.Is(err, store.ErrForbidden), errors.Is(err, statemachine.ErrUnauthorizedRole):
		apiError(w, http.StatusForbidden, err.Error(), "UNAUTHORIZED")
	case errors.Is(err, store.ErrNotDraft):
		apiError(w, http.StatusConflict, err.Error(), "ILLEGAL_TRANSITION")
	case errors.Is(err, statemachine.ErrIllegalTransition):
		apiError(w, http.StatusBadRequest, err.Error(), "ILLEGAL_TRANSITION")
	case errors.Is(err, statemachine.ErrCommentRequired):
		apiError(w, http.StatusBadRequest, err.Error(), "VALIDATION_ERROR")
	default:
		internalError(w, err)
	}
}

func cors(origins string) func(http.Handler) http.Handler {
	allowedOrigins := make(map[string]struct{})
	for _, origin := range strings.Split(origins, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			allowedOrigins[origin] = struct{}{}
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Vary", "Origin")
			if _, allowed := allowedOrigins[r.Header.Get("Origin")]; allowed {
				w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
