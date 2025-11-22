# Client Module Documentation

## Overview and Purpose

The client module is the frontend React application that serves as the primary user interface for the Chanuka platform. It provides citizens with access to legislative information, constitutional analysis, community engagement features, and advocacy tools. The application is designed to be accessible, performant, and inclusive, supporting multiple languages and accessibility needs.

## Key Components and Subdirectories

### Core Structure
- **`src/`** - Main application source code
  - **`components/`** - Reusable UI components organized by feature
    - **`accessibility/`** - Accessibility management and settings
    - **`analysis/`** - Constitutional and legislative analysis displays
    - **`auth/`** - Authentication and user management components
    - **`bills/`** - Bill browsing, tracking, and detail views
    - **`community/`** - Community engagement and discussion features
    - **`dashboard/`** - User dashboard and analytics
    - **`error/`** - Error handling and fallback components
    - **`layout/`** - Application layout and navigation
    - **`loading/`** - Loading states and progress indicators
    - **`mobile/`** - Mobile-optimized components
    - **`notifications/`** - Notification center and alerts
    - **`privacy/`** - Privacy controls and settings
    - **`search/`** - Search functionality and interfaces
    - **`ui/`** - Base UI components (buttons, forms, etc.)
    - **`user/`** - User profile and management
    - **`verification/`** - Expert verification and credibility features

  - **`features/`** - Feature-specific modules with complete implementations
    - **`bills/`** - Bill management feature
    - **`community/`** - Community interaction feature
    - **`constitutional-analysis/`** - Constitutional analysis feature
    - **`search/`** - Intelligent search feature
    - **`users/`** - User management feature

  - **`pages/`** - Route-based page components
  - **`hooks/`** - Custom React hooks for data fetching and state management
  - **`services/`** - API client services and external integrations
  - **`store/`** - Redux store configuration and slices
  - **`types/`** - TypeScript type definitions
  - **`utils/`** - Utility functions and helpers
  - **`contexts/`** - React context providers
  - **`data/`** - Mock data and test fixtures

### Configuration and Build
- **`public/`** - Static assets and PWA files
- **`scripts/`** - Build and development scripts
- **`__tests__/`** - Test suites and configurations

## Technology Stack and Dependencies

### Core Framework
- **React 18.3.1** - Modern React with concurrent features
- **TypeScript 5.6.3** - Type-safe JavaScript development
- **Vite 5.4.15** - Fast build tool and development server

### UI and Styling
- **Tailwind CSS 3.4.14** - Utility-first CSS framework
- **Radix UI** - Accessible, unstyled UI primitives
- **Lucide React** - Icon library
- **Tailwind Animate** - Animation utilities
- **Recharts** - Data visualization components

### State Management
- **Redux Toolkit 2.10.1** - State management with RTK Query
- **React Query 5.81.5** - Server state management
- **Redux Persist** - State persistence

### Routing and Navigation
- **React Router DOM 7.7.0** - Client-side routing
- **Wouter 3.3.5** - Lightweight routing alternative

### Forms and Validation
- **React Hook Form 7.53.1** - Performant forms with easy validation
- **Zod 3.23.8** - TypeScript-first schema validation

### Performance and Monitoring
- **Web Vitals 5.1.0** - Core Web Vitals measurement
- **DataDog RUM** - Real user monitoring
- **Sentry** - Error tracking and performance monitoring

### Testing
- **Vitest 3.2.4** - Fast unit testing framework
- **Testing Library** - Component testing utilities
- **Playwright** - End-to-end testing
- **Jest Axe** - Accessibility testing

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## How it Relates to Other Modules

### Server Module
- **API Communication**: Consumes REST APIs and WebSocket connections from the server module
- **Authentication**: Integrates with server-side auth services
- **Data Synchronization**: Syncs community data and user interactions

### Shared Module
- **Type Definitions**: Uses shared TypeScript types and schemas
- **Database Types**: Imports Drizzle-generated types for type safety
- **Utility Functions**: Leverages shared utilities and validation schemas

### Docs Module
- **Documentation Integration**: Links to user guides and API documentation
- **Help Systems**: Embeds contextual help from documentation

### Scripts Module
- **Build Scripts**: Uses scripts for bundle analysis and optimization
- **Deployment**: Integrates with deployment scripts for CI/CD

### Tests Module
- **Test Infrastructure**: Shares test utilities and configurations
- **E2E Tests**: Runs end-to-end tests against the client application

## Notable Features and Patterns

### Accessibility First
- **WCAG 2.1 AA Compliance**: Comprehensive accessibility testing with Axe Core
- **Keyboard Navigation**: Full keyboard accessibility throughout the application
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast Support**: Accessible color schemes and themes
- **Focus Management**: Proper focus indicators and management

### Performance Optimization
- **Code Splitting**: Route-based and component-based code splitting
- **Lazy Loading**: Progressive loading of components and data
- **Bundle Analysis**: Automated bundle size monitoring and optimization
- **Service Workers**: Offline capability and caching strategies
- **Performance Budgets**: Automated performance regression detection

### Mobile-First Design
- **Responsive Design**: Mobile-first approach with progressive enhancement
- **Touch Gestures**: Swipe gestures and touch-optimized interactions
- **Offline Support**: PWA capabilities for offline usage
- **Progressive Web App**: Installable web application

### Internationalization
- **Multi-language Support**: English, Swahili, Kikuyu, Luo, and Kamba
- **Cultural Adaptation**: Context-specific examples and content
- **RTL Support**: Right-to-left language support infrastructure

### Real-time Features
- **WebSocket Integration**: Real-time bill updates and notifications
- **Live Data**: Real-time engagement metrics and community activity
- **Push Notifications**: Browser and mobile push notifications

### Advanced Search
- **Intelligent Search**: AI-powered search with natural language processing
- **Fuzzy Matching**: Approximate string matching for bill and content search
- **Saved Searches**: Persistent search preferences and history

### Error Handling
- **Graceful Degradation**: Fallback UI for failed operations
- **Error Boundaries**: Component-level error isolation
- **Recovery Mechanisms**: Automatic retry and recovery strategies
- **User Feedback**: Clear error messages and recovery instructions

### Security
- **Input Sanitization**: DOMPurify for XSS prevention
- **CSRF Protection**: Cross-site request forgery protection
- **Secure Storage**: Encrypted local storage for sensitive data
- **Authentication Guards**: Route protection and session management