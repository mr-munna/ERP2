export type Category = 'Tiles' | 'Sanitary' | 'Fittings';

export interface Product {
  id: number;
  name: string;
  category: Category;
  brand: string;
  size: string;
  grade: string;
  unit_type: string;
}

export interface Stock {
  product_id: number;
  quantity_box: number;
  pcs_per_box: number;
  total_sft: number;
  warehouse_location: string;
}

export interface Sale {
  id: number;
  customer_name: string;
  total_amount: number;
  discount: number;
  paid_amount: number;
  due_amount: number;
  date: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
}
