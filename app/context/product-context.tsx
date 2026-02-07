"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  Product as DBProduct,
  Category as DBCategory,
  ProductVariant as DBProductVariant,
} from "@/lib/supabase/types";

// Types compatible with existing UI
export interface ProductVariant {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  trackStock: boolean;
  stock: number;
  image: string;
  status: "active" | "inactive";
  variants?: ProductVariant[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount: number;
}

interface ProductContextType {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (
    category: Omit<Category, "id" | "productCount">,
  ) => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<Category[]>;
  reduceStock: (productId: string, quantity: number) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories from Supabase
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;

      // Get product counts per category
      const { data: countData } = await supabase
        .from("products")
        .select("category_id");

      const counts: Record<string, number> = {};
      (countData || []).forEach((p: { category_id: string | null }) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });

      const formattedCategories: Category[] = (data || []).map(
        (c: DBCategory) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          productCount: counts[c.id] || 0,
        }),
      );

      setCategories(formattedCategories);
      return formattedCategories;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }, []);

  // Fetch products with variants from Supabase
  const fetchProducts = useCallback(async (cats: Category[]) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          product_variants (*)
        `,
        )
        .order("name");

      if (error) throw error;

      const formattedProducts: Product[] = (data || []).map(
        (p: DBProduct & { product_variants?: DBProductVariant[] }) => {
          const category = cats.find((c) => c.id === p.category_id);
          return {
            id: p.id,
            name: p.name,
            category: category?.name || "",
            price: Number(p.price),
            trackStock: p.track_stock,
            stock: p.stock,
            image: p.image_url || "/placeholder-tea.jpg",
            status: p.status as "active" | "inactive",
            variants: (p.product_variants || []).map((v) => ({
              name: v.name,
              price: Number(v.price),
            })),
          };
        },
      );

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const cats = await fetchCategories();
      await fetchProducts(cats);
      setIsLoading(false);
    };
    init();
  }, [fetchCategories, fetchProducts]);

  // Realtime subscriptions
  useEffect(() => {
    const productChannel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        async () => {
          const cats = await fetchCategories();
          await fetchProducts(cats);
        },
      )
      .subscribe();

    const categoryChannel = supabase
      .channel("categories-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => fetchCategories(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(categoryChannel);
    };
  }, [fetchProducts, fetchCategories]);

  const addProduct = useCallback(
    async (productData: Omit<Product, "id">) => {
      // Find category ID by name
      const category = categories.find((c) => c.name === productData.category);

      const { data: newProduct, error } = await supabase
        .from("products")
        .insert({
          name: productData.name,
          category_id: category?.id,
          price: productData.price,
          track_stock: productData.trackStock,
          stock: productData.stock,
          image_url: productData.image,
          status: productData.status,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert variants if any
      if (
        productData.variants &&
        productData.variants.length > 0 &&
        newProduct
      ) {
        const variantsToInsert = productData.variants.map((v) => ({
          product_id: newProduct.id,
          name: v.name,
          price: v.price,
        }));

        await supabase.from("product_variants").insert(variantsToInsert);
      }

      const cats = await fetchCategories();
      await fetchProducts(cats);
    },
    [categories, fetchProducts, fetchCategories],
  );

  const updateProduct = useCallback(
    async (updatedProduct: Product) => {
      const category = categories.find(
        (c) => c.name === updatedProduct.category,
      );

      const { error } = await supabase
        .from("products")
        .update({
          name: updatedProduct.name,
          category_id: category?.id,
          price: updatedProduct.price,
          track_stock: updatedProduct.trackStock,
          stock: updatedProduct.stock,
          image_url: updatedProduct.image,
          status: updatedProduct.status,
        })
        .eq("id", updatedProduct.id);

      if (error) throw error;

      // Update variants: delete old ones and insert new ones
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", updatedProduct.id);

      if (updatedProduct.variants && updatedProduct.variants.length > 0) {
        const variantsToInsert = updatedProduct.variants.map((v) => ({
          product_id: updatedProduct.id,
          name: v.name,
          price: v.price,
        }));
        await supabase.from("product_variants").insert(variantsToInsert);
      }

      const cats = await fetchCategories();
      await fetchProducts(cats);
    },
    [categories, fetchProducts, fetchCategories],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      const cats = await fetchCategories();
      await fetchProducts(cats);
    },
    [fetchProducts, fetchCategories],
  );

  const addCategory = useCallback(
    async (categoryData: Omit<Category, "id" | "productCount">) => {
      const { error } = await supabase.from("categories").insert({
        name: categoryData.name,
        description: categoryData.description,
      });

      if (error) throw error;
      await fetchCategories();
    },
    [fetchCategories],
  );

  const refreshProducts = useCallback(async () => {
    const cats = await fetchCategories();
    await fetchProducts(cats);
  }, [fetchProducts, fetchCategories]);

  // Reduce stock for a product (called after successful transaction)
  const reduceStock = useCallback(
    async (productId: string, quantity: number) => {
      console.log(
        `[reduceStock] Called for product: ${productId}, quantity: ${quantity}`,
      );
      try {
        // Get current product stock
        const { data: product, error: fetchError } = await supabase
          .from("products")
          .select("stock, track_stock, name")
          .eq("id", productId)
          .single();

        if (fetchError) {
          console.error(
            `[reduceStock] Fetch error for ${productId}:`,
            fetchError,
          );
          return;
        }

        if (!product) {
          console.warn(`[reduceStock] Product not found: ${productId}`);
          return;
        }

        console.log(
          `[reduceStock] Product found: ${product.name}, current stock: ${product.stock}`,
        );

        const currentStock = product.stock || 0;
        const newStock = Math.max(0, currentStock - quantity);

        console.log(
          `[reduceStock] Reducing from ${currentStock} to ${newStock}`,
        );

        // Update stock in database
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", productId);

        if (updateError) {
          console.error(`[reduceStock] Update error:`, updateError);
          return;
        }

        console.log(
          `[reduceStock] Stock updated successfully for ${product.name}`,
        );

        // Update local state
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
        );
      } catch (error) {
        console.error("[reduceStock] Error:", error);
      }
    },
    [],
  );

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        refreshProducts,
        refreshCategories: fetchCategories,
        reduceStock,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
