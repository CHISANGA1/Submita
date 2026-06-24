package db

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"workflow/internal/models"
	"workflow/internal/statemachine"
	"workflow/internal/store"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PGStore struct{ Pool *pgxpool.Pool }

func OpenWithRetry(ctx context.Context, url string) (*PGStore, error) {
	var pool *pgxpool.Pool
	var err error
	for attempt := 0; attempt < 20; attempt++ {
		config, configErr := pgxpool.ParseConfig(url)
		if configErr != nil {
			return nil, fmt.Errorf("parse database configuration: %w", configErr)
		}
		config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
			_, err := conn.Exec(ctx, `SET TIME ZONE 'UTC'`)
			return err
		}
		pool, err = pgxpool.NewWithConfig(ctx, config)
		if err == nil {
			err = pool.Ping(ctx)
		}
		if err == nil {
			return &PGStore{Pool: pool}, nil
		}
		if pool != nil {
			pool.Close()
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Second):
		}
	}
	return nil, fmt.Errorf("connect to database: %w", err)
}

func Migrate(url, path string) error {
	m, err := migrate.New("file://"+path, url)
	if err != nil {
		return err
	}
	defer m.Close()
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

func (s *PGStore) UserByEmail(ctx context.Context, email string) (models.User, error) {
	var u models.User
	err := s.Pool.QueryRow(ctx, `SELECT id,email,password_hash,role,name,created_at FROM users WHERE lower(email)=lower($1)`, email).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.Name, &u.CreatedAt)
	return u, mapError(err)
}

func (s *PGStore) UserByID(ctx context.Context, id uuid.UUID) (models.User, error) {
	var u models.User
	err := s.Pool.QueryRow(ctx, `SELECT id,email,password_hash,role,name,created_at FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.Name, &u.CreatedAt)
	return u, mapError(err)
}

func scanApplication(row pgx.Row) (models.Application, error) {
	var a models.Application
	err := row.Scan(&a.ID, &a.OwnerID, &a.Title, &a.Category, &a.Description, &a.Amount, &a.Status, &a.CreatedAt, &a.UpdatedAt)
	return a, mapError(err)
}

const appColumns = `id,owner_id,title,category,description,amount,status,created_at,updated_at`

func (s *PGStore) ListApplications(ctx context.Context, user models.User) ([]models.Application, error) {
	query := `SELECT ` + appColumns + ` FROM applications`
	args := []any{}
	if user.Role == models.RoleApplicant {
		query += ` WHERE owner_id=$1`
		args = append(args, user.ID)
	}
	query += ` ORDER BY updated_at DESC`
	rows, err := s.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.Application, 0)
	for rows.Next() {
		a, err := scanApplication(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, a)
	}
	return result, rows.Err()
}

func (s *PGStore) CreateApplication(ctx context.Context, owner uuid.UUID, in models.ApplicationInput) (models.Application, error) {
	return scanApplication(s.Pool.QueryRow(ctx, `INSERT INTO applications(owner_id,title,category,description,amount) VALUES($1,$2,$3,$4,$5) RETURNING `+appColumns,
		owner, in.Title, in.Category, in.Description, in.Amount))
}

func (s *PGStore) ApplicationDetail(ctx context.Context, id uuid.UUID, user models.User) (models.ApplicationDetail, error) {
	a, err := scanApplication(s.Pool.QueryRow(ctx, `SELECT `+appColumns+` FROM applications WHERE id=$1`, id))
	if err != nil {
		return models.ApplicationDetail{}, err
	}
	if user.Role == models.RoleApplicant && a.OwnerID != user.ID {
		return models.ApplicationDetail{}, store.ErrNotFound
	}
	var ownerName string
	if err := s.Pool.QueryRow(ctx, `SELECT name FROM users WHERE id=$1`, a.OwnerID).Scan(&ownerName); err != nil {
		return models.ApplicationDetail{}, mapError(err)
	}
	rows, err := s.Pool.Query(ctx, `SELECT l.id,l.application_id,l.actor_id,u.name,l.from_status,l.to_status,l.comment,l.created_at
		FROM audit_logs l JOIN users u ON u.id=l.actor_id WHERE l.application_id=$1 ORDER BY l.created_at ASC`, id)
	if err != nil {
		return models.ApplicationDetail{}, err
	}
	defer rows.Close()
	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var log models.AuditLog
		if err := rows.Scan(&log.ID, &log.ApplicationID, &log.ActorID, &log.ActorName, &log.FromStatus, &log.ToStatus, &log.Comment, &log.CreatedAt); err != nil {
			return models.ApplicationDetail{}, err
		}
		logs = append(logs, log)
	}
	return models.ApplicationDetail{Application: a, OwnerName: ownerName, AuditLogs: logs}, rows.Err()
}

func (s *PGStore) UpdateApplication(ctx context.Context, id uuid.UUID, user models.User, in models.ApplicationInput) (models.Application, error) {
	a, err := scanApplication(s.Pool.QueryRow(ctx, `UPDATE applications SET title=$1,category=$2,description=$3,amount=$4,updated_at=NOW()
		WHERE id=$5 AND owner_id=$6 AND status='DRAFT' RETURNING `+appColumns, in.Title, in.Category, in.Description, in.Amount, id, user.ID))
	if errors.Is(err, store.ErrNotFound) {
		return models.Application{}, s.mutationReason(ctx, id, user.ID)
	}
	return a, err
}

func (s *PGStore) DeleteApplication(ctx context.Context, id uuid.UUID, user models.User) error {
	result, err := s.Pool.Exec(ctx, `DELETE FROM applications WHERE id=$1 AND owner_id=$2 AND status='DRAFT'`, id, user.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return s.mutationReason(ctx, id, user.ID)
	}
	return nil
}

func (s *PGStore) mutationReason(ctx context.Context, id, owner uuid.UUID) error {
	var actualOwner uuid.UUID
	var status models.Status
	err := s.Pool.QueryRow(ctx, `SELECT owner_id,status FROM applications WHERE id=$1`, id).Scan(&actualOwner, &status)
	if errors.Is(err, pgx.ErrNoRows) || actualOwner != owner {
		return store.ErrNotFound
	}
	if status != models.StatusDraft {
		return store.ErrNotDraft
	}
	return err
}

func (s *PGStore) TransitionApplication(ctx context.Context, id uuid.UUID, user models.User, to models.Status, comment string) (models.Application, error) {
	tx, err := s.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.Application{}, err
	}
	defer tx.Rollback(ctx)
	a, err := scanApplication(tx.QueryRow(ctx, `SELECT `+appColumns+` FROM applications WHERE id=$1 FOR UPDATE`, id))
	if err != nil {
		return models.Application{}, err
	}
	if user.Role == models.RoleApplicant && a.OwnerID != user.ID {
		return models.Application{}, store.ErrNotFound
	}
	if err := statemachine.Validate(a.Status, to, user.Role, comment); err != nil {
		return models.Application{}, err
	}
	updated, err := scanApplication(tx.QueryRow(ctx, `UPDATE applications SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING `+appColumns, to, id))
	if err != nil {
		return models.Application{}, err
	}
	var commentValue any
	if value := strings.TrimSpace(comment); value != "" {
		commentValue = value
	}
	_, err = tx.Exec(ctx, `INSERT INTO audit_logs(application_id,actor_id,from_status,to_status,comment) VALUES($1,$2,$3,$4,$5)`, id, user.ID, a.Status, to, commentValue)
	if err != nil {
		return models.Application{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Application{}, err
	}
	return updated, nil
}

func mapError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return store.ErrNotFound
	}
	return err
}
