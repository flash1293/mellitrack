-- Recreate food_entries to support free-form entries (custom_name + custom calories)
CREATE TABLE IF NOT EXISTS food_entries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  food_id INTEGER,
  custom_name TEXT,
  custom_calories_per_100g REAL,
  amount_grams REAL NOT NULL,
  consumed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

INSERT INTO food_entries_new (id, user_id, food_id, amount_grams, consumed_at)
  SELECT id, user_id, food_id, amount_grams, consumed_at FROM food_entries;

DROP TABLE food_entries;

ALTER TABLE food_entries_new RENAME TO food_entries;
