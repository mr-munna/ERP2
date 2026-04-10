import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Date, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

# Database Configuration
# Replace with your actual connection string: 'mysql+pymysql://user:pass@host/dbname'
DB_URL = 'sqlite:///erp_local.db' 
engine = create_engine(DB_URL)
Base = declarative_base()
Session = sessionmaker(bind=engine)
session = Session()

# --- Database Models ---

class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50))
    brand = Column(String(100))
    size = Column(String(50))
    grade = Column(String(50))
    unit_type = Column(String(20), default='Box')

class Stock(Base):
    __tablename__ = 'stock'
    product_id = Column(Integer, ForeignKey('products.id'), primary_key=True)
    quantity_box = Column(Integer, default=0)
    pcs_per_box = Column(Integer, default=1)
    total_sft = Column(Float)
    warehouse_location = Column(String(100))

class Sale(Base):
    __tablename__ = 'sales'
    id = Column(Integer, primary_key=True)
    customer_name = Column(String(255))
    total_amount = Column(Float)
    discount = Column(Float, default=0)
    paid_amount = Column(Float, default=0)
    due_amount = Column(Float)
    date = Column(Date, default=datetime.date.today)

# Create tables
Base.metadata.create_all(engine)

# --- 1. Import Data from Excel ---

def import_excel_data(file_path):
    print(f"Reading Excel file: {file_path}")
    xls = pd.ExcelFile(file_path)
    
    sheets_to_process = {
        'All Tiles': 'Tiles',
        'Sanitary': 'Sanitary',
        'All Goods': 'Fittings'
    }

    for sheet_name, category in sheets_to_process.items():
        if sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            print(f"Processing sheet: {sheet_name}")
            
            for _, row in df.iterrows():
                # Data Mapping
                product = Product(
                    name=row.get('Product Name', row.get('Name')),
                    category=category,
                    brand=row.get('Brand'),
                    size=row.get('Size'),
                    grade=row.get('Grade')
                )
                session.add(product)
                session.flush() # Get product ID

                # Stock Mapping
                qty = int(row.get('Stock Boxes', row.get('Quantity', 0)))
                pcs = int(row.get('Pcs/Box', 1))
                sft_factor = float(row.get('SFT/Pc', 0))
                
                stock = Stock(
                    product_id=product.id,
                    quantity_box=qty,
                    pcs_per_box=pcs,
                    total_sft=qty * pcs * sft_factor,
                    warehouse_location=row.get('Location', 'Main Warehouse')
                )
                session.add(stock)
            
            session.commit()
            print(f"Successfully imported {len(df)} items from {sheet_name}")

# --- 2. API Logic (Python Functions) ---

def get_stock(product_id):
    stock = session.query(Stock).filter_by(product_id=product_id).first()
    if stock:
        return {
            "product_id": stock.product_id,
            "quantity_box": stock.quantity_box,
            "total_sft": stock.total_sft
        }
    return None

def make_sale(customer_name, items):
    """
    items: list of dicts [{'product_id': 1, 'qty_box': 5, 'price': 1000}]
    """
    total = 0
    for item in items:
        # Deduct Stock
        stock = session.query(Stock).filter_by(product_id=item['product_id']).first()
        if stock:
            stock.quantity_box -= item['qty_box']
            total += item['qty_box'] * item['price']
            
            # Low Stock Alert
            if stock.quantity_box < 10:
                print(f"ALERT: Product {item['product_id']} is low on stock ({stock.quantity_box} boxes left)")
    
    # Record Sale
    new_sale = Sale(
        customer_name=customer_name,
        total_amount=total,
        paid_amount=total, # Assuming full payment for simplicity
        due_amount=0
    )
    session.add(new_sale)
    session.commit()
    print(f"Sale recorded for {customer_name}. Total: {total}")

# --- 3. Export Sales Report ---

def export_sales_report(date=None):
    if not date:
        date = datetime.date.today()
    
    sales = session.query(Sale).filter_by(date=date).all()
    df = pd.DataFrame([{
        'Invoice ID': s.id,
        'Customer': s.customer_name,
        'Total': s.total_amount,
        'Paid': s.paid_amount,
        'Due': s.due_amount,
        'Date': s.date
    } for s in sales])
    
    filename = f"sales_report_{date}.xlsx"
    df.to_excel(filename, index=False)
    print(f"Report exported to {filename}")

if __name__ == "__main__":
    # Example usage:
    # import_excel_data('business_data.xlsx')
    # export_sales_report()
    pass
