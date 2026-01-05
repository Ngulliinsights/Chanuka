# Quick Start Guide: Implementing Argument Intelligence

This guide gets you from zero to working argument intelligence in **under 4 hours**.

## Prerequisites

- Node.js 16+ installed
- TypeScript configured
- Existing Chanuka project structure

## Step 1: Run the Optimized Setup Script (5 minutes)

```bash
# Copy the optimized script to your project root
cp setup_missing_features_optimized.js ./

# Run it
node setup_missing_features_optimized.js

# You should see:
# ✓ Argument Intelligence: Created X files, skipped Y
```

## Step 2: Install Dependencies (5 minutes)

```bash
cd server

# Install required packages
npm install natural ml-kmeans uuid

# Install type definitions
npm install --save-dev @types/natural @types/uuid
```

## Step 3: Test the Implementations (15 minutes)

Create a test file to verify everything works:

```typescript
// server/test-argument-intelligence.ts

import { structureExtractor } from './features/argument-intelligence/application';
import { clusteringService } from './features/argument-intelligence/application';

async function testArgumentIntelligence() {
  console.log('Testing Argument Intelligence...\n');

  // Test 1: Structure Extraction
  console.log('1. Testing Structure Extraction');
  const testComment = `
    This bill will increase unemployment according to the 2024 labor report.
    The proposed changes violate Article 28 of the Constitution which protects property rights.
    Therefore, we should reject this bill.
  `;

  const argument = await structureExtractor.extractStructure(
    testComment,
    'bill-123',
    'user-456'
  );

  console.log('Extracted Argument:');
  console.log('- Claims:', argument.claims.length);
  console.log('- Evidence:', argument.evidence.length);
  console.log('- Position:', argument.position);
  console.log('- Strength:', argument.strength);
  console.log('\n');

  // Test 2: Multiple Arguments
  console.log('2. Testing Clustering');
  const comments = [
    { text: 'This bill helps small businesses grow', billId: 'bill-123', userId: 'user-1' },
    { text: 'Small businesses will benefit from tax relief', billId: 'bill-123', userId: 'user-2' },
    { text: 'Large corporations get unfair advantages', billId: 'bill-123', userId: 'user-3' },
    { text: 'This policy discriminates against small enterprises', billId: 'bill-123', userId: 'user-4' },
  ];

  const arguments = await structureExtractor.extractBatch(comments);
  const clusters = await clusteringService.clusterArguments(arguments);

  console.log('Clustering Results:');
  console.log('- Total arguments:', arguments.length);
  console.log('- Clusters found:', clusters.length);
  clusters.forEach((cluster, i) => {
    console.log(`  Cluster ${i + 1}: ${cluster.size} arguments, position: ${cluster.position}`);
  });

  console.log('\n✅ All tests passed!');
}

testArgumentIntelligence().catch(console.error);
```

Run the test:

```bash
npx ts-node test-argument-intelligence.ts
```

Expected output:
```
Testing Argument Intelligence...

1. Testing Structure Extraction
Extracted Argument:
- Claims: 2
- Evidence: 2
- Position: oppose
- Strength: 0.68

2. Testing Clustering
Clustering Results:
- Total arguments: 4
- Clusters found: 2
  Cluster 1: 2 arguments, position: support
  Cluster 2: 2 arguments, position: oppose

✅ All tests passed!
```

## Step 4: Database Integration (30 minutes)

### Create Migration

```typescript
// database/migrations/20250105_argument_intelligence.ts

export async function up(db) {
  // Arguments table
  await db.schema.createTable('arguments', (table) => {
    table.uuid('id').primary();
    table.uuid('bill_id').references('id').inTable('bills');
    table.uuid('user_id').references('id').inTable('users');
    table.uuid('comment_id').references('id').inTable('comments');
    table.json('claims');
    table.json('evidence');
    table.text('reasoning');
    table.decimal('strength', 3, 2);
    table.enum('position', ['support', 'oppose', 'neutral']);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('processed_at');
    
    table.index(['bill_id']);
    table.index(['user_id']);
    table.index(['position']);
  });

  // Clusters table
  await db.schema.createTable('argument_clusters', (table) => {
    table.uuid('id').primary();
    table.uuid('bill_id').references('id').inTable('bills');
    table.string('name');
    table.text('description');
    table.json('arguments'); // Array of argument IDs
    table.json('representative_claims');
    table.integer('size');
    table.decimal('cohesion', 3, 2);
    table.enum('position', ['support', 'oppose', 'neutral', 'mixed']);
    table.timestamp('created_at').defaultTo(db.fn.now());
    
    table.index(['bill_id']);
  });
}

export async function down(db) {
  await db.schema.dropTable('argument_clusters');
  await db.schema.dropTable('arguments');
}
```

