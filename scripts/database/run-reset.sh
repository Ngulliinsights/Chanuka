#!/bin/bash

# Database Reset Runner Script
# Safely resets the database with proper error handling

set -e  # Exit on any error

echo "🔄 Chanuka Platform Database Reset"
echo "=================================="

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  No .env file found in current directory"
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please ensure DATABASE_URL is set in your .env file"
    echo "Current working directory: $(pwd)"
    echo "Looking for .env file at: $(pwd)/.env"
    if [ -f ".env" ]; then
        echo "✅ .env file exists"
        echo "🔍 Checking .env content for DATABASE_URL..."
        if grep -q "DATABASE_URL" .env; then
            echo "✅ DATABASE_URL found in .env file"
            echo "❌ But it's not being loaded properly"
        else
            echo "❌ DATABASE_URL not found in .env file"
        fi
    else
        echo "❌ .env file does not exist"
    fi
    exit 1
fi

echo "✅ DATABASE_URL loaded successfully"

# Confirm reset
echo "⚠️  WARNING: This will completely reset your database!"
echo "All existing data will be lost."
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Database reset cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting database reset process..."

# Step 1: Run the reset script
echo "📋 Step 1: Running database reset..."
if npx tsx scripts/database/reset-database.ts; then
    echo "✅ Database reset completed"
else
    echo "❌ Database reset failed"
    exit 1
fi

# Step 2: Run health check
echo ""
echo "📋 Step 2: Running health check..."
if npx tsx scripts/database/health-check.ts; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check found issues - please review above"
fi

echo ""
echo "🎉 Database reset process completed!"
echo ""
echo "Next steps:"
echo "1. Start your server: npm run dev"
echo "2. The application should now work without database errors"
echo "3. You can create a new user account to test functionality"