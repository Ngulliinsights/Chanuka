-- Migration 0019: Add user_bill_tracking_preference table
--
-- This table fixes a critical flaw where user tracking preferences
-- (alert frequency, channels) were only stored in the cache
-- and would be lost on a server restart or cache flush.
--
-- This table establishes a 1:1 relationship with bill_engagement
-- to store the preferences for that tracking relationship.

CREATE TABLE "user_bill_tracking_preference" (
  "id" serial PRIMARY KEY NOT NULL,
  
  -- Foreign key to the user
  "user_id" uuid NOT_NULL REFERENCES "user"("id") ON DELETE cascade,
  
  -- Foreign key to the bill
  "bill_id" integer NOT_NULL REFERENCES "bill"("id") ON DELETE cascade,
  
  -- User's notification preferences
  "tracking_types" text[] DEFAULT ARRAY['status_changes', 'new_comments']::text[] NOT NULL,
  "alert_frequency" text DEFAULT 'immediate' NOT NULL,
  "alert_channels" text[] DEFAULT ARRAY['in_app', 'email']::text[] NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  
  -- Timestamps
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Ensure a user can only have one preference entry per bill
  CONSTRAINT "user_bill_preference_unique" UNIQUE("user_id", "bill_id")
);

-- Add indexes for efficient querying
CREATE INDEX "user_bill_preference_user_id_idx" ON "user_bill_tracking_preference" ("user_id");
CREATE INDEX "user_bill_preference_bill_id_idx" ON "user_bill_tracking_preference" ("bill_id");
CREATE INDEX "user_bill_preference_active_idx" ON "user_bill_tracking_preference" ("is_active");

-- This file intentionally does not backfill data from `bill_engagement`
-- as the preference data did not exist in the database.
-- Existing trackers will get default preferences upon their next interaction.