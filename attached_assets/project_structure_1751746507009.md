# Chanuka Project Architecture - Optimized

## Root Structure

```plaintext
chanuka/
├── infra/                           # Infrastructure as Code
│   ├── terraform/                   # Cloud resources definitions
│   ├── k8s/                         # Kubernetes manifests by environment
│   └── monitoring/                  # Prometheus/Grafana dashboards
├── docs/                           
│   ├── architecture/                # System design diagrams (C4 model)
│   ├── api/                         # OpenAPI/Swagger specifications
│   └── user-guides/                 # End-user and admin documentation
├── chanuka-backend/                 # Backend microservices
│   ├── api-gateway/                 # API routing and versioning
│   ├── auth-service/                # Authentication and authorization
│   ├── user-service/                # User management and profiles
│   ├── consultation-service/        # Consultation management
│   ├── deliberation-service/        # Discussion and commenting system
│   ├── analytics-service/           # Data analysis and reporting
│   ├── coi-service/                 # Conflict of interest detection
│   ├── notification-service/        # Multi-channel alerts
│   ├── websocket-service/           # Real-time event streaming
│   └── lib/                         # Shared libraries and utilities
├── chanuka-frontend/                # Next.js application
│   ├── public/                      # Static assets
│   ├── src/                         # Application source code
│   └── config/                      # Build configurations
├── mobile/                          # React Native mobile application
├── shared/                          # Cross-platform shared code
│   ├── types/                       # TypeScript interfaces/types
│   ├── schemas/                     # Validation schemas (Zod)
│   └── api/                         # API client generators
├── scripts/                         # Development and deployment utilities
├── .github/                         # GitHub Actions CI/CD workflows
└── README.md                        # Project overview and setup guide
```

## Frontend Architecture (chanuka-frontend/)

```plaintext
chanuka-frontend/
├── public/                          # Static assets
│   ├── locales/                     # i18n translation files
│   ├── fonts/                       # Custom web fonts
│   └── images/                      # Static images and icons
├── src/
│   ├── pages/                       # Next.js page routes
│   │   ├── _app.tsx                 # App wrapper with providers
│   │   ├── _document.tsx            # Custom document for SSR HTML
│   │   ├── api/                     # API routes for SSR/edge functions
│   │   ├── consultations/           # Consultation pages
│   │   │   ├── [id]/                # Dynamic consultation routes
│   │   │   │   ├── index.tsx        # Main consultation view
│   │   │   │   ├── results.tsx      # Results visualization
│   │   │   │   └── discussion.tsx   # Discussion threads
│   │   │   └── index.tsx            # Consultation listing
│   │   ├── account/                 # User account pages
│   │   └── index.tsx                # Home/dashboard
│   ├── components/                  # UI components (organized by domain)
│   │   ├── common/                  # Shared UI components
│   │   │   ├── Button/              # Button component with variants
│   │   │   ├── Form/                # Form controls and validation
│   │   │   ├── Layout/              # Page layouts and containers
│   │   │   └── Navigation/          # Navigation components
│   │   ├── consultations/           # Consultation-specific components
│   │   ├── deliberation/            # Discussion UI components
│   │   ├── analytics/               # Charts and data visualization
│   │   └── notifications/           # Alert and messaging components
│   ├── hooks/                       # Custom React hooks
│   │   ├── api/                     # Data fetching hooks (SWR/React Query)
│   │   ├── auth/                    # Authentication hooks
│   │   ├── form/                    # Form handling hooks
│   │   └── ui/                      # UI state management hooks
│   ├── context/                     # React Context providers
│   │   ├── AuthContext.tsx          # Authentication state
│   │   ├── ConsultationContext.tsx  # Active consultation state
│   │   ├── ThemeContext.tsx         # Theme and appearance
│   │   └── OfflineContext.tsx       # Network status and sync queue
│   ├── services/                    # API clients and external services
│   │   ├── api/                     # Generated API clients
│   │   ├── storage/                 # Local storage abstraction
│   │   └── analytics/               # Analytics event tracking
│   ├── utils/                       # Pure utility functions
│   │   ├── formatting/              # Date, number, text formatting
│   │   ├── validation/              # Form validation schemas
│   │   ├── geo/                     # Geolocation utilities
│   │   └── testing/                 # Test helpers
│   ├── styles/                      # Global styles and Tailwind config
│   │   ├── globals.css              # Global CSS and Tailwind imports
│   │   └── themes/                  # Theme variants
│   ├── types/                       # TypeScript type definitions
│   │   ├── api.ts                   # API response/request types
│   │   ├── models.ts                # Domain models
│   │   └── common.ts                # Shared utility types
│   └── config/                      # Frontend configuration
│       ├── constants.ts             # App constants and feature flags
│       ├── routes.ts                # Route definitions and helpers
│       └── i18n.ts                  # Internationalization config
├── tests/                           # Test suites
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   ├── e2e/                         # End-to-end tests (Cypress)
│   └── fixtures/                    # Test data fixtures
├── .env.local                       # Local environment variables
├── .env.production                  # Production environment variables
├── next.config.js                   # Next.js configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── jest.config.js                   # Jest test configuration
└── package.json                     # Dependencies and scripts
```

## Backend Architecture (chanuka-backend/)

```plaintext
chanuka-backend/
├── api-gateway/                    # API Gateway service
│   ├── src/
│   │   ├── routes/                 # Route definitions and mappings
│   │   ├── middleware/             # Gateway middleware (auth, rate limiting)
│   │   ├── proxy/                  # Service proxying logic
│   │   └── config/                 # Gateway configuration
│   ├── Dockerfile                  # Container definition
│   └── package.json                # Dependencies
├── auth-service/                   # Authentication service
│   ├── src/
│   │   ├── controllers/            # Request handlers
│   │   ├── models/                 # Data models
│   │   ├── services/               # Business logic
│   │   ├── repositories/           # Data access layer
│   │   └── utils/                  # Utilities
│   ├── migrations/                 # Database migrations
│   ├── tests/                      # Service tests
│   ├── Dockerfile                  # Container definition
│   └── package.json                # Dependencies
├── user-service/                   # Similar structure as auth-service
├── consultation-service/           # Similar structure as auth-service
├── deliberation-service/           # Similar structure as auth-service
├── analytics-service/              # Similar structure as auth-service
├── coi-service/                    # Similar structure as auth-service
├── notification-service/           # Similar structure as auth-service
├── websocket-service/              # Similar structure as auth-service
└── lib/                            # Shared libraries
    ├── common/                     # Common utilities
    │   ├── src/
    │   │   ├── logging/            # Logging framework
    │   │   ├── errors/             # Error handling
    │   │   ├── validation/         # Input validation
    │   │   └── security/           # Security utilities
    │   └── package.json            # Dependencies
    ├── messaging/                  # Event bus abstraction
    ├── telemetry/                  # Metrics and tracing
    └── testing/                    # Testing utilities
```