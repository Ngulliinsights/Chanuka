# PostgreSQL Setup Script for Windows
Write-Host "🐘 Setting up PostgreSQL for Chanuka Platform..." -ForegroundColor Green

# Check if PostgreSQL is already installed
$pgPath = Get-Command psql -ErrorAction SilentlyContinue
if ($pgPath) {
    Write-Host "✅ PostgreSQL is already installed at: $($pgPath.Source)" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Or use Chocolatey: choco install postgresql" -ForegroundColor Yellow
    exit 1
}

# Check if PostgreSQL service is running
$service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "✅ PostgreSQL service is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Starting PostgreSQL service..." -ForegroundColor Yellow
    try {
        Start-Service -Name "postgresql*"
        Write-Host "✅ PostgreSQL service started" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start PostgreSQL service. Please start it manually." -ForegroundColor Red
        exit 1
    }
}

# Test database connection
Write-Host "🔍 Testing database connection..." -ForegroundColor Blue
try {
    $env:PGPASSWORD = "postgres"
    $result = psql -U postgres -d postgres -c "SELECT version();" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database connection successful" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ Database connection failed. Please check your PostgreSQL installation." -ForegroundColor Red
    Write-Host "Default credentials: username=postgres, password=postgres" -ForegroundColor Yellow
    exit 1
}

# Create the chanuka database
Write-Host "🏗️  Creating chanuka database..." -ForegroundColor Blue
try {
    $env:PGPASSWORD = "postgres"
    psql -U postgres -c "CREATE DATABASE chanuka;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database 'chanuka' created successfully" -ForegroundColor Green
    } else {
        # Database might already exist
        psql -U postgres -c "\l" | Select-String "chanuka" >$null
        if ($?) {
            Write-Host "✅ Database 'chanuka' already exists" -ForegroundColor Green
        } else {
            throw "Failed to create database"
        }
    }
} catch {
    Write-Host "❌ Failed to create database. Please create it manually:" -ForegroundColor Red
    Write-Host "psql -U postgres -c 'CREATE DATABASE chanuka;'" -ForegroundColor Yellow
}

Write-Host "🎉 PostgreSQL setup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run db:migrate" -ForegroundColor White
Write-Host "2. Run: npm run db:seed" -ForegroundColor White