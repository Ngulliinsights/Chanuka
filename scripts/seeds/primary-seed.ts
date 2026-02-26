#!/usr/bin/env tsx
/**
 * Chanuka Platform — Primary Seed Script (v5, final)
 *
 * Hydrates the Foundation, Citizen Participation, and Constitutional
 * Intelligence schemas using Drizzle's type-safe insert API.
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
 *   npm run db:seed
 *   tsx scripts/seeds/primary-seed.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { database as db } from '@server/infrastructure/database/connection';
import { logger }         from '@server/infrastructure/observability';

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
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  users:    100,
  sponsors:  50,
  bills:    500,
  comments: 2000,
} as const;

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

function weighted<T extends { weight: number }>(items: readonly T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
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
    await db.insert(table).values(rows.slice(i, i + size));
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
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale',
  'Garissa', 'Kakamega', 'Bungoma', 'Machakos', 'Meru', 'Nyeri', 'Kiambu', 'Kajiado',
  'Kilifi', 'Kwale', 'Lamu', 'Taita Taveta', 'Tana River', 'Embu', 'Isiolo', 'Kirinyaga',
  'Laikipia', 'Marsabit', "Murang'a", 'Nyandarua', 'Samburu', 'Tharaka Nithi',
  'Trans Nzoia', 'Baringo', 'Bomet', 'Elgeyo Marakwet', 'Kericho', 'Nandi', 'Narok',
  'Uasin Gishu', 'West Pokot', 'Homa Bay', 'Kisii', 'Migori', 'Nyamira', 'Siaya',
  'Mandera', 'Wajir', 'Turkana',
] as const;

const PARTIES = [
  'Kenya Kwanza', 'Azimio la Umoja', 'ODM', 'UDA', 'Jubilee',
  'Wiper', 'ANC', 'FORD Kenya', 'DAP-K', 'Independent',
] as const;

const BILL_STATUS_WEIGHTS = [
  { status: 'draft',            weight:  5 },
  { status: 'first_reading',    weight: 15 },
  { status: 'committee_stage',  weight: 28 },
  { status: 'second_reading',   weight: 18 },
  { status: 'third_reading',    weight: 12 },
  { status: 'passed',           weight: 15 },
  { status: 'rejected',         weight:  5 },
  { status: 'withdrawn',        weight:  2 },
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

const BILL_TEMPLATES: Record<string, { topics: string[]; actions: string[]; tags: string[] }[]> = {
  'Economy & Finance': [
    { topics: ['Tax Administration', 'Capital Markets', 'Public Finance', 'Trade Facilitation', 'Investment'],
      actions: ['Reform', 'Regulation', 'Promotion', 'Modernisation'],
      tags: ['economy', 'finance', 'taxation', 'investment', 'trade'] },
    { topics: ['SME', 'Industrial', 'Green Economy', 'Digital Commerce'],
      actions: ['Empowerment', 'Development', 'Support', 'Growth'],
      tags: ['economic development', 'business', 'entrepreneurship', 'msme'] },
  ],
  'Environment & Climate': [
    { topics: ['Climate Adaptation', 'Climate Finance', 'Carbon Markets', 'Climate Justice'],
      actions: ['Framework', 'Fund', 'Strategy', 'Transition'],
      tags: ['climate change', 'adaptation', 'green economy', 'sustainability'] },
    { topics: ['Water Resources', 'Forest', 'Wildlife', 'Marine Resources', 'Air Quality'],
      actions: ['Conservation', 'Protection', 'Restoration', 'Regulation'],
      tags: ['conservation', 'natural resources', 'environmental protection', 'biodiversity'] },
  ],
  'Healthcare & Social': [
    { topics: ['Universal Health', 'Primary Healthcare', 'Mental Health', 'Reproductive Health'],
      actions: ['Access', 'Reform', 'Enhancement', 'Coverage'],
      tags: ['healthcare', 'universal coverage', 'public health', 'UHC'] },
    { topics: ['Social Protection', 'Social Security', 'Child Welfare', 'Disability Rights', 'Elderly Care'],
      actions: ['Enhancement', 'Expansion', 'Reform', 'Integration'],
      tags: ['social services', 'welfare', 'social protection', 'inclusion'] },
  ],
  'Technology & Digital': [
    { topics: ['Digital Economy', 'Digital Infrastructure', 'Digital Rights', 'AI Governance'],
      actions: ['Enhancement', 'Protection', 'Development', 'Regulation'],
      tags: ['digital economy', 'technology', 'data protection', 'cybersecurity', 'AI'] },
    { topics: ['Fintech', 'E-Commerce', 'Blockchain', 'Telecommunications'],
      actions: ['Regulation', 'Promotion', 'Standards', 'Licensing'],
      tags: ['fintech', 'regulation', 'innovation', 'telecoms'] },
  ],
  'Education & Training': [
    { topics: ['Basic Education', 'Higher Education', 'Technical Training', 'Vocational Education', 'Adult Literacy'],
      actions: ['Reform', 'Enhancement', 'Access', 'Quality Assurance'],
      tags: ['education', 'training', 'skills development', 'TVET', 'CBC'] },
  ],
  'Infrastructure': [
    { topics: ['Transport', 'Energy', 'Affordable Housing', 'Water and Sanitation', 'Digital Infrastructure'],
      actions: ['Development', 'Modernisation', 'Expansion', 'Public-Private Partnership'],
      tags: ['infrastructure', 'development', 'housing', 'energy', 'transport'] },
  ],
  'Governance & Law': [
    { topics: ['Public Service', 'Electoral System', 'Judicial Service', 'Devolution', 'County Government'],
      actions: ['Reform', 'Transparency', 'Integrity', 'Accountability'],
      tags: ['governance', 'accountability', 'transparency', 'rule of law', 'devolution'] },
  ],
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
// COMMENT TEMPLATE POOLS  (NLP training — sentiment labelled)
// ─────────────────────────────────────────────────────────────────────────────

const COMMENT_POOLS = [
  {
    label: 'support', sentiment: 'positive' as const, count: 500,
    isVerified: 0.35, upR: [15, 50] as [number, number], dnR: [0, 5] as [number, number],
    templates: [
      'This bill addresses a critical gap in {topic} policy. Part {part} is well-crafted and evidence-based.',
      'Strong support. This aligns with Kenya\'s constitutional values and our commitments on {topic}.',
      'As a {role} working in {topic}, I appreciate the comprehensive approach — this will benefit {beneficiary}.',
      'Excellent initiative. The {aspect} framework in Clause {section} is exactly what the sector needs.',
      'Finally, a bill tackling root causes rather than symptoms in {topic}. The sponsor deserves credit.',
      'Part {part} demonstrates genuine consultation with {beneficiary}. This is how good legislation is made.',
      'The graduated penalty structure in Part IV strikes the right balance between deterrence and proportionality.',
    ],
  },
  {
    label: 'analytical', sentiment: 'neutral' as const, count: 400,
    isVerified: 0.20, upR: [8, 30] as [number, number], dnR: [1, 8] as [number, number],
    templates: [
      'Has anyone modelled the fiscal impact? The budget note suggests {amount}bn KES but costs could exceed this.',
      'Section {section} needs clearer definitions — "{aspect}" is used inconsistently across clauses.',
      'Read alongside the {related}, there are potential conflicts the committee should resolve before second reading.',
      'The timeline is ambitious. A phased county-by-county rollout would reduce execution risk significantly.',
      'Have {beneficiary} been adequately consulted? The bill references them but has no direct participation mechanism.',
      'The oversight role of the {aspect} Authority overlaps with existing mandates. Rationalisation is needed.',
      'Clause {section} grants broad delegated legislative power. Parliament should tighten the criteria.',
    ],
  },
  {
    label: 'opposition', sentiment: 'negative' as const, count: 300,
    isVerified: 0.15, upR: [5, 25] as [number, number], dnR: [5, 20] as [number, number],
    templates: [
      'Clause {section} raises serious constitutional concerns under Article {article}. Expect a court challenge.',
      'The bill concentrates discretionary power in a single office, undermining separation of powers.',
      'The Part IV penalty regime is disproportionate and will stifle legitimate {topic} activities.',
      'We raised these concerns in public participation. Our submissions appear to have been wholly ignored.',
      'The definition of "{aspect}" is so broad it could criminalise legitimate civic action.',
      'Fiscal projections are not credible. The {aspect} Authority alone will cost taxpayers more than it saves.',
      'This has failed in comparable jurisdictions. We need a different framework, not incremental reform.',
    ],
  },
  {
    label: 'mixed', sentiment: 'neutral' as const, count: 800,
    isVerified: 0.25, upR: [10, 35] as [number, number], dnR: [2, 10] as [number, number],
    templates: [
      'I support the intent but Section {section} could inadvertently harm {beneficiary}. A targeted amendment fixes this.',
      'Good bill overall, but enforcement relies on an agency that currently lacks institutional capacity.',
      'The {aspect} provisions are strong. If only Part {part} had received the same rigour, this would be excellent.',
      'This mirrors the {related} approach that worked elsewhere. Adapting for Kenya\'s devolved context is the key challenge.',
      'Cautious support. The sunset clause in Clause {section} is smart — it prevents regulatory lock-in.',
      'Necessary legislation, but the transition provisions are vague. Existing operators need clearer guidance.',
      'Promising framework, but stronger language on {aspect} is needed to give implementers sufficient teeth.',
    ],
  },
] as const;

const TOPICS       = ['healthcare', 'education', 'environment', 'fiscal policy', 'technology', 'agriculture', 'housing'] as const;
const ROLES        = ['practitioner', 'researcher', 'CSO representative', 'policy analyst', 'affected citizen', 'sector expert'] as const;
const BENEFICIARIES = ['rural communities', 'smallholder farmers', 'youth entrepreneurs', 'women and girls', 'persons with disabilities', 'county governments'] as const;
const ASPECTS      = ['regulatory oversight', 'financial accountability', 'implementation timelines', 'public participation', 'intergovernmental coordination'] as const;
const RELATED_LAWS = [
  'Public Finance Management Act', 'County Governments Act', 'National Environment Management Act',
  'Employment Act', 'Competition Act', 'Data Protection Act', 'Anti-Corruption and Economic Crimes Act',
] as const;

function buildComment(template: string): string {
  return template
    .replace('{topic}',       pick(TOPICS))
    .replace('{part}',        String(rInt(1, 5)))
    .replace('{section}',     String(rInt(3, 22)))
    .replace('{article}',     String(rInt(10, 57)))
    .replace('{role}',        pick(ROLES))
    .replace('{beneficiary}', pick(BENEFICIARIES))
    .replace('{aspect}',      pick(ASPECTS))
    .replace('{related}',     pick(RELATED_LAWS))
    .replace('{amount}',      String(rInt(1, 30)));
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
    {
      type: 'citizen',    count: 60,
      pool: ['civic engagement', 'community organising', 'voter education', 'local governance'],
      repRange: [45, 80] as [number, number],
    },
    {
      type: 'expert',     count: 20,
      pool: ['constitutional law', 'policy analysis', 'legislative drafting', 'governance', 'economics'],
      repRange: [80, 100] as [number, number],
    },
    {
      type: 'journalist', count: 10,
      pool: ['investigative journalism', 'political reporting', 'data journalism', 'media law'],
      repRange: [70, 95] as [number, number],
    },
    {
      type: 'activist',   count: 10,
      pool: ['human rights', 'advocacy', 'transparency', 'anti-corruption', 'gender equality'],
      repRange: [65, 90] as [number, number],
    },
  ] as const;

  const ORGS = [
    'University of Nairobi', 'Kenya Human Rights Commission', 'Transparency International Kenya',
    'The Standard Media Group', 'Daily Nation', 'Institute of Economic Affairs',
    'Constitution and Reform Education Consortium', 'Katiba Institute',
    'African Centre for Open Governance', 'Kenya ICT Board', 'Kenya Law Reform Commission',
    'Independent',
  ] as const;

  const BIOS = [
    'Passionate about government accountability and meaningful citizen participation in Kenya\'s legislative processes.',
    'Constitutional law specialist with 12 years advising parliamentary committees on legislative drafting.',
    'Investigative journalist covering governance, public finance, and legislative affairs since 2010.',
    'Community organiser working to bridge the gap between citizens and their elected representatives.',
    'Policy researcher at the intersection of technology, rights, and democratic governance in East Africa.',
    'Human rights defender specialising in economic, social, and cultural rights jurisprudence.',
    'Data analyst supporting evidence-based advocacy for better public policy outcomes in Kenya.',
    'Retired civil servant turned civic educator — committed to an informed and engaged citizenry.',
    'Youth advocate and entrepreneur driving legislation that unlocks Kenya\'s economic potential.',
    'Gender equality champion embedding intersectional analysis into all stages of law-making.',
  ] as const;

  const userRows: typeof users.$inferInsert[] = [];
  let idx = 0;

  for (const ut of USER_TYPES) {
    for (let i = 0; i < ut.count; i++) {
      const { firstName, lastName } = kenyanName();
      const slug = `${firstName.toLowerCase()}${lastName.toLowerCase()}${idx}`;
      userRows.push({
        username:             slug,
        // bcrypt placeholder — replace with proper hash in production
        password:             '$2b$10$K9p.hashedpasswordplaceholderXXXXXXXXXXXXXXXXXXXXXXXXX',
        email:                `${slug}@${ut.type === 'citizen' ? 'example.com' : `${ut.type}.ke`}`,
        expertise:            picks(ut.pool, rInt(1, 3)).join(', '),
        onboarding_completed: true,
        reputation:           rInt(...ut.repRange),
      });
      idx++;
    }
  }

  await batchInsert(users, userRows, 50, 'users');

  const result  = await db.select({ id: users.id }).from(users);
  const userIds = result.map(r => r.id);

  // Profiles — one-to-one with users
  const profileRows: typeof user_profiles.$inferInsert[] = userIds.map(uid => ({
    user_id:      uid,
    bio:          pick(BIOS),
    expertise:    [pick(TOPICS), pick(ASPECTS)],
    location:     `${pick(COUNTIES)}, Kenya`,
    organization: pick(ORGS),
    is_public:    true,
  }));

  await batchInsert(user_profiles, profileRows, 50, 'profiles');

  logger.info(`✓ ${userIds.length} users and profiles inserted`, { component: 'Seed' });
  return userIds;
}

// ── Sponsors ──────────────────────────────────────────────────────────────────

async function seedSponsors(): Promise<string[]> {
  logger.info('🏛️  Seeding 50 sponsors…', { component: 'Seed' });

  const ROLES_CONFIG = [
    { role: 'Member of Parliament', count: 30, honorific: 'Hon.', domain: 'parliament.go.ke' },
    { role: 'Senator',              count: 15, honorific: 'Hon.', domain: 'senate.go.ke'     },
    { role: 'Governor',             count:  5, honorific: 'H.E.', domain: 'county.go.ke'     },
  ] as const;

  const BIOS_BY_ROLE: Record<string, readonly string[]> = {
    'Member of Parliament': [
      'Serving a second term. Chair of the Public Accounts Committee with deep financial oversight experience.',
      'Former media personality turned legislator. Active champion of ICT and digital rights legislation.',
      'First-time MP from a pastoral community, focused on climate adaptation and resource governance.',
      'Former state prosecutor now driving criminal justice reform from the floor of the National Assembly.',
      'Known for cross-party coalition-building on social policy and healthcare access bills.',
    ],
    'Senator': [
      'Former County Assembly Speaker now championing devolution and equitable county resource allocation.',
      'Constitutional scholar known for rigorous, clause-by-clause scrutiny of bills affecting counties.',
      'Second-term Senator driving gender-responsive budgeting and disability-inclusive legislation.',
      'Finance background; principal author of landmark public debt management legislation.',
    ],
    'Governor': [
      'Transforming county service delivery through technology adoption and transparent procurement.',
      'Former cabinet minister with a development agenda anchored on agriculture and rural infrastructure.',
      'Healthcare professional turned governor, overseeing one of Kenya\'s most ambitious UHC pilots.',
    ],
  };

  const sponsorRows: typeof sponsors.$inferInsert[] = [];

  for (const rt of ROLES_CONFIG) {
    for (let i = 0; i < rt.count; i++) {
      const { firstName, lastName, fullName } = kenyanName();
      const constituency = pick(COUNTIES);
      const conflictLevel = weighted([
        { level: 'low',    weight: 60 },
        { level: 'medium', weight: 30 },
        { level: 'high',   weight: 10 },
      ]).level;

      const financialExposure =
        conflictLevel === 'low'    ? rFloat(0, 2_000_000)          :
        conflictLevel === 'medium' ? rFloat(2_000_001, 10_000_000) :
                                     rFloat(10_000_001, 50_000_000);

      // Transparency inversely correlates with conflict — higher conflict = lower transparency
      const transparencyScore =
        conflictLevel === 'low'    ? rFloat(85, 100) :
        conflictLevel === 'medium' ? rFloat(65,  85) :
                                     rFloat(40,  65);

      const bioCandidates = BIOS_BY_ROLE[rt.role] ?? BIOS_BY_ROLE['Member of Parliament'];

      sponsorRows.push({
        name:               `${rt.honorific} ${fullName}`,
        role:               rt.role,
        party:              pick(PARTIES),
        constituency,
        email:              `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${rt.domain}`,
        phone:              `+254-${rInt(700, 799)}-${rInt(100, 999)}-${rInt(100, 999)}`,
        conflict_level:     conflictLevel,
        financial_exposure: financialExposure.toString(),
        voting_alignment:   rFloat(50, 95).toString(),
        transparency_score: transparencyScore.toString(),
        bio:                `${rt.role} representing ${constituency}. ${pick(bioCandidates)}`,
        is_active:          true,
      });
    }
  }

  await batchInsert(sponsors, sponsorRows, 50, 'sponsors');

  const result     = await db.select({ id: sponsors.id }).from(sponsors);
  const sponsorIds = result.map(r => r.id);
  logger.info(`✓ ${sponsorIds.length} sponsors inserted`, { component: 'Seed' });
  return sponsorIds;
}

// ── Bills ─────────────────────────────────────────────────────────────────────

async function seedBills(sponsorIds: string[]): Promise<string[]> {
  logger.info('📄 Seeding 500 bills…', { component: 'Seed' });

  const billRows: typeof bills.$inferInsert[] = [];
  let serial = 1;

  for (const [category, targetCount] of Object.entries(BILL_CATEGORIES)) {
    const templates = BILL_TEMPLATES[category] ?? BILL_TEMPLATES['Governance & Law'];

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
        description:      `Comprehensive legislation to ${action.toLowerCase()} ${topic.toLowerCase()} in Kenya, addressing critical policy gaps and establishing a sustainable, rights-based governance framework.`,
        content:          buildBillContent(topic, action),
        summary:          `This Act establishes a ${action.toLowerCase()} framework for ${topic.toLowerCase()} within the ${category.toLowerCase()} sector, providing for institutional arrangements, regulatory standards, and enforcement mechanisms aligned with Kenya's devolved governance structure.`,
        status:           weighted(BILL_STATUS_WEIGHTS).status,
        sponsor_id:       pick(sponsorIds),
        category,
        tags:             picks(tmpl.tags, rInt(3, 5)),
        introduced_date:  introducedAt,
        last_action_date: lastActionAt,
        // Governance bills tend to be more complex
        complexity_score: category === 'Governance & Law' ? rInt(6, 10) : rInt(3, 10),
      });

      serial++;
    }
  }

  // Bills have large content fields — use smaller batches
  await batchInsert(bills, billRows, 25, 'bills');

  const result  = await db.select({ id: bills.id }).from(bills);
  const billIds = result.map(r => r.id);
  logger.info(`✓ ${billIds.length} bills inserted`, { component: 'Seed' });
  return billIds;
}

// ── Comments ──────────────────────────────────────────────────────────────────

async function seedComments(billIds: string[], userIds: string[]) {
  logger.info('💬 Seeding 2 000 comments…', { component: 'Seed' });

  const commentRows: typeof comments.$inferInsert[] = [];

  for (const pool of COMMENT_POOLS) {
    for (let i = 0; i < pool.count; i++) {
      commentRows.push({
        bill_id:     pick(billIds),
        user_id:     pick(userIds),
        content:     buildComment(pick(pool.templates)),
        sentiment:   pool.sentiment,
        upvotes:     rInt(...pool.upR),
        downvotes:   rInt(...pool.dnR),
        is_verified: Math.random() < pool.isVerified,
      });
    }
  }

  // Shuffle so rows are not clustered by sentiment in the DB
  commentRows.sort(() => 0.5 - Math.random());

  await batchInsert(comments, commentRows, 100, 'comments');
  logger.info(`✓ ${commentRows.length} comments inserted`, { component: 'Seed' });
}

// ── Engagement ────────────────────────────────────────────────────────────────

async function seedEngagement(billIds: string[], userIds: string[]) {
  logger.info('📈 Seeding engagement data…', { component: 'Seed' });

  const pairs = new Set<string>();
  let   guard = 0;
  while (pairs.size < 600 && guard < 12_000) {
    pairs.add(`${pick(billIds)}::${pick(userIds)}`);
    guard++;
  }

  const rows: typeof bill_engagement.$inferInsert[] = [...pairs].map(key => {
    const [bill_id, user_id] = key.split('::');
    const viewCount    = rInt(1, 20);
    const commentCount = rInt(0, 5);
    const shareCount   = rInt(0, 4);
    return {
      bill_id,
      user_id,
      view_count:       viewCount,
      comment_count:    commentCount,
      share_count:      shareCount,
      // Score formula: views + 3×comments + 2×shares ± noise
      engagement_score: rFloat(
        viewCount + commentCount * 3 + shareCount * 2,
        viewCount + commentCount * 5 + shareCount * 3,
      ).toString(),
    };
  });

  await batchInsert(bill_engagement, rows, 50, 'engagement rows');
  logger.info(`✓ ${rows.length} engagement rows inserted`, { component: 'Seed' });
}

// ── Notifications ─────────────────────────────────────────────────────────────

async function seedNotifications(userIds: string[], billIds: string[]) {
  logger.info('🔔 Seeding notifications…', { component: 'Seed' });

  const NOTIF_TYPES = [
    { type: 'bill_update',         title: 'Bill Status Update',
      msgFn: () => `A bill you follow has advanced to ${weighted(BILL_STATUS_WEIGHTS).status.replace(/_/g, ' ')}.` },
    { type: 'comment_reply',       title: 'New Reply to Your Comment',
      msgFn: () => 'Someone replied to your comment on a legislative bill.' },
    { type: 'bill_published',      title: 'New Bill Published for Comment',
      msgFn: () => `A new ${pick(TOPICS)} bill has been published for public participation.` },
    { type: 'verification_status', title: 'Verification Status Update',
      msgFn: () => 'Your expert account verification has been reviewed.' },
    { type: 'campaign_action',     title: 'Advocacy Campaign Update',
      msgFn: () => `An advocacy campaign you support has reached ${rInt(100, 10_000).toLocaleString()} signatures.` },
    { type: 'constitutional_flag', title: 'Constitutional Concern Flagged',
      msgFn: () => 'A bill you track has been flagged for potential constitutional issues.' },
  ] as const;

  const sample = picks(userIds, 30);
  const rows: typeof notifications.$inferInsert[] = [];

  for (const uid of sample) {
    const count = rInt(3, 5);
    for (let i = 0; i < count; i++) {
      const nt = pick(NOTIF_TYPES);
      rows.push({
        user_id:         uid,
        type:            nt.type,
        title:           nt.title,
        message:         nt.msgFn(),
        related_bill_id: Math.random() < 0.7 ? pick(billIds) : null,
        is_read:         Math.random() < 0.4,
      });
    }
  }

  await batchInsert(notifications, rows, 50, 'notifications');
  logger.info(`✓ ${rows.length} notifications inserted`, { component: 'Seed' });
}

// ── Constitutional Intelligence ───────────────────────────────────────────────

async function seedConstitutionalIntelligence(billIds: string[]) {
  logger.info('⚖️  Seeding Constitutional Intelligence…', { component: 'Seed' });

  // 1. Constitutional Provisions — sampled from Kenya 2010 Constitution
  const provisionRows: typeof constitutional_provisions.$inferInsert[] = [
    { chapter_number: 1,  article_number: 2,   title: 'Supremacy of the Constitution',
      full_text: 'This Constitution is the supreme law of the Republic and binds all persons and all State organs at both levels of government.',
      is_fundamental_right: false, is_directive_principle: true },
    { chapter_number: 2,  article_number: 10,  title: 'National Values and Principles of Governance',
      full_text: 'The national values and principles of governance bind all State organs, State officers, public officers and all persons whenever any of them applies or interprets this Constitution, enacts, applies or interprets any law, or makes or implements public policy decisions.',
      is_fundamental_right: false, is_directive_principle: true },
    { chapter_number: 4,  article_number: 27,  title: 'Equality and Freedom from Discrimination',
      full_text: 'Every person is equal before the law and has the right to equal protection and equal benefit of the law.',
      is_fundamental_right: true, is_directive_principle: false },
    { chapter_number: 4,  article_number: 33,  title: 'Freedom of Expression',
      full_text: 'Every person has the right to freedom of expression, which includes freedom to seek, receive or impart information or ideas.',
      is_fundamental_right: true, is_directive_principle: false },
    { chapter_number: 4,  article_number: 35,  title: 'Access to Information',
      full_text: 'Every citizen has the right of access to information held by the State, and information held by another person and required for the exercise or protection of any right or fundamental freedom.',
      is_fundamental_right: true, is_directive_principle: false },
    { chapter_number: 4,  article_number: 40,  title: 'Protection of Right to Property',
      full_text: 'Subject to Article 65, every person has the right, either individually or in association with others, to acquire and own property of any description in any part of Kenya.',
      is_fundamental_right: true, is_directive_principle: false },
    { chapter_number: 4,  article_number: 42,  title: 'Environment',
      full_text: 'Every person has the right to a clean and healthy environment, which includes the right to have the environment protected for the benefit of present and future generations through legislative and other measures.',
      is_fundamental_right: true, is_directive_principle: false },
    { chapter_number: 4,  article_number: 43,  title: 'Economic and Social Rights',
      full_text: 'Every person has the right to the highest attainable standard of health, which includes the right to health care services, including reproductive health care.',
      is_fundamental_right: true, is_directive_principle: false },
    { chapter_number: 4,  article_number: 47,  title: 'Fair Administrative Action',
      full_text: 'Every person has the right to administrative action that is expeditious, efficient, lawful, reasonable and procedurally fair.',
      is_fundamental_right: true, is_directive_principle: false },
    { chapter_number: 8,  article_number: 118, title: 'Public Access and Participation',
      full_text: 'Parliament shall facilitate public involvement in the legislative and other business of Parliament and its committees; and shall ensure that the public, in particular marginalised groups, are facilitated to participate in the activities of Parliament.',
      is_fundamental_right: false, is_directive_principle: true },
    { chapter_number: 10, article_number: 174, title: 'Objects of Devolution',
      full_text: 'The objects of the devolution of government are to promote democratic and accountable exercise of power; foster national unity by recognising diversity; give powers of self-governance to the people and enhance the participation of the people in the exercise of the powers of the State.',
      is_fundamental_right: false, is_directive_principle: true },
    { chapter_number: 12, article_number: 201, title: 'Principles of Public Finance',
      full_text: 'The following principles shall guide all aspects of public finance in the Republic: there shall be openness and accountability, including public participation in financial matters.',
      is_fundamental_right: false, is_directive_principle: true },
  ];

  const insertedProvisions = await db
    .insert(constitutional_provisions)
    .values(provisionRows)
    .returning({ id: constitutional_provisions.id });
  const provisionIds = insertedProvisions.map(p => p.id);
  logger.info(`  ↳ ${provisionIds.length} constitutional provisions`, { component: 'Seed' });

  // 2. Landmark Legal Precedents
  const precedentRows: typeof legal_precedents.$inferInsert[] = [
    {
      case_name: 'David Ndii & Others v. Attorney General (BBI Case)',
      court_level: 'Supreme Court',
      judgment_date: new Date('2022-03-31'),
      legal_principle: 'Constitutional amendment processes must strictly adhere to the procedural requirements of Articles 255–257. Citizen-initiated amendments via popular initiative require a separate process from parliamentary-initiated amendments.',
      precedent_strength: 'binding',
      cited_by_count: 45,
    },
    {
      case_name: 'Okiya Omtatah v. Communication Authority of Kenya',
      court_level: 'High Court',
      judgment_date: new Date('2018-04-19'),
      legal_principle: 'Public participation must be qualitative, quantitative, and meaningful — it cannot be a mere formality. Failure to adequately consult the public renders a legislative process unconstitutional.',
      precedent_strength: 'persuasive',
      cited_by_count: 112,
    },
    {
      case_name: 'Mumo Matemu v. Trusted Society of Human Rights Alliance',
      court_level: 'Court of Appeal',
      judgment_date: new Date('2013-10-25'),
      legal_principle: 'Judicial review of appointments to constitutional commissions is limited to procedural legality and good faith; courts will not second-guess merit assessments by constitutional selection panels.',
      precedent_strength: 'binding',
      cited_by_count: 67,
    },
    {
      case_name: 'Petition No. 628 of 2014 — Doctors for Life International v. Speaker',
      court_level: 'High Court',
      judgment_date: new Date('2015-06-08'),
      legal_principle: 'Bills dealing with sensitive matters of social policy require heightened public participation beyond bare compliance with the Standing Orders of the respective House.',
      precedent_strength: 'persuasive',
      cited_by_count: 38,
    },
    {
      case_name: 'Speaker of the Senate v. Attorney General [2013]',
      court_level: 'Supreme Court',
      judgment_date: new Date('2013-12-20'),
      legal_principle: 'The Senate\'s special role in safeguarding devolution requires that any bill which concerns county governments must follow the concurrence procedure, even if not formally labelled as a "county bill".',
      precedent_strength: 'binding',
      cited_by_count: 88,
    },
    {
      case_name: 'Coalition for Reform and Democracy v. Republic of Kenya',
      court_level: 'Court of Appeal',
      judgment_date: new Date('2015-07-17'),
      legal_principle: 'Emergency legislation enacted without proper parliamentary scrutiny or public participation remains subject to constitutional challenge even after promulgation.',
      precedent_strength: 'binding',
      cited_by_count: 54,
    },
    {
      case_name: 'Institute for Social Accountability v. National Assembly',
      court_level: 'High Court',
      judgment_date: new Date('2021-09-30'),
      legal_principle: 'The requirement for public participation applies to all stages of the legislative process including committee review, not just the formal floor readings.',
      precedent_strength: 'persuasive',
      cited_by_count: 29,
    },
    {
      case_name: 'Kenya Human Rights Commission v. Attorney General [2022]',
      court_level: 'High Court',
      judgment_date: new Date('2022-07-14'),
      legal_principle: 'Legislation that disproportionately burdens marginalised groups must be accompanied by evidence that less restrictive alternatives were considered during the drafting process.',
      precedent_strength: 'persuasive',
      cited_by_count: 19,
    },
  ];

  await db.insert(legal_precedents).values(precedentRows);
  logger.info(`  ↳ ${precedentRows.length} legal precedents`, { component: 'Seed' });

  // 3. Constitutional Analyses — AI-generated for 50 sampled bills
  const sampledBillIds = picks(billIds, 50);

  const ALIGNMENTS = [
    { value: 'aligned',    weight: 45 },
    { value: 'neutral',    weight: 25 },
    { value: 'concerning', weight: 20 },
    { value: 'violates',   weight: 10 },
  ] as const;

  const analysisRows: typeof constitutional_analyses.$inferInsert[] = sampledBillIds.map(billId => {
    const alignment        = weighted(ALIGNMENTS).value;
    const confidence       = alignment === 'violates'   ? rFloat(0.50, 0.75) :
                             alignment === 'concerning' ? rFloat(0.60, 0.85) :
                                                          rFloat(0.75, 0.99);
    const requiresExpert   = confidence < 0.80 || alignment === 'violates';
    const citedProvisions  = picks(provisionIds, rInt(1, 4));

    return {
      bill_id:                      billId,
      analysis_type:                'automated',
      confidence_score:             confidence.toString(),
      constitutional_alignment:     alignment,
      executive_summary:            `Automated analysis assessed this bill as ${alignment} with constitutional provisions. ${
        alignment === 'violates'   ? 'Potential breach of fundamental rights detected — expert review mandatory.' :
        alignment === 'concerning' ? 'Some provisions warrant closer scrutiny against Articles 27 and 47.' :
        alignment === 'neutral'    ? 'No significant constitutional issues identified at this confidence threshold.' :
                                     'Bill aligns with constitutional values and public participation requirements.'
      }`,
      constitutional_provisions_cited: citedProvisions,
      requires_expert_review:       requiresExpert,
      expert_reviewed:              false,
      // Auto-publish only high-confidence, non-concerning analyses
      is_published:                 !requiresExpert && confidence >= 0.80,
    };
  });

  const insertedAnalyses = await db
    .insert(constitutional_analyses)
    .values(analysisRows)
    .returning({
      id:                   constitutional_analyses.id,
      bill_id:              constitutional_analyses.bill_id,
      requires_expert_review: constitutional_analyses.requires_expert_review,
      constitutional_alignment: constitutional_analyses.constitutional_alignment,
    });
  logger.info(`  ↳ ${insertedAnalyses.length} constitutional analyses`, { component: 'Seed' });

  // 4. Expert Review Queue — only for flagged analyses
  const PRIORITY_WEIGHTS = [
    { priority: 'urgent', weight: 15 },
    { priority: 'high',   weight: 25 },
    { priority: 'medium', weight: 40 },
    { priority: 'low',    weight: 20 },
  ] as const;

  const queueRows: typeof expert_review_queue.$inferInsert[] = insertedAnalyses
    .filter(a => a.requires_expert_review)
    .map(analysis => ({
      analysis_id:   analysis.id,
      bill_id:       analysis.bill_id,
      priority_level: analysis.constitutional_alignment === 'violates'
        ? 'urgent'
        : weighted(PRIORITY_WEIGHTS).priority,
      review_reason: analysis.constitutional_alignment === 'violates'
        ? 'constitutional_violation'
        : pick(['low_confidence', 'complex_issue', 'sensitive_policy_area'] as const),
      status:        'pending',
      assigned_to:   null,
    }));

  if (queueRows.length > 0) {
    await db.insert(expert_review_queue).values(queueRows);
  }

  logger.info(
    `  ↳ ${queueRows.length} items queued for expert review` +
    ` (${queueRows.filter(q => q.priority_level === 'urgent').length} urgent)`,
    { component: 'Seed' },
  );
  logger.info('✓ Constitutional Intelligence seeded', { component: 'Seed' });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS REPORT
// ─────────────────────────────────────────────────────────────────────────────

async function printStats() {
  const [
    userCount, profileCount, sponsorCount, billCount,
    commentCount, engagementCount, notifCount,
    provisionCount, analysisCount, precedentCount, queueCount,
  ] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select({ id: user_profiles.user_id }).from(user_profiles),
    db.select({ id: sponsors.id }).from(sponsors),
    db.select({ id: bills.id }).from(bills),
    db.select({ id: comments.bill_id }).from(comments),
    db.select({ id: bill_engagement.bill_id }).from(bill_engagement),
    db.select({ id: notifications.user_id }).from(notifications),
    db.select({ id: constitutional_provisions.id }).from(constitutional_provisions),
    db.select({ id: constitutional_analyses.id }).from(constitutional_analyses),
    db.select({ id: legal_precedents.id }).from(legal_precedents),
    db.select({ id: expert_review_queue.id }).from(expert_review_queue),
  ]);

  console.log('\n' + '─'.repeat(56));
  console.log('  Chanuka Primary Seed — Final Statistics');
  console.log('─'.repeat(56));
  console.log('  Foundation');
  console.log(`    Users                   : ${userCount.length}`);
  console.log(`    User profiles           : ${profileCount.length}`);
  console.log(`    Sponsors                : ${sponsorCount.length}`);
  console.log(`    Bills                   : ${billCount.length}`);
  console.log('  Citizen Participation');
  console.log(`    Comments                : ${commentCount.length}`);
  console.log(`    Engagement rows         : ${engagementCount.length}`);
  console.log(`    Notifications           : ${notifCount.length}`);
  console.log('  Constitutional Intelligence');
  console.log(`    Provisions              : ${provisionCount.length}`);
  console.log(`    Analyses                : ${analysisCount.length}`);
  console.log(`    Legal precedents        : ${precedentCount.length}`);
  console.log(`    Expert review queue     : ${queueCount.length}`);
  console.log('─'.repeat(56) + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export default async function primarySeed() {
  logger.info('🌱 Chanuka primary seed starting…', { component: 'Seed' });

  try {
    await clearData();

    const userIds    = await seedUsersAndProfiles();
    const sponsorIds = await seedSponsors();
    const billIds    = await seedBills(sponsorIds);

    await seedComments(billIds, userIds);
    await seedEngagement(billIds, userIds);
    await seedNotifications(userIds, billIds);
    await seedConstitutionalIntelligence(billIds);

    await printStats();
    logger.info('✅ Primary seed completed successfully.', { component: 'Seed' });

  } catch (error) {
    logger.error('💥 Primary seed failed', { component: 'Seed', error });
    process.exit(1);
  }
}

if (require.main === module) {
  primarySeed().then(() => process.exit(0));
}