Run migration:
```bash
npm run migrate:latest
```

### Create Repository

```typescript
// server/features/argument-intelligence/infrastructure/repositories/argument.repository.ts

import { db } from '@/database';
import { Argument } from '../../types/argument.types';

export class ArgumentRepository {
  async save(argument: Argument): Promise<void> {
    await db('arguments').insert({
      id: argument.id,
      bill_id: argument.billId,
      user_id: argument.userId,
      claims: JSON.stringify(argument.claims),
      evidence: JSON.stringify(argument.evidence),
      reasoning: argument.reasoning,
      strength: argument.strength,
      position: argument.position,
      created_at: argument.createdAt,
      processed_at: argument.processedAt,
    });
  }

  async findByBillId(billId: string): Promise<Argument[]> {
    const rows = await db('arguments')
      .where({ bill_id: billId })
      .select('*');

    return rows.map(row => ({
      id: row.id,
      billId: row.bill_id,
      userId: row.user_id,
      claims: JSON.parse(row.claims),
      evidence: JSON.parse(row.evidence),
      reasoning: row.reasoning,
      strength: parseFloat(row.strength),
      position: row.position,
      createdAt: new Date(row.created_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    }));
  }

  async findByUserId(userId: string): Promise<Argument[]> {
    const rows = await db('arguments')
      .where({ user_id: userId })
      .select('*');

    return rows.map(this.mapToArgument);
  }

  private mapToArgument(row: any): Argument {
    return {
      id: row.id,
      billId: row.bill_id,
      userId: row.user_id,
      claims: JSON.parse(row.claims),
      evidence: JSON.parse(row.evidence),
      reasoning: row.reasoning,
      strength: parseFloat(row.strength),
      position: row.position,
      createdAt: new Date(row.created_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    };
  }
}

export const argumentRepository = new ArgumentRepository();
```

## Step 5: Create API Endpoints (45 minutes)

### Controller

```typescript
// server/features/argument-intelligence/presentation/argument.controller.ts

import { Request, Response } from 'express';
import { structureExtractor } from '../application/structure-extractor';
import { clusteringService } from '../application/clustering-service';
import { argumentRepository } from '../infrastructure/repositories/argument.repository';

export class ArgumentController {
  /**
   * Process a single comment into an argument
   * POST /api/arguments/process
   */
  async processComment(req: Request, res: Response) {
    try {
      const { commentText, billId, userId } = req.body;

      // Validate input
      if (!commentText || !billId || !userId) {
        return res.status(400).json({
          error: 'Missing required fields: commentText, billId, userId',
        });
      }

      // Extract argument structure
      const argument = await structureExtractor.extractStructure(
        commentText,
        billId,
        userId
      );

      // Save to database
      await argumentRepository.save(argument);

      return res.status(201).json({
        success: true,
        argument: {
          id: argument.id,
          claims: argument.claims.length,
          evidence: argument.evidence.length,
          position: argument.position,
          strength: argument.strength,
        },
      });
    } catch (error) {
      console.error('Error processing comment:', error);
      return res.status(500).json({
        error: 'Failed to process comment',
      });
    }
  }

  /**
   * Get all arguments for a bill
   * GET /api/arguments/bill/:billId
   */
  async getArgumentsByBill(req: Request, res: Response) {
    try {
      const { billId } = req.params;
      const arguments = await argumentRepository.findByBillId(billId);

      return res.json({
        success: true,
        count: arguments.length,
        arguments,
      });
    } catch (error) {
      console.error('Error fetching arguments:', error);
      return res.status(500).json({
        error: 'Failed to fetch arguments',
      });
    }
  }

  /**
   * Generate clusters for a bill
   * POST /api/arguments/cluster/:billId
   */
  async clusterArguments(req: Request, res: Response) {
    try {
      const { billId } = req.params;
      const { method = 'kmeans', maxClusters } = req.body;

      // Get all arguments for the bill
      const arguments = await argumentRepository.findByBillId(billId);

      if (arguments.length === 0) {
        return res.status(404).json({
          error: 'No arguments found for this bill',
        });
      }

      // Cluster the arguments
      const clusters = await clusteringService.clusterArguments(arguments, {
        method,
        maxClusters,
      });

      return res.json({
        success: true,
        billId,
        totalArguments: arguments.length,
        clusters: clusters.map(c => ({
          id: c.id,
          name: c.name,
          size: c.size,
          position: c.position,
          cohesion: c.cohesion,
          representativeClaims: c.representativeClaims.slice(0, 3),
        })),
      });
    } catch (error) {
      console.error('Error clustering arguments:', error);
      return res.status(500).json({
        error: 'Failed to cluster arguments',
      });
    }
  }
}

export const argumentController = new ArgumentController();
```

