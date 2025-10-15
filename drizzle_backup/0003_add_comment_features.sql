
-- Add new columns to comments table for enhanced functionality
ALTER TABLE comments 
ADD COLUMN parent_id INTEGER REFERENCES comments(id),
ADD COLUMN section TEXT,
ADD COLUMN upvotes INTEGER DEFAULT 0,
ADD COLUMN downvotes INTEGER DEFAULT 0,
ADD COLUMN is_highlighted BOOLEAN DEFAULT FALSE;

-- Create index for better performance on parent_id lookups
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Create index for bill_id and section combination
CREATE INDEX idx_comments_bill_section ON comments(bill_id, section);
