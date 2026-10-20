CREATE TABLE IF NOT EXISTS app_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_projects (
  owner_id text NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, project_id)
);

CREATE INDEX IF NOT EXISTS cloud_projects_owner_updated_idx
  ON cloud_projects (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cloud_project_shares (
  owner_id text NOT NULL,
  project_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, project_id),
  FOREIGN KEY (owner_id, project_id)
    REFERENCES cloud_projects (owner_id, project_id)
    ON DELETE CASCADE
);
