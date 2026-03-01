# 🚀 Quick Start Guide

## Get Your MVP Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or use the Neon DB from .env)
- npm or pnpm installed

### Step 1: Clone & Install
```bash
# Install dependencies
npm install
```

### Step 2: Configure Environment
```bash
# .env file should already exist with database connection
# Verify it has these key values:
PORT=4200
DATABASE_URL=postgresql://...
VITE_API_BASE_URL=http://localhost:4200/api
```

### Step 3: Setup Database
```bash
# Run migrations
npm run db:migrate

# Optional: Add sample data
npm run db:seed:comprehensive
```

### Step 4: Start Application
```bash
# Start both server and client
npm run dev
```

**That's it!** 🎉

- Server: http://localhost:4200
- Client: http://localhost:5173
- API: http://localhost:4200/api

### Step 5: Test It Works
```bash
# In a new terminal
npm run test:mvp
```

## What You Can Do Now

### 1. Browse Bills
Visit: http://localhost:5173/bills
- See list of legislative bills
- Filter by category and status
- Search bills

### 2. View Bill Details
Click any bill to see:
- Full bill text and summary
- Sponsors and co-sponsors
- Community comments
- Analysis (if available)

### 3. Community Engagement
- Add comments to bills
- Vote on comments
- Track bills you care about

### 4. Search
Visit: http://localhost:5173/search
- Full-text search across all bills
- Advanced filters

### 5. User Account
Visit: http://localhost:5173/account
- View your profile
- See tracked bills
- Manage notification preferences

## Quick Commands

```bash
# Development
npm run dev              # Start both client & server
npm run dev:server       # Server only (port 4200)
npm run dev:client       # Client only (port 5173)

# Database
npm run db:health        # Check database connection
npm run db:migrate       # Run migrations
npm run db:reset:force   # Reset database (careful!)
npm run db:seed          # Add sample data

# Testing
npm run test:mvp         # Test API integration
npm run test             # Run all tests

# Type Checking
npm run type-check       # Check TypeScript types
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 4200 (server)
# Windows
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:4200 | xargs kill -9
```

### Database Connection Failed
```bash
# Check connection
npm run db:health

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### API Calls Failing
```bash
# Verify server is running
curl http://localhost:4200/api/frontend-health

# Check client API config
cat .env | grep VITE_API_BASE_URL
```

## Project Structure

```
chanuka-platform/
├── client/              # React frontend
│   ├── src/
│   │   ├── features/    # Feature modules (bills, community, etc.)
│   │   ├── infrastructure/  # Core services (API, auth, etc.)
│   │   └── lib/         # Shared utilities
│   └── ...
├── server/              # Express backend
│   ├── features/        # Feature modules
│   ├── infrastructure/  # Core services (database, cache, etc.)
│   └── index.ts         # Server entry point
├── shared/              # Shared types and utilities
├── scripts/             # Utility scripts
└── docs/                # Documentation
```

## What's Working

✅ **Core Features**
- Bills browsing and search
- Bill details with full information
- Community comments and voting
- User authentication and profiles
- Notifications system
- Search functionality

✅ **Infrastructure**
- PostgreSQL database with migrations
- Redis caching (or memory fallback)
- Structured logging
- Error handling
- Security middleware
- Input validation

⚠️ **Needs UI Work**
- Pretext detection display
- Constitutional analysis display
- Argument intelligence visualization
- Real-time WebSocket notifications
- Personalized recommendations

## Next Steps

1. **Verify Everything Works**
   ```bash
   npm run test:mvp
   ```

2. **Explore the Application**
   - Browse bills at http://localhost:5173/bills
   - Try searching
   - Create an account
   - Add comments

3. **Complete Intelligence Features**
   - See `MVP_INTEGRATION_SUMMARY.md` for detailed tasks
   - Focus on UI components for analysis features

4. **Read Full Documentation**
   - `MVP_INTEGRATION_SUMMARY.md` - Complete overview
   - `docs/MVP_INTEGRATION_GUIDE.md` - Detailed guide
   - `MVP_INTEGRATION_PLAN.md` - 4-week roadmap

## Need Help?

1. Check logs:
   ```bash
   # Server logs (in terminal running dev:server)
   # Client logs (browser console F12)
   ```

2. Run diagnostics:
   ```bash
   npm run db:health
   npm run test:mvp
   ```

3. Review documentation:
   - `MVP_INTEGRATION_SUMMARY.md`
   - `docs/MVP_INTEGRATION_GUIDE.md`

---

**You're all set!** 🎉 Your MVP is ready to use. The core features are fully functional. Focus on completing the intelligence feature UIs to unlock the platform's full potential.
