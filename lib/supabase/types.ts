// Database types generated from Supabase schema
// You can generate this automatically using: npx supabase gen types typescript

export interface Branch {
  id: string;
  name: string;
  type: 'admin' | 'cabang';
  email?: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'branch_admin' | 'cashier';
  branch_id?: string;
  status: 'active' | 'inactive';
  join_date: string;
  base_salary: number;
  hourly_rate: number;
  pin?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id?: string;
  price: number;
  track_stock: boolean;
  stock: number;
  image_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  created_at: string;
}

export interface Shift {
  id: string;
  branch_id: string;
  opened_by?: string;
  closed_by?: string;
  start_time: string;
  end_time?: string;
  initial_cash: number;
  total_cash_transactions: number;
  total_qris_transactions: number;
  total_expenses: number;
  expected_cash: number;
  actual_cash?: number;
  discrepancy?: number;
  notes?: string;
  status: 'open' | 'closed';
  created_at: string;
}

export interface Transaction {
  id: string;
  branch_id: string;
  shift_id?: string;
  cashier_id?: string;
  cashier_name?: string;
  customer_name?: string;
  total_amount: number;
  payment_method: 'cash' | 'qris' | 'debit';
  amount_paid?: number;
  change_amount?: number;
  status: 'completed' | 'void' | 'pending';
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: string;
}

export interface Expense {
  id: string;
  branch_id: string;
  shift_id?: string;
  category: 'Operasional' | 'Bahan Baku' | 'Gaji' | 'Sewa' | 'Lainnya';
  description: string;
  amount: number;
  recorded_by?: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  branch_id?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
  shift?: string;
  notes?: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  month: string;
  hours_worked: number;
  base_salary: number;
  hourly_rate: number;
  overtime_hours: number;
  overtime_pay: number;
  deductions: number;
  total_salary: number;
  status: 'Pending' | 'Paid';
  paid_at?: string;
  created_at: string;
}

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      branches: { Row: Branch; Insert: Omit<Branch, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Branch> };
      employees: { Row: Employee; Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Employee> };
      categories: { Row: Category; Insert: Omit<Category, 'id' | 'created_at'>; Update: Partial<Category> };
      products: { Row: Product; Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Product> };
      product_variants: { Row: ProductVariant; Insert: Omit<ProductVariant, 'id' | 'created_at'>; Update: Partial<ProductVariant> };
      shifts: { Row: Shift; Insert: Omit<Shift, 'id' | 'created_at'>; Update: Partial<Shift> };
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at'>; Update: Partial<Transaction> };
      transaction_items: { Row: TransactionItem; Insert: Omit<TransactionItem, 'id' | 'created_at'>; Update: Partial<TransactionItem> };
      expenses: { Row: Expense; Insert: Omit<Expense, 'id' | 'created_at'>; Update: Partial<Expense> };
      attendance_records: { Row: AttendanceRecord; Insert: Omit<AttendanceRecord, 'id' | 'created_at'>; Update: Partial<AttendanceRecord> };
      payroll_records: { Row: PayrollRecord; Insert: Omit<PayrollRecord, 'id' | 'created_at'>; Update: Partial<PayrollRecord> };
    };
  };
}
