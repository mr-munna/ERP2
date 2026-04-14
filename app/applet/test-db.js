import Database from 'better-sqlite3';
const db = new Database('erp.db');
try {
  db.exec('ALTER TABLE products ADD COLUMN barcode TEXT UNIQUE;');
  console.log("Success");
} catch (e) {
  console.error("Error:", e.message);
}
