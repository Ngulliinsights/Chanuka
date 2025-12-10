# Developer Onboarding Guide

## Welcome to the Chanuka Platform

Welcome to the Chanuka Platform development team! This comprehensive onboarding guide will help you get up and running with our legislative transparency platform. Whether you're a new hire, contractor, or open-source contributor, this guide provides everything you need to start contributing effectively.

## Prerequisites

Before you begin, ensure you have the following installed on your development machine:

### Required Software

- **Node.js**: Version 18.0 or higher
- **PNPM**: Package manager for the monorepo
- **Git**: Version control system
- **VS Code**: Recommended IDE with extensions

### System Requirements

- **Operating System**: macOS, Linux, or Windows 10/11
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: At least 10GB free space
- **Internet**: Stable broadband connection

## Environment Setup

### 1. Install PNPM

```bash
# Install PNPM globally
npm install -g pnpm

# Verify installation
pnpm --version
```

### 2. Clone the Repository

```bash
# Clone the monorepo
git clone https://github.com/chanuka-platform/chanuka.git
cd chanuka

# Install all dependencies
pnpm install
```

### 3. Environment Configuration

```bash
# Copy environment files
cp client/.env.development.example client/.env.development
cp server/.env.development.example server/.env.development

# Edit environment variables (see secure-environment-setup.md)
# Add your development API keys and configuration
```

### 4. Database Setup

```bash
# Start PostgreSQL (using Docker for development)
docker run --name chanuka-postgres \
  -e POSTGRES_DB=chanuka \
  -e POSTGRES_USER=chanuka \
  -e POSTGRES_PASSWORD=development \
  -p 5432:5432 \
  -d postgres:15

# Run database migrations
pnpm run db:migrate

# Seed development data
pnpm run db:seed
```

### 5. Start Development Environment

```bash
# Start all services
pnpm dev

# This will start:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:4200
# - Database: localhost:5432
```

## Project Structure Overview

### Monorepo Architecture

The Chanuka Platform uses a PNPM workspace monorepo structure:

```
chanuka-platform/
├── client/          # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   ├── tests/             # Unit and integration tests
│   └── package.json
├── server/          # Express.js backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Server utilities
│   └── package.json
├── shared/          # Shared code and types
│   ├── types/             # Shared TypeScript types
│   ├── constants/         # Shared constants
│   └── utils/             # Shared utilities
├── docs/            # Documentation
├── docker/          # Docker configurations
└── package.json     # Root workspace configuration
```

### Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Monorepo**: PNPM Workspaces, Nx
- **Testing**: Vitest, Playwright, Jest
- **Deployment**: Docker, Kubernetes

## Development Workflow

### 1. Branching Strategy

We use Git Flow with the following branches:

```bash
# Main branches
main          # Production-ready code
develop       # Integration branch

# Feature branches
feature/ISSUE-123-user-authentication
feature/ISSUE-456-bill-search

# Release branches
release/v1.2.0

# Hotfix branches
hotfix/ISSUE-789-critical-bug
```

### 2. Creating a Feature Branch

```bash
# Ensure you're on develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/ISSUE-123-new-feature

# Push to remote
git push -u origin feature/ISSUE-123-new-feature
```

### 3. Development Process

```bash
# Install dependencies for your changes
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### 4. Committing Changes

Follow conventional commit format:

```bash
# Good commit messages
git commit -m "feat: add user authentication flow"
git commit -m "fix: resolve bill search pagination bug"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify component state management"

# Bad commit messages
git commit -m "fixed stuff"
git commit -m "changes"
```

### 5. Pull Request Process

1. **Create PR**: Push your branch and create a pull request
2. **Description**: Include detailed description of changes
3. **Reviewers**: Assign appropriate team members
4. **Tests**: Ensure all tests pass
5. **Checks**: Verify CI/CD pipeline passes

## Code Quality Standards

### TypeScript Best Practices

```typescript
// ✅ Good: Explicit typing
interface User {
  id: string;
  name: string;
  email: string;
}

function createUser(data: User): Promise<User> {
  // Implementation
}

// ❌ Bad: Any types
function createUser(data: any): any {
  // Implementation
}
```

### React Component Patterns

```tsx
// ✅ Good: Functional component with hooks
import React, { useState, useEffect } from 'react';

interface BillListProps {
  status?: string;
  limit?: number;
}

export const BillList: React.FC<BillListProps> = ({ status, limit = 20 }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBills();
  }, [status, limit]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const response = await api.getBills({ status, limit });
      setBills(response.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? <Spinner /> : bills.map(bill => <BillCard key={bill.id} bill={bill} />)}
    </div>
  );
};
```

### API Design Patterns

```typescript
// Service layer pattern
class BillService {
  private api: APIClient;

  constructor(api: APIClient) {
    this.api = api;
  }

  async getBills(params: BillQueryParams): Promise<Bill[]> {
    const response = await this.api.get('/bills', { params });
    return response.data;
  }

  async getBill(id: string): Promise<Bill> {
    const response = await this.api.get(`/bills/${id}`);
    return response.data;
  }

