# Testing Guide - Day One Features
**Date:** February 20, 2026  
**Purpose:** End-to-end testing checklist for new civic engagement features

---

## 🎯 Overview

This guide provides step-by-step instructions for testing all day-one features to ensure they work correctly before launch.

---

## 🚀 Setup

### **1. Start the Development Server**
```bash
# Terminal 1 - Start backend
npm run dev

# Terminal 2 - Start frontend (if separate)
cd client && npm run dev
```

### **2. Verify Server is Running**
- Open browser to `http://localhost:4200` (or your configured port)
- Check console for any startup errors
- Verify API health: `http://localhost:4200/api/health`

---

## 📋 Feature Testing Checklist

### **Feature 1: Plain-Language Translation** ⭐

**Test Steps:**
1. Navigate to any bill detail page
2. Click the "📖 Plain Language" tab
3. Verify translation loads (or shows "not available" message)
4. Test view mode toggle:
   - Click "Plain Language" - should show simplified text
   - Click "Side-by-Side" - should show legal + plain text
   - Click "Legal Text" - should show original text
5. Check that key points, examples, and affected groups display
6. Verify summary shows correct clause counts

**Expected Results:**
- ✅ Translation loads within 2 seconds
- ✅ All three view modes work correctly
- ✅ Key points display as bullet list
- ✅ Examples show in amber boxes
- ✅ Affected groups show as purple tags
- ✅ Summary displays at top

**Mock Data Bills:**
- Finance Bill 2026 (has translation)
- Tax Laws Amendment Bill (has translation)
- Housing Levy Bill (has translation)

---

### **Feature 2: Personal Impact Calculator** ⭐

**Test Steps:**
1. Navigate to any bill detail page
2. Click the "💰 My Impact" tab
3. Fill in the form:
   - Monthly Income: 50000
   - County: Nairobi
   - Household Size: 4
   - Check all usage patterns
4. Click "Calculate My Impact"
5. Verify results display:
   - Monthly and annual costs
   - Severity badge (low/medium/high/critical)
   - Cost breakdown by provision
   - Affected services
   - Recommendations
6. Click "Recalculate" and try different inputs

**Expected Results:**
- ✅ Form validates required fields
- ✅ Calculation completes within 1 second
- ✅ Results show correct severity color
- ✅ Financial impact displays in KES
- ✅ Breakdown shows individual provisions
- ✅ Recommendations are actionable
- ✅ Recalculate button resets form

**Test Cases:**
- Low income (KES 20,000) → Should show lower impact
- High income (KES 200,000) → Should show higher impact
- No mobile money → Should exclude M-Pesa tax
- Not employed → Should exclude housing levy

---

### **Feature 3: Action Prompts** 🎯

**Test Steps:**
1. Navigate to any bill detail page
2. Click the "🎯 Actions" tab
3. Verify action prompts display
4. For each action prompt:
   - Check deadline countdown shows correctly
   - Verify urgency badge (low/medium/high/critical)
   - Expand to see steps
   - Check template text is present
   - Click "Copy Template" button
5. Test different bill statuses (draft, committee, voting)

**Expected Results:**
- ✅ At least 3-5 action prompts per bill
- ✅ Deadline countdown is accurate
- ✅ Urgency matches deadline (3 days = critical)
- ✅ Steps are numbered and clear
- ✅ Templates are pre-filled and relevant
- ✅ Copy button works
- ✅ Progress tracking shows completion

**Action Types to Test:**
- Comment (during public comment period)
- Vote (when voting is open)
- Attend Hearing (when hearing is scheduled)
- Contact MP (always available)
- Share (always available)

---

### **Feature 4: Legislative Brief Viewer** 📄

**Test Steps:**
1. Navigate to a bill with comments
2. Click the "📄 Brief" tab
3. Verify brief displays:
   - Summary statistics
   - Argument clusters by position
   - Citizen participation stats
4. Test filtering:
   - Click "Support" - should show only supporting arguments
   - Click "Oppose" - should show only opposing arguments
   - Click "Neutral" - should show neutral arguments
   - Click "All" - should show all arguments
5. Test sorting:
   - Sort by "Strength" - strongest arguments first
   - Sort by "Endorsements" - most endorsed first
6. Click "Export PDF" button

**Expected Results:**
- ✅ Brief loads within 2 seconds
- ✅ Statistics show correct counts
- ✅ Arguments display with position badges
- ✅ Filtering works correctly
- ✅ Sorting reorders arguments
- ✅ Export PDF triggers download
- ✅ Verified badge shows for verified arguments

**Test Bills:**
- Bills with many comments (>50)
- Bills with few comments (<10)
- Bills with no comments (should show empty state)

---

### **Feature 5: Argument Map Visualization** 🗺️

**Test Steps:**
1. Navigate to a bill with comments
2. Click the "📄 Brief" tab
3. Scroll to "Argument Network" section
4. Verify canvas renders:
   - Nodes are color-coded (green/red/gray)
   - Node sizes vary by strength
   - Legend shows counts
