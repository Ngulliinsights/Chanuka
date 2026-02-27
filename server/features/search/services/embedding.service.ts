// ============================================================================
// EMBEDDING SERVICE - AI-Powered Text Embeddings with Caching
// ============================================================================
// Handles OpenAI text-embedding-3-small integration with Redis caching
// Supports batch processing and error handling with fallback mechanisms

import { logger } from '../../../infrastructure/observability/core/logger';
import { readDatabase, writeDatabase, withTransaction } from '../../../infrastructure/database/connection';
import { cacheService } from '../../../infrastructure/cache';
import { contentEmbeddings, ContentType } from '../../../infrastructure/schema/search_system';
import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import OpenAI from 'openai';
import pLimit from 'p-limit';

// Helper function to get error message safely
const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : 'Unknown error';
};

export interface EmbeddingOptions {
    model?: string;
    batchSize?: number;
    maxRetries?: number;
    cacheTTL?: number; // seconds
}

export interface EmbeddingResult {
    embedding: number[];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

export class EmbeddingService {
    private openai: OpenAI;
    private readonly defaultModel = 'text-embedding-3-small';
    private readonly defaultBatchSize = 10;
    private readonly maxRetries = 3;
    private readonly cacheTTL = 24 * 60 * 60; // 24 hours

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }

