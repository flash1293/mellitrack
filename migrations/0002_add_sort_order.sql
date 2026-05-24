-- Set initial sort_order for existing data
UPDATE exercise_categories SET sort_order = id WHERE sort_order = 0;
UPDATE exercises SET sort_order = id WHERE sort_order = 0;
