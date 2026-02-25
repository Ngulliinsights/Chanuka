# Mock Data Quick Start Guide

## 🎯 Goal
Generate comprehensive mock data for Chanuka platform MVP demo and NLP training.

## 📋 What You Have
- ✅ Database: 143 tables, 51 enums (ready)
- ✅ Seed infrastructure: `scripts/seeds/` (ready)
- ✅ Demo service: `server/infrastructure/demo-data.ts` (ready)
- ✅ Basic data: 5 bills, 5 users, 5 sponsors (minimal)

## 📊 What You Need

| Data Type | Current | Target | Purpose |
|-----------|---------|--------|---------|
| Bills | 5 | 500 | NLP training, search, demo |
| Users | 5 | 100 | Engagement patterns |
| Comments | 10 | 2000 | Sentiment analysis |
| Sponsors | 5 | 50 | Transparency analysis |
| Constitutional Analyses | 0 | 200 | AI training |
| Campaigns | 0 | 50 | Advocacy demo |
| Arguments | 0 | 1000 | Argument intelligence |

## 🚀 Quick Start (3 Steps)

### Step 1: Generate Data with AI (1-2 days)

Use the 8 prompts in `MOCK_DATA_GENERATION_PROMPTS.md`:

```bash
# 1. Copy prompt from MOCK_DATA_GENERATION_PROMPTS.md
# 2. Paste into Claude/GPT-4
# 3. Save output as JSON files in data/generated/

# Example:
data/generated/
├── bills.json          # 500 bills
├── users.json          # 100 users
├── comments.json       # 2000 comments
├── sponsors.json       # 50 sponsors
├── analyses.json       # 200 constitutional analyses
├── campaigns.json      # 50 campaigns
├── arguments.json      # 1000 arguments
└── queries.json        # 500 search queries
```

### Step 2: Create Seed Scripts (1 day)

Create comprehensive seed script:

```typescript
// scripts/seeds/comprehensive-seed.ts
import * as fs from 'fs';
import { database as db } from '@server/infrastructure/database/connection';

export default async function seedComprehensive() {
  console.log('🌱 Starting comprehensive seed...');
  
  // 1. Load generated data
  const bills = JSON.parse(fs.readFileSync('data/generated/bills.json', 'utf8'));
  const users = JSON.parse(fs.readFileSync('data/generated/users.json', 'utf8'));
  const comments = JSON.parse(fs.readFileSync('data/generated/comments.json', 'utf8'));
  // ... load other files
  
  // 2. Insert in correct order (respecting foreign keys)
  await insertUsers(users);
  await insertSponsors(sponsors);
  await insertBills(bills);
  await insertComments(comments);
  await insertAnalyses(analyses);
  await insertCampaigns(campaigns);
  await insertArguments(arguments);
  
  console.log('✅ Comprehensive seed complete!');
}
```

### Step 3: Run & Verify (1 hour)

```bash
# Run comprehensive seed
npm run db:seed:comprehensive

# Verify data
npx tsx scripts/check-db-status.ts

# Should show:
# ✓ 143 tables
# ✓ 500+ bills
# ✓ 100+ users
# ✓ 2000+ comments
# etc.
```

## 📝 AI Prompt Cheat Sheet

### Quick Prompts (Copy-Paste Ready)

**1. Bills (500)**
```
Generate 500 realistic Kenyan legislative bills in JSON format.
Include: title, bill_number, description, content (full text with ARRANGEMENT OF CLAUSES), 
summary, status, category, tags, complexity_score, dates.
Categories: Technology (75), Environment (100), Healthcare (80), Economy (120), 
Education (50), Infrastructure (50), Governance (25).
Use authentic Kenyan legislative language and reference Kenya Constitution 2010.
```

**2. Users (100)**
```
Generate 100 diverse Kenyan user profiles in JSON format.
Types: Citizens (60), Experts (20), Journalists (10), Activists (10).
Include: username, email, bio, expertise, location (county), organization, 
reputation_score, verification_status.
Represent all 47 Kenyan counties.
```

**3. Comments (2000)**
```
Generate 2000 realistic comments on Kenyan bills in JSON format.
Types: General (40%), Support (25%), Concern (20%), Opposition (10%), Questions (5%).
Sentiment: Positive (35%), Neutral (40%), Negative (25%).
Include: content (50-500 words), bill_id, user_id, upvotes, downvotes, sentiment.
Use mix of formal English, casual English, and Swahili/English.
```

**4. Constitutional Analyses (200)**
```
Generate 200 constitutional analyses for Kenyan bills in JSON format.
Include: bill_id, alignment_score (0-100), violations (with severity, type, 
affected_articles, recommendations), legal_precedents (with case names, relevance).
Reference Kenya Constitution 2010 articles.
Severity distribution: Low (60%), Medium (30%), High (8%), Critical (2%).
```

**5. Campaigns (50)**
```
Generate 50 advocacy campaigns for Kenyan bills in JSON format.
Types: Amendment (40%), Awareness (30%), Opposition (20%), Support (10%).
Include: title, description, bill_id, goals, timeline, participant_count, 
actions (5-20 per campaign), impact_metrics.
Status: draft (10%), active (60%), completed (20%), paused (10%).
```

## 🔍 Validation Checklist

After seeding, verify:

```bash
# 1. Check counts
SELECT 
  (SELECT COUNT(*) FROM bills) as bills,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM comments) as comments,
  (SELECT COUNT(*) FROM sponsors) as sponsors;

# Should return: 500, 100, 2000, 50

# 2. Check referential integrity
SELECT COUNT(*) FROM comments c 
LEFT JOIN bills b ON c.bill_id = b.id 
WHERE b.id IS NULL;

# Should return: 0 (no orphaned comments)

# 3. Check data quality
SELECT 
  category, 
  COUNT(*) as count,
  AVG(complexity_score) as avg_complexity
FROM bills 
GROUP BY category;

# Should show balanced distribution
```

## 🎨 Demo Mode Setup

Enable demo mode for MVP:

```typescript
// .env
DEMO_MODE=true

// Or in code:
import { demoDataService } from '@server/infrastructure/demo-data';
demoDataService.setDemoMode(true);
```

## 📚 Documentation Reference

- **Full Strategy**: `MOCK_DATA_STRATEGY.md`
- **AI Prompts**: `MOCK_DATA_GENERATION_PROMPTS.md`
- **Database Status**: `DATABASE_CONSISTENCY_VERIFIED.md`

## ⚡ Pro Tips

1. **Start Small**: Generate 50 bills first, test, then scale to 500
2. **Validate Early**: Check referential integrity after each data type
3. **Use Transactions**: Wrap inserts in transactions for rollback capability
4. **Cache Results**: Save generated JSON files for reuse
5. **Version Data**: Tag data versions (v1.0, v1.1) for tracking

## 🐛 Troubleshooting

**Problem**: Foreign key violations
**Solution**: Insert in correct order (users → sponsors → bills → comments)

**Problem**: Duplicate data
**Solution**: Clear tables before seeding or use UPSERT

**Problem**: Slow inserts
**Solution**: Use batch inserts (100-500 records at a time)

**Problem**: Out of memory
**Solution**: Process data in chunks, don't load all at once

## 📞 Need Help?

- Check `MOCK_DATA_STRATEGY.md` for detailed strategy
- Review `MOCK_DATA_GENERATION_PROMPTS.md` for prompt details
- Run `npx tsx scripts/check-db-status.ts` to verify database

---

**Estimated Time**: 2-3 days total
**Difficulty**: Medium
**Prerequisites**: Database setup complete, AI access (Claude/GPT-4)
