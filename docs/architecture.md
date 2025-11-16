# Architecture Overview

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Client      │    │     Server      │    │    Database     │
│   (React SPA)   │◄──►│  (Express API)  │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ - React 18      │    │ - Express       │    │ - Drizzle ORM   │
│ - Vite          │    │ - TypeScript    │    │ - Migrations    │
│ - Tailwind CSS  │    │ - Authentication│    │ - Schemas       │
│ - React Query   │    │ - WebSockets    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Shared      │
                    │   (Utilities)   │
                    │                 │
                    │ - Types         │
                    │ - Schemas       │
                    │ - Validation    │
                    │ - Constants     │
                    └─────────────────┘
```

## Technology Stack

### Frontend (Client)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Redux Toolkit + React Query
- **Routing**: React Router
- **Testing**: Vitest + Testing Library

### Backend (Server)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT + Passport
- **Real-time**: Socket.IO
- **Testing**: Vitest + Supertest

### Shared
- **Database Schemas**: Drizzle schemas
- **Type Definitions**: Shared TypeScript types
- **Validation**: Zod schemas
- **Utilities**: Common helper functions

## Data Flow

1. **Client Request** → React component makes API call
2. **API Gateway** → Express router handles request
3. **Business Logic** → Service layer processes request
4. **Database** → Drizzle ORM queries PostgreSQL
5. **Response** → Data flows back through layers
6. **UI Update** → React Query updates component state

## Security

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection**: Drizzle ORM prevents SQL injection
- **XSS Protection**: Content Security Policy headers
- **CORS**: Configured for production domains

## Performance

- **Caching**: Redis for session and API caching
- **Database**: Optimized queries with indexes
- **Frontend**: Code splitting and lazy loading
- **CDN**: Static assets served via CDN
- **Compression**: Gzip/Brotli compression enabled

## Monitoring

- **Logging**: Structured logging with Pino
- **Metrics**: Performance monitoring
- **Health Checks**: Endpoint monitoring
- **Error Tracking**: Centralized error handling