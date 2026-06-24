CREATE TYPE application_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE application_category AS ENUM ('GRANT', 'LOAN', 'PROCUREMENT', 'OTHER');
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category application_category NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2),
  status application_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT applications_amount_nonnegative CHECK (amount IS NULL OR amount >= 0)
);
CREATE INDEX idx_applications_owner_id ON applications(owner_id);
CREATE INDEX idx_applications_status ON applications(status);
