import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  ShoppingBag, 
  Warehouse, 
  TrendingUp, 
  X,
  FolderOpen,
  Eye,
  Layers,
  MapPin,
  Compass,
  Package,
  Clock,
  Truck,
  AlertTriangle,
  Cpu,
  Plus
} from 'lucide-react';

interface WarehouseData {
  warehouse_id: string;
  warehouse_code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  capacity_units: number;
  status: string;
  current_utilization?: number;
}

interface StockItem {
  inventory_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  stock: number;
  reserved: number;
  damaged: number;
  reorder_level: number;
}

interface WarehouseAnalytics {
  ordersProcessed: number;
  avgProcessingTime: number;
  delayedOrdersPct: number;
  fulfillmentRate: number;
  cityDeliveries: Array<{ city: string; avg_days: number; count: number }>;
}

const DEFAULT_INITIAL_WAREHOUSES: WarehouseData[] = [
  {
    warehouse_id: 'WH001',
    warehouse_code: 'WH-BLR-01',
    name: 'Bengaluru Central Fulfillment Hub',
    address: 'Plot 45, Peenya Industrial Area',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postal_code: '560058',
    latitude: 13.0329,
    longitude: 77.5274,
    capacity_units: 150000,
    status: 'ACTIVE',
    current_utilization: 68500
  },
  {
    warehouse_id: 'WH002',
    warehouse_code: 'WH-MAA-01',
    name: 'Chennai Logistics Hub',
    address: '12, Sriperumbudur Expressway',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    postal_code: '602105',
    latitude: 12.9692,
    longitude: 79.9443,
    capacity_units: 120000,
    status: 'ACTIVE',
    current_utilization: 94200
  },
  {
    warehouse_id: 'WH003',
    warehouse_code: 'WH-BOM-01',
    name: 'Mumbai Metro Depot',
    address: 'Gate 3, Bhiwandi Logistics Park',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    postal_code: '421302',
    latitude: 19.2812,
    longitude: 73.0483,
    capacity_units: 200000,
    status: 'ACTIVE',
    current_utilization: 112000
  }
];

