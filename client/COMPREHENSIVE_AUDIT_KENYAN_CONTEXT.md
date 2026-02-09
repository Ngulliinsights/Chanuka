# Comprehensive Client Audit - Kenyan Context Preserved

## Platform Context
**Chanuka** - A Kenyan civic engagement platform for legislative transparency and democratic participation.
- **Language**: English & Kiswahili (Swahili)
- **Jurisdiction**: Kenya (Constitution 2010, Kenyan case law, Kenyan bills)
- **Currency**: KES (Kenya Shillings)
- **Location**: Nairobi, Kenya

## Critical Issues Found

### 1. **US Context in Recently Created Pages** ❌
The following pages were created with US context and need to be updated to Kenyan context:

#### Pages to Update:
1. **Contact Page** (`/contact`)
   - ❌ Address: "123 Democracy Street, Washington, DC 20001, United States"
   - ✅ Should be: Nairobi, Kenya address
   - ❌ Phone: "+1 (555) 123-4567"
   - ✅ Should be: Kenyan phone format (+254...)

2. **About Page** (`/about`)
   - ❌ "Made with ❤️ for democracy" (too generic)
   - ✅ Should reference Kenyan democracy, Constitution 2010
   - ❌ No mention of Kenyan context

3. **Careers Page** (`/careers`)
   - ❌ Salaries in USD ($140k - $180k)
   - ✅ Should be in KES
   - ❌ "Remote (US)" locations
   - ✅ Should be "Nairobi" or "Remote (Kenya)"

4. **Press Page** (`/press`)
   - ❌ Address: "Washington, DC 20001"
   - ✅ Should be Nairobi address

5. **Terms of Service** (`/terms`)
   - ❌ "Governed by laws of United States and District of Columbia"
   - ✅ Should be "Laws of Kenya"

6. **Privacy Policy** (`/privacy`)
   - ❌ "Washington, DC 20001"
   - ✅ Should be Nairobi address
   - ❌ References CCPA (California) and GDPR (EU)
   - ✅ Should reference Kenya Data Protection Act 2019

### 2. **Missing Pages Referenced in Navigation**

#### From BrandedFooter:
- `/analysis` - Analysis Tools page (MISSING)
- `/expert` - Expert Insights page (MISSING - but `/community/expert-verification` exists)
- `/api` - API Access page (MISSING)
- `/status` - System Status page (MISSING)
- `/security` - Security page (may exist in features/security)
- `/sitemap` - Sitemap page (MISSING)

#### From Navigation/Links:
- `/civic-education` - Civic Education main page (MISSING - but CivicEducationHub exists)
- `/help/getting-started` - Getting Started Guide (MISSING)
- `/help/faq` - FAQ page (MISSING)
- `/help/persona-classification` - Persona Classification Help (MISSING)
- `/help/persona-levels` - Persona Levels Help (MISSING)
- `/bills?guided=true` - Guided Bills Tour (MISSING)
- `/bills?category=local` - Local Bills Filter (MISSING)
- `/civic-education/how-bills-become-law` - How Bills Become Law (MISSING)
- `/civic-education/your-representatives` - Your Representatives (MISSING)

### 3. **Placeholder Pages Needing Full Implementation**

1. **Cookie Policy** (`/cookies`) - Basic placeholder
2. **Accessibility Statement** (`/accessibility`) - Basic placeholder

### 4. **Broken/Non-Functioning Buttons Found**

#### Dashboard Links:
- Multiple dashboard widgets link to `/civic-education/*` routes that don't exist
- `/expert/getting-started` - doesn't exist
- `/bills/sample-*` - sample bill routes don't exist
- `/help/*` routes - help system not implemented

#### Navigation:
- `/profile` route redirects to `/account` but navigation still uses `/profile`

### 5. **Kenyan Context Already Implemented** ✅

