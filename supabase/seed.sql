-- =============================================
-- BESTEA POS - Seed Data for Testing
-- Run this AFTER schema.sql in Supabase SQL Editor
-- =============================================

-- Clear existing data (optional - uncomment if needed)
-- DELETE FROM payroll_records;
-- DELETE FROM attendance_records;
-- DELETE FROM transaction_items;
-- DELETE FROM transactions;
-- DELETE FROM expenses;
-- DELETE FROM shifts;
-- DELETE FROM product_variants;
-- DELETE FROM products;
-- DELETE FROM employees;
-- DELETE FROM categories;
-- DELETE FROM branches;

-- =============================================
-- 1. BRANCHES
-- =============================================
INSERT INTO branches (id, name, type, email, address, phone) VALUES 
('00000000-0000-0000-0000-000000000001', 'Bestea HQ', 'admin', 'admin@bestea.com', 'Kantor Pusat', '0343-000000'),
('00000000-0000-0000-0000-000000000002', 'Cabang Bangil', 'cabang', 'bangil@bestea.com', 'Jl. Raya Bangil No. 123', '0343-123456'),
('00000000-0000-0000-0000-000000000003', 'Cabang Pasuruan', 'cabang', 'pasuruan@bestea.com', 'Jl. Raya Pasuruan No. 456', '0343-654321')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. EMPLOYEES
-- =============================================
INSERT INTO employees (id, name, email, phone, role, branch_id, status, pin, base_salary, hourly_rate) VALUES 
-- Super Admin (use 'admin123' as password, store in pin field for simplicity)
('00000000-0000-0000-0001-000000000001', 'Admin Bestea', 'admin@bestea.com', '081234567890', 'super_admin', '00000000-0000-0000-0000-000000000001', 'active', 'admin123', 5000000, 0),

-- Cabang Bangil - Kasir
('00000000-0000-0000-0001-000000000002', 'Budi Santoso', 'budi@bestea.com', '081234567891', 'cashier', '00000000-0000-0000-0000-000000000002', 'active', '1111', 2500000, 15000),
('00000000-0000-0000-0001-000000000003', 'Siti Rahayu', 'siti@bestea.com', '081234567892', 'cashier', '00000000-0000-0000-0000-000000000002', 'active', '2222', 2500000, 15000),

-- Cabang Pasuruan - Kasir
('00000000-0000-0000-0001-000000000004', 'Andi Wijaya', 'andi@bestea.com', '081234567893', 'cashier', '00000000-0000-0000-0000-000000000003', 'active', '3333', 2500000, 15000),
('00000000-0000-0000-0001-000000000005', 'Dewi Lestari', 'dewi@bestea.com', '081234567894', 'cashier', '00000000-0000-0000-0000-000000000003', 'active', '4444', 2500000, 15000)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3. CATEGORIES
-- =============================================
INSERT INTO categories (id, name, description) VALUES 
('00000000-0000-0000-0002-000000000001', 'Tea Series', 'Varian teh original dan rasa buah'),
('00000000-0000-0000-0002-000000000002', 'Milk Tea', 'Paduan teh dan susu creamy'),
('00000000-0000-0000-0002-000000000003', 'Squash', 'Minuman squash segar'),
('00000000-0000-0000-0002-000000000004', 'Coffee', 'Varian kopi'),
('00000000-0000-0000-0002-000000000005', 'Topping', 'Tambahan topping')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. PRODUCTS
-- =============================================
INSERT INTO products (id, name, category_id, price, track_stock, stock, image_url, status) VALUES 
-- Tea Series
('00000000-0000-0000-0003-000000000001', 'Original Jasmine Tea', '00000000-0000-0000-0002-000000000001', 10000, false, 0, '/product-images/jasmine-tea.jpg', 'active'),
('00000000-0000-0000-0003-000000000002', 'Lemon Tea', '00000000-0000-0000-0002-000000000001', 12000, false, 0, '/product-images/lemon-tea.jpg', 'active'),
('00000000-0000-0000-0003-000000000003', 'Peach Tea', '00000000-0000-0000-0002-000000000001', 12000, false, 0, '/product-images/peach-tea.jpg', 'active'),
('00000000-0000-0000-0003-000000000004', 'Lychee Tea', '00000000-0000-0000-0002-000000000001', 12000, false, 0, '/product-images/lychee-tea.jpg', 'active'),

