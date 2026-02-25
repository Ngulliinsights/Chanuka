CREATE TABLE IF NOT EXISTS "credibility_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain_category" varchar(100),
	"base_score" numeric(5, 2) DEFAULT '50.0',
	"expertise_bonus" numeric(5, 2) DEFAULT '0.0',
	"community_adjustment" numeric(5, 2) DEFAULT '0.0',
	"peer_adjustment" numeric(5, 2) DEFAULT '0.0',
	"historical_accuracy" numeric(5, 2),
	"final_score" numeric(5, 2),
	"last_calculated" timestamp DEFAULT now(),
	"calculation_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_credibility_domain" UNIQUE("user_id","domain_category")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expert_id" uuid NOT NULL,
	"activity_type" varchar(50),
	"entity_type" varchar(50),
	"entity_id" uuid,
	"activity_score" numeric(5, 2),
	"quality_metrics" jsonb,
	"community_feedback" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_type" varchar(50) NOT NULL,
	"institution" varchar(255),
	"verification_method" varchar(50),
	"verified_at" timestamp,
	"verified_by" uuid,
	"expires_at" timestamp,
	"credential_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"domain_category" varchar(100) NOT NULL,
	"expertise_level" varchar(20),
	"years_experience" integer,
	"credential_ids" uuid[] DEFAULT '{}',
	"peer_validations" integer DEFAULT 0,
	"community_validations" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_domain" UNIQUE("user_id","domain_category")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expert_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"review_type" varchar(50),
	"review_status" varchar(20),
	"review_content" text,
	"confidence_level" numeric(3, 2),
	"review_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "peer_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validator_id" uuid NOT NULL,
	"target_expert_id" uuid NOT NULL,
	"domain_category" varchar(100),
	"validation_type" varchar(50),
	"validation_score" numeric(3, 2),
	"validation_reason" text,
	"validation_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_validator_target_domain" UNIQUE("validator_id","target_expert_id","domain_category")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credibility_scores" ADD CONSTRAINT "credibility_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_activity" ADD CONSTRAINT "expert_activity_expert_id_users_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_credentials" ADD CONSTRAINT "expert_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_credentials" ADD CONSTRAINT "expert_credentials_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_domains" ADD CONSTRAINT "expert_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expert_reviews" ADD CONSTRAINT "expert_reviews_expert_id_users_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "peer_validations" ADD CONSTRAINT "peer_validations_validator_id_users_id_fk" FOREIGN KEY ("validator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "peer_validations" ADD CONSTRAINT "peer_validations_target_expert_id_users_id_fk" FOREIGN KEY ("target_expert_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credibility_user_domain" ON "credibility_scores" USING btree ("user_id","domain_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credibility_final_score" ON "credibility_scores" USING btree ("final_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credibility_user" ON "credibility_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credibility_domain" ON "credibility_scores" USING btree ("domain_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_activity_expert" ON "expert_activity" USING btree ("expert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_activity_type" ON "expert_activity" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_activity_entity" ON "expert_activity" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_activity_created" ON "expert_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_credentials_user" ON "expert_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_credentials_type" ON "expert_credentials" USING btree ("credential_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_credentials_institution" ON "expert_credentials" USING btree ("institution");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_credentials_verified" ON "expert_credentials" USING btree ("verified_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_credentials_expires" ON "expert_credentials" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_domains_user" ON "expert_domains" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_domains_category" ON "expert_domains" USING btree ("domain_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_domains_level" ON "expert_domains" USING btree ("expertise_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_reviews_expert" ON "expert_reviews" USING btree ("expert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_reviews_entity" ON "expert_reviews" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_reviews_status" ON "expert_reviews" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_expert_reviews_type" ON "expert_reviews" USING btree ("review_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_peer_validations_validator" ON "peer_validations" USING btree ("validator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_peer_validations_target" ON "peer_validations" USING btree ("target_expert_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_peer_validations_domain" ON "peer_validations" USING btree ("domain_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_peer_validations_type" ON "peer_validations" USING btree ("validation_type");