# Development Workflow

## Daily Workflow

### Morning Routine

1. **Pull Latest Changes**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Check Sprint Board**
   - Review assigned tasks
   - Check priorities
   - Note blockers

3. **Daily Standup** (9:00 AM)
   - What did you do yesterday?
   - What will you do today?
   - Any blockers?

### During Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/TASK-123-description
   ```

2. **Write Code**
   - Follow coding standards
   - Write tests
   - Update documentation

3. **Commit Frequently**
   ```bash
   git add .
   git commit -m "feat: add feature description"
   ```

4. **Push to Remote**
   ```bash
   git push origin feature/TASK-123-description
   ```

### End of Day

1. **Push All Changes**
2. **Update Task Status**
3. **Document Blockers**
4. **Plan Tomorrow**

## Sprint Workflow

### Sprint Planning (Every 2 Weeks)

1. **Review Sprint Goals**
2. **Estimate Tasks**
3. **Commit to Sprint**
4. **Break Down Tasks**

### During Sprint

1. **Work on Committed Tasks**
2. **Attend Daily Standups**
3. **Update Task Status**
4. **Collaborate with Team**

### Sprint Review

1. **Demo Completed Work**
2. **Gather Feedback**
3. **Update Documentation**

### Sprint Retrospective

1. **What Went Well?**
2. **What Could Improve?**
3. **Action Items**

## Feature Development Workflow

### 1. Planning Phase

- [ ] Review requirements
- [ ] Review design specs
- [ ] Identify dependencies
- [ ] Estimate effort
- [ ] Break into subtasks

### 2. Design Phase

- [ ] Design API endpoints
- [ ] Design data models
- [ ] Design UI components
- [ ] Review with team
- [ ] Update documentation

### 3. Implementation Phase

**Backend:**
- [ ] Create database schema
- [ ] Implement services
- [ ] Create API routes
- [ ] Add validation
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Write integration tests

**Frontend:**
- [ ] Create hooks
- [ ] Create components
- [ ] Add routing
- [ ] Add error handling
- [ ] Write component tests
- [ ] Add accessibility

### 4. Testing Phase

- [ ] Run all tests
- [ ] Manual testing
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Performance testing
- [ ] Security testing

### 5. Review Phase

- [ ] Create pull request
- [ ] Request code review
- [ ] Address feedback
- [ ] Update documentation
- [ ] Get approval

### 6. Deployment Phase

- [ ] Merge to develop
- [ ] Deploy to staging
- [ ] Verify on staging
- [ ] Deploy to production
- [ ] Monitor metrics

## Code Review Workflow

### As Author

1. **Before Creating PR**
   ```bash
   # Run all checks
   npm run validate
   
   # Ensure tests pass
   npm test
   
   # Check for console logs
   git diff | grep console.log
   ```

2. **Create Pull Request**
   - Use PR template
   - Add clear description
   - Link related issues
   - Add screenshots
   - Request reviewers

3. **During Review**
   - Respond to comments
   - Make requested changes
   - Push updates
   - Re-request review

4. **After Approval**
   - Squash and merge
   - Delete branch
   - Update task status

### As Reviewer

1. **Review Checklist**
   - [ ] Code follows standards
   - [ ] Tests are adequate
   - [ ] No security issues
   - [ ] Performance is acceptable
   - [ ] Documentation is updated
   - [ ] No breaking changes

2. **Provide Feedback**
   - Be specific
   - Be constructive
   - Explain reasoning
   - Suggest alternatives
   - Ask questions

3. **Approval**
   - Approve when satisfied
   - Request changes if needed
   - Comment for discussion

## Testing Workflow

### Unit Testing

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test
npm test -- MyComponent.test.tsx
```

### Integration Testing

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm test -- tests/integration/advocacy.test.ts
```

### E2E Testing

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e:headed

# Run specific test
npm run test:e2e -- --spec "cypress/e2e/bills.cy.ts"
```

### Test-Driven Development (TDD)

1. **Write Test First**
   ```typescript
   it('should create campaign', () => {
     // Test implementation
   });
   ```

2. **Run Test (Should Fail)**
   ```bash
   npm test
   ```

3. **Write Implementation**
   ```typescript
   function createCampaign() {
     // Implementation
   }
   ```

4. **Run Test (Should Pass)**
   ```bash
   npm test
   ```

5. **Refactor**
   - Improve code
   - Keep tests passing

## Debugging Workflow

### Backend Debugging

1. **Add Breakpoints**
   - In VS Code
   - Or use `debugger` statement

2. **Start Debug Server**
   ```bash
   npm run dev:server:debug
   ```

3. **Attach Debugger**
   - Press F5 in VS Code
   - Or use Chrome DevTools

4. **Inspect Variables**
   - Check values
   - Step through code
   - Evaluate expressions

### Frontend Debugging

