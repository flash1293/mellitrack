-- Add per-category sort_order to exercise_category_mappings
-- This replaces the global exercises.sort_order with per-category ordering,
-- so reordering an exercise in one category doesn't affect its position in others.

ALTER TABLE exercise_category_mappings ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize sort_order for existing mappings based on current global exercise sort_order
-- (preserves existing order as a starting point)
UPDATE exercise_category_mappings 
SET sort_order = (SELECT COALESCE(e.sort_order, 0) FROM exercises e WHERE e.id = exercise_id)
WHERE exercise_id IN (SELECT id FROM exercises);
