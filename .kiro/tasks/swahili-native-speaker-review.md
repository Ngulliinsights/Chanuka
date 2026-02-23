# Task: Native Swahili Speaker Review

## Priority: HIGH
**Status**: 🟡 Not Started  
**Assigned**: Dev Team Lead  
**Due Date**: March 8, 2026  
**Estimated Time**: 2-3 hours (1-2 hour session + corrections)

---

## Objective

Get native Swahili speaker validation of all translations in `shared/i18n/sw.ts` to ensure accuracy, cultural appropriateness, and natural language flow.

---

## Background

We've implemented 200+ Swahili translations for the platform. While the translations are functional, they need validation by a native speaker to ensure:
- Grammatical correctness
- Cultural appropriateness
- Natural language flow
- Proper terminology for legislative/civic context
- Consistency across the platform

---

## Scope

### Files to Review
- `shared/i18n/sw.ts` - All 200+ translation strings

### Key Areas
1. **Navigation & UI** (40+ strings)
   - Menu items, buttons, labels
   - Common actions (save, cancel, delete, etc.)

2. **Legislative Content** (60+ strings)
   - Bill statuses, types, stages
   - Legislative terminology
   - Voting and engagement terms

3. **User Features** (50+ strings)
   - Authentication, profile, settings
   - Notifications, alerts, messages

4. **Community Features** (30+ strings)
   - Comments, discussions, voting
   - Moderation, reporting

5. **Analytics & Dashboard** (20+ strings)
   - Charts, metrics, statistics
   - Data visualization labels

---

## Deliverables

1. **Review Session Notes**
   - List of corrections needed
   - Suggestions for improvements
   - Cultural considerations

2. **Updated Translations**
   - Corrected `shared/i18n/sw.ts` file
   - Documentation of changes made

3. **Validation Report**
   - Summary of review findings
   - Quality assessment (1-5 scale)
   - Recommendations for future translations

---

## Action Steps

### Step 1: Find Native Speaker (Week 1)
**Owner**: Dev Team Lead  
**Deadline**: February 28, 2026

- [ ] Reach out to Kenyan community contacts
- [ ] Post in relevant Swahili language communities
- [ ] Check with local universities (African Studies departments)
- [ ] Consider hiring professional translator (budget: $200-500)

**Potential Sources**:
- Kenyan developer communities
- African tech Slack/Discord groups
- Upwork/Fiverr (search: "Swahili translator + tech")
- Local Kenyan/Tanzanian community organizations

### Step 2: Prepare Review Materials (Week 1)
**Owner**: Dev Team  
**Deadline**: February 28, 2026

- [ ] Create review document with context
- [ ] Prepare screenshots of UI with translations
- [ ] Document legislative terminology glossary
- [ ] Create feedback template

**Materials to Prepare**:
```markdown
# Swahili Translation Review

## Context
LegisTrack is a legislative transparency platform for Kenya. Users track bills, 
engage with representatives, and participate in civic discussions.

## Target Audience
- Kenyan citizens (all education levels)
- Age range: 18-65+
- Urban and rural users
- Mix of tech-savvy and non-tech users

## Review Focus
1. Accuracy of translations
2. Cultural appropriateness
3. Natural language flow
4. Consistency of terminology
5. Accessibility (simple, clear language)

## Glossary
- Bill = Muswada
- Parliament = Bunge
- Representative = Mbunge
- Vote = Kura
[etc.]
```

### Step 3: Schedule Review Session (Week 2)
**Owner**: Dev Team Lead  
**Deadline**: March 7, 2026

- [ ] Schedule 1-2 hour video call
- [ ] Share review materials in advance
- [ ] Prepare demo environment
- [ ] Set up screen sharing

**Session Agenda** (90 minutes):
1. Introduction & Context (10 min)
2. Review Navigation & UI (20 min)
3. Review Legislative Content (30 min)
4. Review User Features (20 min)
5. Review Community Features (10 min)
6. Q&A & Recommendations (10 min)

### Step 4: Implement Corrections (Week 2)
**Owner**: Dev Team  
**Deadline**: March 10, 2026

- [ ] Update `shared/i18n/sw.ts` with corrections
- [ ] Test all changes in UI
- [ ] Verify no breaking changes
- [ ] Update documentation

### Step 5: Validation & Sign-off (Week 2)
**Owner**: Dev Team Lead  
**Deadline**: March 12, 2026

- [ ] Send updated translations for final review
- [ ] Get sign-off from reviewer
- [ ] Document validation in project records
- [ ] Update status to "Production Ready"

---

## Review Checklist

### For Each Translation String

- [ ] **Accuracy**: Does it convey the correct meaning?
- [ ] **Grammar**: Is it grammatically correct?
- [ ] **Natural**: Does it sound natural to native speakers?
- [ ] **Context**: Is it appropriate for the context?
- [ ] **Consistency**: Does it match terminology used elsewhere?
- [ ] **Clarity**: Is it clear and unambiguous?
- [ ] **Length**: Does it fit in the UI space?

### Special Considerations

- [ ] **Formal vs Informal**: Should we use formal or informal language?
- [ ] **Regional Variations**: Are there Kenyan-specific terms vs Tanzanian?
- [ ] **Technical Terms**: Are technical terms translated or kept in English?
- [ ] **Acronyms**: How should acronyms be handled?
- [ ] **Gender**: Are gender-neutral terms used where appropriate?

---

## Budget

**Estimated Cost**: $200-500

- Professional translator (1-2 hours): $100-300
- Follow-up review: $50-100
- Contingency: $50-100

**Approved By**: [Pending]  
**Budget Source**: Development/Localization

---

## Success Criteria

1. ✅ Native speaker review completed
2. ✅ All corrections implemented
3. ✅ Quality rating ≥ 4/5
4. ✅ No critical errors remaining
5. ✅ Reviewer sign-off obtained
6. ✅ Documentation updated

---

## Risks & Mitigation

### Risk 1: Can't Find Native Speaker
**Probability**: LOW  
**Impact**: MEDIUM  
**Mitigation**: 
- Start search immediately
- Use multiple channels
- Consider paid services
- Expand search to Tanzanian speakers

### Risk 2: Major Corrections Needed
**Probability**: MEDIUM  
**Impact**: MEDIUM  
**Mitigation**:
- Budget extra time for corrections
- Prioritize critical issues
- Plan for second review if needed

### Risk 3: Timeline Delays
**Probability**: MEDIUM  
**Impact**: LOW  
**Mitigation**:
- Start search early
- Have backup reviewers
- Can launch with current translations if needed

---

## Related Tasks

- [ ] Update language selector UI after corrections
- [ ] Test all translated strings in production
- [ ] Create user documentation in Swahili
- [ ] Plan for ongoing translation maintenance

---

## Notes

- Current translations are functional but need validation
- Platform can launch with current translations if review delayed
- This is a quality improvement, not a blocker
- Consider establishing ongoing relationship with reviewer for future updates

---

## Contact Information

**Reviewer**: [TBD]  
**Email**: [TBD]  
**Phone**: [TBD]  
**Availability**: [TBD]

---

**Created**: February 23, 2026  
**Last Updated**: February 23, 2026  
**Status**: 🟡 Awaiting native speaker contact
