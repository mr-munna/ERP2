import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('erp.db');
const upload = multer({ dest: 'uploads/' });

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT CHECK(category IN ('Tiles', 'Sanitary', 'Fittings')),
    brand TEXT,
    size TEXT,
    grade TEXT,
    unit_type TEXT DEFAULT 'Box'
  );

  CREATE TABLE IF NOT EXISTS stock (
    product_id INTEGER PRIMARY KEY REFERENCES products(id),
    quantity_box INTEGER DEFAULT 0,
    pcs_per_box INTEGER DEFAULT 1,
    total_sft REAL,
    warehouse_location TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    due_amount REAL,
    date TEXT DEFAULT CURRENT_DATE
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id),
    product_id INTEGER REFERENCES products(id),
    quantity_box INTEGER,
    pcs_per_box INTEGER,
    total_sft REAL,
    unit_price REAL
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // --- API Endpoints ---

  // 1. Fetch Dashboard Stats
  app.get('/api/dashboard/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const salesToday = db.prepare('SELECT SUM(total_amount) as total FROM sales WHERE date = ?').get(today);
    const collectionToday = db.prepare('SELECT SUM(paid_amount) as total FROM sales WHERE date = ?').get(today);
    const totalDue = db.prepare('SELECT SUM(due_amount) as total FROM sales').get();
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM stock WHERE quantity_box < 10').get();

    res.json({
      todaySales: salesToday?.total || 0,
      todayCollection: collectionToday?.total || 0,
      totalDue: totalDue?.total || 0,
      lowStock: lowStock?.count || 0
    });
  });

  // 2. Fetch All Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare(`
      SELECT p.*, s.quantity_box, s.total_sft, s.warehouse_location 
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
    `).all();
    res.json(products);
  });

  // 2. Add New Product
  app.post('/api/products', (req, res) => {
    const { name, category, brand, size, grade, quantity_box, pcs_per_box, sft_per_pc, warehouse_location } = req.body;
    
    const transaction = db.transaction(() => {
      const productResult = db.prepare(`
        INSERT INTO products (name, category, brand, size, grade)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, category, brand, size, grade);
      
      const productId = productResult.lastInsertRowid;
      const total_sft = (quantity_box || 0) * (pcs_per_box || 1) * (sft_per_pc || 0);

      db.prepare(`
        INSERT INTO stock (product_id, quantity_box, pcs_per_box, total_sft, warehouse_location)
        VALUES (?, ?, ?, ?, ?)
      `).run(productId, quantity_box || 0, pcs_per_box || 1, total_sft, warehouse_location || 'Main Warehouse');
      
      return productId;
    });

    try {
      const productId = transaction();
      res.json({ success: true, productId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Fetch All Sales
  app.get('/api/sales', (req, res) => {
    const sales = db.prepare('SELECT * FROM sales ORDER BY date DESC').all();
    res.json(sales);
  });

  // 4. Fetch Current Stock
  app.get('/api/stock/:productId', (req, res) => {
    const { productId } = req.params;
    const stock = db.prepare('SELECT * FROM stock WHERE product_id = ?').get(productId);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });
    res.json(stock);
  });

  // 2. Deduct Stock & Record Sale
  app.post('/api/sales', (req, res) => {
    const { customer_name, total_amount, discount, paid_amount, items, payment_method } = req.body;
    
    const due_amount = total_amount - (discount || 0) - (paid_amount || 0);
    
    const transaction = db.transaction(() => {
      // Create Sale Record
      const saleResult = db.prepare(`
        INSERT INTO sales (customer_name, total_amount, discount, paid_amount, due_amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(customer_name, total_amount, discount || 0, paid_amount || 0, due_amount);
      
      const saleId = saleResult.lastInsertRowid;

      for (const item of items) {
        const { product_id, quantity_box, pcs_per_box, total_sft, unit_price } = item;
        
        // Record Sale Item
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, quantity_box, pcs_per_box, total_sft, unit_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(saleId, product_id, quantity_box, pcs_per_box, total_sft, unit_price);

        // Deduct Stock
        db.prepare(`
          UPDATE stock 
          SET quantity_box = quantity_box - ? 
          WHERE product_id = ?
        `).run(quantity_box, product_id);
      }
      return saleId;
    });

    try {
      const saleId = transaction();
      res.json({ success: true, saleId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Import Excel Data
  app.post('/api/import', upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.readFile(req.file.path);
    const sheets = ['All Goods', 'All Tiles', 'Sanitary'];
    
    const importTransaction = db.transaction(() => {
      sheets.forEach(sheetName => {
        if (!workbook.SheetNames.includes(sheetName)) return;
        
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        data.forEach((row: any) => {
          // Mapping Logic
          const category = sheetName === 'All Tiles' ? 'Tiles' : (sheetName === 'Sanitary' ? 'Sanitary' : 'Fittings');
          const name = row['Product Name'] || row['Name'];
          const brand = row['Brand'];
          const size = row['Size'];
          const grade = row['Grade'];
          const quantity_box = parseInt(row['Stock Boxes'] || row['Quantity']) || 0;
          const pcs_per_box = parseInt(row['Pcs/Box']) || 1;
          const sft_per_pc = parseFloat(row['SFT/Pc']) || 0;
          const total_sft = quantity_box * pcs_per_box * sft_per_pc;

          // Insert Product
          const productResult = db.prepare(`
            INSERT INTO products (name, category, brand, size, grade)
            VALUES (?, ?, ?, ?, ?)
          `).run(name, category, brand, size, grade);
          
          const productId = productResult.lastInsertRowid;

          // Insert Stock
          db.prepare(`
            INSERT INTO stock (product_id, quantity_box, pcs_per_box, total_sft, warehouse_location)
            VALUES (?, ?, ?, ?, ?)
          `).run(productId, quantity_box, pcs_per_box, total_sft, row['Location'] || 'Main Warehouse');
        });
      });
    });

    try {
      importTransaction();
      res.json({ success: true, message: 'Data imported successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Export Daily Sales Report
  app.get('/api/export/sales', async (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const sales = db.prepare('SELECT * FROM sales WHERE date = ?').all(date);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Sales');

    worksheet.columns = [
      { header: 'Invoice ID', key: 'id', width: 10 },
      { header: 'Customer', key: 'customer_name', width: 25 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Discount', key: 'discount', width: 10 },
      { header: 'Paid', key: 'paid_amount', width: 15 },
      { header: 'Due', key: 'due_amount', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    worksheet.addRows(sales);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales_report_${date}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
