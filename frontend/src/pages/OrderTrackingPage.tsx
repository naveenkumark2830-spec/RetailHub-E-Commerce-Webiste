import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ChevronRight, 
  Truck, 
  Check, 
  ExternalLink, 
  Phone, 
  Headphones, 
  Lock
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface TrackingEvent {
  tracking_event_id: string;
  shipment_id: string;
  order_id: string;
  status: string;
  location_city: string;
  location_state: string;
  location_country: string;
  facility_id: string | null;
  description: string;
  event_time: string;
}

interface Shipment {
  shipment_id: string;
  order_id: string;
  customer_id: string;
  warehouse_id: string;
  carrier_id: string;
  tracking_number: string;
  shipment_status: string;
  origin_city: string;
  origin_state: string;
  origin_country: string;
  destination_city: string;
  destination_state: string;
  destination_country: string;
  estimated_delivery: string;
  actual_delivery: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  events: TrackingEvent[];
}

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { customer, session, logout } = useSessionStore();
  const { profilePhoto } = useProfilePhoto();
  
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTracking = async () => {
    try {
      const response = await fetch(`/api/tracking/${orderId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setShipment(data.shipment);
        setErrorMsg(null);
      } else {
        setErrorMsg(data.error || 'Tracking details not found.');
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      setErrorMsg('Failed to query logistics database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  // Log page view event
  const hasLoggedPageView = useRef(false);
  useEffect(() => {
    if (session && shipment && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          page: 'order_tracking',
          device: 'desktop',
          browser: 'Chrome',
          metadata: { 
            page: 'order_tracking',
            order_id: orderId,
            shipment_id: shipment.shipment_id
          }
        })
      }).catch(err => console.warn(err));
    }
  }, [session, shipment, orderId, customer]);

  const stages = [
    { label: 'Order Placed', time: '15 Sep, 10:24 AM', key: 'CREATED' },
    { label: 'Packed', time: '15 Sep, 6:30 PM', key: 'PACKED' },
    { label: 'Shipped', time: '16 Sep, 9:15 AM', key: 'SHIPPED' },
    { label: 'Out for Delivery', time: '17 Sep, 8:20 AM', key: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', time: 'Expected by 8:00 PM', key: 'DELIVERED' }
  ];

  const isStageActive = (stageKey: string) => {
    if (!shipment) return true; // Default fallback active for demo
    const currentStatus = shipment.shipment_status;
    const stageMap: Record<string, string[]> = {
      'CREATED': ['CREATED', 'PACKED', 'SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      'PACKED': ['PACKED', 'SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      'SHIPPED': ['SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      'OUT_FOR_DELIVERY': ['OUT_FOR_DELIVERY', 'DELIVERED'],
      'DELIVERED': ['DELIVERED']
    };
    return stageMap[stageKey]?.includes(currentStatus) ?? true;
  };

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

          {/* RIGHT MAIN AREA */}
          <section className="lg:col-span-9 space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="w-9 h-9 border-4 border-[#0875E1] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : errorMsg && !shipment ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3">
                <p className="text-xs font-bold text-red-600">{errorMsg}</p>
                <button onClick={() => navigate('/orders')} className="bg-[#0875E1] text-white text-xs font-bold px-4 py-2 rounded-xl">
                  Back to Orders
                </button>
              </div>
            ) : (
              <>
                {/* Breadcrumbs & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-medium text-gray-500">
                  <span className="hover:text-[#0875E1] cursor-pointer" onClick={() => navigate('/orders')}>My Orders</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <span>Order #{orderId || shipment?.order_id || 'ND20250915-782347'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[#0F172A] font-bold">Track Order</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">Track Order</h1>
                <p className="text-xs text-[#64748B] font-medium">Real-time tracking of your order</p>
              </div>

              <button
                onClick={() => navigate('/orders')}
                className="border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/50 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <span>&lt; Back to Orders</span>
              </button>
            </div>

            {/* TOP STATUS STEPPER BANNER CARD */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-6">
              
              {/* Header Status Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#10B981] flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <Truck className="w-7 h-7" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-extrabold text-[#10B981]">Out for Delivery</h2>
                    <p className="text-xs text-gray-600 font-medium">Your order is on the way and will be delivered today.</p>
                    <p className="text-xs text-gray-400 pt-0.5">
                      Expected Delivery <span className="font-extrabold text-[#0F172A]">Today, 17 Sep 2025</span> <span className="text-gray-500">by 8:00 PM</span>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-xs font-bold text-[#0F172A]">Order #{orderId || shipment?.order_id || 'ND20250915-782347'}</p>
                  <p className="text-xs text-gray-400 font-medium">Placed on 15 Sep 2025, 10:24 AM</p>
                  <button 
                    onClick={async () => {
                      if (!orderId) return;
                      try {
                        const res = await fetch(`/api/invoices/by-order/${orderId}`);
                        const data = await res.json();
                        if (res.ok && data.success) {
                          navigate(`/invoices/${data.invoice.invoice_id}`);
                        }
                      } catch (e) {
                        console.warn(e);
                      }
                    }}
                    className="border border-blue-200 hover:bg-blue-50 text-[#0875E1] px-3 py-1 rounded-lg text-xs font-bold transition-colors inline-block mt-1"
                  >
                    View Invoice
                  </button>
                </div>
              </div>

              {/* Horizontal Stepper Progress Bar */}
              <div className="relative pt-3 pb-2">
                <div className="relative flex justify-between items-center w-full">
                  {/* Background Track Line */}
                  <div className="absolute top-3 left-6 right-6 h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full"></div>
                  {/* Active Green Track Line */}
                  <div className="absolute top-3 left-6 h-1 bg-[#10B981] -translate-y-1/2 z-0 rounded-full w-3/4"></div>

                  {stages.map((stg, i) => {
                    const active = isStageActive(stg.key);
                    return (
                      <div key={stg.key} className="flex flex-col items-center z-10 relative text-center max-w-[100px]">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs transition-all ${
                          active 
                            ? 'bg-[#10B981] text-white ring-4 ring-emerald-50' 
                            : 'bg-white border-2 border-gray-300 text-gray-400'
                        }`}>
                          {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : i + 1}
                        </div>
                        <span className={`text-xs font-bold mt-2 ${active ? 'text-[#0F172A]' : 'text-gray-400'}`}>
                          {stg.label}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {stg.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* TWO-COLUMN DETAILS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT SUB-COLUMN: MAP & TIMELINE UPDATES */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* LIVE TRACKING MAP CARD */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-[#0F172A]">Live Tracking</h3>
                  
                  {/* Map Graphic Canvas */}
                  <div className="relative w-full h-64 rounded-xl bg-[#E2E8F0] overflow-hidden border border-gray-200 flex items-center justify-center">
                    {/* Simulated Map Styling SVG */}
                    <svg className="absolute inset-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100%" height="100%" fill="#E0F2FE" />
                      {/* Roads / Routes */}
                      <path d="M-20 120 Q 150 100, 250 140 T 500 180" fill="none" stroke="#FFFFFF" strokeWidth="18" />
                      <path d="M-20 120 Q 150 100, 250 140 T 500 180" fill="none" stroke="#CBD5E1" strokeWidth="14" />
                      <path d="M120 -20 Q 140 150, 200 300" fill="none" stroke="#FFFFFF" strokeWidth="14" />
                      <path d="M120 -20 Q 140 150, 200 300" fill="none" stroke="#CBD5E1" strokeWidth="10" />
                      {/* Active Route Path */}
                      <path d="M 60 130 C 140 120, 210 130, 360 110" fill="none" stroke="#0875E1" strokeWidth="5" strokeDasharray="8 4" />
                    </svg>

                    {/* Pin 1: Origin / Warehouse */}
                    <div className="absolute left-[12%] top-[45%] flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-[#0875E1] text-white flex items-center justify-center shadow-md">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold bg-white/90 text-[#0F172A] px-1.5 py-0.5 rounded shadow-2xs mt-1 whitespace-nowrap">
                        Chennai Fulfillment Center
                      </span>
                    </div>

                    {/* Delivery Truck Live Node */}
                    <div className="absolute left-[46%] top-[38%] flex flex-col items-center animate-bounce">
                      <div className="w-9 h-9 rounded-full bg-[#0875E1] text-white flex items-center justify-center shadow-lg ring-4 ring-blue-100">
                        <Truck className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Pin 2: Destination */}
                    <div className="absolute right-[16%] top-[30%] flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md">
                        <MapPin className="w-5 h-5 fill-white" />
                      </div>
                      <span className="text-[10px] font-bold bg-white/90 text-[#0F172A] px-1.5 py-0.5 rounded shadow-2xs mt-1 whitespace-nowrap">
                        Your Location (Anna Nagar, Chennai)
                      </span>
                    </div>

                    {/* Bottom Info Floating Card */}
                    <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-gray-200/80 shadow-md flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0F172A]">Your order is 4.2 km away</p>
                        <p className="text-xs font-extrabold text-[#10B981]">Estimated delivery in 1 hr 12 mins</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRACKING UPDATES TIMELINE */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-[#0F172A]">Tracking Updates</h3>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
                    
                    {/* Event 1 */}
                    <div className="relative">
                      <div className="absolute -left-[19px] top-0.5 w-4 h-4 rounded-full bg-[#10B981] ring-4 ring-emerald-50"></div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#10B981]">Out for Delivery</h4>
                          <span className="text-[11px] font-medium text-gray-400">17 Sep 2025, 08:20 AM</span>
                        </div>
                        <p className="text-xs text-gray-600">Your order is out for delivery. Our delivery partner will reach you soon.</p>
                      </div>
                    </div>

                    {/* Event 2 */}
                    <div className="relative">
                      <div className="absolute -left-[19px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-gray-400"></div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#0F172A]">Arrived at Delivery Station</h4>
                          <span className="text-[11px] font-medium text-gray-400">17 Sep 2025, 06:15 AM</span>
                        </div>
                        <p className="text-xs text-gray-500">Your order has arrived at Chennai delivery station.</p>
                      </div>
                    </div>

                    {/* Event 3 */}
                    <div className="relative">
                      <div className="absolute -left-[19px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-gray-400"></div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#0F172A]">In Transit</h4>
                          <span className="text-[11px] font-medium text-gray-400">16 Sep 2025, 09:15 AM</span>
                        </div>
                        <p className="text-xs text-gray-500">Your order is on the way to Chennai delivery station.</p>
                      </div>
                    </div>

                    {/* Event 4 */}
                    <div className="relative">
                      <div className="absolute -left-[19px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-gray-400"></div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#0F172A]">Shipped</h4>
                          <span className="text-[11px] font-medium text-gray-400">15 Sep 2025, 06:30 PM</span>
                        </div>
                        <p className="text-xs text-gray-500">Your order has been shipped from the fulfillment center.</p>
                      </div>
                    </div>

                    {/* Event 5 */}
                    <div className="relative">
                      <div className="absolute -left-[19px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-gray-400"></div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#0F172A]">Order Placed</h4>
                          <span className="text-[11px] font-medium text-gray-400">15 Sep 2025, 10:24 AM</span>
                        </div>
                        <p className="text-xs text-gray-500">Your order has been confirmed.</p>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* RIGHT SUB-COLUMN SIDEBAR (ORDER ITEMS, CARRIER, ADDRESS, HELP) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* CARD 1: ORDER ITEMS (4) */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-[#0F172A]">Order Items (4)</h3>
                  
                  <div className="space-y-3 divide-y divide-gray-100">
                    <div className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#0F172A] leading-tight">Sony WH-1000XM5 Wireless Headphones</p>
                          <p className="text-[11px] text-gray-400">Qty: 1</p>
                        </div>
                      </div>
                      <span className="font-black text-[#0F172A] flex-shrink-0">₹29,990</span>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#0F172A] leading-tight">Samsung Galaxy Watch6</p>
                          <p className="text-[11px] text-gray-400">Qty: 1</p>
                        </div>
                      </div>
                      <span className="font-black text-[#0F172A] flex-shrink-0">₹24,999</span>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#0F172A] leading-tight">Nike Air Zoom Pegasus 40</p>
                          <p className="text-[11px] text-gray-400">Qty: 1</p>
                        </div>
                      </div>
                      <span className="font-black text-[#0F172A] flex-shrink-0">₹8,999</span>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#0F172A] leading-tight">iPhone 15 (128GB)</p>
                          <p className="text-[11px] text-gray-400">Qty: 1</p>
                        </div>
                      </div>
                      <span className="font-black text-[#0F172A] flex-shrink-0">₹69,999</span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: DELIVERY PARTNER */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
                  <h3 className="font-bold text-sm text-[#0F172A]">Delivery Partner</h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0875E1] flex items-center justify-center font-black text-xs">
                        BD
                      </div>
                      <div>
                        <p className="font-bold text-[#0F172A]">BlueDart</p>
                        <p className="text-[11px] text-gray-400 font-mono">Tracking ID: {shipment?.tracking_number || 'BD123456789IN'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[#0875E1] font-bold text-xs pt-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>+91 1800 233 1234</span>
                    </div>

                    <button 
                      onClick={() => window.open('https://www.bluedart.com', '_blank')}
                      className="w-full border border-blue-200 hover:bg-blue-50/50 text-[#0875E1] py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 mt-2"
                    >
                      <span>Track on BlueDart</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* CARD 3: DELIVERY ADDRESS */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-2">
                  <h3 className="font-bold text-sm text-[#0F172A]">Delivery Address</h3>
                  
                  <div className="flex items-start space-x-2 text-xs text-gray-600 pt-1">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#0F172A]">
                        {(customer as any)?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Naveen Kumar'}
                      </p>
                      <p className="text-gray-500">#12, 3rd Cross Street, Anna Nagar</p>
                      <p className="text-gray-500">Chennai, Tamil Nadu 600001</p>
                      <p className="text-gray-400 font-mono text-[11px] pt-1">Phone: {customer?.phone || '+91 98765 43210'}</p>
                    </div>
                  </div>
                </div>

                {/* CARD 4: NEED HELP */}
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 shadow-xs text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-white text-[#0875E1] flex items-center justify-center mx-auto shadow-2xs">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs text-[#0F172A]">Need Help?</h4>
                    <p className="text-[11px] text-gray-600">Our support team is here for you.</p>
                  </div>
                  <button
                    onClick={() => navigate('/help')}
                    className="w-full bg-white hover:bg-gray-50 text-[#0875E1] border border-blue-200 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs"
                  >
                    Contact Support
                  </button>
                </div>

              </div>
            </div>
            </>
            )}
          </section>
        </div>
      </main>

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