1. **Use React DevTools**
   - Inspect component tree
   - Check props and state
   - Profile performance

2. **Use Browser DevTools**
   - Console for logs
   - Network for API calls
   - Sources for breakpoints

3. **Add Debug Logs**
   ```typescript
   console.log('Debug:', { variable });
   ```

4. **Use React Query DevTools**
   - Inspect queries
   - Check cache
   - Monitor mutations

## Database Workflow

### Creating Migrations

```bash
# Create new migration
npm run db:migration:create -- --name add_campaigns_table

# Edit migration file
# server/infrastructure/database/migrations/XXXXXX_add_campaigns_table.ts
```

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:rollback

# Reset database (dev only)
npm run db:reset
```

### Seeding Data

```bash
# Seed development data
npm run db:seed

# Seed specific seeder
npm run db:seed -- --file campaigns.seed.ts
```

## Deployment Workflow

### Staging Deployment

1. **Merge to Develop**
   ```bash
   git checkout develop
   git merge feature/TASK-123-description
   git push origin develop
   ```

2. **Automatic Deployment**
   - CI/CD pipeline triggers
   - Runs tests
   - Deploys to staging

3. **Verify on Staging**
   - Test functionality
   - Check logs
   - Monitor metrics

### Production Deployment

1. **Create Release Branch**
   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update Version**
   ```bash
   npm version minor
   ```

3. **Create Pull Request**
   - To main branch
   - Request approvals

4. **Deploy to Production**
   - Merge to main
   - Tag release
   - Monitor deployment

5. **Post-Deployment**
   - Verify functionality
   - Monitor metrics
   - Check error logs

## Hotfix Workflow

### Critical Bug in Production

1. **Create Hotfix Branch**
   ```bash
   git checkout main
   git checkout -b hotfix/critical-bug
   ```

2. **Fix Bug**
   - Write fix
   - Add test
   - Verify locally

3. **Deploy Quickly**
   - Create PR to main
   - Get expedited review
   - Deploy immediately

4. **Backport to Develop**
   ```bash
   git checkout develop
   git merge hotfix/critical-bug
   ```

## Documentation Workflow

### Updating Documentation

1. **Identify What Needs Docs**
   - New features
   - API changes
   - Breaking changes
   - Configuration changes

2. **Write Documentation**
   - Clear and concise
   - Include examples
   - Add diagrams
   - Link related docs

3. **Review Documentation**
   - Technical accuracy
   - Clarity
   - Completeness

4. **Publish Documentation**
   - Commit to repo
   - Update website
   - Announce changes

## Monitoring Workflow

### During Development

1. **Check Logs**
   ```bash
   # Backend logs
   npm run logs:server
   
   # Frontend logs
   # Use browser console
   ```

2. **Monitor Performance**
   - Check API response times
   - Monitor database queries
   - Profile frontend rendering

### After Deployment

1. **Monitor Metrics**
   - Error rates
   - Response times
   - User activity

2. **Check Alerts**
   - Email notifications
   - Slack alerts
   - Dashboard warnings

3. **Investigate Issues**
   - Review error logs
   - Check stack traces
   - Reproduce bugs

## Best Practices

### Code Quality

- Write clean, readable code
- Follow coding standards
- Use meaningful names
- Keep functions small
- Add comments for complex logic

### Testing

- Write tests first (TDD)
- Test edge cases
- Maintain high coverage
- Keep tests fast
- Make tests readable

### Collaboration

- Communicate early and often
- Ask for help when stuck
- Share knowledge
- Review code thoroughly
- Be respectful

### Continuous Improvement

- Learn from mistakes
- Refactor regularly
- Update documentation
- Share learnings
- Suggest improvements

## Tools and Commands

### Useful Git Commands

```bash
# Stash changes
git stash
git stash pop

# Amend last commit
git commit --amend

# Interactive rebase
git rebase -i HEAD~3

# Cherry-pick commit
git cherry-pick <commit-hash>

# View commit history
git log --oneline --graph
```

### Useful npm Commands

```bash
# Clean install
npm ci

# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Audit security
npm audit

# Fix security issues
npm audit fix
```

### Useful Docker Commands

```bash
# Build image
docker build -t chanuka-platform .

# Run container
docker run -p 3000:3000 chanuka-platform

# View logs
docker logs <container-id>

# Execute command in container
docker exec -it <container-id> bash
```

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Database Connection Error:**
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
brew services restart postgresql@15
```

**Module Not Found:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Tests Failing:**
```bash
# Clear test cache
npm test -- --clearCache

# Run tests in band
npm test -- --runInBand
```

## Getting Help

- **Documentation**: Check docs first
- **Team Chat**: Ask in #dev-team
- **Pair Programming**: Schedule session
- **Stack Overflow**: Search for solutions
- **GitHub Issues**: Check existing issues
