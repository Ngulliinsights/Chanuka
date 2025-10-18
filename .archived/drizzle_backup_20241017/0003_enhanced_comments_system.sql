
-- Migration to enhance comment system with voting and polls

-- Add new columns to bill_comments table
ALTER TABLE "bill_comments" 
ADD COLUMN IF NOT EXISTS "upvotes" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "downvotes" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "poll_data" JSONB,
ADD COLUMN IF NOT EXISTS "section" TEXT;

-- Create comment_votes table for tracking user votes
CREATE TABLE IF NOT EXISTS "comment_votes" (
    "id" SERIAL PRIMARY KEY,
    "comment_id" INTEGER NOT NULL REFERENCES "bill_comments" ("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "vote_type" VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE("comment_id", "user_id")
);

-- Create poll_votes table for tracking poll votes
CREATE TABLE IF NOT EXISTS "poll_votes" (
    "id" SERIAL PRIMARY KEY,
    "comment_id" INTEGER NOT NULL REFERENCES "bill_comments" ("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "option_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE("comment_id", "user_id")
);

-- Create implementation_workarounds table
CREATE TABLE IF NOT EXISTS "implementation_workarounds" (
    "id" SERIAL PRIMARY KEY,
    "bill_id" INTEGER NOT NULL REFERENCES "bills" ("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    "status" VARCHAR(20) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'under_review', 'approved', 'implemented', 'rejected')),
    "upvotes" INTEGER DEFAULT 0,
    "downvotes" INTEGER DEFAULT 0,
    "implementation_cost" DECIMAL(15, 2),
    "timeline_estimate" INTEGER, -- in days
    "stakeholder_support" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "comment_votes_comment_idx" ON "comment_votes" ("comment_id");
CREATE INDEX IF NOT EXISTS "comment_votes_user_idx" ON "comment_votes" ("user_id");
CREATE INDEX IF NOT EXISTS "poll_votes_comment_idx" ON "poll_votes" ("comment_id");
CREATE INDEX IF NOT EXISTS "poll_votes_user_idx" ON "poll_votes" ("user_id");
CREATE INDEX IF NOT EXISTS "bill_comments_section_idx" ON "bill_comments" ("section");
CREATE INDEX IF NOT EXISTS "implementation_workarounds_bill_idx" ON "implementation_workarounds" ("bill_id");
CREATE INDEX IF NOT EXISTS "implementation_workarounds_status_idx" ON "implementation_workarounds" ("status");

-- Create trigger to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'up' THEN
            UPDATE bill_comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
        ELSIF NEW.vote_type = 'down' THEN
            UPDATE bill_comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote type changes
        IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
            UPDATE bill_comments SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.comment_id;
        ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
            UPDATE bill_comments SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'up' THEN
            UPDATE bill_comments SET upvotes = upvotes - 1 WHERE id = OLD.comment_id;
        ELSIF OLD.vote_type = 'down' THEN
            UPDATE bill_comments SET downvotes = downvotes - 1 WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS comment_vote_trigger ON comment_votes;
CREATE TRIGGER comment_vote_trigger
    AFTER INSERT OR UPDATE OR DELETE ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_comment_vote_counts();

-- Update updated_at timestamp trigger for implementation_workarounds
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_implementation_workarounds_updated_at ON implementation_workarounds;
CREATE TRIGGER update_implementation_workarounds_updated_at
    BEFORE UPDATE ON implementation_workarounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample implementation workarounds for testing
INSERT INTO implementation_workarounds (bill_id, user_id, title, description, category, priority, upvotes, stakeholder_support) VALUES
(1, 1, 'Phased Implementation for Small Businesses', 'Implement a 6-month grace period for businesses with less than 10 employees to comply with new regulations', 'Compliance', 'high', 15, '{"small_business_association": "strong", "labor_unions": "neutral", "government": "considering"}'),
(1, 2, 'Digital Infrastructure Development', 'Establish digital infrastructure support before full implementation to ensure smooth transition', 'Infrastructure', 'critical', 23, '{"tech_companies": "strong", "rural_communities": "strong", "telecom_providers": "strong"}'),
(2, 3, 'Data Protection Training Program', 'Create comprehensive training programs for organizations before data protection laws take effect', 'Training', 'medium', 8, '{"educational_institutions": "strong", "private_sector": "moderate", "civil_society": "strong"}');

-- Record migration
INSERT INTO drizzle_migrations (hash, created_at) VALUES ('0003_enhanced_comments_system', NOW()) ON CONFLICT DO NOTHING;
