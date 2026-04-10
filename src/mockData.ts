import { Product, Stock, Sale } from './types';

export const mockProducts: Product[] = [
  { id: 1, name: 'White Marble Tile', category: 'Tiles', brand: 'RAK', size: '60x60 cm', grade: 'Premium', unit_type: 'Box' },
  { id: 2, name: 'Ceramic Floor Tile', category: 'Tiles', brand: 'Akij', size: '40x40 cm', grade: 'Standard', unit_type: 'Box' },
  { id: 3, name: 'Wall Mount Commode', category: 'Sanitary', brand: 'Stella', size: 'Standard', grade: 'Premium', unit_type: 'Pcs' },
  { id: 4, name: 'Brass Basin Mixer', category: 'Fittings', brand: 'Haier', size: '1/2 inch', grade: 'Premium', unit_type: 'Pcs' },
];

export const mockStock: Stock[] = [
  { product_id: 1, quantity_box: 150, pcs_per_box: 4, total_sft: 2325, warehouse_location: 'Warehouse A' },
  { product_id: 2, quantity_box: 300, pcs_per_box: 6, total_sft: 3100, warehouse_location: 'Warehouse B' },
  { product_id: 3, quantity_box: 20, pcs_per_box: 1, total_sft: 0, warehouse_location: 'Warehouse A' },
  { product_id: 4, quantity_box: 45, pcs_per_box: 1, total_sft: 0, warehouse_location: 'Warehouse C' },
];

export const mockSales: Sale[] = [
  { id: 1001, customer_name: 'John Doe', total_amount: 45000, discount: 2000, paid_amount: 40000, due_amount: 3000, date: '2026-04-01' },
  { id: 1002, customer_name: 'Jane Smith', total_amount: 12500, discount: 500, paid_amount: 12000, due_amount: 0, date: '2026-04-05' },
  { id: 1003, customer_name: 'Rahim Khan', total_amount: 85000, discount: 5000, paid_amount: 50000, due_amount: 30000, date: '2026-04-08' },
];
