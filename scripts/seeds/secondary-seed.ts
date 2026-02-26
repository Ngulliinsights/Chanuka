#!/usr/bin/env tsx
/**
 * Chanuka Platform — Secondary Seed Script (v3, final)
 *
 * Hydrates advanced civic-tech modules that depend on core data
 * from the primary seed.  Every seeder is wrapped in a safe-skip
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
 *   Run primary-seed.ts first — this script queries existing users and bills.
 *
 * Usage:
 *   npm run db:seed:secondary
 *   tsx scripts/seeds/secondary-seed.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { database as db } from '@server/infrastructure/database/connection';
import { logger }         from '@server/infrastructure/observability';

// ── Core schema imports (always present) ─────────────────────────────────────
import { users, bills, sponsors } from '@server/infrastructure/schema/foundation';

// ── Advanced schema imports (may not yet be migrated) ────────────────────────
// Wrapped in try/catch at call-site; TypeScript still provides type safety
// for schemas that ARE present.
import { arguments as argumentTable, claims, legislative_briefs }       from '@server/infrastructure/schema/argument_intelligence';
import { ambassadors, offline_submissions, facilitation_sessions }       from '@server/infrastructure/schema/universal_access';
import { participation_quality_audits }                                  from '@server/infrastructure/schema/participation_oversight';
import { trojan_analyses, red_flag_patterns }                            from '@server/infrastructure/schema/trojan_bill_detection';
import { campaigns, campaign_bills, campaign_actions }                   from '@server/infrastructure/schema/advocacy_coordination';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const rInt   = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const rFloat = (min: number, max: number, dp = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dp));

const pick   = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const picks  = <T>(arr: readonly T[], n: number): T[] =>
  [...arr].sort(() => 0.5 - Math.random()).slice(0, Math.min(n, arr.length));

function weighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}

const rDate = (start: Date, end: Date): Date =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

/** Insert rows in chunks. */
async function batchInsert<T extends object>(
  table: any,
  rows: T[],
  size = 50,
) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size));
  }
}

/**
 * Wraps a seeder function in a safe-skip block.
 * If the table doesn't exist (e.g. migration not yet applied),
 * we warn rather than crash the entire secondary seed.
 */
