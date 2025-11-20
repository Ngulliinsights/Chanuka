#!/usr/bin/env node

import { 
  createDeploymentOrchestrator, 
  DeploymentPlan, 
  DeploymentPhase 
} from '../infrastructure/migration/deployment-orchestrator.js';
import { 
  createDeploymentMonitoringDashboard 
} from '../infrastructure/migration/deployment-monitoring-dashboard.js';
impo
