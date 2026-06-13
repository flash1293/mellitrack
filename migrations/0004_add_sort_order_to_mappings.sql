-- Add per-category sort_order to exercise_category_mappings
-- This replaces the global exercises.sort_order with per-category ordering,
-- so reordering an exercise in one category doesn't affect its position in others.
ALTER TABLE exercise_category_mappings ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
