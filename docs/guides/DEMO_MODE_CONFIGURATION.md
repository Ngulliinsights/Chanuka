# Demo Mode Configuration Guide

## Overview

The Chanuka Legislative Transparency Platform includes a robust demo mode that allows the application to run with sample data when a database connection is not available. This ensures the platform remains functional for development, testing, and demonstration purposes.

## How Demo Mode Works

### Automatic Activation

Demo mode is automatically activated when:
- Database connection fails during startup
- `DATABASE_URL` is not configured or invalid
- Required database tables are missing
- Database server is unreachable

### Manual Activation

You can manually enable demo mode by:

1. **Environment Variable**:
   ```env
   FORCE_DEMO_MODE=true
   ```

2. **API Endpoint** (Admin only):
   ```bash
   POST /api/admin/demo-mode
   {
     "enabled": true
   }
   ```

3. **Server Configuration**:
   ```javascript
   // In server startup
   databaseFallbackService.setDemoMode(true);
   ```

## Demo Data Features

### Legislative Data
- **Sample Bills**: 50+ realistic legislative bills with complete metadata
- **Sponsors**: Comprehensive sponsor information with relationships
- **Categories**: All major legislative categories represented
- **Status Tracking**: Bills in various stages of the legislative process
- **Voting Records**: Sample voting patterns and history

### User Data
- **Sample Users**: Pre-configured user accounts for testing
- **User Roles**: Examples of all user types (public, citizen, expert, admin)
- **User Profiles**: Complete profile information and preferences
- **Authentication**: Functional login system with demo credentials

### Community Features
- **Comments**: Sample community discussions and feedback
- **Expert Verification**: Example expert analysis and verification
- **Engagement Metrics**: Realistic user engagement data
- **Notifications**: Sample notification system data

### Analytics Data
- **Bill Engagement**: Sample tracking and analytics data
- **User Journey**: Example user behavior patterns
- **Performance Metrics**: Simulated system performance data
- **Audit Logs**: Sample audit trail information

## Configuration Options

### Environment Variables

```env
# Demo Mode Configuration
FORCE_DEMO_MODE=false              # Force demo mode regardless of database
DEMO_DATA_REFRESH_INTERVAL=3600000 # Refresh demo data every hour (ms)
DEMO_MODE_BANNER=true              # Show demo mode banner in UI
DEMO_USER_REGISTRATION=true        # Allow new user registration in demo mode
DEMO_ADMIN_ACCESS=true             # Enable admin features in demo mode

# Demo Data Customization
DEMO_BILLS_COUNT=50                # Number of sample bills to generate
DEMO_USERS_COUNT=25                # Number of sample users to create
DEMO_COMMENTS_COUNT=200            # Number of sample comments to generate
DEMO_SPONSORS_COUNT=30             # Number of sample sponsors to create
```

### Runtime Configuration

```javascript
// Configure demo mode settings
const demoConfig = {
  refreshInterval: 3600000,        // 1 hour
  showBanner: true,                // Show demo mode indicator
  allowRegistration: true,         // Allow new user registration
  enableAdminFeatures: true,       // Enable admin functionality
  dataGeneration: {
    bills: 50,
    users: 25,
    comments: 200,
    sponsors: 30
  }
};
```

## Demo Mode Indicators

### Visual Indicators

1. **Banner Notification**:
   - Prominent banner at top of application
   - "Demo Mode" indicator in navigation
   - Watermark on data visualizations

2. **UI Elements**:
   - Demo badge on user profiles
   - Sample data disclaimers
   - Limited functionality notices

3. **Admin Dashboard**:
   - Demo mode status indicator
   - Database connection status
   - Option to retry database connection

### API Responses

All API responses in demo mode include:
```json
{
  "data": { ... },
  "meta": {
    "demoMode": true,
    "message": "This is sample data for demonstration purposes",
    "databaseStatus": "disconnected"
  }
}
```

## Switching Between Modes

### From Demo to Database Mode

1. **Configure Database**:
   ```env
   DATABASE_URL=postgresql://user:pass@host:port/db
   ```

2. **Restart Application**:
   ```bash
   npm restart
   # or
   docker-compose restart
   ```

3. **Force Reconnection** (Admin):
   ```bash
   POST /api/admin/database/reconnect
   ```

### From Database to Demo Mode

1. **Manual Switch** (Admin):
   ```bash
   POST /api/admin/demo-mode
   { "enabled": true }
   ```

