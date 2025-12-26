// ============================================================================
// COMPLETE BILL ANALYSIS EXAMPLE
// ============================================================================
// Demonstrates how to use multiple models together for comprehensive analysis

import { 
  getModelManager, 
  batchProcess, 
  getRecommendedModels,
  ModelType 
} from './index';

/**
 * Comprehensive bill analysis result
 */
interface BillAnalysisResult {
  billId: string;
  timestamp: string;
  
  // Classification results
  classification: {
    urgency: any;
    topics: any;
    publicInterest: any;
  };
  
  // Constitutional analysis
  constitutional: {
    alignmentScore: number;
    violations: any[];
    recommendations: string[];
  };
  
  // Trojan bill detection
  trojanAnalysis: {
    riskScore: number;
    hiddenProvisions: any[];
    redFlags: string[];
  };
  
  // Transparency assessment
  transparency: {
    score: number;
    grade: string;
    weaknesses: string[];
  };
  
  // Sponsor conflict analysis
  conflicts: {
    hasConflict: boolean;
    conflictScore: number;
    conflicts: any[];
  };
  
  // Sentiment analysis
  sentiment: {
    overall: string;
    score: number;
    emotions: any;
  };
  
  // Overall assessment
  overallAssessment: {
    score: number;
    concerns: string[];
    recommendations: string[];
  };
}

/**
 * Comprehensive bill analysis
 */
export async function analyzeBill(billData: {
  id: string;
  text: string;
  title: string;
  sponsorId: string;
  pageCount: number;
  consultationPeriod: number;
  sponsorData: any;
}): Promise<BillAnalysisResult> {
  
  console.log(`Starting comprehensive analysis for bill: ${billData.title}`);
  
  const manager = getModelManager();
  
  // Preload all needed models
  const modelsToLoad = getRecommendedModels('comprehensive_analysis');
  console.log(`Preloading ${modelsToLoad.length} models...`);
  await manager.preloadModels(modelsToLoad);
  
  // Step 1: Real-time classification (fast)
  console.log('Step 1: Classifying content...');
  const classifier = await manager.loadModel('real-time-classifier');
  const classification = await classifier.classify({
    content: {
      text: billData.text,
      title: billData.title,
      source: 'bill',
      timestamp: new Date().toISOString()
    },
    classificationTasks: [
      'urgency_level',
      'topic_category',
      'public_interest_level',
      'misinformation_risk'
    ]
  });
  
  // Step 2: Sentiment analysis
  console.log('Step 2: Analyzing sentiment...');
  const sentimentAnalyzer = await manager.loadModel('sentiment-analyzer');
  const sentiment = await sentimentAnalyzer.analyze({
    text: billData.text,
    context: 'bill_comment',
    language: 'en'
  });
  
  // Step 3: Batch process heavy analyses
  console.log('Step 3: Running parallel analyses...');
  const [constitutional, trojan, transparency, conflicts] = await batchProcess([
    {
      modelType: 'constitutional-analyzer' as ModelType,
      operation: (model) => model.analyze({
        billText: billData.text,
        billTitle: billData.title,
        billType: 'public'
      })
    },
    {
      modelType: 'trojan-bill-detector' as ModelType,
      operation: (model) => model.analyze({
        billText: billData.text,
        billTitle: billData.title,
        pageCount: billData.pageCount,
        scheduleCount: 5,
        amendmentCount: 0,
        consultationPeriod: billData.consultationPeriod,
        urgencyLevel: classification.classifications.urgencyLevel?.level || 'normal'
      })
    },
    {
      modelType: 'transparency-scorer' as ModelType,
      operation: (model) => model.assess({
        entityType: 'bill',
        entityId: billData.id,
        assessmentData: {
          billData: {
            hasPublicDrafts: true,
            consultationPeriod: billData.consultationPeriod,
            publicHearings: 2,
            amendmentHistory: [],
            votingRecord: { isPublic: false, individualVotes: false },
            impactAssessment: { exists: false, isPublic: false }
          }
        },
        contextualFactors: {
          urgencyLevel: classification.classifications.urgencyLevel?.level || 'normal',
          publicInterest: classification.classifications.publicInterestLevel?.level || 'medium',
          mediaAttention: 'moderate',
          stakeholderCount: 30
        }
      })
    },
    {
      modelType: 'conflict-detector' as ModelType,
      operation: (model) => model.detect({
        billId: billData.id,
        billText: billData.text,
        billTitle: billData.title,
        billSector: classification.classifications.topicCategory?.primary,
        sponsorId: billData.sponsorId,
        sponsorFinancialInterests: billData.sponsorData.financialInterests || [],
        sponsorEmploymentHistory: billData.sponsorData.employmentHistory,
        sponsorFamilyConnections: billData.sponsorData.familyConnections
      })
    }
  ]);
  
  // Step 4: Generate overall assessment
  console.log('Step 4: Generating overall assessment...');
  const overallAssessment = generateOverallAssessment({
    classification,
    constitutional,
    trojan,
    transparency,
    conflicts,
    sentiment
  });
  
  console.log('Analysis complete!');
  
  return {
    billId: billData.id,
    timestamp: new Date().toISOString(),
    classification: {
      urgency: classification.classifications.urgencyLevel,
      topics: classification.classifications.topicCategory,
      publicInterest: classification.classifications.publicInterestLevel
    },
    constitutional: {
      alignmentScore: constitutional.alignmentScore,
      violations: constitutional.violations,
      recommendations: constitutional.recommendations
    },
    trojanAnalysis: {
      riskScore: trojan.trojanRiskScore,
      hiddenProvisions: trojan.hiddenProvisions,
      redFlags: trojan.redFlags
    },
    transparency: {
      score: transparency.overallScore,
      grade: transparency.grade,
      weaknesses: transparency.weaknesses
    },
    conflicts: {
      hasConflict: conflicts.hasConflict,
      conflictScore: conflicts.conflictScore,
      conflicts: conflicts.conflicts
    },
    sentiment: {
      overall: sentiment.overallSentiment,
      score: sentiment.sentimentScore,
      emotions: sentiment.emotions
    },
    overallAssessment
  };
}

