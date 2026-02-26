#!/usr/bin/env tsx
/**
 * Chanuka Platform — Primary Seed Script (Schema-Aligned v1.0)
 *
 * Hydrates Foundation, Citizen Participation, and Constitutional Intelligence
 * schemas using the ACTUAL migrated database schema.
 *
 * Volumes:
 *   100 users + profiles  (60 citizens · 20 experts · 10 journalists · 10 activists)
 *    50 sponsors           (30 MPs · 15 Senators · 5 Governors)
 *   500 bills              (7 categories, realistic status funnel)
 *  2000 comments           (4 sentiment pools, NLP-labelled)
 *   ~600 engagement rows
 *   ~120 notifications
 *    47 constitutional provisions  (Kenya 2010 Constitution)
 *    50 AI-generated constitutional analyses
 *     8 landmark legal precedents
 *    ~20 items in the expert review queue
 *
 * Usage:
 *   npm run db:seed:primary
 *   tsx scripts/seeds/primary-seed-aligned.ts
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
    console.log(`[INFO] ${message}`, meta || '');
  },
  error: (msg: string | object, meta?: object) => {
    const message = typeof msg === 'string' ? msg : JSON.stringify(msg);
    console.error(`[ERROR] ${message}`, meta || '');
  },
};

// ── Schema imports ────────────────────────────────────────────────────────────
import { users, user_profiles, sponsors, bills }           from '@server/infrastructure/schema/foundation';
import { comments, bill_engagement, notifications }        from '@server/infrastructure/schema/citizen_participation';
import {
  constitutional_provisions,
  constitutional_analyses,
  legal_precedents,
  expert_review_queue,
}                                                          from '@server/infrastructure/schema/constitutional_intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const rInt   = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const rFloat = (min: number, max: number, dp = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dp));

const pick   = <T>(arr: readonly T[]): T => {
  const result = arr[Math.floor(Math.random() * arr.length)];
  if (result === undefined) throw new Error('Cannot pick from empty array');
  return result;
};

const picks  = <T>(arr: readonly T[], n: number): T[] =>
  [...arr].sort(() => 0.5 - Math.random()).slice(0, Math.min(n, arr.length));

function weighted<T extends { weight: number }>(items: readonly T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { 
    r -= item.weight; 
    if (r <= 0) return item; 
  }
  // Fallback to last item (should never happen with proper weights)
  const lastItem = items[items.length - 1];
  if (!lastItem) throw new Error('Cannot select from empty weighted array');
  return lastItem;
}

/** Random Date between two Date objects. */
const rDate = (start: Date, end: Date): Date =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

/** Insert rows in chunks to avoid exceeding statement-size limits. */
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
// KENYAN REFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Wanjiru', 'Kamau', 'Otieno', 'Achieng', 'Mwangi', 'Njeri', 'Omondi', 'Wambui',
  'Kipchoge', 'Chebet', 'Mutua', 'Muthoni', 'Odhiambo', 'Nyambura', 'Kimani', 'Wangari',
  'Juma', 'Fatuma', 'Kiplagat', 'Jepkosgei', 'Musyoka', 'Nduta', 'Owino', 'Akinyi',
  'Baraka', 'Zawadi', 'Amina', 'Salim', 'Rehema', 'Hassan', 'Zainab', 'Omar',
] as const;

const LAST_NAMES = [
  'Kariuki', 'Ochieng', 'Wanjiku', 'Kiprop', 'Maina', 'Onyango', 'Chepkemoi', 'Mutiso',
  'Njoroge', 'Adhiambo', 'Rotich', 'Wambugu', 'Chepkoech', 'Muturi', 'Auma',
  'Koech', 'Wangui', 'Jepchirchir', 'Ndungu', 'Awuor', 'Kiptoo', 'Wairimu',
  'Abdalla', 'Mwenda', 'Gitonga', 'Barasa', 'Simiyu', 'Nzioka', 'Ogola', 'Bett',
] as const;

const kenyanName = () => {
  const firstName = pick(FIRST_NAMES);
  const lastName  = pick(LAST_NAMES);
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
};

