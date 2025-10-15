-- Initial database schema setup

-- Create drizzle_migrations table to track migrations
CREATE TABLE IF NOT EXISTS drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create all tables from the schema

-- Users table
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "expertise" TEXT,
  "onboarding_completed" BOOLEAN DEFAULT false,
  "google_id" TEXT UNIQUE,
  "email" TEXT UNIQUE,
  "avatar_url" TEXT,
  "reputation" INTEGER DEFAULT 0,
  "last_active" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for users table
CREATE UNIQUE INDEX "username_idx" ON "users" ("username");
CREATE INDEX "email_idx" ON "users" ("email");
CREATE INDEX "last_active_idx" ON "users" ("last_active");
