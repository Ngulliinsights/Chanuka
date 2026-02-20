# Day One Features - Integration Guide
**Quick setup guide for the new civic engagement features**

---

## 🚀 Quick Start

### 1. **Register the Action Prompts Route**

Add to `server/index.ts` or your main router file:

```typescript
import actionPromptsRouter from './features/bills/action-prompts-routes';

// Add this line with your other routes
app.use('/api/bills', actionPromptsRouter);
```

### 2. **Verify Argument Intelligence Routes**

Ensure these routes are registered (should already exist):

```typescript
import argumentIntelligenceRouter from './features/argument-intelligence/routes';

app.use('/api/argument-intelligence', argumentIntelligenceRouter);
```

### 3. **Install Dependencies** (if needed)

The features use existing dependencies, but verify you have:

```bash
# Client
npm install @tanstack/react-query lucide-react

# Server (should already be installed)
npm install drizzle-orm express
```

### 4. **Test the Features**

```bash
# Start the development server
npm run dev

# Navigate to any bill detail page
# You should see two new tabs: "Actions" and "Brief"
```

---

## 📋 Integration Checklist

### **Backend**
- [ ] Action prompts route registered (`/api/bills/:billId/action-prompts`)
- [ ] Argument intelligence routes working (`/api/argument-intelligence/*`)
- [ ] Database tables exist (bills, comments, arguments, bill_votes)
- [ ] Authentication middleware configured (for user context)

### **Frontend**
- [ ] New components imported in bill detail page
- [ ] React Query configured
- [ ] API service configured
- [ ] Tabs render correctly

### **Testing**
- [ ] Action prompts load for a bill
- [ ] Legislative brief displays
- [ ] Argument map renders
- [ ] Electoral pressure dashboard works

---

## 🔧 Configuration

### **Environment Variables**

No new environment variables needed! The features use existing configuration.

### **Database Migrations**

No new migrations needed! The features use existing tables:
- `bills`
- `comments`
- `arguments`
- `bill_votes`
- `sponsors`
- `user_profiles`

---

## 🐛 Troubleshooting

### **"Action prompts not loading"**

1. Check if route is registered:
   ```typescript
   app.use('/api/bills', actionPromptsRouter);
   ```

2. Verify bill has required fields:
   - `status`
   - `public_comment_deadline`
   - `next_hearing_date`

3. Check browser console for errors

### **"Legislative brief shows no data"**

1. Verify argument intelligence backend is running
2. Check if bill has comments:
   ```sql
   SELECT COUNT(*) FROM comments WHERE bill_id = 'your-bill-id';
   ```

3. Test the API directly:
   ```bash
   curl -X POST http://localhost:4200/api/argument-intelligence/generate-brief \
     -H "Content-Type: application/json" \
     -d '{"billId": "your-bill-id", "audience": "committee"}'
   ```

### **"Argument map not rendering"**

1. Check canvas element is in DOM
2. Verify API returns nodes:
   ```bash
   curl http://localhost:4200/api/argument-intelligence/argument-map/your-bill-id
   ```

3. Check browser console for canvas errors

### **"Electoral pressure shows no data"**

1. Verify bill has votes:
   ```sql
   SELECT COUNT(*) FROM bill_votes WHERE bill_id = 'your-bill-id';
   ```

2. Check sponsor has constituency:
   ```sql
   SELECT constituency FROM sponsors WHERE id = 'sponsor-id';
   ```

---

## 📊 API Endpoints Reference

### **Action Prompts**
```
GET /api/bills/:billId/action-prompts
```

**Response:**
```json
[
  {
    "action": "comment",
    "title": "Submit Your Comment",
    "description": "Public comment period closes in 3 days",
    "deadline": "2026-02-23T23:59:59Z",
    "urgency": "high",
    "estimatedTimeMinutes": 10,
    "steps": [
      {
        "step": 1,
        "instruction": "Read the bill summary",
        "link": "/bills/123",
        "estimatedTime": 5
      }
    ],
    "templates": {
      "comment": "Dear Committee Members..."
    }
  }
]
```

