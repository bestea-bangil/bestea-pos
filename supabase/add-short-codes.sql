-- =============================================
-- UPDATE BRANCH IDs - Use shorter, readable codes
-- Run this in Supabase SQL Editor AFTER seed.sql
-- =============================================

-- Option 1: Add a short_code column for display purposes
-- This keeps UUIDs internally but adds human-readable codes

ALTER TABLE branches ADD COLUMN IF NOT EXISTS short_code VARCHAR(10);

UPDATE branches SET short_code = 'HQ' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE branches SET short_code = 'BGL' WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE branches SET short_code = 'PSR' WHERE id = '00000000-0000-0000-0000-000000000003';

-- Update employees to add employee_code
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(10);

UPDATE employees SET employee_code = 'ADM001' WHERE id = '00000000-0000-0000-0001-000000000001';
UPDATE employees SET employee_code = 'KSR001' WHERE id = '00000000-0000-0000-0001-000000000002';
UPDATE employees SET employee_code = 'KSR002' WHERE id = '00000000-0000-0000-0001-000000000003';
UPDATE employees SET employee_code = 'KSR003' WHERE id = '00000000-0000-0000-0001-000000000004';
UPDATE employees SET employee_code = 'KSR004' WHERE id = '00000000-0000-0000-0001-000000000005';

SELECT 'Short codes added!' as status;
