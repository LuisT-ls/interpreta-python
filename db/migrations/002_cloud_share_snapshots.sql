ALTER TABLE cloud_project_shares
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS project_updated_at timestamptz;

UPDATE cloud_project_shares AS shares
SET project_name = projects.name,
    payload = projects.payload,
    project_updated_at = projects.updated_at
FROM cloud_projects AS projects
WHERE projects.owner_id = shares.owner_id
  AND projects.project_id = shares.project_id
  AND (shares.project_name IS NULL OR shares.payload IS NULL OR shares.project_updated_at IS NULL);

ALTER TABLE cloud_project_shares
  ALTER COLUMN project_name SET NOT NULL,
  ALTER COLUMN payload SET NOT NULL,
  ALTER COLUMN project_updated_at SET NOT NULL;
