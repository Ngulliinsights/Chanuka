# Developer Onboarding Guide

Welcome to the Chanuka Platform development team! This guide will help you get up and running quickly.

## Onboarding Checklist

### Week 1: Setup & Orientation

- [ ] Complete environment setup
- [ ] Clone repository and run locally
- [ ] Review architecture documentation
- [ ] Complete code walkthrough
- [ ] Set up development tools
- [ ] Join team communication channels
- [ ] Review coding standards
- [ ] Complete first small task

### Week 2: Feature Development

- [ ] Review feature documentation
- [ ] Understand testing strategy
- [ ] Complete first feature task
- [ ] Submit first pull request
- [ ] Participate in code review
- [ ] Learn deployment process

### Week 3: Integration

- [ ] Work on integrated feature
- [ ] Collaborate with team members
- [ ] Participate in sprint planning
- [ ] Complete assigned sprint tasks

### Week 4: Independence

- [ ] Lead feature development
- [ ] Mentor new developers
- [ ] Contribute to documentation
- [ ] Participate in architecture discussions

## Prerequisites

### Required Knowledge

- **JavaScript/TypeScript**: Strong proficiency
- **React**: Experience with React 18+ and hooks
- **Node.js**: Backend development experience
- **SQL**: Database query knowledge
- **Git**: Version control proficiency

### Recommended Knowledge

- **PostgreSQL**: Database administration
- **Redis**: Caching strategies
- **Docker**: Containerization
- **Testing**: Jest, Vitest, React Testing Library
- **CI/CD**: GitHub Actions

## Environment Setup

### 1. System Requirements

**Operating System:**
- macOS 12+ (recommended)
- Ubuntu 20.04+ 
- Windows 10+ with WSL2

**Software:**
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- PostgreSQL 15+
- Redis 7+
- Git 2.30+
- Docker 20+ (optional but recommended)

### 2. Install Dependencies

**macOS:**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18

# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Install Redis
brew install redis
brew services start redis

# Install Docker Desktop
brew install --cask docker
```

**Ubuntu:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql-15 postgresql-contrib
sudo systemctl start postgresql

# Install Redis
sudo apt-get install redis-server
sudo systemctl start redis

# Install Docker
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
```

**Windows (WSL2):**
```bash
# Follow Ubuntu instructions in WSL2
# Install Docker Desktop for Windows
```

### 3. Clone Repository

```bash
# Clone the repository
git clone https://github.com/chanuka/platform.git
cd platform

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 4. Configure Environment

Edit `.env` file:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/chanuka_dev

# Redis
REDIS_URL=redis://localhost:6379

# API Keys (get from team lead)
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# Feature Flags
FEATURE_FLAGS_ENABLED=true

# Development
NODE_ENV=development
PORT=3000
```

### 5. Database Setup

```bash
# Create database
npm run db:create

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 6. Start Development Server

```bash
# Start backend
npm run dev:server

# In another terminal, start frontend
npm run dev:client

# Or start both concurrently
npm run dev
```

### 7. Verify Setup

Visit http://localhost:3000 and verify:
- [ ] Application loads
- [ ] Can view bills
- [ ] Can create account
- [ ] Can log in
- [ ] Features are accessible

## Development Workflow

### 1. Branch Strategy

We use Git Flow:

```
main (production)
  ↓
develop (integration)
  ↓
feature/TASK-123-feature-name (your work)
```

**Creating a feature branch:**
```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/TASK-123-short-description

# Work on your feature
git add .
git commit -m "feat: add feature description"

# Push to remote
git push origin feature/TASK-123-short-description
```

### 2. Commit Message Convention

We follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```bash
feat(advocacy): add campaign creation UI
fix(bills): resolve pagination issue
docs(api): update constitutional intelligence API docs
test(advocacy): add campaign service tests
```

### 3. Code Review Process

1. **Create Pull Request**
   - Use PR template
   - Link related issues
   - Add screenshots for UI changes
   - Request reviewers

2. **Address Feedback**
   - Respond to all comments
   - Make requested changes
   - Push updates
   - Re-request review

3. **Merge**
   - Squash and merge (preferred)
   - Delete branch after merge

### 4. Testing Strategy

**Before submitting PR:**
```bash
# Run all tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run formatting
npm run format

