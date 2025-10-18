
-- Test migration
CREATE TABLE test_table (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- ROLLBACK:
DROP TABLE IF EXISTS test_table;
-- END ROLLBACK
      