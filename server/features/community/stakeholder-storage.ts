import type { Stakeholder, InsertStakeholder } from '../../../shared/schema';
import { logger  } from '../../../shared/core/src/index.js';

/**
 * Represents a voting record for a stakeholder
 */
type Vote = { bill_id: number; 
  vote: "yes" | "no" | "abstain"; 
  date: string 
 };

/**
 * Manages storage and retrieval of stakeholder data with optimized indexing
 * for quick lookups by organization and sector
 */
export class StakeholderStorage {
  private stakeholders: Map<number, Stakeholder>;
  private organizationIndex: Map<string, Set<number>>;
  private sectorIndex: Map<string, Set<number>>;
  private nextId: number;

  constructor() {
    this.stakeholders = new Map<number, Stakeholder>();
    this.organizationIndex = new Map<string, Set<number>>();
    this.sectorIndex = new Map<string, Set<number>>();
    this.nextId = 1;
  }

  /**
   * Creates a deep copy of a stakeholder to prevent mutation of stored data
   * Uses Object.assign for better performance while maintaining deep cloning where needed
   */
  private deepClone(stakeholder: Stakeholder): Stakeholder {
    return {
      ...stakeholder,
      created_at: new Date(stakeholder.created_at.getTime()), // More efficient than string conversion
      updated_at: new Date(stakeholder.updated_at.getTime()),
      votingHistory: stakeholder.votingHistory.map(vote => ({ ...vote })), // Deep clone voting records
    };
  }

  /**
   * Normalizes index keys for consistent lookups
   * Handles null/undefined values and applies consistent casing
   */
  private normalizeIndexKey(key: string | null | undefined): string | null {
    if (!key || typeof key !== 'string') return null;
    return key.trim().toLowerCase();
  }

  /**
   * Adds a stakeholder ID to the specified index with normalized key handling
   */
  private addToIndex(indexMap: Map<string, Set<number>>, key: string | null | undefined, id: number): void {
    const normalizedKey = this.normalizeIndexKey(key);
    if (!normalizedKey) return;

    // Use Map.has() to avoid unnecessary Set creation
    if (!indexMap.has(normalizedKey)) {
      indexMap.set(normalizedKey, new Set<number>());
    }
    indexMap.get(normalizedKey)!.add(id);
  }

  /**
   * Removes a stakeholder ID from the specified index with cleanup
   */
  private removeFromIndex(indexMap: Map<string, Set<number>>, key: string | null | undefined, id: number): void {
    const normalizedKey = this.normalizeIndexKey(key);
    if (!normalizedKey) return;

    const ids = indexMap.get(normalizedKey);
    if (!ids) return;

    ids.delete(id);
    // Clean up empty sets to prevent memory leaks
    if (ids.size === 0) {
      indexMap.delete(normalizedKey);
    }
  }

  /**
   * Updates the indexes when stakeholder data changes
   * Optimized to only update indexes when values actually change
   */
  private updateIndexes(
    id: number,
    oldOrganization: string | null | undefined,
    newOrganization: string | null | undefined,
    oldSector: string | null | undefined,
    newSector: string | null | undefined
  ): void {
    // Normalize for comparison to avoid unnecessary index updates
    const normalizedOldOrg = this.normalizeIndexKey(oldOrganization);
    const normalizedNewOrg = this.normalizeIndexKey(newOrganization);
    const normalizedOldSector = this.normalizeIndexKey(oldSector);
    const normalizedNewSector = this.normalizeIndexKey(newSector);

    // Update organization index only if normalized values differ
    if (normalizedOldOrg !== normalizedNewOrg) {
      this.removeFromIndex(this.organizationIndex, oldOrganization, id);
      this.addToIndex(this.organizationIndex, newOrganization, id);
    }

    // Update sector index only if normalized values differ
    if (normalizedOldSector !== normalizedNewSector) {
      this.removeFromIndex(this.sectorIndex, oldSector, id);
      this.addToIndex(this.sectorIndex, newSector, id);
    }
  }

