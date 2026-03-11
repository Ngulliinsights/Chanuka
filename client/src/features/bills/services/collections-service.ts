import { logger } from '@client/lib/utils/logger';

export interface BillCollection {
  id: string;
  name: string;
  description?: string;
  billIds: string[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  shareToken?: string;
  tags?: string[];
}

class CollectionsService {
  private readonly STORAGE_KEY = 'chanuka_bill_collections';

  getCollections(): BillCollection[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to load collections', { component: 'CollectionsService' }, error);
      return [];
    }
  }

  getCollection(id: string): BillCollection | null {
    const collections = this.getCollections();
    return collections.find(c => c.id === id) || null;
  }

  createCollection(data: Omit<BillCollection, 'id' | 'createdAt' | 'updatedAt'>): BillCollection {
    const collection: BillCollection = {
      ...data,
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collections = this.getCollections();
    collections.push(collection);
    this.saveCollections(collections);

    logger.info('Collection created', { component: 'CollectionsService', collectionId: collection.id });
    return collection;
  }

  updateCollection(id: string, updates: Partial<BillCollection>): BillCollection | null {
    const collections = this.getCollections();
    const index = collections.findIndex(c => c.id === id);

    if (index === -1) return null;

    const collection = collections[index];
    if (!collection) return null;

    collections[index] = {
      ...collection,
      ...updates,
      id: collection.id,
      createdAt: collection.createdAt,
      updatedAt: new Date().toISOString(),
    } as BillCollection;

    this.saveCollections(collections);
    logger.info('Collection updated', { component: 'CollectionsService', collectionId: id });
    return collections[index];
  }

  deleteCollection(id: string): boolean {
    const collections = this.getCollections();
    const filtered = collections.filter(c => c.id !== id);

    if (filtered.length === collections.length) return false;

    this.saveCollections(filtered);
    logger.info('Collection deleted', { component: 'CollectionsService', collectionId: id });
    return true;
  }

  addBillToCollection(collectionId: string, billId: string): boolean {
    const collection = this.getCollection(collectionId);
    if (!collection) return false;

    if (collection.billIds.includes(billId)) return true;

    collection.billIds.push(billId);
    this.updateCollection(collectionId, { billIds: collection.billIds });
    return true;
  }

  removeBillFromCollection(collectionId: string, billId: string): boolean {
    const collection = this.getCollection(collectionId);
    if (!collection) return false;

    collection.billIds = collection.billIds.filter(id => id !== billId);
    this.updateCollection(collectionId, { billIds: collection.billIds });
    return true;
  }

  generateShareToken(collectionId: string): string {
    const token = btoa(`${collectionId}_${Date.now()}`);
    this.updateCollection(collectionId, { shareToken: token, isPublic: true });
    return token;
  }

  getCollectionByShareToken(token: string): BillCollection | null {
    const collections = this.getCollections();
    return collections.find(c => c.shareToken === token && c.isPublic) || null;
  }

  exportCollection(collectionId: string): string {
    const collection = this.getCollection(collectionId);
    if (!collection) throw new Error('Collection not found');

    return JSON.stringify(collection, null, 2);
  }

  importCollection(jsonData: string): BillCollection {
    const data = JSON.parse(jsonData);
    return this.createCollection({
      name: data.name,
      description: data.description,
      billIds: data.billIds || [],
      isPublic: false,
      tags: data.tags,
    });
  }

  private saveCollections(collections: BillCollection[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(collections));
    } catch (error) {
      logger.error('Failed to save collections', { component: 'CollectionsService' }, error);
    }
  }
}

export const collectionsService = new CollectionsService();