# Run all checks
npm run validate
```

**Test Coverage Requirements:**
- Unit tests: > 80%
- Integration tests: Critical paths
- E2E tests: User workflows

### 5. Development Tools

**Recommended VS Code Extensions:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GitLens
- Thunder Client (API testing)
- Error Lens
- Auto Rename Tag
- Path Intellisense

**VS Code Settings:**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Project Structure

```
platform/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── app/           # App shell and routing
│   │   ├── features/      # Feature modules
│   │   │   ├── advocacy/
│   │   │   ├── bills/
│   │   │   ├── constitutional-intelligence/
│   │   │   └── ...
│   │   ├── lib/           # Shared utilities
│   │   └── infrastructure/ # Core infrastructure
│   └── public/            # Static assets
├── server/                # Backend application
│   ├── features/          # Feature modules
│   │   ├── advocacy/
│   │   ├── bills/
│   │   └── ...
│   ├── infrastructure/    # Core infrastructure
│   │   ├── database/
│   │   ├── cache/
│   │   └── observability/
│   └── middleware/        # Express middleware
├── shared/                # Shared code
│   ├── domain/           # Domain models
│   └── types/            # Shared types
├── tests/                # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/                 # Documentation
```

## Code Examples

### Creating a New Feature

#### 1. Backend Service

```typescript
// server/features/my-feature/application/my-service.ts
import { logger } from '@server/infrastructure/observability';

export class MyService {
  async doSomething(input: string): Promise<string> {
    try {
      logger.info('Doing something', { input });
      
      // Business logic here
      const result = input.toUpperCase();
      
      return result;
    } catch (error) {
      logger.error('Failed to do something', { error });
      throw error;
    }
  }
}

export const myService = new MyService();
```

#### 2. API Routes

```typescript
// server/features/my-feature/routes.ts
import { Router } from 'express';
import { myService } from './application/my-service';

const router = Router();

router.post('/my-endpoint', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input required' });
    }
    
    const result = await myService.doSomething(input);
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

#### 3. React Hook

```typescript
// client/src/features/my-feature/hooks/useMyFeature.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@client/services/apiService';

export function useMyFeature() {
  return useQuery({
    queryKey: ['my-feature'],
    queryFn: async () => {
      const response = await api.get('/api/my-feature');
      return response.data;
    },
  });
}

export function useDoSomething() {
  return useMutation({
    mutationFn: async (input: string) => {
      const response = await api.post('/api/my-feature/my-endpoint', { input });
      return response.data;
    },
  });
}
```

#### 4. React Component

```typescript
// client/src/features/my-feature/ui/MyComponent.tsx
import React from 'react';
import { Button } from '@client/lib/design-system';
import { useDoSomething } from '../hooks/useMyFeature';

export function MyComponent() {
  const doSomethingMutation = useDoSomething();
  
  const handleClick = () => {
    doSomethingMutation.mutate('hello');
  };
  
  return (
    <div>
      <h1>My Feature</h1>
      <Button onClick={handleClick} disabled={doSomethingMutation.isPending}>
        {doSomethingMutation.isPending ? 'Processing...' : 'Do Something'}
      </Button>
      {doSomethingMutation.data && (
        <p>Result: {doSomethingMutation.data.result}</p>
      )}
    </div>
  );
}
```

#### 5. Tests

```typescript
// client/src/features/my-feature/__tests__/MyComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../ui/MyComponent';

vi.mock('../hooks/useMyFeature', () => ({
  useDoSomething: () => ({
    mutate: vi.fn(),
    isPending: false,
    data: null,
  }),
}));

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('My Feature')).toBeInTheDocument();
  });
  
  it('should handle button click', async () => {
    const { useDoSomething } = require('../hooks/useMyFeature');
    const mutateMock = vi.fn();
    useDoSomething.mockReturnValue({ mutate: mutateMock, isPending: false });
    
    render(<MyComponent />);
    
    const button = screen.getByRole('button', { name: /do something/i });
    await userEvent.click(button);
    
    expect(mutateMock).toHaveBeenCalledWith('hello');
  });
});
```

