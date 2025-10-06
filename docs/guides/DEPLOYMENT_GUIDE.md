# Chanuka Platform Deployment Guide

## 🚀 Quick Deployment

The Chanuka Legislative Transparency Platform is now ready for deployment! Here are the available deployment options:

### Option 1: Docker Deployment (Recommended)

```bash
# 1. Build and start with Docker Compose
docker-compose up -d --build

# 2. Check status
docker-compose ps

# 3. View logs
docker-compose logs -f app
```

### Option 2: Manual Deployment

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your actual values

# 3. Build the application
npm run build

# 4. Run database migrations (if database is available)
npm run db:migrate

# 5. Start the application
npm start
```

### Option 3: Quick Deploy Script

```bash
# Make the script executable (Linux/Mac)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chanuka
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Security Configuration
JWT_SECRET=your_jwt_secret_here_make_it_long_and_random
SESSION_SECRET=your_session_secret_here_make_it_long_and_random

# Application Configuration
NODE_ENV=production
PORT=5000

# Feature Flags
ENABLE_AI_ANALYSIS=true
ENABLE_EXPERT_VERIFICATION=true
ENABLE_CONFLICT_DETECTION=true

# Logging
LOG_LEVEL=info
```

### Optional Environment Variables

```env
# API Keys (for enhanced features)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🏗️ Architecture Overview

The application consists of:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: In-memory cache (Redis optional)
- **Authentication**: JWT-based auth system
- **Real-time Features**: WebSocket support

## 📊 Features Implemented

### Core Features
- ✅ Bill tracking and analysis
- ✅ User authentication and profiles
- ✅ Comment system with threading
- ✅ Notification system
- ✅ Advanced search and filtering
- ✅ Admin dashboard
- ✅ Mobile-responsive design
- ✅ Real-time updates
- ✅ Bill engagement tracking
- ✅ User profile management

### Advanced Features
- ✅ Rate limiting and security
- ✅ Audit logging
- ✅ Caching system
- ✅ Error handling and monitoring
- ✅ Social integration framework
- ✅ Expert verification system
- ✅ Conflict detection
- ✅ Sponsorship analysis

## 🔒 Security Features

- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- SQL injection prevention
- XSS protection
- Audit logging for all actions

## 📱 Mobile Support

The application is fully responsive and includes:
- Mobile navigation
- Touch-friendly interface
- Optimized layouts for small screens
- Progressive Web App features

## 🚀 Deployment Platforms

### Supported Platforms

1. **Docker** (Recommended)
   - Complete containerized setup
   - Includes PostgreSQL and Redis
   - Production-ready configuration

2. **Railway**
   - Easy deployment with git integration
   - Automatic SSL certificates
   - Built-in PostgreSQL

3. **Render**
   - Free tier available
   - Automatic deployments
   - Built-in PostgreSQL

4. **Heroku**
   - Easy deployment
   - Add-on ecosystem
   - Automatic scaling

5. **DigitalOcean App Platform**
   - Managed deployment
   - Auto-scaling
   - Database integration

6. **AWS/GCP/Azure**
   - Full cloud deployment
   - Scalable infrastructure
   - Enterprise features

## 🔧 Production Optimizations

### Performance
- Gzip compression enabled
- Static asset caching
- Database connection pooling
- Query optimization
- Image optimization

### Monitoring
- Health check endpoints
- Error tracking
- Performance metrics
- Audit logging
- System status monitoring

### Security
- HTTPS enforcement
- Security headers
- Rate limiting
- Input validation
- Authentication middleware

## 📝 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connected and migrated
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Health checks passing
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Error tracking configured
- [ ] Performance monitoring active

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check firewall settings

2. **Build Errors**
   - Run `npm install` to update dependencies
   - Check Node.js version (requires 18+)
   - Clear node_modules and reinstall

3. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing processes on port 5000

4. **Missing Environment Variables**
   - Copy .env.example to .env
   - Fill in required values
   - Restart the application

### Support

For deployment issues or questions:
1. Check the logs: `docker-compose logs app`
2. Verify environment configuration
3. Check database connectivity
4. Review the troubleshooting section above

## 🎯 Next Steps

After successful deployment:

1. **Configure Admin User**
   - Create first admin account
   - Set up user roles and permissions

2. **Import Initial Data**
   - Load bill data
   - Set up sponsor information
   - Configure categories and tags

3. **Customize Settings**
   - Update branding and logos
   - Configure notification preferences
   - Set up integrations

4. **Monitor Performance**
   - Set up monitoring dashboards
   - Configure alerts
   - Review system metrics

---

🎉 **Congratulations!** Your Chanuka Legislative Transparency Platform is now ready for production use!