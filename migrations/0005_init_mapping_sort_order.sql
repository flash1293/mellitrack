-- Initialize sort_order for existing mappings based on current global exercise sort_order
-- This preserves existing order as a starting point for per-category ordering
UPDATE exercise_category_mappings
SET sort_order = (SELECT COALESCE(e.sort_order, 0) FROM exercises e WHERE e.id = exercise_id)
WHERE sort_order = 0;
