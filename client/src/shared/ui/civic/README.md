# Kenyan Civic Education Components

This directory contains components specifically designed for Kenyan civic education, providing culturally appropriate and linguistically accessible information about Kenya's political and legal systems.

## Components Overview

### 1. CivicEducationHub
**Main entry point for civic education content**

- **Purpose**: Central hub that provides access to all civic education materials
- **Features**: 
  - Topic selection with difficulty levels
  - Government statistics display
  - Cultural context information
  - Navigation to detailed components
- **Languages**: English and Kiswahili support
- **Requirements**: 10.4, 10.5

### 2. KenyanLegislativeProcess
**Detailed legislative process information**

- **Purpose**: Comprehensive guide to Kenya's law-making process
- **Features**:
  - Bill type explanations (ordinary, money, constitutional, county)
  - Process stage visualization
  - Public participation requirements
  - Cultural engagement methods
- **Interactive Elements**: Tabbed interface, bill type selector
- **Requirements**: 10.4, 10.5

### 3. LegislativeProcessGuide
**Simplified step-by-step guide**

- **Purpose**: User-friendly introduction to legislative processes
- **Features**:
  - 4-step process visualization
  - Interactive step navigation
  - Time estimates for each stage
  - Additional resources links
- **Target Audience**: Beginners and general public
- **Requirements**: 10.4, 10.5

### 4. CivicEducationCard
**Reusable topic cards**

- **Purpose**: Modular cards for different civic topics
- **Variants**: Default and compact layouts
- **Topics**: Constitution, Legislature, Government, Participation
- **Usage**: Can be embedded in dashboards or other components

## Context Integration

### KenyanContextProvider
**Cultural and legal context provider**

- **Government Structure**: National, county, and ward levels
- **Legal Processes**: Bill types, stages, participation requirements
- **Cultural Context**: Languages, communication patterns, civic engagement
- **Utilities**: Date/time formatting, currency formatting, localization

## Key Features

### 🌍 Cultural Adaptation
- **Bilingual Support**: English and Kiswahili throughout
- **Cultural Sensitivity**: Appropriate formality levels and respect terms
- **Local Context**: Kenyan government structure and legal framework

### 📚 Educational Design
- **Progressive Disclosure**: Information presented at appropriate complexity levels
- **Interactive Learning**: Step-by-step guides and interactive elements
- **Visual Aids**: Icons, progress indicators, and status visualization

### ♿ Accessibility
- **WCAG AA Compliance**: Proper ARIA labels and keyboard navigation
- **Screen Reader Support**: Semantic HTML and descriptive text
- **Color Contrast**: Meets accessibility standards

### 📱 Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Flexible Layouts**: Adapts to different screen sizes
- **Touch-Friendly**: Appropriate touch targets and interactions

## Usage Examples

### Basic Hub Integration
```tsx
import { CivicEducationHub } from '@client/shared/ui/civic';

function CivicPage() {
  return (
    <div className="container mx-auto p-4">
      <CivicEducationHub />
    </div>
  );
}
```

### Detailed Process Component
```tsx
import { KenyanLegislativeProcess } from '@client/shared/ui/civic';

function LegislationPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <KenyanLegislativeProcess className="mb-8" />
    </div>
  );
}
```

### Context Provider Setup
```tsx
import { KenyanContextProvider } from '@client/shared/ui/civic';

function App() {
  return (
    <KenyanContextProvider>
      {/* Your app components */}
    </KenyanContextProvider>
  );
}
```

## Testing

### Test Coverage
- **Unit Tests**: Component rendering and interaction
- **Integration Tests**: Context provider integration
- **Accessibility Tests**: WCAG compliance verification
- **Performance Tests**: Render time and responsiveness

### Running Tests
```bash
# Run all civic education tests
npm test -- civic

# Run specific component tests
npm test -- CivicEducationHub.test.tsx
```

## Localization

### Supported Languages
- **English (en)**: Primary language
- **Kiswahili (sw)**: National language of Kenya

### Adding Translations
1. Add translation keys to the i18n system
2. Update component text using the `useI18n` hook
3. Test both language variants

### Cultural Considerations
- **Formality Levels**: High formality for government content
- **Respect Terms**: Appropriate titles and honorifics
- **Communication Patterns**: Direct but respectful tone

## Performance

### Optimization Strategies
- **Code Splitting**: Components are lazy-loaded when needed
- **Memoization**: Context values and expensive calculations are memoized
- **Bundle Size**: Minimal dependencies and tree-shaking

### Performance Targets
- **Initial Render**: < 100ms
- **Language Switch**: < 50ms
- **Navigation**: < 200ms

## Future Enhancements

### Planned Features
- **Audio Content**: Spoken explanations in local languages
- **Video Guides**: Visual demonstrations of processes
- **Interactive Quizzes**: Knowledge assessment tools
- **Offline Support**: Content available without internet

### Extensibility
- **Additional Languages**: Support for more Kenyan languages
- **Regional Customization**: County-specific information
- **Integration Points**: APIs for external civic data

## Contributing

### Development Guidelines
1. **Cultural Sensitivity**: Ensure content is appropriate for Kenyan context
2. **Accessibility First**: All components must meet WCAG AA standards
3. **Bilingual Support**: All user-facing text must support both languages
4. **Testing Required**: Comprehensive test coverage for new features

### Code Style
- **TypeScript**: Strict typing for all components
- **React Best Practices**: Hooks, functional components, proper state management
- **Consistent Imports**: Use absolute imports with @client prefix

## Dependencies

### Core Dependencies
- **React**: UI framework
- **Lucide React**: Icon library
- **Design System**: Shared UI components

### Context Dependencies
- **i18n System**: Internationalization support
- **Kenyan Context**: Cultural and legal context provider

## License

This civic education system is designed specifically for Kenyan users and incorporates official government information and cultural considerations. Please ensure compliance with local regulations when using or modifying this content.
