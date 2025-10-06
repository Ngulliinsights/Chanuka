# 🗄️ Chanuka Platform Database Setup Guide

## Prerequisites
- PostgreSQL 17.4 (✅ Already installed)
- Node.js and npm (✅ Already available)

## Step 1: Create Database Manually

### Option A: Using psql Command Line
```bash
# Connect to PostgreSQL (you'll be prompted for password)
psql -U postgres

# Once connected, run these commands:
CREATE DATABASE chanuka;
GRANT ALL PRIVILEGES ON DATABASE chanuka TO postgres;
\q
```

### Option B: Using pgAdmin (if you have it installed)
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name: `chanuka`
5. Owner: `postgres`
6. Click "Save"

## Step 2: Update Environment Variables

Replace `YOUR_ACTUAL_PASSWORD` in your `.env` file with your actual PostgreSQL password:

```env
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/chanuka
DB_PASSWORD=YOUR_ACTUAL_PASSWORD
```

## Step 3: Run Database Migrations

Once you've created the database and updated the `.env` file, run:

```bash
# Run migrations to create all tables
npm run db:migrate
```

## Step 4: Seed the Database with Sample Data

```bash
# Load comprehensive sample data
npm run db:seed
```

## Step 5: Verify Setup

```bash
# Start the development server
npm run dev
```

Then visit: http://localhost:5000

## 🔧 Troubleshooting

### Common Issues:

1. **Password Authentication Failed**
   - Make sure you're using the correct PostgreSQL password
   - Update both `DATABASE_URL` and `DB_PASSWORD` in `.env`

2. **Database Already Exists**
   - If you see "database already exists" error, that's fine - just continue with migrations

3. **Connection Refused**
   - Make sure PostgreSQL service is running
   - Windows: Check Services → PostgreSQL
   - Check if port 5432 is available

4. **Migration Errors**
   - If migrations fail, you can run them individually from the `drizzle/` folder

### Manual Migration (if npm script fails):
```bash
# Connect to your database
psql -U postgres -d chanuka

# Run each migration file manually:
\i drizzle/0000_initial_migration.sql
\i drizzle/0001_comprehensive_schema.sql
# ... continue with other files in order
```

## 🎯 What You'll Get After Setup

### Sample Data Includes:
- **5 Users**: Admin, Expert, Citizens, Advocate, Journalist
- **5 Sponsors**: Kenyan MPs with realistic profiles and conflict data
- **5 Bills**: Comprehensive legislation covering various sectors
- **Sponsor Affiliations**: Realistic organizational connections
- **Transparency Records**: Financial disclosures and conflict data
- **Bill Sponsorships**: Linking sponsors to bills they support
- **Comments & Engagement**: Sample community interactions

### Advanced Conflict Analysis Features:
- **Automated Conflict Detection**: Financial, organizational, timing conflicts
- **Visual Network Mapping**: Interactive relationship diagrams
- **Severity Scoring**: 4-level risk assessment system
- **Trend Analysis**: Historical conflict pattern tracking
- **Predictive Analytics**: AI-powered future conflict predictions

## 🚀 Testing the Conflict Analysis

Once setup is complete, you can test the new conflict analysis features:

1. **Dashboard**: Visit `/api/sponsor-conflict-analysis/dashboard`
2. **Detect Conflicts**: Visit `/api/sponsor-conflict-analysis/detect`
3. **Network Mapping**: Visit `/api/sponsor-conflict-analysis/mapping`
4. **Trends**: Visit `/api/sponsor-conflict-analysis/trends`

## 📊 Expected Results

After successful setup, you should see:
- Multiple conflict types detected (financial, organizational, timing)
- Network visualization showing sponsor-organization relationships
- Risk scores and severity levels for different sponsors
- Trend analysis showing conflict patterns over time

## 🆘 Need Help?

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your PostgreSQL service is running
3. Confirm your database credentials are correct
4. Try running migrations manually if the npm script fails

---

**Next Steps**: Once database setup is complete, you can explore the advanced sponsor conflict analysis features that were just implemented!