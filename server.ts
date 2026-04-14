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
    barcode TEXT UNIQUE,
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
    customer_phone TEXT,
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

  -- Advanced Modules Tables
  CREATE TABLE IF NOT EXISTS damages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    quantity_box INTEGER,
    pcs_per_box INTEGER,
    total_sft REAL,
    reason TEXT,
    date TEXT DEFAULT CURRENT_DATE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    type TEXT CHECK(type IN ('Standard', 'Contractor', 'VIP')) DEFAULT 'Standard'
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    balance REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER REFERENCES suppliers(id),
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    due_amount REAL,
    due_date TEXT,
    date TEXT DEFAULT CURRENT_DATE
  );

  CREATE TABLE IF NOT EXISTS stock_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    from_location TEXT,
    to_location TEXT,
    quantity_box INTEGER,
    date TEXT DEFAULT CURRENT_DATE
  );

  CREATE TABLE IF NOT EXISTS salesmen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    commission_rate REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    date TEXT DEFAULT CURRENT_DATE
  );
`);

// Alter tables for advanced modules
try { db.exec('ALTER TABLE sales ADD COLUMN customer_phone TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE products ADD COLUMN barcode TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE products ADD COLUMN purchase_price REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN salesman_id INTEGER REFERENCES salesmen(id);'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN commission_amount REAL DEFAULT 0;'); } catch (e) {}

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
    const { name, barcode, category, brand, size, grade, quantity_box, pcs_per_box, sft_per_pc, warehouse_location } = req.body;
    
    const transaction = db.transaction(() => {
      const productResult = db.prepare(`
        INSERT INTO products (name, barcode, category, brand, size, grade)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, barcode || null, category, brand, size, grade);
      
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
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add product' });
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
    const { customer_name, customer_phone, total_amount, discount, paid_amount, items, payment_method } = req.body;
    
    const due_amount = total_amount - (discount || 0) - (paid_amount || 0);
    
    const transaction = db.transaction(() => {
      // Create Sale Record
      const saleResult = db.prepare(`
        INSERT INTO sales (customer_name, customer_phone, total_amount, discount, paid_amount, due_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(customer_name, customer_phone || null, total_amount, discount || 0, paid_amount || 0, due_amount);
      
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
      
      // Send SMS if phone number is provided and it's not just a draft (paid_amount > 0 or explicit trigger could be used, assuming real sale if we reach here)
      if (customer_phone && process.env.NETSMSBD_USERNAME && process.env.NETSMSBD_PASSWORD) {
        const msg = `Dear ${customer_name}, thank you for your purchase from mavxon EIMS. Total: ৳${total_amount}, Paid: ৳${paid_amount || 0}, Due: ৳${due_amount}. Invoice No: INV-${saleId}.`;
        
        // Format phone number: remove non-numeric characters (like + or spaces)
        let formattedPhone = customer_phone.replace(/\D/g, '');
        
        // Ensure it starts with 880 for Bangladesh if it starts with 01
        if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
          formattedPhone = '88' + formattedPhone;
        }

        // Validate BD phone number (must be 13 digits and start with 8801)
        if (/^8801[3-9]\d{8}$/.test(formattedPhone)) {
          const smsUrl = new URL('https://www.netsmsbd.com/api');
          smsUrl.searchParams.append('username', process.env.NETSMSBD_USERNAME);
          smsUrl.searchParams.append('password', process.env.NETSMSBD_PASSWORD);
          smsUrl.searchParams.append('number', formattedPhone);
          smsUrl.searchParams.append('message', msg);

          fetch(smsUrl.toString())
            .then(response => response.text())
            .then(data => console.log('NetSMSBD Response:', data))
            .catch(err => console.error('NetSMSBD Error:', err));
        } else {
          console.warn(`Skipping SMS: Invalid phone number format (${customer_phone})`);
        }
      }

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
          
          // Skip rows without a product name
          if (!name) return;

          const barcode = row['Barcode'] ? String(row['Barcode']) : null;
          const brand = row['Brand'] || '';
          const size = row['Size'] || '';
          const grade = row['Grade'] || '';
          const quantity_box = parseInt(row['Stock Boxes'] || row['Quantity']) || 0;
          const pcs_per_box = parseInt(row['Pcs/Box']) || 1;
          const sft_per_pc = parseFloat(row['SFT/Pc']) || 0;
          const total_sft = quantity_box * pcs_per_box * sft_per_pc;

          // Insert Product
          const productResult = db.prepare(`
            INSERT INTO products (name, barcode, category, brand, size, grade)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(name, barcode, category, brand, size, grade);
          
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

  // --- Advanced Modules Endpoints ---

  // Damage/Breakage Management
  app.post('/api/damages', (req, res) => {
    const { product_id, quantity_box, pcs_per_box, total_sft, reason } = req.body;
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO damages (product_id, quantity_box, pcs_per_box, total_sft, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(product_id, quantity_box, pcs_per_box, total_sft, reason);

      db.prepare(`
        UPDATE stock 
        SET quantity_box = quantity_box - ? 
        WHERE product_id = ?
      `).run(quantity_box, product_id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Customer-wise Pricing
  app.get('/api/customers', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers').all();
    res.json(customers);
  });

  app.post('/api/customers', (req, res) => {
    const { name, phone, type } = req.body;
    try {
      db.prepare('INSERT INTO customers (name, phone, type) VALUES (?, ?, ?)').run(name, phone, type || 'Standard');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Supplier Ledger & Reminder
  app.get('/api/suppliers', (req, res) => {
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    res.json(suppliers);
  });

  app.post('/api/suppliers', (req, res) => {
    const { name, phone, balance } = req.body;
    try {
      db.prepare('INSERT INTO suppliers (name, phone, balance) VALUES (?, ?, ?)').run(name, phone, balance || 0);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/purchases', (req, res) => {
    const { supplier_id, total_amount, paid_amount, due_date } = req.body;
    const due_amount = total_amount - (paid_amount || 0);
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO purchases (supplier_id, total_amount, paid_amount, due_amount, due_date)
        VALUES (?, ?, ?, ?, ?)
      `).run(supplier_id, total_amount, paid_amount || 0, due_amount, due_date);

      db.prepare(`
        UPDATE suppliers SET balance = balance + ? WHERE id = ?
      `).run(due_amount, supplier_id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Multi-Warehouse Support
  app.post('/api/stock-transfers', (req, res) => {
    const { product_id, from_location, to_location, quantity_box } = req.body;
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO stock_transfers (product_id, from_location, to_location, quantity_box)
        VALUES (?, ?, ?, ?)
      `).run(product_id, from_location, to_location, quantity_box);
      // Actual stock transfer logic would require stock table to have location-specific rows.
      // For now, we just record the transfer.
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sales Commission Tracking
  app.get('/api/salesmen', (req, res) => {
    const salesmen = db.prepare('SELECT * FROM salesmen').all();
    res.json(salesmen);
  });

  app.post('/api/salesmen', (req, res) => {
    const { name, phone, commission_rate } = req.body;
    try {
      db.prepare('INSERT INTO salesmen (name, phone, commission_rate) VALUES (?, ?, ?)').run(name, phone, commission_rate || 0);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Expense Tracker
  app.get('/api/expenses', (req, res) => {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
    res.json(expenses);
  });

  app.post('/api/expenses', (req, res) => {
    const { category, amount, description } = req.body;
    try {
      db.prepare('INSERT INTO expenses (category, amount, description) VALUES (?, ?, ?)').run(category, amount, description);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Profit & Loss Analytics
  app.get('/api/analytics/pnl', (req, res) => {
    try {
      const totalSales = db.prepare('SELECT SUM(total_amount) as total FROM sales').get() as { total: number };
      const totalExpenses = db.prepare('SELECT SUM(amount) as total FROM expenses').get() as { total: number };
      // Simplified COGS: Assuming purchase_price is in products table
      const cogs = db.prepare(`
        SELECT SUM(si.quantity_box * p.purchase_price) as total 
        FROM sale_items si 
        JOIN products p ON si.product_id = p.id
      `).get() as { total: number };

      const netProfit = (totalSales?.total || 0) - (cogs?.total || 0) - (totalExpenses?.total || 0);

      res.json({
        totalSales: totalSales?.total || 0,
        totalExpenses: totalExpenses?.total || 0,
        cogs: cogs?.total || 0,
        netProfit
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
