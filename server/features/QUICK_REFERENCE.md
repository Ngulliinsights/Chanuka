# Quick Reference: Analysis vs Analytics

## One-Line Summary

- **`analysis/`** = What does this bill mean? (Deep analysis of individual bills)
- **`analytics/`** = How is the platform doing? (Metrics and trends across platform)

---

## Quick Decision Tree

```
Need to...
│
├─ Analyze a specific bill?
│  └─► Use ANALYSIS feature
│     └─► /api/analysis/bills/:id/comprehensive
│
└─ Track platform metrics?
   └─► Use ANALYTICS feature
      └─► /api/analytics/engagement/metrics
```

---

## Import Cheat Sheet

```typescript
// Bill Analysis (specific bill)
import { analysisApplicationService } from '@server/features/analysis';
const result = await analysisApplicationService.analyzeBill({ bill_id: '123' });

// Platform Analytics (aggregate metrics)
import { engagementAnalyticsService } from '@server/features/analytics';
const metrics = await engagementAnalyticsService.getEngagementMetrics({ ... });
```

---

## API Endpoints

### Analysis (Bill-Specific)
```
GET  /api/analysis/bills/:bill_id/comprehensive
POST /api/analysis/bills/:bill_id/comprehensive/run
GET  /api/analysis/bills/:bill_id/history
```

### Analytics (Platform-Wide)
```
GET  /api/analytics/engagement/metrics
GET  /api/analytics/engagement/trends
GET  /api/analytics/dashboard
```

---

## What Each Feature Does

### Analysis Feature
✅ Constitutional compliance check  
✅ Stakeholder impact assessment  
✅ Transparency scoring  
✅ Public interest calculation  
✅ Bill-specific recommendations  

### Analytics Feature
✅ User engagement tracking  
✅ Platform metrics dashboard  
✅ Trending bills detection  
✅ Financial disclosure monitoring  
✅ Conflict of interest detection  

---

## When to Use Which

| Scenario | Use |
|----------|-----|
| User viewing bill details | Analysis |
| Admin viewing dashboard | Analytics |
| Checking constitutional issues | Analysis |
| Tracking user engagement | Analytics |
| Identifying stakeholders | Analysis |
| Monitoring platform health | Analytics |
| Calculating transparency | Analysis |
| Detecting trending bills | Analytics |

---

## Common Confusion

### "Stakeholder Analysis" exists in both!

**Analysis Feature:**
- Who is affected by THIS bill?
- Beneficiaries and losers
- Economic/social impact

**Analytics Feature:**
- Who has conflicts of interest?
- Financial disclosure monitoring
- Platform-wide conflict detection

### "ML Analysis" exists in both!

**Analysis Feature:**
- ML for stakeholder detection in bill text
- Part of bill analysis pipeline

**Analytics Feature:**
- ML for platform predictions
- Trend forecasting
- Engagement prediction

---

## File Locations

```
server/features/
├── analysis/              ← Bill analysis
│   ├── application/
│   │   ├── constitutional-analysis.service.ts
│   │   ├── stakeholder-analysis.service.ts
│   │   └── bill-comprehensive-analysis.service.ts
│   └── analysis.routes.ts
│
└── analytics/             ← Platform analytics
    ├── services/
    │   ├── engagement.service.ts
    │   └── ml.service.ts
    └── application/
        └── analytics.routes.ts
```

---

## Remember

**Analysis** = Microscope 🔬 (zoom into one bill)  
**Analytics** = Telescope 🔭 (view entire platform)

---

For detailed explanation, see:
- `ANALYTICS_VS_ANALYSIS.md` - Full comparison
- `FEATURE_RELATIONSHIP_MAP.md` - Visual diagrams

