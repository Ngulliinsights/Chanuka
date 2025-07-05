import { 
  users, projects, checkpoints, featureFlags, analyticsMetrics, 
  pivotDecisions, architectureComponents,
  type User, type InsertUser, type Project, type InsertProject,
  type Checkpoint, type InsertCheckpoint, type FeatureFlag, type InsertFeatureFlag,
  type AnalyticsMetric, type InsertAnalyticsMetric, type PivotDecision, type InsertPivotDecision,
  type ArchitectureComponent, type InsertArchitectureComponent
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;

  // Checkpoint methods
  getCheckpoints(projectId: number): Promise<Checkpoint[]>;
  getCheckpoint(id: number): Promise<Checkpoint | undefined>;
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  updateCheckpoint(id: number, checkpoint: Partial<Checkpoint>): Promise<Checkpoint | undefined>;

  // Feature flag methods
  getFeatureFlags(projectId: number): Promise<FeatureFlag[]>;
  getFeatureFlag(id: number): Promise<FeatureFlag | undefined>;
  createFeatureFlag(featureFlag: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(id: number, featureFlag: Partial<FeatureFlag>): Promise<FeatureFlag | undefined>;

  // Analytics methods
  getAnalyticsMetrics(projectId: number): Promise<AnalyticsMetric[]>;
  createAnalyticsMetric(metric: InsertAnalyticsMetric): Promise<AnalyticsMetric>;

  // Pivot decision methods
  getPivotDecisions(projectId: number): Promise<PivotDecision[]>;
  createPivotDecision(decision: InsertPivotDecision): Promise<PivotDecision>;
  updatePivotDecision(id: number, decision: Partial<PivotDecision>): Promise<PivotDecision | undefined>;

  // Architecture component methods
  getArchitectureComponents(projectId: number): Promise<ArchitectureComponent[]>;
  createArchitectureComponent(component: InsertArchitectureComponent): Promise<ArchitectureComponent>;
  updateArchitectureComponent(id: number, component: Partial<ArchitectureComponent>): Promise<ArchitectureComponent | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private checkpoints: Map<number, Checkpoint>;
  private featureFlags: Map<number, FeatureFlag>;
  private analyticsMetrics: Map<number, AnalyticsMetric>;
  private pivotDecisions: Map<number, PivotDecision>;
  private architectureComponents: Map<number, ArchitectureComponent>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.checkpoints = new Map();
    this.featureFlags = new Map();
    this.analyticsMetrics = new Map();
    this.pivotDecisions = new Map();
    this.architectureComponents = new Map();
    this.currentId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample project
    const project: Project = {
      id: 1,
      name: "Chanuka Legislative Platform",
      description: "A transparent platform for legislative analysis and civic engagement",
      currentPhase: "Phase 2: Feature Development",
      status: "active",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      updatedAt: new Date()
    };
    this.projects.set(1, project);

    // Create sample checkpoints
    const checkpoints = [
      {
        id: 1,
        projectId: 1,
        name: "Phase 1: Authentication System",
        description: "Complete user authentication, session management, and OAuth integration",
        phase: "Phase 1",
        status: "completed",
        targetDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        completedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        successRate: 98,
        metrics: { features_completed: 12, tests_passed: 95, performance_score: 91 },
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        projectId: 1,
        name: "Phase 2: Core Features Development",
        description: "Build bill analysis engine, sponsorship tracking, and transparency features",
        phase: "Phase 2",
        status: "in_progress",
        targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        completedDate: null,
        successRate: 74,
        metrics: { features_completed: 23, features_total: 31, tests_passed: 89, performance_score: 91 },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        projectId: 1,
        name: "Phase 3: Advanced Analytics & ML",
        description: "Implement AI-powered analysis, predictive models, and advanced visualization",
        phase: "Phase 3",
        status: "planned",
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        completedDate: null,
        successRate: null,
        metrics: null,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ];
    checkpoints.forEach(checkpoint => this.checkpoints.set(checkpoint.id, checkpoint as Checkpoint));

    // Create sample feature flags
    const featureFlags = [
      {
        id: 1,
        projectId: 1,
        name: "Advanced Bill Analysis",
        description: "AI-powered constitutional conflict detection and stakeholder analysis",
        isEnabled: true,
        rolloutPercentage: 15,
        status: "active",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        projectId: 1,
        name: "Real-time Notifications",
        description: "Push notifications for bill status changes and voting alerts",
        isEnabled: false,
        rolloutPercentage: 5,
        status: "testing",
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        projectId: 1,
        name: "Mobile Responsive UI",
        description: "Optimized mobile interface for better citizen accessibility",
        isEnabled: true,
        rolloutPercentage: 100,
        status: "active",
        expiryDate: null,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        id: 4,
        projectId: 1,
        name: "Dark Mode Theme",
        description: "Dark theme option for improved readability and user preference",
        isEnabled: false,
        rolloutPercentage: 0,
        status: "inactive",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];
    featureFlags.forEach(flag => this.featureFlags.set(flag.id, flag as FeatureFlag));

    // Create sample analytics metrics
    const metrics = [
      { id: 1, projectId: 1, metricType: "dau", value: 2847, change: 12, recordedAt: new Date() },
      { id: 2, projectId: 1, metricType: "bill_views", value: 8234, change: 8, recordedAt: new Date() },
      { id: 3, projectId: 1, metricType: "comment_engagement", value: 1567, change: -3, recordedAt: new Date() },
      { id: 4, projectId: 1, metricType: "feature_adoption", value: 68, change: 5, recordedAt: new Date() },
      { id: 5, projectId: 1, metricType: "user_retention_7d", value: 82, change: 2, recordedAt: new Date() },
      { id: 6, projectId: 1, metricType: "performance_score", value: 91, change: 1, recordedAt: new Date() },
      { id: 7, projectId: 1, metricType: "error_rate", value: 1, change: -2, recordedAt: new Date() }
    ];
    metrics.forEach(metric => this.analyticsMetrics.set(metric.id, metric as AnalyticsMetric));

    // Create sample architecture components
    const components = [
      {
        id: 1,
        projectId: 1,
        name: "Authentication System",
        description: "OAuth, JWT, Session Management",
        type: "core",
        status: "stable",
        isSwappable: false,
        dependencies: [],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        projectId: 1,
        name: "Bill Analysis Engine",
        description: "NLP processing, ML models",
        type: "core",
        status: "active_dev",
        isSwappable: true,
        dependencies: [1],
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        projectId: 1,
        name: "Sponsorship Tracker",
        description: "Conflict detection, transparency",
        type: "service",
        status: "refactoring",
        isSwappable: true,
        dependencies: [1, 2],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        id: 4,
        projectId: 1,
        name: "User Interface Layer",
        description: "React components, responsive design",
        type: "core",
        status: "planned",
        isSwappable: false,
        dependencies: [1],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ];
    components.forEach(component => this.architectureComponents.set(component.id, component as ArchitectureComponent));

    this.currentId = 100; // Start new IDs from 100
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentId++;
    const project: Project = { 
      ...insertProject, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, updateData: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updated = { ...project, ...updateData, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }

  // Checkpoint methods
  async getCheckpoints(projectId: number): Promise<Checkpoint[]> {
    return Array.from(this.checkpoints.values()).filter(c => c.projectId === projectId);
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    return this.checkpoints.get(id);
  }

  async createCheckpoint(insertCheckpoint: InsertCheckpoint): Promise<Checkpoint> {
    const id = this.currentId++;
    const checkpoint: Checkpoint = { ...insertCheckpoint, id, createdAt: new Date() };
    this.checkpoints.set(id, checkpoint);
    return checkpoint;
  }

  async updateCheckpoint(id: number, updateData: Partial<Checkpoint>): Promise<Checkpoint | undefined> {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return undefined;
    
    const updated = { ...checkpoint, ...updateData };
    this.checkpoints.set(id, updated);
    return updated;
  }

  // Feature flag methods
  async getFeatureFlags(projectId: number): Promise<FeatureFlag[]> {
    return Array.from(this.featureFlags.values()).filter(f => f.projectId === projectId);
  }

  async getFeatureFlag(id: number): Promise<FeatureFlag | undefined> {
    return this.featureFlags.get(id);
  }

  async createFeatureFlag(insertFeatureFlag: InsertFeatureFlag): Promise<FeatureFlag> {
    const id = this.currentId++;
    const featureFlag: FeatureFlag = { ...insertFeatureFlag, id, createdAt: new Date() };
    this.featureFlags.set(id, featureFlag);
    return featureFlag;
  }

  async updateFeatureFlag(id: number, updateData: Partial<FeatureFlag>): Promise<FeatureFlag | undefined> {
    const featureFlag = this.featureFlags.get(id);
    if (!featureFlag) return undefined;
    
    const updated = { ...featureFlag, ...updateData };
    this.featureFlags.set(id, updated);
    return updated;
  }

  // Analytics methods
  async getAnalyticsMetrics(projectId: number): Promise<AnalyticsMetric[]> {
    return Array.from(this.analyticsMetrics.values()).filter(m => m.projectId === projectId);
  }

  async createAnalyticsMetric(insertMetric: InsertAnalyticsMetric): Promise<AnalyticsMetric> {
    const id = this.currentId++;
    const metric: AnalyticsMetric = { ...insertMetric, id, recordedAt: new Date() };
    this.analyticsMetrics.set(id, metric);
    return metric;
  }

  // Pivot decision methods
  async getPivotDecisions(projectId: number): Promise<PivotDecision[]> {
    return Array.from(this.pivotDecisions.values()).filter(d => d.projectId === projectId);
  }

  async createPivotDecision(insertDecision: InsertPivotDecision): Promise<PivotDecision> {
    const id = this.currentId++;
    const decision: PivotDecision = { ...insertDecision, id, createdAt: new Date() };
    this.pivotDecisions.set(id, decision);
    return decision;
  }

  async updatePivotDecision(id: number, updateData: Partial<PivotDecision>): Promise<PivotDecision | undefined> {
    const decision = this.pivotDecisions.get(id);
    if (!decision) return undefined;
    
    const updated = { ...decision, ...updateData };
    this.pivotDecisions.set(id, updated);
    return updated;
  }

  // Architecture component methods
  async getArchitectureComponents(projectId: number): Promise<ArchitectureComponent[]> {
    return Array.from(this.architectureComponents.values()).filter(c => c.projectId === projectId);
  }

  async createArchitectureComponent(insertComponent: InsertArchitectureComponent): Promise<ArchitectureComponent> {
    const id = this.currentId++;
    const component: ArchitectureComponent = { ...insertComponent, id, createdAt: new Date() };
    this.architectureComponents.set(id, component);
    return component;
  }

  async updateArchitectureComponent(id: number, updateData: Partial<ArchitectureComponent>): Promise<ArchitectureComponent | undefined> {
    const component = this.architectureComponents.get(id);
    if (!component) return undefined;
    
    const updated = { ...component, ...updateData };
    this.architectureComponents.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
