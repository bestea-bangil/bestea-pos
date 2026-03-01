-- =============================================
-- Migration: Add branch_id to products
-- =============================================

-- 1. Add branch_id column to products table
ALTER TABLE products 
ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;

-- 2. Update existing products to belong to a default branch (optional but recommended)
-- This assigns all existing products to the first branch found in the DB.
-- If you want them to be null initially, you can skip this step.
UPDATE products 
SET branch_id = (SELECT id FROM branches LIMIT 1)
WHERE branch_id IS NULL;

-- 3. (Optional) Make branch_id required if every product MUST belong to a branch
-- ALTER TABLE products ALTER COLUMN branch_id SET NOT NULL;

-- 4. Create an index for faster queries on products by branch
CREATE INDEX IF NOT EXISTS idx_products_branch ON products(branch_id);

-- 5. Update Row Level Security (RLS) policies for products based on branch_id
-- Allow branch admins and cashiers to read ONLY products from their branch
-- or products that are global (branch_id IS NULL)
DROP POLICY IF EXISTS "Allow authenticated read" ON products;

CREATE POLICY "Allow authenticated read" ON products 
FOR SELECT TO authenticated 
USING (
  branch_id IS NULL 
  OR 
  branch_id IN (
    SELECT branch_id FROM employees WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Allow super_admin to insert any product, or branch_admin to insert product for their branch
CREATE POLICY "Allow branch and super admin insert" ON products 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'super_admin'
  )
  OR
  (
    branch_id IN (SELECT branch_id FROM employees WHERE id = auth.uid() AND role = 'branch_admin')
  )
);

CREATE POLICY "Allow branch and super admin update" ON products 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'super_admin'
  )
  OR
  (
    branch_id IN (SELECT branch_id FROM employees WHERE id = auth.uid() AND role = 'branch_admin')
  )
);

CREATE POLICY "Allow branch and super admin delete" ON products 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'super_admin'
  )
  OR
  (
    branch_id IN (SELECT branch_id FROM employees WHERE id = auth.uid() AND role = 'branch_admin')
  )
);
