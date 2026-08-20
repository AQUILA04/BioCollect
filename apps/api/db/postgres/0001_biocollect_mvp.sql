BEGIN;

CREATE TYPE biocollect_role AS ENUM ('Administrateur', 'Superviseur', 'Enquêteur');
CREATE TYPE submission_status AS ENUM ('DRAFT', 'SYNCED', 'PROCESSING', 'VALIDATED', 'SUSPECTED_DUPLICATE', 'REJECTED');
CREATE TYPE conflict_action AS ENUM ('Rejeter', 'Fusionner', 'Forcer Faux Positif');

CREATE TABLE "Project" (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "FormSchema" (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  fields JSONB NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT form_schema_project_version_unique UNIQUE (project_id, version)
);

CREATE TABLE "BiometricConfig" (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES "Project"(id) ON DELETE CASCADE,
  required_fingers TEXT[] NOT NULL CHECK (cardinality(required_fingers) BETWEEN 1 AND 10),
  nfiq_threshold SMALLINT NOT NULL CHECK (nfiq_threshold BETWEEN 1 AND 5),
  matching_threshold SMALLINT NOT NULL CHECK (matching_threshold BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Submission" (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES "Project"(id),
  form_schema_id UUID REFERENCES "FormSchema"(id),
  investigator_id BIGINT NOT NULL,
  data JSONB NOT NULL,
  status submission_status NOT NULL DEFAULT 'DRAFT',
  matched_submission_id UUID REFERENCES "Submission"(id),
  similarity_score SMALLINT CHECK (similarity_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "BiometricAttachment" (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES "Submission"(id) ON DELETE CASCADE,
  finger_type VARCHAR(64) NOT NULL,
  minio_path TEXT NOT NULL CHECK (minio_path ~ '^minio://[^/]+/.+'),
  nfiq_score SMALLINT NOT NULL CHECK (nfiq_score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "ConflictResolution" (
  id UUID PRIMARY KEY,
  suspected_submission_id UUID NOT NULL REFERENCES "Submission"(id),
  target_submission_id UUID NOT NULL REFERENCES "Submission"(id),
  action conflict_action NOT NULL,
  reason TEXT,
  resolved_by BIGINT NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conflict_resolution_distinct_dossiers CHECK (suspected_submission_id <> target_submission_id)
);

CREATE INDEX submission_project_status_idx ON "Submission" (project_id, status);
CREATE INDEX submission_investigator_idx ON "Submission" (investigator_id);
CREATE INDEX biometric_attachment_submission_idx ON "BiometricAttachment" (submission_id);
CREATE INDEX conflict_resolution_suspected_idx ON "ConflictResolution" (suspected_submission_id);

COMMIT;
