import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Calendar, ChevronRight, Package, User, CheckCircle } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

interface OrderItem {
  order_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
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
  delivery_status: string;
  created_at: string;
  items?: OrderItem[];
  shipment?: any;
  history?: any[];
  address?: any;
}

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { customer, session } = useSessionStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getActiveTimelineStep = (status: string) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'CONFIRMED': return 1;
      case 'PROCESSING': return 2;
      case 'PACKED': return 3;
      case 'SHIPPED': 
      case 'IN_TRANSIT': return 4;
      case 'OUT_FOR_DELIVERY': return 5;
      case 'DELIVERED': return 6;
      default: return 0;
    }
  };

  const timelineSteps = [
    { label: 'Placed', key: 'PENDING' },
    { label: 'Confirmed', key: 'CONFIRMED' },
    { label: 'Processing', key: 'PROCESSING' },
    { label: 'Packed', key: 'PACKED' },
    { label: 'Dispatched', key: 'SHIPPED' },
    { label: 'Out for Delivery', key: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', key: 'DELIVERED' }
  ];

  const isStepActive = (orderStatus: string, stepIndex: number) => {
    if (orderStatus === 'CANCELLED' || orderStatus === 'RETURNED') return false;
    const currentStep = getActiveTimelineStep(orderStatus);
    return stepIndex <= currentStep;
  };

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
    // Log telemetry click event
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

  return (
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42]">
      {/* HEADER */}
      <header className="bg-[#0071DC] text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => navigate('/home')} 
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">NexDay</span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-1.5 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              <span>My Profile</span>
            </button>
            <button 
              onClick={() => navigate('/home')}
              className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Shop</span>
            </button>
          </div>
        </div>
      </header>

      {/* ORDERS LIST */}
      <main className="max-w-4xl w-full mx-auto flex-grow p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Package className="w-6 h-6 text-[#0071DC]" />
          <h1 className="text-2xl font-black tracking-tight text-gray-800">Your Purchase History</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4 shadow-sm"
          >
            <div className="text-gray-300 w-16 h-16 mx-auto flex items-center justify-center bg-gray-50 rounded-full">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-700">No orders found</h3>
            <p className="text-xs text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
              Looks like you haven't placed any purchases yet. Head back to the store catalog to discover fresh options.
            </p>
            <button 
              onClick={() => navigate('/home')}
              className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full font-bold text-xs transition-colors"
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div 
                key={order.order_id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-6 text-[#041E42]"
              >
                {/* Header Information Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-black text-gray-400 uppercase">Order ID</span>
                      <span className="text-xs font-mono font-black text-[#041E42] bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {order.order_id}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' :
                        order.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 font-bold">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Placed on: {new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span>Payment Status: </span>
                        <span className={`uppercase font-black ${
                          order.payment_status === 'PAID' || order.payment_status === 'REFUNDED' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>{order.payment_status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase block">Total Amount</span>
                    <span className="text-base font-black text-[#0071DC]">₹{Number(order.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Main Body - Products & Delivery Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Products Nested List */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Purchased Products</p>
                    <div className="space-y-2.5">
                      {order.items?.map((item) => (
                        <div key={item.order_item_id} className="flex justify-between items-center text-xs text-[#041E42] font-semibold gap-4 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                          <span className="truncate max-w-[200px] md:max-w-xs">{item.product_name} <span className="text-gray-400">x{item.quantity}</span></span>
                          {order.delivery_status === 'DELIVERED' && (
                            <button
                              onClick={() => navigate(`/orders/${order.order_id}/review/${item.product_id}`)}
                              className="text-[11px] font-bold text-[#0071DC] hover:text-[#0046BE] hover:underline flex-shrink-0"
                            >
                              Write Review
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Shipping Address & Delivery</p>
                    <div className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 space-y-2 text-xs font-semibold text-gray-600">
                      {order.address ? (
                        <div>
                          <h4 className="font-black text-[#041E42]">{order.address.full_name}</h4>
                          <p className="text-gray-500 font-medium">{order.address.address_line_1}, {order.address.address_line_2 || ''}</p>
                          <p className="text-gray-500 font-medium">{order.address.city}, {order.address.state} - {order.address.postal_code}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400">Address snapshot not available</p>
                      )}
                      
                      {order.shipment ? (
                        <div className="border-t border-gray-200/50 pt-2 flex justify-between items-center">
                          <span className="text-gray-400">Estimated Delivery:</span>
                          <span className="font-extrabold text-[#041E42]">
                            {new Date(order.shipment.estimated_delivery).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Progress Stepper Timeline */}
                {order.status === 'CANCELLED' ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <span className="text-xs font-black uppercase tracking-wider text-red-700">🚫 This order was cancelled and normal fulfillment was halted.</span>
                  </div>
                ) : (
                  <div className="bg-gray-50/30 p-5 rounded-3xl border border-gray-100 space-y-4">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Order Progress Status Tracker</p>
                    <div className="relative flex justify-between items-center w-full pt-2">
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>
                      <div 
                        className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${
                            order.status === 'DELIVERED' ? 100 :
                            order.status === 'OUT_FOR_DELIVERY' ? 83 :
                            order.status === 'SHIPPED' || order.status === 'IN_TRANSIT' ? 66 :
                            order.status === 'PACKED' ? 50 :
                            order.status === 'PROCESSING' ? 33 :
                            order.status === 'CONFIRMED' ? 16 : 0
                          }%` 
                        }}
                      ></div>

                      {timelineSteps.map((stg, idx) => {
                        const active = isStepActive(order.status, idx);
                        return (
                          <div key={stg.key} className="flex flex-col items-center z-10 relative">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm transition-all duration-300 border-2 ${
                              active 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'bg-white border-gray-200 text-gray-400'
                            }`}>
                              {active ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                            </div>
                            <span className={`text-[9px] font-black mt-2 hidden sm:inline uppercase ${
                              active ? 'text-emerald-600' : 'text-gray-400'
                            }`}>
                              {stg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cancel Dispatched Status Warning Banner */}
                {['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-black uppercase tracking-wider text-center">
                    📢 This order has been dispatched and can no longer be cancelled.
                  </div>
                )}

                {/* History Logs */}
                {order.history && order.history.length > 0 && (
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-left space-y-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Timeline Status Logs</p>
                    <div className="relative pl-4 space-y-2.5 before:absolute before:left-[5px] before:top-1.5 before:bottom-1.5 before:w-[1px] before:bg-gray-200">
                      {order.history.slice().reverse().map((evt: any) => (
                        <div key={evt.tracking_event_id} className="text-xs text-gray-600 font-semibold relative flex items-start gap-2">
                          <div className="absolute -left-[14px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"></div>
                          <div className="flex-grow flex justify-between items-center">
                            <span>✓ {evt.status} - {evt.description}</span>
                            <span className="font-mono text-[10px] text-gray-400">
                              {new Date(evt.event_time).toLocaleDateString()} {new Date(evt.event_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Section */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-gray-100 pt-4">
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/invoices/by-order/${order.order_id}`);
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
                    className="border border-gray-200 hover:bg-gray-50 text-[#041E42] px-5 py-2.5 rounded-full font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                  >
                    <span>View Invoice</span>
                  </button>

                  {(order.status === 'DELIVERED' || order.delivery_status === 'DELIVERED') && (
                    <button 
                      onClick={() => navigate(`/orders/${order.order_id}/return`)}
                      className="border border-[#FFC220] hover:bg-[#FFC220]/10 text-[#041E42] px-5 py-2.5 rounded-full font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Return / Refund</span>
                    </button>
                  )}

                  {/* Pre-delivery order cancellation */}
                  {!['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status) && 
                   !['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.delivery_status) && (
                    <button 
                      onClick={() => {
                        setCancelOrderId(order.order_id);
                        setCancelRefundAmount(Number(order.total_amount));
                        setCancelRefundMethod(order.payment_status === 'PAID' ? 'Original Payment Method (Refund)' : 'No Refund Required (COD)');
                        setShowCancelModal(true);
                      }}
                      className="border border-red-250 hover:bg-red-50 text-red-600 px-5 py-2.5 rounded-full font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Cancel Order</span>
                    </button>
                  )}

                  <button 
                    onClick={() => handleTrackOrder(order.order_id)}
                    className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-5 py-2.5 rounded-full font-bold text-xs transition-colors flex items-center space-x-1 justify-center"
                  >
                    <span>Track Package</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* CANCEL ORDER MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full p-6 text-[#041E42] relative overflow-hidden"
            >
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#041E42]">Cancel Order</h2>
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Are you sure you want to cancel Order #{cancelOrderId}?</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Reason for cancellation</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                  >
                    <option value="CHANGED_MIND">Changed my mind</option>
                    <option value="ORDERED_MISTAKE">Ordered by mistake</option>
                    <option value="BETTER_PRICE">Found a better price</option>
                    <option value="DELIVERY_LATE">Delivery taking too long</option>
                    <option value="WRONG_PRODUCT">Ordered wrong product</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="bg-[#F7F8F9] rounded-2xl p-4 space-y-2 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Refund Amount:</span>
                    <span className="font-extrabold text-[#0071DC]">₹{cancelRefundAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Refund Method:</span>
                    <span className="font-extrabold text-gray-700">{cancelRefundMethod}</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelOrderId(null);
                    }}
                    className="w-1/2 border border-gray-200 hover:bg-gray-50 text-[#041E42] py-2.5 rounded-full font-bold text-xs transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={isCancelling}
                    className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-full font-black text-xs transition-colors flex items-center justify-center space-x-2 shadow-md focus:outline-none disabled:opacity-50"
                  >
                    {isCancelling ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Confirm Cancel</span>
                    )}
                  </button>
                </div>
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

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-[#fff] py-6 mt-12 text-center text-xs font-bold">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. All transactions are securely routed through mock banking interfaces.</p>
      </footer>
    </div>
  );
};
