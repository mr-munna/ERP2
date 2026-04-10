import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Package, ShoppingCart, Settings, Menu, X, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'purchase', label: 'Purchase', icon: Package },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#f0f2f5] text-[#1e293b] font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-64 bg-[#0f172a] text-white flex flex-col z-50 shadow-xl"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">M</div>
                <div>
                  <h1 className="font-bold text-lg tracking-tight leading-none">mavxon ERP</h1>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Enterprise Pro</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-6 border-t border-slate-800">
              <div className="bg-slate-800/50 rounded-2xl p-4">
                <p className="text-xs text-slate-400 mb-2">Logged in as</p>
                <p className="text-sm font-semibold truncate">bijoymahmudmunna@gmail.com</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-40 text-white">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-white hover:bg-slate-800">
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Bijoy Mahmud</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white">
              BM
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'inventory' && <Inventory />}
            {activeTab === 'sales' && <Sales />}
            {activeTab === 'purchase' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Purchase Orders</h3>
                  <Button className="bg-blue-600">New Purchase</Button>
                </div>
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No purchase records found. Start by adding a new order.</p>
                </div>
              </div>
            )}
            {activeTab === 'reports' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-sm">Sales Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-400">Generate detailed sales summary</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-sm">Stock Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-400">Current inventory levels and value</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-sm">Due Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-400">Outstanding payments by customer</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Business Name</label>
                      <Input defaultValue="mavxon ERP" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contact Number</label>
                      <Input defaultValue="+880 1XXX XXXXXX" />
                    </div>
                    <Button className="bg-blue-600">Save Changes</Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
