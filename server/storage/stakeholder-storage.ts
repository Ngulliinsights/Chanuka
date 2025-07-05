import { Stakeholder, InsertStakeholder } from "@shared/schema";

/**
 * Represents a voting record for a stakeholder
 */
type Vote = { 
  billId: number; 
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
   */
  private deepClone(stakeholder: Stakeholder): Stakeholder {
    return {
      ...stakeholder,
      createdAt: new Date(stakeholder.createdAt),
      updatedAt: new Date(stakeholder.updatedAt),
      votingHistory: [...stakeholder.votingHistory],
    };
  }

  /**
   * Adds a stakeholder ID to the specified index
   */
  private addToIndex(indexMap: Map<string, Set<number>>, key: string | null | undefined, id: number): void {
    if (!key) return;
    
    const ids = indexMap.get(key) || new Set<number>();
    ids.add(id);
    indexMap.set(key, ids);
  }

  /**
   * Removes a stakeholder ID from the specified index
   */
  private removeFromIndex(indexMap: Map<string, Set<number>>, key: string | null | undefined, id: number): void {
    if (!key) return;
    
    const ids = indexMap.get(key);
    if (!ids) return;
    
    ids.delete(id);
    if (ids.size === 0) {
      indexMap.delete(key);
    }
  }

  /**
   * Updates the indexes when stakeholder data changes
   */
  private updateIndexes(
    id: number,
    oldOrganization: string | null | undefined,
    newOrganization: string | null | undefined,
    oldSector: string | null | undefined,
    newSector: string | null | undefined
  ): void {
    // Update organization index if changed
    if (oldOrganization !== newOrganization) {
      this.removeFromIndex(this.organizationIndex, oldOrganization, id);
      this.addToIndex(this.organizationIndex, newOrganization, id);
    }

    // Update sector index if changed
    if (oldSector !== newSector) {
      this.removeFromIndex(this.sectorIndex, oldSector, id);
      this.addToIndex(this.sectorIndex, newSector, id);
    }
  }

  /**
   * Retrieves all stakeholders
   */
  async getStakeholders(): Promise<Stakeholder[]> {
    return Array.from(this.stakeholders.values()).map(s => this.deepClone(s));
  }

  /**
   * Retrieves a stakeholder by ID
   */
  async getStakeholder(id: number): Promise<Stakeholder | undefined> {
    const stakeholder = this.stakeholders.get(id);
    return stakeholder ? this.deepClone(stakeholder) : undefined;
  }

  /**
   * Retrieves all stakeholders from a specific organization
   */
  async getStakeholdersByOrganization(organization: string): Promise<Stakeholder[]> {
    const stakeholderIds = this.organizationIndex.get(organization);
    if (!stakeholderIds || stakeholderIds.size === 0) return [];

    return Array.from(stakeholderIds)
      .map(id => this.stakeholders.get(id))
      .filter((s): s is Stakeholder => Boolean(s))
      .map(s => this.deepClone(s));
  }

  /**
   * Retrieves all stakeholders from a specific sector
   */
  async getStakeholdersBySector(sector: string): Promise<Stakeholder[]> {
    const stakeholderIds = this.sectorIndex.get(sector);
    if (!stakeholderIds || stakeholderIds.size === 0) return [];

    return Array.from(stakeholderIds)
      .map(id => this.stakeholders.get(id))
      .filter((s): s is Stakeholder => Boolean(s))
      .map(s => this.deepClone(s));
  }

  /**
   * Creates a new stakeholder
   */
  async createStakeholder(stakeholder: InsertStakeholder): Promise<Stakeholder> {
    const now = new Date();
    const newStakeholder: Stakeholder = {
      ...stakeholder,
      id: this.nextId++,
      createdAt: now,
      updatedAt: now,
      votingHistory: [],
    };

    this.stakeholders.set(newStakeholder.id, newStakeholder);
    
    // Add to indexes
    this.addToIndex(this.organizationIndex, newStakeholder.organization, newStakeholder.id);
    this.addToIndex(this.sectorIndex, newStakeholder.sector, newStakeholder.id);

    return this.deepClone(newStakeholder);
  }

  /**
   * Updates an existing stakeholder
   * @throws Error if stakeholder not found
   */
  async updateStakeholder(id: number, update: Partial<InsertStakeholder>): Promise<Stakeholder> {
    const existing = this.stakeholders.get(id);
    if (!existing) throw new Error(`Stakeholder with ID ${id} not found`);

    const updatedStakeholder: Stakeholder = {
      ...existing,
      ...update,
      updatedAt: new Date(),
      id: existing.id,
      createdAt: existing.createdAt,
      votingHistory: existing.votingHistory,
    };

    // Update indexes
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
   * Deletes a stakeholder
   * @throws Error if stakeholder not found
   */
  async deleteStakeholder(id: number): Promise<void> {
    const stakeholder = this.stakeholders.get(id);
    if (!stakeholder) throw new Error(`Stakeholder with ID ${id} not found`);

    // Remove from indexes first
    this.removeFromIndex(this.organizationIndex, stakeholder.organization, id);
    this.removeFromIndex(this.sectorIndex, stakeholder.sector, id);
    
    // Then delete the stakeholder
    this.stakeholders.delete(id);
  }

  /**
   * Adds a voting record to a stakeholder's history
   * @throws Error if stakeholder not found
   */
  async updateStakeholderVotingHistory(id: number, vote: Vote): Promise<Stakeholder> {
    const stakeholder = this.stakeholders.get(id);
    if (!stakeholder) throw new Error(`Stakeholder with ID ${id} not found`);

    const updatedStakeholder: Stakeholder = {
      ...stakeholder,
      votingHistory: [...stakeholder.votingHistory, vote],
      updatedAt: new Date(),
    };

    this.stakeholders.set(id, updatedStakeholder);
    return this.deepClone(updatedStakeholder);
  }

  /**
   * Retrieves the voting history for a specific stakeholder
   * @throws Error if stakeholder not found
   */
  async getStakeholderVotingHistory(id: number): Promise<Vote[]> {
    const stakeholder = this.stakeholders.get(id);
    if (!stakeholder) throw new Error(`Stakeholder with ID ${id} not found`);
    
    return [...stakeholder.votingHistory];
  }
}