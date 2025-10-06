# Chanuka Platform Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Database Connection Issues

#### Issue: "Database connection failed"
**Symptoms:**
- Application starts in demo mode unexpectedly
- Error messages about database connectivity
- Missing data or features

**Solutions:**
1. **Check Database URL Format**
   ```env
   # Correct format
   DATABASE_URL=postgresql://username:password@hostname:5432/database_name
   
   # Common mistakes to avoid
   DATABASE_URL=postgres://...  # Should be postgresql://
   DATABASE_URL=postgresql://user@host/db  # Missing password
   ```

2. **Verify Database Server Status**
   ```bash
   # Test connection manually
   psql -h hostname -p 5432 -U username -d database_name
   
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   # or
   brew services list | grep postgresql
   ```

3. **Check Firewall and Network**
   ```bash
   # Test port connectivity
   telnet hostname 5432
   # or
   nc -zv hostname 5432
   ```

4. **Database Permissions**
   ```sql
   -- Grant necessary permissions
   GRANT ALL PRIVILEGES ON DATABASE database_name TO username;
   GRANT ALL ON SCHEMA public TO username;
   ```

#### Issue: "Required tables missing"
**Solutions:**
1. **Run Database Migrations**
   ```bash
   npm run db:migrate
   # or
   npm run db:reset  # Caution: This will delete all data
   ```

2. **Check Migration Status**
   ```bash
   npm run db:status
   ```

3. **Manual Table Creation**
   ```bash
   # Run SQL files directly
   psql -h hostname -U username -d database_name -f drizzle/0000_initial_migration.sql
   ```

### Application Startup Issues

#### Issue: "Port already in use"
**Solutions:**
1. **Find and Kill Process**
   ```bash
   # Find process using port 5000
   lsof -i :5000
   # or on Windows
   netstat -ano | findstr :5000
   
   # Kill the process
   kill -9 <PID>
   # or on Windows
   taskkill /PID <PID> /F
   ```

2. **Change Port**
   ```env
   # In .env file
   PORT=3000
   ```

#### Issue: "Missing environment variables"
**Solutions:**
1. **Copy Example File**
   ```bash
   cp .env.example .env
   ```

2. **Required Variables Checklist**
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=your_jwt_secret_here
   SESSION_SECRET=your_session_secret_here
   NODE_ENV=production
   PORT=5000
   ```

3. **Generate Secure Secrets**
   ```bash
   # Generate random secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Build and Deployment Issues

#### Issue: "Build fails with TypeScript errors"
**Solutions:**
1. **Update Dependencies**
   ```bash
   npm install
   npm update
   ```

2. **Clear Cache**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node.js Version**
   ```bash
   node --version  # Should be 18+ 
   npm --version   # Should be 8+
   ```

4. **Fix TypeScript Errors**
   ```bash
   # Check for type errors
   npm run type-check
   
   # Fix common issues
   npm run lint:fix
   ```

#### Issue: "Docker build fails"
**Solutions:**
1. **Check Docker Status**
   ```bash
   docker --version
   docker-compose --version
   docker system info
   ```

2. **Clean Docker Cache**
   ```bash
   docker system prune -a
   docker-compose down --volumes
   ```

3. **Rebuild Containers**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Runtime Errors

#### Issue: "500 Internal Server Error"
**Solutions:**
1. **Check Server Logs**
   ```bash
   # Docker logs
   docker-compose logs app
   
   # Direct logs
   npm run logs
   ```

2. **Common Causes**
   - Missing environment variables
   - Database connection issues
   - Unhandled promise rejections
   - Memory issues

3. **Debug Mode**
   ```bash
   DEBUG=* npm start
   # or
   NODE_ENV=development npm start
   ```

#### Issue: "Authentication not working"
**Solutions:**
1. **Check JWT Configuration**
   ```env
   JWT_SECRET=your_secret_here  # Must be set
   SESSION_SECRET=your_session_secret  # Must be set
   ```

2. **Clear Browser Storage**
   - Clear localStorage and sessionStorage
   - Clear cookies for the domain
   - Try incognito/private browsing

3. **Check Token Expiration**
   ```javascript
   // In browser console
   localStorage.getItem('token')
   // Decode JWT to check expiration
   ```

### Performance Issues

#### Issue: "Slow page loading"
**Solutions:**
1. **Check Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

2. **Enable Caching**
   ```env
   REDIS_URL=redis://localhost:6379
   ENABLE_CACHING=true
   ```

3. **Optimize Bundle Size**
   ```bash
   # Analyze bundle
   ANALYZE=true npm run build
   
   # Check bundle sizes
   npm run bundle-analyzer
   ```

#### Issue: "High memory usage"
**Solutions:**
1. **Check Memory Limits**
   ```bash
   # Docker memory limits
   docker stats
   
   # Node.js memory usage
   node --max-old-space-size=4096 server/index.js
   ```

2. **Memory Leak Detection**
   ```bash
   # Enable memory profiling
   node --inspect server/index.js
   ```

### Navigation and UI Issues

