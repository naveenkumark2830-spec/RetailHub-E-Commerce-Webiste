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
  Plus,
  Cpu
} from 'lucide-react';

interface Coupon {
  coupon_id: string;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  minimum_order_value: number;
  maximum_discount: number;
  start_date: string;
  end_date: string;
  usage_limit: number;
  usage_count: number;
  status: string;
}

interface CouponAnalytics {
  usageCount: number;
  totalDiscount: number;
  revenueGenerated: number;
  aovWithCoupon: number;
  aovWithoutCoupon: number;
  usageByState: Array<{ state: string; count: number; discount: number }>;
}

export default function AdminCouponsPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Create Coupon Modal Form Drawer
  const [isOpenForm, setIsOpenForm] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrder, setMinOrder] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<number>(99999);
  const [usageLimit, setUsageLimit] = useState<number>(1000);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [couponStatus, setCouponStatus] = useState<string>('ACTIVE');
  const [formLoading, setFormLoading] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCoupons = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      setLoading(true);
      let url = `/api/admin/coupons?search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;

      const res = await fetch(url, { headers: { 'Authorization': token } });
      const data = await res.json();
      if (res.ok) {
        setCoupons(data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch coupons.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/coupons/analytics', { headers: { 'Authorization': token } });
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load coupon analytics:', err);
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
    fetchCoupons();
    fetchAnalytics();
  }, [navigate, search, status]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setFormLoading(true);
      const res = await fetch('/api/admin/coupons/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          discount_type: discountType,
          discount_value: discountValue,
          minimum_order_value: minOrder,
          maximum_discount: maxDiscount,
          usage_limit: usageLimit,
          start_date: startDate,
          end_date: endDate,
          status: couponStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon.');

      showToast('New coupon code created successfully.', 'success');
      setIsOpenForm(false);
      // Reset Form Fields
      setCode('');
      setDiscountType('percentage');
      setDiscountValue(10);
      setMinOrder(0);
      setMaxDiscount(99999);
      setUsageLimit(1000);
      setStartDate('');
      setEndDate('');
      setCouponStatus('ACTIVE');

      fetchCoupons();
      fetchAnalytics();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (couponId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/coupons/${couponId}/deactivate`, {
        method: 'PUT',
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate coupon.');

      showToast('Coupon deactivated successfully.', 'success');
      fetchCoupons();
      fetchAnalytics();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const isExpired = (endDateStr: string) => {
    return new Date() > new Date(endDateStr);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* HEADER */}
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
        {/* SIDEBAR */}
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
                    idx === 8
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Coupon Management</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Configure discounts, limit usage counts, and measure coupon campaign ROI</p>
            </div>
            <button
              onClick={() => setIsOpenForm(true)}
              className="bg-[#0071DC] hover:bg-[#0046BE] text-white text-xs font-black uppercase tracking-wider py-2.5 px-6 rounded-full transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Coupon
            </button>
          </div>

          {/* Stats Bar */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Usage Count Today</span>
                <span className="text-2xl font-black text-[#041E42] block mt-1">{analytics.usageCount.toLocaleString()}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Total checkout usages</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Discount Given</span>
                <span className="text-2xl font-black text-amber-500 block mt-1">₹{Number(analytics.totalDiscount).toLocaleString('en-IN')}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Direct marketing deductions</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Revenue Generated</span>
                <span className="text-2xl font-black text-[#0071DC] block mt-1">₹{Number(analytics.revenueGenerated).toLocaleString('en-IN')}</span>
                <span className="text-xs text-emerald-600 font-bold block mt-1">Orders with coupon code</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Campaign AOV Uplift</span>
                <span className="text-2xl font-black text-emerald-600 block mt-1">
                  +₹{Math.max(0, Math.floor(analytics.aovWithCoupon - analytics.aovWithoutCoupon)).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-gray-500 font-bold block mt-1">AOV: ₹{Math.floor(analytics.aovWithCoupon)} vs ₹{Math.floor(analytics.aovWithoutCoupon)}</span>
              </div>
            </div>
          )}

          {/* Filters Panel */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-wrap gap-4 items-center">
            {/* Search Box */}
            <div className="flex-grow max-w-sm relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Coupon Code..."
                className="w-full bg-gray-50 text-[#041E42] pl-4 pr-10 py-2.5 rounded-full border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-medium text-xs shadow-inner"
              />
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-gray-50 text-[#041E42] px-3 py-2.5 rounded-full border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-bold text-xs cursor-pointer shadow-sm"
              >
                <option value="">Status [All]</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Coupons Table */}
          <div className="bg-white border border-gray-250 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[#041E42] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-4 px-6">Coupon Code</th>
                    <th className="py-4 px-6">Discount Rules</th>
                    <th className="py-4 px-6">Min Order</th>
                    <th className="py-4 px-6">Max Discount</th>
                    <th className="py-4 px-6">Usages Limit</th>
                    <th className="py-4 px-6">Valid Period</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs font-semibold text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : coupons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400 font-bold uppercase tracking-wider">No coupons configured</td>
                    </tr>
                  ) : (
                    coupons.map((cpn) => {
                      const expired = isExpired(cpn.end_date);
                      return (
                        <tr key={cpn.coupon_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="bg-blue-50 text-[#0071DC] border border-blue-200 px-3 py-1 rounded-lg font-mono font-black text-xs">
                              {cpn.code}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold">
                            {cpn.discount_type === 'percentage' ? `${Number(cpn.discount_value)}% OFF` : `₹${Number(cpn.discount_value).toLocaleString()} OFF`}
                          </td>
                          <td className="py-4 px-6 text-gray-500">₹{Number(cpn.minimum_order_value).toLocaleString()}</td>
                          <td className="py-4 px-6 text-gray-500">₹{Number(cpn.maximum_discount).toLocaleString()}</td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-[#041E42]">{cpn.usage_count}</span>
                            <span className="text-gray-400 font-medium"> / {cpn.usage_limit} limit</span>
                          </td>
                          <td className="py-4 px-6 text-[11px] text-gray-400">
                            {new Date(cpn.start_date).toLocaleDateString()} - {new Date(cpn.end_date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6">
                            {expired ? (
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-black tracking-wide uppercase">EXPIRED</span>
                            ) : cpn.status === 'ACTIVE' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-black tracking-wide uppercase">ACTIVE</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[9px] font-black tracking-wide uppercase">INACTIVE</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {cpn.status === 'ACTIVE' && !expired ? (
                              <button
                                onClick={() => handleDeactivate(cpn.coupon_id)}
                                className="border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider transition-all"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <span className="text-gray-300 font-bold uppercase tracking-wider text-[10px]">Locked</span>
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
        </main>
      </div>

      {/* CREATE COUPON DRAWER MODAL */}
      <AnimatePresence>
        {isOpenForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-[450px] border-l border-gray-250 shadow-2xl flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>
              
              {/* Header */}
              <div className="p-6 border-b border-gray-150 flex items-center justify-between mt-1.5">
                <div>
                  <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Create Promo Coupon</h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configure new discount rules and campaign windows</span>
                </div>
                <button
                  onClick={() => setIsOpenForm(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateCoupon} className="flex-grow flex flex-col justify-between overflow-hidden">
                <div className="flex-grow overflow-y-auto p-6 space-y-4 text-xs font-semibold text-gray-600">
                  
                  {/* Coupon Code */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Coupon Code *</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. FESTIVE20"
                      className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-mono font-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Discount Type */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Discount Type *</label>
                      <select
                        value={discountType}
                        onChange={(e: any) => setDiscountType(e.target.value)}
                        className="w-full bg-gray-50 text-[#041E42] px-3 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-bold cursor-pointer"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat Cash (₹)</option>
                      </select>
                    </div>

                    {/* Discount Value */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Discount Value *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Min Order Value */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Minimum Order Value *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={minOrder}
                        onChange={(e) => setMinOrder(Number(e.target.value))}
                        className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all"
                      />
                    </div>

                    {/* Max Discount Limit */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Maximum Discount Limit *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={maxDiscount}
                        onChange={(e) => setMaxDiscount(Number(e.target.value))}
                        className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Total Usages Limit */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Total Campaign Usage Limit *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(Number(e.target.value))}
                      className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Campaign Start Date *</label>
                      <input
                        type="datetime-local"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-gray-50 text-[#041E42] px-3 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all cursor-pointer"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Campaign End Date *</label>
                      <input
                        type="datetime-local"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-gray-50 text-[#041E42] px-3 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Initial Status */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Initial Status *</label>
                    <select
                      value={couponStatus}
                      onChange={(e) => setCouponStatus(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2.5 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-bold cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-gray-150 bg-gray-50 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpenForm(false)}
                    className="flex-grow border border-gray-200 hover:bg-gray-100 bg-white text-gray-600 font-bold py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-grow bg-[#0071DC] hover:bg-[#0046BE] text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px]"
                  >
                    {formLoading ? 'Creating...' : 'Create Coupon'}
                  </button>
                </div>
              </form>
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
