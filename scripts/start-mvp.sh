#!/bin/bash

# MVP Quick Start Script
# This script sets up and starts the Chanuka platform MVP

set -e  # Exit on error

echo "🚀 Starting Chanuka Platform MVP"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env with your configuration${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Check database connection
echo -e "${YELLOW}🔍 Checking database connection...${NC}"
if npm run db:health --silent; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your DATABASE_URL in .env"
    exit 1
fi

# Run migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
if npm run db:migrate --silent; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migrations failed${NC}"
    exit 1
fi

# Optional: Seed database
read -p "Do you want to seed the database with sample data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🌱 Seeding database...${NC}"
    npm run db:seed:comprehensive
    echo -e "${GREEN}✅ Database seeded${NC}"
fi

# Start the application
echo ""
echo -e "${GREEN}🎉 Setup complete! Starting application...${NC}"
echo ""
echo "Server will start on: http://localhost:4200"
echo "Client will start on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start both client and server
npm run dev