#### Issue: "Navigation not working properly"
**Solutions:**
1. **Clear Browser Cache**
   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)
   - Clear browser cache and cookies
   - Disable browser extensions

2. **Check Console Errors**
   - Open browser developer tools
   - Look for JavaScript errors in console
   - Check network tab for failed requests

3. **Verify Navigation Context**
   ```javascript
   // In browser console
   console.log(window.location.pathname)
   // Check if NavigationProvider is working
   ```

#### Issue: "Mobile navigation problems"
**Solutions:**
1. **Check Viewport Meta Tag**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. **Test on Different Devices**
   - Use browser developer tools device emulation
   - Test on actual mobile devices
   - Check different screen sizes

3. **Touch Event Issues**
   - Ensure touch targets are at least 44px
   - Check for conflicting event handlers
   - Test touch vs click events

### Error Boundary Issues

#### Issue: "White screen of death"
**Solutions:**
1. **Check Error Boundaries**
   ```javascript
   // Look for error boundary logs in console
   console.error('Error boundary caught:', error)
   ```

2. **Component Error Debugging**
   ```bash
   # Enable React error overlay
   REACT_APP_SHOW_ERROR_OVERLAY=true npm start
   ```

3. **Fallback Component Issues**
   - Check if ErrorFallback component is working
   - Verify error boundary implementation
   - Test error recovery mechanisms

### Demo Mode Issues

#### Issue: "Demo mode not activating"
**Solutions:**
1. **Force Demo Mode**
   ```env
   FORCE_DEMO_MODE=true
   ```

2. **Check Demo Service**
   ```bash
   # Check demo service status
   curl http://localhost:5000/api/admin/demo-status
   ```

3. **Verify Demo Data Generation**
   ```bash
   # Check server logs for demo data initialization
   grep "demo" server.log
   ```

## 🔧 Diagnostic Commands

### System Health Check
```bash
# Complete system health check
npm run health-check

# Individual service checks
npm run check:database
npm run check:redis
npm run check:services
```

### Log Analysis
```bash
# View all logs
npm run logs

# Filter error logs
npm run logs:error

# Real-time log monitoring
npm run logs:watch
```

### Performance Monitoring
```bash
# Performance metrics
npm run metrics

# Memory usage
npm run memory-usage

# Database performance
npm run db:performance
```

## 🚨 Emergency Procedures

### Complete System Reset
```bash
# Stop all services
docker-compose down --volumes

# Clean everything
docker system prune -a
rm -rf node_modules
rm -rf dist

# Fresh installation
npm install
npm run build
docker-compose up -d --build
```

### Database Recovery
```bash
# Backup current database
pg_dump -h hostname -U username database_name > backup.sql

# Reset database
npm run db:reset

# Restore from backup
psql -h hostname -U username database_name < backup.sql
```

### Rollback Deployment
```bash
# Rollback to previous version
git checkout previous-tag
npm install
npm run build
docker-compose up -d --build
```

## 📞 Getting Help

### Log Collection
Before seeking help, collect these logs:
```bash
# Application logs
docker-compose logs app > app.log

# Database logs
docker-compose logs postgres > db.log

# System information
npm run system-info > system.log

# Error details
npm run error-report > errors.log
```

### Support Information
When reporting issues, include:
- Operating system and version
- Node.js and npm versions
- Docker and docker-compose versions
- Environment configuration (without secrets)
- Error messages and stack traces
- Steps to reproduce the issue
- Expected vs actual behavior

### Debug Mode
Enable comprehensive debugging:
```env
DEBUG=*
LOG_LEVEL=debug
NODE_ENV=development
VERBOSE_LOGGING=true
```

## 🔍 Monitoring and Alerts

### Health Monitoring
```bash
# Set up health check monitoring
curl -f http://localhost:5000/api/health || echo "Service down"

# Database health
curl -f http://localhost:5000/api/health/database || echo "Database down"

# Demo mode status
curl http://localhost:5000/api/health/demo-mode
```

### Automated Monitoring
```bash
# Set up monitoring script
#!/bin/bash
while true; do
  if ! curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "$(date): Service is down" >> monitoring.log
    # Send alert notification
  fi
  sleep 60
done
```

---

## 📋 Quick Reference

### Essential Commands
```bash
# Start application
npm start

# Development mode
npm run dev

# Build application
npm run build

# Run tests
npm test

# Database operations
npm run db:migrate
npm run db:reset
npm run db:seed

# Docker operations
docker-compose up -d
docker-compose down
docker-compose logs app
```

### Important Files
- `.env` - Environment configuration
- `docker-compose.yml` - Docker configuration
- `package.json` - Dependencies and scripts
- `drizzle/` - Database migrations
- `server/index.ts` - Main server file
- `client/src/App.tsx` - Main React component

### Key URLs
- Application: `http://localhost:5000`
- Health Check: `http://localhost:5000/api/health`
- Admin Panel: `http://localhost:5000/admin`
- API Documentation: `http://localhost:5000/api`

Remember: When in doubt, check the logs first! Most issues can be diagnosed by examining the application and database logs.