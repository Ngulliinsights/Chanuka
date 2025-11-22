# Server Module Documentation

## Overview and Purpose

The server module is the backend API application that powers the Chanuka platform. It provides RESTful APIs, real-time WebSocket connections, and data processing services to support the client application. The server implements domain-driven design principles with clean architecture, focusing on constitutional analysis, argument intelligence, advocacy coordination, and institutional integration.

## Key Components and Subdirectories

### Core Domain Logic
- **`core/`** - Domain entities, value objects, and business logic
  - **`auth/`** - Authentication and authorization services
  - **`constitutional/`** - Constitutional analysis domain models
  - **`argumentation/`** - Argument extraction and analysis logic
  - **`advocacy/`** - Campaign and action coordination
  - **`errors/`** - Domain-specific error handling
  - **`services-init.ts`** - Core services initialization
  - **`types.ts`** - Core type definitions

### Feature Modules
- **`features/`** - Feature-specific implementations following clean architecture
  - **`admin/`** - Administrative functions and content moderation
  - **`advocacy/`** - Advocacy coordination and campaign management
  - **`alert-preferences/`** - User notification preferences
  - **`analysis/`** - Constitutional and legislative analysis services
  - **`argument-intelligence/`** - Argument processing and intelligence
  - **`bills/`** - Bill management and tracking
  - **`community/`** - Community engagement and discussion
  - **`constitutional-analysis/`** - Constitutional law analysis
  - **`constitutional-intelligence/`** - Advanced constitutional AI
  - **`notifications/`** - Notification system
  - **`privacy/`** - Privacy compliance and data management
  - **`recommendation/`** - Content recommendation engine
  - **`search/`** - Search functionality and indexing
  - **`security/`** - Security services and monitoring
  - **`sponsors/`** - Legislative sponsor analysis
  - **`users/`** - User management and profiles

### Infrastructure Layer
- **`infrastructure/`** - External concerns and integrations
  - **`adapters/`** - Data access adapters (Drizzle ORM)
  - **`cache/`** - Caching layer with Redis
  - **`database/`** - Database connection and configuration
  - **`errors/`** - Infrastructure error handling
  - **`external-data/`** - External API integrations
  - **`migration/`** - Database migration orchestration
  - **`monitoring/`** - Performance and health monitoring
  - **`notifications/`** - Email and SMS services
  - **`security/`** - Security middleware and services
  - **`socketio-service.ts`** - WebSocket service
  - **`websocket.ts`** - WebSocket configuration

### Application Layer
- **`middleware/`** - Express middleware for cross-cutting concerns
  - **`auth.ts`** - Authentication middleware
  - **`boom-error-middleware.ts`** - Error response formatting
  - **`cache-middleware.ts`** - HTTP caching
  - **`privacy-middleware.ts`** - Privacy compliance
  - **`rate-limiter.ts`** - API rate limiting
  - **`request-logger.ts`** - Request logging
  - **`security-middleware.ts`** - Security headers
  - **`server-error-integration.ts`** - Error handling integration

- **`routes/`** - API route definitions
  - **`regulatory-monitoring.ts`** - Regulatory monitoring endpoints

### Supporting Infrastructure
- **`config/`** - Environment-specific configurations
- **`demo/`** - Demonstration and example code
- **`docs/`** - API documentation and guides
- **`examples/`** - Code examples and usage patterns
- **`logs/`** - Application logging
- **`scripts/`** - Server-specific scripts
- **`services/`** - Shared services and utilities
- **`tests/`** - Server-side test suites
- **`types/`** - TypeScript type definitions
- **`utils/`** - Utility functions
- **`vitest.config.ts`** - Test configuration

## Technology Stack and Dependencies

### Runtime and Framework
- **Node.js** - JavaScript runtime environment
- **Express 4.21.2** - Web application framework
- **TypeScript 5.6.3** - Type-safe JavaScript

### Database and Data
- **PostgreSQL 8.16.3** - Primary relational database
- **Drizzle ORM 0.38.4** - Type-safe SQL query builder
- **Redis 5.9.0** - Caching and session storage
- **Neon Serverless** - Serverless PostgreSQL

### Real-time Communication
- **Socket.IO 4.8.1** - Real-time bidirectional communication
- **WebSocket** - Low-level WebSocket support

### Authentication and Security
- **Passport.js** - Authentication middleware
- **JWT (jsonwebtoken)** - JSON Web Token handling
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### External Integrations
- **AWS SNS** - SMS and notification services
- **Firebase Admin** - Firebase integration
- **OpenAI** - AI/ML services
- **Node-cron** - Scheduled tasks

