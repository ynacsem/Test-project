CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS diagnoses;

CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL,
  diagnosis_name TEXT NOT NULL,
  predicted_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  justification TEXT NOT NULL,
  challenged_diagnosis TEXT,
  challenged_justification TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_client_id ON diagnoses(client_id);
