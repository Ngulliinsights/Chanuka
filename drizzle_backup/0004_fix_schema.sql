
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  google_id VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT
);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  status VARCHAR(50) DEFAULT 'introduced',
  introduced_date DATE,
  last_action_date DATE,
  sponsor VARCHAR(255),
  content TEXT,
  bill_number VARCHAR(50),
  session VARCHAR(50),
  chamber VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  section VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_highlighted BOOLEAN DEFAULT FALSE
);

-- Create polls table (for the comment system)
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  section VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_votes INTEGER DEFAULT 0
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, user_id)
);

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS comment_votes (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_id)
);

-- Insert sample data
INSERT INTO bills (title, summary, status, introduced_date, sponsor, bill_number, session, chamber) VALUES 
('Kenya Finance Bill 2024', 'Comprehensive taxation and fiscal policy reform bill', 'rejected', '2024-05-09', 'Hon. Kuria Kimani', 'FB2024', '2024', 'National Assembly'),
('National Healthcare Reform Act of 2025', 'Healthcare system modernization and accessibility improvements', 'committee', '2025-03-15', 'Hon. James Mwangi', 'NHRA2025', '2025', 'National Assembly')
ON CONFLICT DO NOTHING;