        this.openai = new OpenAI({
            apiKey,
            maxRetries: this.maxRetries,
        });
    }

    /**
     * Generate embeddings for text content with caching
     */
    async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
        const {
            model = this.defaultModel,
            cacheTTL = this.cacheTTL,
        } = options;

        // Create cache key from text and model
        const cacheKey = this.createCacheKey(text, model);

        try {
            // Check cache first
            const cached = await cacheService.get<EmbeddingResult>(cacheKey);
            if (cached) {
                logger.debug({ cacheKey, model }, 'Embedding cache hit');
                return cached;
            }

            // Generate new embedding
            logger.debug({ textLength: text.length, model }, 'Generating new embedding');

            const response = await this.openai.embeddings.create({
                model,
                input: text,
                encoding_format: 'float',
            });

            if (!response.data[0]?.embedding) {
                throw new Error('No embedding returned from OpenAI API');
            }

            const result: EmbeddingResult = {
                embedding: response.data[0].embedding,
                model,
                usage: response.usage,
            };

            // Cache the result
            await cacheService.set(cacheKey, result, cacheTTL);

            logger.debug({
                cacheKey,
                model,
                tokens: result.usage.total_tokens,
            }, 'Embedding generated and cached');

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error({
                error: errorMessage,
                cacheKey,
                model,
                textLength: text.length,
            }, 'Failed to generate embedding');
            throw error;
        }
    }

    /**
     * Generate embeddings for multiple texts in batches
     */
    async generateEmbeddingsBatch(
        texts: string[],
        options: EmbeddingOptions = {}
    ): Promise<EmbeddingResult[]> {
        const {
            model = this.defaultModel,
            batchSize = this.defaultBatchSize,
            cacheTTL = this.cacheTTL,
        } = options;

        if (texts.length === 0) return [];

        logger.debug({
            totalTexts: texts.length,
            batchSize,
            model,
        }, 'Processing batch embeddings');

        const results: EmbeddingResult[] = [];
        const limit = pLimit(batchSize);

        // Process in batches with concurrency control
        const promises = texts.map((text, index) =>
            limit(async () => {
                try {
                    const result = await this.generateEmbedding(text, { model, cacheTTL });
                    logger.debug(`Batch embedding ${index + 1}/${texts.length} completed`);
                    return result;
                } catch (error) {
                    logger.error({
                        error: getErrorMessage(error),
                        textLength: text.length,
                    }, `Failed to generate embedding for text ${index + 1}`);
                    throw error;
                }
            })
        );

        try {
            const batchResults = await Promise.allSettled(promises);

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    // Handle individual failures - could implement fallback here
                    logger.error({ error: result.reason }, 'Batch embedding failed');
                    throw result.reason;
                }
            }

            logger.debug({
                totalProcessed: results.length,
                totalRequested: texts.length,
            }, 'Batch embeddings completed');

            return results;

        } catch (error) {
            logger.error({
                error: getErrorMessage(error),
                totalTexts: texts.length,
                processedCount: results.length,
            }, 'Batch embedding processing failed');
            throw error;
        }
    }

    /**
     * Process content embeddings for database storage
     */
    async processContentEmbedding(
        contentType: ContentType,
        contentId: string,
        content: string,
        metadata?: {
            title?: string;
            summary?: string;
            tags?: string[];
        }
    ): Promise<void> {
        try {
            // Check if embedding already exists and is up to date
            const existing = await readDatabase(async (db) => {
                return db
                    .select()
                    .from(contentEmbeddings)
                    .where(
                        and(
                            eq(contentEmbeddings.content_type, contentType),
                            eq(contentEmbeddings.content_id, contentId)
                        )
                    )
                    .limit(1);
            }) as Array<typeof contentEmbeddings.$inferSelect>;

            const contentHash = this.createContentHash(content);

            if (existing.length > 0 && existing[0]) {
                const record = existing[0];
                if (record.processing_status === 'completed' &&
                    record.content_hash === contentHash) {
                    logger.debug({ contentType, contentId }, 'Content embedding already up to date');
                    return;
                }
            }

            // Update status to processing and store embedding in transaction
            await withTransaction(async (tx) => {
                // Update status to processing
                await tx
                    .insert(contentEmbeddings)
                    .values({
                        content_type: contentType,
                        content_id: contentId,
                        content_hash: contentHash,
                        processing_status: 'processing',
                        content_title: metadata?.title,
                        content_summary: metadata?.summary,
                        content_tags: metadata?.tags,
                        processing_attempts: (existing.length > 0 && existing[0]) ? existing[0].processing_attempts + 1 : 1,
                    } as any)
                    .onConflictDoUpdate({
                        target: [contentEmbeddings.content_type, contentEmbeddings.content_id],
                        set: {
                            processing_status: 'processing',
                            content_hash: contentHash,
                            content_title: metadata?.title,
                            content_summary: metadata?.summary,
                            content_tags: metadata?.tags,
                            processing_attempts: sql`${contentEmbeddings.processing_attempts} + 1`,
                            last_attempt_at: sql`NOW()`,
                        },
                    } as any);

                // Generate embedding
                const embeddingResult = await this.generateEmbedding(content);

                // Store the embedding
                await tx
                    .update(contentEmbeddings)
                    .set({
                        embedding: embeddingResult.embedding as any,
                        processing_status: 'completed',
                        model_version: embeddingResult.model,
                        updated_at: sql`NOW()`,
                    } as any)
                    .where(
                        and(
                            eq(contentEmbeddings.content_type, contentType),
                            eq(contentEmbeddings.content_id, contentId)
                        )
                    );
            });

            logger.debug({
                contentType,
                contentId,
                model: embeddingResult.model,
                tokens: embeddingResult.usage.total_tokens,
            }, 'Content embedding processed successfully');

        } catch (error) {
            const errorMessage = getErrorMessage(error);
            logger.error({
                error: errorMessage,
                contentType,
                contentId,
            }, 'Failed to process content embedding');

            // Update status to failed
            await withTransaction(async (tx) => {
                await tx
                    .update(contentEmbeddings)
                    .set({
                        processing_status: 'failed',
                        error_message: errorMessage,
                        updated_at: sql`NOW()`,
                    } as any)
                    .where(
                        and(
                            eq(contentEmbeddings.content_type, contentType),
                            eq(contentEmbeddings.content_id, contentId)
                        )
                    );
            });

            throw error;
        }
    }

    /**
     * Get embedding for content (from cache or database)
     */
    async getContentEmbedding(
        contentType: ContentType,
        contentId: string
    ): Promise<number[] | null> {
        try {
            const result = await readDatabase(async (db) => {
                return db
                    .select()
                    .from(contentEmbeddings)
                    .where(
                        and(
                            eq(contentEmbeddings.content_type, contentType),
                            eq(contentEmbeddings.content_id, contentId),
                            eq(contentEmbeddings.processing_status, 'completed')
                        )
                    )
                    .limit(1);
            }) as Array<typeof contentEmbeddings.$inferSelect>;

            return result.length > 0 && result[0] ? result[0].embedding as number[] : null;

        } catch (error) {
            logger.error({
                error: getErrorMessage(error),
                contentType,
                contentId,
            }, 'Failed to get content embedding');
            return null;
        }
    }

    /**
     * Create cache key for text and model combination
     */
    private createCacheKey(text: string, model: string): string {
        // Use SHA-256 for consistent hashing
        const hash = crypto.createHash('sha256')
            .update(`${model}:${text}`)
            .digest('hex');
        return `embedding:${model}:${hash}`;
    }

    /**
     * Create content hash for change detection
     */
    private createContentHash(content: string): string {
        return crypto.createHash('sha256')
            .update(content)
            .digest('hex');
    }

    /**
     * Health check for the embedding service
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Simple test embedding
            await this.generateEmbedding('test', { cacheTTL: 60 }); // Short cache for test
            return true;
        } catch (error) {
            logger.error({ error: getErrorMessage(error) }, 'Embedding service health check failed');
            return false;
        }
    }

    /**
     * Clear embedding cache (useful for testing or cache invalidation)
     */
    async clearCache(pattern: string = 'embedding:*'): Promise<void> {
        // Note: This would require Redis SCAN and DEL operations
        // Implementation depends on cache service capabilities
        logger.warn({ pattern }, 'Cache clearing not implemented');
    }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();


