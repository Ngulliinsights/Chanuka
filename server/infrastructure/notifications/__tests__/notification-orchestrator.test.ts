import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

import { NotificationOrchestratorService } from '../notification-orchestrator.js';

describe('NotificationOrchestratorService - basic utilities', () => {
	// Use a service instance configured with very long intervals to avoid background timers
	const service = new NotificationOrchestratorService({
		batching: { checkIntervalMs: 60 * 60 * 1000, maxBatchSize: 10, maxRetries: 1 },
		cleanup: { rateLimitCleanupIntervalMs: 60 * 60 * 1000, batchCleanupIntervalMs: 60 * 60 * 1000, failedBatchRetentionMs: 24 * 60 * 60 * 1000 },
		processing: { bulkChunkSize: 50, chunkDelayMs: 100, maxConcurrentBatches: 5 },
		rateLimiting: { maxPerHour: 50, maxUrgentPerHour: 10, windowMs: 60 * 60 * 1000 }
	});

	afterAll(async () => {
		// Ensure we stop background tasks
		await service.cleanup();
	});

	test('validateRequest rejects missing fields', () => { // Access private method via any cast
		const validate = (service as any).validateRequest.bind(service) as (req: any) => string | null;

		expect(validate(undefined as any)).toBe('Invalid or missing user_id');

		const missingContent = validate({ user_id: 'u1', notificationType: 'bill_update', priority: 'low'  });
		expect(missingContent).toBe('Invalid or missing content');
	});

	test('getBatchKey produces expected patterns', () => { const getBatchKey = (service as any).getBatchKey.bind(service) as (user_id: string, freq: string) => string;

		const daily = getBatchKey('user-123', 'daily');
		expect(daily).toMatch(/user-123-daily-/);

		const hourly = getBatchKey('u', 'hourly');
		expect(hourly).toMatch(/u-hourly-\d{4 }-\d{2}-\d{2}-\d{2}/);

		const immediate = getBatchKey('u', 'immediate');
		expect(immediate).toMatch(/u-immediate-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}/);
	});

	test('mergeChannels overrides global channels when per-bill specified', () => {
		const mergeChannels = (service as any).mergeChannels.bind(service) as (global: any, per?: any) => any;

		const global = { inApp: true, email: false, push: false, sms: false };
		const merged = mergeChannels(global, ['email', 'push']);

		expect(merged.email).toBe(true);
		expect(merged.push).toBe(true);
		expect(merged.inApp).toBe(false);
		expect(merged.sms).toBe(false);
	});

	test('calculateBatchSchedule returns a future date for immediate', () => {
		const calculateBatchSchedule = (service as any).calculateBatchSchedule.bind(service) as (freq: string) => Date;

		const now = Date.now();
		const scheduled = calculateBatchSchedule('immediate');
		expect(scheduled.getTime()).toBeGreaterThan(now);
	});

	test('chunkArray splits arrays into appropriate sizes', () => {
		const chunkArray = (service as any).chunkArray.bind(service) as <T>(array: T[], size: number) => T[][];

		const chunks = chunkArray([1, 2, 3, 4, 5], 2);
		expect(chunks.length).toBe(3);
		expect(chunks[0]).toEqual([1, 2]);
		expect(chunks[2]).toEqual([5]);
	});
});


