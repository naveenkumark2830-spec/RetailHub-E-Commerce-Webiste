import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  RotateCcw, 
  HelpCircle, 
  LogOut, 
  Crown, 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  Truck, 
  Clock, 
  XCircle, 
  ShoppingCart, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  X
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { Header } from '../components/Header';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface OrderItem {
  order_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price?: string | number;
  color?: string;
  size?: string;
  image_url?: string;
}

interface Order {
  order_id: string;
  customer_id: string;
  address_id: string;
  status: string;
  subtotal: string;
  discount: string;
  coupon_discount: string;
  shipping_fee: string;
  tax: string;
  total_amount: string;
  payment_status: string;
  payment_method?: string;
  delivery_status: string;
  created_at: string;
  items?: OrderItem[];
  shipment?: any;
  history?: any[];
  address?: any;
}

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { customer, session, logout } = useSessionStore();
  const { addItemToCart } = useCartStore();
  const { profilePhoto } = useProfilePhoto();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters and Search state
  const [activeTab, setActiveTab] = useState<string>('All Orders');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('All Orders');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Selected Order for Details Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Cancellation Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('CHANGED_MIND');
  const [cancelRefundAmount, setCancelRefundAmount] = useState(0);
  const [cancelRefundMethod, setCancelRefundMethod] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    if (!customer) return;
    try {
      const response = await fetch(`/api/checkout/orders?customer_id=${customer.customer_id}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!customer) {
      navigate('/login?redirect=orders');
      return;
    }
    fetchOrders();
  }, [customer, navigate]);

  // Log page view
  const hasLoggedPageView = useRef(false);
  useEffect(() => {
    if (session && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          page: 'orders_history',
          device: 'desktop',
          browser: 'Chrome',
          metadata: { page: 'orders_history' }
        })
      }).catch(err => console.warn(err));
    }
  }, [session, customer]);

  const handleConfirmCancel = async () => {
    if (!customer || !session || !cancelOrderId) return;

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/profile/${customer.customer_id}/orders/${cancelOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          session_id: session.session_id
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowCancelModal(false);
        setCancelOrderId(null);
        await fetchOrders();
        showToast('Order cancelled successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to cancel this order.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error. Failed to cancel order.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleTrackOrder = async (orderId: string) => {
    if (session) {
      try {
        await fetch(`/api/tracking/${orderId}/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.session_id,
            customer_id: customer?.customer_id || null
          })
        });
      } catch (e) {
        console.warn(e);
      }
    }
    navigate(`/orders/${orderId}/tracking`);
  };

  const handleBuyAgain = (order: Order) => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        addItemToCart(
          {
            product_id: item.product_id,
            name: item.product_name,
            brand: 'NexDay',
            price: Number(item.price) || 1000,
            discount: 0,
            sale_price: Number(item.price) || 1000
          },
          item.quantity
        );
      });
      showToast('Items added to your cart!', 'success');
      navigate('/cart');
    }
  };

  // Filter orders based on active tab and search query
  const filteredOrders = orders.filter(order => {
    // Tab filter
    if (activeTab === 'Delivered' && order.status !== 'DELIVERED' && order.delivery_status !== 'DELIVERED') return false;
    if (activeTab === 'Shipped' && !['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status)) return false;
    if (activeTab === 'Processing' && !['PROCESSING', 'CONFIRMED', 'PENDING'].includes(order.status)) return false;
    if (activeTab === 'Cancelled' && order.status !== 'CANCELLED') return false;
    if (activeTab === 'Returned' && order.status !== 'RETURNED') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.order_id.toLowerCase().includes(q);
      const matchItem = order.items?.some(item => item.product_name.toLowerCase().includes(q));
      if (!matchId && !matchItem) return false;
    }

    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filterTabs = ['All Orders', 'Delivered', 'Shipped', 'Processing', 'Cancelled', 'Returned'];

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-between text-[#0F172A] font-sans">
      {/* HEADER */}
      <Header />

      <main className="max-w-7xl w-full mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-5">
              {/* User Avatar & Name */}
              <div className="flex items-center space-x-3.5 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0 border border-gray-200 overflow-hidden">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                <div className="space-y-0.5 truncate">
                  <h3 className="font-bold text-sm text-[#0F172A] truncate">
                    {(customer as any)?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Naveen Kumar'}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {customer?.email || 'naveen@example.com'}
                  </p>
                </div>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5 text-xs font-semibold text-[#475569]">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span>My Profile</span>
                </button>

                <button 
                  onClick={() => navigate('/orders')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#0875E1] font-bold border-l-4 border-[#0875E1] transition-colors"
                >
                  <Package className="w-4 h-4 text-[#0875E1]" />
                  <span>My Orders</span>
                </button>

                <button 
                  onClick={() => navigate('/wishlist')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Heart className="w-4 h-4 text-gray-500" />
                  <span>Wishlist</span>
                </button>

                <button 
                  onClick={() => navigate('/addresses')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>Addresses</span>
                </button>

                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span>Payment Methods</span>
                </button>

                <button 
                  onClick={() => navigate('/notifications')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span>Notifications</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                </button>

                <button 
                  onClick={() => navigate('/reviews')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-gray-500" />
                  <span>Reviews</span>
                </button>

                <button 
                  onClick={() => navigate('/returns')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                  <span>Returns & Refunds</span>
                </button>

                <button 
                  onClick={() => navigate('/help')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                  <span>Help & Support</span>
                </button>

                <button 
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors pt-2"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>

            {/* NEXDAY PLUS CARD */}
            <div className="bg-[#EFF6FF]/70 border border-[#BFDBFE] rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-[#0875E1]" />
                <h4 className="font-extrabold text-xs text-[#0F172A]">NexDay Plus</h4>
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                Free delivery, early access to deals and more!
              </p>
              <button 
                onClick={() => navigate('/home')}
                className="w-full border border-[#0875E1] hover:bg-blue-50 text-[#0875E1] py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Explore NexDay Plus
              </button>
            </div>
          </aside>

          {/* RIGHT MAIN AREA: MY ORDERS */}
          <section className="lg:col-span-9 space-y-6">
            
            {/* Title & Top Search / Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">My Orders</h1>
                <p className="text-xs text-[#64748B] font-medium mt-1">Track, return or buy again from your previous orders.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Box */}
                <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order ID, product or brand..."
                    className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#0875E1] shadow-xs"
                  />
                </div>

                {/* Time Filter Select */}
                <div className="relative">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0875E1] shadow-xs cursor-pointer"
                  >
                    <option value="All Orders">All Orders</option>
                    <option value="Last 30 days">Last 30 days</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-gray-200 flex space-x-6 overflow-x-auto text-xs font-bold text-gray-500 pt-2 no-scrollbar">
              {filterTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
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

            {/* Orders Cards List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-9 h-9 border-4 border-[#0875E1] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">No orders match your filter</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">Try clearing search keywords or selecting a different tab filter.</p>
                <button
                  onClick={() => { setActiveTab('All Orders'); setSearchQuery(''); }}
                  className="bg-[#0875E1] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#065eb8] transition-colors"
                >
                  View All Orders
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedOrders.map((order) => {
                  const isDelivered = order.status === 'DELIVERED' || order.delivery_status === 'DELIVERED';
                  const isShipped = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status);
                  const isProcessing = ['PROCESSING', 'CONFIRMED', 'PENDING'].includes(order.status);
                  const isCancelled = order.status === 'CANCELLED';

                  const orderDateFormatted = new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const orderTimeFormatted = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  const itemsCount = order.items?.length || 1;
                  const displayItems = order.items?.slice(0, 4) || [];
                  const remainingItemsCount = itemsCount > 4 ? itemsCount - 4 : 0;

                  return (
                    <motion.div
                      key={order.order_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-gray-200/80 p-5 md:p-6 shadow-xs hover:shadow-sm transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                    >
                      {/* Left: Order Info & Product Images Strip */}
                      <div className="space-y-4 flex-grow max-w-lg">
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-sm text-[#0F172A]">Order #{order.order_id}</h3>
                          <p className="text-xs text-gray-500 font-medium">Placed on {orderDateFormatted}, {orderTimeFormatted}</p>
                        </div>

                        {/* Product Image Strip */}
                        <div className="flex items-center space-x-2 overflow-x-auto pt-1">
                          {displayItems.map((item) => (
                            <div key={item.order_item_id} className="w-14 h-14 bg-white border border-gray-200 rounded-xl p-1.5 flex items-center justify-center flex-shrink-0 shadow-2xs">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                          ))}
                          {remainingItemsCount > 0 && (
                            <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center font-bold text-xs text-gray-600 flex-shrink-0">
                              +{remainingItemsCount} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Status & Timeline Summary */}
                      <div className="space-y-2 md:w-64 flex-shrink-0">
                        {isDelivered && (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                              <span className="font-bold text-sm text-[#10B981]">Delivered</span>
                            </div>
                            <p className="text-xs text-gray-500">Delivered on {orderDateFormatted}</p>
                            <p className="text-xs font-bold text-gray-700 pt-1">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'items'} &nbsp;|&nbsp; <span className="font-black text-[#0F172A]">₹{Number(order.total_amount).toLocaleString()}</span>
                            </p>
                          </div>
                        )}

                        {isShipped && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Truck className="w-5 h-5 text-[#0875E1]" />
                              <span className="font-bold text-sm text-[#0875E1]">Shipped</span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">Expected soon</p>

                            {/* Mini 4-node stepper line */}
                            <div className="space-y-1 pt-1">
                              <div className="relative flex items-center justify-between w-full">
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
                                <div className="absolute top-1/2 left-0 h-0.5 bg-[#0875E1] -translate-y-1/2 z-0 w-2/3"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#0875E1] z-10"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#0875E1] z-10"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#0875E1] z-10"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-gray-300 z-10"></div>
                              </div>
                              <div className="flex justify-between text-[9px] text-gray-400 font-semibold">
                                <span>Packed</span>
                                <span>Shipped</span>
                                <span>Out</span>
                                <span>Delivered</span>
                              </div>
                            </div>

                            <p className="text-xs font-bold text-gray-700 pt-1">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'items'} &nbsp;|&nbsp; <span className="font-black text-[#0F172A]">₹{Number(order.total_amount).toLocaleString()}</span>
                            </p>
                          </div>
                        )}

                        {isProcessing && (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-5 h-5 text-amber-500" />
                              <span className="font-bold text-sm text-amber-600">Processing</span>
                            </div>
                            <p className="text-xs text-gray-500">Your order is being prepared.</p>
                            <p className="text-xs font-bold text-gray-700 pt-1">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'items'} &nbsp;|&nbsp; <span className="font-black text-[#0F172A]">₹{Number(order.total_amount).toLocaleString()}</span>
                            </p>
                          </div>
                        )}

                        {isCancelled && (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <XCircle className="w-5 h-5 text-red-500" />
                              <span className="font-bold text-sm text-red-600">Cancelled</span>
                            </div>
                            <p className="text-xs text-gray-500">Payment was not completed.</p>
                            <p className="text-xs font-bold text-gray-700 pt-1">
                              {itemsCount} {itemsCount === 1 ? 'item' : 'items'} &nbsp;|&nbsp; <span className="font-black text-[#0F172A]">₹{Number(order.total_amount).toLocaleString()}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Action Buttons Column */}
                      <div className="w-full md:w-44 flex flex-col gap-2 flex-shrink-0">
                        {isShipped ? (
                          <button
                            onClick={() => handleTrackOrder(order.order_id)}
                            className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center space-x-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Track Order</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                          >
                            View Details
                          </button>
                        )}

                        {isShipped && (
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="w-full border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/50 py-2 rounded-xl text-xs font-bold transition-colors"
                          >
                            View Details
                          </button>
                        )}

                        {isDelivered && (
                          <>
                            <button
                              onClick={() => handleBuyAgain(order)}
                              className="w-full border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/50 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 text-[#0875E1]" />
                              <span>Buy Again</span>
                            </button>
                            {order.items && order.items.length > 0 && (
                              <button
                                onClick={() => navigate(`/orders/${order.order_id}/review/${order.items![0].product_id}`)}
                                className="w-full border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/50 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                              >
                                <Star className="w-3.5 h-3.5 text-[#0875E1]" />
                                <span>Write a Review</span>
                              </button>
                            )}
                          </>
                        )}

                        {!isShipped && !isDelivered && !isCancelled && (
                          <button
                            onClick={() => {
                              setCancelOrderId(order.order_id);
                              setCancelRefundAmount(Number(order.total_amount));
                              setCancelRefundMethod(order.payment_status === 'PAID' ? 'Original Payment Method (Refund)' : 'No Refund Required (COD)');
                              setShowCancelModal(true);
                            }}
                            className="w-full border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/50 py-2 rounded-xl text-xs font-bold transition-colors"
                          >
                            Cancel Items
                          </button>
                        )}

                        {isCancelled && (
                          <button
                            onClick={() => handleBuyAgain(order)}
                            className="w-full border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/50 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-[#0875E1]" />
                            <span>Buy Again</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {filteredOrders.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 text-xs font-medium text-gray-500">
                <div>
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-lg font-bold transition-colors ${
                        currentPage === num
                          ? 'bg-[#0875E1] text-white shadow-2xs'
                          : 'border border-gray-200 hover:bg-gray-50 text-[#0F172A]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </section>
        </div>
      </main>

      {/* EXPANDED ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-2xl w-full p-6 text-[#0F172A] relative overflow-hidden space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-[#0F172A]">Order #{selectedOrderDetails.order_id}</h2>
                  <p className="text-xs text-gray-500">
                    Placed on {new Date(selectedOrderDetails.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Ordered Items</h4>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  {selectedOrderDetails.items?.map((item) => (
                    <div key={item.order_item_id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white border rounded-lg p-1 flex items-center justify-center">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A]">{item.product_name}</p>
                          <p className="text-[11px] text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#0F172A]">
                        ₹{item.price ? Number(item.price).toLocaleString() : Math.round(Number(selectedOrderDetails.total_amount) / (selectedOrderDetails.items?.length || 1)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address & Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <h4 className="font-bold text-[#0F172A]">Shipping Address</h4>
                  {selectedOrderDetails.address ? (
                    <p className="text-gray-600">
                      {selectedOrderDetails.address.full_name}<br />
                      {selectedOrderDetails.address.address_line_1}<br />
                      {selectedOrderDetails.address.city}, {selectedOrderDetails.address.state} - {selectedOrderDetails.address.postal_code}
                    </p>
                  ) : (
                    <p className="text-gray-500">Primary delivery location</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <h4 className="font-bold text-[#0F172A]">Payment & Total</h4>
                  <p className="text-gray-600">Status: <span className="font-bold uppercase text-emerald-600">{selectedOrderDetails.payment_status}</span></p>
                  <p className="text-base font-black text-[#0F172A] pt-1">Total: ₹{Number(selectedOrderDetails.total_amount).toLocaleString()}</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/invoices/by-order/${selectedOrderDetails.order_id}`);
                      const data = await res.json();
                      if (res.ok && data.success) {
                        navigate(`/invoices/${data.invoice.invoice_id}`);
                      } else {
                        showToast('Invoice not generated yet for this order.', 'error');
                      }
                    } catch (err) {
                      console.error('Invoice fetch error:', err);
                      showToast('Could not retrieve invoice.', 'error');
                    }
                  }}
                  className="border border-gray-200 hover:bg-gray-50 text-[#0F172A] px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <FileText className="w-4 h-4 text-[#0875E1]" />
                  <span>Download Invoice</span>
                </button>

                <button
                  onClick={() => handleTrackOrder(selectedOrderDetails.order_id)}
                  className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Track Shipment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL ORDER MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6 text-[#0F172A] relative overflow-hidden space-y-4"
            >
              <div>
                <h2 className="text-lg font-extrabold text-[#0F172A]">Cancel Order</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Are you sure you want to cancel Order #{cancelOrderId}?</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B]">Reason for cancellation</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                >
                  <option value="CHANGED_MIND">Changed my mind</option>
                  <option value="ORDERED_MISTAKE">Ordered by mistake</option>
                  <option value="BETTER_PRICE">Found a better price</option>
                  <option value="DELIVERY_LATE">Delivery taking too long</option>
                  <option value="WRONG_PRODUCT">Ordered wrong product</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="bg-[#F4F6F9] rounded-xl p-4 space-y-2 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Refund Amount:</span>
                  <span className="font-extrabold text-[#0875E1]">₹{cancelRefundAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Refund Method:</span>
                  <span className="font-bold text-[#0F172A]">{cancelRefundMethod}</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelOrderId(null);
                  }}
                  className="w-1/2 border border-gray-200 hover:bg-gray-50 text-[#0F172A] py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                  className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs focus:outline-none disabled:opacity-50"
                >
                  {isCancelling ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Confirm Cancel</span>
                  )}
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
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center space-x-2 border font-bold text-xs ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
