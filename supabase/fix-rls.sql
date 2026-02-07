-- =============================================
-- FIX RLS POLICIES - Allow anon to read/insert
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated read" ON branches;
DROP POLICY IF EXISTS "Allow authenticated read" ON employees;
DROP POLICY IF EXISTS "Allow authenticated read" ON categories;
DROP POLICY IF EXISTS "Allow authenticated read" ON products;
DROP POLICY IF EXISTS "Allow authenticated read" ON product_variants;
DROP POLICY IF EXISTS "Allow authenticated read" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated read" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated read" ON transaction_items;
DROP POLICY IF EXISTS "Allow authenticated read" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated read" ON attendance_records;
DROP POLICY IF EXISTS "Allow authenticated read" ON payroll_records;

DROP POLICY IF EXISTS "Allow authenticated insert" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON transaction_items;
DROP POLICY IF EXISTS "Allow authenticated insert" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated insert" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated insert" ON attendance_records;

-- Create new policies that allow anon (public) access
-- For development - in production, use proper Supabase Auth

-- READ policies (SELECT)
CREATE POLICY "Allow public read" ON branches FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON shifts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON transaction_items FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON payroll_records FOR SELECT USING (true);

-- INSERT policies
CREATE POLICY "Allow public insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON transaction_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON payroll_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON product_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON branches FOR INSERT WITH CHECK (true);

-- UPDATE policies
CREATE POLICY "Allow public update" ON branches FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON employees FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON shifts FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON attendance_records FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON payroll_records FOR UPDATE USING (true);

-- DELETE policies
CREATE POLICY "Allow public delete" ON branches FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON employees FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON products FOR DELETE USING (true);
CREATE POLICY "Allow public delete" ON product_variants FOR DELETE USING (true);

-- Done!
SELECT 'RLS policies updated successfully!' as status;
