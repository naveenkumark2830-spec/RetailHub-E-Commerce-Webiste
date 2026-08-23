import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Package, 
  Truck, 
  Clipboard, 
  CreditCard, 
  RefreshCw, 
  Camera, 
  Sparkles,
  X,
  TrendingUp
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

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
  address: {
    address_id: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  } | null;
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
  inspection_status: string;
  product_name: string;
  sku: string;
}

interface Refund {
  refund_id: string;
  return_id: string;
  order_id: string;
  payment_id: string;
  customer_id: string;
  refund_method: string;
  refund_amount: number;
  refund_status: string;
  refund_reference: string | null;
  failure_reason: string | null;
  initiated_at: string;
  completed_at: string | null;
}

interface ActiveReturn {
  return_id: string;
  order_id: string;
  customer_id: string;
  return_status: string;
  return_reason: string;
  customer_comments: string | null;
  pickup_address_id: string;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  picked_up_at: string | null;
  received_at: string | null;
  completed_at: string | null;
  items: ReturnItem[];
  refund: Refund | null;
}

export const ReturnPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { customer, session } = useSessionStore();
  const hasLoggedPageView = useRef(false);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [activeReturn, setActiveReturn] = useState<ActiveReturn | null>(null);
  const [returnExists, setReturnExists] = useState(false);

  // Form Fields State
  const [selectedItems, setSelectedItems] = useState<{ [orderItemId: string]: boolean }>({});
  const [selectedQuantities, setSelectedQuantities] = useState<{ [orderItemId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('PRODUCT_DAMAGED');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Mock Upload Image State
  const [mockImages, setMockImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Dev simulator states
  const [simulateFail, setSimulateFail] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Fetch Return Status and Order Details
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/returns/by-order/${orderId}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to fetch return status.');
        setIsLoading(false);
        return;
      }

      setOrderDetails(data.orderDetails);
      setReturnExists(data.returnExists);
      if (data.returnExists) {
        setActiveReturn(data.activeReturn);
      } else {
        // Pre-fill quantities
        const initialQuants: { [id: string]: number } = {};
        data.orderDetails.items.forEach((item: OrderItem) => {
          initialQuants[item.order_item_id] = item.quantity;
        });
        setSelectedQuantities(initialQuants);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load return information:', err);
      setErrorMsg('Network error. Failed to load details.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  // Page View Telemetry Logging
  useEffect(() => {
    if (!isLoading && orderDetails && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session?.session_id || 'sess_ex3mk4wa',
          customer_id: customer?.customer_id || 'guest',
          user_type: customer ? 'registered' : 'guest',
          page: 'return_refund',
          context: {
            country: customer?.country || 'India',
            state: customer?.state || 'Karnataka',
            city: customer?.city || 'Bengaluru',
            device: 'desktop',
            browser: 'Chrome'
          },
          metadata: {
            order_id: orderId,
            return_exists: returnExists
          }
        })
      }).catch(err => console.error('Failed to log page view telemetry:', err));
    }
  }, [isLoading, orderDetails]);

  // Handle image upload simulation
  const handleImageUploadSim = () => {
    setIsUploading(true);
    setTimeout(() => {
      setMockImages(prev => [
        ...prev,
        `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80`
      ]);
      setIsUploading(false);
    }, 1200);
  };

  // Helper to determine return window days by category/name
  const getReturnWindowDays = (item: OrderItem): number => {
    if (item.return_eligible === 0) return 0;
    const cat = (item.category || '').toLowerCase();
    const name = item.product_name.toLowerCase();

    if (cat.includes('electr') || cat.includes('mobile') || name.includes('headphone') || name.includes('device')) {
      return 7;
    }
    if (cat.includes('cloth') || cat.includes('fashion') || cat.includes('shoe')) {
      return 15;
    }
    if (cat.includes('groc') || cat.includes('food') || cat.includes('pantry') || name.includes('snack')) {
      return 0; // Not returnable
    }
    return 7; // Default return window
  };

  // Helper to evaluate item eligibility status
  const evaluateEligibility = (item: OrderItem): { eligible: boolean; reason: string; windowDays: number } => {
    if (item.return_eligible === 0) {
      return { eligible: false, reason: 'Non-Returnable', windowDays: 0 };
    }

    const windowDays = getReturnWindowDays(item);
    if (windowDays === 0) {
      return { eligible: false, reason: 'Category Non-Returnable', windowDays: 0 };
    }

    // Evaluate return window days since order created
    if (!orderDetails) return { eligible: false, reason: 'System Loading', windowDays };

    const orderTime = new Date(orderDetails.created_at).getTime();
    const msSinceOrder = Date.now() - orderTime;
    const daysSinceOrder = Math.floor(msSinceOrder / (1000 * 60 * 60 * 24));

    if (daysSinceOrder > windowDays) {
      return { eligible: false, reason: `Expired (Window was ${windowDays} days)`, windowDays };
    }

    return { eligible: true, reason: 'Eligible', windowDays };
  };

  // Calculate estimated refund for selected items
  const getRefundEstimate = () => {
    if (!orderDetails) return 0;
    return orderDetails.items.reduce((total, item) => {
      if (selectedItems[item.order_item_id]) {
        const qty = selectedQuantities[item.order_item_id] || 1;
        // Compute item ratio refund based on coupon discount ratio
        const proportion = item.final_price / (item.unit_price * item.quantity);
        const refundPerUnit = item.unit_price * proportion;
        return total + (refundPerUnit * qty);
      }
      return total;
    }, 0);
  };

  // Submit return request
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderDetails || !customer) return;

    const itemsToReturn = orderDetails.items
      .filter(item => selectedItems[item.order_item_id])
      .map(item => {
        const qty = selectedQuantities[item.order_item_id] || 1;
        const proportion = item.final_price / (item.unit_price * item.quantity);
        const refundAmt = Math.round(item.unit_price * proportion * qty);
        return {
          order_item_id: item.order_item_id,
          product_id: item.product_id,
          quantity: qty,
          item_price: item.unit_price,
          refund_amount: refundAmt
        };
      });

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/returns/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          customer_id: customer.customer_id,
          return_reason: returnReason,
          customer_comments: comments,
          pickup_address_id: orderDetails.address?.address_id || 'ADDR-DEFAULT',
          items: itemsToReturn
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessToast('Return request submitted successfully!');
        setTimeout(() => {
          setSuccessToast(null);
          fetchData();
        }, 1500);
      } else {
        alert(data.error || 'Failed to request return.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to send request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulate advancing the return lifecycle state
  const handleSimulateStep = async (nextStatus: string) => {
    if (!activeReturn) return;
    setIsSimulating(true);

    try {
      const response = await fetch(`/api/returns/${activeReturn.return_id}/simulate-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          next_status: nextStatus,
          simulate_fail: simulateFail
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessToast(`Status updated to ${nextStatus}!`);
        setTimeout(() => {
          setSuccessToast(null);
          fetchData();
        }, 1200);
      } else {
        alert(data.error || 'Simulation update failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network failure running developer simulation.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper to check return status index for timeline tracker
  const getReturnStatusIndex = (status: string) => {
    const order = [
      'REQUESTED',
      'APPROVED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'RECEIVED',
      'COMPLETED'
    ];
    return order.indexOf(status);
  };

  const currentStatusIndex = activeReturn ? getReturnStatusIndex(activeReturn.return_status) : -1;

  return (
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42]">
      
      {/* HEADER NAVBAR */}
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

          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl w-full mx-auto flex-grow p-6 space-y-6">
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : errorMsg ? (
          <div className="bg-white p-12 rounded-3xl border border-red-100 text-center space-y-4 shadow-sm">
            <div className="text-red-500 w-16 h-16 mx-auto flex items-center justify-center bg-red-50 rounded-full">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-700">Order returns not available</h3>
            <p className="text-xs text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">{errorMsg}</p>
            <button 
              onClick={() => navigate('/orders')}
              className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full font-bold text-xs transition-colors"
            >
              Back to Orders
            </button>
          </div>
        ) : !returnExists && orderDetails ? (
          
          /* ------------------------------------------------------------- */
          /* CASE A: REQUEST FORM                                          */
          /* ------------------------------------------------------------- */
          <div className="space-y-6">
            
            {/* INTRO CARD */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black">Request Return / Refund</h2>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">Order Reference: {orderDetails.order_id}</p>
                </div>
                <span className="text-[10px] font-black uppercase bg-blue-50 text-[#0071DC] px-2.5 py-1 rounded-full border border-blue-100">
                  Return Window Active
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-50 text-xs text-gray-500">
                <p>Ordered on: <span className="font-bold text-[#041E42]">{new Date(orderDetails.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                <p>Delivery Status: <span className="font-black text-emerald-600 uppercase">{orderDetails.delivery_status || 'DELIVERED'}</span></p>
              </div>
            </div>

            {/* FORM CARD */}
            <form onSubmit={handleSubmitReturn} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              
              {/* SELECT ITEMS SECTION */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#041E42] tracking-wide">1. Select Items to Return</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">Choose products and quantities to return from this purchase.</p>
                </div>

                <div className="divide-y divide-gray-50">
                  {orderDetails.items.map(item => {
                    const { eligible, reason, windowDays } = evaluateEligibility(item);

                    return (
                      <div key={item.order_item_id} className={`py-4 flex items-start space-x-4 ${!eligible ? 'opacity-50' : ''}`}>
                        
                        {/* CHECKBOX */}
                        <div className="pt-1.5">
                          <input
                            type="checkbox"
                            disabled={!eligible}
                            checked={!!selectedItems[item.order_item_id]}
                            onChange={(e) => {
                              setSelectedItems(prev => ({
                                ...prev,
                                [item.order_item_id]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 rounded text-[#0071DC] focus:ring-[#0071DC] border-gray-300 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* PRODUCT DETAILS */}
                        <div className="flex-grow space-y-1">
                          <h4 className="text-xs font-bold text-[#041E42]">{item.product_name}</h4>
                          <div className="flex flex-wrap gap-x-4 text-[10px] text-gray-400 font-semibold">
                            <span>SKU: {item.sku}</span>
                            <span>Price Paid: ₹{Number(item.unit_price).toLocaleString()}</span>
                            <span>Max Qty: {item.quantity}</span>
                          </div>

                          {/* ELIGIBILITY STICKER */}
                          <div className="pt-1">
                            {eligible ? (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {windowDays} Days Return Window Eligible
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded flex items-center w-fit space-x-1">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>{reason}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* QUANTITY PICKER (IF CHECKED & QUANTITY > 1) */}
                        {selectedItems[item.order_item_id] && item.quantity > 1 && (
                          <div className="flex items-center space-x-2">
                            <label className="text-[10px] text-gray-400 font-bold uppercase">Qty:</label>
                            <select
                              value={selectedQuantities[item.order_item_id] || 1}
                              onChange={(e) => {
                                setSelectedQuantities(prev => ({
                                  ...prev,
                                  [item.order_item_id]: parseInt(e.target.value, 10)
                                }));
                              }}
                              className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs font-bold text-[#041E42] focus:outline-none"
                            >
                              {Array.from({ length: item.quantity }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RETURN REASON SELECT */}
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <h3 className="text-sm font-bold text-[#041E42] tracking-wide">2. Return Reason</h3>
                <div className="max-w-md">
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                  >
                    <option value="PRODUCT_DAMAGED">Product damaged / broken</option>
                    <option value="WRONG_PRODUCT">Received wrong product</option>
                    <option value="NOT_AS_EXPECTED">Not as expected / poor quality</option>
                    <option value="SIZE_ISSUE">Size / fit issue</option>
                    <option value="CHANGED_MIND">Changed mind / no longer needed</option>
                    <option value="OTHER">Other / general reason</option>
                  </select>
                </div>
              </div>

              {/* COMMENTS TEXTAREA */}
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <h3 className="text-sm font-bold text-[#041E42] tracking-wide">3. Additional Comments</h3>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide details about why you want to return these items..."
                  rows={4}
                  className="w-full bg-[#F7F8F9] border border-gray-200 rounded-2xl px-4 py-3 text-xs font-medium text-[#041E42] placeholder-gray-400 focus:outline-none focus:border-[#0071DC] resize-none"
                />
              </div>

              {/* IMAGE UPLOAD UI (SIMULATOR) */}
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <h3 className="text-sm font-bold text-[#041E42] tracking-wide">4. Upload Product Images</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Uploading visual proof helps speed up return review approvals.</p>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleImageUploadSim}
                    disabled={isUploading}
                    className="w-24 h-24 border border-dashed border-gray-300 rounded-2xl flex flex-col justify-center items-center text-gray-400 hover:border-[#0071DC] hover:text-[#0071DC] transition-colors focus:outline-none disabled:opacity-50"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mb-1" />
                        <span className="text-[9px] font-bold uppercase">Add Photo</span>
                      </>
                    )}
                  </button>

                  {mockImages.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <img src={img} alt="Uploaded item preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setMockImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-[#041E42]/80 text-white rounded-full p-1 hover:bg-red-500 transition-colors focus:outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* REFUND METHOD SUMMARY */}
              <div className="space-y-4 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-[#041E42] tracking-wide">5. Refund Destination</h3>
                
                <div className="bg-[#F7F8F9] p-5 rounded-2xl border border-gray-100 flex items-center space-x-3 text-xs">
                  <div className="bg-blue-50 text-[#0071DC] p-2.5 rounded-full border border-blue-100">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-[#041E42]">Refund to Original Payment Method</h4>
                    <p className="text-gray-400 font-semibold mt-0.5 uppercase">Transaction routed via: {orderDetails.payment_method || 'UPI'}</p>
                  </div>
                </div>

                {/* ESTIMATED REFUND CARD */}
                <div className="bg-gradient-to-br from-[#0071DC]/5 via-white to-[#FFC220]/5 p-6 rounded-2xl border border-gray-100 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-black text-gray-500 uppercase tracking-wider text-[10px]">Estimated refund amount</h4>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Calculated based on coupon deductions proportion</p>
                  </div>
                  <span className="text-xl font-black text-[#0071DC]">₹{Math.round(getRefundEstimate()).toLocaleString()}</span>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-4 text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-8 py-3 rounded-full font-black text-xs transition-colors shadow-md flex items-center space-x-2 mx-auto focus:outline-none disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting request...</span>
                    </>
                  ) : (
                    <span>REQUEST RETURN</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        ) : activeReturn && orderDetails ? (
          
          /* ------------------------------------------------------------- */
          /* CASE B: RETURN TIMELINE                                       */
          /* ------------------------------------------------------------- */
          <div className="space-y-6">
            
            {/* RETURN META SNAPSHOT */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black">Return Request Timeline</h2>
                    <span className="text-[9px] font-bold text-gray-400 font-mono">({activeReturn.return_id})</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-semibold">Order Reference: {activeReturn.order_id}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase bg-blue-50 text-[#0071DC] px-2.5 py-1 rounded-full border border-blue-100">
                    STATUS: {activeReturn.return_status}
                  </span>
                  {activeReturn.return_status === 'REJECTED' && (
                    <span className="text-[10px] font-black uppercase bg-red-50 text-red-500 px-2.5 py-1 rounded-full border border-red-100">
                      Rejected
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-50 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                <p>Return Reason: <span className="font-bold text-[#041E42]">{activeReturn.return_reason.replace('_', ' ')}</span></p>
                {activeReturn.customer_comments && (
                  <p>Comments: <span className="font-medium text-gray-600">"{activeReturn.customer_comments}"</span></p>
                )}
              </div>
            </div>

            {/* PROGRESS TRACKER VIEW */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              
              <div className="text-sm font-black uppercase text-gray-400 tracking-wider">
                Logistical Progress Timeline
              </div>

              {/* TIMELINE TRACKER CHART */}
              <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                
                {/* 1. Requested */}
                <div className="relative">
                  <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    currentStatusIndex >= 0 ? 'bg-[#0071DC] border-[#0071DC] text-white' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <Clipboard className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#041E42]">Return Requested</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Return request successfully placed by customer.</p>
                    {activeReturn.requested_at && (
                      <p className="text-[9px] font-mono text-gray-400 font-bold mt-1">
                        {new Date(activeReturn.requested_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Review Decision (Approved / Rejected) */}
                <div className="relative">
                  <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    activeReturn.return_status === 'REJECTED' 
                      ? 'bg-red-500 border-red-500 text-white'
                      : currentStatusIndex >= 1 
                        ? 'bg-[#0071DC] border-[#0071DC] text-white' 
                        : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#041E42]">
                      {activeReturn.return_status === 'REJECTED' ? 'Return Rejected' : 'Return Request Reviewed'}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {activeReturn.return_status === 'REJECTED' 
                        ? 'Request was rejected due to window expiration or item parameter violations.' 
                        : 'Customer Support reviews items and eligibility details.'}
                    </p>
                    {activeReturn.approved_at && (
                      <p className="text-[9px] font-mono text-gray-400 font-bold mt-1">
                        Approved: {new Date(activeReturn.approved_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {activeReturn.rejected_at && (
                      <p className="text-[9px] font-mono text-red-400 font-bold mt-1">
                        Rejected: {new Date(activeReturn.rejected_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Pickup Scheduled */}
                <div className="relative">
                  <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    currentStatusIndex >= 2 ? 'bg-[#0071DC] border-[#0071DC] text-white' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#041E42]">Pickup Scheduled</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Logistics courier partner scheduled to pickup items.</p>
                  </div>
                </div>

                {/* 4. Picked Up */}
                <div className="relative">
                  <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    currentStatusIndex >= 3 ? 'bg-[#0071DC] border-[#0071DC] text-white' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#041E42]">Picked Up by Courier</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Courier swept pickup address and collected the package.</p>
                    {activeReturn.picked_up_at && (
                      <p className="text-[9px] font-mono text-gray-400 font-bold mt-1">
                        Picked up: {new Date(activeReturn.picked_up_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. Received & Inspected */}
                <div className="relative">
                  <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    currentStatusIndex >= 4 ? 'bg-[#0071DC] border-[#0071DC] text-white' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#041E42]">Received & Inspected</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Warehouse scanned packages and completed quality verification check.</p>
                    {activeReturn.received_at && (
                      <p className="text-[9px] font-mono text-gray-400 font-bold mt-1">
                        Received: {new Date(activeReturn.received_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* 6. Refund Processed */}
                <div className="relative">
                  <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    activeReturn.refund?.refund_status === 'FAILED'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : currentStatusIndex >= 5 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#041E42]">Refund Completed</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Banking interface processes payment refund request.</p>

                    {/* Refund Snapshot */}
                    {activeReturn.refund && (
                      <div className="mt-3 p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5 text-xs max-w-md">
                        <div className="flex justify-between font-bold">
                          <span>Refund Reference:</span>
                          <span className="font-mono text-[#041E42]">{activeReturn.refund.refund_reference || 'REF-PROCESSING'}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Method:</span>
                          <span className="uppercase">{activeReturn.refund.refund_method}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Amount:</span>
                          <span className="text-[#0071DC] font-black">₹{Number(activeReturn.refund.refund_amount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold items-center">
                          <span>Payment Status:</span>
                          {activeReturn.refund.refund_status === 'SUCCESS' ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold uppercase text-[9px]">SUCCESS</span>
                          ) : activeReturn.refund.refund_status === 'FAILED' ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold uppercase text-[9px]">FAILED</span>
                          ) : (
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold uppercase text-[9px] animate-pulse">PROCESSING</span>
                          )}
                        </div>
                        {activeReturn.refund.failure_reason && (
                          <div className="text-[10px] text-rose-500 font-bold border-t border-rose-50 pt-1.5 mt-1.5">
                            Reason: {activeReturn.refund.failure_reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* RETURN ITEMS TABLE */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Items in Return Package</h3>
              
              <div className="divide-y divide-gray-50 text-xs">
                {activeReturn.items.map(item => (
                  <div key={item.return_item_id} className="py-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-[#041E42]">{item.product_name}</h4>
                      <p className="text-[9px] font-mono text-gray-400 mt-0.5">SKU: {item.sku} | Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[#041E42] font-black">₹{Number(item.refund_amount).toLocaleString()}</span>
                      <p className="text-[9px] font-bold text-emerald-600 mt-0.5 bg-emerald-50 px-1.5 py-0.2 rounded w-fit ml-auto">
                        Inspection: {item.inspection_status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null}

      </main>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-6 text-center text-xs font-bold">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. All transactions are securely routed through mock banking interfaces.</p>
      </footer>

      {/* SUCCESS TOAST MESSAGE */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 bg-[#041E42] text-white border border-[#FFC220] px-6 py-4.5 rounded-2xl shadow-xl z-50 flex items-center space-x-3 text-xs"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-1.5 rounded-full">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEVELOPER SIMULATOR CONTROLS (FLOATING CONSOLE) */}
      {activeReturn && (
        <div className="fixed bottom-6 right-6 z-45">
          {isSimulating ? (
            <div className="bg-white p-4 rounded-full shadow-lg border border-gray-100 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0071DC]" />
              <span className="text-[10px] font-black uppercase text-gray-500">Syncing database state...</span>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden w-80 text-xs">
              
              {/* Simulator Header */}
              <div className="bg-[#041E42] text-white px-4 py-3 font-black uppercase tracking-wider flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-[#FFC220]" />
                  <span className="text-[10px]">Developer Control Panel</span>
                </div>
                <span className="text-[9px] font-bold text-[#FFC220] bg-[#FFC220]/15 px-2 py-0.5 rounded">SIMULATOR</span>
              </div>

              {/* Console Body */}
              <div className="p-4 space-y-4">
                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  Returns lifecycle updates consist of logistical and inspection events. Cycle through status states manually here.
                </p>

                {/* Transition Commands Grid */}
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  
                  {activeReturn.return_status === 'REQUESTED' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSimulateStep('APPROVED')}
                        className="flex-grow bg-[#0071DC] text-white py-2 rounded-lg font-bold hover:bg-[#0046BE] transition-colors focus:outline-none"
                      >
                        Approve Request
                      </button>
                      <button
                        onClick={() => handleSimulateStep('REJECTED')}
                        className="bg-rose-50 text-rose-600 px-3 py-2 rounded-lg font-bold hover:bg-rose-100 transition-colors focus:outline-none"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {activeReturn.return_status === 'APPROVED' && (
                    <button
                      onClick={() => handleSimulateStep('PICKUP_SCHEDULED')}
                      className="w-full bg-[#0071DC] text-white py-2 rounded-lg font-bold hover:bg-[#0046BE] transition-colors focus:outline-none"
                    >
                      Schedule Pickup Carrier
                    </button>
                  )}

                  {activeReturn.return_status === 'PICKUP_SCHEDULED' && (
                    <button
                      onClick={() => handleSimulateStep('PICKED_UP')}
                      className="w-full bg-[#0071DC] text-white py-2 rounded-lg font-bold hover:bg-[#0046BE] transition-colors focus:outline-none"
                    >
                      Mark as Picked Up
                    </button>
                  )}

                  {activeReturn.return_status === 'PICKED_UP' && (
                    <button
                      onClick={() => handleSimulateStep('RECEIVED')}
                      className="w-full bg-[#0071DC] text-white py-2 rounded-lg font-bold hover:bg-[#0046BE] transition-colors focus:outline-none"
                    >
                      Mark as Received at Warehouse
                    </button>
                  )}

                  {activeReturn.return_status === 'RECEIVED' && (
                    <div className="space-y-3">
                      {/* Sim fail checkbox */}
                      <label className="flex items-center space-x-2 cursor-pointer font-bold text-gray-500">
                        <input
                          type="checkbox"
                          checked={simulateFail}
                          onChange={(e) => setSimulateFail(e.target.checked)}
                          className="rounded text-[#0071DC] focus:ring-[#0071DC] border-gray-300"
                        />
                        <span>Simulate Refund Failure</span>
                      </label>

                      <button
                        onClick={() => handleSimulateStep('COMPLETED')}
                        className="w-full bg-emerald-500 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-600 transition-colors focus:outline-none"
                      >
                        Pass Inspection & Refund
                      </button>
                    </div>
                  )}

                  {(activeReturn.return_status === 'REJECTED' || activeReturn.return_status === 'COMPLETED') && (
                    <div className="bg-gray-50 p-2.5 rounded-lg text-center text-[10px] text-gray-400 font-bold uppercase">
                      Return Lifecycle Finished
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