export default function AdminWarehousesPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>({ first_name: 'Admin', last_name: 'Operator', role_id: 'SUPER_ADMIN' });
  const [warehouses, setWarehouses] = useState<WarehouseData[]>(DEFAULT_INITIAL_WAREHOUSES);
  const [_loading, _setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Details Modal Drawer
  const [activeWh, setActiveWh] = useState<WarehouseData | null>(null);
  const [whDrawerOpen, setWhDrawerOpen] = useState<boolean>(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockLoading, setStockLoading] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<WarehouseAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'performance'>('inventory');

  // Add Warehouse Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addName, setAddName] = useState<string>('');
  const [addCode, setAddCode] = useState<string>('');
  const [addAddress, setAddAddress] = useState<string>('');
  const [addCity, setAddCity] = useState<string>('Bengaluru');
  const [addState, setAddState] = useState<string>('Karnataka');
  const [addPostalCode, setAddPostalCode] = useState<string>('560001');
  const [addCountry, _setAddCountry] = useState<string>('India');
  const [addCapacity, setAddCapacity] = useState<string>('150000');
  const [addLat, setAddLat] = useState<string>('12.9716');
  const [addLng, setAddLng] = useState<string>('77.5946');
  const [addStatus, _setAddStatus] = useState<string>('ACTIVE');
  const [addLoading, setAddLoading] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchWarehouses = async () => {
    const token = localStorage.getItem('adminToken') || 'ADMIN_BEARER_TOKEN';
    try {
      const res = await fetch(`/api/admin/warehouses?search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) {
        setWarehouses(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch warehouses API:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    if (!token || !adminData) {
      navigate('/admin/login');
      return;
    }
    try {
      setAdmin(JSON.parse(adminData));
    } catch (e) {
      navigate('/admin/login');
    }
    fetchWarehouses();
  }, [navigate, search]);

  const loadWarehouseDrawer = async (wh: WarehouseData) => {
    setActiveWh(wh);
    setWhDrawerOpen(true);
    setActiveTab('inventory');
    
    const token = localStorage.getItem('adminToken') || 'ADMIN_BEARER_TOKEN';

    try {
      setStockLoading(true);
      // Fetch Inventory
      const invRes = await fetch(`/api/admin/warehouses/${wh.warehouse_id}/inventory`, {
        headers: { 'Authorization': token }
      });
      const invData = await invRes.json();
      if (invRes.ok && Array.isArray(invData)) setStockItems(invData);

      // Fetch Analytics
      const analRes = await fetch(`/api/admin/warehouses/${wh.warehouse_id}/analytics`, {
        headers: { 'Authorization': token }
      });
      const analData = await analRes.json();
      if (analRes.ok) setAnalytics(analData);

    } catch (err: any) {
      showToast('Failed to load warehouse details.', 'error');
    } finally {
      setStockLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addCity) {
      showToast('Please specify a warehouse name and city.', 'error');
      return;
    }

    const token = localStorage.getItem('adminToken') || 'ADMIN_BEARER_TOKEN';
    setAddLoading(true);

    try {
      const res = await fetch('/api/admin/warehouses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          name: addName,
          warehouse_code: addCode || `WH-${addCity.substring(0, 3).toUpperCase()}-0${Math.floor(Math.random() * 9 + 1)}`,
          address: addAddress,
          city: addCity,
          state: addState,
          postal_code: addPostalCode,
          country: addCountry,
          capacity_units: Number(addCapacity) || 100000,
          latitude: Number(addLat) || 12.9716,
          longitude: Number(addLng) || 77.5946,
          status: addStatus
        })
      });

      const newWh = await res.json();
      if (res.ok) {
        showToast(`Warehouse '${newWh.name}' added successfully!`);
        setWarehouses(prev => [newWh, ...prev]);
        setIsAddModalOpen(false);
        setAddName('');
        setAddCode('');
        setAddAddress('');
      } else {
        showToast(newWh.error || 'Failed to create warehouse.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating warehouse.', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const getHealthColor = (utilPct: number) => {
    if (utilPct < 70) return 'text-emerald-500 border-emerald-500 bg-emerald-50';
    if (utilPct < 90) return 'text-amber-500 border-amber-500 bg-amber-50';
    return 'text-red-500 border-red-500 bg-red-50';
  };

  const getHealthText = (utilPct: number) => {
    if (utilPct < 70) return 'Safe Capacity';
    if (utilPct < 90) return 'Warning Utilization';
    return 'Critical Utilization';
  };

  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) || 
    w.city.toLowerCase().includes(search.toLowerCase()) ||
    w.warehouse_code.toLowerCase().includes(search.toLowerCase())
  );

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
        <aside className="w-64 bg-white border-r border-gray-250 flex flex-col justify-between flex-shrink-0">
          <div className="p-4 space-y-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-3">OPERATIONS DESK</p>

            <nav className="space-y-1">
              {[
                { name: 'Simulator', icon: <Cpu className="w-4 h-4" />, path: '/admin/simulator' },
                { name: 'Products', icon: <ShoppingBag className="w-4 h-4" />, path: '/admin/products' },
                { name: 'Categories', icon: <FolderOpen className="w-4 h-4" />, path: '/admin/categories' },
                { name: 'Operators', icon: <User className="w-4 h-4" />, path: '/admin/operators' },
                { name: 'Inventory', icon: <Warehouse className="w-4 h-4" />, path: '/admin/inventory' },
                { name: 'Orders', icon: <TrendingUp className="w-4 h-4" />, path: '/admin/orders' },
                { name: 'Customers', icon: <User className="w-4 h-4" />, path: '/admin/customers' },
                { name: 'Reviews', icon: <Eye className="w-4 h-4" />, path: '/admin/reviews' },
                { name: 'Coupons', icon: <Layers className="w-4 h-4" />, path: '/admin/coupons' },
                { name: 'Warehouses', icon: <Warehouse className="w-4 h-4" />, path: '/admin/warehouses' }
              ].map((item, idx) => (
                <div
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    idx === 9
                      ? 'bg-blue-50 text-[#0071DC] border-l-4 border-[#0071DC] rounded-l-none'
                      : 'text-gray-600 hover:text-[#0071DC] hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
                <User className="w-5 h-5 text-[#0071DC]" />
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-bold text-[#041E42] truncate">{admin?.first_name} {admin?.last_name}</p>
                <span className="text-[9px] font-bold text-[#041E42] uppercase tracking-wide bg-[#FFC220] px-2.5 py-0.5 rounded-full">
                  {admin?.role_id}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-grow p-8 space-y-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Warehouse & Fulfillment Center Management</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Physical fulfillment centers grid, coordinates, and real-time inventory sheets</p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 bg-[#0071DC] hover:bg-[#0046BE] text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-sm transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Warehouse</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex-grow max-w-md relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Warehouse by code, name, or city..."
                className="w-full bg-gray-50 text-[#041E42] pl-4 pr-10 py-2.5 rounded-full border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-medium text-xs shadow-inner"
              />
            </div>
            <span className="text-xs font-bold text-gray-400 font-mono">
              Showing {filteredWarehouses.length} Active Fulfillment Centers
            </span>
          </div>

          {/* Warehouse Grid Cards */}
          {filteredWarehouses.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-3xl text-gray-400 font-bold uppercase tracking-wider">
              No warehouses matched your search criteria
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredWarehouses.map((wh) => {
                const util = wh.current_utilization || 0;
                const capacity = wh.capacity_units || 100000;
                const utilPct = Math.min(100, Math.floor((util / capacity) * 100));
                
                return (
                  <div key={wh.warehouse_id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-widest block">{wh.warehouse_code}</span>
                          <h3 className="text-base font-black text-[#041E42] leading-tight">{wh.name}</h3>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${getHealthColor(utilPct)}`}>
                          {getHealthText(utilPct)}
                        </span>
                      </div>

                      <div className="flex items-start space-x-2 text-xs text-gray-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span>{wh.address}, {wh.city}, {wh.state}, {wh.country} - {wh.postal_code}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
                        <Compass className="w-3.5 h-3.5 text-gray-400" />
                        <span>GPS Coordinates: {Number(wh.latitude || 12.9716).toFixed(4)}, {Number(wh.longitude || 77.5946).toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between text-xs font-bold text-gray-600">
                        <span>Fulfillment Load</span>
                        <span>{utilPct}% ({util.toLocaleString()} / {capacity.toLocaleString()} units)</span>
                      </div>
                      
                      <div className="bg-gray-150 h-2.5 rounded-full overflow-hidden w-full">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            utilPct < 70 ? 'bg-emerald-500' : utilPct < 90 ? 'bg-amber-400' : 'bg-red-500'
                          }`} 
                          style={{ width: `${utilPct}%` }}
                        ></div>
                      </div>
                    </div>

                    <button
                      onClick={() => loadWarehouseDrawer(wh)}
                      className="w-full bg-gray-50 hover:bg-gray-100 text-[#0071DC] text-xs font-black uppercase tracking-wider py-2.5 rounded-2xl transition-all border border-gray-150 mt-2"
                    >
                      Stock Sheet & Performance
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ADD WAREHOUSE MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-150 pb-3">
                <h3 className="text-base font-black text-[#041E42] uppercase tracking-tight">Add New Fulfillment Warehouse</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs font-bold text-gray-600">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Warehouse Name *</label>
                    <input
                      type="text"
                      required
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="e.g. Delhi NCR Fulfillment Center"
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Warehouse Code</label>
                    <input
                      type="text"
                      value={addCode}
                      onChange={(e) => setAddCode(e.target.value)}
                      placeholder="e.g. WH-DEL-01 (Auto-generated if empty)"
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Street Address</label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="e.g. Plot 88, Okhla Industrial Area Phase 3"
                    className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">City *</label>
                    <input
                      type="text"
                      required
                      value={addCity}
                      onChange={(e) => setAddCity(e.target.value)}
                      placeholder="e.g. New Delhi"
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">State</label>
                    <input
                      type="text"
                      value={addState}
                      onChange={(e) => setAddState(e.target.value)}
                      placeholder="e.g. Delhi"
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Postal Code</label>
                    <input
                      type="text"
                      value={addPostalCode}
                      onChange={(e) => setAddPostalCode(e.target.value)}
                      placeholder="e.g. 110020"
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Capacity (Units)</label>
                    <input
                      type="number"
                      value={addCapacity}
                      onChange={(e) => setAddCapacity(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Latitude</label>
                    <input
                      type="text"
                      value={addLat}
                      onChange={(e) => setAddLat(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Longitude</label>
                    <input
                      type="text"
                      value={addLng}
                      onChange={(e) => setAddLng(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] border border-gray-250 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-3 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 rounded-full border border-gray-250 text-gray-500 font-bold uppercase tracking-wider text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-6 py-2.5 rounded-full bg-[#0071DC] hover:bg-[#0046BE] text-white font-black uppercase tracking-wider text-[10px] shadow-sm disabled:opacity-50"
                  >
                    {addLoading ? 'Saving...' : 'Add Warehouse'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILS SLIDING DRAWER */}
      <AnimatePresence>
        {whDrawerOpen && activeWh && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-[650px] border-l border-gray-250 shadow-2xl flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              {/* Header */}
              <div className="p-6 border-b border-gray-150 flex items-center justify-between mt-1.5">
                <div>
                  <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">{activeWh.name}</h3>
                  <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">{activeWh.warehouse_code}</span>
                </div>
                <button
                  onClick={() => setWhDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-50 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-150 bg-gray-50 px-6">
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === 'inventory' ? 'border-[#0071DC] text-[#0071DC]' : 'border-transparent text-gray-400'
                  }`}
                >
                  Stock inventory
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === 'performance' ? 'border-[#0071DC] text-[#0071DC]' : 'border-transparent text-gray-400'
                  }`}
                >
                  Performance Analytics
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {activeTab === 'inventory' ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-[#041E42] tracking-wider">Inventory Stock Sheet</h4>
                    
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-inner">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 font-black uppercase text-[9px] tracking-wider text-gray-500">
                          <tr>
                            <th className="py-3 px-4">Product Name</th>
                            <th className="py-3 px-4">SKU</th>
                            <th className="py-3 px-4 text-center">Available</th>
                            <th className="py-3 px-4 text-center">Reserved</th>
                            <th className="py-3 px-4 text-center">Damaged</th>
                            <th className="py-3 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                          {stockLoading ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6">
                                <div className="w-5 h-5 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto"></div>
                              </td>
                            </tr>
                          ) : stockItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-gray-400">No stock records in warehouse</td>
                            </tr>
                          ) : (
                            stockItems.map((item) => {
                              const totalStock = item.stock;
                              const isLow = totalStock <= item.reorder_level;
                              return (
                                <tr key={item.inventory_id} className="hover:bg-gray-50/50">
                                  <td className="py-3 px-4 font-bold max-w-[200px] truncate">{item.product_name}</td>
                                  <td className="py-3 px-4 font-mono text-gray-500 text-[10px]">{item.sku}</td>
                                  <td className="py-3 px-4 text-center font-bold">{item.stock.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-center text-blue-600 font-bold">{item.reserved.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-center text-red-500 font-bold">{item.damaged.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-center">
                                    {isLow ? (
                                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[9px] font-black uppercase flex items-center justify-center gap-0.5">
                                        <AlertTriangle className="w-3 h-3" /> LOW
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase">OK</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 text-xs font-semibold text-gray-600">
                    
                    {/* Performance Cards */}
                    {(() => {
                      const perf = analytics || { ordersProcessed: 14250, avgProcessingTime: 3.2, delayedOrdersPct: 1.8, fulfillmentRate: 98.4 };
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center space-x-3">
                            <Package className="w-8 h-8 text-[#0071DC]" />
                            <div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Orders Processed</span>
                              <span className="text-base font-black text-[#041E42]">{(perf.ordersProcessed || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center space-x-3">
                            <Clock className="w-8 h-8 text-amber-500" />
                            <div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Avg Processing Time</span>
                              <span className="text-base font-black text-[#041E42]">{perf.avgProcessingTime || 3.2} hrs</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center space-x-3">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                            <div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Delayed Orders</span>
                              <span className="text-base font-black text-[#041E42]">{perf.delayedOrdersPct || 1.8}%</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center space-x-3">
                            <Truck className="w-8 h-8 text-emerald-500" />
                            <div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Fulfillment Rate</span>
                              <span className="text-base font-black text-[#041E42]">{perf.fulfillmentRate || 98.4}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Delivery Speeds by City */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-[#041E42] tracking-wider">Geographic Delivery Speed Breakdown</h4>
                      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-inner">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-50 border-b border-gray-200 font-black uppercase text-[9px] tracking-wider text-gray-500">
                            <tr>
                              <th className="py-3 px-4">Destination City</th>
                              <th className="py-3 px-4 text-center">Fulfillment Count</th>
                              <th className="py-3 px-4 text-center">Avg Transit Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                            {analytics?.cityDeliveries && analytics.cityDeliveries.length > 0 ? (
                              analytics.cityDeliveries.map((city, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="py-3 px-4 font-bold">{city.city}</td>
                                  <td className="py-3 px-4 text-center">{city.count.toLocaleString()} orders</td>
                                  <td className="py-3 px-4 text-center text-[#0071DC] font-bold">{Number(city.avg_days).toFixed(1)} days</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="text-center py-6 text-gray-400">No transit performance records loaded</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-gray-150 bg-gray-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setWhDrawerOpen(false)}
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-100 p-4 rounded-2xl shadow-xl flex items-center space-x-2 border font-bold text-xs ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
