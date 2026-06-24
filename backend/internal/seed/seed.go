package seed

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func Run(ctx context.Context, pool *pgxpool.Pool) error {
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), 12)
	if err != nil {
		return err
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var applicantID, reviewerID uuid.UUID
	if err = tx.QueryRow(ctx, `INSERT INTO users(email,password_hash,role,name) VALUES('applicant@test.com',$1,'APPLICANT','Alice Applicant') ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`, string(hash)).Scan(&applicantID); err != nil {
		return err
	}
	if err = tx.QueryRow(ctx, `INSERT INTO users(email,password_hash,role,name) VALUES('reviewer@test.com',$1,'REVIEWER','Bob Reviewer') ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`, string(hash)).Scan(&reviewerID); err != nil {
		return err
	}
	var count int
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM applications WHERE owner_id=$1`, applicantID).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		samples := []struct {
			title, category, description, status string
			amount                               float64
		}{
			{"Community garden supplies", "GRANT", "Tools and irrigation supplies for a neighborhood garden.", "DRAFT", 2500},
			{"Small business equipment", "LOAN", "Equipment financing for a local food producer.", "SUBMITTED", 12000},
			{"School computer purchase", "PROCUREMENT", "Purchase of laptops for the community school.", "UNDER_REVIEW", 18000},
		}
		for _, sample := range samples {
			var id uuid.UUID
			if err = tx.QueryRow(ctx, `INSERT INTO applications(owner_id,title,category,description,amount,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, applicantID, sample.title, sample.category, sample.description, sample.amount, sample.status).Scan(&id); err != nil {
				return fmt.Errorf("seed application: %w", err)
			}
			if sample.status == "SUBMITTED" || sample.status == "UNDER_REVIEW" {
				if _, err = tx.Exec(ctx, `INSERT INTO audit_logs(application_id,actor_id,from_status,to_status) VALUES($1,$2,'DRAFT','SUBMITTED')`, id, applicantID); err != nil {
					return err
				}
			}
			if sample.status == "UNDER_REVIEW" {
				if _, err = tx.Exec(ctx, `INSERT INTO audit_logs(application_id,actor_id,from_status,to_status) VALUES($1,$2,'SUBMITTED','UNDER_REVIEW')`, id, reviewerID); err != nil {
					return err
				}
			}
		}
	}
	return tx.Commit(ctx)
}