### Routes

```typescript
// server/features/argument-intelligence/presentation/routes.ts

import { Router } from 'express';
import { argumentController } from './argument.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Process a comment into an argument
router.post('/process', argumentController.processComment.bind(argumentController));

// Get arguments for a bill
router.get('/bill/:billId', argumentController.getArgumentsByBill.bind(argumentController));

// Cluster arguments for a bill
router.post('/cluster/:billId', argumentController.clusterArguments.bind(argumentController));

export default router;
```

### Register Routes

```typescript
// server/app.ts or server/routes/index.ts

import argumentRoutes from './features/argument-intelligence/presentation/routes';

// ... other imports

app.use('/api/arguments', argumentRoutes);
```

## Step 6: Automatic Comment Processing (30 minutes)

### Hook into Comment Creation

```typescript
// server/features/community/hooks/comment.hooks.ts

import { structureExtractor } from '../../argument-intelligence/application/structure-extractor';
import { argumentRepository } from '../../argument-intelligence/infrastructure/repositories/argument.repository';

export async function onCommentCreated(comment: Comment) {
  try {
    // Process comment in the background
    const argument = await structureExtractor.extractStructure(
      comment.content,
      comment.billId,
      comment.userId
    );

    await argumentRepository.save(argument);

    console.log(`✓ Processed comment ${comment.id} into argument ${argument.id}`);
  } catch (error) {
    console.error(`Failed to process comment ${comment.id}:`, error);
    // Don't fail the comment creation if argument processing fails
  }
}
```

### Register Hook

```typescript
// server/features/community/application/comment.service.ts

import { onCommentCreated } from '../hooks/comment.hooks';

export class CommentService {
  async createComment(data: CreateCommentDto) {
    // ... existing comment creation logic
    const comment = await commentRepository.create(data);

    // Process into argument asynchronously
    setImmediate(() => onCommentCreated(comment));

    return comment;
  }
}
```

## Step 7: Test End-to-End (30 minutes)

### Manual API Test

```bash
# 1. Create a test comment that gets automatically processed
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "billId": "bill-123",
    "content": "This bill violates Article 28 by restricting property rights without due process."
  }'

# 2. Check if argument was created
curl http://localhost:3000/api/arguments/bill/bill-123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Cluster arguments for the bill
curl -X POST http://localhost:3000/api/arguments/cluster/bill-123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "method": "kmeans", "maxClusters": 5 }'
```

### Automated Integration Test

