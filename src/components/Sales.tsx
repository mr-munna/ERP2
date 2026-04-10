import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileText, Printer, Plus, Calculator, CreditCard, Wallet, Landmark } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { mockSales, mockProducts } from '../mockData';

export default function Sales() {
  const [boxes, setBoxes] = useState<string>('');
  const [pcsPerBox, setPcsPerBox] = useState<string>('');
  const [sftPerPc, setSftPerPc] = useState<string>('3.875'); // Default example factor
  const [totalSft, setTotalSft] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bkash' | 'Bank'>('Cash');
  const [customerName, setCustomerName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/sales');
      const data = await response.json();
      setSales(data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, []);

  useEffect(() => {
    const b = parseFloat(boxes) || 0;
    const p = parseFloat(pcsPerBox) || 0;
    const s = parseFloat(sftPerPc) || 0;
    setTotalSft(b * p * s);
  }, [boxes, pcsPerBox, sftPerPc]);

  const handleSaveSale = async (isDraft = false) => {
    if (!customerName || !selectedProductId) {
      alert('Please fill in customer name and select a product');
      return;
    }

    const totalAmount = parseFloat(unitPrice) * totalSft;
    
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          total_amount: totalAmount,
          discount: 0,
          paid_amount: isDraft ? 0 : totalAmount,
          payment_method: paymentMethod,
          items: [{
            product_id: parseInt(selectedProductId),
            quantity_box: parseInt(boxes) || 0,
            pcs_per_box: parseInt(pcsPerBox) || 1,
            total_sft: totalSft,
            unit_price: parseFloat(unitPrice) || 0
          }]
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert(isDraft ? 'Draft saved successfully!' : 'Sale recorded successfully!');
        if (!isDraft) {
          setTimeout(() => {
            window.print();
          }, 500);
        }
        fetchSales();
        // Reset form
        setCustomerName('');
        setSelectedProductId('');
        setBoxes('');
        setPcsPerBox('');
        setUnitPrice('');
      }
    } catch (error) {
      alert('Error saving sale');
    }
  };

  const handlePrint = (sale: any) => {
    // Create a temporary print window or just trigger print
    // For a real app, you'd render a printable component
    alert(`Printing Invoice: INV-${sale.id}\nCustomer: ${sale.customer_name}\nAmount: ৳${sale.total_amount}`);
    window.print();
  };

  const handleExport = () => {
    const date = new Date().toISOString().split('T')[0];
    window.location.href = `/api/export/sales?date=${date}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search invoices..."
            className="pl-8 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white" onClick={handleExport}>
            <FileText className="h-4 w-4" /> Export Report
          </Button>
          <Dialog>
            <DialogTrigger render={<Button className="gap-2 bg-[#0f172a] hover:bg-[#1e293b]" />}>
              <Plus className="h-4 w-4" /> New Sale Entry
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Sales Entry & SFT Calculator
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Product Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Customer Name</label>
                    <Input 
                      placeholder="Enter customer name" 
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Select Product</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                    >
                      <option value="">-- Search/Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.size})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Calculator Section */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Inventory Calculation</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Boxes</label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={boxes}
                        onChange={(e) => setBoxes(e.target.value)}
                        className="bg-white font-bold text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Pcs/Box</label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={pcsPerBox}
                        onChange={(e) => setPcsPerBox(e.target.value)}
                        className="bg-white font-bold text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">SFT/Pc</label>
                      <Input 
                        type="number" 
                        step="0.001"
                        value={sftPerPc}
                        onChange={(e) => setSftPerPc(e.target.value)}
                        className="bg-white font-bold text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Unit Price</label>
                      <Input 
                        type="number" 
                        placeholder="0"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="bg-white font-bold text-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Total Calculated Area:</span>
                    <div className="text-3xl font-black text-blue-600">
                      {totalSft.toFixed(2)} <span className="text-sm font-normal text-slate-400">SFT</span>
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button 
                      variant={paymentMethod === 'Cash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('Cash')}
                      className="gap-2"
                    >
                      <Wallet className="h-4 w-4" /> Cash
                    </Button>
                    <Button 
                      variant={paymentMethod === 'Bkash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('Bkash')}
                      className="gap-2"
                    >
                      <CreditCard className="h-4 w-4" /> Bkash
                    </Button>
                    <Button 
                      variant={paymentMethod === 'Bank' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('Bank')}
                      className="gap-2"
                    >
                      <Landmark className="h-4 w-4" /> Bank
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleSaveSale(true)}>Save Draft</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => handleSaveSale(false)}>
                  <Printer className="h-4 w-4" /> Print Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-bold text-slate-600">Invoice #</TableHead>
              <TableHead className="font-bold text-slate-600">Customer</TableHead>
              <TableHead className="font-bold text-slate-600">Date</TableHead>
              <TableHead className="font-bold text-slate-600">Total Amount</TableHead>
              <TableHead className="font-bold text-slate-600">Paid</TableHead>
              <TableHead className="font-bold text-slate-600">Due</TableHead>
              <TableHead className="font-bold text-slate-600">Status</TableHead>
              <TableHead className="text-right font-bold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading sales...</TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400">No sales recorded yet.</TableCell>
              </TableRow>
            ) : sales.map((sale) => (
              <TableRow key={sale.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="font-mono font-bold text-blue-600">INV-{sale.id}</TableCell>
                <TableCell className="font-medium">{sale.customer_name}</TableCell>
                <TableCell className="text-slate-500">{sale.date}</TableCell>
                <TableCell className="font-semibold">৳{sale.total_amount.toLocaleString()}</TableCell>
                <TableCell className="text-green-600 font-medium">৳{sale.paid_amount.toLocaleString()}</TableCell>
                <TableCell className={sale.due_amount > 0 ? "text-red-600 font-bold" : "text-slate-400"}>
                  ৳{sale.due_amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  {sale.due_amount === 0 ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Paid</Badge>
                  ) : sale.paid_amount > 0 ? (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Partial</Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Unpaid</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => handlePrint(sale)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