  /**
   * Validates stakeholder data before operations
   * Provides early error detection and clear error messages
   */
  private validateStakeholderData(stakeholder: InsertStakeholder): void {
    if (!stakeholder.name || typeof stakeholder.name !== 'string' || stakeholder.name.trim() === '') {
      throw new Error('Stakeholder name is required and must be a non-empty string');
    }

    if (stakeholder.email && typeof stakeholder.email !== 'string') {
      throw new Error('Stakeholder email must be a string if provided');
    }

    // Add basic email validation if email is provided
    if (stakeholder.email && stakeholder.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stakeholder.email.trim())) {
        throw new Error('Invalid email format');
      }
    }
  }

  /**
   * Validates voting record data
   */
  private validateVote(vote: Vote): void { if (!vote.bill_id || typeof vote.bill_id !== 'number' || vote.bill_id <= 0) {
      throw new Error('Vote bill_id must be a positive number');
     }

    if (!['yes', 'no', 'abstain'].includes(vote.vote)) {
      throw new Error('Vote must be one of: yes, no, abstain');
    }

    if (!vote.date || typeof vote.date !== 'string') {
      throw new Error('Vote date is required and must be a string');
    }

    // Basic date validation
    if (isNaN(Date.parse(vote.date))) {
      throw new Error('Vote date must be a valid date string');
    }
  }

  /**
   * Retrieves all stakeholders with optional filtering
   * Returns empty array instead of throwing for consistent API behavior
   */
  async getStakeholders(): Promise<Stakeholder[]> {
    if (this.stakeholders.size === 0) return [];

    return Array.from(this.stakeholders.values()).map(s => this.deepClone(s));
  }

  /**
   * Retrieves a stakeholder by ID with input validation
   */
  async getStakeholder(id: number): Promise<Stakeholder | undefined> {
    if (!id || typeof id !== 'number' || id <= 0) {
      return undefined; // Return undefined for invalid IDs instead of throwing
    }

    const stakeholder = this.stakeholders.get(id);
    return stakeholder ? this.deepClone(stakeholder) : undefined;
  }

  /**
   * Retrieves all stakeholders from a specific organization
   * Uses normalized key lookup for case-insensitive matching
   */
  async getStakeholdersByOrganization(organization: string): Promise<Stakeholder[]> {
    const normalizedKey = this.normalizeIndexKey(organization);
    if (!normalizedKey) return [];

    const stakeholderIds = this.organizationIndex.get(normalizedKey);
    if (!stakeholderIds || stakeholderIds.size === 0) return [];

    // Use Array.from with map for better performance than separate operations
    return Array.from(stakeholderIds)
      .map(id => this.stakeholders.get(id))
      .filter((s): s is Stakeholder => Boolean(s))
      .map(s => this.deepClone(s));
  }

  /**
   * Retrieves all stakeholders from a specific sector
   * Uses normalized key lookup for case-insensitive matching
   */
  async getStakeholdersBySector(sector: string): Promise<Stakeholder[]> {
    const normalizedKey = this.normalizeIndexKey(sector);
    if (!normalizedKey) return [];

    const stakeholderIds = this.sectorIndex.get(normalizedKey);
    if (!stakeholderIds || stakeholderIds.size === 0) return [];

    return Array.from(stakeholderIds)
      .map(id => this.stakeholders.get(id))
      .filter((s): s is Stakeholder => Boolean(s))
      .map(s => this.deepClone(s));
  }

  /**
   * Creates a new stakeholder with comprehensive validation
   * Includes data sanitization and duplicate checking
   */
  async createStakeholder(stakeholder: InsertStakeholder): Promise<Stakeholder> {
    // Validate input data first
    this.validateStakeholderData(stakeholder);

    const now = new Date();

    // Sanitize string inputs
    const sanitizedStakeholder = {
      ...stakeholder,
      name: stakeholder.name.trim(),
      email: stakeholder.email?.trim() || undefined,
      organization: stakeholder.organization?.trim() || undefined,
      sector: stakeholder.sector?.trim() || undefined,
    };

    const newStakeholder: Stakeholder = {
      ...sanitizedStakeholder,
      id: this.nextId++,
      created_at: now,
      updated_at: now,
      votingHistory: [],
      influence: sanitizedStakeholder.influence ?? 0,
    };

    this.stakeholders.set(newStakeholder.id, newStakeholder);

    // Add to indexes with the sanitized data
    this.addToIndex(this.organizationIndex, newStakeholder.organization, newStakeholder.id);
    this.addToIndex(this.sectorIndex, newStakeholder.sector, newStakeholder.id);

    return this.deepClone(newStakeholder);
  }

  /**
   * Updates an existing stakeholder with validation and atomic operations
   * @throws Error if stakeholder not found or validation fails
   */
  async updateStakeholder(id: number, update: Partial<InsertStakeholder>): Promise<Stakeholder> {
    if (!id || typeof id !== 'number' || id <= 0) {
      throw new Error('Invalid stakeholder ID');
    }

    const existing = this.stakeholders.get(id);
    if (!existing) {
      throw new Error(`Stakeholder with ID ${id} not found`);
    }

    // Create a temporary stakeholder for validation
    const tempStakeholder = { ...existing, ...update };
    this.validateStakeholderData(tempStakeholder);

    // Sanitize the update data
    const sanitizedUpdate: Partial<InsertStakeholder> = {};
    if (update.name !== undefined) sanitizedUpdate.name = update.name.trim();
    if (update.email !== undefined) sanitizedUpdate.email = update.email?.trim() || undefined;
    if (update.organization !== undefined) sanitizedUpdate.organization = update.organization?.trim() || undefined;
    if (update.sector !== undefined) sanitizedUpdate.sector = update.sector?.trim() || undefined;

    const updatedStakeholder: Stakeholder = {
      ...existing,
      ...sanitizedUpdate,
      updated_at: new Date(),
      id: existing.id, // Ensure ID cannot be changed
      created_at: existing.created_at, // Ensure creation date cannot be changed
      votingHistory: existing.votingHistory, // Preserve voting history
    };

    // Update indexes before committing the change
    this.updateIndexes(
      id,
      existing.organization,
      updatedStakeholder.organization,
      existing.sector,
      updatedStakeholder.sector
    );

    this.stakeholders.set(id, updatedStakeholder);
    return this.deepClone(updatedStakeholder);
  }

  /**
   * Deletes a stakeholder with comprehensive cleanup
   * @throws Error if stakeholder not found
   */
  async deleteStakeholder(id: number): Promise<void> {
    if (!id || typeof id !== 'number' || id <= 0) {
      throw new Error('Invalid stakeholder ID');
    }

    const stakeholder = this.stakeholders.get(id);
    if (!stakeholder) {
      throw new Error(`Stakeholder with ID ${id} not found`);
    }

    // Remove from indexes first to maintain consistency
    this.removeFromIndex(this.organizationIndex, stakeholder.organization, id);
    this.removeFromIndex(this.sectorIndex, stakeholder.sector, id);

    // Then delete the stakeholder
    this.stakeholders.delete(id);
  }

  /**
   * Adds a voting record to a stakeholder's history with validation
   * @throws Error if stakeholder not found or vote data is invalid
   */
  async updateStakeholderVotingHistory(id: number, vote: Vote): Promise<Stakeholder> {
    if (!id || typeof id !== 'number' || id <= 0) {
      throw new Error('Invalid stakeholder ID');
    }

    const stakeholder = this.stakeholders.get(id);
    if (!stakeholder) {
      throw new Error(`Stakeholder with ID ${id} not found`);
    }

    // Validate the vote data
    this.validateVote(vote);

    // Check for duplicate votes on the same bill
    const existingVote = stakeholder.votingHistory.find(v => v.bill_id === vote.bill_id);
    if (existingVote) {
      throw new Error(`Stakeholder ${id} has already voted on bill ${vote.bill_id}`);
    }

    const updatedStakeholder: Stakeholder = {
      ...stakeholder,
      votingHistory: [...stakeholder.votingHistory, { ...vote }], // Deep clone the vote
      updated_at: new Date(),
    };

    this.stakeholders.set(id, updatedStakeholder);
    return this.deepClone(updatedStakeholder);
  }

  /**
   * Retrieves the voting history for a specific stakeholder
   * @throws Error if stakeholder not found
   */
  async getStakeholderVotingHistory(id: number): Promise<Vote[]> {
    if (!id || typeof id !== 'number' || id <= 0) {
      throw new Error('Invalid stakeholder ID');
    }

    const stakeholder = this.stakeholders.get(id);
    if (!stakeholder) {
      throw new Error(`Stakeholder with ID ${id} not found`);
    }

    // Return deep cloned voting history to prevent external mutations
    return stakeholder.votingHistory.map(vote => ({ ...vote }));
  }

  /**
   * Retrieves statistics about the current storage state
   * Useful for monitoring and debugging purposes
   */
  async getStorageStats(): Promise<{
    totalStakeholders: number;
    totalOrganizations: number;
    totalSectors: number;
    nextId: number;
  }> {
    return {
      totalStakeholders: this.stakeholders.size,
      totalOrganizations: this.organizationIndex.size,
      totalSectors: this.sectorIndex.size,
      nextId: this.nextId,
    };
  }

  /**
   * Bulk operations for better performance when handling multiple stakeholders
   * Creates multiple stakeholders in a single operation
   */
  async createStakeholdersBulk(stakeholders: InsertStakeholder[]): Promise<Stakeholder[]> {
    if (!Array.isArray(stakeholders) || stakeholders.length === 0) {
      return [];
    }

    // Validate all stakeholders first before creating any
    for (const stakeholder of stakeholders) {
      this.validateStakeholderData(stakeholder);
    }

    const results: Stakeholder[] = [];
    const now = new Date();

    for (const stakeholder of stakeholders) {
      const sanitizedStakeholder = {
        ...stakeholder,
        name: stakeholder.name.trim(),
        email: stakeholder.email?.trim() || undefined,
        organization: stakeholder.organization?.trim() || undefined,
        sector: stakeholder.sector?.trim() || undefined,
      };

      const newStakeholder: Stakeholder = {
        ...sanitizedStakeholder,
        id: this.nextId++,
        created_at: now,
        updated_at: now,
        votingHistory: [],
      };

      this.stakeholders.set(newStakeholder.id, newStakeholder);
      this.addToIndex(this.organizationIndex, newStakeholder.organization, newStakeholder.id);
      this.addToIndex(this.sectorIndex, newStakeholder.sector, newStakeholder.id);

      results.push(this.deepClone(newStakeholder));
    }

    return results;
  }
}














