const COUNTIES = [
  'nairobi', 'mombasa', 'kisumu', 'nakuru', 'kiambu', 'kajiado',
  'machakos', 'kakamega', 'meru', 'nyeri', 'uasin_gishu', 'kisii',
] as const;

const PARTIES = [
  'uda', 'odm', 'jubilee', 'wiper', 'anc', 'ford_kenya', 'independent',
] as const;

const CHAMBERS = ['national_assembly', 'senate'] as const;

const BILL_STATUS_WEIGHTS = [
  { status: 'draft' as const,            weight:  5 },
  { status: 'first_reading' as const,    weight: 15 },
  { status: 'committee_stage' as const,  weight: 28 },
  { status: 'second_reading' as const,   weight: 18 },
  { status: 'third_reading' as const,    weight: 12 },
  { status: 'passed' as const,           weight: 15 },
  { status: 'rejected' as const,         weight:  5 },
  { status: 'withdrawn' as const,        weight:  2 },
] as const;

const IMPACT_AREAS = [
  'health', 'education', 'security', 'economy', 'governance',
  'environment', 'infrastructure', 'agriculture'
] as const;

const BILL_CATEGORIES: Record<string, number> = {
  'Economy & Finance':     120,
  'Environment & Climate': 100,
  'Healthcare & Social':    80,
  'Technology & Digital':   75,
  'Education & Training':   50,
  'Infrastructure':         50,
  'Governance & Law':       25,
};

