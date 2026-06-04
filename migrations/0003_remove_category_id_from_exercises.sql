-- D1 does not support ALTER TABLE DROP COLUMN.
-- The category_id column on exercises remains in the schema but is unused.
-- Application code (types, routes, seed data) has been updated to ignore it.
-- Exercises are categorized solely through exercise_category_mappings.
SELECT 1;
