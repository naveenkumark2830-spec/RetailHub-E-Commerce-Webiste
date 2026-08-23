import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, ArrowLeft, User, ShoppingCart, Heart, 
  Trash2, X, Plus, Minus, Zap, LogOut, CheckCircle, Ticket, Tag
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore, CartItem } from '../store/useCartStore';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, customer, isAuthenticated, logout, terminateSession } = useSessionStore();
  const { 
    items, 
    savedItems,
    cartSummary,
    error,
    fetchCart,
    updateCartItemQuantity,
    removeItemFromCart,
    applyCouponCode,
    removeCouponCode,
    saveItemForLater,
    moveSavedItemToCart,
    removeSavedItem
  } = useCartStore();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track removal surveys
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState('not_specified');

  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session]);

  // Log cart page view
  useEffect(() => {
    logTelemetryEvent('page_view', { page: 'cart' });
  }, [session]);

  const logTelemetryEvent = async (eventType: string, metadata: any = {}) => {
    if (!session) return;
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          page: 'cart',
          device: 'desktop',
          browser: 'Chrome',
          metadata
        })
      });
    } catch (e) {
      console.warn('[Telemetry Error]', e);
    }
  };

  const handleQtyChange = async (item: CartItem, newQty: number) => {
    if (newQty < 1) return;
    if (newQty > item.stock) {
      showTemporaryError(`Only ${item.stock} units are currently available.`);
      return;
    }
    await updateCartItemQuantity(item.product_id, newQty, item.quantity);
    showTemporaryAlert(`Quantity updated to ${newQty}.`);
  };

  const triggerRemoveProcess = (productId: string) => {
    setRemovingProductId(productId);
    setRemoveReason('not_specified');
  };

  const handleConfirmRemove = async (item: CartItem) => {
    await removeItemFromCart(item.product_id, removeReason, item.sale_price);
    setRemovingProductId(null);
    showTemporaryAlert(`Removed ${item.name} from your cart.`);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    await applyCouponCode(couponInput.trim().toUpperCase());
    setCouponInput('');
  };

  useEffect(() => {
    if (error) {
      showTemporaryError(error);
    }
  }, [error]);

  const handleSaveForLater = async (productId: string, name: string) => {
    await saveItemForLater(productId);
    showTemporaryAlert(`Saved ${name} for later.`);
  };

  const handleMoveToCart = async (productId: string, name: string) => {
    await moveSavedItemToCart(productId);
    showTemporaryAlert(`Moved ${name} back to active cart.`);
  };

  const handleProceedCheckout = async () => {
    if (!session) return;
    if (!isAuthenticated) {
      navigate('/login?redirect=checkout');
      return;
    }
    
    try {
      const response = await fetch('/api/cart/checkout-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          customer_id: customer?.customer_id || null
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showTemporaryAlert('Checkout validation successful! Redirecting...');
        setTimeout(() => {
          navigate('/checkout');
        }, 800);
      } else {
        showTemporaryError(data.error || 'Inventory checkout validation failed.');
      }
    } catch (e) {
      showTemporaryError('Checkout initiation failed. Please try again.');
    }
  };

  const showTemporaryAlert = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 3000);
  };

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const handleExitSession = async () => {
    if (isAuthenticated) {
      await logout();
    } else {
      await terminateSession();
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42] font-sans">
      
      {/* FLOATING ALERTS */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#0071DC] text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold font-mono border border-white/20"
          >
            <CheckCircle className="w-4 h-4 text-[#FFC220] fill-[#FFC220]" />
            <span>{infoMessage}</span>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold font-mono border border-white/20"
          >
            <Zap className="w-4 h-4 text-white" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVBAR */}
      <header className="bg-[#0071DC] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div 
            onClick={() => navigate('/home')} 
            className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black tracking-tight">NexDay</span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/home')}
              className="flex items-center space-x-1 text-xs font-bold text-blue-100 hover:text-white bg-white/10 px-3 py-1.5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </button>

            <button 
              onClick={() => navigate('/wishlist')}
              className="flex items-center space-x-1.5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors text-sm font-bold focus:outline-none"
            >
              <Heart className="w-4 h-4 text-rose-200 fill-rose-200" />
              <span>Wishlist</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="flex items-center space-x-1.5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors text-sm font-bold focus:outline-none"
              >
                <User className="w-4 h-4" />
                <span>{isAuthenticated && customer ? `Hi, ${customer.first_name}` : 'Account'}</span>
              </button>

              <AnimatePresence>
                {isAccountOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 text-[#041E42] z-50 text-xs space-y-3"
                  >
                    <div className="border-b pb-2">
                      <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Session Status</p>
                      <p className="font-mono text-[#0071DC] font-bold overflow-hidden text-ellipsis">{session?.session_id || 'No active session'}</p>
                    </div>

                    {isAuthenticated && customer ? (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-700">User: <span className="font-bold">{customer.first_name}</span></p>
                        <p className="font-medium text-gray-700">Membership: <span className="font-bold uppercase text-[#FFC220]">{customer.membership}</span></p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setIsAccountOpen(false); navigate('/login'); }}
                        className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-full font-bold transition-colors"
                      >
                        Sign In
                      </button>
                    )}

                    <button 
                      onClick={handleExitSession}
                      className="w-full border border-red-200 hover:bg-red-50 text-red-600 py-2 rounded-full font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isAuthenticated ? 'Logout' : 'Exit Session'}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* HEADER LABEL */}
      <section className="bg-white border-b py-6 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-baseline justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-[#041E42]">Shopping Cart</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              {items.length} {items.length === 1 ? 'item' : 'items'} in active cart
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400 bg-gray-50 border px-3 py-1 rounded-xl">
            {isAuthenticated ? 'Member Account Cart' : 'Guest Session Cart'}
          </span>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ACTIVE ITEMS & SAVE FOR LATER */}
        <div className="lg:col-span-2 space-y-8">
          
          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => {
                const priceDiff = item.added_price - item.sale_price;
                const isPriceDropped = priceDiff > 0;
                const isPriceIncreased = priceDiff < 0;

                return (
                  <div 
                    key={item.product_id}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-6 relative"
                  >
                    
                    {/* Item content block */}
                    <div className="flex items-start space-x-4">
                      {/* Placeholder Image */}
                      <div className="bg-gray-50 w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                        <span className="text-[10px] font-black uppercase text-gray-300">{item.brand}</span>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{item.brand}</p>
                        <h3 
                          onClick={() => navigate(`/product/${item.product_id}`)}
                          className="text-xs font-extrabold text-gray-800 leading-snug cursor-pointer hover:text-[#0071DC] transition-colors line-clamp-2"
                        >
                          {item.name}
                        </h3>

                        <div className="pt-1 flex items-baseline space-x-2">
                          <span className="text-base font-black text-[#041E42]">₹{item.sale_price.toLocaleString()}</span>
                          {item.discount > 0 && (
                            <span className="text-xs text-gray-400 line-through">₹{item.price.toLocaleString()}</span>
                          )}
                        </div>

                        {/* Price drop dynamic label */}
                        {isPriceDropped && (
                          <span className="inline-block text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Price dropped by ₹{priceDiff.toLocaleString()}!
                          </span>
                        )}
                        {isPriceIncreased && (
                          <span className="inline-block text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            Price increased by ₹{Math.abs(priceDiff).toLocaleString()}
                          </span>
                        )}

                        <div className="text-[10px] font-bold space-y-0.5 pt-1.5 text-gray-500">
                          <p className={item.stock > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {item.stock > 0 ? `✓ In Stock (${item.stock} available)` : 'Out of Stock'}
                          </p>
                          <p>Delivery Speed: {item.delivery_days <= 1 ? 'Tomorrow' : `Within ${item.delivery_days} days`}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quantity controls & deletion block */}
                    <div className="flex flex-col justify-between items-end gap-4 min-w-[120px]">
                      
                      <div className="flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded-xl border">
                        <button 
                          onClick={() => handleQtyChange(item, item.quantity - 1)}
                          className="p-1 text-gray-500 hover:text-[#041E42] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => handleQtyChange(item, item.quantity + 1)}
                          className="p-1 text-gray-500 hover:text-[#041E42] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-bold text-gray-500">
                        <button 
                          onClick={() => handleSaveForLater(item.product_id, item.name)}
                          className="hover:text-[#0071DC] transition-colors"
                        >
                          Save for Later
                        </button>
                        <span>&bull;</span>
                        
                        <button 
                          onClick={() => triggerRemoveProcess(item.product_id)}
                          className="hover:text-red-600 transition-colors flex items-center space-x-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* MODAL REMOVE SURVEY POP-UP OVER CARD */}
                    <AnimatePresence>
                      {removingProductId === item.product_id && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-white/95 rounded-3xl p-6 z-10 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Why are you removing this item?</h4>
                            <p className="text-[10px] text-gray-400">Your feedback helps us customize price recommendations.</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600">
                            {[
                              { label: 'Too Expensive', val: 'too_expensive' },
                              { label: 'Found Better alternative', val: 'better_product' },
                              { label: 'Slow Delivery Estimate', val: 'delivery_took_long' },
                              { label: 'Added by Mistake', val: 'mistake' },
                              { label: 'No longer needed', val: 'not_needed' },
                              { label: 'Other Reason', val: 'other' }
                            ].map(opt => (
                              <button 
                                key={opt.val}
                                onClick={() => setRemoveReason(opt.val)}
                                className={`px-3 py-1.5 rounded-xl border text-left transition-colors ${removeReason === opt.val ? 'border-[#0071DC] bg-blue-50 text-[#0071DC]' : 'hover:bg-gray-50'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          <div className="flex justify-end space-x-2 pt-2 border-t text-xs font-bold">
                            <button 
                              onClick={() => setRemovingProductId(null)}
                              className="px-4 py-2 border rounded-full hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleConfirmRemove(item)}
                              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors flex items-center space-x-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Confirm Remove</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}
            </div>
          ) : (
            /* EMPTY STATE fallback */
            <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <div className="p-4 bg-blue-50 text-[#0071DC] rounded-full">
                  <ShoppingCart className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-gray-800">Your Cart is Empty</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">Fill your cart with electronics, smart watches, sneakers, or kitchen tools to proceed to checkout!</p>
              </div>
              <button 
                onClick={() => navigate('/home')}
                className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md inline-flex items-center space-x-1"
              >
                <span>Browse Catalog</span>
              </button>
            </div>
          )}

          {/* SAVE FOR LATER DRAWER SECTION */}
          {savedItems.length > 0 && (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-base font-black text-gray-800">Saved for Later ({savedItems.length})</h2>
                <p className="text-[10px] text-gray-400">Postponed purchases stored safely outside active checkout calculations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedItems.map((item) => (
                  <div 
                    key={item.product_id}
                    className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex space-x-3">
                      <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-black uppercase text-gray-400">{item.brand}</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-extrabold text-gray-800 line-clamp-2 leading-tight">{item.name}</h4>
                        <span className="text-xs font-black text-[#041E42]">₹{item.sale_price.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2.5 text-[10px] font-bold text-gray-500">
                      <button 
                        onClick={() => removeSavedItem(item.product_id)}
                        className="hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                      <button 
                        onClick={() => handleMoveToCart(item.product_id, item.name)}
                        className="bg-[#0071DC] text-white px-3 py-1.5 rounded-lg hover:bg-[#0046BE] transition-colors"
                      >
                        Move to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY SIDE PANEL */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-black border-b pb-3">Order Summary</h3>

            {cartSummary ? (
              <div className="space-y-4 text-xs font-bold text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-gray-800">₹{cartSummary.subtotal.toLocaleString()}</span>
                </div>

                {cartSummary.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 bg-emerald-50 p-2 rounded-lg items-center">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Coupon Discount ({cartSummary.coupon_code})</span>
                    </span>
                    <span>-₹{cartSummary.discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="text-gray-800">{cartSummary.shipping === 0 ? 'FREE' : `₹${cartSummary.shipping}`}</span>
                </div>

                <div className="flex justify-between">
                  <span>Estimated GST (18%)</span>
                  <span className="text-gray-800">₹{cartSummary.tax.toLocaleString()}</span>
                </div>

                <div className="border-t pt-4 flex justify-between items-baseline text-sm font-black text-[#041E42]">
                  <span>Grand Total</span>
                  <span className="text-xl">₹{cartSummary.total.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-bold">Calculate price summaries after adding items...</p>
            )}

            {/* Coupon forms */}
            <div className="border-t pt-4 space-y-3">
              {cartSummary?.coupon_code ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#0071DC]">
                    <Ticket className="w-4 h-4" />
                    <span>Applied: {cartSummary.coupon_code}</span>
                  </span>
                  <button onClick={removeCouponCode} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter Coupon (SAVE10)" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-grow border px-3 py-2 text-xs rounded-xl focus:outline-none focus:border-[#0071DC]"
                  />
                  <button 
                    type="submit" 
                    className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>

            <button 
              onClick={handleProceedCheckout}
              disabled={items.length === 0}
              className="w-full bg-[#FFC220] hover:bg-[#E5AC12] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-[#041E42] py-3.5 rounded-full font-black text-xs transition-colors shadow-md flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-4 h-4 fill-[#041E42]" />
              <span>Proceed to Checkout</span>
            </button>
          </div>

          {/* Coupon codes references helper card */}
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl text-xs font-bold space-y-3">
            <h4 className="text-blue-900 flex items-center gap-1 text-[11px] uppercase tracking-wider font-black">
              <Ticket className="w-4 h-4 text-blue-700" />
              <span>Available Coupon Codes</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-blue-800">
              <li>&bull; <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">SAVE10</span>: 10% off orders above ₹1,000 (max ₹500 discount)</li>
              <li>&bull; <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">NEXDAY500</span>: Flat ₹500 off orders above ₹3,000</li>
              <li>&bull; <span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">FIRSTBUY</span>: 15% off orders above ₹500 (max ₹300 discount)</li>
            </ul>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-12 px-6 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#FFC220]">NexDay Shopping Cart</h4>
            <p className="text-gray-300 text-xs">Operational shopping cart items calculation with strict inventory validation checks before order reservation.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#FFC220]">Telemetry Status</h4>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] font-mono">
              <p>Active Session: {session?.session_id}</p>
              <p>Applied Coupon: {cartSummary?.coupon_code || 'None'}</p>
              <p>Grand Total: ₹{cartSummary?.total.toLocaleString() || '0'}</p>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-xs text-gray-400">NexDay details &bull; Real Images Catalog</p>
          </div>
        </div>
      </footer>

    </div>
  );
};
