import { storage } from "../../storage/index";

/**
 * Represents the structure of candidate evaluation data
 */
export interface CandidateEvaluation {
  id: number;
  candidateName: string;
  position: string;
  department: string;
  evaluationDate: Date;
  score: number;
  status: EvaluationStatus;
  feedback?: string;
}

/**
 * Allowed status values for candidate evaluations
 */
export enum EvaluationStatus {
  PENDING = "pending",
  IN_REVIEW = "in_review",
  APPROVED = "approved",
  REJECTED = "rejected"
}

/**
 * Structure for department statistics
 */
export interface DepartmentStats {
  department: string;
  openPositions: number;
  candidatesEvaluated: number;
  averageScore: number;
  approvalRate: number;
}

/**
 * Dashboard service interface defining operations for managing candidate evaluations
 */
export interface DashboardService {
  /**
   * Retrieves all candidate evaluations
   * @returns Promise resolving to an array of candidate evaluations
   */
  getCandidateEvaluations(): Promise<CandidateEvaluation[]>;
  
  /**
   * Creates a new candidate evaluation
   * @param evaluationData The evaluation data to create
   * @returns Promise that resolves when creation is complete
   * @throws Error if validation fails or storage operation fails
   */
  createEvaluation(evaluationData: CandidateEvaluation): Promise<void>;
  
  /**
   * Updates the status of an existing evaluation
   * @param id The id of the evaluation to update
   * @param status The new status to set
   * @returns Promise that resolves when update is complete
   * @throws Error if evaluation not found or status is invalid
   */
  updateEvaluationStatus(id: number, status: EvaluationStatus): Promise<void>;
  
  /**
   * Retrieves statistics grouped by department
   * @returns Promise resolving to department statistics
   */
  getDepartmentStats(): Promise<DepartmentStats[]>;
}

/**
 * Implementation of the DashboardService interface
 */
class DashboardServiceImpl implements DashboardService {
  /**
   * Cache for candidate evaluations to reduce storage calls
   */
  private evaluationsCache: CandidateEvaluation[] | null = null;
  
  /**
   * Cache expiration timestamp
   */
  private cacheExpiration: number = 0;
  
  /**
   * Cache time-to-live in milliseconds (2 minutes)
   */
  private readonly CACHE_TTL = 120000;

  /**
   * Retrieves all candidate evaluations with caching
   * @returns Promise resolving to an array of candidate evaluations
   */
  async getCandidateEvaluations(): Promise<CandidateEvaluation[]> {
    // Use cache if available and not expired
    const now = Date.now();
    if (this.evaluationsCache && now < this.cacheExpiration) {
      return this.evaluationsCache;
    }
    
    // Fetch fresh data and update cache
    const evaluations = await storage.getCandidateEvaluations();
    this.evaluationsCache = evaluations;
    this.cacheExpiration = now + this.CACHE_TTL;
    
    return evaluations;
  }

  /**
   * Creates a new candidate evaluation
   * @param evaluationData The evaluation data to create
   * @throws Error if validation fails
   */
  async createEvaluation(evaluationData: CandidateEvaluation): Promise<void> {
    // Validate required fields
    this.validateEvaluationData(evaluationData);
    
    try {
      await storage.createEvaluation(evaluationData);
      // Invalidate cache after creation
      this.invalidateCache();
    } catch (error) {
      throw new Error(`Failed to create evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates the status of an existing evaluation
   * @param id The id of the evaluation to update
   * @param status The new status to set
   * @throws Error if status is invalid
   */
  async updateEvaluationStatus(id: number, status: EvaluationStatus): Promise<void> {
    // Validate status
    if (!Object.values(EvaluationStatus).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    try {
      await storage.updateEvaluationStatus(id, status);
      // Invalidate cache after update
      this.invalidateCache();
    } catch (error) {
      throw new Error(`Failed to update evaluation status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves statistics grouped by department
   * @returns Promise resolving to department statistics
   */
  async getDepartmentStats(): Promise<DepartmentStats[]> {
    try {
      return await storage.getDepartmentStats();
    } catch (error) {
      throw new Error(`Failed to retrieve department statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Validates evaluation data before creation
   * @param data The evaluation data to validate
   * @throws Error if validation fails
   */
  private validateEvaluationData(data: CandidateEvaluation): void {
    const requiredFields = ['candidateName', 'position', 'department', 'evaluationDate', 'score'];
    
    for (const field of requiredFields) {
      if (!data[field as keyof CandidateEvaluation]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate score is within acceptable range
    if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }
    
    // Validate status if provided
    if (data.status && !Object.values(EvaluationStatus).includes(data.status)) {
      throw new Error(`Invalid status: ${data.status}`);
    }
  }
  
  /**
   * Invalidates the evaluations cache
   */
  private invalidateCache(): void {
    this.evaluationsCache = null;
    this.cacheExpiration = 0;
  }
}

// Export singleton instance
export const dashboardService = new DashboardServiceImpl();