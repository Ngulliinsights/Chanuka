# MVP Quick Start Script (PowerShell)
# This script sets up and starts the Chanuka platform MVP

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Chanuka Platform MVP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please update .env with your configuration" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check database connection
Write-Host "🔍 Checking database connection..." -ForegroundColor Yellow
try {
    npm run db:health --silent
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Database connection failed" -ForegroundColor Red
    Write-Host "Please check your DATABASE_URL in .env" -ForegroundColor Yellow
    exit 1
}

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
try {
    npm run db:migrate --silent
    Write-Host "✅ Migrations completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Migrations failed" -ForegroundColor Red
    exit 1
}

# Optional: Seed database
$seed = Read-Host "Do you want to seed the database with sample data? (y/N)"
if ($seed -eq "y" -or $seed -eq "Y") {
    Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
    npm run db:seed:comprehensive
    Write-Host "✅ Database seeded" -ForegroundColor Green
}

# Start the application
Write-Host ""
Write-Host "🎉 Setup complete! Starting application..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will start on: http://localhost:4200" -ForegroundColor Cyan
Write-Host "Client will start on: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start both client and server
npm run dev
