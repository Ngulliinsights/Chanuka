# Strategic Tables — Recommendations and Drizzle snippets

Date: 2025-10-18

This document recommends a minimal set of strategic tables (and supporting enums) to add to the main blueprint schema. The code snippets follow the project's Drizzle/Postgres conventions (pgEnum, pgTable, timestamp(..., { withTimezone: true }), jsonb, check, index helpers).

Purpose

- Add only high-value tables missing from the main schema that materially improve core functionality (auth/sessioning, engagement, verification, automated analysis).
- Provide Drizzle-style snippets that match the main schema conventions.
- Give a migration order, verification checklist and rollback guidance.

Top-level recommendations (must-have)

1. user_progress — user achievements, levels, badges (improves retention/gamification).
2. content_analysis — automated analysis records (toxicity, sentiment, model metadata) to support moderation and AI-driven features.
3. verification — structured verification records for claims/analyses and endorsements.
4. stakeholder — a registry to support richer sponsor/stakeholder modeling and analysis.
5. social_share — records of social sharing events (analytics).

High-value (add after must-have)

- analysis — per-bill analytical artifacts (AI/ML results) if not already present in main schema.
- user_interest — if interests are currently embedded in JSON fields and you want relational queries.

Notes: If any of these tables already exist in the main schema, skip duplicates and reuse existing definitions.

---

Drizzle snippets (drop into `shared/schema.ts` or create migration files)

1. `user_progress`

```ts
export const user_progress = pgTable("user_progress", {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    achievementType: text("achievement_type").notNull(),
    achievementValue: integer("achievement_value").notNull().default(0),
    level: integer("level").notNull().default(1),
    badge: text("badge"),
    description: text("description"),
    recommendation: text("recommendation"),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index("user_progress_user_id_idx").on(table.userId),
    userAchievementUnique: uniqueIndex("user_progress_user_achievement_idx").on(table.userId, table.achievementType),
    levelCheck: check("user_progress_level_check", sql`${table.level} >= 1`),
    valueCheck: check("user_progress_value_check", sql`${table.achievementValue} >= 0`),
}));
```

2. `content_analysis`

```ts
export const content_analysis = pgTable("content_analysis", {
    id: serial("id").primaryKey(),
    contentType: moderationContentTypeEnum("content_type").notNull(),
    contentId: integer("content_id").notNull(),
    toxicityScore: numeric("toxicity_score", { precision: 5, scale: 4 }).notNull().default("0"),
    spamScore: numeric("spam_score", { precision: 5, scale: 4 }).notNull().default("0"),
    sentimentScore: numeric("sentiment_score", { precision: 5, scale: 4 }).notNull().default("0.5"),
    readabilityScore: numeric("readability_score", { precision: 5, scale: 4 }).notNull().default("0.5"),
    flags: text("flags").array().default([]),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0.8"),
    modelVersion: text("model_version").notNull().default("1.0"),
    metadata: jsonb("metadata").default({}),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    contentUnique: uniqueIndex("content_analysis_content_idx").on(table.contentType, table.contentId),
    toxicityIdx: index("content_analysis_toxicity_idx").on(table.toxicityScore),
    spamIdx: index("content_analysis_spam_idx").on(table.spamScore),
    sentimentIdx: index("content_analysis_sentiment_idx").on(table.sentimentScore),
    analyzedAtIdx: index("content_analysis_analyzed_at_idx").on(table.analyzedAt),
}));
```

3. `verification`

```ts
export const verification = pgTable("verification", {
    id: varchar("id", { length: 255 }).primaryKey(),
    billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    userRole: userRoleEnum("user_role").notNull(),
    verificationType: verificationTypeEnum("verification_type").notNull(),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull().default("0"),
    evidence: jsonb("evidence").default([]),
    expertise: jsonb("expertise").default({}),
    reasoning: text("reasoning"),
    feedback: text("feedback"),
    endorsements: integer("endorsements").notNull().default(0),
    disputes: integer("disputes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    billIdIdx: index("verification_bill_id_idx").on(table.billId),
    userIdIdx: index("verification_user_id_idx").on(table.userId),
    statusIdx: index("verification_status_idx").on(table.verificationStatus),
    billUserTypeUnique: uniqueIndex("verification_bill_user_type_idx").on(table.billId, table.userId, table.verificationType),
}));
```

4. `stakeholder`

```ts
export const stakeholder = pgTable("stakeholder", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    organization: text("organization"),
    sector: text("sector"),
    type: stakeholderTypeEnum("type").notNull(),
    influence: numeric("influence", { precision: 5, scale: 2 }).notNull().default("0.00"),
    votingHistory: jsonb("voting_history").default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    nameIdx: index("stakeholder_name_idx").on(table.name),
    sectorIdx: index("stakeholder_sector_idx").on(table.sector),
    typeIdx: index("stakeholder_type_idx").on(table.type),
}));
```

5. `social_share`

```ts
export const social_share = pgTable("social_share", {
    id: serial("id").primaryKey(),
    billId: integer("bill_id").notNull().references(() => bill.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    metadata: jsonb("metadata").default({}),
    sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
    likes: integer("likes").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    billIdIdx: index("social_share_bill_id_idx").on(table.billId),
    userIdIdx: index("social_share_user_id_idx").on(table.userId),
    platformIdx: index("social_share_platform_idx").on(table.platform),
}));
```

Migration ordering (concise)

- Step 1: Create enums used by new tables (e.g., `stakeholder_type`, `moderation_content_type`, `verification_status`) using `pgEnum` in a migration.
- Step 2: Create must-have tables (`user_progress`, `content_analysis`, `verification`).
- Step 3: Create nice-to-have tables (`stakeholder`, `social_share`, `analysis` etc.).
- Step 4: Backfill data in batches (bulk load) and create heavy indexes after load.
- Step 5: Add FK constraints and unique constraints once data integrity is verified.

Migration tips

- Create enums first; add values rather than removing them.
- For large table backfills: bulk insert then create indexes for performance.
- Keep migrations reversible where possible and always take a full DB backup before running.

Verification checklist

- Row counts (source vs target) and sample data integrity checks.
- FK integrity and presence of required indexes.
- Application smoke tests: login, profile read/write, bill list & detail, comment post, analytics read.

Rollback plan (short)

- Keep old tables intact (rename to `_old`) until verification passes.
- If rollback required: rename new table to `_failed` and rename `_old` back to the original name; restore any constraints as needed.

Naming and conventions

- Use snake_case identifiers and follow the existing pluralization conventions.
- Use `timestamp(..., { withTimezone: true })` for time columns.
- Use `jsonb` for nested/variable data with defaults `{}` or `[]` depending on shape.
- Prefer expanding enums (ALTER TYPE ADD VALUE) instead of removing values to maintain backward compatibility.

Next steps I can take for you

- Generate Drizzle migration files (TS + SQL) for the must-have tables and enums.
- Generate a batched data-migration template (SQL + instructions) for migrating large tables safely.
- Open a PR that adds the must-have tables to `shared/schema.ts` with reversible migrations.

If you want one of the above, tell me which and I will create the migration templates and a verification script next.