async function safeRun(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err: any) {
    const isTableMissing =
      err?.message?.includes('relation') ||
      err?.message?.includes('does not exist') ||
      err?.code === '42P01';

    if (isTableMissing) {
      logger.warn(`⏭️  Skipped ${label}: table not yet migrated.`, { component: 'SecondarySeed' });
    } else {
      // Re-throw genuine runtime errors so they surface clearly
      throw err;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────

const COUNTIES = [
  'Nairobi', 'Kisumu', 'Mombasa', 'Nakuru', 'Eldoret', 'Machakos',
  'Kakamega', 'Kisii', 'Meru', 'Nyeri', 'Kiambu', 'Uasin Gishu',
] as const;

const TOPICS = [
  'healthcare', 'education', 'environment', 'fiscal policy',
  'technology', 'agriculture', 'housing', 'gender equality',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SEEDERS
// ─────────────────────────────────────────────────────────────────────────────

// ── Argument Intelligence ─────────────────────────────────────────────────────

async function seedArgumentIntelligence(billIds: string[], userIds: string[]) {
  logger.info('🧠 Seeding Argument Intelligence…', { component: 'SecondarySeed' });

  const ARGUMENT_TYPES    = ['economic', 'constitutional', 'social', 'environmental', 'procedural'] as const;
  const POSITIONS         = ['support', 'oppose', 'neutral'] as const;
  const EXTRACTION_METHODS = ['automated', 'manual', 'hybrid'] as const;

  // Argument templates — substantive and varied
  const ARGUMENT_TEMPLATES = [
    { position: 'oppose' as const,  text: 'The fiscal provisions in Clause {n} will disproportionately affect low-income earners due to the regressive nature of the proposed levies. Peer-reviewed evidence from comparable African economies shows a 15–30 % reduction in formal sector participation following similar measures.' },
    { position: 'support' as const, text: 'The regulatory framework in Part II aligns with Kenya\'s international treaty obligations under the {framework} and represents best practice as adopted in at least eight other jurisdictions. Implementation would close a documented enforcement gap that has cost the exchequer an estimated KES {amount} billion annually.' },
    { position: 'oppose' as const,  text: 'Clause {n} grants the Cabinet Secretary unfettered discretion to issue subsidiary legislation without parliamentary scrutiny. This violates Article 94 of the Constitution and sets a dangerous precedent for delegated legislative power.' },
    { position: 'neutral' as const, text: 'The bill\'s impact on {topic} remains unclear. Independent fiscal modelling is needed before second reading to determine whether the projected KES {amount} billion in savings is achievable within the devolved government structure.' },
    { position: 'support' as const, text: 'The phased implementation approach in Section {n} is commendable. It gives county governments a 24-month transition window — consistent with Article 186 requirements — which reduces the risk of service disruption during rollout.' },
    { position: 'oppose' as const,  text: 'The consultation process fell short of the constitutional standard established in Okiya Omtatah v. Communication Authority. Marginalised communities in arid and semi-arid counties were effectively excluded from the process despite being the primary intended beneficiaries.' },
    { position: 'neutral' as const, text: 'A comparative analysis of similar legislation in Uganda and Tanzania suggests the bill\'s compliance cost estimate is understated by approximately 40 %. The committee should commission an updated regulatory impact assessment before proceeding.' },
    { position: 'support' as const, text: 'The inclusion of a mandatory gender impact assessment in Section {n} is a notable innovation. It operationalises Kenya\'s constitutional commitment to the two-thirds gender principle in a way that previous legislation in {topic} has failed to do.' },
  ] as const;

  const FRAMEWORKS = ['Paris Agreement', 'African Union Agenda 2063', 'SDG Framework', 'COMESA Treaty', 'UN CRPD'] as const;

  // 1. Arguments (150 rows)
  const argRows: typeof argumentTable.$inferInsert[] = Array.from({ length: 150 }, () => {
    const tmpl = pick(ARGUMENT_TEMPLATES);
    const text = tmpl.text
      .replace('{n}',         String(rInt(3, 22)))
      .replace('{framework}', pick(FRAMEWORKS))
      .replace('{amount}',    String(rInt(1, 40)))
      .replace('{topic}',     pick(TOPICS));

    return {
      bill_id:           pick(billIds),
      argument_text:     text,
      argument_summary:  text.split('.')[0] + '.',   // First sentence as summary
      position:          tmpl.position,
      argument_type:     pick(ARGUMENT_TYPES),
      strength_score:    rFloat(0.40, 0.97).toString(),
      extraction_method: pick(EXTRACTION_METHODS),
      support_count:     rInt(5, 150),
      is_verified:       Math.random() > 0.45,
      verified_by:       Math.random() > 0.5 ? pick(userIds) : null,
    };
  });

  await batchInsert(argumentTable, argRows);
  logger.info(`  ↳ ${argRows.length} arguments`, { component: 'SecondarySeed' });

  // 2. Claims linked to arguments — fetch inserted argument IDs
  const insertedArgs = await db
    .select({ id: argumentTable.id })
    .from(argumentTable);
  const argIds = insertedArgs.map(a => a.id);

  const CLAIM_TYPES  = ['factual', 'normative', 'predictive', 'comparative'] as const;
  const claimRows: typeof claims.$inferInsert[] = argIds.flatMap(argId =>
    Array.from({ length: rInt(1, 3) }, () => ({
      argument_id:      argId,
      claim_text:       `Empirical evidence supports the position that this provision will ${pick(['reduce', 'increase', 'stabilise', 'fragment'])} ${pick(TOPICS)} outcomes in the medium term.`,
      claim_type:       pick(CLAIM_TYPES),
      is_supported:     Math.random() > 0.35,
      confidence_score: rFloat(0.45, 0.95).toString(),
    }))
  );

  await batchInsert(claims, claimRows, 100);
  logger.info(`  ↳ ${claimRows.length} claims`, { component: 'SecondarySeed' });

  // 3. Legislative Briefs (20 bills) — simulating AI synthesis of public input
  const briefBillIds = picks(billIds, 20);
  const BRIEF_TYPES  = ['comprehensive', 'focused', 'executive', 'committee'] as const;
  const GENERATED_BY = ['automated', 'manual', 'hybrid'] as const;

  const briefRows: typeof legislative_briefs.$inferInsert[] = briefBillIds.map(billId => ({
    bill_id:                  billId,
    brief_type:               pick(BRIEF_TYPES),
    title:                    `AI-Synthesised Public Input Brief — ${pick(TOPICS).charAt(0).toUpperCase() + pick(TOPICS).slice(1)} Provisions`,
    executive_summary:        `This brief aggregates ${rInt(200, 2000).toLocaleString()} citizen submissions. Key themes: (1) strong public support for transparency clauses; (2) significant concern over implementation timelines; (3) calls for stronger protections for marginalised communities in Part III.`,
    generated_by:             pick(GENERATED_BY),
    data_cutoff_date:         rDate(new Date('2024-01-01'), new Date('2025-03-01')),
    delivered_to_committee:   Math.random() > 0.35,
  }));

  await batchInsert(legislative_briefs, briefRows);
  logger.info(`  ↳ ${briefRows.length} legislative briefs`, { component: 'SecondarySeed' });
  logger.info('✓ Argument Intelligence seeded', { component: 'SecondarySeed' });
}

// ── Universal Access ──────────────────────────────────────────────────────────

async function seedUniversalAccess(billIds: string[], userIds: string[]) {
  logger.info('🌍 Seeding Universal Access…', { component: 'SecondarySeed' });

  const CONTACT_METHODS  = ['phone', 'sms', 'whatsapp', 'in_person'] as const;
  const COLLECTION_METHODS = ['verbal_transcribed', 'written_form', 'voice_recording', 'group_discussion'] as const;
  const PROCESSING_STATUSES = ['pending', 'reviewed', 'processed', 'rejected'] as const;
  const SESSION_FORMATS  = ['town_hall', 'focus_group', 'radio_call_in', 'village_baraza', 'mobile_unit'] as const;

  // 1. Ambassadors — 10 community leads
  const ambassadorUserIds = picks(userIds, 10);
  const ambassadorRows: typeof ambassadors.$inferInsert[] = ambassadorUserIds.map((uid, i) => ({
    user_id:                  uid,
    ambassador_code:          `AMB-2024-${String(i + 1).padStart(3, '0')}`,
    display_name:             `Community Lead ${String(i + 1).padStart(2, '0')}`,
    primary_county:           pick(COUNTIES),
    preferred_contact_method: pick(CONTACT_METHODS),
    contact_phone:            `+2547${rInt(10_000_000, 99_999_999)}`,
    status:                   'active',
    verification_status:      'verified',
    bills_facilitated_count:  rInt(2, 25),
    submissions_collected:    rInt(10, 200),
  }));

  const insertedAmbassadors = await db
    .insert(ambassadors)
    .values(ambassadorRows)
    .returning({ id: ambassadors.id });
  const ambassadorIds = insertedAmbassadors.map(a => a.id);
  logger.info(`  ↳ ${ambassadorIds.length} ambassadors`, { component: 'SecondarySeed' });

  // 2. Offline Submissions — 80 transcribed citizen inputs
  const SUBMISSION_POSITIONS = ['support', 'oppose', 'neutral', 'conditional_support'] as const;
  const submissionRows: typeof offline_submissions.$inferInsert[] = Array.from({ length: 80 }, () => {
    const position = pick(SUBMISSION_POSITIONS);
    return {
      bill_id:            pick(billIds),
      collected_by_id:    pick(ambassadorIds),
      submission_text:    position === 'oppose'
        ? `Baraza participants in ${pick(COUNTIES)} expressed strong rejection of the privatisation clauses, citing fears of increased service costs for households already spending more than 40% of income on basic services.`
        : position === 'support'
        ? `Focus group members in ${pick(COUNTIES)} welcomed the transparency provisions, stating these were "long overdue" and would help communities hold local officials accountable for public resources.`
        : `Mixed views from ${pick(COUNTIES)} — participants support the goal but raised practical concerns about implementation capacity at the ward level given current staffing gaps.`,
      position,
      collection_method:  pick(COLLECTION_METHODS),
      collection_date:    rDate(new Date('2024-01-01'), new Date('2025-01-01')),
      location_county:    pick(COUNTIES),
      processing_status:  pick(PROCESSING_STATUSES),
      language_of_submission: pick(['en', 'sw', 'sw', 'sw'] as const), // Swahili more common in field
    };
  });

  await batchInsert(offline_submissions, submissionRows);
  logger.info(`  ↳ ${submissionRows.length} offline submissions`, { component: 'SecondarySeed' });

  // 3. Facilitation Sessions — 15 structured community engagement events
  const sessionRows: typeof facilitation_sessions.$inferInsert[] = Array.from({ length: 15 }, (_, i) => ({
    ambassador_id:       pick(ambassadorIds),
    bill_id:             pick(billIds),
    session_format:      pick(SESSION_FORMATS),
    session_date:        rDate(new Date('2024-02-01'), new Date('2025-02-01')),
    location_county:     pick(COUNTIES),
    location_details:    `${pick(COUNTIES)} Community Hall, Ward ${rInt(1, 10)}`,
    participants_count:  rInt(15, 200),
    submissions_count:   rInt(5, 50),
    session_notes:       `Session ${i + 1} covered key provisions of the bill. Participants raised questions on implementation timelines, funding mechanisms, and the role of county governments. ${rInt(3, 8)} formal submissions were collected.`,
    language_used:       pick(['en', 'sw', 'mixed'] as const),
    recording_available: Math.random() > 0.5,
  }));

  await batchInsert(facilitation_sessions, sessionRows);
  logger.info(`  ↳ ${sessionRows.length} facilitation sessions`, { component: 'SecondarySeed' });
  logger.info('✓ Universal Access seeded', { component: 'SecondarySeed' });
}

// ── Participation Oversight ───────────────────────────────────────────────────

async function seedParticipationOversight(billIds: string[]) {
  logger.info('📋 Seeding Participation Oversight…', { component: 'SecondarySeed' });

  const AUDITOR_TYPES = ['civil_society', 'academic', 'international_observer', 'ombudsman'] as const;
  const FEEDBACK_QUALITY_LEVELS = ['none', 'inadequate', 'adequate', 'exemplary'] as const;
  const ORGS = [
    'Kenya Human Rights Commission', 'Katiba Institute', 'Africa Centre for Open Governance',
    'International IDEA', 'Transparency International Kenya', 'Institute for Social Accountability',
  ] as const;

  const auditBillIds = picks(billIds, 35);

  const auditRows: typeof participation_quality_audits.$inferInsert[] = auditBillIds.map(billId => {
    // ~20 % of bills flagged for participation washing
    const isWashing          = Math.random() > 0.80;
    const qualityScore       = isWashing ? rFloat(10, 42) : rFloat(58, 96);
    const geoCoverage        = isWashing ? rFloat(8, 40)  : rFloat(45, 95);
    const feedbackQuality    = isWashing
      ? pick(['none', 'inadequate'] as const)
      : pick(['adequate', 'exemplary'] as const);

    return {
      bill_id:                       billId,
      auditor_type:                  pick(AUDITOR_TYPES),
      auditor_organization:          pick(ORGS),

      // Notice and logistics
      adequate_notice:               !isWashing,
      minimum_notice_days_given:     isWashing ? rInt(1, 6) : rInt(7, 21),

      // Geographic and demographic reach
      geographic_coverage_score:     geoCoverage.toString(),
      counties_covered:              isWashing ? rInt(1, 8) : rInt(15, 47),
      marginalized_groups_reached:   !isWashing,
      women_participation_rate:      isWashing ? rFloat(5, 30)  : rFloat(35, 55),
      youth_participation_rate:      isWashing ? rFloat(3, 20)  : rFloat(20, 45),

      // Accessibility
      language_accessibility:        !isWashing || Math.random() > 0.5,
      disability_accommodations:     !isWashing && Math.random() > 0.3,
      digital_accessibility:         Math.random() > 0.4,

      // Feedback loop
      feedback_provided:             !isWashing,
      feedback_quality:              feedbackQuality,
      response_rate:                 isWashing ? rFloat(0, 15)  : rFloat(40, 85),

      // Overall assessment
      participation_washing_detected: isWashing,
      participation_quality_score:   qualityScore.toString(),
      constitutional_compliance:     !isWashing,

      // Audit metadata
      audit_status:                  'published',
      key_findings:                  isWashing
        ? `Audit flagged significant participation deficiencies: insufficient notice, limited geographic reach (${Math.round(geoCoverage)}% of counties), and no evidence that public input influenced the final bill text.`
        : `Participation process was substantive. Public input demonstrably influenced ${rInt(2, 8)} specific clauses. Geographic reach covered ${rInt(15, 47)} counties with strong representation from marginalised groups.`,
      recommendations:               isWashing
        ? 'The bill should be returned for a genuine public participation exercise consistent with Article 118(1)(b) of the Constitution and the standard established in Okiya Omtatah v. Communication Authority.'
        : 'Minor improvements recommended for future exercises: earlier publication of draft texts and more radio/SMS-based engagement for rural communities.',
    };
  });

  await batchInsert(participation_quality_audits, auditRows);

  const washingCount = auditRows.filter(r => r.participation_washing_detected).length;
  logger.info(
    `✓ ${auditRows.length} participation audits (${washingCount} washing cases flagged)`,
    { component: 'SecondarySeed' },
  );
}

// ── Trojan Bill Detection ─────────────────────────────────────────────────────

async function seedTrojanBillDetection(billIds: string[]) {
  logger.info('🛡️  Seeding Trojan Bill Detection…', { component: 'SecondarySeed' });

  const RISK_LEVELS       = ['low', 'medium', 'high', 'critical'] as const;
  const ANALYSIS_STATUSES = ['pending', 'in_review', 'published'] as const;

  const RED_FLAG_PATTERNS_DATA = [
    { pattern_name: 'Broad Delegation',            description: 'Clause grants Cabinet Secretary power to amend primary legislation via regulations without parliamentary approval.',    severity: 'high',   frequency: 0 },
    { pattern_name: 'Retroactive Application',      description: 'Bill purports to apply to actions taken before its enactment, raising rule of law and legal certainty concerns.',     severity: 'high',   frequency: 0 },
    { pattern_name: 'Rights Limitation Without 36', description: 'Provision limits a fundamental right without satisfying the proportionality test under Article 24.',                  severity: 'critical', frequency: 0 },
    { pattern_name: 'Devolution Bypass',            description: 'Bill transfers functions assigned to county governments under Schedule 4 to national government agencies.',            severity: 'high',   frequency: 0 },
    { pattern_name: 'Sunset Clause Absent',         description: 'Emergency or temporary provision contains no sunset clause, risking permanent entrenchment of exceptional powers.',   severity: 'medium', frequency: 0 },
    { pattern_name: 'Vague Definitions',            description: 'Key operative terms are left undefined, granting implementers excessive interpretive discretion.',                     severity: 'medium', frequency: 0 },
    { pattern_name: 'Ouster Clause',                description: 'Provision attempts to exclude judicial review of decisions made under the Act.',                                       severity: 'critical', frequency: 0 },
    { pattern_name: 'Inadequate Penalty Calibration', description: 'Penalty provisions are disproportionate relative to the gravity of the offence, creating a chilling effect.',      severity: 'medium', frequency: 0 },
  ] as const;

  // 1. Seed red-flag pattern library
  const insertedPatterns = await db
    .insert(red_flag_patterns)
    .values(RED_FLAG_PATTERNS_DATA.map(p => ({ ...p, frequency: p.frequency })))
    .returning({ id: red_flag_patterns.id, severity: red_flag_patterns.severity });
  const patternIds = insertedPatterns.map(p => p.id);
  logger.info(`  ↳ ${patternIds.length} red-flag patterns`, { component: 'SecondarySeed' });

  // 2. Trojan analyses for 40 sampled bills
  const analysedBillIds = picks(billIds, 40);

  const RISK_WEIGHTS = [
    { risk: 'low',      weight: 45 },
    { risk: 'medium',   weight: 30 },
    { risk: 'high',     weight: 18 },
    { risk: 'critical', weight:  7 },
  ] as const;

  const trojanRows: typeof trojan_analyses.$inferInsert[] = analysedBillIds.map(billId => {
    const riskLevel   = weighted(RISK_WEIGHTS).risk;
    const patternCount = riskLevel === 'critical' ? rInt(3, 6) :
                         riskLevel === 'high'     ? rInt(2, 4) :
                         riskLevel === 'medium'   ? rInt(1, 2) : 0;
    const flaggedPatterns = patternCount > 0 ? picks(patternIds, patternCount) : [];

    return {
      bill_id:            billId,
      overall_risk_level: riskLevel,
      confidence_score:   rFloat(0.55, 0.98).toString(),
      flagged_patterns:   flaggedPatterns,
      analysis_summary:   riskLevel === 'critical'
        ? `CRITICAL: Analysis identified ${patternCount} high-severity red-flag patterns including potential rights violations and ouster clauses. Immediate expert review recommended before any further readings.`
        : riskLevel === 'high'
        ? `HIGH RISK: ${patternCount} structural concern(s) detected. The bill may improperly delegate legislative power and contain provisions that bypass devolution requirements.`
        : riskLevel === 'medium'
        ? `MEDIUM RISK: ${patternCount} drafting concern(s) flagged. Vague definitions and absent sunset provisions could create interpretive ambiguity in implementation.`
        : `LOW RISK: No significant structural concerns detected. Bill appears well-drafted with appropriate checks and balances.`,
      clauses_analysed:   rInt(8, 30),
      analysis_status:    pick(ANALYSIS_STATUSES),
      requires_human_review: riskLevel === 'critical' || riskLevel === 'high',
      is_published:       riskLevel === 'low' || riskLevel === 'medium',
    };
  });

  await batchInsert(trojan_analyses, trojanRows);

  const criticalCount = trojanRows.filter(r => r.overall_risk_level === 'critical').length;
  logger.info(
    `✓ ${trojanRows.length} trojan analyses (${criticalCount} critical risk)`,
    { component: 'SecondarySeed' },
  );
}

// ── Advocacy Coordination ─────────────────────────────────────────────────────

async function seedAdvocacyCoordination(billIds: string[], userIds: string[]) {
  logger.info('📣 Seeding Advocacy Coordination…', { component: 'SecondarySeed' });

  const CAMPAIGN_STATUSES = ['draft', 'active', 'completed', 'paused'] as const;
  const ACTION_TYPES      = ['public_comment', 'petition_signature', 'email_mps', 'attend_hearing', 'social_share'] as const;
  const CAMPAIGN_GOALS    = [
    'Secure passage of the transparency provisions in Part III',
    'Amend Clause {n} to remove the broad delegation of legislative power',
    'Ensure mandatory public participation in the committee stage',
    'Block enactment until an independent fiscal impact assessment is completed',
    'Strengthen the anti-corruption safeguards in Part IV',
    'Extend the transition period for county governments from 12 to 24 months',
  ] as const;

  const CAMPAIGN_NAMES = [
    'Fix the Bill Coalition',
    'Transparent Governance Now',
    'Citizens for Accountable Legislation',
    'Our Rights, Our Laws',
    'Devolution Defenders',
    'Open Parliament Initiative',
    'Youth Civic Action Network',
    'Kenya Law Reform Watch',
  ] as const;

  // 1. Campaigns (12 total)
  const campaignRows: typeof campaigns.$inferInsert[] = Array.from({ length: 12 }, (_, i) => {
    const status       = pick(CAMPAIGN_STATUSES);
    const targetSigs   = rInt(500, 50_000);
    const currentSigs  = status === 'completed' ? targetSigs :
                         status === 'active'    ? rInt(Math.round(targetSigs * 0.1), targetSigs - 1) : 0;
    return {
      name:              `${pick(CAMPAIGN_NAMES)} — ${new Date().getFullYear()}`,
      description:       `A civil society campaign to ${pick(CAMPAIGN_GOALS).replace('{n}', String(rInt(3, 20)))}. This campaign mobilises citizens to engage directly with legislators at committee and floor stages.`,
      organizer_id:      pick(userIds),
      status,
      goal:              pick(CAMPAIGN_GOALS).replace('{n}', String(rInt(3, 20))),
      target_signatures: targetSigs,
      current_signatures: currentSigs,
      start_date:        rDate(new Date('2024-01-01'), new Date('2024-12-01')),
      end_date:          status === 'completed'
        ? rDate(new Date('2024-06-01'), new Date('2025-03-01'))
        : null,
      is_public:         true,
    };
  });

  const insertedCampaigns = await db
    .insert(campaigns)
    .values(campaignRows)
    .returning({ id: campaigns.id });
  const campaignIds = insertedCampaigns.map(c => c.id);
  logger.info(`  ↳ ${campaignIds.length} campaigns`, { component: 'SecondarySeed' });

  // 2. Campaign–Bill associations (each campaign targets 1–3 bills)
  const campaignBillPairs = new Set<string>();
  for (const cid of campaignIds) {
    const linkedBills = picks(billIds, rInt(1, 3));
    for (const bid of linkedBills) {
      campaignBillPairs.add(`${cid}::${bid}`);
    }
  }

  const campaignBillRows: typeof campaign_bills.$inferInsert[] = [...campaignBillPairs].map(pair => {
    const [campaign_id, bill_id] = pair.split('::');
    return { campaign_id, bill_id };
  });

  await batchInsert(campaign_bills, campaignBillRows);
  logger.info(`  ↳ ${campaignBillRows.length} campaign–bill links`, { component: 'SecondarySeed' });

  // 3. Campaign Actions — individual participation records
  const actionRows: typeof campaign_actions.$inferInsert[] = campaignIds.flatMap(cid =>
    picks(userIds, rInt(10, 30)).map(uid => ({
      campaign_id:   cid,
      user_id:       uid,
      action_type:   pick(ACTION_TYPES),
      completed_at:  rDate(new Date('2024-01-01'), new Date('2025-04-01')),
      notes:         Math.random() > 0.7
        ? `Participated via ${pick(['radio programme', 'county assembly public gallery', 'online portal', 'WhatsApp group', 'town hall meeting'])}.`
        : null,
    }))
  );

  await batchInsert(campaign_actions, actionRows, 100);
  logger.info(`  ↳ ${actionRows.length} campaign actions`, { component: 'SecondarySeed' });
  logger.info('✓ Advocacy Coordination seeded', { component: 'SecondarySeed' });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS REPORT
// ─────────────────────────────────────────────────────────────────────────────

async function printStats() {
  const safeCount = async (table: any): Promise<number> => {
    try {
      const r = await db.select({ id: table.id ?? table.bill_id }).from(table);
      return r.length;
    } catch {
      return -1; // table not migrated
    }
  };

  const fmt = (n: number) => n === -1 ? '(not migrated)' : String(n);

  const [args, cls, briefs, amb, subs, sess, audits, trojan, patterns, camps, cbills, cactions] =
    await Promise.all([
      safeCount(argumentTable),
      safeCount(claims),
      safeCount(legislative_briefs),
      safeCount(ambassadors),
      safeCount(offline_submissions),
      safeCount(facilitation_sessions),
      safeCount(participation_quality_audits),
      safeCount(trojan_analyses),
      safeCount(red_flag_patterns),
      safeCount(campaigns),
      safeCount(campaign_bills),
      safeCount(campaign_actions),
    ]);

  console.log('\n' + '─'.repeat(58));
  console.log('  Chanuka Secondary Seed — Final Statistics');
  console.log('─'.repeat(58));
  console.log('  Argument Intelligence');
  console.log(`    Arguments              : ${fmt(args)}`);
  console.log(`    Claims                 : ${fmt(cls)}`);
  console.log(`    Legislative briefs     : ${fmt(briefs)}`);
  console.log('  Universal Access');
  console.log(`    Ambassadors            : ${fmt(amb)}`);
  console.log(`    Offline submissions    : ${fmt(subs)}`);
  console.log(`    Facilitation sessions  : ${fmt(sess)}`);
  console.log('  Participation Oversight');
  console.log(`    Quality audits         : ${fmt(audits)}`);
  console.log('  Trojan Bill Detection');
  console.log(`    Red-flag patterns      : ${fmt(patterns)}`);
  console.log(`    Trojan analyses        : ${fmt(trojan)}`);
  console.log('  Advocacy Coordination');
  console.log(`    Campaigns              : ${fmt(camps)}`);
  console.log(`    Campaign–bill links    : ${fmt(cbills)}`);
  console.log(`    Campaign actions       : ${fmt(cactions)}`);
  console.log('─'.repeat(58) + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export default async function secondarySeed() {
  logger.info('🌱 Chanuka secondary seed starting…', { component: 'SecondarySeed' });

  // Verify core data exists before proceeding
  const existingUsers = await db.select({ id: users.id }).from(users);
  const existingBills = await db.select({ id: bills.id }).from(bills);

  if (existingUsers.length === 0 || existingBills.length === 0) {
    logger.error(
      '❌ Core data missing. Run the primary seed first: npm run db:seed',
      { component: 'SecondarySeed' },
    );
    process.exit(1);
  }

  const userIds = existingUsers.map(u => u.id);
  const billIds = existingBills.map(b => b.id);

  logger.info(
    `Loaded ${userIds.length} users and ${billIds.length} bills from DB.`,
    { component: 'SecondarySeed' },
  );

  try {
    await safeRun('Argument Intelligence',    () => seedArgumentIntelligence(billIds, userIds));
    await safeRun('Universal Access',         () => seedUniversalAccess(billIds, userIds));
    await safeRun('Participation Oversight',  () => seedParticipationOversight(billIds));
    await safeRun('Trojan Bill Detection',    () => seedTrojanBillDetection(billIds));
    await safeRun('Advocacy Coordination',    () => seedAdvocacyCoordination(billIds, userIds));

    await printStats();
    logger.info('✅ Secondary seed completed gracefully.', { component: 'SecondarySeed' });

  } catch (error) {
    logger.error('💥 Secondary seed encountered a critical failure', { component: 'SecondarySeed', error });
    process.exit(1);
  }
}

if (require.main === module) {
  secondarySeed().then(() => process.exit(0));
}
