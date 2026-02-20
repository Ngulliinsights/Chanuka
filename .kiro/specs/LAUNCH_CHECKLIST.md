# Day One Launch Checklist
**Everything you need to launch the civic engagement features**

---

## ✅ Pre-Launch Checklist

### **Backend Setup**

- [ ] **Register Action Prompts Route**
  ```typescript
  // In server/index.ts or main router
  import actionPromptsRouter from './features/bills/action-prompts-routes';
  app.use('/api/bills', actionPromptsRouter);
  ```

- [ ] **Verify Argument Intelligence Routes**
  ```typescript
  // Should already exist
  import argumentIntelligenceRouter from './features/argument-intelligence/routes';
  app.use('/api/argument-intelligence', argumentIntelligenceRouter);
  ```

- [ ] **Test API Endpoints**
  ```bash
  # Action prompts
  curl http://localhost:4200/api/bills/[bill-id]/action-prompts
  
  # Legislative brief
  curl -X POST http://localhost:4200/api/argument-intelligence/generate-brief \
    -H "Content-Type: application/json" \
    -d '{"billId": "[bill-id]", "audience": "committee"}'
  
  # Argument map
  curl http://localhost:4200/api/argument-intelligence/argument-map/[bill-id]
  ```

- [ ] **Verify Database Tables**
  ```sql
  -- Check tables exist
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('bills', 'comments', 'arguments', 'bill_votes', 'sponsors');
  ```

- [ ] **Check Sample Data**
  ```sql
  -- Verify you have test data
  SELECT COUNT(*) FROM bills;
  SELECT COUNT(*) FROM comments;
  SELECT COUNT(*) FROM arguments;
  SELECT COUNT(*) FROM bill_votes;
  ```

---

### **Frontend Setup**

- [ ] **Verify Dependencies**
  ```bash
  npm list @tanstack/react-query
  npm list lucide-react
  ```

- [ ] **Check Imports in Bill Detail Page**
  ```typescript
  // In client/src/features/bills/pages/bill-detail.tsx
  import { BriefViewer } from '@client/features/bills/ui/legislative-brief';
  import { ActionPromptCard } from '@client/features/bills/ui/action-prompts';
  ```

- [ ] **Verify API Service**
  ```typescript
  // Check client/src/services/apiService.ts exists and is configured
  import { api } from '@/services/apiService';
  ```

- [ ] **Test React Query Setup**
  ```typescript
  // Verify QueryClientProvider wraps your app
  // In client/src/main.tsx or App.tsx
  ```

---

### **Integration Testing**

- [ ] **Test Legislative Brief Viewer**
  1. Navigate to any bill detail page
  2. Click "Brief" tab
  3. Verify brief loads
  4. Test filtering by position
  5. Test sorting by strength/endorsements
  6. Check statistics display correctly

- [ ] **Test Action Prompts**
  1. Navigate to any bill detail page
  2. Click "Actions" tab
  3. Verify prompts load
  4. Expand a prompt
  5. Check steps display
  6. Test template copy
  7. Mark steps as complete

- [ ] **Test Argument Map**
  1. Go to Brief tab
  2. Scroll to Argument Map
  3. Verify canvas renders
  4. Click on nodes
  5. Check selected argument details

- [ ] **Test Electoral Pressure**
  1. Navigate to sponsor profile page
  2. Add `<ElectoralPressure sponsorId={sponsor.id} />` component
  3. Verify representation score displays
  4. Check voting record shows
  5. Test share functionality

---

### **Error Handling**

- [ ] **Test with No Data**
  - Bill with no comments → Brief shows "No data"
  - Bill with no votes → Electoral pressure shows message
  - Invalid bill ID → 404 error

- [ ] **Test Loading States**
  - Brief shows loading spinner
  - Action prompts show loading
  - Argument map shows loading

- [ ] **Test Error States**
  - API failure → Error message displays
  - Network error → Retry option
  - Invalid data → Graceful degradation

---

### **Performance**

- [ ] **Check Load Times**
  - Brief loads in < 2 seconds
  - Action prompts load in < 1 second
  - Argument map renders in < 3 seconds

- [ ] **Test with Large Data**
  - Bill with 1000+ comments
  - Brief with 100+ arguments
  - Argument map with 50+ nodes

- [ ] **Mobile Performance**
  - Test on mobile device
  - Check responsive design
  - Verify touch interactions

---

### **User Experience**

- [ ] **Accessibility**
  - Keyboard navigation works
  - Screen reader compatible
  - Color contrast meets WCAG AA
  - Focus indicators visible

- [ ] **Mobile Responsive**
  - Brief viewer works on mobile
  - Action prompts stack correctly
  - Argument map is touch-friendly
  - Electoral pressure dashboard responsive

- [ ] **Browser Compatibility**
  - Chrome/Edge (latest)
  - Firefox (latest)
  - Safari (latest)
  - Mobile browsers

---

### **Content**

- [ ] **Action Prompt Templates**
  - Comment template is professional
  - Email template is appropriate
  - SMS template is concise
  - Templates are customizable

- [ ] **Legislative Brief**
  - Executive summary is clear
  - Arguments are well-organized
  - Statistics are accurate
  - Recommendations are actionable

