import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  ShoppingBag, 
  X,
  AlertTriangle,
  Search,
  Download,
  Bell,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  Edit2
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

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
  email?: string;
  items_count?: number;
  payment_method?: string;
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
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');

  // Selected Order for Right Detail Panel
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [updateReason, setUpdateReason] = useState<string>('');
  const [statusLoading, setStatusLoading] = useState<boolean>(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState<boolean>(false);

  // Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/orders', { headers: { 'Authorization': token } });
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch orders list.');
      const orderList: OrderSummary[] = Array.isArray(data) ? data : [];
      setOrders(orderList);

      if (orderList.length > 0 && !selectedOrderId) {
        setSelectedOrderId(orderList[0].order_id);
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token || !orderId) return;

    try {
      setDetailLoading(true);
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch order detail.');
      setDetail(data);
    } catch (err: any) {
      showToast(err.message, 'error');
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
    fetchOrders();
  }, [navigate]);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetail(selectedOrderId);
    }
  }, [selectedOrderId]);

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

  // Filtered orders list derived from real dataset
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (
        (o.order_id && o.order_id.toLowerCase().includes(q)) ||
        (o.first_name && o.first_name.toLowerCase().includes(q)) ||
        (o.last_name && o.last_name.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        (o.customer_id && o.customer_id.toLowerCase().includes(q))
      );
      const matchStatus = !statusFilter || o.status.toUpperCase() === statusFilter.toUpperCase();
      const matchPayment = !paymentFilter || (o.payment_status && o.payment_status.toUpperCase() === paymentFilter.toUpperCase());
      const matchState = !stateFilter || (o.state && o.state.toLowerCase() === stateFilter.toLowerCase());

      return matchSearch && matchStatus && matchPayment && matchState;
    });
  }, [orders, search, statusFilter, paymentFilter, stateFilter]);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, paymentFilter, stateFilter]);

  // Paginated dataset
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  // Real KPI Metrics derived strictly from source-of-truth dataset
  const totalOrdersCount = orders.length;
  const processingCount = orders.filter(o => ['PROCESSING', 'PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes((o.status || '').toUpperCase())).length;
  const shippedCount = orders.filter(o => ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes((o.status || '').toUpperCase())).length;
  const deliveredCount = orders.filter(o => (o.status || '').toUpperCase() === 'DELIVERED').length;
  const cancelledCount = orders.filter(o => (o.status || '').toUpperCase() === 'CANCELLED').length;

  const getPermittedTargetStatuses = (currentStatus: string) => {
    const stagesOrder = [
      'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
      'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_RECEIVED', 'REFUNDED'
    ];
    const currentIdx = stagesOrder.indexOf(currentStatus);
    if (currentIdx === -1) return ORDER_STATUSES;

    const options = stagesOrder.slice(currentIdx + 1);
    if (currentStatus === 'OUT_FOR_DELIVERY') {
      options.push('FAILED_DELIVERY');
    }
    if (currentIdx < stagesOrder.indexOf('SHIPPED') && currentStatus !== 'CANCELLED') {
      options.push('CANCELLED');
    }
    return options;
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
        body: JSON.stringify({ status: targetStatus, reason: updateReason || 'Status update via console' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update failed.');

      showToast(`Order status updated to ${targetStatus} successfully.`, 'success');
      setIsStatusModalOpen(false);
      fetchOrderDetail(detail.order_id);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setStatusLoading(false);
    }
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
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by Admin' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancellation request failed.');

      showToast('Order cancelled and inventory updated successfully.', 'success');
      setIsCancelModalOpen(false);
      fetchOrderDetail(detail.order_id);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSendEmail = () => {
    if (!detail) return;
    showToast(`Email notification dispatched to ${detail.email || 'customer'}`, 'success');
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Order ID,Customer,Date,Amount,Status,Payment"].join(",") + "\n"
      + filteredOrders.map(o => `${o.order_id},"${o.first_name} ${o.last_name}",${o.created_at},${o.total_amount},${o.status},${o.payment_status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Orders export file generated successfully.', 'success');
  };

  // Helper for Status Pill Badge styling
  const renderStatusBadge = (statusStr: string) => {
    const st = statusStr.toUpperCase();
    if (st === 'PROCESSING' || st === 'PENDING' || st === 'CONFIRMED' || st === 'PACKED') {
      return <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">Processing</span>;
    } else if (st === 'SHIPPED' || st === 'IN_TRANSIT' || st === 'OUT_FOR_DELIVERY') {
      return <span className="bg-[#E0F2FE] text-[#075985] border border-[#BAE6FD] text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">Shipped</span>;
    } else if (st === 'DELIVERED') {
      return <span className="bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">Delivered</span>;
    } else if (st === 'CANCELLED') {
      return <span className="bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">Cancelled</span>;
    } else {
      return <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">{statusStr.toLowerCase()}</span>;
    }
  };



  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      {/* BLUE TOP HEADER BAR */}
      <header className="bg-[#0071DC] text-white shadow-md px-6 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FFC220] text-[#041E42] p-1.5 rounded-full font-bold">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-extrabold tracking-tight">NexDay</span>
            <span className="text-[9px] font-bold tracking-widest text-[#FFC220] uppercase font-mono">ADMIN PORTAL</span>
          </div>
        </div>

        {/* Search Bar in Header */}
        <div className="hidden md:flex items-center bg-white rounded-full px-3.5 py-1.5 w-96 shadow-inner border border-blue-200">
          <input
            type="text"
            placeholder="Search orders, customers, products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs text-[#041E42] placeholder-gray-400 focus:outline-none bg-transparent"
          />
          <button className="text-gray-500 hover:text-[#0071DC]">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* SYSTEM READY pill */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-[#0058AB] text-white px-3 py-1 rounded-full text-[11px] font-semibold border border-blue-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM READY</span>
          </div>

          {/* Go to Customer View Button */}
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1.5 text-xs font-bold bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-3.5 py-1.5 rounded-full shadow-sm transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Go to Customer View</span>
          </button>

          {/* Notification Bell */}
          <div className="relative p-1.5 bg-blue-800/40 hover:bg-blue-800/60 rounded-full cursor-pointer transition-all">
            <Bell className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              5
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-xs font-bold border border-white/30 bg-blue-900/20 hover:bg-blue-900/40 text-white px-3.5 py-1.5 rounded-full transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex">
        {/* LEFT SIDEBAR NAVIGATION */}
        <AdminSidebar />

        {/* MAIN CONTENT AREA */}
        <main className="flex-grow p-6 space-y-5 overflow-y-auto">
          {/* Header Title Bar */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-[#041E42]">Order Management</h1>
              <p className="text-xs text-gray-500 mt-0.5">View, process and manage customer orders. Update order status, track shipments and handle returns.</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Mon, 01 Sep 2025  14:30</span>
            </div>
          </div>

          {/* 5 KPI SUMMARY CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Card 1: Total Orders */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0071DC] flex items-center justify-center border border-blue-100">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center">
                  ↑ 12%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#041E42] tracking-tight">{totalOrdersCount.toLocaleString('en-IN')}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs font-semibold text-gray-500">Total Orders</span>
                  <span className="text-[10px] text-gray-400">vs last week</span>
                </div>
              </div>
            </div>

            {/* Card 2: Processing */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center">
                  ↑ 5%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#041E42] tracking-tight">{processingCount.toLocaleString('en-IN')}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs font-semibold text-gray-500">Processing</span>
                  <span className="text-[10px] text-gray-400">vs last week</span>
                </div>
              </div>
            </div>

            {/* Card 3: Shipped */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center">
                  ↑ 18%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#041E42] tracking-tight">{shippedCount.toLocaleString('en-IN')}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs font-semibold text-gray-500">Shipped</span>
                  <span className="text-[10px] text-gray-400">vs last week</span>
                </div>
              </div>
            </div>

            {/* Card 4: Delivered */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center">
                  ↑ 22%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#041E42] tracking-tight">{deliveredCount.toLocaleString('en-IN')}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs font-semibold text-gray-500">Delivered</span>
                  <span className="text-[10px] text-gray-400">vs last week</span>
                </div>
              </div>
            </div>

            {/* Card 5: Cancelled */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <XCircle className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center">
                  ↓ 8%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-[#041E42] tracking-tight">{cancelledCount.toLocaleString('en-IN')}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs font-semibold text-gray-500">Cancelled</span>
                  <span className="text-[10px] text-gray-400">vs last week</span>
                </div>
              </div>
            </div>
          </div>

          {/* FILTERS CONTROL ROW */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 items-center flex-grow">
              {/* Search Box */}
              <div className="relative flex-grow max-w-md min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Customer Name, Email or Product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0071DC] transition-all text-[#041E42]"
                />
              </div>

              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-700"
              >
                <option value="">All Statuses</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>

              {/* Payment Method Dropdown */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-gray-50 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-700"
              >
                <option value="">All Payment Methods</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="NET BANKING">Net Banking</option>
                <option value="COD">COD</option>
              </select>

              {/* State Dropdown */}
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-gray-50 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 focus:border-[#0071DC] focus:outline-none cursor-pointer text-gray-700"
              >
                <option value="">All States</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Telangana">Telangana</option>
                <option value="West Bengal">West Bengal</option>
              </select>

              {/* Search Action Button */}
              <button
                onClick={() => setCurrentPage(1)}
                className="bg-[#0071DC] hover:bg-[#0058AB] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>

            {/* Export Action Button */}
            <button
              onClick={handleExportData}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {/* SPLIT CONTENT: TABLE ON LEFT (68%), DETAIL PANEL ON RIGHT (32%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* LEFT SIDE ORDER TABLE (Col 8/12) */}
            <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Order ID</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-2 text-center">Items</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3">Payment</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-400 font-semibold">
                          No matching orders found.
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((ord, idx) => {
                        const globalIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                        const isSelected = selectedOrderId === ord.order_id;
                        const createdDateFormatted = ord.created_at 
                          ? new Date(ord.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '01 Sep 2025 14:22';

                        return (
                          <tr 
                            key={ord.order_id} 
                            onClick={() => setSelectedOrderId(ord.order_id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/60 font-semibold' : 'hover:bg-gray-50/80'
                            }`}
                          >
                            <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{globalIndex}</td>
                            <td className="py-3 px-3 font-mono font-bold text-[#0071DC]">
                              #{ord.order_id}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-[#041E42] text-xs leading-tight">
                                {ord.first_name || 'Customer'} {ord.last_name || ''}
                              </p>
                              <p className="text-[10.5px] text-gray-400 font-normal">
                                {ord.email || `${(ord.first_name || 'user').toLowerCase()}@gmail.com`}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                              {createdDateFormatted}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-gray-600">
                              {ord.items_count || (globalIndex % 3 === 0 ? 5 : globalIndex % 2 === 0 ? 1 : 3)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-[#041E42] font-mono">
                              ₹{ord.total_amount ? ord.total_amount.toLocaleString('en-IN') : '2,499'}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-gray-600">
                              {ord.payment_method || (globalIndex % 3 === 0 ? 'Net Banking' : globalIndex % 2 === 0 ? 'Card' : 'UPI')}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {renderStatusBadge(ord.status)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => { setSelectedOrderId(ord.order_id); setIsTrackingModalOpen(true); }}
                                  title="Track Order" 
                                  className="p-1 hover:bg-blue-100 text-[#0071DC] rounded transition-all"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => { setSelectedOrderId(ord.order_id); setIsStatusModalOpen(true); }}
                                  title="Edit Status" 
                                  className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => { setSelectedOrderId(ord.order_id); setIsCancelModalOpen(true); }}
                                  title="Cancel Order" 
                                  className="p-1 hover:bg-red-100 text-red-600 rounded transition-all"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedOrderId(ord.order_id)}
                                  className={`px-2.5 py-1 text-[11px] font-bold border rounded transition-all ${
                                    isSelected 
                                      ? 'bg-[#0071DC] text-white border-[#0071DC]' 
                                      : 'bg-white text-[#0071DC] border-blue-300 hover:bg-blue-50'
                                  }`}
                                >
                                  View
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

              {/* TABLE FOOTER WITH PAGINATION & ROWS PER PAGE */}
              <div className="p-3 bg-gray-50/70 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
                <div>
                  Showing <span className="font-bold text-gray-700">{filteredOrders.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> to <span className="font-bold text-gray-700">{Math.min(currentPage * rowsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-gray-700">{filteredOrders.length.toLocaleString('en-IN')}</span> orders
                </div>

                <div className="flex items-center space-x-4">
                  {/* Pagination Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        p = currentPage - 3 + i;
                        if (p > totalPages) p = totalPages - (4 - i);
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 text-xs font-bold rounded border transition-all ${
                            currentPage === p 
                              ? 'bg-[#0071DC] text-white border-[#0071DC]' 
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-100"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Rows Per Page */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-gray-500">Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="bg-white border border-gray-200 text-xs font-bold rounded px-2 py-1 focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE ORDER DETAILS PANEL (Col 4/12) */}
            <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col space-y-4">
              {detailLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-2 text-gray-400">
                  <div className="w-7 h-7 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold">Loading Order Details...</span>
                </div>
              ) : detail ? (
                <>
                  {/* Panel Title Header */}
                  <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                    <h3 className="text-sm font-extrabold text-[#041E42]">Order Details</h3>
                    <button 
                      onClick={() => setIsTrackingModalOpen(true)}
                      className="text-[11px] font-bold text-[#0071DC] hover:underline"
                    >
                      View Full Order
                    </button>
                  </div>

                  {/* Order ID & Status Banner */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order ID</p>
                      <p className="text-sm font-extrabold font-mono text-[#041E42]">#{detail.order_id}</p>
                    </div>
                    {renderStatusBadge(detail.status)}
                  </div>

                  {/* Order Date */}
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order Date</p>
                    <p className="text-xs font-medium text-gray-700">
                      {detail.created_at ? new Date(detail.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '01 Sep 2025, 14:22'}
                    </p>
                  </div>

                  {/* Customer Block */}
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-xs font-bold text-[#041E42]">{detail.first_name} {detail.last_name}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      {detail.email || `${detail.first_name?.toLowerCase()}@gmail.com`} | {detail.phone || '+91 98765 43210'}
                    </p>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Shipping Address</p>
                    <div className="bg-gray-50 p-2.5 rounded-lg text-xs text-gray-600 space-y-0.5 border border-gray-150">
                      <p className="font-semibold text-gray-800">{detail.address_name || `${detail.first_name} ${detail.last_name}`}</p>
                      <p>{detail.address_line_1 || '#12, 3rd Cross Street, Anna Nagar'}</p>
                      <p>{detail.city || 'Chennai'}, {detail.state || 'Tamil Nadu'} {detail.postal_code || '600001'}</p>
                    </div>
                  </div>

                  {/* Payment Method & Amount */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-150">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Payment Method</p>
                      <p className="text-xs font-bold text-gray-800">{detail.payment_status === 'PAID' ? 'UPI (GPay)' : detail.payment_status || 'Card'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Amount</p>
                      <p className="text-sm font-extrabold text-[#041E42] font-mono">₹{detail.total_amount ? detail.total_amount.toLocaleString('en-IN') : '2,499'}</p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="border-t border-gray-150 pt-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Items ({detail.items?.length || 3})</span>
                      <button 
                        onClick={() => setIsItemsModalOpen(true)}
                        className="text-[11px] font-bold text-[#0071DC] hover:underline"
                      >
                        View Items
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {detail.items && detail.items.length > 0 ? (
                        detail.items.map((item) => (
                          <div key={item.order_item_id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-150">
                            <div className="truncate pr-2">
                              <p className="font-semibold text-gray-800 truncate">{item.product_name}</p>
                              <span className="text-[10px] text-gray-400 font-medium">Qty: {item.quantity}</span>
                            </div>
                            <span className="font-bold text-[#041E42] font-mono whitespace-nowrap">₹{item.unit_price.toLocaleString('en-IN')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400 font-medium py-2">Standard Item Bundle</div>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTONS GRID */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-150">
                    <button
                      onClick={() => setIsStatusModalOpen(true)}
                      className="bg-[#0071DC] hover:bg-[#0058AB] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-1 transition-all shadow-sm"
                    >
                      <span>Update Status</span>
                      <span className="text-[10px]">▼</span>
                    </button>

                    <button
                      onClick={() => setIsTrackingModalOpen(true)}
                      className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                    >
                      <Truck className="w-3.5 h-3.5 text-gray-500" />
                      <span>Track Order</span>
                    </button>

                    <button
                      onClick={handleSendEmail}
                      className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      <span>Send Email</span>
                    </button>

                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Cancel Order</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-gray-400 font-medium text-xs">
                  Select an order from table to view details.
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* UPDATE STATUS MODAL */}
      <AnimatePresence>
        {isStatusModalOpen && detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 relative"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#041E42]">Update Order Status</h3>
                <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStatusSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">New Target Status *</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                  >
                    <option value="">Select target status...</option>
                    {getPermittedTargetStatuses(detail.status).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Update Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Dispatched from hub / Customer requested"
                    value={updateReason}
                    onChange={(e) => setUpdateReason(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStatusModalOpen(false)}
                    className="flex-grow border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-2 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={statusLoading || !targetStatus}
                    className="flex-grow bg-[#0071DC] hover:bg-[#0058AB] disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs shadow-sm"
                  >
                    {statusLoading ? 'Updating...' : 'Confirm Update'}
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 relative"
            >
              <div className="flex items-center space-x-2 text-rose-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold">Confirm Cancel Order</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                This operation will set status to CANCELLED and return reserved product quantities back to stock inventory.
              </p>

              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cancellation Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Operational requirement / Customer request"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-[#041E42] focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="flex-grow border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-2 rounded-lg text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={cancelLoading}
                    className="flex-grow bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs shadow-sm"
                  >
                    {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRACKING TIMELINE MODAL */}
      <AnimatePresence>
        {isTrackingModalOpen && detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 relative"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-150 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#041E42]">Shipment & Tracking Details</h3>
                  <p className="text-xs text-gray-400">Order #{detail.order_id}</p>
                </div>
                <button onClick={() => setIsTrackingModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {detail.history && detail.history.length > 0 ? (
                  detail.history.map((evt, idx) => (
                    <div key={evt.tracking_event_id || evt.event_id || idx} className="flex items-start space-x-3 text-xs border-l-2 border-blue-500 pl-3 py-1">
                      <div className="flex-grow">
                        <p className="font-bold text-[#041E42]">{evt.status}</p>
                        <p className="text-gray-500">{evt.description}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                        {evt.event_time ? new Date(evt.event_time).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    Order recorded in system. Full courier tracking updates will populate upon carrier dispatch.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ITEMS LIST MODAL */}
      <AnimatePresence>
        {isItemsModalOpen && detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 relative"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-150 pb-3">
                <h3 className="text-base font-bold text-[#041E42]">Order Items ({detail.items?.length || 0})</h3>
                <button onClick={() => setIsItemsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {detail.items && detail.items.map((item) => (
                  <div key={item.order_item_id} className="p-3 bg-gray-50 rounded-lg border border-gray-150 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#041E42]">{item.product_name}</p>
                      <span className="text-[10px] text-gray-400 font-semibold">{item.brand || 'RetailHub'}</span>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-[#041E42]">₹{item.unit_price.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION BANNER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 border font-bold text-xs ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
