-- Merge "Plank" exercise into "Plank/Deadbugs"
-- Consolidates training history so both categories share the same exercise data
-- Only executes if both exercises exist

-- Step 1: Reassign training_exercises from "Plank" to "Plank/Deadbugs"
UPDATE training_exercises
SET exercise_id = (
    SELECT id FROM exercises
    WHERE name = 'Plank/Deadbugs' AND deleted_at IS NULL
    LIMIT 1
)
WHERE exercise_id = (
    SELECT id FROM exercises
    WHERE name = 'Plank' AND deleted_at IS NULL
    LIMIT 1
)
AND EXISTS (
    SELECT 1 FROM exercises
    WHERE name = 'Plank/Deadbugs' AND deleted_at IS NULL
);

-- Step 2: Remove category mapping for the old "Plank" exercise
DELETE FROM exercise_category_mappings
WHERE exercise_id = (
    SELECT id FROM exercises
    WHERE name = 'Plank' AND deleted_at IS NULL
    LIMIT 1
);

-- Step 3: Delete the old "Plank" exercise
DELETE FROM exercises
WHERE name = 'Plank' AND deleted_at IS NULL;
