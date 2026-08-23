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
  Lock,
  Unlock,
  MapPin,
  Layers,
  Search,
  Cpu
} from 'lucide-react';

interface CustomerSummary {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  membership: string;
  account_status: string;
  created_at: string;
  orders_count: number;
}

interface Customer360 {
  profile: {
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    membership: string;
    account_status: string;
    city: string;
    state: string;
    country: string;
    created_at: string;
  };
  stats: {
    orders_count: number;
    total_spend: number;
    aov: number;
    returns_count: number;
    reviews_count: number;
    cancellations_count: number;
  };
  orders: Array<{
    order_id: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
  sessions: Array<{
    session_id: string;
    started_at: string;
    device: string;
    browser: string;
  }>;
  searches: Array<{
    query_text: string;
    search_count: number;
    updated_at: string;
  }>;
}

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Filters
  const [search, setSearch] = useState<string>('');
  const [membership, setMembership] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const country = '';

  // Customer 360 overlay
  const [is360Open, setIs360Open] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'sessions' | 'searches'>('profile');
  const [detail, setDetail] = useState<Customer360 | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const fetchCustomers = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      let url = `/api/admin/customers?search=${encodeURIComponent(search)}`;
      if (membership) url += `&membership=${membership}`;
      if (country) url += `&country=${country}`;
      if (status) url += `&status=${status}`;

