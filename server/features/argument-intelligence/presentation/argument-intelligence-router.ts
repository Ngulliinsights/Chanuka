// ============================================================================
// ARGUMENT INTELLIGENCE - REST API Router
// ============================================================================
// Complete REST API for argument intelligence operations

import { Router } from 'express';
import { logger  } from '../../../../shared/core/src/index.js';
import { ArgumentProcessor } from '../application/argument-processor.js';
import { StructureExtractorService } from '../application/structure-extractor.js';
import { ClusteringService } from '../application/clustering-service.js';
import { CoalitionFinderService } from '../application/coalition-finder.js';
import { EvidenceValidatorService } from '../application/evidence-validator.js';
import { BriefGeneratorService } from '../application/brief-generator.js';
import { PowerBalancerService } from '../application/power-balancer.js';
import { argumentIntelligenceService } from '../application/argument-intelligence-service.js';
import { SentenceClassifier } from '../infrastructure/nlp/sentence-classifier.js';
import { EntityExtractor } from '../infrastructure/nlp/entity-extractor.js';
import { SimilarityCalculator } from '../infrastructure/nlp/similarity-calculator.js';
import { db  } from '../../../../shared/core/src/index.js';

export const router = Router();

// Initialize services
const sentenceClassifier = new SentenceClassifier();
const entityExtractor = new EntityExtractor();
const similarityCalculator = new SimilarityCalculator();
const structureExtractor = new StructureExtractorService(sentenceClassifier, entityExtractor, similarityCalculator);
const clusteringService = new ClusteringService(similarityCalculator);
const coalitionFinder = new CoalitionFinderService(similarityCalculator);
const evidenceValidator = new EvidenceValidatorService();
const briefGenerator = new BriefGeneratorService();
const powerBalancer = new PowerBalancerService();
// Repository pattern replaced with consolidated service

const argumentProcessor = new ArgumentProcessor(
  structureExtractor,
  clusteringService,
  evidenceValidator,
  coalitionFinder,
  briefGenerator,
  powerBalancer,
  argumentIntelligenceService
);

// ============================================================================
// Comment Processing Endpoints
// ============================================================================

/**
 * Process a single comment for argument extraction
 * POST /api/argument-intelligence/process-comment
 */
