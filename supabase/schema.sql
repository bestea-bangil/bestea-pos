-- =============================================
-- BESTEA POS - Supabase Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. BRANCHES (Cabang)
-- =============================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('admin', 'cabang')),
    email VARCHAR(100) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. EMPLOYEES (Karyawan)
-- =============================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'branch_admin', 'cashier')),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    join_date DATE DEFAULT CURRENT_DATE,
    base_salary DECIMAL(12,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    pin VARCHAR(10), -- Hashed PIN for cashier login
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. CATEGORIES (Kategori Produk)
-- =============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. PRODUCTS (Produk)
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(12,2) NOT NULL,
    track_stock BOOLEAN DEFAULT FALSE,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. PRODUCT_VARIANTS (Varian Produk)
-- =============================================
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., 'Medium', 'Large'
    price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. SHIFTS (Shift Kasir)
-- =============================================
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    opened_by UUID REFERENCES employees(id),
    closed_by UUID REFERENCES employees(id),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    initial_cash DECIMAL(12,2) DEFAULT 0,
    total_cash_transactions DECIMAL(12,2) DEFAULT 0,
    total_qris_transactions DECIMAL(12,2) DEFAULT 0,
    total_expenses DECIMAL(12,2) DEFAULT 0,
    expected_cash DECIMAL(12,2) DEFAULT 0,
    actual_cash DECIMAL(12,2),
    discrepancy DECIMAL(12,2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. TRANSACTIONS (Transaksi)
-- =============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES employees(id),
    cashier_name VARCHAR(100),
    customer_name VARCHAR(100),
    total_amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'qris', 'debit')),
    amount_paid DECIMAL(12,2),
    change_amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'void', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. TRANSACTION_ITEMS (Item Transaksi)
-- =============================================
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(100) NOT NULL,
    variant_name VARCHAR(50),
    quantity INTEGER NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. EXPENSES (Pengeluaran)
-- =============================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Operasional', 'Bahan Baku', 'Gaji', 'Sewa', 'Lainnya')),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    recorded_by UUID REFERENCES employees(id),
    recorded_by_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 10. ATTENDANCE_RECORDS (Absensi)
-- =============================================
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpha')),
    shift VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. PAYROLL_RECORDS (Gaji)
-- =============================================
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    hours_worked DECIMAL(8,2) DEFAULT 0,
    base_salary DECIMAL(12,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    overtime_pay DECIMAL(12,2) DEFAULT 0,
    deductions DECIMAL(12,2) DEFAULT 0,
    total_salary DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_transactions_branch ON transactions(branch_id);
CREATE INDEX idx_transactions_shift ON transactions(shift_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_created ON expenses(created_at);
CREATE INDEX idx_shifts_branch ON shifts(branch_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX idx_payroll_month ON payroll_records(month);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all data (adjust as needed)
CREATE POLICY "Allow authenticated read" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON transaction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON payroll_records FOR SELECT TO authenticated USING (true);

-- Policy: Allow authenticated users to insert (adjust as needed)
CREATE POLICY "Allow authenticated insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON transaction_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON shifts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON attendance_records FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- SEED DATA (Optional)
-- =============================================

-- Insert default admin branch
INSERT INTO branches (name, type, email) VALUES 
('Bestea POS', 'admin', 'admin@bestea.com');

-- Insert sample branches
INSERT INTO branches (name, type, address, phone) VALUES 
('Cabang Bangil', 'cabang', 'Jl. Raya Bangil No. 123', '0343-123456'),
('Cabang Pasuruan', 'cabang', 'Jl. Raya Pasuruan No. 456', '0343-654321');

-- Insert default categories
INSERT INTO categories (name, description) VALUES 
('Tea Series', 'Varian teh original dan rasa buah'),
('Milk Tea', 'Paduan teh dan susu creamy'),
('Squash', 'Minuman squash segar'),
('Coffee', 'Varian kopi'),
('Topping', 'Tambahan topping');
