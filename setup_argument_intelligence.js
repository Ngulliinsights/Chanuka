#!/usr/bin/env node

/**
 * Argument Intelligence Setup Script
 * Ensures all argument intelligence functionality is properly configured
 */

import fs from 'fs/promises';
import path from 'path';

const log = {
  info: (msg) => console.log(`ℹ ${msg}`),
  success: (msg) => console.log(`✓ ${msg}`),
  warning: (msg) => console.log(`⚠ ${msg}`),
  error: (msg) => console.log(`✗ ${msg}`),
  section: (msg) => console.log(`\n═══ ${msg} ═══`),
};

async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
    return true;
  } catch (error) {
    log.error(`Failed to create ${filePath}: ${error.message}`);
    return false;
  }
}

async function setupArgumentIntelligence() {
  log.section('Argument Intelligence Setup');

  const baseDir = 'server/features/argument-intelligence';
  let created = 0;
  let existing = 0;

  // Check core files
  const coreFiles = [
    `${baseDir}/application/structure-extractor.ts`,
    `${baseDir}/application/clustering-service.ts`,
    `${baseDir}/infrastructure/nlp/sentence-classifier.ts`,
    `${baseDir}/infrastructure/nlp/similarity-calculator.ts`,
    'shared/schema/argument_intelligence.ts'
  ];

  for (const file of coreFiles) {
    if (await checkFileExists(file)) {
      log.success(`Found: ${file}`);
      existing++;
    } else {
      log.warning(`Missing: ${file}`);
    }
  }

  // Create missing types file if needed
  const typesFile = `${baseDir}/types/argument.types.ts`;
  if (!(await checkFileExists(typesFile))) {
    const typesContent = `/**
 * Argument Intelligence Type Definitions
 */

export interface Claim {
  id: string;
  text: string;
  type: ClaimType;
  confidence: number;
  sources: string[];
  position: 'support' | 'oppose' | 'neutral';
}

export type ClaimType =
  | 'factual'
  | 'value'
  | 'policy'
  | 'interpretive'
  | 'procedural';

export interface Evidence {
  id: string;
  claimId: string;
  text: string;
  type: EvidenceType;
  quality: EvidenceQuality;
  source?: string;
  verified: boolean;
}

export type EvidenceType =
  | 'statistical'
  | 'anecdotal'
  | 'expert_opinion'
  | 'legal_precedent'
  | 'empirical_study'
  | 'constitutional_reference';

export interface EvidenceQuality {
  score: number; // 0-1
  factors: {
    credibility: number;
    relevance: number;
    recency: number;
    verifiability: number;
  };
}

export interface Argument {
  id: string;
  billId: string;
  userId: string;
  claims: Claim[];
  evidence: Evidence[];
  reasoning: string;
  strength: number;
  position: 'support' | 'oppose' | 'neutral';
  createdAt: Date;
  processedAt?: Date;
}

export interface ArgumentCluster {
  id: string;
  billId: string;
  name: string;
  description: string;
  arguments: string[]; // argument IDs
  representativeClaims: Claim[];
  size: number;
  cohesion: number; // 0-1
  position: 'support' | 'oppose' | 'mixed';
}
`;

    if (await createFile(typesFile, typesContent)) {
      log.success(`Created: ${typesFile}`);
      created++;
    }
  } else {
    existing++;
  }

  // Create API routes if missing
  const routesFile = `${baseDir}/routes.ts`;
  if (!(await checkFileExists(routesFile))) {
    const routesContent = `/**
 * Argument Intelligence API Routes
 */

import { Router } from 'express';
import { argumentIntelligenceService } from './application/argument-intelligence-service';

const router = Router();

// Process comment into argument
router.post('/process', async (req, res) => {
  try {
    const { commentText, billId, userId } = req.body;

    if (!commentText || !billId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: commentText, billId, userId'
      });
    }

    const argument = await argumentIntelligenceService.processComment({
      text: commentText,
      billId,
      userId
    });

    res.status(201).json({
      success: true,
      argument: {
        id: argument.id,
        claims: argument.claims.length,
        evidence: argument.evidence.length,
        position: argument.position,
        strength: argument.strength
      }
    });
  } catch (error) {
    console.error('Error processing comment:', error);
    res.status(500).json({ error: 'Failed to process comment' });
  }
});

// Get arguments for a bill
router.get('/bill/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const arguments = await argumentIntelligenceService.getArgumentsByBill(billId);

    res.json({
      success: true,
      count: arguments.length,
      arguments
    });
  } catch (error) {
    console.error('Error fetching arguments:', error);
    res.status(500).json({ error: 'Failed to fetch arguments' });
  }
});

// Cluster arguments for a bill
router.post('/cluster/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const { method = 'kmeans', maxClusters } = req.body;

    const clusters = await argumentIntelligenceService.clusterArguments(billId, {
      method,
      maxClusters
    });

    res.json({
      success: true,
      billId,
      clusters: clusters.map(c => ({
        id: c.id,
        name: c.name,
        size: c.size,
        position: c.position,
        cohesion: c.cohesion,
        representativeClaims: c.representativeClaims.slice(0, 3)
      }))
    });
  } catch (error) {
    console.error('Error clustering arguments:', error);
    res.status(500).json({ error: 'Failed to cluster arguments' });
  }
});

export default router;
`;

    if (await createFile(routesFile, routesContent)) {
      log.success(`Created: ${routesFile}`);
      created++;
    }
  } else {
    existing++;
  }

  log.section('Setup Summary');
  log.info(`Files created: ${created}`);
  log.info(`Files existing: ${existing}`);

  if (existing > 0) {
    log.success('Argument Intelligence is already set up!');
  }

  if (created > 0) {
    log.success('Additional files created successfully!');
  }

  return { created, existing };
}

async function main() {
  try {
    await setupArgumentIntelligence();
    log.success('Argument Intelligence setup completed!');
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

main();
