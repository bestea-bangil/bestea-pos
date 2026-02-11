export interface ProductVariant {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  trackStock?: boolean;
  stock?: number;
  variants: ProductVariant[];
}

export interface CartItem extends Omit<Product, "variants"> {
  quantity: number;
  variant: ProductVariant;
}

export interface Category {
  id: string;
  name: string;
  value: string;
}

export interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  total: number;
  paymentMethod: "cash" | "qris" | "debit";
  status: "completed" | "pending" | "cancelled" | "void";
  items: TransactionItem[];
  employeeId?: string;
  employeeName?: string;
  branchName?: string;
  cashierName?: string;
  transactionCode?: string;
}

export const activeCategories: Category[] = [
  { id: "1", name: "Semua", value: "all" },
  { id: "2", name: "Tea", value: "tea" },
  { id: "3", name: "Milk", value: "milk" },
  { id: "4", name: "Squash", value: "squash" },
  { id: "5", name: "Coffe", value: "coffe" },
  { id: "6", name: "Lainya", value: "lainya" },
];

export const products: Product[] = [
  // Tea Series
  {
    id: "1",
    name: "Jasmine Tea",
    category: "tea",
    image: "/product-images/jasmine-tea.jpg",
    trackStock: false,
    stock: 100,
    variants: [
      { name: "Large", price: 3000 },
    ],
  },
  {
    id: "2",
    name: "Lemon Tea",
    category: "tea",
    image: "/product-images/lemon-tea.jpg",
    variants: [
      { name: "Medium", price: 5000 },
      { name: "Large", price: 7000 },
    ],
  },
  {
    id: "4",
    name: "Lychee Tea",
    category: "tea",
    image: "/product-images/lychee-tea.jpg",
    variants: [
      { name: "Medium", price: 5000 },
      { name: "Large", price: 7000 },
    ],
  },
  {
    id: "6",
    name: "Apple Tea",
    category: "tea",
    image: "/product-images/apple-tea.jpg",
    variants: [
      { name: "Medium", price: 5000 },
      { name: "Large", price: 7000 },
    ],
  },

  // Milk Series
  {
    id: "3",
    name: "Coco Milo Milk",
    category: "milk",
    image: "/product-images/milo-milk.jpg",
    trackStock: true,
    stock: 20,
    variants: [
      { name: "Medium", price: 5000 },
      { name: "Large", price: 10000 },
    ],
  },
  {
    id: "7",
    name: "Mangga Milk",
    category: "milk",
    image: "/product-images/mango-milk.jpg",
    trackStock: true,
    stock: 0, // Out of Stock Example
    variants: [
      { name: "Medium", price: 8000 },
      { name: "Large", price: 10000 },
    ],
  },
  {
    id: "8",
    name: "Matcha Milk",
    category: "milk",
    image: "/product-images/matcha-milk.jpg",
    trackStock: false, 
    stock: 50,
    variants: [
      { name: "Medium", price: 8000 },
      { name: "Large", price: 10000 },
    ],
  },
   {
    id: "9",
    name: "Tiramisu",
    category: "milk",
    image: "/product-images/tiramisu.jpg",
    trackStock: true,
    stock: 5, // Low Stock Example
    variants: [
      { name: "Medium", price: 8000 },
      { name: "Large", price: 10000 },
    ],
  },

  // Squash Series
  {
    id: "11",
    name: "Melon Squash",
    category: "squash",
    image: "/product-images/melon-squash.jpg",
    trackStock: false,
    stock: 100,
    variants: [
      { name: "Standart", price: 10000 },
    ],
  },
  {
    id: "12",
    name: "Orange Squash",
    category: "squash",
    image: "/product-images/orange-squash.jpg",
    variants: [
      { name: "Standart", price: 10000 },
    ],
  },
  {
    id: "13",
    name: "Strawberry Squash",
    category: "squash",
    image: "/product-images/strawberry-squash.jpg",
    variants: [
      { name: "Standart", price: 10000 },
    ],
  },

  //Coffe Series
  {
    id: "10",
    name: "Cappucino",
    category: "coffe",
    image: "/product-images/cappuchino.jpg",
    variants: [
      { name: "Medium", price: 8000 },
      { name: "Large", price: 10000 },
    ],
  },
];