## Best Practices

### Code Quality

1. **TypeScript**: Use strict mode, avoid `any`
2. **Naming**: Use descriptive names, follow conventions
3. **Functions**: Keep functions small and focused
4. **Comments**: Explain why, not what
5. **Error Handling**: Always handle errors gracefully

### Performance

1. **Database**: Use indexes, optimize queries
2. **Caching**: Cache expensive operations
3. **Lazy Loading**: Load components on demand
4. **Memoization**: Use React.memo, useMemo, useCallback
5. **Bundle Size**: Monitor and optimize

### Security

1. **Input Validation**: Validate all user input
2. **Authentication**: Verify user identity
3. **Authorization**: Check permissions
4. **SQL Injection**: Use parameterized queries
5. **XSS**: Sanitize user content

### Testing

1. **Unit Tests**: Test individual functions
2. **Integration Tests**: Test feature workflows
3. **E2E Tests**: Test user journeys
4. **Test Coverage**: Aim for > 80%
5. **Test Quality**: Write meaningful tests

### Documentation

1. **Code Comments**: Document complex logic
2. **API Docs**: Document all endpoints
3. **README**: Keep README up to date
4. **Changelog**: Document changes
5. **Architecture**: Document design decisions

## Common Tasks

### Adding a New API Endpoint

1. Create service in `server/features/{feature}/application/`
2. Create route in `server/features/{feature}/routes.ts`
3. Register route in `server/app.ts`
4. Add tests in `tests/integration/`
5. Document in `docs/integration/api/`

### Adding a New UI Component

1. Create component in `client/src/features/{feature}/ui/`
2. Create hook if needed in `client/src/features/{feature}/hooks/`
3. Add to feature index in `client/src/features/{feature}/index.ts`
4. Add tests in `client/src/features/{feature}/__tests__/`
5. Update Storybook if applicable

### Running Database Migrations

```bash
# Create migration
npm run db:migration:create -- --name add_new_table

# Run migrations
npm run db:migrate

# Rollback migration
npm run db:migrate:rollback
```

### Debugging

**Backend:**
```bash
# Start with debugger
npm run dev:server:debug

# Attach VS Code debugger (F5)
```

**Frontend:**
```bash
# Use React DevTools
# Use browser DevTools
# Add console.log or debugger statements
```

## Resources

### Documentation

- [Architecture Overview](./integration/architecture.md)
- [API Documentation](./integration/api/README.md)
- [Feature Documentation](./integration/README.md)
- [Testing Guide](./integration/testing-guide.md)

### External Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Tanstack Query](https://tanstack.com/query/latest)

### Team Resources

- **Slack**: #dev-team
- **GitHub**: https://github.com/chanuka/platform
- **Jira**: https://chanuka.atlassian.net
- **Confluence**: https://chanuka.atlassian.net/wiki

## Getting Help

### When Stuck

1. **Check Documentation**: Review relevant docs
2. **Search Codebase**: Look for similar implementations
3. **Ask Team**: Post in #dev-team Slack channel
4. **Pair Programming**: Schedule pairing session
5. **Create Issue**: Document the problem

### Code Review

- Be respectful and constructive
- Explain your reasoning
- Ask questions to understand
- Suggest improvements
- Approve when satisfied

### Escalation

If blocked for > 4 hours:
1. Post in #dev-team
2. Tag team lead
3. Schedule sync meeting

## Next Steps

After completing onboarding:

1. **Pick First Task**: Choose from sprint backlog
2. **Set Up 1-on-1s**: Schedule with team lead
3. **Join Ceremonies**: Attend standups, planning, retros
4. **Contribute**: Submit PRs, review code, improve docs
5. **Learn**: Explore codebase, ask questions, grow

Welcome to the team! 🎉
