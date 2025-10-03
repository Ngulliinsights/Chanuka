#!/bin/bash

# Chanuka Platform Deployment Script
set -e

echo "🚀 Starting Chanuka Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Please update .env file with your actual values before continuing."
        exit 1
    else
        print_error ".env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables
source .env

# Check required environment variables
required_vars=("DATABASE_URL" "JWT_SECRET" "SESSION_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set in .env file"
        exit 1
    fi
done

print_status "Environment variables validated ✓"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Docker and Docker Compose found ✓"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Run database migrations
print_status "Running database migrations..."
npm run db:migrate || print_warning "Database migration failed - continuing with deployment"

# Build the application
print_status "Building application..."
npm run build

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down

# Build and start containers
print_status "Building and starting Docker containers..."
docker-compose up -d --build

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Health check
print_status "Performing health check..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        print_status "Health check passed ✓"
        break
    else
        if [ $attempt -eq $max_attempts ]; then
            print_error "Health check failed after $max_attempts attempts"
            print_error "Check logs with: docker-compose logs app"
            exit 1
        fi
        print_status "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    fi
done

# Show container status
print_status "Container status:"
docker-compose ps

# Show logs
print_status "Recent application logs:"
docker-compose logs --tail=20 app

print_status "🎉 Deployment completed successfully!"
print_status "Application is running at: http://localhost:5000"
print_status ""
print_status "Useful commands:"
print_status "  View logs: docker-compose logs -f app"
print_status "  Stop services: docker-compose down"
print_status "  Restart services: docker-compose restart"
print_status "  View database: docker-compose exec postgres psql -U postgres -d chanuka"