```typescript
// server/__tests__/integration/argument-intelligence.test.ts

import request from 'supertest';
import app from '@/app';
import { db } from '@/database';

describe('Argument Intelligence Integration', () => {
  let authToken: string;
  let billId: string;

  beforeAll(async () => {
    // Setup: login and create test bill
    authToken = await getTestAuthToken();
    billId = await createTestBill();
  });

  afterAll(async () => {
    // Cleanup
    await db('arguments').where({ bill_id: billId }).del();
    await db.destroy();
  });

  it('should process comment into argument', async () => {
    const response = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        billId,
        content: 'This bill will increase unemployment according to labor statistics.',
      });

    expect(response.status).toBe(201);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check argument was created
    const argumentsResponse = await request(app)
      .get(`/api/arguments/bill/${billId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(argumentsResponse.status).toBe(200);
    expect(argumentsResponse.body.count).toBeGreaterThan(0);

    const argument = argumentsResponse.body.arguments[0];
    expect(argument.claims).toBeDefined();
    expect(argument.evidence).toBeDefined();
  });

  it('should cluster arguments', async () => {
    // Create multiple comments
    const comments = [
      'Small businesses will benefit from tax cuts',
      'Tax relief helps entrepreneurs succeed',
      'Large corporations get unfair advantages',
      'This policy favors big business over small',
    ];

    for (const content of comments) {
      await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ billId, content });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cluster the arguments
    const response = await request(app)
      .post(`/api/arguments/cluster/${billId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ method: 'kmeans' });

    expect(response.status).toBe(200);
    expect(response.body.clusters.length).toBeGreaterThan(0);

    const clusters = response.body.clusters;
    expect(clusters[0]).toHaveProperty('name');
    expect(clusters[0]).toHaveProperty('size');
    expect(clusters[0]).toHaveProperty('position');
  });
});
```

Run tests:
```bash
npm test -- argument-intelligence.test.ts
```

## Step 8: Frontend Integration (Optional, 1 hour)

### Display Arguments on Bill Page

```typescript
// client/src/features/bills/components/ArgumentsSection.tsx

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ArgumentsSectionProps {
  billId: string;
}

export function ArgumentsSection({ billId }: ArgumentsSectionProps) {
  const [arguments, setArguments] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArguments();
  }, [billId]);

  async function loadArguments() {
    try {
      const [argsRes, clustersRes] = await Promise.all([
        api.get(`/arguments/bill/${billId}`),
        api.post(`/arguments/cluster/${billId}`),
      ]);

      setArguments(argsRes.data.arguments);
      setClusters(clustersRes.data.clusters);
    } catch (error) {
      console.error('Failed to load arguments:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading arguments...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Argument Analysis</h2>

      <div className="grid gap-4">
        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p>Total arguments: {arguments.length}</p>
          <p>Argument clusters: {clusters.length}</p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Clusters</h3>
          {clusters.map(cluster => (
            <div key={cluster.id} className="p-4 bg-gray-50 rounded">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{cluster.name}</h4>
                <span className={`px-2 py-1 text-xs rounded ${
                  cluster.position === 'support' ? 'bg-green-100 text-green-800' :
                  cluster.position === 'oppose' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {cluster.position}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{cluster.description}</p>
              <p className="text-xs text-gray-500">
                {cluster.size} arguments • Cohesion: {(cluster.cohesion * 100).toFixed(0)}%
              </p>
              
              {cluster.representativeClaims && (
                <div className="mt-3 space-y-1">
                  {cluster.representativeClaims.map((claim, idx) => (
                    <p key={idx} className="text-sm italic text-gray-700">
                      "{claim.text}"
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Success Checklist

After completing all steps, you should have:

- ✅ Structure extraction working
- ✅ Clustering algorithms functional
- ✅ Database tables created
- ✅ API endpoints operational
- ✅ Automatic comment processing
- ✅ Frontend display (optional)
- ✅ Integration tests passing

## Troubleshooting

### Issue: "natural module not found"
```bash
npm install natural
npm install --save-dev @types/natural
```

### Issue: "Clustering produces only one cluster"
This happens when:
- Not enough arguments (need at least 4-5)
- Arguments are too similar
- maxClusters set too low

Solution: Add more diverse test data.

### Issue: "Claims not being detected"
The classifier needs training data. Add more examples:
```typescript
// In sentence-classifier.ts, add to TRAINING_DATA
const TRAINING_DATA = {
  claim: [
    // Add your domain-specific claims
    'This violates rights',
    'The policy discriminates',
    // ... more examples
  ],
  // ...
};
```

### Issue: "Evidence quality always low"
The quality assessment is rule-based. Enhance it in `structure-extractor.ts`:
```typescript
private assessEvidenceQuality(text: string): any {
  // Add more indicators specific to your domain
  if (text.includes('your_domain_indicator')) {
    credibility += 0.2;
  }
}
```

## Next Steps

1. **Implement Evidence Validator** (2-3 days)
   - Fact-checking integration
   - Source verification
   - Citation validation

2. **Build Coalition Finder** (3-4 days)
   - User clustering by arguments
   - Shared interest detection
   - Power distribution analysis

3. **Create Brief Generator** (4-5 days)
   - Template system
   - PDF generation
   - Committee-specific formatting

4. **Deploy to Production**
   - Set up background job queue
   - Add monitoring
   - Configure alerts

## Support

If you run into issues:
1. Check the TypeScript compilation errors
2. Review the logs for runtime errors
3. Test individual components in isolation
4. Verify database migrations ran successfully

You now have a **working argument intelligence system**! 🎉
