-- Add protein per 100g to foods and food_entries (free-form entries)
ALTER TABLE foods ADD COLUMN protein_per_100g REAL;
ALTER TABLE food_entries ADD COLUMN custom_protein_per_100g REAL;
