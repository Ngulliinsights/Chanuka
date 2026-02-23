# Getting Started with Tasks

## For New Team Members

Welcome! This guide will help you get started with the active tasks.

---

## Quick Overview

We have 3 high-priority tasks ready to execute:

1. **Accessibility Audit** - Test all pages for WCAG compliance
2. **Swahili Review** - Get native speaker validation
3. **Marketing Update** - Remove false claims, add honest status

---

## Your First Day

### Step 1: Read Your Task (15 minutes)

Find your assigned task in this directory:
- `accessibility-audit-week1.md` - If you're doing accessibility testing
- `swahili-native-speaker-review.md` - If you're coordinating translation review
- `update-marketing-materials.md` - If you're updating marketing materials

### Step 2: Set Up Your Environment (30 minutes)

**For Accessibility Testing**:
```bash
# 1. Install browser extensions
# - axe DevTools: https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd
# - WAVE: https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh

# 2. Start dev server
npm run dev

# 3. Open browser to http://localhost:5173
```

**For Swahili Review**:
```bash
# 1. Review the translation file
cat shared/i18n/sw.ts

# 2. Prepare review materials (see task file)

# 3. Start searching for native speaker
# - Check Kenyan developer communities
# - Post in African tech groups
# - Consider Upwork/Fiverr
```

**For Marketing Update**:
```bash
# 1. Review current materials
cat README.md  # Already updated
# Website, pitch deck, social media need updates

# 2. Review approved messaging in task file

# 3. Start drafting updates
```

### Step 3: Start Working (Rest of day)

Follow the action steps in your task file. They're in chronological order.

---

## Daily Workflow

### Morning (9:00 AM)
1. Review your task file
2. Check what you completed yesterday
3. Plan today's work
4. Report any blockers in standup

### During the Day
1. Work through action steps
2. Check off completed items
3. Document findings as you go
4. Ask questions when stuck

### End of Day (5:00 PM)
1. Update task file with progress
2. Note any blockers
3. Estimate tomorrow's work
4. Commit any changes

---

## How to Update Task Files

### Mark Items Complete
```markdown
- [x] Completed item
- [ ] Not yet done
```

### Add Notes
```markdown
### Notes
- Found issue with X
- Need help with Y
- Completed Z ahead of schedule
```

### Update Status
```markdown
**Status**: 🟡 In Progress (Day 2 of 5)
```

---

## Common Questions

### Q: Where do I document my findings?

**A**: Each task file has templates. Copy the template and fill it in.

For accessibility:
```markdown
## Home Page

**URL**: http://localhost:5173/
**Date Tested**: Feb 24, 2026

### 🔴 Critical Issues (3 found)
1. Missing alt text on logo
2. Form inputs without labels
3. Color contrast < 3:1 on buttons
```

### Q: What if I get stuck?

**A**: 
1. Check the task file for troubleshooting section
2. Ask in team chat
3. Tag the task owner
4. Document the blocker in task file

### Q: How do I know if I'm done?

**A**: Check the "Success Criteria" section in your task file. All items should be checked off.

### Q: Can I work on multiple tasks?

**A**: Focus on one task at a time. Complete it before moving to the next.

---

## Tools & Resources

### Accessibility Testing
- **axe DevTools**: Browser extension for automated testing
- **Lighthouse**: Built into Chrome DevTools
- **WAVE**: Browser extension for visual feedback
- **NVDA**: Free screen reader for Windows

### Documentation
- **IMPLEMENTATION_TRACKER.md**: Overall progress
- **WCAG_ACCESSIBILITY_AUDIT.md**: 6-week accessibility plan
- **CURRENT_CAPABILITIES.md**: What works today

### Communication
- **Daily Standup**: Report progress and blockers
- **Team Chat**: Ask questions, share findings
- **Task Files**: Document everything

---

## Tips for Success

### Do's ✅
- Read the entire task file before starting
- Follow action steps in order
- Document as you go
- Ask questions early
- Update task file daily
- Use provided templates
- Report blockers immediately

### Don'ts ❌
- Don't skip steps
- Don't assume - ask if unsure
- Don't wait until end to document
- Don't work in isolation
- Don't ignore blockers
- Don't deviate from plan without discussion

---

## Example: First Day on Accessibility Audit

**Morning (9:00 AM - 12:00 PM)**:
```bash
# 1. Install extensions (15 min)
# 2. Start dev server (5 min)
# 3. Read task file thoroughly (30 min)
# 4. Test Home page with axe DevTools (60 min)
# 5. Test Home page with Lighthouse (30 min)
# 6. Document findings (30 min)
```

**Afternoon (1:00 PM - 5:00 PM)**:
```bash
# 7. Test Home page with WAVE (30 min)
# 8. Manual keyboard testing (30 min)
# 9. Compile all findings (60 min)
# 10. Update task file (30 min)
# 11. Plan tomorrow's work (30 min)
```

**End of Day**:
- Home page complete ✅
- Found 15 violations (3 critical, 5 serious, 7 moderate)
- Tomorrow: Bills and Dashboard pages

---

## Getting Help

### Task-Specific Questions
- **Accessibility**: Ask dev team lead
- **Swahili**: Ask dev team lead
- **Marketing**: Ask marketing manager

### Technical Issues
- **Dev server won't start**: Check terminal for errors
- **Tools not working**: Try different browser
- **Can't access page**: Check if authentication required

### Process Questions
- **How to document**: See templates in task file
- **How to report**: Update task file + mention in standup
- **How to prioritize**: Follow task file order

---

## Success Checklist

Before marking a task complete:

- [ ] All action steps completed
- [ ] All success criteria met
- [ ] Findings documented
- [ ] Task file updated
- [ ] Team notified
- [ ] Next steps identified

---

## Next Steps After Your Task

1. **Review your work** with team lead
2. **Present findings** to team
3. **Get feedback** and make adjustments
4. **Move to next task** or help others

---

**Questions?** Ask in team chat or tag @dev-team-lead

**Ready to start?** Open your task file and begin with Step 1!

---

**Last Updated**: February 23, 2026  
**Maintained By**: Dev Team Lead