- [ ] **Electoral Pressure**
  - Representation score is accurate
  - Voting record is correct
  - Gap calculations are right
  - Misalignments are highlighted

---

### **Security**

- [ ] **Authentication**
  - Protected routes require login
  - User context is secure
  - API endpoints are authenticated

- [ ] **Data Privacy**
  - User data is anonymized where appropriate
  - GDPR/Data Protection Act compliant
  - No PII in logs

- [ ] **Input Validation**
  - Bill IDs are validated
  - User input is sanitized
  - SQL injection prevented

---

### **Monitoring**

- [ ] **Analytics Setup**
  - Track feature usage
  - Monitor API performance
  - Log errors

- [ ] **Logging**
  - API requests logged
  - Errors logged with context
  - Performance metrics tracked

- [ ] **Alerts**
  - API failures trigger alerts
  - Performance degradation alerts
  - Error rate alerts

---

## 🚀 Launch Day

### **Morning (Before Launch)**

- [ ] **Final Smoke Test**
  - Test all features end-to-end
  - Verify production environment
  - Check database connections
  - Test API endpoints

- [ ] **Backup**
  - Database backup
  - Code backup
  - Configuration backup

- [ ] **Team Briefing**
  - Review launch plan
  - Assign monitoring roles
  - Prepare rollback plan

### **Launch**

- [ ] **Deploy to Production**
  ```bash
  # Build
  npm run build
  
  # Deploy
  npm run deploy:production
  ```

- [ ] **Verify Deployment**
  - Check all routes work
  - Test critical features
  - Monitor error rates

- [ ] **Announce Launch**
  - Social media posts
  - Email to beta users
  - Press release (if applicable)

### **Post-Launch (First Hour)**

- [ ] **Monitor Metrics**
  - User traffic
  - API response times
  - Error rates
  - Feature usage

- [ ] **Watch for Issues**
  - Check error logs
  - Monitor user feedback
  - Track performance

- [ ] **Be Ready to Rollback**
  - Have rollback plan ready
  - Monitor for critical issues
  - Be prepared to act quickly

---

## 📊 Success Metrics

### **Day 1 Targets**

- [ ] **User Engagement**
  - 100+ users visit bill detail pages
  - 50+ users view legislative briefs
  - 20+ users expand action prompts
  - 10+ users complete actions

- [ ] **Technical Performance**
  - 99% uptime
  - < 2 second average load time
  - < 1% error rate
  - No critical bugs

- [ ] **User Feedback**
  - Collect feedback from 10+ users
  - No major usability issues
  - Positive sentiment overall

### **Week 1 Targets**

- [ ] **User Engagement**
  - 500+ users visit bill detail pages
  - 200+ users view legislative briefs
  - 100+ users expand action prompts
  - 50+ users complete actions

- [ ] **Feature Adoption**
  - 30% of users view briefs
  - 20% of users expand action prompts
  - 10% of users complete actions

- [ ] **Content Quality**
  - 10+ legislative briefs generated
  - 100+ action prompts delivered
  - 50+ argument maps viewed

---

## 🐛 Rollback Plan

### **If Critical Issues Arise**

1. **Identify the Issue**
   - Check error logs
   - Review user reports
   - Assess severity

2. **Decide on Action**
   - Minor issue → Fix forward
   - Major issue → Rollback

3. **Execute Rollback**
   ```bash
   # Rollback to previous version
   git revert HEAD
   npm run deploy:production
   ```

4. **Communicate**
   - Notify users
   - Post status update
   - Explain timeline

5. **Fix and Redeploy**
   - Fix the issue
   - Test thoroughly
   - Redeploy when ready

---

## 📞 Support Contacts

### **Technical Issues**
- Backend: [Backend team contact]
- Frontend: [Frontend team contact]
- Database: [Database team contact]

### **User Support**
- Support email: support@chanuka.ke
- Twitter: @ChanukaKE
- Phone: [Support phone]

### **Emergency**
- On-call engineer: [Contact]
- Backup: [Contact]

---

## 🎉 Post-Launch

### **Day 1 Review**

- [ ] **Metrics Review**
  - Analyze usage data
  - Review error logs
  - Check performance

- [ ] **User Feedback**
  - Collect feedback
  - Identify issues
  - Prioritize fixes

- [ ] **Team Debrief**
  - What went well?
  - What could be better?
  - Action items

### **Week 1 Review**

- [ ] **Feature Performance**
  - Which features are most used?
  - Which features need improvement?
  - What's missing?

- [ ] **User Behavior**
  - How are users engaging?
  - What's the conversion rate?
  - Where do users drop off?

- [ ] **Next Steps**
  - Prioritize improvements
  - Plan next features
  - Schedule next release

---

## ✅ Final Check

Before you launch, verify:

- [ ] All backend routes registered
- [ ] All frontend components integrated
- [ ] All tests passing
- [ ] All documentation updated
- [ ] All team members briefed
- [ ] All monitoring configured
- [ ] All backups completed
- [ ] All stakeholders notified

---

**You're ready to launch! 🚀**

**Remember:** This is day one. The platform will evolve based on user feedback. Stay flexible, monitor closely, and iterate quickly.

**Good luck! Let's change how Kenyans engage with legislation!** 🇰🇪