These components correctly use Kenyan context:
- `KenyanLegislativeProcess.tsx` - Kenyan legislative process
- `CivicEducationHub.tsx` - Kenyan civic education
- `real-kenya-data.ts` - Real Kenyan bills, constitution, case law
- `LanguageSwitcher.tsx` - English/Kiswahili support
- `HistoricalPrecedents.tsx` - Uses Kenyan precedents
- `EducationalFramework.tsx` - Uses real Kenyan bills

## Action Plan

### Priority 1: Fix US Context in Legal Pages (CRITICAL)
1. Update Contact page with Nairobi address and Kenyan phone
2. Update About page with Kenyan democracy context
3. Update Careers page with KES salaries and Kenyan locations
4. Update Press page with Nairobi address
5. Update Terms with Kenyan law jurisdiction
6. Update Privacy with Kenya Data Protection Act 2019

### Priority 2: Create Missing Core Pages
1. Civic Education landing page (`/civic-education`)
2. Help Center pages (`/help/*`)
3. API Access page
4. System Status page
5. Sitemap page

### Priority 3: Update Placeholder Pages
1. Complete Cookie Policy with Kenyan context
2. Complete Accessibility Statement

### Priority 4: Fix Navigation Issues
1. Update all `/profile` references to `/account`
2. Create missing guided tour routes
3. Implement help system routes

## Kenyan Context Requirements

### Address Format:
```
Chanuka Platform
[Building Name]
[Street Address]
Nairobi, Kenya
P.O. Box [Number]
```

### Phone Format:
```
+254 [9-digit number]
Example: +254 712 345 678
```

### Currency:
- Use KES (Kenya Shillings)
- Format: KES 50,000 or Ksh 50,000

### Legal References:
- Constitution of Kenya 2010
- Kenya Data Protection Act 2019
- Laws of Kenya
- Kenyan case law (eKLR citations)

### Language:
- Primary: English
- Secondary: Kiswahili
- Use LanguageSwitcher component for bilingual support

### Cultural Context:
- Reference Kenyan democracy and governance
- Mention devolution (county governments)
- Reference National Assembly and Senate
- Use Kenyan examples and precedents

## Files Requiring Updates

### Immediate Updates Needed:
1. `client/src/features/legal/pages/contact.tsx`
2. `client/src/features/legal/pages/about.tsx`
3. `client/src/features/legal/pages/careers.tsx`
4. `client/src/features/legal/pages/press.tsx`
5. `client/src/features/legal/pages/terms.tsx`
6. `client/src/features/legal/pages/privacy.tsx`
7. `client/src/features/legal/pages/cookie-policy.tsx`
8. `client/src/features/legal/pages/accessibility.tsx`

### Pages to Create:
1. `client/src/features/legal/pages/api-access.tsx`
2. `client/src/features/legal/pages/system-status.tsx`
3. `client/src/features/legal/pages/sitemap.tsx`
4. `client/src/lib/pages/civic-education.tsx`
5. `client/src/lib/pages/help/*.tsx` (multiple help pages)

## Testing Checklist

- [ ] All legal pages use Kenyan context
- [ ] All addresses are Nairobi-based
- [ ] All phone numbers use +254 format
- [ ] All salaries in KES
- [ ] All legal references to Kenyan law
- [ ] Privacy policy references Kenya Data Protection Act
- [ ] No US-specific references remain
- [ ] All footer links work
- [ ] All navigation links work
- [ ] All buttons function correctly
- [ ] Bilingual support (English/Kiswahili) works
- [ ] Dark mode works on all pages
- [ ] Mobile responsive on all pages

## Estimated Work

- **Fix US Context**: 2-3 hours
- **Create Missing Pages**: 4-5 hours
- **Fix Navigation**: 1-2 hours
- **Testing**: 1-2 hours
- **Total**: 8-12 hours

## Notes

- The platform has excellent Kenyan context in core features (bills, education, case law)
- The issue is primarily in the recently created legal/info pages
- Navigation structure is solid, just needs route implementations
- Design system is consistent and well-implemented
- Accessibility considerations are good throughout