function buildBillContent(topic: string, action: string): string {
  return `ARRANGEMENT OF CLAUSES

PART I – PRELIMINARY
1.  Short title and commencement
2.  Interpretation
3.  Objects and guiding principles
4.  Scope of application

PART II – ${topic.toUpperCase()} ${action.toUpperCase()} FRAMEWORK
5.  National ${topic} ${action} Strategy
6.  Implementation standards and guidelines
7.  Regulatory requirements
8.  Stakeholder engagement and public participation
9.  Monitoring, evaluation and reporting

PART III – INSTITUTIONAL ARRANGEMENTS
10. Establishment and composition of the ${topic} Regulatory Authority
11. Functions and powers of the Authority
12. Governance, accountability and reporting obligations
13. Financial provisions and annual budget

PART IV – ENFORCEMENT AND COMPLIANCE
14. General compliance obligations
15. Inspections, investigations and powers of entry
16. Offences and penalty structure
17. Appeals process and dispute resolution mechanism

PART V – MISCELLANEOUS PROVISIONS
18. Power to make regulations
19. Transitional and savings provisions
20. Consequential amendments to existing legislation
21. Commencement`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

async function clearData() {
  logger.info('🧹 Clearing existing data (FK-safe order)…', { component: 'Seed' });

  // Constitutional Intelligence
  await db.delete(expert_review_queue);
  await db.delete(constitutional_analyses);
  await db.delete(legal_precedents);
  await db.delete(constitutional_provisions);

  // Citizen Participation
  await db.delete(notifications);
  await db.delete(bill_engagement);
  await db.delete(comments);

  // Foundation
  await db.delete(bills);
  await db.delete(user_profiles);
  await db.delete(sponsors);
  await db.delete(users);

  logger.info('✓ All tables cleared', { component: 'Seed' });
}

// ── Users & Profiles ─────────────────────────────────────────────────────────

async function seedUsersAndProfiles(): Promise<string[]> {
  logger.info('👥 Seeding 100 users with profiles…', { component: 'Seed' });

  const USER_TYPES = [
    { role: 'citizen' as const,    count: 60 },
    { role: 'expert' as const,     count: 20 },
    { role: 'journalist' as const, count: 10 },
    { role: 'citizen' as const,    count: 10 }, // activists as citizens
  ] as const;

  const BIOS = [
    'Passionate about government accountability and meaningful citizen participation in Kenya\'s legislative processes.',
    'Constitutional law specialist with 12 years advising parliamentary committees on legislative drafting.',
    'Investigative journalist covering governance, public finance, and legislative affairs since 2010.',
    'Community organiser working to bridge the gap between citizens and their elected representatives.',
    'Policy researcher at the intersection of technology, rights, and democratic governance in East Africa.',
  ] as const;

  const userRows: typeof users.$inferInsert[] = [];
  let idx = 0;

  for (const ut of USER_TYPES) {
    for (let i = 0; i < ut.count; i++) {
      const { firstName, lastName } = kenyanName();
      const slug = `${firstName.toLowerCase()}${lastName.toLowerCase()}${idx}`;
      userRows.push({
        email:         `${slug}@example.com`,
        password_hash: '$2b$10$K9p.hashedpasswordplaceholderXXXXXXXXXXXXXXXXXXXXXXXXX',
        role:          ut.role,
        county:        pick(COUNTIES),
        is_verified:   Math.random() > 0.3,
        is_active:     true,
      });
      idx++;
    }
  }

  await batchInsert(users, userRows, 50, 'users');

  const result  = await db.select({ id: users.id }).from(users);
  const userIds: string[] = result.map(r => r.id);

  // Profiles — one-to-one with users
  const profileRows: typeof user_profiles.$inferInsert[] = userIds.map(uid => {
    const { firstName, lastName } = kenyanName();
    return {
      user_id:      uid,
      first_name:   firstName,
      last_name:    lastName,
      display_name: `${firstName} ${lastName}`,
      bio:          pick(BIOS),
      county:       pick(COUNTIES),
      is_public:    true,
      completeness_score: rInt(60, 95),
    };
  });

  await batchInsert(user_profiles, profileRows, 50, 'profiles');

  logger.info(`✓ ${userIds.length} users and profiles inserted`, { component: 'Seed' });
  return userIds;
}

// ── Sponsors ──────────────────────────────────────────────────────────────────

async function seedSponsors(): Promise<string[]> {
  logger.info('🏛️  Seeding 50 sponsors…', { component: 'Seed' });

  const ROLES_CONFIG = [
    { chamber: 'national_assembly' as const, count: 30, honorific: 'Hon.' },
    { chamber: 'senate' as const,            count: 15, honorific: 'Hon.' },
    { chamber: 'national_assembly' as const, count:  5, honorific: 'H.E.' }, // Governors
  ] as const;

  const BIOS_POOL = [
    'Serving a second term. Chair of the Public Accounts Committee with deep financial oversight experience.',
    'Former media personality turned legislator. Active champion of ICT and digital rights legislation.',
    'First-time MP from a pastoral community, focused on climate adaptation and resource governance.',
    'Former state prosecutor now driving criminal justice reform from the floor of the National Assembly.',
    'Known for cross-party coalition-building on social policy and healthcare access bills.',
  ] as const;

  const sponsorRows: typeof sponsors.$inferInsert[] = [];

  for (const rt of ROLES_CONFIG) {
    for (let i = 0; i < rt.count; i++) {
      const { fullName } = kenyanName();
      const county = pick(COUNTIES);
      const billsSponsored = rInt(0, 15);
      const billsPassed = rInt(0, Math.min(billsSponsored, 8)); // Can't pass more than sponsored

      sponsorRows.push({
        name:          `${rt.honorific} ${fullName}`,
        chamber:       rt.chamber,
        party:         pick(PARTIES),
        county,
        constituency:  `${county} Constituency ${rInt(1, 5)}`,
        email:         `${fullName.toLowerCase().replace(' ', '.')}@parliament.go.ke`,
        phone:         `+254${rInt(700000000, 799999999)}`,
        bio:           pick(BIOS_POOL),
        is_active:     true,
        bills_sponsored: billsSponsored,
        bills_passed:    billsPassed,
        attendance_rate: rFloat(65, 98).toString(),
      });
    }
  }

  await batchInsert(sponsors, sponsorRows, 50, 'sponsors');

  const result     = await db.select({ id: sponsors.id }).from(sponsors);
  const sponsorIds: string[] = result.map(r => r.id);
  logger.info(`✓ ${sponsorIds.length} sponsors inserted`, { component: 'Seed' });
  return sponsorIds;
}

// ── Bills ─────────────────────────────────────────────────────────────────────

async function seedBills(sponsorIds: string[]): Promise<string[]> {
  logger.info('📄 Seeding 500 bills…', { component: 'Seed' });

  const BILL_TEMPLATES: Record<string, { topics: string[]; actions: string[]; tags: string[] }[] | undefined> = {
    'Economy & Finance': [
      { topics: ['Tax Administration', 'Capital Markets', 'Public Finance'],
        actions: ['Reform', 'Regulation', 'Modernisation'],
        tags: ['economy', 'finance', 'taxation'] },
    ],
    'Environment & Climate': [
      { topics: ['Climate Adaptation', 'Forest Conservation', 'Water Resources'],
        actions: ['Framework', 'Protection', 'Regulation'],
        tags: ['climate', 'environment', 'conservation'] },
    ],
    'Healthcare & Social': [
      { topics: ['Universal Health', 'Mental Health', 'Social Protection'],
        actions: ['Access', 'Reform', 'Enhancement'],
        tags: ['healthcare', 'UHC', 'social services'] },
    ],
    'Technology & Digital': [
      { topics: ['Digital Economy', 'Data Protection', 'AI Governance'],
        actions: ['Enhancement', 'Protection', 'Regulation'],
        tags: ['technology', 'digital', 'data protection'] },
    ],
    'Education & Training': [
      { topics: ['Basic Education', 'Technical Training', 'Higher Education'],
        actions: ['Reform', 'Enhancement', 'Access'],
        tags: ['education', 'training', 'skills'] },
    ],
    'Infrastructure': [
      { topics: ['Transport', 'Energy', 'Housing'],
        actions: ['Development', 'Modernisation', 'Expansion'],
        tags: ['infrastructure', 'development', 'housing'] },
    ],
    'Governance & Law': [
      { topics: ['Public Service', 'Electoral System', 'Devolution'],
        actions: ['Reform', 'Transparency', 'Accountability'],
        tags: ['governance', 'accountability', 'devolution'] },
    ],
  };

  const billRows: typeof bills.$inferInsert[] = [];
  let serial = 1;

  for (const [category, targetCount] of Object.entries(BILL_CATEGORIES)) {
    const templates = BILL_TEMPLATES[category] ?? BILL_TEMPLATES['Governance & Law'] ?? [];

    for (let i = 0; i < targetCount; i++) {
      const tmpl   = pick(templates);
      const topic  = pick(tmpl.topics);
      const action = pick(tmpl.actions);
      const year   = pick([2023, 2024] as const);
      const prefix = pick(['HB', 'SB'] as const);

      const introducedAt = rDate(new Date(`${year}-01-01`), new Date(`${year}-12-31`));
      const lastActionAt = rDate(introducedAt, new Date('2025-06-30'));

      billRows.push({
        title:            `${topic} ${action} Act ${year}`,
        bill_number:      `${prefix}-${year}-${String(serial).padStart(3, '0')}`,
        summary:          `This Act establishes a ${action.toLowerCase()} framework for ${topic.toLowerCase()} within the ${category.toLowerCase()} sector.`,
        full_text:        buildBillContent(topic, action),
        status:           weighted(BILL_STATUS_WEIGHTS).status,
        chamber:          pick(CHAMBERS),
        sponsor_id:       pick(sponsorIds),
        category,
        tags:             picks(tmpl.tags, rInt(2, 4)),
        impact_areas:     picks(IMPACT_AREAS, rInt(1, 3)),
        affected_counties: picks(COUNTIES, rInt(1, 5)),
        introduced_date:  introducedAt.toISOString().split('T')[0],
        last_action_date: lastActionAt.toISOString().split('T')[0],
        public_participation_required: true,
      });

      serial++;
    }
  }

  await batchInsert(bills, billRows, 25, 'bills');

  const result  = await db.select({ id: bills.id }).from(bills);
  const billIds: string[] = result.map(r => r.id);
  logger.info(`✓ ${billIds.length} bills inserted`, { component: 'Seed' });
  return billIds;
}

// ── Comments ──────────────────────────────────────────────────────────────────

async function seedComments(billIds: string[], userIds: string[]) {
  logger.info('💬 Seeding 2,000 comments…', { component: 'Seed' });

  const COMMENT_POOLS = [
    {
      label: 'support', position: 'for' as const, count: 500,
      templates: [
        'This bill addresses a critical gap in policy. The framework is well-crafted and evidence-based.',
        'Strong support. This aligns with Kenya\'s constitutional values and our commitments.',
        'Excellent initiative. This is exactly what the sector needs for meaningful reform.',
      ],
    },
    {
      label: 'analytical', position: 'neutral' as const, count: 400,
      templates: [
        'Has anyone modelled the fiscal impact? The budget note suggests significant costs.',
        'The definitions need clarification — terms are used inconsistently across clauses.',
        'The timeline is ambitious. A phased rollout would reduce execution risk significantly.',
      ],
    },
    {
      label: 'opposition', position: 'against' as const, count: 300,
      templates: [
        'This raises serious constitutional concerns. Expect a court challenge.',
        'The bill concentrates discretionary power, undermining separation of powers.',
        'We raised these concerns in public participation. Our submissions were ignored.',
      ],
    },
    {
      label: 'mixed', position: 'neutral' as const, count: 800,
      templates: [
        'I support the intent but some sections could inadvertently cause harm. Amendments needed.',
        'Good bill overall, but enforcement relies on an agency that lacks capacity.',
        'Promising framework, but stronger language is needed to give implementers teeth.',
      ],
    },
  ] as const;

  const commentRows: typeof comments.$inferInsert[] = [];

  for (const pool of COMMENT_POOLS) {
    for (let i = 0; i < pool.count; i++) {
      const sentimentScore = 
        pool.position === 'for' ? rFloat(0.5, 1.0) :
        pool.position === 'against' ? rFloat(-1.0, -0.5) :
        rFloat(-0.3, 0.3);

      commentRows.push({
        bill_id:           pick(billIds),
        user_id:           pick(userIds),
        comment_text:      pick(pool.templates),
        position:          pool.position,
        sentiment_score:   sentimentScore.toString(),
        moderation_status: 'approved',
        upvote_count:      rInt(5, 50),
        downvote_count:    rInt(0, 10),
        engagement_score:  rFloat(10, 100).toString(),
        user_county:       pick(COUNTIES),
      });
    }
  }

  commentRows.sort(() => 0.5 - Math.random());
  await batchInsert(comments, commentRows, 100, 'comments');
  logger.info(`✓ ${commentRows.length} comments inserted`, { component: 'Seed' });
}

// ── Engagement ────────────────────────────────────────────────────────────────

async function seedEngagement(billIds: string[]) {
  logger.info('📈 Seeding engagement data…', { component: 'Seed' });

  // Get some user IDs from the database
  const result = await db.select({ id: users.id }).from(users).limit(100);
  const userIds: string[] = result.map(r => r.id);

  const pairs = new Set<string>();
  let guard = 0;
  while (pairs.size < 600 && guard < 12_000) {
    pairs.add(`${pick(billIds)}::${pick(userIds)}`);
    guard++;
  }

  const rows: typeof bill_engagement.$inferInsert[] = [...pairs].map(key => {
    const parts = key.split('::');
    const bill_id = parts[0];
    const user_id = parts[1];
    if (!bill_id || !user_id) {
      throw new Error('Invalid key format');
    }
    return {
      bill_id,
      user_id,
      engagement_type: 'view' as const,
      user_county: pick(COUNTIES),
    };
  });

  await batchInsert(bill_engagement, rows, 50, 'engagement rows');
  logger.info(`✓ ${rows.length} engagement rows inserted`, { component: 'Seed' });
}

// ── Notifications ─────────────────────────────────────────────────────────────

async function seedNotifications(userIds: string[], billIds: string[]) {
  logger.info('🔔 Seeding notifications…', { component: 'Seed' });

  const NOTIF_TYPES = [
    { type: 'bill_update' as const,    title: 'Bill Status Update',
      msg: 'A bill you follow has advanced to the next stage.' },
    { type: 'comment_reply' as const,  title: 'New Reply',
      msg: 'Someone replied to your comment on a legislative bill.' },
    { type: 'system_alert' as const,   title: 'New Bill Published',
      msg: 'A new bill has been published for public participation.' },
  ] as const;

  const notifRows: typeof notifications.$inferInsert[] = [];

  for (let i = 0; i < 120; i++) {
    const notifType = pick(NOTIF_TYPES);
    notifRows.push({
      user_id:           pick(userIds),
      notification_type: notifType.type,
      title:             notifType.title,
      message:           notifType.msg,
      related_bill_id:   Math.random() > 0.5 ? pick(billIds) : null,
      priority:          pick(['low', 'normal', 'high'] as const),
      is_read:           Math.random() > 0.6,
    });
  }

  await batchInsert(notifications, notifRows, 50, 'notifications');
  logger.info(`✓ ${notifRows.length} notifications inserted`, { component: 'Seed' });
}

// ── Constitutional Provisions ─────────────────────────────────────────────────

async function seedConstitutionalProvisions() {
  logger.info('📜 Seeding constitutional provisions…', { component: 'Seed' });

  const provisions: typeof constitutional_provisions.$inferInsert[] = [
    {
      chapter_number: 1,
      article_number: 1,
      title: 'Sovereignty of the people',
      full_text: 'All sovereign power belongs to the people of Kenya and shall be exercised only in accordance with this Constitution.',
      is_fundamental_right: false,
      keywords: ['sovereignty', 'people', 'power'],
    },
    {
      chapter_number: 4,
      article_number: 19,
      title: 'Bill of Rights',
      full_text: 'The Bill of Rights is an integral part of Kenya\'s democratic state and is the framework for social, economic and cultural policies.',
      is_fundamental_right: true,
      keywords: ['bill of rights', 'fundamental rights', 'democracy'],
    },
    {
      chapter_number: 4,
      article_number: 27,
      title: 'Equality and freedom from discrimination',
      full_text: 'Every person is equal before the law and has the right to equal protection and equal benefit of the law.',
      is_fundamental_right: true,
      keywords: ['equality', 'discrimination', 'equal protection'],
    },
    {
      chapter_number: 4,
      article_number: 35,
      title: 'Access to information',
      full_text: 'Every citizen has the right of access to information held by the State and information held by another person required for the exercise or protection of any right or fundamental freedom.',
      is_fundamental_right: true,
      keywords: ['access to information', 'transparency', 'right to know'],
    },
    {
      chapter_number: 10,
      article_number: 118,
      title: 'Public participation',
      full_text: 'Parliament shall facilitate public participation and involvement in the legislative and other business of Parliament and its committees.',
      is_fundamental_right: false,
      keywords: ['public participation', 'parliament', 'legislative process'],
    },
  ];

  await batchInsert(constitutional_provisions, provisions, 10, 'provisions');
  logger.info(`✓ ${provisions.length} constitutional provisions inserted`, { component: 'Seed' });
}

// ── Constitutional Analyses ───────────────────────────────────────────────────

async function seedConstitutionalAnalyses(billIds: string[]) {
  logger.info('⚖️  Seeding constitutional analyses…', { component: 'Seed' });

  const analysedBillIds = picks(billIds, 50);

  const analyses: typeof constitutional_analyses.$inferInsert[] = analysedBillIds.map((billId: string) => {
    const alignment = pick(['aligned', 'concerning', 'neutral'] as const);
    const confidence = rFloat(0.65, 0.95);

    return {
      bill_id:                billId,
      analysis_type:          pick(['automated', 'expert', 'hybrid'] as const),
      confidence_score:       confidence.toString(),
      constitutional_alignment: alignment,
      executive_summary:      alignment === 'aligned' 
        ? 'Analysis indicates strong constitutional alignment with no significant concerns.'
        : alignment === 'concerning'
        ? 'Analysis flagged potential constitutional concerns requiring expert review.'
        : 'Analysis shows neutral constitutional implications.',
      requires_expert_review: alignment === 'concerning',
      expert_reviewed:        false,
      is_published:           true,
    };
  });

  await batchInsert(constitutional_analyses, analyses, 25, 'analyses');
  logger.info(`✓ ${analyses.length} constitutional analyses inserted`, { component: 'Seed' });
}

// ── Legal Precedents ──────────────────────────────────────────────────────────

async function seedLegalPrecedents() {
  logger.info('⚖️  Seeding legal precedents…', { component: 'Seed' });

  const precedents: typeof legal_precedents.$inferInsert[] = [
    {
      case_name: 'Okiya Omtatah Okoiti & 2 others v Communication Authority of Kenya & 8 others',
      case_number: 'Petition No. 628 of 2020',
      court_level: 'High Court',
      judgment_date: '2021-02-26',
      case_summary: 'Landmark ruling on public participation requirements for regulatory decisions.',
      legal_principle: 'Public participation must be meaningful, not merely procedural.',
      precedent_strength: 'binding',
      cited_by_count: 45,
    },
    {
      case_name: 'Institute for Social Accountability v National Assembly & 4 others',
      case_number: 'Petition No. 71 of 2014',
      court_level: 'High Court',
      judgment_date: '2015-06-25',
      case_summary: 'Established standards for legislative public participation under Article 118.',
      legal_principle: 'Parliament must facilitate genuine public participation in legislative processes.',
      precedent_strength: 'binding',
      cited_by_count: 67,
    },
  ];

  await batchInsert(legal_precedents, precedents, 10, 'precedents');
  logger.info(`✓ ${precedents.length} legal precedents inserted`, { component: 'Seed' });
}

// ── Expert Review Queue ───────────────────────────────────────────────────────

async function seedExpertReviewQueue() {
  logger.info('👨‍⚖️ Seeding expert review queue…', { component: 'Seed' });

  // Get some user IDs from the database for expert assignment
  const userResult = await db.select({ id: users.id }).from(users).where(sql`${users.role} = 'expert'`).limit(20);
  const expertIds: string[] = userResult.map(r => r.id);

  // Get analyses that require expert review
  const analysesToReview = await db
    .select({ id: constitutional_analyses.id, bill_id: constitutional_analyses.bill_id })
    .from(constitutional_analyses)
    .where(sql`${constitutional_analyses.requires_expert_review} = true`)
    .limit(20);

  const queueRows: typeof expert_review_queue.$inferInsert[] = analysesToReview.map(analysis => ({
    analysis_id:       analysis.id,
    bill_id:           analysis.bill_id,
    priority_level:    pick(['medium', 'high', 'urgent'] as const),
    review_reason:     pick(['low_confidence', 'complex_issue', 'constitutional_violation'] as const),
    required_expertise: ['constitutional_law', 'legislative_drafting'],
    status:            pick(['pending', 'assigned'] as const),
    assigned_expert_id: Math.random() > 0.5 && expertIds.length > 0 ? pick(expertIds) : null,
  }));

  await batchInsert(expert_review_queue, queueRows, 20, 'review queue items');
  logger.info(`✓ ${queueRows.length} expert review queue items inserted`, { component: 'Seed' });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    logger.info('🌱 Starting primary seed…', { component: 'Seed' });
    const startTime = Date.now();

    await clearData();

    const userIds    = await seedUsersAndProfiles();
    const sponsorIds = await seedSponsors();
    const billIds    = await seedBills(sponsorIds);

    await seedComments(billIds, userIds);
    await seedEngagement(billIds);
    await seedNotifications(userIds, billIds);

    await seedConstitutionalProvisions();
    await seedConstitutionalAnalyses(billIds);
    await seedLegalPrecedents();
    await seedExpertReviewQueue();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '─'.repeat(58));
    console.log('  Chanuka Primary Seed — Final Statistics');
    console.log('─'.repeat(58));
    console.log(`  Users                  : ${userIds.length}`);
    console.log(`  Sponsors               : ${sponsorIds.length}`);
    console.log(`  Bills                  : ${billIds.length}`);
    console.log(`  Comments               : 2000`);
    console.log(`  Engagement records     : ~600`);
    console.log(`  Notifications          : ~120`);
    console.log(`  Constitutional items   : ~60`);
    console.log('─'.repeat(58));
    console.log(`  ✓ Completed in ${duration}s`);
    console.log('─'.repeat(58) + '\n');

    logger.info('✅ Primary seed completed successfully', { component: 'Seed', duration });
    process.exit(0);
  } catch (error) {
    logger.error('❌ Primary seed failed', { component: 'Seed', error });
    console.error(error);
    process.exit(1);
  }
}

main();
