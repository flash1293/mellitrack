-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- Exercise categories
CREATE TABLE IF NOT EXISTS exercise_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  user_id INTEGER
);

-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER,
  user_id INTEGER,
  deleted_at TEXT,
  FOREIGN KEY (category_id) REFERENCES exercise_categories(id)
);

-- Trainings
CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  user_id INTEGER,
  category_id INTEGER
);

-- Training exercises (link between training and exercise)
CREATE TABLE IF NOT EXISTS training_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- Sets (individual sets with weight and reps)
CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_exercise_id INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  weight REAL,
  reps INTEGER,
  FOREIGN KEY (training_exercise_id) REFERENCES training_exercises(id) ON DELETE CASCADE
);

-- Many-to-many relationship between exercises and categories
CREATE TABLE IF NOT EXISTS exercise_category_mappings (
  exercise_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (exercise_id, category_id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES exercise_categories(id) ON DELETE CASCADE
);

-- Seed default user (password: CHANGEME)
INSERT OR IGNORE INTO users (id, username, password_hash) VALUES
  (1, 'default', '9361d32cd2deb7c0168d7426fc75787f96827d8864cd8ced7f2b7f6aa46916b8');

-- Seed default categories
INSERT OR IGNORE INTO exercise_categories (name, user_id) VALUES
  ('Oberkörper', 1),
  ('Unterkörper', 1),
  ('Ganzkörper', 1);
