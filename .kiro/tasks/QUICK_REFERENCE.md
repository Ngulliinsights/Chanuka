# Quick Reference Guide

## Task Status at a Glance

| Task | Status | Due Date | Time | Owner |
|------|--------|----------|------|-------|
| Accessibility Audit | 🟡 Ready | Mar 1 | 8-10h | Dev Team |
| Swahili Review | 🟡 Ready | Mar 8 | 2-3h | Dev Lead |
| Marketing Update | 🟡 In Progress | Mar 1 | 4-6h | Marketing |

---

## Quick Commands

```bash
# Start dev server
npm run dev

# Run accessibility audit (has dependency issue - use browser tools)
npm run accessibility:audit

# Check TypeScript errors
npx tsc --noEmit

# Run tests
npm test

# Lint code
npm run lint
```

---

## Important URLs

### Development
- Frontend: http://localhost:5173
- Backend: http://localhost:4200

### Tools
- [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [WAVE](https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh)
- [NVDA Screen Reader](https://www.nvaccess.org/download/)

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)

---

## Pages to Test

1. Home: `/`
2. Bills: `/bills`
3. Dashboard: `/dashboard`
4. Login: `/login`
5. Bill Detail: `/bills/1`
6. Profile: `/profile`
7. Settings: `/settings`

---

## Issue Severity

| Level | Priority | Timeline |
|-------|----------|----------|
| 🔴 Critical | Fix immediately | This week |
| 🟠 Serious | Fix soon | Next week |
| 🟡 Moderate | Fix this month | 2-3 weeks |
| 🔵 Minor | Fix when possible | 4-6 weeks |

---

## Common WCAG Issues

### Critical 🔴
- Missing alt text on images
- Form inputs without labels
- Keyboard traps
- Color contrast < 3:1

### Serious 🟠
- Missing ARIA labels
- Improper heading hierarchy
- Missing skip links
- Focus indicators not visible

### Moderate 🟡
- Redundant links
- Missing landmarks
- Empty headings
- Minor contrast issues

### Minor 🔵
- Missing language attribute
- Redundant alt text
- Presentational markup

---

## Approved Messaging

### User Numbers
❌ "500,000 users reached"  
✅ "Building for launch - Q2 2026"

### Language Support
❌ "Multi-language support"  
✅ "English and Swahili support"

### Accessibility
❌ "WCAG AAA compliant"  
✅ "Working toward WCAG AA compliance (April 2026)"

---

## File Locations

### Tasks
- `.kiro/tasks/accessibility-audit-week1.md`
- `.kiro/tasks/swahili-native-speaker-review.md`
- `.kiro/tasks/update-marketing-materials.md`

### Documentation
- `IMPLEMENTATION_TRACKER.md` - Overall progress
- `WCAG_ACCESSIBILITY_AUDIT.md` - 6-week plan
- `CURRENT_CAPABILITIES.md` - Platform status

### Code
- `shared/i18n/sw.ts` - Swahili translations
- `client/src/lib/ui/layout/Header.tsx` - Language selector
- `client/src/hooks/useLanguage.ts` - Language hook

---

## Contact Information

### Team Roles
- **Dev Team Lead**: Task coordination, technical decisions
- **Dev Team**: Implementation, testing
- **Marketing Team**: Content updates, messaging
- **Leadership**: Approval, strategy

### Communication Channels
- **Daily Standup**: Progress updates
- **Team Chat**: Questions, blockers
- **Task Files**: Documentation
- **Email**: Formal communication

---

## Budget Summary

| Item | Cost | Status |
|------|------|--------|
| Accessibility Tools | $0 | ✅ Free |
| Swahili Reviewer | $200-500 | 🟡 Pending |
| Marketing Update | $0 | ✅ Internal |
| **Total** | **$200-500** | |

---

## Timeline

### This Week (Feb 24 - Mar 1)
- Accessibility audit
- Marketing materials draft
- Find Swahili reviewer

### Next Week (Mar 2 - Mar 8)
- Fix critical issues
- Swahili review session
- Publish marketing updates

### This Month (Feb 23 - Mar 29)
- Complete WCAG Weeks 1-4
- Swahili production-ready
- All marketing aligned

---

## Success Metrics

### Accessibility
- [ ] All 7 pages tested
- [ ] 80-120 violations documented
- [ ] Issues categorized
- [ ] Fix estimates provided
- [ ] Week 2 plan created

### Swahili
- [ ] Native speaker found
- [ ] Review session completed
- [ ] Corrections implemented
- [ ] Quality rating ≥ 4/5
- [ ] Sign-off obtained

### Marketing
- [ ] Website updated
- [ ] Pitch deck updated
- [ ] Social media updated
- [ ] False claims removed
- [ ] Leadership approved

---

## Emergency Contacts

### Blockers
- Can't find native speaker → Try Upwork/Fiverr
- Tools not working → Use alternative tools
- Timeline at risk → Escalate to lead

### Technical Issues
- Dev server errors → Check terminal logs
- Build failures → Run `pnpm install`
- Test failures → Check test output

---

## Keyboard Shortcuts

### Browser Testing
- `F12` - Open DevTools
- `Tab` - Navigate forward
- `Shift+Tab` - Navigate backward
- `Enter` - Activate element
- `Escape` - Close modal/dropdown

### Screen Reader (NVDA)
- `Insert+Down` - Read next line
- `Insert+Up` - Read previous line
- `H` - Next heading
- `Shift+H` - Previous heading
- `Insert+F7` - List all links

---

## Troubleshooting

### Dev Server Won't Start
```bash
# Kill existing processes
pkill -f "node.*vite"
pkill -f "node.*tsx"

# Restart
npm run dev
```

### Browser Extension Not Working
1. Refresh page
2. Restart browser
3. Reinstall extension
4. Try different browser

### Can't Access Page
1. Check if logged in
2. Check URL is correct
3. Check dev server running
4. Check for errors in console

---

## Useful Snippets

### Document a Violation
```markdown
#### Issue: Missing alt text on logo
- **WCAG**: 1.1.1 Non-text Content
- **Impact**: Critical
- **Elements**: 1
- **Fix**: Add alt="LegisTrack logo" to img tag
- **Estimate**: 5 minutes
```

### Report Progress
```markdown
**Day 2 Update**:
- ✅ Home page complete (15 violations)
- ✅ Bills page complete (12 violations)
- 🟡 Dashboard page in progress
- ⏭️ Tomorrow: Login, Profile, Settings
```

### Report Blocker
```markdown
**Blocker**: Can't test authenticated pages
**Impact**: Can't complete Profile and Settings pages
**Need**: Test user credentials or auth bypass
**Escalated**: Yes, to dev lead
```

---

**Last Updated**: February 23, 2026  
**Print this page for quick reference!**
