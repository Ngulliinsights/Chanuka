-- Create missing security tables

CREATE TABLE IF NOT EXISTS "security_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "user_id" uuid,
  "ip_address" text,
  "user_agent" text,
  "resource" text,
  "action" text,
  "result" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'info',
  "details" jsonb,
  "session_id" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "threat_intelligence" (
  "id" serial PRIMARY KEY NOT NULL,
  "threat_type" text NOT NULL,
  "threat_value" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'medium',
  "source" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "expires_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);