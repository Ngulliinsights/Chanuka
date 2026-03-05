# UX/UI Quick Reference Guide

Quick lookup for common UX/UI patterns, components, and guidelines.

---

## 🎯 User Personas (Quick Reference)

| Persona | Device | Priority | Key Need |
|---------|--------|----------|----------|
| **Wanjiku** (Casual Citizen) | Mobile | High | Simple, fast, low-bandwidth |
| **James** (Active Advocate) | Desktop | High | Power tools, collaboration |
| **Dr. Kamau** (Policy Expert) | Desktop | Medium | Deep analysis, API access |
| **Sarah** (Journalist) | Both | Medium | Quick facts, trending bills |
| **Njeri** (Accessibility) | Desktop | Critical | Full keyboard, screen reader |

---

## 🎨 Design Patterns

### Loading States
```tsx
import { LoadingStateManager } from '@client/lib/ui/loading/LoadingStates';

<LoadingStateManager
  type="page"
  state="loading"
  message="Loading bills..."
/>
```

### Error States
```tsx
import { ErrorBoundary } from '@client/infrastructure/error/components';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Feedback Widget
```tsx
import { FeedbackWidget } from '@client/lib/ui/feedback/FeedbackWidget';

<FeedbackWidget position="bottom-right" />
```

### Welcome Tour
```tsx
// Redirect first-time users
if (!localStorage.getItem('chanuka_onboarding_completed')) {
  navigate('/welcome');
}
```

---

## 🔍 Common User Flows

### First-Time User
1. Land on homepage
2. See welcome tour prompt
3. Complete 6-step tour
4. Select persona
5. Arrive at personalized dashboard

### Bill Discovery (Wanjiku)
1. Open app on mobile
2. See personalized feed
3. Tap bill for summary
4. Save for offline reading
5. Share via WhatsApp

### Campaign Organization (James)
1. Search for bills
2. Create collection
3. Add bills to collection
4. Share collection with team
5. Export for presentation

### Research (Dr. Kamau)
1. Advanced search
2. Filter by date range
3. Compare bills
4. Analyze constitutional impact
5. Export citations

---

## ♿ Accessibility Checklist

### Every Component Must Have:
- [ ] Keyboard navigation support
- [ ] Proper ARIA labels
- [ ] Focus indicators
- [ ] Color contrast 4.5:1+
- [ ] Screen reader testing
- [ ] Skip links (pages)
- [ ] Reduced motion support

### Testing Tools:
- **Automated**: axe DevTools, Lighthouse
- **Manual**: Keyboard navigation, screen reader
- **CI/CD**: Automated accessibility tests

---

## 📱 Mobile Optimization

### Mobile-First Checklist:
- [ ] Touch targets 44px minimum
- [ ] Responsive breakpoints
- [ ] Low-bandwidth mode
- [ ] Offline support
- [ ] Pull-to-refresh
- [ ] Bottom navigation
- [ ] Swipe gestures

### Performance Targets:
- LCP < 2.5s on 3G
- FID < 100ms
- CLS < 0.1
- Bundle < 200KB gzipped

---

## 🎯 Performance Budgets

### Core Web Vitals:
| Metric | Good | Warning | Poor |
|--------|------|---------|------|
| LCP | < 2.5s | 2.5-4s | > 4s |
| FID | < 100ms | 100-300ms | > 300ms |
| CLS | < 0.1 | 0.1-0.25 | > 0.25 |
| FCP | < 1.8s | 1.8-3s | > 3s |
| TTFB | < 800ms | 800-1.8s | > 1.8s |
| INP | < 200ms | 200-500ms | > 500ms |

### Bundle Size:
- **Target**: < 200KB gzipped
- **Warning**: 200-300KB
- **Critical**: > 300KB

---

## 🎨 Component Library

### Buttons
```tsx
import { Button } from '@client/lib/design-system';

<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

### Cards
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@client/lib/design-system';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Badges
```tsx
import { Badge } from '@client/lib/design-system';

<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
```

---

## 🔄 Common Workflows

### Adding a New Feature
1. Check which personas it serves
2. Map user journey
3. Design mobile-first
4. Implement with accessibility
5. Add to welcome tour (if major)
6. Test with real users
7. Monitor adoption metrics

### Fixing a Bug
1. Reproduce issue
2. Check error logs
3. Fix with tests
4. Verify accessibility
5. Update documentation
6. Deploy with monitoring

### Optimizing Performance
1. Check performance dashboard
2. Identify bottlenecks
3. Optimize (code split, lazy load, etc.)
4. Verify budgets met
5. Monitor in production

---

## 📊 Metrics to Track

### User Engagement
- Sessions per week
- Time on site
- Feature adoption rate
- Return user rate

### Performance
- Core Web Vitals
- Page load time
- Time to interactive
- Error rate

### Accessibility
- Keyboard navigation success
- Screen reader compatibility
- Color contrast compliance
- WCAG conformance level

### User Satisfaction
- Feedback widget ratings
- Support ticket volume
- Task completion rate
- NPS score

---

## 🚨 Common Issues & Solutions

### Issue: Slow Page Load
**Solution**: 
- Check bundle size
- Implement code splitting
- Optimize images
- Enable caching

### Issue: Poor Mobile Experience
**Solution**:
- Test on real devices
- Optimize for 3G
- Increase touch targets
- Simplify navigation

### Issue: Accessibility Violations
**Solution**:
- Run axe DevTools
- Test with keyboard
- Test with screen reader
- Fix ARIA labels

### Issue: Low Feature Adoption
**Solution**:
- Add to welcome tour
- Improve discoverability
- Simplify UI
- Collect user feedback

---

## 📞 Quick Contacts

### For UX Issues
- **Email**: ux@chanuka.org
- **Slack**: #ux-team

### For Accessibility
- **Email**: accessibility@chanuka.org
- **Feedback Widget**: Bottom-right corner

### For Performance
- **Dashboard**: /admin/performance
- **Slack**: #performance

### For Documentation
- **Docs**: /docs
- **GitHub**: [repository]/docs

---

## 🔗 Quick Links

- [User Personas](./USER_PERSONAS.md)
- [User Journeys](./USER_JOURNEY_MAPS.md)
- [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)
- [Accessibility Statement](/accessibility)
- [Performance Dashboard](/admin/performance)
- [Design System](../lib/design-system/README.md)

---

**Last Updated**: March 5, 2026
**Owner**: UX Team
