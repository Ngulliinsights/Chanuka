// ============================================================================
// EMBEDDING SERVICE - AI-Powered Text Embeddings with Caching
// ============================================================================
// Handles OpenAI text-embedding-3-small integration with Redis caching
// Supports batch processing and error handling with fallback mechanisms

import { logger } from '@shared/core';
import { database } from '@server/infrastructure/database';
import { cacheService } from '@shared/infrastructure/cache/cache-service';
import { content_embeddings, ContentType, ProcessingStatus } from '@server/infrastructure/schema/search_system';
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
                logger.debug('Embedding cache hit', { cacheKey, model });
                return cached;
            }

            // Generate new embedding
            logger.debug('Generating new embedding', { textLength: text.length, model });

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

            logger.debug('Embedding generated and cached', {
                cacheKey,
                model,
                tokens: result.usage.total_tokens,
            });

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to generate embedding', {
                error: errorMessage,
                cacheKey,
                model,
                textLength: text.length,
            });
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

        logger.debug('Processing batch embeddings', {
            totalTexts: texts.length,
            batchSize,
            model,
        });

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
                    logger.error(`Failed to generate embedding for text ${index + 1}`, {
                        error: getErrorMessage(error),
                        textLength: text.length,
                    });
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
                    logger.error('Batch embedding failed', { error: result.reason });
                    throw result.reason;
                }
            }

            logger.debug('Batch embeddings completed', {
                totalProcessed: results.length,
                totalRequested: texts.length,
            });

            return results;

        } catch (error) {
            logger.error('Batch embedding processing failed', {
                error: getErrorMessage(error),
                totalTexts: texts.length,
                processedCount: results.length,
            });
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
            const existing = await database
                .select()
                .from(content_embeddings)
                .where(
                    and(
                        eq(content_embeddings.contentType, contentType),
                        eq(content_embeddings.contentId, contentId)
                    )
                )
                .limit(1);

            const contentHash = this.createContentHash(content);

            if (existing.length > 0) {
                const record = existing[0];
                if (record.processingStatus === ProcessingStatus.COMPLETED &&
                    record.contentHash === contentHash) {
                    logger.debug('Content embedding already up to date', { contentType, contentId });
                    return;
                }
            }

            // Update status to processing
            await database
                .insert(content_embeddings)
                .values({
                    contentType,
                    contentId,
                    contentHash,
                    processingStatus: ProcessingStatus.PROCESSING,
                    contentTitle: metadata?.title,
                    contentSummary: metadata?.summary,
                    contentTags: metadata?.tags,
                    processingAttempts: existing.length > 0 ? existing[0].processingAttempts + 1 : 1,
                })
                .onConflictDoUpdate({
                    target: [content_embeddings.contentType, content_embeddings.contentId],
                    set: {
                        processingStatus: ProcessingStatus.PROCESSING,
                        contentHash,
                        contentTitle: metadata?.title,
                        contentSummary: metadata?.summary,
                        contentTags: metadata?.tags,
                        processingAttempts: sql`${content_embeddings.processingAttempts} + 1`,
                        lastAttemptAt: sql`NOW()`,
                    },
                });

            // Generate embedding
            const embeddingResult = await this.generateEmbedding(content);

            // Store the embedding
            await database
                .update(content_embeddings)
                .set({
                    embedding: embeddingResult.embedding,
                    processingStatus: ProcessingStatus.COMPLETED,
                    modelVersion: embeddingResult.model,
                    updatedAt: sql`NOW()`,
                })
                .where(
                    and(
                        eq(content_embeddings.contentType, contentType),
                        eq(content_embeddings.contentId, contentId)
                    )
                );

            logger.debug('Content embedding processed successfully', {
                contentType,
                contentId,
                model: embeddingResult.model,
                tokens: embeddingResult.usage.total_tokens,
            });

        } catch (error) {
            const errorMessage = getErrorMessage(error);
            logger.error('Failed to process content embedding', {
                error: errorMessage,
                contentType,
                contentId,
            });

            // Update status to failed
            await database
                .update(content_embeddings)
                .set({
                    processingStatus: ProcessingStatus.FAILED,
                    errorMessage,
                    updatedAt: sql`NOW()`,
                })
                .where(
                    and(
                        eq(content_embeddings.contentType, contentType),
                        eq(content_embeddings.contentId, contentId)
                    )
                );

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
            const result = await database
                .select({ embedding: content_embeddings.embedding })
                .from(content_embeddings)
                .where(
                    and(
                        eq(content_embeddings.contentType, contentType),
                        eq(content_embeddings.contentId, contentId),
                        eq(content_embeddings.processingStatus, ProcessingStatus.COMPLETED)
                    )
                )
                .limit(1);

            return result.length > 0 ? result[0].embedding : null;

        } catch (error) {
            logger.error('Failed to get content embedding', {
                error: getErrorMessage(error),
                contentType,
                contentId,
            });
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
            logger.error('Embedding service health check failed', { error: getErrorMessage(error) });
            return false;
        }
    }

    /**
     * Clear embedding cache (useful for testing or cache invalidation)
     */
    async clearCache(pattern: string = 'embedding:*'): Promise<void> {
        // Note: This would require Redis SCAN and DEL operations
        // Implementation depends on cache service capabilities
        logger.warn('Cache clearing not implemented', { pattern });
    }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();


