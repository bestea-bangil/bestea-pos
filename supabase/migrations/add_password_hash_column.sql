-- Add password_hash column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