### **Legislative Brief**
```
POST /api/argument-intelligence/generate-brief
```

**Request:**
```json
{
  "billId": "123",
  "audience": "committee",
  "includeStatistics": true
}
```

**Response:**
```json
{
  "bill_id": "123",
  "bill_title": "Finance Bill 2026",
  "executive_summary": "...",
  "key_arguments": {
    "support": [...],
    "oppose": [...],
    "neutral": [...]
  },
  "citizen_statistics": {
    "total_comments": 1234,
    "total_participants": 567,
    "geographic_distribution": {...}
  }
}
```

### **Argument Map**
```
GET /api/argument-intelligence/argument-map/:billId
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "arg-1",
      "text": "This bill will increase taxes",
      "position": "oppose",
      "strength": 0.85,
      "endorsements": 234
    }
  ]
}
```

---

## 🎨 Customization

### **Change Action Prompt Colors**

Edit `client/src/features/bills/ui/action-prompts/ActionPromptCard.tsx`:

```typescript
const getUrgencyStyles = () => {
  switch (prompt.urgency) {
    case 'critical':
      return 'bg-red-50 border-red-300 text-red-900'; // Change these
    // ...
  }
};
```

### **Modify Action Templates**

Edit `server/features/notifications/action-prompt-generator.ts`:

```typescript
private generateCommentTemplate(bill: Bill): string {
  return `Your custom template here...`;
}
```

### **Add New Action Types**

1. Add to action type enum:
   ```typescript
   action: 'comment' | 'vote' | 'attend_hearing' | 'contact_mp' | 'share' | 'your_new_action';
   ```

2. Add generator method:
   ```typescript
   private generateYourNewActionPrompt(bill: Bill): ActionPrompt {
     // Implementation
   }
   ```

3. Add to `generatePrompts()` method

---

## 📈 Monitoring

### **Track Feature Usage**

Add analytics to key actions:

```typescript
// In ActionPromptCard.tsx
const handleActionStart = () => {
  analytics.track('action_prompt_started', {
    billId: prompt.billId,
    action: prompt.action,
    urgency: prompt.urgency,
  });
};
```

### **Monitor API Performance**

```typescript
// In action-prompts-routes.ts
const startTime = Date.now();
// ... generate prompts
const duration = Date.now() - startTime;
logger.info('Action prompts generated', { billId, duration });
```

---

## 🚀 Deployment

### **Production Checklist**

- [ ] All routes registered
- [ ] Environment variables set
- [ ] Database indexes created
- [ ] Error handling tested
- [ ] Loading states work
- [ ] Mobile responsive
- [ ] Analytics configured
- [ ] Performance optimized

### **Performance Tips**

1. **Cache action prompts** (they don't change often):
   ```typescript
   const { data } = useQuery({
     queryKey: ['action-prompts', billId],
     queryFn: fetchActionPrompts,
     staleTime: 5 * 60 * 1000, // 5 minutes
   });
   ```

2. **Lazy load argument map** (canvas is heavy):
   ```typescript
   const ArgumentMap = lazy(() => import('./ArgumentMap'));
   ```

3. **Paginate legislative brief** (for bills with many arguments)

---

## 📞 Support

If you encounter issues:

1. Check this guide first
2. Review the implementation document: `DAY_ONE_FEATURES_IMPLEMENTED.md`
3. Check the audit: `CIVIC_TECH_FEATURE_AUDIT.md`
4. Review the roadmap: `CIVIC_TECH_ROADMAP.md`

---

## ✅ Success Criteria

You'll know the integration is successful when:

1. ✅ Bill detail page shows "Actions" and "Brief" tabs
2. ✅ Action prompts load with correct deadlines
3. ✅ Legislative brief displays aggregated arguments
4. ✅ Argument map renders interactive visualization
5. ✅ Electoral pressure dashboard shows MP accountability
6. ✅ No console errors
7. ✅ Mobile responsive
8. ✅ Fast load times (< 2 seconds)

---

**You're ready to launch! 🚀**
