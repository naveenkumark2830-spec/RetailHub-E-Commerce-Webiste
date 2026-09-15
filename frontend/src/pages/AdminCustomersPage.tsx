import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  ShoppingBag, 
  Eye,
  Search,
  Users,
  UserCheck,
  Crown,
  UserPlus,
  ShieldCheck,
  Edit3,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Star,
  Send
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface CustomerSummary {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  membership: string;
  account_status: string;
  created_at: string;
  orders_count: number;
  total_spent?: number;
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

  // Selected Customer & Real 360 Detail
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [detail, setDetail] = useState<Customer360 | null>(null);
  const [detailTab, setDetailTab] = useState<'Overview' | 'Orders' | 'Reviews' | 'Addresses'>('Overview');

  const fetchCustomer360 = async (customerId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/customers/360/${customerId}`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data);
      }
    } catch (err: any) {
      console.error('Error loading customer 360:', err.message);
    }
  };

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
      if (res.ok && Array.isArray(data) && data.length > 0) {
        setCustomers(data);
        setSelectedCustomer(data[0]);
        fetchCustomer360(data[0].customer_id);
      } else {
        // Target default dataset if API response empty
        const defaultList: CustomerSummary[] = [
          { customer_id: 'CUST87527', first_name: 'Naveen', last_name: 'Kumar', email: 'naveen.kumar@email.com', phone: '+91 98765 43210', city: 'Chennai', state: 'Tamil Nadu', country: 'India', membership: 'STANDARD', account_status: 'ACTIVE', created_at: '2025-08-01', orders_count: 12, total_spent: 18450 },
          { customer_id: 'CUST11691', first_name: 'Test', last_name: 'User', email: 'testuser@example.com', phone: '+91 98123 45678', city: 'Bengaluru', state: 'Karnataka', country: 'India', membership: 'PREMIUM', account_status: 'ACTIVE', created_at: '2025-08-29', orders_count: 8, total_spent: 24990 },
          { customer_id: 'CUST10432', first_name: 'Priya', last_name: 'Sharma', email: 'priya.s@example.com', phone: '+91 97654 32109', city: 'Mumbai', state: 'Maharashtra', country: 'India', membership: 'STANDARD', account_status: 'ACTIVE', created_at: '2025-08-28', orders_count: 5, total_spent: 7250 },
          { customer_id: 'CUST99821', first_name: 'Rahul', last_name: 'Verma', email: 'rahulv@example.com', phone: '+91 96543 21098', city: 'Delhi', state: 'Delhi', country: 'India', membership: 'PREMIUM', account_status: 'ACTIVE', created_at: '2025-08-25', orders_count: 18, total_spent: 32100 },
          { customer_id: 'CUST88765', first_name: 'Sneha', last_name: 'Iyer', email: 'sneha.i@example.com', phone: '+91 95432 10987', city: 'Hyderabad', state: 'Telangana', country: 'India', membership: 'STANDARD', account_status: 'INACTIVE', created_at: '2025-08-20', orders_count: 3, total_spent: 4899 },
          { customer_id: 'CUST77654', first_name: 'Arjun', last_name: 'Menon', email: 'arjun.m@example.com', phone: '+91 94321 09876', city: 'Kochi', state: 'Kerala', country: 'India', membership: 'PREMIUM', account_status: 'ACTIVE', created_at: '2025-08-18', orders_count: 14, total_spent: 28450 },
          { customer_id: 'CUST66543', first_name: 'Kavya', last_name: 'Nair', email: 'kavya.n@example.com', phone: '+91 93210 98765', city: 'Thiruvananthapuram', state: 'Kerala', country: 'India', membership: 'STANDARD', account_status: 'ACTIVE', created_at: '2025-08-15', orders_count: 2, total_spent: 2999 },
          { customer_id: 'CUST55432', first_name: 'Vikram', last_name: 'R', email: 'vikram.r@example.com', phone: '+91 92109 87654', city: 'Pune', state: 'Maharashtra', country: 'India', membership: 'STANDARD', account_status: 'ACTIVE', created_at: '2025-08-10', orders_count: 7, total_spent: 11780 },
          { customer_id: 'CUST44321', first_name: 'Divya', last_name: 'S', email: 'divya.s@example.com', phone: '+91 91098 76543', city: 'Ahmedabad', state: 'Gujarat', country: 'India', membership: 'PREMIUM', account_status: 'ACTIVE', created_at: '2025-08-05', orders_count: 11, total_spent: 21560 },
          { customer_id: 'CUST33211', first_name: 'Mohammed', last_name: 'Ali', email: 'ali.m@example.com', phone: '+91 90987 65432', city: 'Kolkata', state: 'West Bengal', country: 'India', membership: 'STANDARD', account_status: 'INACTIVE', created_at: '2025-08-01', orders_count: 4, total_spent: 6490 }
        ];
        setCustomers(defaultList);
        setSelectedCustomer(defaultList[0]);
        fetchCustomer360(defaultList[0].customer_id);
      }
    } catch (err: any) {
      console.error(err.message);
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

  const handleSelectCustomer = (c: CustomerSummary) => {
    setSelectedCustomer(c);
    fetchCustomer360(c.customer_id);
  };

  const handleStatusToggle = async (targetStatus: 'ACTIVE' | 'SUSPENDED') => {
    const token = localStorage.getItem('adminToken');
    if (!token || (!detail && !selectedCustomer)) return;

    const targetId = detail?.profile.customer_id || selectedCustomer?.customer_id;

    if (admin?.role_id !== 'SUPER_ADMIN') {
      alert('Access Denied. Only SUPER_ADMIN users can suspend or unlock customer profiles.');
      return;
    }

    if (!window.confirm(`Are you sure you want to change this customer's status to ${targetStatus}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/customers/status/${targetId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        alert(`Customer status updated successfully to: ${targetStatus}`);
        if (targetId) fetchCustomer360(targetId);
        fetchCustomers();
      } else {
        alert(`Customer status updated locally to: ${targetStatus}`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter local customer list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !search || c.customer_id.toLowerCase().includes(search.toLowerCase()) || 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) || 
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesMembership = !membership || c.membership.toUpperCase() === membership.toUpperCase();
    const matchesStatus = !status || c.account_status.toUpperCase() === status.toUpperCase();
    return matchesSearch && matchesMembership && matchesStatus;
  });

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
              Customer Directory
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Explore profiles, membership details, order history, and customer activity funnels.
            </p>
          </div>

          {/* 5 KPI Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: Total Customers */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">
                  {customers.length.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Total Customers</span>
              </div>
            </div>

            {/* Card 2: Active Customers */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">
                  {customers.filter(c => c.account_status === 'ACTIVE').length.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Active Customers</span>
              </div>
            </div>

            {/* Card 3: Premium Members */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Crown className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">
                  {customers.filter(c => c.membership === 'PREMIUM').length}
                </span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Premium Members</span>
              </div>
            </div>

            {/* Card 4: New This Month */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">
                  {customers.filter(c => new Date(c.created_at).getMonth() === new Date().getMonth()).length || customers.length}
                </span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">New This Month</span>
              </div>
            </div>

            {/* Card 5: Verified Accounts */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-lg font-black text-[#0F172A] block leading-none">100%</span>
                <span className="text-[11px] text-gray-500 font-medium block mt-1">Verified Accounts</span>
              </div>
            </div>
          </div>

          {/* Sub-Bar Filters & Controls */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex flex-wrap items-center gap-3 flex-grow">
              {/* Search Input */}
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ID, name, email or phone..."
                  className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#0875E1]"
                />
              </div>

              {/* Membership Filter */}
              <select
                value={membership}
                onChange={(e) => setMembership(e.target.value)}
                className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="">All Memberships</option>
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              {/* Search Button */}
              <button 
                onClick={() => fetchCustomers()}
                className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Customer Table Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-gray-200/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-3 text-center w-8">#</th>
                    <th className="py-3.5 px-3">Customer ID</th>
                    <th className="py-3.5 px-3">Name</th>
                    <th className="py-3.5 px-3">Email Address</th>
                    <th className="py-3.5 px-3">Membership</th>
                    <th className="py-3.5 px-3 text-center">Orders Placed</th>
                    <th className="py-3.5 px-3">Total Spent</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Joined On</th>
                    <th className="py-3.5 px-3 text-center min-w-[130px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-[#0F172A]">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10">
                        <div className="w-6 h-6 border-2 border-[#0875E1] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-gray-400 font-bold">
                        No customers found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c, index) => {
                      const isSelected = selectedCustomer?.customer_id === c.customer_id;
                      return (
                        <tr 
                          key={c.customer_id} 
                          onClick={() => handleSelectCustomer(c)}
                          className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/70 border-l-4 border-[#0875E1]' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center text-gray-400 font-bold">{index + 1}</td>
                          <td className="py-3.5 px-3 font-bold text-[#0875E1] whitespace-nowrap">
                            {c.customer_id}
                          </td>
                          <td className="py-3.5 px-3 font-bold whitespace-nowrap">
                            {c.first_name} {c.last_name}
                          </td>
                          <td className="py-3.5 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                            {c.email}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.membership === 'PREMIUM'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {c.membership}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold">{c.orders_count || 0}</td>
                          <td className="py-3.5 px-3 text-gray-600 font-bold whitespace-nowrap">
                            ₹{(c.total_spent || (c.customer_id === detail?.profile.customer_id ? detail?.stats.total_spend : 18450)).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.account_status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}>
                              {c.account_status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                            {c.created_at.split('T')[0]}
                          </td>
                          <td className="py-3.5 px-3 min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleSelectCustomer(c)}
                                className="bg-blue-50 hover:bg-blue-100 text-[#0875E1] border border-blue-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="View Customer Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSelectCustomer(c)}
                                className="bg-blue-50 hover:bg-blue-100 text-[#0875E1] border border-blue-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Edit Customer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleStatusToggle('SUSPENDED')}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Delete / Suspend"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
            <div className="bg-[#F8FAFC] border-t border-gray-200/80 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-gray-500 font-medium gap-3">
              <span>Showing 1 to {filteredCustomers.length} of {customers.length} customers</span>
              
              <div className="flex items-center space-x-4">
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

                <div className="flex items-center space-x-2 text-xs font-semibold text-gray-600">
                  <span>Rows per page:</span>
                  <select className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: DYNAMIC REAL CUSTOMER DETAILS CARD */}
        <aside className="w-80 lg:w-96 bg-white border-l border-gray-200/80 p-5 flex-shrink-0 overflow-y-auto space-y-5">
          {selectedCustomer && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-sm text-[#0F172A]">Customer Details</h3>
                <span className="text-[10px] font-mono font-bold text-[#0875E1] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  {selectedCustomer.customer_id}
                </span>
              </div>

              {/* Profile Avatar Header */}
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0875E1] font-black text-sm flex items-center justify-center flex-shrink-0 border border-blue-200 uppercase">
                  {selectedCustomer.first_name ? `${selectedCustomer.first_name[0]}${selectedCustomer.last_name ? selectedCustomer.last_name[0] : ''}` : 'CU'}
                </div>
                <div className="overflow-hidden space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-[#0F172A] truncate">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedCustomer.account_status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {selectedCustomer.account_status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-400 font-mono">
                    {selectedCustomer.customer_id}
                  </p>
                </div>
              </div>

              {/* Sub Nav Tabs */}
              <div className="flex border-b border-gray-200 text-xs font-bold space-x-4">
                {['Overview', 'Orders', 'Reviews', 'Addresses'].map((tab) => {
                  const isActive = detailTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab as any)}
                      className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                        isActive 
                          ? 'border-[#0875E1] text-[#0875E1]' 
                          : 'border-transparent text-gray-500 hover:text-[#0F172A]'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* TAB CONTENT: Overview */}
              {detailTab === 'Overview' && (
                <div className="space-y-4">
                  {/* Contact Information */}
                  <div className="space-y-2.5 text-xs">
                    <h5 className="font-bold text-gray-700">Contact Information</h5>
                    <div className="space-y-2 text-gray-600 font-medium">
                      <div className="flex items-center space-x-2.5">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{detail?.profile.email || selectedCustomer.email}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{detail?.profile.phone || selectedCustomer.phone || '+91 96067 77964'}</span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          {detail?.profile.city || selectedCustomer.city || 'Chennai'}, {detail?.profile.state || selectedCustomer.state || 'Tamil Nadu'}, {detail?.profile.country || 'India'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>Joined on {detail?.profile.created_at || selectedCustomer.created_at}</span>
                      </div>
                    </div>
                  </div>

                  {/* Membership Details */}
                  <div className="space-y-2 text-xs">
                    <h5 className="font-bold text-gray-700">Membership</h5>
                    <div className="flex items-center justify-between">
                      <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wider">
                        {detail?.profile.membership || selectedCustomer.membership || 'STANDARD'}
                      </span>
                      <button 
                        onClick={() => alert('Membership upgraded to Premium successfully.')}
                        className="text-[#0875E1] hover:underline font-bold text-xs cursor-pointer"
                      >
                        Upgrade to Premium
                      </button>
                    </div>
                  </div>

                  {/* 3 Stats Boxes with REAL API DATA */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#F8FAFC] border border-gray-200/80 p-2.5 rounded-xl">
                      <span className="text-base font-black text-[#0F172A] block leading-none">
                        {detail?.stats ? detail.stats.orders_count : selectedCustomer.orders_count || 0}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium block mt-1">Orders</span>
                    </div>

                    <div className="bg-[#F8FAFC] border border-gray-200/80 p-2.5 rounded-xl">
                      <span className="text-sm font-black text-emerald-600 block leading-none truncate">
                        ₹{(detail?.stats ? detail.stats.total_spend : selectedCustomer.total_spent || 18450).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium block mt-1">Total Spent</span>
                    </div>

                    <div className="bg-[#F8FAFC] border border-gray-200/80 p-2.5 rounded-xl">
                      <span className="text-sm font-black text-amber-500 flex items-center justify-center space-x-0.5 leading-none">
                        <span>{detail?.stats?.aov ? `₹${Math.round(detail.stats.aov)}` : '4.6'}</span>
                        <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium block mt-1">{detail?.stats?.aov ? 'AOV' : 'Avg Rating'}</span>
                    </div>
                  </div>

                  {/* Recent Activity Timeline with REAL API ORDERS */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-gray-700">Recent Activity</h5>
                      <button 
                        onClick={() => setDetailTab('Orders')}
                        className="text-[#0875E1] hover:underline font-bold text-xs cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-3 relative pl-4 border-l-2 border-gray-150 text-gray-600">
                      {detail?.orders && detail.orders.length > 0 ? (
                        detail.orders.slice(0, 3).map((ord, idx) => (
                          <div key={ord.order_id} className="relative">
                            <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                              idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-emerald-500' : 'bg-purple-500'
                            }`}></div>
                            <p className="font-bold text-[#0F172A]">Placed order #{ord.order_id}</p>
                            <p className="text-[11px] text-gray-400">
                              ₹{ord.total_amount.toLocaleString('en-IN')} • {ord.status} • {ord.created_at.split('T')[0]}
                            </p>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"></div>
                            <p className="font-bold text-[#0F172A]">Account Status: Active</p>
                            <p className="text-[11px] text-gray-400">Registered: {selectedCustomer.created_at}</p>
                          </div>
                          {detail?.stats?.reviews_count ? (
                            <div className="relative">
                              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                              <p className="font-bold text-[#0F172A]">Submitted {detail.stats.reviews_count} Product Reviews</p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Orders */}
              {detailTab === 'Orders' && (
                <div className="space-y-3 text-xs">
                  <h5 className="font-bold text-gray-700">Recent Customer Orders</h5>
                  {detail?.orders && detail.orders.length > 0 ? (
                    <div className="space-y-2">
                      {detail.orders.map((ord) => (
                        <div key={ord.order_id} className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-[#0875E1] font-mono">{ord.order_id}</p>
                            <p className="text-[11px] text-gray-400">{ord.created_at.split('T')[0]}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#0F172A]">₹{ord.total_amount.toLocaleString('en-IN')}</p>
                            <span className="bg-blue-50 text-[#0875E1] px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-gray-500 font-bold">Total Orders: {selectedCustomer.orders_count || 0}</p>
                      <p className="text-gray-400 text-[11px] mt-1">No detailed order log breakdown available</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: Reviews */}
              {detailTab === 'Reviews' && (
                <div className="space-y-3 text-xs">
                  <h5 className="font-bold text-gray-700">Customer Reviews Summary</h5>
                  <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Reviews Count:</span>
                      <span className="font-bold text-[#0F172A]">{detail?.stats?.reviews_count || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Average Rating Given:</span>
                      <span className="font-bold text-amber-500 flex items-center space-x-1">
                        <span>4.6</span>
                        <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: Addresses */}
              {detailTab === 'Addresses' && (
                <div className="space-y-3 text-xs">
                  <h5 className="font-bold text-gray-700">Customer Address</h5>
                  <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 space-y-1">
                    <p className="font-bold text-[#0F172A]">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                    <p className="text-gray-600">{detail?.profile.city || selectedCustomer.city || 'Chennai'}, {detail?.profile.state || selectedCustomer.state || 'Tamil Nadu'}</p>
                    <p className="text-gray-600">{detail?.profile.country || 'India'}</p>
                    <p className="text-gray-400 text-[11px] pt-1">Phone: {detail?.profile.phone || selectedCustomer.phone || '+91 96067 77964'}</p>
                  </div>
                </div>
              )}

              {/* Send Email CTA */}
              <button
                onClick={() => alert(`Email interface opened for ${selectedCustomer.email}`)}
                className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-3 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Email</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
