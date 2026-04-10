import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, Package, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function Inventory() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Product State
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Tiles',
    brand: '',
    size: '',
    grade: '',
    quantity_box: '',
    pcs_per_box: '',
    sft_per_pc: '',
    warehouse_location: ''
  });

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async () => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          quantity_box: parseInt(newProduct.quantity_box) || 0,
          pcs_per_box: parseInt(newProduct.pcs_per_box) || 1,
          sft_per_pc: parseFloat(newProduct.sft_per_pc) || 0
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Product added successfully!');
        fetchProducts();
        setNewProduct({
          name: '',
          category: 'Tiles',
          brand: '',
          size: '',
          grade: '',
          quantity_box: '',
          pcs_per_box: '',
          sft_per_pc: '',
          warehouse_location: ''
        });
      }
    } catch (error) {
      alert('Error adding product');
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        alert('Data imported successfully! Refreshing...');
        window.location.reload();
      } else {
        alert('Import failed: ' + result.error);
      }
    } catch (error) {
      alert('Error importing data');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="pl-8 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls"
            onChange={handleImport}
          />
          <Button 
            variant="outline" 
            className="gap-2 bg-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4" /> {isImporting ? 'Importing...' : 'Import Excel'}
          </Button>
          
          <Dialog>
            <DialogTrigger render={<Button className="gap-2 bg-[#0f172a] hover:bg-[#1e293b]" />}>
              <Plus className="h-4 w-4" /> Add Product
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. White Marble Tile" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    <option value="Tiles">Tiles</option>
                    <option value="Sanitary">Sanitary</option>
                    <option value="Fittings">Fittings</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand</label>
                  <Input value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} placeholder="e.g. RAK" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Size</label>
                  <Input value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})} placeholder="e.g. 60x60 cm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grade</label>
                  <Input value={newProduct.grade} onChange={e => setNewProduct({...newProduct, grade: e.target.value})} placeholder="e.g. Premium" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial Stock (Boxes)</label>
                  <Input type="number" value={newProduct.quantity_box} onChange={e => setNewProduct({...newProduct, quantity_box: e.target.value})} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pcs per Box</label>
                  <Input type="number" value={newProduct.pcs_per_box} onChange={e => setNewProduct({...newProduct, pcs_per_box: e.target.value})} placeholder="1" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SFT per Pc</label>
                  <Input type="number" step="0.001" value={newProduct.sft_per_pc} onChange={e => setNewProduct({...newProduct, sft_per_pc: e.target.value})} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={newProduct.warehouse_location} onChange={e => setNewProduct({...newProduct, warehouse_location: e.target.value})} placeholder="e.g. Section A" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddProduct} className="w-full bg-blue-600 hover:bg-blue-700">Save Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Stock (Box)</TableHead>
              <TableHead>Total SFT</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-400">Loading products...</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-400">No products found. Add one or import from Excel.</TableCell>
              </TableRow>
            ) : products.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-mono text-xs">#{product.id.toString().padStart(4, '0')}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {product.category}
                  </Badge>
                </TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell className="text-muted-foreground">{product.size}</TableCell>
                <TableCell className="font-semibold">{product.quantity_box || 0}</TableCell>
                <TableCell>{product.total_sft ? `${product.total_sft.toFixed(2)} sqft` : '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    {product.warehouse_location}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {(product.quantity_box || 0) < 10 ? (
                    <Badge variant="destructive">Low Stock</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">In Stock</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