-- Milk Tea
('00000000-0000-0000-0003-000000000005', 'Brown Sugar Milk Tea', '00000000-0000-0000-0002-000000000002', 18000, false, 0, '/product-images/brown-sugar.jpg', 'active'),
('00000000-0000-0000-0003-000000000006', 'Taro Milk Tea', '00000000-0000-0000-0002-000000000002', 18000, false, 0, '/product-images/taro.jpg', 'active'),
('00000000-0000-0000-0003-000000000007', 'Matcha Milk Tea', '00000000-0000-0000-0002-000000000002', 20000, false, 0, '/product-images/matcha.jpg', 'active'),
('00000000-0000-0000-0003-000000000008', 'Thai Milk Tea', '00000000-0000-0000-0002-000000000002', 18000, false, 0, '/product-images/thai-tea.jpg', 'active'),

-- Squash
('00000000-0000-0000-0003-000000000009', 'Lemon Squash', '00000000-0000-0000-0002-000000000003', 15000, false, 0, '/product-images/lemon-squash.jpg', 'active'),
('00000000-0000-0000-0003-000000000010', 'Orange Squash', '00000000-0000-0000-0002-000000000003', 15000, false, 0, '/product-images/orange-squash.jpg', 'active'),

-- Coffee
('00000000-0000-0000-0003-000000000011', 'Espresso', '00000000-0000-0000-0002-000000000004', 12000, false, 0, '/product-images/espresso.jpg', 'active'),
('00000000-0000-0000-0003-000000000012', 'Cappuccino', '00000000-0000-0000-0002-000000000004', 18000, false, 0, '/product-images/cappuccino.jpg', 'active'),
('00000000-0000-0000-0003-000000000013', 'Caffe Latte', '00000000-0000-0000-0002-000000000004', 18000, false, 0, '/product-images/latte.jpg', 'active'),

-- Topping
('00000000-0000-0000-0003-000000000014', 'Pearl', '00000000-0000-0000-0002-000000000005', 5000, true, 100, '/product-images/pearl.jpg', 'active'),
('00000000-0000-0000-0003-000000000015', 'Pudding', '00000000-0000-0000-0002-000000000005', 5000, true, 100, '/product-images/pudding.jpg', 'active'),
('00000000-0000-0000-0003-000000000016', 'Cheese Foam', '00000000-0000-0000-0002-000000000005', 7000, true, 50, '/product-images/cheese-foam.jpg', 'active')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. PRODUCT VARIANTS (Size options)
-- =============================================
INSERT INTO product_variants (id, product_id, name, price) VALUES 
-- Tea Series variants
('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000001', 'Regular', 10000),
('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000001', 'Large', 13000),

-- Milk Tea variants
('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0003-000000000005', 'Regular', 18000),
('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0003-000000000005', 'Large', 22000),

('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0003-000000000006', 'Regular', 18000),
('00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0003-000000000006', 'Large', 22000),

('00000000-0000-0000-0004-000000000007', '00000000-0000-0000-0003-000000000007', 'Regular', 20000),
('00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0003-000000000007', 'Large', 25000)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DONE! Test these accounts:
-- =============================================
-- Super Admin: admin@bestea.com / Password: admin123
-- Kasir Bangil: budi@bestea.com / PIN: 1111
-- Kasir Bangil: siti@bestea.com / PIN: 2222
-- Kasir Pasuruan: andi@bestea.com / PIN: 3333
-- Kasir Pasuruan: dewi@bestea.com / PIN: 4444
-- =============================================
