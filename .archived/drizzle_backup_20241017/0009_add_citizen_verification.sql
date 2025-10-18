
-- Add citizen verification system table
CREATE TABLE IF NOT EXISTS "citizen_verifications" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "bill_id" integer NOT NULL,
  "citizen_id" varchar(255) NOT NULL,
  "verification_type" varchar(50) NOT NULL,
  "verification_status" varchar(50) DEFAULT 'pending' NOT NULL,
  "confidence" integer DEFAULT 0 NOT NULL,
  "evidence" jsonb DEFAULT '[]' NOT NULL,
  "expertise" jsonb NOT NULL,
  "reasoning" text NOT NULL,
  "endorsements" integer DEFAULT 0 NOT NULL,
  "disputes" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "citizen_verifications" ADD CONSTRAINT "citizen_verifications_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "citizen_verifications" ADD CONSTRAINT "citizen_verifications_citizen_id_users_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_citizen_verifications_bill_id" ON "citizen_verifications" ("bill_id");
CREATE INDEX IF NOT EXISTS "idx_citizen_verifications_citizen_id" ON "citizen_verifications" ("citizen_id");
CREATE INDEX IF NOT EXISTS "idx_citizen_verifications_status" ON "citizen_verifications" ("verification_status");
CREATE INDEX IF NOT EXISTS "idx_citizen_verifications_type" ON "citizen_verifications" ("verification_type");

-- Add reputation score column to users table if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reputation_score" integer DEFAULT 0 NOT NULL;
