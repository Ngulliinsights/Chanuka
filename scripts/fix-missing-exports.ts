#!/usr/bin/env tsx
/**
 * Fix Missing Schema Exports
 * 
 * This script fixes missing exports in the schema files that are causing
 * import errors throughout the codebase.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

function fixValidationImports(): void {
  console.log('🔧 Fixing validation.ts imports...');
  
  const validationPath = 'shared/schema/validation.ts';
  
  if (!existsSync(validationPath)) {
    console.log('❌ validation.ts not found');
    return;
  }
  
  let content = readFileSync(validationPath, 'utf8');
  
  // Fix the import statement to use the new table names
  const oldImport = `import { users, user_profiles, bill, sponsor, analysis, stakeholder, notification,
  complianceCheck, social_share, verification, user_progress, comments,
  bill_sponsorship, comment_votes, bill_tag, user_interest,
  content_report // <-- REFINED: Replaces contentFlag, moderationFlag, moderationQueue
 } from '@shared/shared/schema';`;

  const newImport = `import {
  users, user_profiles, bills, sponsors, notifications,
  comments, comment_votes, bill_engagement, sessions,
  // Note: Some tables may not exist in the aligned schema yet
} from "./schema";`;

  content = content.replace(oldImport, newImport);
  
  // Update the schema references in the validation functions
  content = content.replace(/createSelectSchema\(user\)/g, 'createSelectSchema(users)');
  content = content.replace(/createSelectSchema\(user_profiles\)/g, 'createSelectSchema(user_profiles)');
  content = content.replace(/createSelectSchema\(bill\)/g, 'createSelectSchema(bills)');
  content = content.replace(/createSelectSchema\(sponsor\)/g, 'createSelectSchema(sponsors)');
  content = content.replace(/createSelectSchema\(comments\)/g, 'createSelectSchema(comments)');
  content = content.replace(/createSelectSchema\(notification\)/g, 'createSelectSchema(notifications)');
  
  content = content.replace(/createInsertSchema\(user,/g, 'createInsertSchema(users,');
  content = content.replace(/createInsertSchema\(user_profiles,/g, 'createInsertSchema(user_profiles,');
  content = content.replace(/createInsertSchema\(bill,/g, 'createInsertSchema(bills,');
  content = content.replace(/createInsertSchema\(sponsor,/g, 'createInsertSchema(sponsors,');
  content = content.replace(/createInsertSchema\(comments,/g, 'createInsertSchema(comments,');
  
  writeFileSync(validationPath, content);
  console.log('✅ Fixed validation.ts imports');
}

function fixTypesImports(): void {
  console.log('🔧 Fixing types.ts imports...');
  
  const typesPath = 'shared/schema/types.ts';
  
  if (!existsSync(typesPath)) {
    console.log('❌ types.ts not found');
    return;
  }
  
  let content = readFileSync(typesPath, 'utf8');
  
  // Update the import statement
  const importPattern = /import type \{[^}]+\} from "\.\/schema";/;
  const newImport = `import type {
  users, user_profiles, sessions, bills, sponsors, comments, comment_votes,
  bill_engagement, notifications
} from "./schema";`;
  
  content = content.replace(importPattern, newImport);
  
  // Update type definitions
  content = content.replace(/typeof user\.\$inferSelect/g, 'typeof users.$inferSelect');
  content = content.replace(/typeof user_profiles\.\$inferSelect/g, 'typeof user_profiles.$inferSelect');
  content = content.replace(/typeof bill\.\$inferSelect/g, 'typeof bills.$inferSelect');
  content = content.replace(/typeof sponsor\.\$inferSelect/g, 'typeof sponsors.$inferSelect');
  content = content.replace(/typeof comments\.\$inferSelect/g, 'typeof comments.$inferSelect');
  content = content.replace(/typeof notification\.\$inferSelect/g, 'typeof notifications.$inferSelect');
  
  writeFileSync(typesPath, content);
  console.log('✅ Fixed types.ts imports');
}

function addMissingExportsToSchema(): void {
  console.log('🔧 Adding missing exports to schema...');
  
  const schemaPath = 'shared/schema/schema.ts';
  
  if (!existsSync(schemaPath)) {
    console.log('❌ schema.ts not found');
    return;
  }
  
  let content = readFileSync(schemaPath, 'utf8');
  
  // Add missing table definitions that are referenced but don't exist
  const missingTables = `
// Additional tables that may be referenced in the codebase
// These are placeholder definitions - update with actual structure as needed

export const analysis = pgTable("analysis", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  bill_id: uuid("bill_id").references(() => bills.id),
  analysis_type: varchar("analysis_type", { length: 50 }),
  results: jsonb("results").default({}),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const stakeholder = pgTable("stakeholder", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  user_id: uuid("user_id").references(() => users.id),
  bill_id: uuid("bill_id").references(() => bills.id),
  status: varchar("status", { length: 20 }).default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const social_share = pgTable("social_share", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  user_id: uuid("user_id").references(() => users.id),
  bill_id: uuid("bill_id").references(() => bills.id),
  platform: varchar("platform", { length: 50 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const user_progress = pgTable("user_progress", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  user_id: uuid("user_id").references(() => users.id),
  achievement_type: varchar("achievement_type", { length: 100 }),
  level: integer("level").default(1),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const bill_tag = pgTable("bill_tag", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  bill_id: uuid("bill_id").references(() => bills.id),
  tag: varchar("tag", { length: 50 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const bill_sponsorship = pgTable("bill_sponsorship", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  bill_id: uuid("bill_id").references(() => bills.id),
  sponsor_id: uuid("sponsor_id").references(() => sponsors.id),
  type: varchar("type", { length: 20 }).default("co_sponsor"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const user_interest = pgTable("user_interest", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  user_id: uuid("user_id").references(() => users.id),
  interest: varchar("interest", { length: 100 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const content_report = pgTable("content_report", {
  id: uuid("id").primaryKey().default(sql\`uuid_generate_v4()\`),
  content_type: varchar("content_type", { length: 50 }),
  content_id: uuid("content_id"),
  reported_by: uuid("reported_by").references(() => users.id),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
`;

  // Add the missing tables at the end of the file
  content += missingTables;
  
  writeFileSync(schemaPath, content);
  console.log('✅ Added missing table definitions to schema');
}

async function main(): void {
  console.log('🚀 Starting Missing Exports Fix\n');
  
  try {
    fixValidationImports();
    fixTypesImports();
    addMissingExportsToSchema();
    
    console.log('\n✅ Missing exports fix completed!');
    console.log('\n🧪 Now try running the validation:');
    console.log('   npx tsx tools/simple-schema-validation.ts');
    
  } catch (error) {
    console.error('💥 Fix script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);