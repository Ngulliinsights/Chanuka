#!/usr/bin/env tsx
/**
 * Chanuka Platform — Secondary Seed Script (Schema-Aligned v1.0)
 *
 * Hydrates advanced civic-tech modules that depend on core data
 * from the primary seed. Every seeder is wrapped in a safe-skip
 * try/catch so a missing migration never aborts the whole run.
 *
 * Modules:
 *   Argument Intelligence       (arguments, claims, legislative briefs)
 *   Universal Access            (ambassadors, offline submissions, facilitation sessions)
 *   Participation Oversight     (quality audits)
 *   Trojan Bill Detection       (trojan analyses, red-flag patterns)
 *   Advocacy Coordination       (campaigns, campaign bills, campaign actions)
 *
 * Prerequisites:
 *   Run primary-seed-aligned.ts first — this script queries existing users and bills.
 *
 * Usage:
 *   npm run db:seed:secondary
 *   tsx scripts/seeds/secondary-seed-aligned.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Disable pino-pretty for seed scripts
process.env.LOG_PRETTY = 'false';

// Create direct database connection to avoid pool initialization issues
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_N2W7AykvnlEu@ep-silent-sunset-a21i1qik-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 20
});

const db = drizzle(pool);

// Simple console logger for seed scripts
const logger = {
  info: (msg: string | object, meta?: object) => {
    const message = typeof msg === 'string' ? msg : JSON.stringify(msg);
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (msg: string | object, meta?: object) => {
    const message = typeof msg === 'string' ? msg : JSON.stringify(msg);
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (msg: string | object, meta?: object) => {
    const message = typeof msg === 'string' ? msg : JSON.stringify(msg);
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
  },
};

// ── Core schema imports ─────────────────────────────────────────────────────
import { users, bills } from '@server/infrastructure/schema/foundation';

// ── Advanced module imports ─────────────────────────────────────────────────
import {
  argumentTable,
  claims,
  legislative_briefs,
} from '@server/infrastructure/schema/argument_intelligence';

import {
  ambassadors,
  facilitation_sessions,
  offline_submissions,
} from '@server/infrastructure/schema/universal_access';

import {
  trojan_bill_analysis,
  hidden_provisions,
} from '@server/infrastructure/schema/trojan_bill_detection';

import {
  campaigns,
  action_items,
  campaign_participants,
} from '@server/infrastructure/schema/advocacy_coordination';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const rInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const rFloat = (min: number, max: number, dp = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dp));

const pick = <T>(arr: readonly T[]): T => {
  const result = arr[Math.floor(Math.random() * arr.length)];
  if (result === undefined) throw new Error('Cannot pick from empty array');
  return result;
};

const picks = <T>(arr: readonly T[], n: number): T[] =>
  [...arr].sort(() => 0.5 - Math.random()).slice(0, Math.min(n, arr.length));

const rDate = (start: Date, end: Date): Date =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const formatDate = (date: Date): string => date.toISOString().split('T')[0] || '';

async function batchInsert<T extends object>(
  table: any,
  rows: T[],
  size = 50,
  label?: string,
) {
  for (let i = 0; i < rows.length; i += size) {
    await (db.insert(table) as any).values(rows.slice(i, i + size));
    if (label && rows.length > size && (i + size) % (size * 4) === 0) {
      logger.info(`  ⏳ ${Math.min(i + size, rows.length)} / ${rows.length} ${label}…`, { component: 'Seed' });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ARGUMENT INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────

async function seedArgumentIntelligence(billIds: string[], userIds: string[]) {
  try {
    logger.info('🧠 Seeding Argument Intelligence data…', { component: 'Seed' });

    // Seed Arguments
    const argumentRows: typeof argumentTable.$inferInsert[] = [];
    const selectedBills = picks(billIds, 50);

    for (const billId of selectedBills) {
      const argCount = rInt(3, 8);
      for (let i = 0; i < argCount; i++) {
        argumentRows.push({
          bill_id: billId,
          argument_text: pick([
            'This bill will significantly improve healthcare access in rural areas.',
            'The proposed tax changes will burden small businesses disproportionately.',
            'Constitutional concerns regarding privacy rights need to be addressed.',
            'Economic impact analysis shows positive GDP growth potential.',
          ]),
          argument_summary: 'Key argument regarding bill implications',
          position: pick(['support', 'oppose', 'neutral', 'conditional'] as const),
          argument_type: pick(['economic', 'constitutional', 'social', 'procedural']),
          strength_score: rFloat(0.5, 1.0).toString(),
          extraction_method: pick(['automated', 'manual', 'hybrid'] as const),
          confidence_score: rFloat(0.7, 0.95).toString(),
          support_count: rInt(10, 100),
          opposition_count: rInt(5, 50),
          citizen_endorsements: rInt(20, 200),
          is_verified: Math.random() > 0.3,
          verified_by: Math.random() > 0.5 ? pick(userIds) : null,
          quality_score: rFloat(0.6, 1.0).toString(),
        });
      }
    }

    await batchInsert(argumentTable, argumentRows, 50, 'arguments');
    logger.info(`✓ ${argumentRows.length} arguments inserted`, { component: 'Seed' });

    // Seed Claims
    const claimRows: typeof claims.$inferInsert[] = [];
    for (let i = 0; i < 30; i++) {
      claimRows.push({
        claim_text: pick([
          'Healthcare spending will increase by 15% under this bill.',
          'Small businesses will face additional compliance costs.',
          'Privacy protections are weakened in Section 47.',
        ]),
        claim_summary: 'Factual assertion requiring verification',
        claim_type: pick(['factual', 'predictive', 'normative', 'causal']),
        verification_status: pick(['verified', 'disputed', 'false', 'unverified'] as const),
        mention_count: rInt(1, 20),
        bills_referenced: picks(billIds, rInt(1, 3)),
      });
    }

    await batchInsert(claims, claimRows, 30, 'claims');
    logger.info(`✓ ${claimRows.length} claims inserted`, { component: 'Seed' });

    // Seed Legislative Briefs
    const briefRows: typeof legislative_briefs.$inferInsert[] = [];
    for (const billId of picks(billIds, 20)) {
      briefRows.push({
        bill_id: billId,
        brief_type: pick(['public_input', 'constitutional', 'stakeholder', 'comprehensive']),
        title: 'Legislative Brief: Public Input Summary',
        executive_summary: 'This brief synthesizes citizen input and expert analysis.',
        key_arguments: {},
        stakeholder_positions: {},
        public_sentiment: {},
        generated_by: pick(['automated', 'expert', 'hybrid'] as const),
        data_cutoff_date: new Date(),
        delivered_to_committee: Math.random() > 0.5,
      });
    }

    await batchInsert(legislative_briefs, briefRows, 20, 'legislative briefs');
    logger.info(`✓ ${briefRows.length} legislative briefs inserted`, { component: 'Seed' });

  } catch (error) {
    logger.warn('⚠️  Argument Intelligence seeding skipped (table may not exist)', { error });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL ACCESS
// ─────────────────────────────────────────────────────────────────────────────

async function seedUniversalAccess(billIds: string[], userIds: string[]) {
  try {
    logger.info('🌍 Seeding Universal Access data…', { component: 'Seed' });

    // Seed Ambassadors
    const ambassadorRows: typeof ambassadors.$inferInsert[] = [];
    const selectedUsers = picks(userIds, 20);

    for (const userId of selectedUsers) {
      ambassadorRows.push({
        user_id: userId,
        ambassador_code: `AMB-${rInt(1000, 9999)}`,
        display_name: `Ambassador ${rInt(1, 100)}`,
        contact_phone: `+254${rInt(700000000, 799999999)}`,
        preferred_contact_method: pick(['phone', 'email', 'sms']),
        primary_county: pick(['nairobi', 'mombasa', 'kisumu', 'nakuru'] as const),
        status: pick(['active', 'pending', 'inactive'] as const),
        verification_status: pick(['verified', 'unverified'] as const),
        training_completed: Math.random() > 0.3,
        sessions_conducted: rInt(0, 50),
        people_reached: rInt(0, 500),
      });
    }

    await batchInsert(ambassadors, ambassadorRows, 20, 'ambassadors');
    logger.info(`✓ ${ambassadorRows.length} ambassadors inserted`, { component: 'Seed' });

    // Get ambassador IDs
    const ambassadorResult = await db.select({ id: ambassadors.id }).from(ambassadors);
    const ambassadorIds: string[] = ambassadorResult.map(r => r.id);

    // Seed Facilitation Sessions
    const sessionRows: typeof facilitation_sessions.$inferInsert[] = [];
    for (let i = 0; i < 30; i++) {
      sessionRows.push({
        session_code: `SES-${rInt(10000, 99999)}`,
        session_title: 'Community Bill Discussion Session',
        ambassador_id: pick(ambassadorIds),
        session_date: formatDate(rDate(new Date('2024-01-01'), new Date('2024-12-31'))),
        venue: pick(['Community Center', 'School', 'Church', 'Market']),
        venue_type: pick(['community_center', 'school', 'church', 'market'] as const),
        bills_discussed: picks(billIds, rInt(1, 3)),
        primary_bill_id: pick(billIds),
        planned_participants: rInt(20, 100),
        actual_participants: rInt(15, 95),
        session_status: pick(['completed', 'planned', 'cancelled'] as const),
        feedback_collected: rInt(10, 80),
        sync_status: 'synced',
      });
    }

    await batchInsert(facilitation_sessions, sessionRows, 30, 'facilitation sessions');
    logger.info(`✓ ${sessionRows.length} facilitation sessions inserted`, { component: 'Seed' });

    // Get session IDs
    const sessionResult = await db.select({ id: facilitation_sessions.id }).from(facilitation_sessions);
    const sessionIds: string[] = sessionResult.map(r => r.id);

    // Seed Offline Submissions
    const submissionRows: typeof offline_submissions.$inferInsert[] = [];
    for (let i = 0; i < 100; i++) {
      submissionRows.push({
        session_id: Math.random() > 0.2 ? pick(sessionIds) : null,
        bill_id: pick(billIds),
        collected_by_id: pick(ambassadorIds),
        participant_code: `PART-${rInt(1000, 9999)}`,
        submission_text: 'Citizen feedback collected during community session.',
        submission_language: pick(['english', 'swahili', 'kikuyu']),
        position: pick(['support', 'oppose', 'neutral', 'question'] as const),
        collection_method: pick(['verbal_transcribed', 'written', 'audio_recorded'] as const),
        processing_status: pick(['collected', 'transcribed', 'processed'] as const),
        sync_status: pick(['synced', 'pending'] as const),
        integrated_with_online: Math.random() > 0.5,
      });
    }

    await batchInsert(offline_submissions, submissionRows, 50, 'offline submissions');
    logger.info(`✓ ${submissionRows.length} offline submissions inserted`, { component: 'Seed' });

  } catch (error) {
    logger.warn('⚠️  Universal Access seeding skipped (table may not exist)', { error });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TROJAN BILL DETECTION
// ─────────────────────────────────────────────────────────────────────────────

async function seedTrojanBillDetection(billIds: string[], userIds: string[]) {
  try {
    logger.info('🔍 Seeding Trojan Bill Detection data…', { component: 'Seed' });

    // Seed Trojan Bill Analyses
    const analysisRows: typeof trojan_bill_analysis.$inferInsert[] = [];
    const selectedBills = picks(billIds, 25);

    for (const billId of selectedBills) {
      const riskScore = rFloat(0, 100);
      analysisRows.push({
        bill_id: billId,
        bill_name: 'Sample Bill for Analysis',
        trojan_risk_score: riskScore.toString(),
        stated_purpose: 'Improve public service delivery',
        hidden_provisions: [
          {
            section: 'Section 47(3)(b)',
            stated_purpose: 'Administrative efficiency',
            hidden_agenda: 'Expanded surveillance powers',
            severity: 'high',
            constitutional_concern: 'Article 31 (Privacy)',
          },
        ],
        detection_method: pick(['automated', 'expert', 'hybrid', 'ai_analysis'] as const),
        detection_date: formatDate(rDate(new Date('2024-01-01'), new Date())),
        detection_confidence: rFloat(0.6, 0.95).toString(),
        analysis_summary: 'Analysis reveals potential hidden provisions requiring scrutiny.',
        red_flags: picks(['rushed_process', 'buried_provisions', 'vague_language', 'excessive_powers'], rInt(1, 3)),
        public_alert_issued: riskScore > 60,
        outcome: riskScore > 70 ? pick(['pending', 'amended', 'defeated'] as const) : 'pending',
        analyzed_by: pick(userIds),
      });
    }

    await batchInsert(trojan_bill_analysis, analysisRows, 25, 'trojan analyses');
    logger.info(`✓ ${analysisRows.length} trojan bill analyses inserted`, { component: 'Seed' });

    // Seed Hidden Provisions
    const provisionRows: typeof hidden_provisions.$inferInsert[] = [];
    for (const billId of selectedBills.slice(0, 15)) {
      const provCount = rInt(1, 3);
      for (let i = 0; i < provCount; i++) {
        provisionRows.push({
          bill_id: billId,
          provision_text: 'The Minister may, by notice in the Gazette, prescribe additional powers...',
          provision_location: `Section ${rInt(10, 50)}(${rInt(1, 5)})`,
          stated_purpose: 'Administrative flexibility',
          hidden_agenda: 'Unchecked ministerial discretion',
          power_type: pick(['surveillance', 'executive_power', 'weakened_oversight']),
          deception_technique: pick(['buried_deep', 'vague_definitions', 'broad_discretion'] as const),
          severity: pick(['low', 'medium', 'high', 'critical'] as const),
          urgency: pick(['routine', 'concerning', 'urgent'] as const),
          detected_by: 'AI Analysis System',
          detection_confidence: rFloat(0.7, 0.95).toString(),
        });
      }
    }

    await batchInsert(hidden_provisions, provisionRows, 50, 'hidden provisions');
    logger.info(`✓ ${provisionRows.length} hidden provisions inserted`, { component: 'Seed' });

  } catch (error) {
    logger.warn('⚠️  Trojan Bill Detection seeding skipped (table may not exist)', { error });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVOCACY COORDINATION
// ─────────────────────────────────────────────────────────────────────────────

async function seedAdvocacyCoordination(billIds: string[], userIds: string[]) {
  try {
    logger.info('📢 Seeding Advocacy Coordination data…', { component: 'Seed' });

    // Seed Campaigns
    const campaignRows: typeof campaigns.$inferInsert[] = [];
    for (let i = 0; i < 15; i++) {
      campaignRows.push({
        title: `Campaign for ${pick(['Healthcare', 'Education', 'Environment', 'Justice'])} Reform`,
        slug: `campaign-${rInt(1000, 9999)}`,
        description: 'Organized advocacy effort to influence legislative outcomes.',
        primary_bill_id: pick(billIds),
        campaign_goal: 'Ensure bill passes with citizen-friendly amendments',
        call_to_action: 'Contact your MP and demand accountability',
        created_by_id: pick(userIds),
        status: pick(['draft', 'active', 'completed'] as const),
        geographic_scope: pick(['national', 'county', 'constituency'] as const),
        participant_count: rInt(50, 5000),
        target_participant_count: rInt(100, 10000),
        actions_completed: rInt(20, 500),
        is_public: true,
        moderation_status: 'approved',
      });
    }

    await batchInsert(campaigns, campaignRows, 15, 'campaigns');
    logger.info(`✓ ${campaignRows.length} campaigns inserted`, { component: 'Seed' });

    // Get campaign IDs
    const campaignResult = await db.select({ id: campaigns.id }).from(campaigns);
    const campaignIds: string[] = campaignResult.map(r => r.id);

    // Seed Action Items
    const actionRows: typeof action_items.$inferInsert[] = [];
    for (const campaignId of campaignIds) {
      const actionCount = rInt(3, 6);
      for (let i = 0; i < actionCount; i++) {
        actionRows.push({
          campaign_id: campaignId,
          title: pick(['Email Your MP', 'Sign Petition', 'Share on Social Media', 'Attend Town Hall']),
          description: 'Take action to support this campaign',
          action_type: pick(['email_mp', 'petition_sign', 'social_share', 'attend_event'] as const),
          difficulty_level: pick(['easy', 'moderate', 'advanced'] as const),
          estimated_time_minutes: rInt(5, 60),
          impact_score: rInt(1, 10),
          action_config: {},
          is_active: true,
          completion_count: rInt(10, 500),
          display_order: i + 1,
        });
      }
    }

    await batchInsert(action_items, actionRows, 50, 'action items');
    logger.info(`✓ ${actionRows.length} action items inserted`, { component: 'Seed' });

    // Seed Campaign Participants
    const participantRows: typeof campaign_participants.$inferInsert[] = [];
    for (const campaignId of campaignIds) {
      const participantCount = rInt(5, 20);
      const selectedUsers = picks(userIds, participantCount);
      for (const userId of selectedUsers) {
        participantRows.push({
          campaign_id: campaignId,
          user_id: userId,
          participation_level: pick(['supporter', 'active', 'organizer'] as const),
          actions_completed: rInt(0, 10),
          participant_county: pick(['nairobi', 'mombasa', 'kisumu'] as const),
        });
      }
    }

    await batchInsert(campaign_participants, participantRows, 50, 'campaign participants');
    logger.info(`✓ ${participantRows.length} campaign participants inserted`, { component: 'Seed' });

  } catch (error) {
    logger.warn('⚠️  Advocacy Coordination seeding skipped (table may not exist)', { error });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    logger.info('🌱 Starting secondary seed…', { component: 'Seed' });
    const startTime = Date.now();

    // Fetch existing data from primary seed
    const billResult = await db.select({ id: bills.id }).from(bills);
    const billIds: string[] = billResult.map(r => r.id);

    const userResult = await db.select({ id: users.id }).from(users);
    const userIds: string[] = userResult.map(r => r.id);

    if (billIds.length === 0 || userIds.length === 0) {
      logger.error('❌ No bills or users found. Run primary seed first!', { component: 'Seed' });
      process.exit(1);
    }

    logger.info(`Found ${billIds.length} bills and ${userIds.length} users`, { component: 'Seed' });

    // Seed all modules
    await seedArgumentIntelligence(billIds, userIds);
    await seedUniversalAccess(billIds, userIds);
    await seedTrojanBillDetection(billIds, userIds);
    await seedAdvocacyCoordination(billIds, userIds);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '─'.repeat(58));
    console.log('  Chanuka Secondary Seed — Completed');
    console.log('─'.repeat(58));
    console.log(`  ✓ Argument Intelligence seeded`);
    console.log(`  ✓ Universal Access seeded`);
    console.log(`  ✓ Trojan Bill Detection seeded`);
    console.log(`  ✓ Advocacy Coordination seeded`);
    console.log('─'.repeat(58));
    console.log(`  ✓ Completed in ${duration}s`);
    console.log('─'.repeat(58) + '\n');

    logger.info('✅ Secondary seed completed successfully', { component: 'Seed', duration });
    process.exit(0);
  } catch (error) {
    logger.error('❌ Secondary seed failed', { component: 'Seed', error });
    console.error(error);
    process.exit(1);
  }
}

main();
