import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  ShoppingBag,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  RotateCcw
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface InventoryItem {
  inventory_id: string;
  product_id: string;
  warehouse_id: string;
  stock: number;
  reserved_stock: number;
  damaged_stock: number;
  reorder_level: number;
  product_name: string;
  sku: string;
  brand: string;
  category_id: string;
  warehouse_name: string;
}

const WAREHOUSES = [
  { id: 'WH001', name: 'BLR-01 (Bengaluru)' },
  { id: 'WH002', name: 'MUM-01 (Mumbai)' },
  { id: 'WH003', name: 'DEL-01 (Delhi)' },
  { id: 'WH004', name: 'HYD-01 (Hyderabad)' },
  { id: 'WH005', name: 'MAA-01 (Chennai)' }
];

const CATEGORIES = [
  { id: 'CAT001', name: 'Electronics' },
  { id: 'CAT002', name: 'Fashion' },
  { id: 'CAT003', name: 'Home & Kitchen' },
  { id: 'CAT004', name: 'Grocery & Gourmet' },
  { id: 'CAT005', name: 'Beauty & Personal Care' }
];

export default function AdminInventoryPage() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Filters
  const [search, setSearch] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'RESTOCK' | 'DISPATCH' | 'RESERVE' | 'RELEASE' | 'DAMAGE' | 'ADJUST'>('RESTOCK');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const fetchInventory = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      let url = `/api/admin/inventory?search=${encodeURIComponent(search)}`;
      if (warehouseId) url += `&warehouseId=${warehouseId}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      if (statusFilter) url += `&statusFilter=${statusFilter}`;

      const res = await fetch(url, { headers: { 'Authorization': token } });
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch inventory levels.');
      setInventory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    if (!token || !adminData) {
      localStorage.clear();
      navigate('/admin/login');
      return;
    }
    fetchInventory();
  }, [navigate, search, warehouseId, categoryId, statusFilter]);

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        await fetch('/api/admin/auth/logout', { method: 'POST', headers: { 'Authorization': token } });
      } catch (e) {}
    }
    localStorage.clear();
    navigate('/admin/login');
  };

  const handleOpenAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustType('RESTOCK');
    setAmount(10);
    setReason('Warehouse Restock');
    setFormError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    const token = localStorage.getItem('adminToken');
    if (!token || !selectedItem) return;

    if (amount <= 0 && adjustType !== 'ADJUST') {
      setFormError('Please enter a positive adjust quantity.');
      return;
    }

    const payload = {
      productId: selectedItem.product_id,
      warehouseId: selectedItem.warehouse_id,
      amount,
      type: adjustType,
      reason
    };

    try {
      setFormLoading(true);
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Adjustment failed.');

      setSuccess('Inventory stock adjusted successfully.');
      setIsModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Metrics calculators
  const totalSKUs = inventory.length;
  const inStock = inventory.filter(item => item.stock > item.reorder_level).length;
  const lowStock = inventory.filter(item => item.stock > 0 && item.stock <= item.reorder_level).length;
  const outOfStock = inventory.filter(item => item.stock === 0).length;

  if (loading && inventory.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      {/* HEADER NAVBAR */}
      <header className="bg-[#0071DC] text-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-black tracking-tight">NexDay</span>
            <span className="text-[9px] font-bold tracking-widest text-[#FFC220] uppercase font-mono pl-0.5">Admin Portal</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1.5 text-xs font-bold bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Customer View</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 text-xs font-bold border border-white/20 bg-blue-900/30 hover:bg-blue-900/50 text-white px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex">
        {/* SIDEBAR NAVIGATION */}
        <AdminSidebar />

        {/* MAIN BODY AREA */}
        <main className="flex-grow p-8 space-y-6 overflow-y-auto">
          {/* Header Panel */}
          <div>
            <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Inventory Management</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Warehouse-level stocks, reserves, & safety reorders</p>
          </div>

          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Total SKUs', value: totalSKUs, color: 'text-[#041E42] border-gray-200' },
              { label: 'In Stock', value: inStock, color: 'text-green-600 border-green-200' },
              { label: 'Low Stock', value: lowStock, color: 'text-amber-600 border-amber-200' },
              { label: 'Out of Stock', value: outOfStock, color: 'text-red-600 border-red-200' }
            ].map((kpi) => (
              <div key={kpi.label} className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between ${kpi.color}`}>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{kpi.label}</span>
                <p className="text-3xl font-black mt-2 font-mono">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-wrap gap-4 items-center">
            
            {/* Search Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center space-x-2 flex-grow min-w-[200px] focus-within:border-[#0071DC] transition-all">
              <input
                type="text"
                placeholder="Search by SKU, Brand, Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none w-full text-[#041E42]"
              />
            </div>

            {/* Warehouse Select */}
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All Warehouses</option>
              {WAREHOUSES.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {/* Category Select */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All Statuses</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="IN_STOCK">In Stock</option>
            </select>

            {/* Reset Button */}
            <button
              onClick={() => { setSearch(''); setWarehouseId(''); setCategoryId(''); setStatusFilter(''); }}
              className="text-gray-400 hover:text-[#0071DC] transition-all p-2 rounded-xl"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback alerts */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3 text-green-700 text-xs">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Inventory Table */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Product Name</th>
                    <th className="pb-3">SKU Code</th>
                    <th className="pb-3">Warehouse</th>
                    <th className="pb-3 text-center">Available Stock</th>
                    <th className="pb-3 text-center">Reserved</th>
                    <th className="pb-3 text-center">Damaged</th>
                    <th className="pb-3 text-center">Safety Reorder</th>
                    <th className="pb-3 text-right pr-2">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {inventory.map((item) => (
                    <tr key={item.inventory_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2">
                        <p className="font-bold text-[#041E42]">{item.product_name}</p>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">{item.brand}</span>
                      </td>
                      <td className="py-4 font-mono text-gray-500">{item.sku}</td>
                      <td className="py-4 text-gray-600 font-semibold">{item.warehouse_name}</td>
                      <td className="py-4 text-center">
                        <span className={`font-mono font-bold text-sm ${
                          item.stock === 0 
                            ? 'text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full' 
                            : item.stock <= item.reorder_level 
                            ? 'text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full' 
                            : 'text-green-600'
                        }`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="py-4 text-center font-mono text-blue-600 font-bold">{item.reserved_stock}</td>
                      <td className="py-4 text-center font-mono text-rose-600 font-bold">{item.damaged_stock || 0}</td>
                      <td className="py-4 text-center font-mono text-gray-400">{item.reorder_level}</td>
                      <td className="py-4 text-right pr-2">
                        <button
                          onClick={() => handleOpenAdjustModal(item)}
                          className="flex items-center space-x-1.5 border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-[#0071DC] font-bold py-1.5 px-3 rounded-full transition-all inline-block text-[10px] uppercase"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ADJUSTMENT OVERLAY MODAL */}
      <AnimatePresence>
        {isModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-lg w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-150">
                <div>
                  <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">
                    Adjust Inventory Stock
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{selectedItem.product_name}</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Warehouse indicator */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex justify-between text-xs font-semibold text-gray-600">
                  <span>Warehouse location:</span>
                  <span className="text-[#041E42] font-bold">{selectedItem.warehouse_name}</span>
                </div>

                {/* Adjustment Action Select */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Action Type *</label>
                  <select
                    value={adjustType}
                    onChange={(e: any) => setAdjustType(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm cursor-pointer"
                  >
                    <option value="RESTOCK">RESTOCK (+ stock to Available)</option>
                    <option value="DISPATCH">DISPATCH (- stock from Available)</option>
                    <option value="RESERVE">RESERVE (+ stock to Reserved, - from Available)</option>
                    <option value="RELEASE">RELEASE (- stock from Reserved, + to Available)</option>
                    <option value="DAMAGE">MARK DAMAGED (+ stock to Damaged, - from Available)</option>
                    <option value="ADJUST">ADJUST OVERWRITE (Set Available count directly)</option>
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Quantity amount *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm font-mono"
                  />
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Adjustment Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="Warehouse Restock / Damaged Inspection / Manual Correction"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-blue-300 text-white font-black py-3 rounded-full transition-all uppercase tracking-wider text-xs shadow-md mt-4 flex items-center justify-center space-x-2"
                >
                  {formLoading ? 'Executing adjustment...' : 'Confirm Adjustment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
