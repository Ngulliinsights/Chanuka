# Mock Data Generation - Quick Start Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Initialize Database

```bash
npm run db:init
npm run db:migrate
```

### Step 2: Generate Mock Data

```bash
npm run db:seed:comprehensive
```

This will generate:
- ✅ 100 users (citizens, experts, journalists, activists)
- ✅ 50 sponsors (MPs, Senators, Governors)
- ✅ 500 bills across 7 categories
- ✅ 2000+ comments with sentiment analysis

### Step 3: Validate Data

```bash
npm run db:seed:validate
```

### Step 4: Explore Data

```bash
npm run db:studio
```

Opens Drizzle Studio at http://localhost:4983

## 📊 What You Get

### Comprehensive Dataset

| Data Type | Count | Purpose |
|-----------|-------|---------|
| Bills | 500+ | Legislative content, NLP training |
| Users | 100 | Engagement patterns, credibility |
| Sponsors | 50 | Transparency analysis, conflicts |
| Comments | 2000+ | Sentiment analysis, argument mining |

### Kenyan Context

- ✅ All 47 counties represented
- ✅ Authentic Kenyan names and places
- ✅ Real political parties (Kenya Kwanza, Azimio, ODM, etc.)
- ✅ Proper legislative formatting
- ✅ Constitutional references

### Bill Categories

1. **Economy & Finance** (120 bills) - Tax, budget, investment, trade
2. **Environment & Climate** (100 bills) - Climate, conservation, sustainability
3. **Healthcare & Social** (80 bills) - Universal healthcare, social services
4. **Technology & Digital** (75 bills) - Digital economy, fintech, cybersecurity
5. **Education & Training** (50 bills) - Education reform, skills development
6. **Infrastructure** (50 bills) - Transport, energy, housing
7. **Governance & Law** (25 bills) - Electoral reform, accountability

## 🎯 Use Cases

### For MVP Demonstration

```bash
# Full reset with comprehensive data
npm run db:reset:force
npm run db:seed:comprehensive
npm run db:seed:validate
```

### For Development

```bash
# Quick setup with minimal data
npm run db:reset
npm run db:seed
```

### For NLP Training

```bash
# Generate comprehensive dataset
npm run db:seed:comprehensive

# Export for training (coming soon)
npm run db:export:nlp-training
```

## 📈 Data Quality

### Validation Checks

The validation script checks:
- ✅ Referential integrity (all foreign keys valid)
- ✅ Data distributions (varied categories, statuses)
- ✅ Completeness (no missing required fields)
- ✅ Quality metrics (uniqueness, realistic values)

### Expected Results

```
SEED DATA VALIDATION REPORT
================================================================================

Total Checks: 12
✅ Passed: 11
❌ Failed: 0
⚠️  Warnings: 1

Success Rate: 91.7%
```

## 🔧 Troubleshooting

### Database Connection Error

```bash
# Check database status
npm run db:health

# Reinitialize if needed
npm run db:init
```

### Seed Data Already Exists

```bash
# Clear and reseed
npm run db:reset:force
```

### Validation Failures

```bash
# View detailed validation report
npm run db:seed:validate

# Check database health
npm run db:health --detailed
```

## 📚 Documentation

- [Full Mock Data Strategy](./MOCK_DATA_STRATEGY.md)
- [AI Generation Prompts](./MOCK_DATA_GENERATION_PROMPTS.md)
- [Seed Scripts README](./scripts/seeds/README.md)
- [MVP Data Strategy](./docs/MVP%20Data%20Strategy%20for%20NLP%20Training.md)

## 🎓 Next Steps

### Phase 2 (Coming Soon)

- [ ] Constitutional analyses (200+)
- [ ] Advocacy campaigns (50+)
- [ ] Campaign actions and impact metrics

### Phase 3 (Planned)

- [ ] Arguments with claim-evidence structure (1000+)
- [ ] Search queries and patterns (500+)
- [ ] User engagement analytics

### Phase 4 (Future)

- [ ] Parliamentary process data
- [ ] Committee assignments
- [ ] Bill amendments and versions
- [ ] Voting records

## 💡 Tips

### Performance

- Comprehensive seed takes ~2-3 minutes
- Use simple seed for quick development
- Run validation after seeding

### Data Exploration

```bash
# View in Drizzle Studio
npm run db:studio

# Check database health
npm run db:health

# View detailed statistics
npm run db:seed:validate
```

### Customization

Edit `scripts/seeds/comprehensive-legislative-seed.ts` to:
- Adjust data volumes (CONFIG object)
- Modify bill templates
- Change distribution ratios
- Add custom data generators

## 🤝 Contributing

To add new data generators:

1. Add generator function to `comprehensive-legislative-seed.ts`
2. Call from main `seedComprehensive()` function
3. Add validation checks to `validate-seed-data.ts`
4. Update documentation

## 📞 Support

For issues or questions:
1. Check the [main README](./README.md)
2. Review [database setup guide](./scripts/database/README.md)
3. Open an issue on GitHub

---

**Status**: Phase 1 Complete ✅  
**Last Updated**: February 2026  
**Next Release**: Phase 2 (Constitutional Analyses & Campaigns)
