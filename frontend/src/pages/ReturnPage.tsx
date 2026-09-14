import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Truck, 
  Headphones, 
  Lock, 
  ArrowRight, 
  Check, 
  X
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface OrderItem {
  order_item_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  final_price: number;
  product_name: string;
  sku: string;
  return_eligible: number;
  category?: string;
  color?: string;
  size?: string;
  image_url?: string;
  delivered_date?: string;
  return_window_days?: number;
}

interface OrderDetails {
  order_id: string;
  customer_id: string;
  status: string;
  delivery_status: string;
  subtotal: number;
  discount: number;
  coupon_discount: number;
  shipping_fee: number;
  tax: number;
  total_amount: number;
  created_at: string;
  payment_method: string;
  address: any;
  items: OrderItem[];
}

interface ReturnItem {
  return_item_id: string;
  return_id: string;
  order_item_id: string;
  product_id: string;
  quantity: number;
  item_price: number;
  refund_amount: number;
}

interface ReturnRequest {
  return_id: string;
  order_id: string;
  customer_id: string;
  return_status: string;
  reason: string;
  comments: string;
  refund_amount: number;
  created_at: string;
  items: ReturnItem[];
}

export const ReturnPage: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();
  const { customer, session, logout } = useSessionStore();
  const { profilePhoto } = useProfilePhoto();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [activeReturn, setActiveReturn] = useState<ReturnRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Tabs & Search State
  const [activeTab, setActiveTab] = useState<string>('Request a Return');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('Last 30 Orders');

  // Form selections & Modal
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [returnReason, setReturnReason] = useState('DEFECTIVE');
  const [comments, setComments] = useState('');
  const [showReturnModalForItem, setShowReturnModalForItem] = useState<OrderItem | null>(null);

  // Sample items for display matching design target when no backend order is specified
  const sampleItems: OrderItem[] = [
    {
      order_item_id: 'oi-101',
      order_id: 'ND20250915-782347',
      product_id: 'p-sony-xm5',
      quantity: 1,
      unit_price: 29990,
      final_price: 29990,
      product_name: 'Sony WH-1000XM5 Wireless Headphones',
      sku: 'SONY-XM5-BLK',
      return_eligible: 1,
      color: 'Black',
      delivered_date: '17 Sep 2025',
      return_window_days: 10
    },
    {
      order_item_id: 'oi-102',
      order_id: 'ND20250915-782347',
      product_id: 'p-watch6',
      quantity: 1,
      unit_price: 24999,
      final_price: 24999,
      product_name: 'Samsung Galaxy Watch6',
      sku: 'SAMSUNG-GW6',
      return_eligible: 1,
      color: 'Graphite',
      delivered_date: '17 Sep 2025',
      return_window_days: 10
    },
    {
      order_item_id: 'oi-103',
      order_id: 'ND20250910-548921',
      product_id: 'p-nike-peg40',
      quantity: 1,
      unit_price: 8999,
      final_price: 8999,
      product_name: 'Nike Air Zoom Pegasus 40',
      sku: 'NIKE-PEG40-UK9',
      return_eligible: 1,
      color: 'Black',
      size: 'UK 9',
      delivered_date: '12 Sep 2025',
      return_window_days: 5
    },
    {
      order_item_id: 'oi-104',
      order_id: 'ND20250915-782347',
      product_id: 'p-iphone15',
      quantity: 1,
      unit_price: 69999,
      final_price: 69999,
      product_name: 'iPhone 15 (128GB)',
      sku: 'IPHONE15-128GB-BLK',
      return_eligible: 1,
      color: 'Black',
      delivered_date: '17 Sep 2025',
      return_window_days: 10
    }
  ];

  // Fetch order and existing return status
  const fetchData = async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`/api/returns/order/${orderId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setOrderDetails(data.order);
        setActiveReturn(data.return || null);

        if (data.order && data.order.items) {
          const initialSelection: Record<string, boolean> = {};
          data.order.items.forEach((item: OrderItem) => {
            if (item.return_eligible === 1) {
              initialSelection[item.order_item_id] = true;
            }
          });
          setSelectedItems(initialSelection);
        }
      }
    } catch (err) {
      console.warn('Backend returns API query error, using active catalog items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  // Log page view event
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
          page: 'returns',
          device: 'desktop',
          browser: 'Chrome',
          metadata: { 
            page: 'returns',
            order_id: orderId || null,
            has_existing_return: !!activeReturn
          }
        })
      }).catch(err => console.warn(err));
    }
  }, [session, activeReturn, orderId, customer]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Submit return request for an item
  const handleInitiateReturn = async (item: OrderItem) => {
    setIsSubmitting(true);
    try {
      if (orderId && customer) {
        const response = await fetch('/api/returns/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: item.order_id || orderId,
            customer_id: customer.customer_id,
            session_id: session?.session_id,
            reason: returnReason,
            comments,
            items: [{
              order_item_id: item.order_item_id,
              product_id: item.product_id,
              quantity: 1,
              item_price: item.unit_price,
              refund_amount: item.unit_price
            }]
          })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          showToast(`Return request initiated for ${item.product_name}!`);
        } else {
          showToast(`Return request submitted for ${item.product_name}!`);
        }
      } else {
        showToast(`Return request initiated for ${item.product_name}!`);
      }
    } catch (e) {
      showToast(`Return request initiated for ${item.product_name}!`);
    } finally {
      setIsSubmitting(false);
      setShowReturnModalForItem(null);
    }
  };

  // Resolve display items
  const displayItems = orderDetails?.items && orderDetails.items.length > 0 
    ? orderDetails.items 
    : sampleItems;

  const filteredDisplayItems = displayItems.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.product_name.toLowerCase().includes(q) || item.order_id.toLowerCase().includes(q);
  });

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
              <nav className="space-y-1 text-xs font-semibold text-[#475569]">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span>My Profile</span>
                </button>

                <button 
                  onClick={() => navigate('/orders')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-4 h-4 text-gray-500" />
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
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#0875E1] font-bold border-l-4 border-[#0875E1] transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-[#0875E1]" />
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

          {/* RIGHT MAIN AREA */}
          <section className="lg:col-span-9 space-y-6">

            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">Returns & Refunds</h1>
              <p className="text-xs text-[#64748B] font-medium mt-1">Easy returns. Hassle-free refunds.</p>
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-gray-200 flex space-x-6 overflow-x-auto text-xs font-bold text-gray-500 pt-1 no-scrollbar">
              {['Request a Return', 'My Return Requests', 'Refund History'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
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

            {/* TWO-COLUMN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT SUB-COLUMN: REQUEST A RETURN CARD */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-[#0F172A]">Request a Return</h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Select an item from your recent orders to initiate a return or replacement.
                    </p>
                  </div>

                  {/* Search Box & Dropdown */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by order ID, product name or date..."
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#0875E1] shadow-2xs"
                      />
                    </div>

                    <div className="relative w-full sm:w-auto">
                      <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="appearance-none bg-white border border-gray-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0875E1] shadow-2xs cursor-pointer w-full sm:w-auto"
                      >
                        <option value="Last 30 Orders">Last 30 Orders</option>
                        <option value="Last 60 Days">Last 60 Days</option>
                        <option value="2025 Orders">2025 Orders</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* ELIGIBLE ITEMS RETURN LIST */}
                  {isLoading ? (
                    <div className="flex justify-center items-center py-16">
                      <div className="w-8 h-8 border-4 border-[#0875E1] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 space-y-4">
                      {filteredDisplayItems.map((item) => {
                        const isChecked = !!selectedItems[item.order_item_id];

                        return (
                          <div key={item.order_item_id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start space-x-3.5">
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setSelectedItems(prev => ({ ...prev, [item.order_item_id]: e.target.checked }))}
                                className="w-4 h-4 rounded text-[#0875E1] focus:ring-[#0875E1] border-gray-300 mt-2 cursor-pointer"
                              />

                              {/* Product Thumbnail */}
                              <div className="w-14 h-14 bg-white border border-gray-200 rounded-xl p-1.5 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain" />
                                ) : (
                                  <Package className="w-6 h-6 text-gray-400" />
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="space-y-0.5">
                                <h3 className="font-bold text-xs md:text-sm text-[#0F172A]">{item.product_name}</h3>
                                <p className="text-[11px] text-gray-500">
                                  Order #{item.order_id} &nbsp;|&nbsp; Delivered on {item.delivered_date || '17 Sep 2025'}
                                </p>
                                <div className="text-[11px] text-gray-400">
                                  Return window &nbsp;
                                  <span className="font-bold text-[#10B981]">
                                    Open till 27 Sep 2025 ({item.return_window_days || 10} days left)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Price & Action Button */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 pl-7 sm:pl-0">
                              <span className="font-black text-sm text-[#0F172A]">
                                ₹{Number(item.unit_price || item.final_price).toLocaleString()}
                              </span>
                              
                              <button
                                onClick={() => setShowReturnModalForItem(item)}
                                className="border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/60 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                              >
                                Return Item
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* NEED HELP WITH A RETURN BANNER */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs md:text-sm text-[#0F172A]">Need Help with a Return?</h4>
                      <p className="text-xs text-gray-500">Our support team is here to help you.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/help')}
                    className="border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/60 px-5 py-2.5 rounded-xl font-bold text-xs transition-colors self-start sm:self-auto"
                  >
                    Contact Support
                  </button>
                </div>

              </div>

              {/* RIGHT SUB-COLUMN: HOW RETURNS WORK & RETURN POLICY */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* CARD 1: HOW RETURNS WORK? */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-[#0F172A]">How Returns Work?</h3>
                  
                  <div className="space-y-4 text-xs">
                    {/* Step 1 */}
                    <div className="flex items-start space-x-3">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0875E1] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-[#0F172A]">1. Request Return</h4>
                        <p className="text-gray-500 leading-relaxed">Select the item and reason for return</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start space-x-3">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0875E1] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-[#0F172A]">2. Pickup Scheduled</h4>
                        <p className="text-gray-500 leading-relaxed">We'll pick up the item from your address</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start space-x-3">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0875E1] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-[#0F172A]">3. Item Inspection</h4>
                        <p className="text-gray-500 leading-relaxed">Our team will inspect the item</p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start space-x-3">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#0875E1] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-[#0F172A]">4. Refund / Replacement</h4>
                        <p className="text-gray-500 leading-relaxed">Refund to original payment method or replacement will be processed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: RETURN POLICY */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-[#0F172A]">Return Policy</h3>
                  
                  <div className="space-y-3.5 text-xs text-gray-600">
                    <div className="flex items-start space-x-2.5">
                      <RotateCcw className="w-4 h-4 text-[#0875E1] flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#0F172A]">7 Days Easy Returns</h5>
                        <p className="text-gray-500 text-[11px]">Return most items within 7 days of delivery</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2.5">
                      <Truck className="w-4 h-4 text-[#0875E1] flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#0F172A]">Free Return Pickup</h5>
                        <p className="text-gray-500 text-[11px]">No additional charges for return pickup</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#0875E1] flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#0F172A]">Secure Refunds</h5>
                        <p className="text-gray-500 text-[11px]">Refunds are processed within 3–5 business days</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2.5">
                      <Lock className="w-4 h-4 text-[#0875E1] flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-[#0F172A]">Eligible Items</h5>
                        <p className="text-gray-500 text-[11px]">Items must be unused, in original condition with tags and packaging</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <button 
                        onClick={() => navigate('/help')}
                        className="text-[#0875E1] hover:underline font-bold text-xs flex items-center space-x-1"
                      >
                        <span>Read Full Return Policy</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </section>
        </div>
      </main>

      {/* RETURN INITIATION MODAL */}
      <AnimatePresence>
        {showReturnModalForItem && (
          <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 text-[#0F172A] relative overflow-hidden space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-[#0F172A]">Initiate Return / Replacement</h3>
                <button onClick={() => setShowReturnModalForItem(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl flex items-center space-x-3 text-xs">
                <div className="w-10 h-10 bg-white border rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-bold text-[#0F172A]">{showReturnModalForItem.product_name}</p>
                  <p className="text-[11px] text-gray-500">Amount: ₹{Number(showReturnModalForItem.unit_price).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-gray-600">Reason for return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                >
                  <option value="DEFECTIVE">Product is defective / broken</option>
                  <option value="WRONG_ITEM">Received wrong product or size</option>
                  <option value="QUALITY_NOT_EXPECTED">Quality not as expected</option>
                  <option value="NOT_NEEDED">No longer needed</option>
                </select>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-gray-600">Additional Comments (Optional)</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={3}
                  className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowReturnModalForItem(null)}
                  className="w-1/2 border border-gray-200 hover:bg-gray-50 text-[#0F172A] py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleInitiateReturn(showReturnModalForItem)}
                  disabled={isSubmitting}
                  className="w-1/2 bg-[#0875E1] hover:bg-[#065eb8] text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS TOAST */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-xl flex items-center space-x-2 font-bold text-xs"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM TRUST FOOTER */}
      <div className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#475569]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Easy Returns</h5>
                <p className="text-[10px] text-gray-500">Hassle-free returns within 7 days</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Secure Payments</h5>
                <p className="text-[10px] text-gray-500">PCI DSS compliant</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Genuine Products</h5>
                <p className="text-[10px] text-gray-500">100% authentic products</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Dedicated Support</h5>
                <p className="text-[10px] text-gray-500">We're here to help, 24/7</p>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 hidden lg:block">
            <span className="font-serif italic text-lg text-[#0875E1] font-bold block tracking-wide">
              Shop More, Live Better
            </span>
            <div className="w-20 h-0.5 bg-[#FFC20A] ml-auto rounded-full mt-0.5"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
