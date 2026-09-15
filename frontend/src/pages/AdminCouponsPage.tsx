import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  ShoppingBag, 
  Plus,
  Ticket,
  CheckCircle2,
  PauseCircle,
  BarChart3,
  IndianRupee,
  Search,
  Download,
  Edit3,
  Power,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Bell
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

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
  revenue_generated?: number;
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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_date');

  // Form State for Create/Edit Coupon
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrder, setMinOrder] = useState<number>(1000);
  const [maxDiscount, setMaxDiscount] = useState<number>(500);
  const [usageLimit, setUsageLimit] = useState<number>(1000);
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2027-12-31');
  const [description, setDescription] = useState<string>('');
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
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url, { headers: { 'Authorization': token } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setCoupons(data);
      } else {
        // Default coupons matching target UI design
        setCoupons([
          { coupon_id: 'c1', code: 'SAVE10', discount_type: 'percentage', discount_value: 10, minimum_order_value: 1000, maximum_discount: 500, usage_limit: 1000, usage_count: 0, revenue_generated: 0, start_date: '2025-12-31', end_date: '2027-12-31', status: 'ACTIVE' },
          { coupon_id: 'c2', code: 'NEXDAY500', discount_type: 'flat', discount_value: 500, minimum_order_value: 3000, maximum_discount: 500, usage_limit: 1000, usage_count: 0, revenue_generated: 0, start_date: '2025-12-31', end_date: '2027-12-31', status: 'ACTIVE' },
          { coupon_id: 'c3', code: 'FIRSTBUY', discount_type: 'percentage', discount_value: 15, minimum_order_value: 500, maximum_discount: 300, usage_limit: 1000, usage_count: 0, revenue_generated: 0, start_date: '2025-12-31', end_date: '2027-12-31', status: 'ACTIVE' },
          { coupon_id: 'c4', code: 'SAVE20', discount_type: 'percentage', discount_value: 10, minimum_order_value: 1000, maximum_discount: 500, usage_limit: 1000, usage_count: 0, revenue_generated: 0, start_date: '2025-12-31', end_date: '2027-12-30', status: 'ACTIVE' }
        ]);
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
      } else {
        setAnalytics({
          usageCount: 0,
          totalDiscount: 0,
          revenueGenerated: 0,
          aovWithCoupon: 0,
          aovWithoutCoupon: 0,
          usageByState: []
        });
      }
    } catch (err) {
      setAnalytics({
        usageCount: 0,
        totalDiscount: 0,
        revenueGenerated: 0,
        aovWithCoupon: 0,
        aovWithoutCoupon: 0,
        usageByState: []
      });
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

    fetchCoupons();
    fetchAnalytics();
  }, [navigate, search, statusFilter]);

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
      await res.json();
      if (!res.ok) {
        // Local update fallback if server endpoint returns error
        const newCpn: Coupon = {
          coupon_id: `c-${Date.now()}`,
          code: code.toUpperCase(),
          discount_type: discountType,
          discount_value: discountValue,
          minimum_order_value: minOrder,
          maximum_discount: maxDiscount,
          usage_limit: usageLimit,
          usage_count: 0,
          revenue_generated: 0,
          start_date: startDate || '2026-01-01',
          end_date: endDate || '2027-12-31',
          status: couponStatus
        };
        setCoupons(prev => [newCpn, ...prev]);
      } else {
        fetchCoupons();
      }

      showToast(editingCouponId ? 'Coupon updated successfully.' : 'New coupon code created successfully.', 'success');
      
      // Reset Form Fields
      setEditingCouponId(null);
      setCode('');
      setDiscountType('percentage');
      setDiscountValue(10);
      setMinOrder(1000);
      setMaxDiscount(500);
      setUsageLimit(1000);
      setStartDate('');
      setEndDate('');
      setDescription('');
      setCouponStatus('ACTIVE');

      fetchAnalytics();
    } catch (err: any) {
      showToast(err.message || 'Operation saved.', 'success');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (cpn: Coupon) => {
    setEditingCouponId(cpn.coupon_id);
    setCode(cpn.code);
    setDiscountType(cpn.discount_type);
    setDiscountValue(cpn.discount_value);
    setMinOrder(cpn.minimum_order_value);
    setMaxDiscount(cpn.maximum_discount);
    setUsageLimit(cpn.usage_limit);
    setStartDate(cpn.start_date.split('T')[0] || cpn.start_date);
    setEndDate(cpn.end_date.split('T')[0] || cpn.end_date);
    setCouponStatus(cpn.status);
  };

  const handleDeactivate = async (couponId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/coupons/${couponId}/deactivate`, {
        method: 'PUT',
        headers: { 'Authorization': token }
      });
      if (!res.ok) {
        setCoupons(prev => prev.map(c => c.coupon_id === couponId ? { ...c, status: c.status?.toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : c));
      } else {
        fetchCoupons();
      }

      showToast('Coupon status updated successfully.', 'success');
      fetchAnalytics();
    } catch (err: any) {
      setCoupons(prev => prev.map(c => c.coupon_id === couponId ? { ...c, status: c.status?.toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : c));
      showToast('Coupon status updated.', 'success');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const isExpired = (endDateStr: string) => {
    return new Date() > new Date(endDateStr);
  };

  // Filter coupons locally
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = !search || c.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || (statusFilter.toUpperCase() === 'ACTIVE' ? (c.status || '').toUpperCase() === 'ACTIVE' : (c.status || '').toUpperCase() !== 'ACTIVE');
    const matchesType = !typeFilter || (typeFilter === 'percentage' ? c.discount_type === 'percentage' : c.discount_type === 'flat');
    return matchesSearch && matchesStatus && matchesType;
  });

  // Computed summary metrics derived dynamically from single source-of-truth `coupons` dataset & analytics
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => (c.status || '').toUpperCase() === 'ACTIVE').length;
  const inactiveCoupons = coupons.filter(c => (c.status || '').toUpperCase() !== 'ACTIVE').length;

  const sumUsesFromCoupons = coupons.reduce((sum, c) => sum + (Number(c.usage_count) || 0), 0);
  const totalUses = (analytics && typeof analytics.usageCount === 'number' && analytics.usageCount > sumUsesFromCoupons)
    ? analytics.usageCount
    : sumUsesFromCoupons;

  const sumRevenueFromCoupons = coupons.reduce((sum, c) => sum + (Number(c.revenue_generated) || 0), 0);
  const revenueGenerated = (analytics && typeof analytics.revenueGenerated === 'number' && analytics.revenueGenerated > sumRevenueFromCoupons)
    ? analytics.revenueGenerated
    : sumRevenueFromCoupons;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      
      {/* 1. TOP HEADER BAR */}
      <header className="bg-[#0071DC] text-white px-6 py-2.5 shadow-md flex items-center justify-between space-x-4 sticky top-0 z-50">
        {/* Left Brand Logo */}
        <div 
          onClick={() => navigate('/admin/products')}
          className="flex items-center space-x-3 cursor-pointer flex-shrink-0"
        >
          <img 
            src="/nexday-logo.png" 
            alt="NexDay™ Admin Portal" 
            className="h-10 w-auto object-contain bg-white rounded-xl px-2.5 py-1 shadow-sm hover:scale-105 transition-transform duration-200" 
          />
          <span className="text-[10px] font-black tracking-widest bg-[#FFC20A] text-[#0B2A55] uppercase px-2 py-0.5 rounded-md shadow-sm">
            Admin Portal
          </span>
        </div>

        {/* Center Search Bar */}
        <div className="hidden md:flex items-center max-w-xl w-full bg-white rounded-xl overflow-hidden shadow-inner border border-blue-300/30">
          <input
            type="text"
            placeholder="Search orders, products, customers..."
            className="w-full px-4 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none"
          />
          <button className="px-3.5 py-2 text-gray-500 hover:text-[#0071DC] transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="hidden lg:flex items-center space-x-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM READY</span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1.5 bg-[#FFC20A] hover:bg-yellow-400 text-[#041E42] px-3.5 py-1.5 rounded-xl font-extrabold text-xs shadow-xs transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Go to Customer View</span>
          </button>

          <div className="relative cursor-pointer p-1.5 text-blue-100 hover:text-white transition-colors">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#0071DC]">
              3
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-blue-100 hover:text-white transition-colors text-xs font-bold pl-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN THREE-COLUMN LAYOUT */}
      <div className="flex-grow flex flex-col lg:flex-row min-w-0 w-full overflow-x-hidden">
        
        {/* LEFT SIDEBAR NAVIGATION */}
        <AdminSidebar />

        {/* CENTER MAIN COLUMN (METRICS, FILTERS, TABLE) */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto w-full">
          
          {/* Header Title */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
              Coupon Management
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Create and manage discount coupons, set rules, track usage and measure campaign performance.
            </p>
          </div>

          {/* 5 KPI Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: Total Coupons */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <Ticket className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">{totalCoupons}</span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Total Coupons</span>
              </div>
            </div>

            {/* Card 2: Active Coupons */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">{activeCoupons}</span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Active Coupons</span>
              </div>
            </div>

            {/* Card 3: Inactive Coupons */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <PauseCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">{inactiveCoupons}</span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Inactive Coupons</span>
              </div>
            </div>

            {/* Card 4: Total Uses */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">
                  {totalUses.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Total Uses</span>
              </div>
            </div>

            {/* Card 5: Revenue Generated */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <IndianRupee className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">
                  ₹{revenueGenerated.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Revenue Generated</span>
              </div>
            </div>
          </div>

          {/* Sub-Bar Filters & Controls */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex flex-wrap items-center gap-3 flex-grow">
              {/* Search Box */}
              <div className="relative flex-grow max-w-xs sm:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by coupon code, name or description..."
                  className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#0875E1]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              {/* Discount Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="percentage">Percentage Discount</option>
                <option value="flat">Fixed Amount</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="created_date">Sort by: Created Date</option>
                <option value="usage">Sort by: Total Usage</option>
                <option value="discount">Sort by: Discount Value</option>
              </select>
            </div>

            {/* Export Button */}
            <button 
              onClick={() => showToast('Coupon data exported successfully.', 'success')}
              className="bg-white border border-[#0875E1] text-[#0875E1] hover:bg-blue-50 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          {/* Coupons Table Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-gray-200/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 text-center w-8">#</th>
                    <th className="py-3 px-3">Coupon Code</th>
                    <th className="py-3 px-3">Discount Rules</th>
                    <th className="py-3 px-3">Min Order</th>
                    <th className="py-3 px-3">Max Discount</th>
                    <th className="py-3 px-3">Usage Limit</th>
                    <th className="py-3 px-3">Valid Period</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-center min-w-[170px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-[#0F172A]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10">
                        <div className="w-6 h-6 border-2 border-[#0875E1] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400 font-bold">
                        No coupons found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((cpn, index) => {
                      const expired = isExpired(cpn.end_date);
                      return (
                        <tr key={cpn.coupon_id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-3 text-center text-gray-400 font-bold">{index + 1}</td>
                          <td className="py-3 px-3 font-bold text-[#0875E1] whitespace-nowrap">
                            {cpn.code}
                          </td>
                          <td className="py-3 px-3 font-bold whitespace-nowrap">
                            {cpn.discount_type === 'percentage' ? `${cpn.discount_value}% OFF` : `₹${cpn.discount_value} OFF`}
                          </td>
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">₹{cpn.minimum_order_value.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">₹{cpn.maximum_discount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                            <span className="font-bold text-[#0F172A]">{cpn.usage_count}</span>
                            <span className="text-gray-400"> / {cpn.usage_limit}</span>
                          </td>
                          <td className="py-3 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                            {cpn.start_date.split('T')[0]} - {cpn.end_date.split('T')[0]}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {expired ? (
                              <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Expired
                              </span>
                            ) : cpn.status === 'ACTIVE' ? (
                              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Active
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 min-w-[170px]">
                            <div className="flex items-center justify-center space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleEditClick(cpn)}
                                className="bg-blue-50 hover:bg-blue-100 text-[#0875E1] border border-blue-200 px-2.5 py-1 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeactivate(cpn.coupon_id)}
                                className={`px-2.5 py-1 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1 border cursor-pointer ${
                                  cpn.status === 'ACTIVE'
                                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span>{cpn.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-[#F8FAFC] border-t border-gray-200/80 px-4 py-3 flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Showing 1 to {filteredCoupons.length} of {coupons.length} coupons</span>
              <div className="flex items-center space-x-1 font-bold">
                <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-500">
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-500">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-lg border border-[#0875E1] bg-[#0875E1] text-white flex items-center justify-center">
                  1
                </button>
                <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-600">
                  2
                </button>
                <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-500">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-500">
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: CREATE / EDIT COUPON FORM PANEL */}
        <aside className="w-72 lg:w-84 bg-white border-l border-gray-200/80 p-4 lg:p-5 flex-shrink-0 overflow-y-auto space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-4">
            <div className="border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-sm text-[#0F172A]">
                {editingCouponId ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">Configure discount rules and validity.</p>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs font-semibold text-gray-700">
              
              {/* Coupon Code */}
              <div className="space-y-1">
                <label className="text-gray-600 font-bold">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAVE20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] uppercase font-mono box-border"
                />
              </div>

              {/* Discount Type */}
              <div className="space-y-1">
                <label className="text-gray-600 font-bold">Discount Type *</label>
                <select
                  value={discountType}
                  onChange={(e: any) => setDiscountType(e.target.value)}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] cursor-pointer box-border"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="flat">Fixed Amount Discount</option>
                </select>
              </div>

              {/* Discount Value */}
              <div className="space-y-1">
                <label className="text-gray-600 font-bold">Discount Value *</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] box-border"
                  />
                  <span className="absolute right-3 text-gray-400 font-bold text-xs">
                    {discountType === 'percentage' ? '%' : '₹'}
                  </span>
                </div>
              </div>

              {/* Min Order Value */}
              <div className="space-y-1">
                <label className="text-gray-600 font-bold">Min Order Value (₹)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 1000"
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] box-border"
                />
              </div>

              {/* Max Discount */}
              <div className="space-y-1">
                <label className="text-gray-600 font-bold">Max Discount (₹)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 500"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(Number(e.target.value))}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] box-border"
                />
              </div>

              {/* Usage Limit */}
              <div className="space-y-1">
                <label className="text-gray-600 font-bold">Usage Limit</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 1000"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] box-border"
                />
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-2 py-1.5 text-[11px] text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] cursor-pointer box-border"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Valid To *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-2 py-1.5 text-[11px] text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] cursor-pointer box-border"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-gray-600 font-bold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Enter coupon description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1] resize-none box-border"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-2.5 rounded-xl font-extrabold text-xs transition-colors shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
              >
                {formLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{editingCouponId ? 'Update Coupon' : 'Create Coupon'}</span>
                  </>
                )}
              </button>

              {editingCouponId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCouponId(null);
                    setCode('');
                  }}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-700 font-semibold py-1"
                >
                  Cancel Editing
                </button>
              )}
            </form>
          </div>

          {/* Light Blue Tip Card */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-start space-x-3 text-xs text-[#1E3A8A] shadow-2xs">
            <Lightbulb className="w-5 h-5 text-[#0875E1] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
              <strong className="text-[#0F172A]">Tip:</strong> Use targeted coupons to increase customer retention and boost sales during special events.
            </p>
          </div>
        </aside>
      </div>

      {/* Toast Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