### Development and Testing
- **Vitest** - Unit and integration testing
- **Supertest** - API testing utilities
- **Pino** - Structured logging
- **Boom** - HTTP-friendly error objects

### Validation and Processing
- **Joi** - Schema validation
- **Zod** - TypeScript-first validation
- **DOMPurify** - HTML sanitization
- **Natural** - Natural language processing
- **Compromise** - NLP library

## How it Relates to Other Modules

### Client Module
- **API Provider**: Serves REST APIs and WebSocket connections to the client
- **Authentication**: Provides OAuth and session management for client users
- **Real-time Data**: Pushes updates to client via WebSocket for live features
- **Data Synchronization**: Syncs offline client data when connection restored

### Shared Module
- **Schema Usage**: Imports and uses shared database schemas and types
- **Core Utilities**: Leverages shared validation, error handling, and utilities
- **Type Safety**: Maintains type consistency with shared TypeScript definitions

### Drizzle Module
- **Migration Execution**: Runs database migrations defined in drizzle module
- **Schema Integration**: Uses Drizzle-generated types and query builders
- **Database Operations**: Performs all database CRUD operations via Drizzle

### Scripts Module
- **Migration Scripts**: Uses database migration and setup scripts
- **Maintenance Scripts**: Leverages utility scripts for server operations
- **Deployment Scripts**: Integrates with deployment automation scripts

### Tests Module
- **Test Infrastructure**: Shares testing utilities and configurations
- **Integration Tests**: Runs API integration tests against server endpoints
- **Performance Tests**: Includes server performance benchmarking

### Deployment Module
- **Containerization**: Uses Docker configuration for containerized deployment
- **Environment Config**: Applies environment-specific configurations
- **Monitoring Setup**: Integrates with monitoring dashboards and alerts

## Notable Features and Patterns

### Clean Architecture
- **Domain-Driven Design**: Organized around business domains (constitutional, advocacy, etc.)
- **Dependency Inversion**: Infrastructure depends on domain, not vice versa
- **Layer Separation**: Clear separation between domain, application, and infrastructure

### Real-time Capabilities
- **WebSocket Integration**: Real-time bill updates, notifications, and live discussions
- **Connection Management**: Robust connection handling with Redis adapter for scaling
- **Event-Driven**: Event-based communication for real-time features

### Security First
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input sanitization and validation
- **Authentication Guards**: JWT-based authentication with refresh tokens
- **Security Monitoring**: Real-time security event monitoring and alerting

### Performance Optimization
- **Caching Layer**: Multi-tier caching with Redis and in-memory caches
- **Database Optimization**: Query optimization and connection pooling
- **Async Processing**: Non-blocking operations with proper error handling
- **Memory Management**: Efficient memory usage with cleanup mechanisms

### Error Handling
- **Structured Errors**: Consistent error response format with Boom
- **Error Recovery**: Automatic retry mechanisms and fallback strategies
- **Logging**: Comprehensive logging with Pino for debugging and monitoring
- **Monitoring**: Error tracking and alerting for production issues

### API Design
- **RESTful APIs**: Standard REST conventions with proper HTTP status codes
- **OpenAPI Documentation**: Swagger documentation for API endpoints
- **Versioning**: API versioning strategy for backward compatibility
- **Pagination**: Consistent pagination for list endpoints

### Scalability Features
- **Horizontal Scaling**: Stateless design supporting multiple instances
- **Database Sharding**: Support for database sharding as data grows
- **CDN Integration**: Static asset delivery optimization
- **Load Balancing**: Ready for load balancer deployment

### Institutional Integration
- **API Keys**: Secure API key management for institutional clients
- **Format Adapters**: Multiple output formats (PDF, Excel, JSON) for institutions
- **Subscription Management**: Tiered access control for different user types
- **Usage Tracking**: API usage monitoring and billing integration

### AI/ML Integration
- **Constitutional Analysis**: AI-powered constitutional provision matching
- **Argument Intelligence**: NLP for argument extraction and clustering
- **Search Optimization**: Intelligent search with semantic understanding
- **Recommendation Engine**: Content recommendation based on user behavior

### Monitoring and Observability
- **Health Checks**: Comprehensive health monitoring endpoints
- **Metrics Collection**: Performance and usage metrics
- **Logging Aggregation**: Centralized logging for debugging
- **Alert System**: Automated alerts for system issues