/**
 * Generate overall assessment from all analyses
 */
function generateOverallAssessment(results: any): {
  score: number;
  concerns: string[];
  recommendations: string[];
} {
  const concerns = [];
  const recommendations = [];
  let score = 100;
  
  // Constitutional concerns
  if (results.constitutional.alignmentScore < 60) {
    score -= 25;
    concerns.push(`Low constitutional alignment (${results.constitutional.alignmentScore}/100)`);
    recommendations.push('Conduct thorough constitutional review before proceeding');
  }
  
  if (results.constitutional.violations.length > 0) {
    const criticalViolations = results.constitutional.violations.filter(
      (v: any) => v.severity === 'critical'
    );
    if (criticalViolations.length > 0) {
      score -= 30;
      concerns.push(`${criticalViolations.length} critical constitutional violation(s)`);
      recommendations.push('Address critical constitutional violations immediately');
    }
  }
  
  // Trojan bill concerns
  if (results.trojan.trojanRiskScore > 70) {
    score -= 20;
    concerns.push(`High trojan bill risk (${results.trojan.trojanRiskScore}/100)`);
    recommendations.push('Increase scrutiny of hidden provisions and schedules');
  }
  
  if (results.trojan.hiddenProvisions.length > 0) {
    score -= 15;
    concerns.push(`${results.trojan.hiddenProvisions.length} potentially hidden provision(s)`);
    recommendations.push('Review all provisions for clarity and transparency');
  }
  
  // Transparency concerns
  if (results.transparency.score < 60) {
    score -= 15;
    concerns.push(`Low transparency score (${results.transparency.grade})`);
    recommendations.push('Improve transparency in documentation and procedures');
  }
  
  // Conflict of interest concerns
  if (results.conflicts.hasConflict) {
    const highConflicts = results.conflicts.conflicts.filter(
      (c: any) => c.severity === 'high' || c.severity === 'critical'
    );
    if (highConflicts.length > 0) {
      score -= 20;
      concerns.push(`${highConflicts.length} significant conflict(s) of interest`);
      recommendations.push('Sponsor should recuse or disclose all conflicts');
    }
  }
  
  // Urgency concerns
  if (results.classification.urgency?.level === 'urgent' || 
      results.classification.urgency?.level === 'critical') {
    concerns.push('Bill marked as urgent - ensure adequate review time');
    recommendations.push('Verify justification for urgency classification');
  }
  
  // Sentiment concerns
  if (results.sentiment.overall === 'very_negative') {
    concerns.push('Highly negative public sentiment detected');
    recommendations.push('Consider stakeholder concerns and public feedback');
  }
  
  // Generate positive notes if score is high
  if (score > 80) {
    recommendations.push('Bill demonstrates strong constitutional alignment');
  }
  
  if (results.transparency.score > 80) {
    recommendations.push('Excellent transparency practices observed');
  }
  
  return {
    score: Math.max(0, score),
    concerns,
    recommendations
  };
}

/**
 * Example usage
 */
export async function exampleUsage() {
  const billData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    text: `
      The Financial Services Reform Bill seeks to modernize Kenya's financial sector
      by introducing new regulations for digital banking and cryptocurrency.
      
      Section 1: All financial institutions must register with the Central Bank.
      Section 2: Cryptocurrency exchanges require special licensing.
      Section 3: Minister may impose additional regulations as deemed necessary.
      
      The bill aims to protect consumers while fostering innovation in fintech.
    `,
    title: 'Financial Services Reform Bill 2024',
    sponsorId: '456e7890-e89b-12d3-a456-426614174001',
    pageCount: 45,
    consultationPeriod: 21,
    sponsorData: {
      financialInterests: [
        {
          type: 'stock',
          entityName: 'Digital Bank Kenya',
          sector: 'financial_services',
          value: 250000,
          ownershipPercentage: 3
        }
      ],
      employmentHistory: [
        {
          employer: 'Kenya Bankers Association',
          position: 'Policy Advisor',
          sector: 'financial_services',
          startDate: '2020-01-01',
          endDate: '2023-06-01'
        }
      ],
      familyConnections: []
    }
  };
  
  try {
    const result = await analyzeBill(billData);
    
    console.log('\n=== ANALYSIS RESULTS ===\n');
    console.log(`Overall Score: ${result.overallAssessment.score}/100`);
    console.log(`Constitutional Alignment: ${result.constitutional.alignmentScore}/100`);
    console.log(`Transparency Grade: ${result.transparency.grade}`);
    console.log(`Trojan Risk: ${result.trojanAnalysis.riskScore}/100`);
    console.log(`Conflict Score: ${result.conflicts.conflictScore}/100`);
    
    if (result.overallAssessment.concerns.length > 0) {
      console.log('\nConcerns:');
      result.overallAssessment.concerns.forEach((concern, i) => {
        console.log(`  ${i + 1}. ${concern}`);
      });
    }
    
    if (result.overallAssessment.recommendations.length > 0) {
      console.log('\nRecommendations:');
      result.overallAssessment.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// Run example if this is the main module
if (require.main === module) {
  exampleUsage()
    .then(() => console.log('\nExample completed successfully'))
    .catch(error => console.error('Example failed:', error));
}
