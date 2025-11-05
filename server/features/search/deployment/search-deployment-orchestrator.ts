/**
 * Search Deployment Orchestrator
 * 
 * Main orchestrator for deploying and validating search system improvements
 * with comprehensive A/B testing, monitoring, and rollback capabilities.
 * Implements task 3.4 requirements for Phase 2 search system deployment.
 */

import { searchDeploymentService } from './search-deployment.service.js';
import { searchPerformanceMonitor } from '../monitoring/search-performance-monitor.js';