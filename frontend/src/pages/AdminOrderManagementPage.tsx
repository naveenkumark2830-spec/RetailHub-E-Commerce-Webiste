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
  Cpu,
  AlertTriangle
} from 'lucide-react';

interface OrderSummary {
  order_id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  payment_status: string;
  first_name: string;
  last_name: string;
  state: string;
  city: string;
}

interface OrderItem {
  order_item_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  brand: string;
}

interface TrackingEvent {
  event_id?: string;
  tracking_event_id?: string;
  status: string;
  description: string;
  location?: string;
  timestamp?: string;
  event_time?: string;
}

interface OrderDetail extends OrderSummary {
  items: OrderItem[];
  history: TrackingEvent[];
  email: string;
  address_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
}

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_RECEIVED',
  'REFUNDED'
];

export default function AdminOrderManagementPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Filters
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [state, setState] = useState<string>('');
  const city = '';
  const [payment, setPayment] = useState<string>('');

  // Detail Modal
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Status Change Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [updateReason, setUpdateReason] = useState<string>('');
  const [statusLoading, setStatusLoading] = useState<boolean>(false);

  // Cancel Order Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  // Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getNextStage = (currStatus: string) => {
    switch (currStatus) {
      case 'PENDING': return 'CONFIRMED';
      case 'CONFIRMED': return 'PROCESSING';
      case 'PROCESSING': return 'PACKED';
      case 'PACKED': return 'SHIPPED';
      case 'SHIPPED': return 'IN_TRANSIT';
      case 'IN_TRANSIT': return 'OUT_FOR_DELIVERY';
      case 'OUT_FOR_DELIVERY': return 'DELIVERED';
      default: return null;
    }
  };

  const getPermittedTargetStatuses = (currentStatus: string) => {
    const stagesOrder = [
      'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
      'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_RECEIVED', 'REFUNDED'
    ];
    const currentIdx = stagesOrder.indexOf(currentStatus);
    if (currentIdx === -1) return [];

    const options = stagesOrder.slice(currentIdx + 1);
    if (currentStatus === 'OUT_FOR_DELIVERY') {
      options.push('FAILED_DELIVERY');
    }
    const dispatchedIdx = stagesOrder.indexOf('SHIPPED');
    if (currentIdx < dispatchedIdx && currentStatus !== 'CANCELLED') {
      options.push('CANCELLED');
    }
    return options;
  };

  const handlePromoteNextStage = async () => {
    if (!detail) return;
    const nextStg = getNextStage(detail.status);
    if (!nextStg) return;
    
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setStatusLoading(true);
      const res = await fetch(`/api/admin/orders/update-status/${detail.order_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ 
          status: nextStg, 
          reason: `Advanced via One-Click Promote to ${nextStg}` 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update transition failed.');

      showToast(`Order progressed to ${nextStg} successfully.`, 'success');
      fetchOrderDetail(detail.order_id);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      let url = `/api/admin/orders?search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${status}`;
      if (state) url += `&state=${state}`;
      if (city) url += `&city=${city}`;
      if (payment) url += `&payment=${payment}`;

      const res = await fetch(url, { headers: { 'Authorization': token } });
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch orders list.');
      setOrders(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch order detail.');
      setDetail(data);
    } catch (err: any) {
      showToast(err.message, 'error');
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
    fetchOrders();
  }, [navigate, search, status, state, city, payment]);

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

  const handleOpenDetail = (orderId: string) => {
    fetchOrderDetail(orderId);
    setIsDetailOpen(true);
  };

  const handleOpenStatusModal = () => {
    if (!detail) return;
    setTargetStatus('');
    setUpdateReason('Standard transit status update');
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    if (!token || !detail || !targetStatus) return;

    try {
      setStatusLoading(true);
      const res = await fetch(`/api/admin/orders/update-status/${detail.order_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ status: targetStatus, reason: updateReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update transition failed.');

      showToast('Order status transitioned successfully.', 'success');
      setIsStatusModalOpen(false);
      fetchOrderDetail(detail.order_id);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOpenCancelModal = () => {
    setCancelReason('Operational inventory adjustment / Customer request');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    if (!token || !detail) return;

    try {
      setCancelLoading(true);
      const res = await fetch(`/api/admin/orders/cancel/${detail.order_id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ reason: cancelReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancellation request failed.');

      showToast('Order cancelled and stock inventory released successfully.', 'success');
      setIsCancelModalOpen(false);
      fetchOrderDetail(detail.order_id);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Metrics calculators
  const countByStatus = (st: string) => orders.filter(o => o.status === st).length;

  if (loading && orders.length === 0) {
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
                    idx === 5
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
            <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Order Operations Console</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Control center for processing, shipping, and order status transitions</p>
          </div>

          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Processing', value: countByStatus('PROCESSING'), color: 'text-blue-600 border-blue-100' },
              { label: 'Shipped', value: countByStatus('SHIPPED'), color: 'text-indigo-600 border-indigo-100' },
              { label: 'Delivered', value: countByStatus('DELIVERED'), color: 'text-green-600 border-green-100' },
              { label: 'Cancelled', value: countByStatus('CANCELLED'), color: 'text-red-600 border-red-100' },
              { label: 'Returned', value: countByStatus('RETURN_RECEIVED') + countByStatus('REFUNDED'), color: 'text-rose-600 border-rose-100' }
            ].map((kpi) => (
              <div key={kpi.label} className={`bg-white border rounded-3xl p-4 shadow-sm flex flex-col justify-between ${kpi.color}`}>
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{kpi.label}</span>
                <p className="text-2xl font-black mt-1 font-mono">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-wrap gap-4 items-center">
            
            {/* Search Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center space-x-2 flex-grow min-w-[200px] focus-within:border-[#0071DC] transition-all">
              <input
                type="text"
                placeholder="Search Order ID or Customer Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none w-full text-[#041E42]"
              />
            </div>

            {/* Status Select */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* State Select */}
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All States</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Delhi">Delhi</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
            </select>

            {/* Payment Select */}
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className="bg-gray-50 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-600"
            >
              <option value="">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Orders Listing Table */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Geography</th>
                    <th className="pb-3 text-center">Amount</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Order Status</th>
                    <th className="pb-3 text-right pr-2">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {orders.map((ord) => (
                    <tr key={ord.order_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pl-2 font-mono font-bold text-[#0071DC]">{ord.order_id}</td>
                      <td className="py-4">
                        <p className="font-bold text-[#041E42]">{ord.first_name} {ord.last_name}</p>
                        <span className="text-[10px] text-gray-400 font-mono">{ord.customer_id}</span>
                      </td>
                      <td className="py-4 text-gray-600 font-semibold">{ord.city}, {ord.state}</td>
                      <td className="py-4 text-center font-mono font-bold text-gray-700">₹{ord.total_amount.toLocaleString('en-IN')}</td>
                      <td className="py-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          ord.payment_status === 'PAID' 
                            ? 'text-green-700 bg-green-50 border-green-200' 
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {ord.payment_status}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          ord.status === 'DELIVERED' 
                            ? 'text-green-700 bg-green-50 border-green-200' 
                            : ord.status === 'CANCELLED'
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : 'text-blue-700 bg-blue-50 border-blue-200'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button
                          onClick={() => handleOpenDetail(ord.order_id)}
                          className="p-1.5 hover:bg-blue-50 hover:text-[#0071DC] text-gray-400 rounded-full transition-all inline-block"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* ORDER DETAILS OVERLAY MODAL */}
      <AnimatePresence>
        {isDetailOpen && detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-[600px] border-l border-gray-250 shadow-2xl flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              {/* Detail Header */}
              <div className="p-6 border-b border-gray-150 flex items-center justify-between mt-1.5">
                <div>
                  <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Order #{detail.order_id}</h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Placed on {new Date(detail.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail Body */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                
                {/* Customer card */}
                <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 space-y-2">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Customer Details</span>
                  <div className="flex justify-between items-center text-xs">
                    <p className="font-bold text-[#041E42]">{detail.first_name} {detail.last_name}</p>
                    <p className="font-mono text-gray-500">{detail.email}</p>
                  </div>
                  <div className="text-xs text-gray-600 border-t border-gray-200/60 pt-2">
                    <p className="font-semibold">{detail.address_name}</p>
                    <p>{detail.address_line_1}, {detail.address_line_2}</p>
                    <p>{detail.city}, {detail.state} - {detail.postal_code}</p>
                    <p className="font-semibold font-mono mt-1">Phone: {detail.phone}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Ordered Items</span>
                  <div className="border border-gray-200 rounded-3xl divide-y divide-gray-100 overflow-hidden bg-white">
                    {detail.items.map(item => (
                      <div key={item.order_item_id} className="p-4 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#041E42]">{item.product_name}</p>
                          <span className="text-[9.5px] text-gray-400 font-bold uppercase">{item.brand}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-700">₹{item.unit_price.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-gray-400 font-bold">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking/Status Machine timeline */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Order Status Timeline</span>
                  <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-gray-500">Current: {detail.status}</span>
                      <div className="space-x-2 flex flex-wrap gap-2 items-center justify-end">
                        {detail.status !== 'CANCELLED' && detail.status !== 'DELIVERED' && getNextStage(detail.status) && (
                          <button
                            onClick={handlePromoteNextStage}
                            disabled={statusLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition-all shadow-sm"
                          >
                            {statusLoading ? 'Promoting...' : `Promote to ${getNextStage(detail.status)}`}
                          </button>
                        )}
                        {detail.status !== 'CANCELLED' && detail.status !== 'DELIVERED' && (
                          <button
                            onClick={handleOpenStatusModal}
                            className="bg-[#0071DC] hover:bg-[#0046BE] text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition-all shadow-sm"
                          >
                            Choose Status
                          </button>
                        )}
                        {!['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(detail.status) && (
                          <button
                            onClick={handleOpenCancelModal}
                            className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider py-1.5 px-4 rounded-full transition-all shadow-sm"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-250/50 pt-3 font-mono text-xs">
                      {detail.history.map((evt, idx) => {
                        const eventDate = evt.event_time || evt.timestamp;
                        return (
                          <div key={evt.tracking_event_id || evt.event_id || idx} className="flex justify-between items-start space-x-2">
                            <div className="flex items-start space-x-2">
                              <span className="text-blue-500 font-bold">•</span>
                              <div>
                                <p className="font-bold text-gray-700 uppercase">{evt.status}</p>
                                <p className="text-[10.5px] text-gray-500">{evt.description}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {eventDate ? new Date(eventDate).toLocaleString() : 'Recent'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPDATE STATUS MODAL */}
      <AnimatePresence>
        {isStatusModalOpen && detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-55 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-md w-full p-6 relative overflow-hidden"
            >
              <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight mb-4">Update Order Lifecycle Status</h3>

              <form onSubmit={handleStatusSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">New Target Status *</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-medium text-xs cursor-pointer shadow-sm"
                  >
                    <option value="">Select status...</option>
                    {getPermittedTargetStatuses(detail.status).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Action Description Reason *</label>
                  <input
                    type="text"
                    required
                    value={updateReason}
                    onChange={(e) => setUpdateReason(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStatusModalOpen(false)}
                    className="flex-grow border border-gray-250 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-2.5 rounded-full transition-all uppercase tracking-wider text-xs shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={statusLoading || !targetStatus}
                    className="flex-grow bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-blue-300 text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-xs shadow-md"
                  >
                    {statusLoading ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL ORDER MODAL */}
      <AnimatePresence>
        {isCancelModalOpen && detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-55 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-md w-full p-6 relative overflow-hidden"
            >
              <div className="flex items-center space-x-2 text-red-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-tight">Cancel Order</h3>
              </div>
              <p className="text-[10px] text-gray-500 font-bold leading-relaxed mb-4">
                This will cancel the order, mark status as CANCELLED, and automatically release all reserved product items back to available inventory.
              </p>

              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Cancellation Reason *</label>
                  <input
                    type="text"
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="flex-grow border border-gray-250 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-2.5 rounded-full transition-all uppercase tracking-wider text-xs shadow-sm"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={cancelLoading}
                    className="flex-grow bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-xs shadow-md"
                  >
                    {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
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