5. Interact with map:
   - Click a node - should show argument details
   - Hover over node - should highlight
   - Check that related arguments are connected

**Expected Results:**
- ✅ Canvas renders within 1 second
- ✅ Nodes are positioned correctly
- ✅ Colors match positions (green=support, red=oppose)
- ✅ Node size reflects argument strength
- ✅ Click detection works
- ✅ Selected argument details display
- ✅ Legend shows accurate counts

**Edge Cases:**
- Bills with 1 argument (single node)
- Bills with 100+ arguments (performance test)
- Bills with no arguments (empty state)

---

### **Feature 6: Electoral Pressure Dashboard** 📊

**Test Steps:**
1. Navigate to a sponsor profile page
2. Scroll to "Electoral Pressure" section
3. Verify dashboard displays:
   - Representation score (0-100)
   - Voting record vs constituency
   - Gap score
   - Trend indicator
4. Check misaligned votes section
5. Click "Contact Your MP" button
6. Click "Share This Report" button

**Expected Results:**
- ✅ Representation score calculates correctly
- ✅ Voting record shows all votes
- ✅ Gap score highlights misalignment
- ✅ Trend shows improving/worsening/stable
- ✅ Misaligned votes are highlighted in red
- ✅ Contact button opens email/phone
- ✅ Share button opens share dialog

**Test Scenarios:**
- MP with high alignment (>80%) → Green score
- MP with low alignment (<50%) → Red score
- MP with improving trend → Up arrow
- MP with worsening trend → Down arrow

---

## 🔗 Integration Testing

### **Test 1: Tab Navigation**
1. Open bill detail page
2. Click through all 10 tabs in order
3. Verify each tab loads correctly
4. Check URL updates with `?tab=` parameter
5. Refresh page - should stay on same tab
6. Use browser back/forward - should navigate tabs

**Expected Results:**
- ✅ All tabs load without errors
- ✅ URL updates correctly
- ✅ Tab state persists on refresh
- ✅ Browser navigation works

---

### **Test 2: API Error Handling**
1. Disconnect from internet
2. Try to load translation
3. Verify error message displays
4. Reconnect to internet
5. Click retry button

**Expected Results:**
- ✅ Error message is user-friendly
- ✅ No console errors
- ✅ Retry button works
- ✅ Data loads after reconnection

---

### **Test 3: Loading States**
1. Throttle network to "Slow 3G"
2. Navigate to bill detail page
3. Verify loading spinners show for:
   - Translation
   - Impact calculation
   - Action prompts
   - Legislative brief
4. Check that loading doesn't block UI

**Expected Results:**
- ✅ Spinners show during loading
- ✅ Loading messages are clear
- ✅ UI remains responsive
- ✅ No layout shift when data loads

---

### **Test 4: Mobile Responsiveness**
1. Open DevTools
2. Toggle device toolbar
3. Test on different screen sizes:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)
4. Verify all features work on mobile

**Expected Results:**
- ✅ Tabs stack on mobile
- ✅ Forms are usable on small screens
- ✅ Buttons are touch-friendly (44px min)
- ✅ Text is readable (16px min)
- ✅ No horizontal scrolling

---

## 🐛 Bug Reporting

If you find a bug, document:
1. **What you were doing** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Screenshots** (if applicable)
5. **Console errors** (if any)

**Report bugs in:** `.kiro/specs/BUGS_FOUND.md`

---

## ✅ Sign-Off Checklist

Before marking testing complete, verify:

- [ ] All 6 features tested individually
- [ ] All integration tests passed
- [ ] Mobile responsiveness verified
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] API endpoints respond correctly
- [ ] Mock data displays properly
- [ ] Documentation is up to date

---

## 📊 Performance Benchmarks

Target performance metrics:

| Feature | Target Load Time | Actual |
|---------|-----------------|--------|
| Translation | < 2 seconds | ___ |
| Impact Calculator | < 1 second | ___ |
| Action Prompts | < 1 second | ___ |
| Legislative Brief | < 2 seconds | ___ |
| Argument Map | < 1 second | ___ |
| Electoral Pressure | < 1 second | ___ |

---

## 🎉 Testing Complete

Once all tests pass:
1. Update this document with actual performance metrics
2. Create summary report in `.kiro/specs/TESTING_RESULTS.md`
3. Mark features as "READY FOR PRODUCTION"
4. Notify team that features are ready for beta testing

---

## 📞 Support

For testing questions:
- Check `.kiro/specs/DAY_ONE_FEATURES_IMPLEMENTED.md` for feature details
- Review `.kiro/specs/BUG_FIXES_COMPLETE.md` for known fixes
- See `.kiro/specs/LAUNCH_CHECKLIST.md` for deployment steps

**Happy testing!** 🚀

