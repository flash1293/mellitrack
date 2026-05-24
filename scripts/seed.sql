-- Clean slate
DELETE FROM sets;
DELETE FROM training_exercises;
DELETE FROM trainings;
DELETE FROM exercise_category_mappings;
DELETE FROM exercises;
DELETE FROM exercise_categories;
DELETE FROM users;

-- Create default user (password: mellitrack123)
INSERT INTO users (id, username, password_hash) VALUES
  (1, 'default', '9361d32cd2deb7c0168d7426fc75787f96827d8864cd8ced7f2b7f6aa46916b8');

-- Seed categories
INSERT INTO exercise_categories (id, name, user_id) VALUES
  (1, 'Oberkörper', 1),
  (2, 'Unterkörper', 1),
  (3, 'Ganzkörper', 1);

-- Seed 4 exercises per category
INSERT INTO exercises (id, name, category_id, user_id) VALUES
  (1, 'Bankdrücken', 1, 1),
  (2, 'Klimmzüge', 1, 1),
  (3, 'Schulterdrücken', 1, 1),
  (4, 'Dips', 1, 1),
  (5, 'Kniebeugen', 2, 1),
  (6, 'Kreuzheben', 2, 1),
  (7, 'Ausfallschritte', 2, 1),
  (8, 'Wadenheben', 2, 1),
  (9, 'Burpees', 3, 1),
  (10, 'Kettlebell Swings', 3, 1),
  (11, 'Thrusters', 3, 1),
  (12, 'Turkish Get-Up', 3, 1);

-- Map exercises to categories (many-to-many)
INSERT INTO exercise_category_mappings (exercise_id, category_id) VALUES
  (1, 1), (2, 1), (3, 1), (4, 1),
  (5, 2), (6, 2), (7, 2), (8, 2),
  (9, 3), (10, 3), (11, 3), (12, 3);

-- Training 1: 2024-01-15, Oberkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (1, '2024-01-15', 1, 1);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 1, 4);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (1, 1, 60, 10), (1, 2, 65, 8), (1, 3, 70, 6),
  (2, 1, 0, 12), (2, 2, 0, 10), (2, 3, 0, 8),
  (3, 1, 40, 10), (3, 2, 42.5, 8), (3, 3, 45, 6),
  (4, 1, 0, 15), (4, 2, 5, 12), (4, 3, 10, 10);

-- Training 2: 2024-01-16, Unterkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (2, '2024-01-16', 1, 2);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (5, 2, 5), (6, 2, 6), (7, 2, 7), (8, 2, 8);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (5, 1, 80, 10), (5, 2, 85, 8), (5, 3, 90, 6),
  (6, 1, 100, 8), (6, 2, 110, 6), (6, 3, 120, 4),
  (7, 1, 20, 12), (7, 2, 22.5, 10), (7, 3, 25, 8),
  (8, 1, 60, 15), (8, 2, 70, 12), (8, 3, 80, 10);

-- Training 3: 2024-01-17, Ganzkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (3, '2024-01-17', 1, 3);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (9, 3, 9), (10, 3, 10), (11, 3, 11), (12, 3, 12);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (9, 1, 0, 15), (9, 2, 0, 12), (9, 3, 0, 10),
  (10, 1, 16, 20), (10, 2, 20, 15), (10, 3, 24, 12),
  (11, 1, 30, 10), (11, 2, 35, 8), (11, 3, 40, 6),
  (12, 1, 12, 5), (12, 2, 14, 4), (12, 3, 16, 3);

-- Training 4: 2024-01-22, Oberkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (4, '2024-01-22', 1, 1);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (13, 4, 1), (14, 4, 2), (15, 4, 3), (16, 4, 4);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (13, 1, 62.5, 10), (13, 2, 67.5, 8), (13, 3, 72.5, 6),
  (14, 1, 0, 14), (14, 2, 0, 12), (14, 3, 0, 10),
  (15, 1, 42.5, 10), (15, 2, 45, 8), (15, 3, 47.5, 6),
  (16, 1, 5, 15), (16, 2, 10, 12), (16, 3, 15, 10);

-- Training 5: 2024-01-23, Unterkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (5, '2024-01-23', 1, 2);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (17, 5, 5), (18, 5, 6), (19, 5, 7), (20, 5, 8);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (17, 1, 82.5, 10), (17, 2, 87.5, 8), (17, 3, 92.5, 6),
  (18, 1, 105, 8), (18, 2, 115, 6), (18, 3, 125, 4),
  (19, 1, 22.5, 12), (19, 2, 25, 10), (19, 3, 27.5, 8),
  (20, 1, 65, 15), (20, 2, 75, 12), (20, 3, 85, 10);

-- Training 6: 2024-01-24, Ganzkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (6, '2024-01-24', 1, 3);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (21, 6, 9), (22, 6, 10), (23, 6, 11), (24, 6, 12);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (21, 1, 0, 18), (21, 2, 0, 15), (21, 3, 0, 12),
  (22, 1, 20, 20), (22, 2, 24, 15), (22, 3, 28, 12),
  (23, 1, 35, 10), (23, 2, 40, 8), (23, 3, 45, 6),
  (24, 1, 14, 5), (24, 2, 16, 4), (24, 3, 18, 3);

-- Training 7: 2024-01-29, Oberkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (7, '2024-01-29', 1, 1);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (25, 7, 1), (26, 7, 2), (27, 7, 3), (28, 7, 4);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (25, 1, 65, 10), (25, 2, 70, 8), (25, 3, 75, 6),
  (26, 1, 0, 16), (26, 2, 0, 14), (26, 3, 0, 12),
  (27, 1, 45, 10), (27, 2, 47.5, 8), (27, 3, 50, 6),
  (28, 1, 10, 15), (28, 2, 15, 12), (28, 3, 20, 10);

-- Training 8: 2024-01-30, Unterkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (8, '2024-01-30', 1, 2);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (29, 8, 5), (30, 8, 6), (31, 8, 7), (32, 8, 8);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (29, 1, 85, 10), (29, 2, 90, 8), (29, 3, 95, 6),
  (30, 1, 110, 8), (30, 2, 120, 6), (30, 3, 130, 4),
  (31, 1, 25, 12), (31, 2, 27.5, 10), (31, 3, 30, 8),
  (32, 1, 70, 15), (32, 2, 80, 12), (32, 3, 90, 10);

-- Training 9: 2024-01-31, Ganzkörper
INSERT INTO trainings (id, date, user_id, category_id) VALUES (9, '2024-01-31', 1, 3);
INSERT INTO training_exercises (id, training_id, exercise_id) VALUES
  (33, 9, 9), (34, 9, 10), (35, 9, 11), (36, 9, 12);
INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES
  (33, 1, 0, 20), (33, 2, 0, 18), (33, 3, 0, 15),
  (34, 1, 24, 20), (34, 2, 28, 15), (34, 3, 32, 12),
  (35, 1, 40, 10), (35, 2, 45, 8), (35, 3, 50, 6),
  (36, 1, 16, 5), (36, 2, 18, 4), (36, 3, 20, 3);
