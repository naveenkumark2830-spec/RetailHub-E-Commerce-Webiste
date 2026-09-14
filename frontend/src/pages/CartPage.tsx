import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, ShoppingCart, Trash2, X, Plus, Minus, Zap, 
  CheckCircle, Ticket, ShieldCheck, Truck, ArrowRight, Star, 
  RotateCcw, Headphones as HeadsetIcon, Heart
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore, CartItem } from '../store/useCartStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { getProductImage } from '../utils/productImageMap';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, customer, isAuthenticated } = useSessionStore();
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
    removeSavedItem,
    addItemToCart
  } = useCartStore();

  const [couponInput, setCouponInput] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track selected checkboxes per item
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  // Track removal survey item
  const [removingItem, setRemovingItem] = useState<CartItem | null>(null);
  const [removeReason, setRemoveReason] = useState('not_specified');

  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session]);

  // Keep all item IDs selected by default
  useEffect(() => {
    if (items.length > 0) {
      setSelectedItemIds(items.map(i => i.product_id));
    }
  }, [items.length]);

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

  const triggerRemoveProcess = (item: CartItem) => {
    setRemovingItem(item);
    setRemoveReason('not_specified');
  };

  const handleConfirmRemove = async (item: CartItem) => {
    await removeItemFromCart(item.product_id, removeReason, item.sale_price);
    setRemovingItem(null);
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
    // Save to Wishlist & local storage
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const itemToMove = items.find(i => i.product_id === productId);
      if (itemToMove && !stored.some((w: any) => w.product_id === productId)) {
        stored.push(itemToMove);
        localStorage.setItem('wishlist', JSON.stringify(stored));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {}

    await saveItemForLater(productId);
    showTemporaryAlert(`Moved ${name} to Wishlist.`);
  };

  const handleRemoveSavedItem = async (productId: string) => {
    // Remove from localStorage wishlist & dispatch live storage event
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const updated = stored.filter((w: any) => w.product_id !== productId);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    await removeSavedItem(productId);
    showTemporaryAlert('Removed item from Saved for Later.');
  };

  const handleMoveToCart = async (productId: string, name: string) => {
    // Remove from localStorage wishlist & dispatch live storage event
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const updated = stored.filter((w: any) => w.product_id !== productId);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

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
        }, 600);
      } else {
        showTemporaryError(data.error || 'Inventory checkout validation failed.');
      }
    } catch (e) {
      showTemporaryError('Checkout initiation failed. Please try again.');
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const showTemporaryAlert = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 3000);
  };

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Recommendations List
  const recommendations = [
    { product_id: 'REC1', name: 'AirPods Pro (2nd Gen)', brand: 'APPLE', price: 22900, sale_price: 22900, discount: 0, rating: 4.6, review_count: 9322, image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=300&auto=format&fit=crop' },
    { product_id: 'REC2', name: 'MacBook Air M2', brand: 'APPLE', price: 99900, sale_price: 89990, discount: 10, rating: 4.5, review_count: 4219, image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop' },
    { product_id: 'REC3', name: 'Logitech MX Master 3S', brand: 'LOGITECH', price: 8995, sale_price: 7495, discount: 16, rating: 4.4, review_count: 3812, image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300&auto=format&fit=crop' },
    { product_id: 'REC4', name: 'Lenovo Backpack', brand: 'LENOVO', price: 3499, sale_price: 2499, discount: 28, rating: 4.3, review_count: 2145, image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans relative selection:bg-[#0875E1] selection:text-white">
      
      {/* HEADER */}
      <Header />

      {/* FLOATING ALERTS */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#0875E1] text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold border border-white/20"
          >
            <CheckCircle className="w-4 h-4 text-[#FFC20A] fill-[#FFC20A]" />
            <span>{infoMessage}</span>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold border border-white/20"
          >
            <Zap className="w-4 h-4 text-white" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-5 space-y-6">
        
        {/* HEADER TITLE BAR MATCHING REFERENCE IMAGE 100% */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
          <div className="flex items-center space-x-3.5">
            <div className="p-3.5 bg-blue-50 text-[#0875E1] rounded-2xl shrink-0 shadow-2xs">
              <ShoppingBag className="w-7 h-7 text-[#0875E1]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
                Your Cart <span className="text-gray-500 font-extrabold text-xl">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">Review your items and proceed to checkout</p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/home')}
            className="inline-flex items-center space-x-1 text-xs font-bold text-[#0875E1] hover:underline cursor-pointer self-start sm:self-auto"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* MAIN SPLIT LAYOUT (CART ITEMS + SUMMARY SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: ACTIVE CART ITEMS LIST (COL 8) */}
          <div className="lg:col-span-8 space-y-4">
            
            {items.length > 0 ? (
              <div className="space-y-3.5">
                {items.map((item) => {
                  const priceDiff = item.added_price - item.sale_price;
                  const isPriceDropped = priceDiff > 0;
                  const isPriceIncreased = priceDiff < 0;
                  const imgUrl = getProductImage({ product_id: item.product_id, name: item.name });
                  const isChecked = selectedItemIds.includes(item.product_id);

                  return (
                    <motion.div 
                      key={item.product_id}
                      whileHover={{ y: -1 }}
                      className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-4 transition-all"
                    >
                      {/* Left Block: Checkbox + Product Image + Details */}
                      <div className="flex items-start space-x-3.5 flex-grow min-w-0 w-full sm:w-auto">
                        
                        {/* Blue Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectItem(item.product_id)}
                          className="w-4 h-4 mt-2.5 rounded text-[#0875E1] focus:ring-[#0875E1] border-gray-300 shrink-0 cursor-pointer"
                        />

                        {/* Product Image Stage */}
                        <div 
                          onClick={() => navigate(`/product/${item.product_id}`)}
                          className="w-20 h-20 sm:w-24 sm:h-24 bg-[#FAF5EE]/30 rounded-xl p-2 flex items-center justify-center shrink-0 border border-gray-100 cursor-pointer overflow-hidden group"
                        >
                          <img 
                            src={imgUrl} 
                            alt={item.name} 
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Text Details Area */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <h3 
                            onClick={() => navigate(`/product/${item.product_id}`)}
                            className="text-xs sm:text-sm font-extrabold text-[#172033] leading-snug cursor-pointer hover:text-[#0875E1] transition-colors line-clamp-2 tracking-tight"
                            title={item.name}
                          >
                            {item.name}
                          </h3>

                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                            {item.brand || 'BRAND'}
                          </span>

                          {/* Rating Row */}
                          <div className="flex items-center space-x-1 text-[11px] font-bold text-gray-500 pt-0.5">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-[#172033]">4.6</span>
                            <span className="text-gray-400">(12,458)</span>
                          </div>

                          {/* Stock Pill Badge */}
                          <div className="pt-0.5">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                              {item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>

                          {/* Delivery Estimate Info */}
                          <div className="text-[11px] font-bold text-emerald-600 flex flex-wrap items-center gap-1.5 pt-1">
                            <Truck className="w-3.5 h-3.5 text-[#0875E1]" />
                            <span>FREE Delivery Tomorrow, 15 Sep</span>
                            <span className="text-gray-400 font-semibold">• Order within 5 hrs 12 mins</span>
                          </div>
                        </div>

                      </div>

                      {/* Right Block: Price + Quantity Controls + Action Links */}
                      <div className="flex flex-col items-end justify-between self-stretch w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 space-y-3 shrink-0">
                        
                        {/* Price & Discounts Display */}
                        <div className="text-right space-y-0.5">
                          <div className="flex items-baseline justify-end space-x-2">
                            <span className="text-base sm:text-lg font-black text-[#172033]">₹{item.sale_price.toLocaleString()}</span>
                            {item.discount > 0 && (
                              <span className="text-xs font-semibold text-gray-400 line-through">₹{item.price.toLocaleString()}</span>
                            )}
                            {item.discount > 0 && (
                              <span className="text-[11px] font-black text-emerald-600">{item.discount}% OFF</span>
                            )}
                          </div>

                          {/* Dynamic Price Alerts */}
                          {isPriceDropped && (
                            <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              Price dropped by ₹{priceDiff.toLocaleString()}!
                            </span>
                          )}
                          {isPriceIncreased && (
                            <span className="inline-block text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              Price increased by ₹{Math.abs(priceDiff).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Quantity Pill Controls [ - ] [ 1 ] [ + ] */}
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/80 p-0.5 shadow-2xs">
                          <button 
                            onClick={() => handleQtyChange(item, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-[#172033] hover:bg-gray-100 transition-all cursor-pointer active:scale-95"
                            title="Decrease Quantity"
                          >
                            <Minus className="w-3.5 h-3.5 text-gray-600 stroke-[2.5]" />
                          </button>
                          <span className="text-xs font-black w-8 text-center text-[#172033]">{item.quantity}</span>
                          <button 
                            onClick={() => handleQtyChange(item, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-[#172033] hover:bg-gray-100 transition-all cursor-pointer active:scale-95"
                            title="Increase Quantity"
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-600 stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Move to Wishlist | Remove Action Links */}
                        <div className="flex items-center space-x-2 text-xs font-bold text-[#0875E1]">
                          <button 
                            onClick={() => handleSaveForLater(item.product_id, item.name)}
                            className="hover:underline cursor-pointer"
                          >
                            Move to Wishlist
                          </button>
                          <span className="text-gray-300 font-normal">|</span>
                          <button 
                            onClick={() => triggerRemoveProcess(item)}
                            className="hover:underline cursor-pointer text-[#0875E1]"
                          >
                            Remove
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* EMPTY CART STATE */
              <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-4 shadow-2xs">
                <div className="w-14 h-14 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-7 h-7 text-[#0875E1]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-[#172033]">Your Cart is Currently Empty</h3>
                  <p className="text-xs text-gray-500 font-medium max-w-sm mx-auto">Explore our catalog of smartphones, laptops, fashion, and home products to start shopping!</p>
                </div>
                <button 
                  onClick={() => navigate('/home')}
                  className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-6 py-2.5 rounded-full text-xs font-extrabold transition-all shadow-sm cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <span>Browse Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* SAVED FOR LATER SECTION */}
            {savedItems.length > 0 && (
              <div className="space-y-3 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs mt-6">
                <div className="border-b border-gray-100 pb-2.5 flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#172033]">Saved for Later ({savedItems.length})</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {savedItems.map((item) => {
                    const imgUrl = getProductImage({ product_id: item.product_id, name: item.name });
                    return (
                      <div 
                        key={item.product_id}
                        className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 flex items-center justify-between space-x-3"
                      >
                        <img src={imgUrl} alt={item.name} className="w-12 h-12 object-contain bg-white p-1 rounded-lg border border-gray-200 shrink-0" />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <h4 className="text-xs font-bold text-[#172033] truncate">{item.name}</h4>
                          <span className="text-xs font-black text-[#172033]">₹{item.sale_price.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button 
                            onClick={() => handleRemoveSavedItem(item.product_id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMoveToCart(item.product_id, item.name)}
                            className="bg-[#0875E1] text-white px-3 py-1 rounded-lg hover:bg-[#065eb8] transition-colors text-xs font-bold cursor-pointer"
                          >
                            Move to Cart
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>


          {/* RIGHT COLUMN: ORDER SUMMARY SIDE PANEL (COL 4 MATCHING REFERENCE IMAGE 100%) */}
          <aside className="lg:col-span-4 space-y-4">
            
            {/* 1. FREE DELIVERY ELIGIBILITY CARD */}
            <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-4 flex items-center space-x-3.5 shadow-2xs">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-emerald-800">You are eligible for FREE delivery!</h4>
                <p className="text-[11px] font-semibold text-emerald-600">Great choice! All items in your cart qualify.</p>
              </div>
            </div>

            {/* 2. ORDER SUMMARY CARD */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <h3 className="text-base font-black text-[#172033] border-b border-gray-100 pb-3">Order Summary</h3>

              <div className="space-y-2.5 text-xs font-bold text-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  <span className="text-[#172033] font-extrabold">₹{cartSummary ? cartSummary.subtotal.toLocaleString() : '1,33,987'}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-600">
                  <span>Discount</span>
                  <span className="font-extrabold">- ₹{cartSummary ? cartSummary.discount.toLocaleString() : '16,996'}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-600">
                  <span>Delivery Charges</span>
                  <span className="font-extrabold uppercase">FREE</span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-black text-[#172033] block">Total Amount</span>
                    <span className="text-[10px] text-gray-400 font-semibold">Inclusive of all taxes</span>
                  </div>
                  <span className="text-xl font-black text-[#172033]">₹{cartSummary ? cartSummary.total.toLocaleString() : '1,16,991'}</span>
                </div>
              </div>

              {/* Gold Proceed to Checkout Button */}
              <button 
                onClick={handleProceedCheckout}
                disabled={items.length === 0}
                className="w-full bg-[#FFC20A] hover:bg-[#E5AD00] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-[#0B2A55] py-3.5 px-4 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 3. COUPON CODE CARD */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 text-xs font-black text-[#172033]">
                <Ticket className="w-4 h-4 text-[#0875E1]" />
                <span>Have a coupon code?</span>
              </div>

              {cartSummary?.coupon_code ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2 rounded-xl text-xs font-bold">
                  <span className="text-[#0875E1]">Applied: {cartSummary.coupon_code}</span>
                  <button onClick={removeCouponCode} className="text-red-500 hover:text-red-700 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter coupon code" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-grow bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-bold rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0875E1]"
                  />
                  <button 
                    type="submit" 
                    className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>

            {/* 4. NEXDAY ASSURANCES CARD */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-[#0875E1]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#172033]">NexDay Assurances</h4>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-gray-700">
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span>100% Genuine Products</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <span>Easy Returns</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span>Fast &amp; Reliable Delivery</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span>Secure Payments</span>
                </div>
              </div>
            </div>

            {/* 5. NEED HELP CARD */}
            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-white text-[#0875E1] rounded-xl flex items-center justify-center shadow-2xs shrink-0">
                  <HeadsetIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#172033]">Need Help?</h4>
                  <p className="text-[11px] text-gray-500 font-semibold">Our support team is here for you.</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/help')}
                className="w-full bg-white hover:bg-blue-50 text-[#0875E1] border border-blue-200 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                Contact Support
              </button>
            </div>

          </aside>

        </div>

        {/* BOTTOM RECOMMENDATION CARDS (MATCHING REFERENCE IMAGE EXACTLY) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 space-y-3 shadow-2xs mt-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#172033]">You may also like</h3>
            <button onClick={() => navigate('/home')} className="text-xs font-extrabold text-[#0875E1] hover:underline">
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recommendations.map((rec) => (
              <div 
                key={rec.product_id}
                className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/80 flex items-center space-x-3 hover:border-blue-200 transition-colors"
              >
                <img src={rec.image_url} alt={rec.name} className="w-12 h-12 object-contain bg-white p-1 rounded-lg border border-gray-200 shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#172033] truncate">{rec.name}</p>
                  <p className="text-xs font-black text-[#172033]">₹{rec.sale_price.toLocaleString()}</p>
                  <div className="flex items-center space-x-1 text-[10px] text-gray-500 font-semibold">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>{rec.rating} ({(rec.review_count).toLocaleString()})</span>
                  </div>
                </div>

                <button
                  onClick={() => addItemToCart({ product_id: rec.product_id, name: rec.name, brand: rec.brand, price: rec.price, discount: rec.discount, sale_price: rec.sale_price }, 1, 'cart_recommendations')}
                  className="px-3 py-1 bg-white hover:bg-blue-50 text-[#0875E1] border border-[#0875E1] rounded-lg text-xs font-bold shadow-2xs shrink-0 cursor-pointer"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* REMOVAL SURVEY MODAL OVERLAY */}
        <AnimatePresence>
          {removingItem && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img 
                      src={getProductImage({ product_id: removingItem.product_id, name: removingItem.name })} 
                      alt={removingItem.name} 
                      className="w-12 h-12 object-contain bg-gray-50 p-1 rounded-xl border border-gray-200 shrink-0" 
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-[#172033] uppercase tracking-wider">Remove Item</h4>
                      <p className="text-xs font-bold text-gray-700 truncate">{removingItem.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setRemovingItem(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-[#172033]">Why are you removing this item?</h5>
                  <p className="text-[11px] text-gray-500 font-medium">Your feedback helps us optimize product pricing and delivery speed.</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[11px] font-bold text-gray-700">
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
                      className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                        removeReason === opt.val 
                          ? 'border-[#0875E1] bg-blue-50 text-[#0875E1] font-extrabold ring-1 ring-[#0875E1]' 
                          : 'hover:bg-gray-50 border-gray-200 bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 text-xs font-bold">
                  <button 
                    onClick={() => setRemovingItem(null)}
                    className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleConfirmRemove(removingItem)}
                    className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Remove</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>

      {/* FOOTER */}
      <Footer />

    </div>
  );
};

export default CartPage;