2. **Environment Override**:
   ```env
   FORCE_DEMO_MODE=true
   ```

## Demo User Accounts

### Pre-configured Accounts

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | admin@demo.com | demo123 | Full administrative access |
| Expert | expert@demo.com | demo123 | Expert verification privileges |
| Citizen | citizen@demo.com | demo123 | Standard user account |
| Journalist | journalist@demo.com | demo123 | Media/journalist account |
| Advocate | advocate@demo.com | demo123 | Advocacy organization account |

### Account Features

- **Full Functionality**: All user features work in demo mode
- **Profile Management**: Complete profile editing capabilities
- **Preferences**: User preference persistence (session-based)
- **Authentication**: JWT-based authentication system
- **Role-based Access**: Proper role-based feature access

## Data Persistence

### Session-based Storage

In demo mode, data changes are stored in:
- **Memory**: Runtime data modifications
- **Session Storage**: User preferences and temporary data
- **Local Storage**: User interface preferences

### Data Refresh

Demo data is refreshed:
- **Automatically**: Every hour (configurable)
- **On Restart**: Application restart resets all demo data
- **Manually**: Admin can trigger data refresh

## Limitations in Demo Mode

### Data Persistence
- ❌ Data changes are not permanently saved
- ❌ User registrations are session-only
- ❌ File uploads are not persisted
- ❌ Email notifications are simulated

### External Integrations
- ❌ Real-time legislative data feeds disabled
- ❌ External API integrations disabled
- ❌ Email service integrations disabled
- ❌ Third-party authentication disabled

### Performance Features
- ❌ Database-level caching disabled
- ❌ Advanced analytics limited
- ❌ Bulk operations restricted
- ❌ Background job processing limited

## Development Usage

### Local Development

```bash
# Start in demo mode for development
FORCE_DEMO_MODE=true npm run dev

# Or use environment file
echo "FORCE_DEMO_MODE=true" >> .env.local
npm run dev
```

### Testing

```bash
# Run tests with demo data
npm run test:demo

# Integration tests with demo mode
npm run test:integration:demo
```

### Staging Environment

```bash
# Deploy staging with demo mode
FORCE_DEMO_MODE=true npm run deploy:staging
```

## Monitoring Demo Mode

### Health Checks

```bash
# Check demo mode status
GET /api/health
{
  "status": "healthy",
  "database": {
    "connected": false,
    "demoMode": true
  },
  "services": {
    "demoData": "active",
    "fallback": "enabled"
  }
}
```

### Admin Dashboard

The admin dashboard provides:
- Demo mode status indicator
- Database connection attempts
- Demo data refresh controls
- System health monitoring
- Error logs and diagnostics

## Troubleshooting Demo Mode

### Common Issues

1. **Demo Mode Not Activating**
   - Check `FORCE_DEMO_MODE` environment variable
   - Verify database connection is actually failing
   - Check server logs for initialization errors

2. **Missing Demo Data**
   - Restart the application to regenerate data
   - Check demo data service initialization
   - Verify demo data configuration settings

3. **Authentication Issues**
   - Use pre-configured demo accounts
   - Check JWT secret configuration
   - Verify session storage is working

4. **Performance Issues**
   - Reduce demo data generation counts
   - Increase refresh interval
   - Check memory usage and limits

### Debug Commands

```bash
# Check demo mode status
curl http://localhost:5000/api/admin/demo-status

# Force demo data refresh
curl -X POST http://localhost:5000/api/admin/demo-refresh

# Get demo configuration
curl http://localhost:5000/api/admin/demo-config
```

## Best Practices

### Development
- Use demo mode for initial development and testing
- Test both demo and database modes regularly
- Keep demo data realistic and comprehensive
- Document demo-specific features and limitations

### Deployment
- Never deploy production with `FORCE_DEMO_MODE=true`
- Use demo mode for staging and testing environments
- Monitor database connection health in production
- Have fallback procedures for database failures

### User Experience
- Clearly indicate when in demo mode
- Provide instructions for full functionality
- Explain data limitations and refresh behavior
- Offer easy transition to full mode

---

## Support

For demo mode configuration issues:
1. Check server logs for initialization errors
2. Verify environment variable configuration
3. Test database connectivity separately
4. Review the troubleshooting section above
5. Contact support with specific error messages

Demo mode ensures your Chanuka platform remains accessible and functional even when database connectivity is unavailable, providing a seamless experience for users and administrators.