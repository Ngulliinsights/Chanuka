// Exposes the search_vector migration SQL so it's discoverable from the schema package.
// The canonical migration still lives in drizzle/0010_add_search_vectors_and_indexes.sql.
export const searchVectorMigrationSql = `
-- Add search vector column to bills table for full-text search
ALTER TABLE bills ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_bills_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS bills_search_vector_update ON bills;
CREATE TRIGGER bills_search_vector_update
  BEFORE INSERT OR UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_bills_search_vector();

-- Update existing records with search vectors
UPDATE bills SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'D')
WHERE search_vector IS NULL;

-- Create GIN index for full-text search performance
CREATE INDEX IF NOT EXISTS idx_bills_search_vector ON bills USING GIN(search_vector);

-- ROLLBACK (included at the end of the migration file):
-- DROP TRIGGER IF EXISTS bills_search_vector_update ON bills;
-- DROP FUNCTION IF EXISTS update_bills_search_vector();
-- ALTER TABLE bills DROP COLUMN IF EXISTS search_vector;
`;

/**
 * Helper to apply the migration using a generic database client.
 * The client should provide a `query(sql: string): Promise<any>` function
 * (for example node-postgres `client.query`).
 */
export async function applySearchVectorMigration(db: { query: (sql: string) => Promise<any> }) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('A db client with a query(sql) function is required');
  }
  return db.query(searchVectorMigrationSql);
}