router.post('/process-comment', async (req, res) => {
  try {
    const { comment_id, bill_id, commentText, user_id, userDemographics, submissionContext } = req.body;

    if (!comment_id || !bill_id || !commentText || !user_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['comment_id', 'bill_id', 'commentText', 'user_id']
      });
    }

    const request = {
      comment_id,
      bill_id,
      commentText,
      user_id,
      userDemographics,
      submissionContext
    };

    const result = await argumentProcessor.processComment(request);

    res.json({
      success: true,
      data: result,
      message: `Extracted ${result.extractedArguments.length} arguments from comment`
    });

  } catch (error) {
    logger.error('Comment processing failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Comment processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Extract argument structure from text
 * POST /api/argument-intelligence/extract-structure
 */
router.post('/extract-structure', async (req, res) => {
  try {
    const { text, bill_id, userContext, submissionContext } = req.body;

    if (!text || !bill_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['text', 'bill_id']
      });
    }

    const context = {
      bill_id,
      userContext,
      submissionContext
    };

    const extractedArguments = await structureExtractor.extractArguments(text, context);
    const argumentChains = await structureExtractor.extractArgumentChains(text, context);

    res.json({
      success: true,
      data: {
        arguments: extractedArguments,
        argumentChains,
        extractionMetrics: {
          argumentsExtracted: extractedArguments.length,
          chainsIdentified: argumentChains.length,
          averageConfidence: extractedArguments.reduce((sum, arg) => sum + arg.confidence, 0) / extractedArguments.length || 0
        }
      }
    });

  } catch (error) {
    logger.error('Structure extraction failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Structure extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Bill Analysis Endpoints
// ============================================================================

/**
 * Synthesize arguments for a bill
 * POST /api/argument-intelligence/synthesize-bill/:billId
 */
router.post('/synthesize-bill/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;

    const synthesis = await argumentProcessor.synthesizeBillArguments(bill_id);

    res.json({
      success: true,
      data: synthesis,
      message: `Synthesized ${synthesis.majorClaims.length} major claims for bill`
    });

  } catch (error) {
    logger.error('Bill synthesis failed', {
      component: 'ArgumentIntelligenceRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Bill synthesis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get argument map for bill visualization
 * GET /api/argument-intelligence/argument-map/:billId
 */
router.get('/argument-map/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;

    const argumentMap = await argumentProcessor.getArgumentMap(bill_id);

    res.json({
      success: true,
      data: argumentMap,
      message: 'Argument map retrieved successfully'
    });

  } catch (error) {
    logger.error('Argument map retrieval failed', {
      component: 'ArgumentIntelligenceRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Argument map retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Clustering Endpoints
// ============================================================================

/**
 * Cluster arguments by similarity
 * POST /api/argument-intelligence/cluster-arguments
 */
router.post('/cluster-arguments', async (req, res) => {
  try {
    const { arguments: args, config } = req.body;

    if (!args || !Array.isArray(args)) {
      return res.status(400).json({
        error: 'Invalid arguments array provided'
      });
    }

    const clusteringResult = await clusteringService.clusterArguments(args, config);

    res.json({
      success: true,
      data: clusteringResult,
      message: `Formed ${clusteringResult.clusters.length} clusters from ${args.length} arguments`
    });

  } catch (error) {
    logger.error('Argument clustering failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Argument clustering failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Find similar arguments
 * POST /api/argument-intelligence/find-similar
 */
router.post('/find-similar', async (req, res) => {
  try {
    const { query, arguments: args, threshold } = req.body;

    if (!query || !args) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['query', 'arguments']
      });
    }

    const similarArguments = await clusteringService.findSimilarArguments(
      query,
      args,
      threshold || 0.6
    );

    res.json({
      success: true,
      data: {
        query,
        similarArguments,
        count: similarArguments.length
      }
    });

  } catch (error) {
    logger.error('Similar argument search failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Similar argument search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Coalition Finding Endpoints
// ============================================================================

/**
 * Find potential coalitions
 * POST /api/argument-intelligence/find-coalitions
 */
router.post('/find-coalitions', async (req, res) => {
  try {
    const { arguments: args, userDemographics } = req.body;

    if (!args || !Array.isArray(args)) {
      return res.status(400).json({
        error: 'Invalid arguments array provided'
      });
    }

    const coalitions = await coalitionFinder.findPotentialCoalitions(args, userDemographics);

    res.json({
      success: true,
      data: {
        coalitions,
        count: coalitions.length
      },
      message: `Found ${coalitions.length} potential coalition opportunities`
    });

  } catch (error) {
    logger.error('Coalition finding failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Coalition finding failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Discover coalition opportunities for a bill
 * GET /api/argument-intelligence/coalition-opportunities/:billId
 */
router.get('/coalition-opportunities/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;

    // Get stakeholder profiles from args
    const args = await argumentRepo.getArgumentsByBill(bill_id);
    const stakeholderProfiles = await coalitionFinder.buildStakeholderProfiles(args);

    const opportunities = await coalitionFinder.discoverCoalitionOpportunities(bill_id, stakeholderProfiles);

    res.json({
      success: true,
      data: {
        opportunities,
        count: opportunities.length
      },
      message: `Discovered ${opportunities.length} coalition opportunities`
    });

  } catch (error) {
    logger.error('Coalition opportunity discovery failed', {
      component: 'ArgumentIntelligenceRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Coalition opportunity discovery failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Evidence Validation Endpoints
// ============================================================================

/**
 * Validate evidence claim
 * POST /api/argument-intelligence/validate-evidence
 */
router.post('/validate-evidence', async (req, res) => {
  try {
    const { claim } = req.body;

    if (!claim || !claim.text) {
      return res.status(400).json({
        error: 'Invalid evidence claim provided'
      });
    }

    const validationResult = await evidenceValidator.validateEvidenceClaim(claim);

    res.json({
      success: true,
      data: validationResult,
      message: `Evidence validation completed with ${validationResult.validationStatus} status`
    });

  } catch (error) {
    logger.error('Evidence validation failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Evidence validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Assess evidence base for a bill
 * GET /api/argument-intelligence/evidence-assessment/:billId
 */
router.get('/evidence-assessment/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;

    const args = await argumentRepo.getArgumentsByBill(bill_id);
    const assessment = await evidenceValidator.assessEvidenceBase(args);

    res.json({
      success: true,
      data: {
        ...assessment,
        bill_id
      },
      message: `Evidence assessment completed for ${assessment.evidenceBase.length} claims`
    });

  } catch (error) {
    logger.error('Evidence assessment failed', {
      component: 'ArgumentIntelligenceRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Evidence assessment failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Brief Generation Endpoints
// ============================================================================

/**
 * Generate legislative brief
 * POST /api/argument-intelligence/generate-brief
 */
router.post('/generate-brief', async (req, res) => {
  try {
    const briefRequest = req.body;

    if (!briefRequest.bill_id) {
      return res.status(400).json({
        error: 'Bill ID is required'
      });
    }

    const brief = await briefGenerator.generateBrief(briefRequest);

    // Store the brief
    const storedBrief = {
      id: brief.id,
      bill_id: brief.bill_id,
      briefType: brief.briefType,
      targetAudience: brief.targetAudience,
      executiveSummary: brief.executiveSummary,
      keyFindings: JSON.stringify(brief.keyFindings),
      stakeholderAnalysis: JSON.stringify(brief.stakeholderAnalysis),
      evidenceAssessment: JSON.stringify(brief.evidenceAssessment),
      recommendationsSection: JSON.stringify(brief.recommendationsSection),
      appendices: JSON.stringify(brief.appendices),
      metadata: JSON.stringify(brief.metadata),
      generatedAt: brief.generatedAt
    };

    await briefRepo.storeBrief(storedBrief);

    res.json({
      success: true,
      data: brief,
      message: 'Legislative brief generated successfully'
    });

  } catch (error) {
    logger.error('Brief generation failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Brief generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate public summary
 * POST /api/argument-intelligence/generate-public-summary
 */
router.post('/generate-public-summary', async (req, res) => {
  try {
    const briefRequest = req.body;

    if (!briefRequest.bill_id) {
      return res.status(400).json({
        error: 'Bill ID is required'
      });
    }

    const summary = await briefGenerator.generatePublicSummary(briefRequest);

    res.json({
      success: true,
      data: {
        summary,
        bill_id: briefRequest.bill_id
      },
      message: 'Public summary generated successfully'
    });

  } catch (error) {
    logger.error('Public summary generation failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Public summary generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Power Balancing Endpoints
// ============================================================================

/**
 * Balance stakeholder voices
 * POST /api/argument-intelligence/balance-voices
 */
router.post('/balance-voices', async (req, res) => {
  try {
    const { stakeholderPositions, argumentData } = req.body;

    if (!stakeholderPositions || !argumentData) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['stakeholderPositions', 'argumentData']
      });
    }

    const balancingResult = await powerBalancer.balanceStakeholderVoices(
      stakeholderPositions,
      argumentData
    );

    res.json({
      success: true,
      data: balancingResult,
      message: `Balanced ${balancingResult.balancedPositions.length} stakeholder positions`
    });

  } catch (error) {
    logger.error('Voice balancing failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Voice balancing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Detect astroturfing
 * POST /api/argument-intelligence/detect-astroturfing
 */
router.post('/detect-astroturfing', async (req, res) => {
  try {
    const { argumentData: args } = req.body;

    if (!args || !Array.isArray(args)) {
      return res.status(400).json({
        error: 'Invalid argument data provided'
      });
    }

    const campaigns = await powerBalancer.detectAstroturfing(args);

    res.json({
      success: true,
      data: {
        campaigns,
        count: campaigns.length
      },
      message: `Detected ${campaigns.length} potential coordinated campaigns`
    });

  } catch (error) {
    logger.error('Astroturfing detection failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Astroturfing detection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Data Retrieval Endpoints
// ============================================================================

/**
 * Get arguments for a bill
 * GET /api/argument-intelligence/arguments/:billId
 */
router.get('/arguments/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;
    const { 
      argumentType, 
      position, 
      minConfidence, 
      limit = 50, 
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      argumentType: argumentType as string,
      position: position as string,
      minConfidence: minConfidence ? parseFloat(minConfidence as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as any,
      sortOrder: sortOrder as any
    };

    const args = await argumentRepo.getArgumentsByBill(bill_id, options);

    res.json({
      success: true,
      data: {
        arguments: args,
        count: args.length,
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      }
    });

  } catch (error) {
    logger.error('Arguments retrieval failed', {
      component: 'ArgumentIntelligenceRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Arguments retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Search arguments by text
 * GET /api/argument-intelligence/search
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query, bill_id, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const args = await argumentRepo.searchArgumentsByText(
      query as string,
      bill_id as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        query,
        arguments: args,
        count: args.length
      }
    });

  } catch (error) {
    logger.error('Argument search failed', {
      component: 'ArgumentIntelligenceRouter',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Argument search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get argument statistics
 * GET /api/argument-intelligence/statistics/:billId
 */
router.get('/statistics/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;

    const statistics = await argumentRepo.getArgumentStatistics(bill_id);

    res.json({
      success: true,
      data: {
        ...statistics,
        bill_id
      }
    });

  } catch (error) {
    logger.error('Statistics retrieval failed', {
      component: 'ArgumentIntelligenceRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Statistics retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get briefs for a bill
 * GET /api/argument-intelligence/briefs/:billId
 */
router.get('/briefs/:bill_id', async (req, res) => {
  try {
    const { bill_id } = req.params;
    const { briefType, limit = 10 } = req.query;

    const briefs = await briefRepo.getBriefsByBill(
      bill_id,
      briefType as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        briefs,
        count: briefs.length
      }
    });

  } catch (error) {
    logger.error('Briefs retrieval failed', {
      component: 'ArgumentIntelligenceRouter',
      bill_id: req.params.bill_id,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Briefs retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get specific brief
 * GET /api/argument-intelligence/brief/:briefId
 */
router.get('/brief/:briefId', async (req, res) => {
  try {
    const { briefId } = req.params;

    const brief = await briefRepo.getBrief(briefId);

    if (!brief) {
      return res.status(404).json({
        error: 'Brief not found'
      });
    }

    res.json({
      success: true,
      data: brief
    });

  } catch (error) {
    logger.error('Brief retrieval failed', {
      component: 'ArgumentIntelligenceRouter',
      briefId: req.params.briefId,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Brief retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Health Check Endpoint
// ============================================================================

/**
 * Health check endpoint
 * GET /api/argument-intelligence/health
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connectivity
    const argumentCount = await argumentRepo.getArgumentCountByBill('test');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        argumentProcessor: 'ready',
        nlpServices: 'ready'
      }
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as argumentIntelligenceRouter };