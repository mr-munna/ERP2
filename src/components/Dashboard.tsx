import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, ShoppingCart, TrendingUp, AlertCircle, DollarSign, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayCollection: 0,
    totalDue: 0,
    lowStock: 0
  });
  const [pnl, setPnl] = useState({
    totalSales: 0,
    totalExpenses: 0,
    cogs: 0,
    netProfit: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    const fetchPnl = async () => {
      try {
        const response = await fetch('/api/analytics/pnl');
        const data = await response.json();
        setPnl(data);
      } catch (error) {
        console.error('Error fetching P&L stats:', error);
      }
    };

    const fetchSalesData = async () => {
      try {
        const response = await fetch('/api/sales');
        const data = await response.json();
        const formattedData = data.slice(0, 7).reverse().map((s: any) => ({
          name: s.date,
          amount: s.total_amount
        }));
        setChartData(formattedData);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      }
    };

    fetchStats();
    fetchPnl();
    fetchSalesData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">৳{stats.todaySales.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Real-time updates</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Collection</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">৳{stats.todayCollection.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Cash/Bank received</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">৳{stats.totalDue.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Pending payments</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Low Stock</CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.lowStock} Items</div>
            <p className="text-xs text-slate-400 mt-1">Requires reorder</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">৳{pnl.totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Expenses & COGS</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">৳{(pnl.totalExpenses + pnl.cogs).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={`text-white ${pnl.netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{pnl.netProfit.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Tiles', value: 45 },
                { name: 'Sanitary', value: 30 },
                { name: 'Fittings', value: 25 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
