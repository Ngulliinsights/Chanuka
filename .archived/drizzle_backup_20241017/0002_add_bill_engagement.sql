-- Migration to add bill_engagement table if it doesn't exist

-- Check if the bill_engagement table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bill_engagement') THEN
        -- Create bill_engagement table
        CREATE TABLE "bill_engagement" (
            "id" SERIAL PRIMARY KEY,
            "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
            "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
            "view_count" INTEGER DEFAULT 0,
            "comment_count" INTEGER DEFAULT 0,
            "share_count" INTEGER DEFAULT 0,
            "engagement_score" FLOAT DEFAULT 0,
            "last_engaged" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );

        -- Create indexes for better query performance
        CREATE UNIQUE INDEX "bill_user_engagement_idx" ON "bill_engagement" ("bill_id", "user_id");
        CREATE INDEX "engagement_score_idx" ON "bill_engagement" ("engagement_score");

        -- Create trigger for automatic timestamp updates
        CREATE TRIGGER update_bill_engagement_updated_at
        BEFORE UPDATE ON "bill_engagement"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Record migration in drizzle_migrations table
INSERT INTO drizzle_migrations (hash, created_at)
VALUES ('0002_add_bill_engagement', NOW());
