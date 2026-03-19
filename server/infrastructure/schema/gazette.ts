import { pgTable, text, varchar, date, index, unique } from "drizzle-orm/pg-core";
import { primaryKeyUuid, auditFields } from "./base-types";

// ============================================================================
// KENYA GAZETTE - Official Government Notices
// ============================================================================

export const gazette_notices = pgTable("gazette_notices", {
  id: primaryKeyUuid(),
  
  // Notice Identification
  notice_number: varchar("notice_number", { length: 100 }).notNull(),
  publication_date: date("publication_date").notNull(),
  
  // Categorization
  category: varchar("category", { length: 50 }).notNull(), 
  // Types: 'bill', 'appointment', 'land', 'general'
  
  // Content
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  
  // Source References
  source_url: varchar("source_url", { length: 500 }).notNull(),
  pdf_url: varchar("pdf_url", { length: 500 }),
  
  ...auditFields(),
}, (table) => ({
  // Unique constraint ensures we don't duplicate notices
  noticeNumberUnique: unique("gazette_notices_number_unique").on(table.notice_number),
  
  // Index for listing notices by category ordered by date
  categoryDateIdx: index("idx_gazette_notices_category_date")
    .on(table.category, table.publication_date.desc()),
    
  // Index for date range queries
  dateIdx: index("idx_gazette_notices_date")
    .on(table.publication_date.desc()),
}));

export type GazetteNoticeRecord = typeof gazette_notices.$inferSelect;
export type NewGazetteNoticeRecord = typeof gazette_notices.$inferInsert;
