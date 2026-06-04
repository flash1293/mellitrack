-- Remove hybrid categorization: drop category_id from exercises
-- Exercises are now categorized solely through exercise_category_mappings (many-to-many)
ALTER TABLE exercises DROP COLUMN category_id;
