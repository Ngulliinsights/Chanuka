
-- Add implementation_workarounds table
CREATE TABLE IF NOT EXISTS "implementation_workarounds" (
	"id" text PRIMARY KEY NOT NULL,
	"original_bill_id" integer NOT NULL,
	"workaround_bill_id" integer NOT NULL,
	"detection_reason" text NOT NULL,
	"similarity_score" real DEFAULT 0 NOT NULL,
	"similarity_analysis" jsonb,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"alert_status" text DEFAULT 'active' NOT NULL,
	"public_notification_sent" boolean DEFAULT false NOT NULL,
	"evidence_documents" jsonb,
	"community_confirmations" integer DEFAULT 0 NOT NULL,
	"reported_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "implementation_workarounds" ADD CONSTRAINT "implementation_workarounds_original_bill_id_bills_id_fk" FOREIGN KEY ("original_bill_id") REFERENCES "bills"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "implementation_workarounds" ADD CONSTRAINT "implementation_workarounds_workaround_bill_id_bills_id_fk" FOREIGN KEY ("workaround_bill_id") REFERENCES "bills"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "implementation_workarounds" ADD CONSTRAINT "implementation_workarounds_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