      const res = await fetch(url, { headers: { 'Authorization': token } });
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch customer list.');
      setCustomers(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomer360 = async (customerId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setDetailLoading(true);
      const res = await fetch(`/api/admin/customers/360/${customerId}`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load customer 360 profile.');
      setDetail(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
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
    setAdmin(JSON.parse(adminData));
    fetchCustomers();
  }, [navigate, search, membership, country, status]);

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

  const handleOpen360 = (customerId: string) => {
    setActiveTab('profile');
    setIs360Open(true);
    fetchCustomer360(customerId);
  };

  const handleStatusToggle = async (targetStatus: 'ACTIVE' | 'SUSPENDED') => {
    const token = localStorage.getItem('adminToken');
    if (!token || !detail) return;

    if (admin?.role_id !== 'SUPER_ADMIN') {
      alert('Access Denied. Only SUPER_ADMIN users can suspend or unlock customer profiles.');
      return;
    }

    if (!window.confirm(`Are you sure you want to change this customer's status to ${targetStatus}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/customers/status/${detail.profile.customer_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle customer status.');

      alert(`Customer status updated successfully to: ${targetStatus}`);
      fetchCustomer360(detail.profile.customer_id);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && customers.length === 0) {
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
                    idx === 6
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

          {/* User Card in Sidebar Footer */}
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

        {/* MAIN BODY AREA */}
        <main className="flex-grow p-8 space-y-6 overflow-y-auto">
          {/* Header Panel */}
          <div>
            <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Customer Directory</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Explore profiles and detailed customer activity funnels</p>
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-wrap gap-4 items-center">
            
            {/* Search Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center space-x-2 flex-grow min-w-[200px] focus-within:border-[#0071DC] transition-all">
              <input
                type="text"
                placeholder="Search by ID, Name, or Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none w-full text-[#041E42]"
              />
            </div>

            {/* Membership Select */}
            <select
              value={membership}
              onChange={(e) => setMembership(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All Memberships</option>
              <option value="Premium">Premium Member</option>
              <option value="Standard">Standard Member</option>
            </select>

            {/* Status Select */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          {/* Customer Table */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Customer ID</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Membership</th>
                    <th className="pb-3 text-center">Orders Placed</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Overview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {customers.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2 font-mono font-bold text-[#0071DC]">{c.customer_id}</td>
                      <td className="py-4 font-bold text-[#041E42]">{c.first_name} {c.last_name}</td>
                      <td className="py-4 text-gray-500 font-mono">{c.email}</td>
                      <td className="py-4">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          c.membership === 'Premium' 
                            ? 'text-yellow-700 bg-yellow-50 border-yellow-200' 
                            : 'text-gray-600 bg-gray-50 border-gray-200'
                        }`}>
                          {c.membership}
                        </span>
                      </td>
                      <td className="py-4 text-center font-mono font-bold text-gray-700">{c.orders_count || 0}</td>
                      <td className="py-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          c.account_status === 'ACTIVE' 
                            ? 'text-green-700 bg-green-50 border-green-200' 
                            : c.account_status === 'SUSPENDED'
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : 'text-gray-500 bg-gray-50 border-gray-200'
                        }`}>
                          {c.account_status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button
                          onClick={() => handleOpen360(c.customer_id)}
                          className="flex items-center space-x-1 bg-blue-50/50 border border-blue-100 hover:bg-blue-100 text-[#0071DC] font-bold py-1.5 px-3.5 rounded-full transition-all inline-block text-[9.5px] uppercase"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>360 View</span>
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

      {/* CUSTOMER 360 DRAWER OVERLAY */}
      <AnimatePresence>
        {is360Open && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-[650px] border-l border-gray-250 shadow-2xl flex flex-col relative overflow-hidden font-sans text-[#041E42]"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-150 flex items-center justify-between mt-1.5">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Customer 360 Profile</h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase font-mono">{detail?.profile.customer_id}</span>
                </div>
                <button
                  onClick={() => setIs360Open(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailLoading || !detail ? (
                <div className="flex-grow flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col overflow-hidden">
                  
                  {/* Summary Card Header */}
                  <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="text-lg font-black">{detail.profile.first_name} {detail.profile.last_name}</h4>
                      <p className="text-xs text-gray-500 font-mono font-semibold">{detail.profile.email}</p>
                      
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        <span className="text-[9.5px] font-bold text-gray-700 bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded-full uppercase">
                          {detail.profile.membership} Member
                        </span>
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          detail.profile.account_status === 'ACTIVE' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
                        }`}>
                          {detail.profile.account_status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {admin?.role_id === 'SUPER_ADMIN' && (
                        detail.profile.account_status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusToggle('SUSPENDED')}
                            className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition-all shadow-sm flex items-center space-x-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspend Profile</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusToggle('ACTIVE')}
                            className="bg-green-50 hover:bg-green-100 border border-green-100 text-green-700 text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition-all shadow-sm flex items-center space-x-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unlock Profile</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Operational aggregations metrics desk */}
                  <div className="grid grid-cols-3 border-b border-gray-200 text-center divide-x divide-gray-150 bg-white">
                    <div className="py-4">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Orders</span>
                      <p className="text-xl font-mono font-black text-[#041E42] mt-0.5">{detail.stats.orders_count}</p>
                    </div>
                    <div className="py-4">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Spend Volume</span>
                      <p className="text-xl font-mono font-black text-green-600 mt-0.5">₹{detail.stats.total_spend.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="py-4">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Average Order Value</span>
                      <p className="text-xl font-mono font-black text-indigo-600 mt-0.5">₹{detail.stats.aov.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Tabs Navigation */}
                  <div className="flex border-b border-gray-200 bg-gray-50/50 text-xs font-bold">
                    {[
                      { key: 'profile', label: 'Geo & Stats' },
                      { key: 'orders', label: 'Recent Orders' },
                      { key: 'sessions', label: 'Activity Logs' },
                      { key: 'searches', label: 'Search History' }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex-grow py-3 border-b-2 text-center uppercase tracking-wider transition-colors ${
                          activeTab === tab.key 
                            ? 'border-[#0071DC] text-[#0071DC] bg-white' 
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-grow overflow-y-auto p-6">
                    {activeTab === 'profile' && (
                      <div className="space-y-4">
                        
                        {/* Geography */}
                        <div className="space-y-2 border-b border-gray-100 pb-4">
                          <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Customer Location Details</span>
                          </h5>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="bg-gray-50 border border-gray-150 p-3 rounded-2xl">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">State / Territory</span>
                              <p className="font-bold mt-0.5 text-gray-700">{detail.profile.state || 'Karnataka'}</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-150 p-3 rounded-2xl">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">City</span>
                              <p className="font-bold mt-0.5 text-gray-700">{detail.profile.city || 'Bengaluru'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Customer Health Indicators */}
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Operations Ratios</span>
                          </h5>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="border border-rose-100 bg-rose-50/20 p-3 rounded-2xl">
                              <span className="text-[9px] font-bold text-rose-500 uppercase">Returns</span>
                              <p className="text-lg font-mono font-black text-rose-700 mt-0.5">{detail.stats.returns_count}</p>
                            </div>
                            <div className="border border-amber-100 bg-amber-50/20 p-3 rounded-2xl">
                              <span className="text-[9px] font-bold text-amber-500 uppercase">Cancellations</span>
                              <p className="text-lg font-mono font-black text-amber-700 mt-0.5">{detail.stats.cancellations_count}</p>
                            </div>
                            <div className="border border-blue-100 bg-blue-50/20 p-3 rounded-2xl">
                              <span className="text-[9px] font-bold text-blue-500 uppercase">Reviews</span>
                              <p className="text-lg font-mono font-black text-blue-700 mt-0.5">{detail.stats.reviews_count}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'orders' && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Historical Order Transactions</h5>
                        {detail.orders.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No purchase history records found.</p>
                        ) : (
                          <div className="border border-gray-200 rounded-3xl divide-y divide-gray-100 bg-white overflow-hidden">
                            {detail.orders.map(ord => (
                              <div key={ord.order_id} className="p-4 flex items-center justify-between text-xs font-semibold">
                                <div>
                                  <p className="font-mono text-[#0071DC] font-bold">{ord.order_id}</p>
                                  <span className="text-[10px] text-gray-400">{new Date(ord.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-bold text-gray-700">₹{ord.total_amount.toLocaleString('en-IN')}</p>
                                  <span className="text-[9px] uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">
                                    {ord.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'sessions' && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Browsing Sessions (Last 5)</h5>
                        {detail.sessions.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No session tracking data available.</p>
                        ) : (
                          <div className="border border-gray-250 rounded-3xl divide-y divide-gray-100 bg-white overflow-hidden">
                            {detail.sessions.map(sess => (
                              <div key={sess.session_id} className="p-4 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-mono font-bold text-gray-700 truncate max-w-[200px]">{sess.session_id}</p>
                                  <span className="text-[10px] text-gray-400">{new Date(sess.started_at).toLocaleString()}</span>
                                </div>
                                <div className="text-right text-[10px] font-semibold text-gray-500 font-mono">
                                  <p>{sess.device} / {sess.browser}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'searches' && (
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Customer Search History</h5>
                        {detail.searches.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No query search history found.</p>
                        ) : (
                          <div className="border border-gray-250 rounded-3xl divide-y divide-gray-100 bg-white overflow-hidden">
                            {detail.searches.map(item => (
                              <div key={item.query_text} className="p-4 flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center space-x-2">
                                  <Search className="w-3.5 h-3.5 text-gray-400" />
                                  <p className="text-gray-700">"{item.query_text}"</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono text-[#0071DC]">{item.search_count} queries</p>
                                  <span className="text-[9.5px] text-gray-400">{new Date(item.updated_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