  async createBill(data: CreateBillData): Promise<Bill> {
    const response = await this.api.post('/bills', data);
    return response.data;
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { BillCard } from './BillCard';

const mockBill = {
  id: 'bill-123',
  title: 'Digital Economy Bill 2025',
  status: 'introduced',
  sponsor: { name: 'Hon. Jane Doe' }
};

describe('BillCard', () => {
  it('renders bill information correctly', () => {
    render(<BillCard bill={mockBill} />);

    expect(screen.getByText('Digital Economy Bill 2025')).toBeInTheDocument();
    expect(screen.getByText('Hon. Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('introduced')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn();
    render(<BillCard bill={mockBill} onClick={mockOnClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledWith(mockBill);
  });
});
```

### Integration Tests

```typescript
// API integration test
describe('Bill API', () => {
  it('should fetch bills successfully', async () => {
    const response = await request(app)
      .get('/api/bills')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should create bill with valid data', async () => {
    const billData = {
      title: 'Test Bill',
      content: 'Test content',
      sponsorId: 'mp-123'
    };

    const response = await request(app)
      .post('/api/bills')
      .send(billData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Test Bill');
  });
});
```

### E2E Tests with Playwright

```typescript
// E2E test example
import { test, expect } from '@playwright/test';

test('user can browse bills', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for bills to load
  await page.waitForSelector('[data-testid="bill-list"]');

  // Check bill cards are displayed
  const billCards = page.locator('[data-testid="bill-card"]');
  await expect(billCards).toHaveCountGreaterThan(0);

  // Click on first bill
  await billCards.first().click();

  // Verify bill detail page
  await expect(page).toHaveURL(/\/bills\/bill-\d+/);
  await expect(page.locator('h1')).toContainText('Bill');
});
```

## Debugging and Development Tools

### Frontend Debugging

```typescript
// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[INFO] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    if (DEBUG) {
      console.error(`[ERROR] ${message}`, error);
    }
  }
};
```

### Backend Debugging

```typescript
// Debug middleware
import morgan from 'morgan';

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Error handling
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});
```

### VS Code Extensions

Recommended extensions for the project:

- **TypeScript and JavaScript Language Features**
- **ESLint**
- **Prettier**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**
- **GitLens**
- **Docker**
- **PostgreSQL**

## Deployment and DevOps

### Local Development

```bash
# Start all services
pnpm dev

# Start specific service
pnpm dev:client
pnpm dev:server

# Build for production
pnpm build

# Run production locally
pnpm start
```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run specific service
docker-compose up client
docker-compose up server
```

### CI/CD Pipeline

The project uses GitHub Actions for CI/CD:

- **Linting**: ESLint and Prettier checks
- **Testing**: Unit and integration tests
- **Build**: Production build verification
- **Security**: Dependency vulnerability scanning
- **Deployment**: Automatic deployment to staging/production

## Security Best Practices

### Code Security

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication and authorization
- Keep dependencies updated

### Development Security

```typescript
// Input validation
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});

export function validateUser(data: unknown) {
  return userSchema.parse(data);
}
```

## Getting Help

### Documentation Resources

- [API Documentation](./reference/API.md)
- [Architecture Guide](./detailed-architecture.md)
- [Testing Guide](./consolidated/testing-reference.md)
- [Deployment Guide](./infrastructure-guide.md)

### Communication Channels

- **Slack**: #dev-general, #dev-frontend, #dev-backend
- **GitHub Issues**: Bug reports and feature requests
- **Code Reviews**: All PRs require review
- **Standups**: Daily at 10 AM EAT

### Mentoring Program

- **Buddy System**: New developers are paired with experienced mentors
- **Code Reviews**: Learn from feedback on your PRs
- **Pair Programming**: Schedule sessions with team members

## Next Steps

### Week 1: Getting Comfortable

1. Complete environment setup
2. Explore the codebase structure
3. Run the application locally
4. Make your first small change
5. Submit your first pull request

### Week 2: First Contributions

1. Pick an issue from the backlog
2. Understand the requirements
3. Implement the feature or fix
4. Write appropriate tests
5. Submit for review

### Week 3: Independent Development

1. Take ownership of features
2. Participate in architecture decisions
3. Help review other developers' code
4. Contribute to documentation

## Code of Conduct

- **Respect**: Be respectful to all team members and contributors
- **Collaboration**: Work together effectively
- **Quality**: Maintain high standards in all work
- **Learning**: Continuously improve and help others learn
- **Security**: Prioritize security in all decisions

## Useful Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:client       # Start only frontend
pnpm dev:server       # Start only backend

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format with Prettier
pnpm type-check       # TypeScript type checking

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Drizzle Studio

# Build & Deploy
pnpm build            # Build all packages
pnpm build:client     # Build frontend
pnpm build:server     # Build backend
```

Welcome aboard! We're excited to have you join the Chanuka Platform team. If you have any questions, don't hesitate to ask in Slack or during standups.

---

*This guide is regularly updated. Last updated: December 2025*