import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, ArrowLeft, User, ShoppingCart, Heart, 
  Star, Trash2, X, Plus, Minus, Zap, LogOut
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';

interface WishlistItem {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category_id: string;
  description: string;
  price: number;
  discount: number;
  sale_price: number;
  rating: number;
  review_count: number;
  stock: number;
  delivery_days: number;
  warranty: string;
  image_url?: string;
  wishlist_id: string;
}

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, customer, isAuthenticated, logout, terminateSession } = useSessionStore();
  const { items: cartItems, addItemToCart, removeItemFromCart, fetchCart, getCartTotalCount, getCartTotalPrice } = useCartStore();

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Fetch cart
  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session, fetchCart]);

  // Fetch Wishlist Items
  const fetchWishlistItems = () => {
    if (!session) return;
    const customerParam = customer ? `&customer_id=${customer.customer_id}` : '';
    fetch(`/api/wishlist?session_id=${session.session_id}${customerParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWishlist(data.wishlist);
        }
      })
      .catch(err => console.error('[Wishlist API error]', err));
  };

  useEffect(() => {
    fetchWishlistItems();
    // Log wishlist_view clickstream telemetry
    logTelemetryEvent('wishlist_view');
  }, [session, customer]);

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
          page: 'wishlist',
          device: 'desktop',
          browser: 'Chrome',
          metadata
        })
      });
    } catch (e) {
      console.warn('[Telemetry Event Logging failed]', e);
    }
  };

  // Remove from Wishlist
  const handleRemove = async (productId: string) => {
    if (!session) return;
    const customerParam = customer ? `&customer_id=${customer.customer_id}` : '';
    try {
      const response = await fetch(`/api/wishlist/${productId}?session_id=${session.session_id}${customerParam}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setWishlist(prev => prev.filter(item => item.product_id !== productId));
        showTemporaryAlert('Item removed from your wishlist.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Wishlist Item to Cart
  const handleAddToCart = async (item: WishlistItem) => {
    // 1. Add item to cart using existing Cart API specifying source as 'wishlist'
    await addItemToCart({
      product_id: item.product_id,
      name: item.name,
      brand: item.brand,
      price: item.price,
      discount: item.discount,
      sale_price: item.sale_price
    }, 1, 'wishlist');

    showTemporaryAlert(`Added ${item.name} to cart!`);
    setIsCartOpen(true);
  };

  const showTemporaryAlert = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => {
      setInfoMessage(null);
    }, 3000);
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
      
      {/* ALERTS */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#0071DC] text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold font-mono border border-white/20"
          >
            <Zap className="w-4 h-4 text-[#FFC220] fill-[#FFC220]" />
            <span>{infoMessage}</span>
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
                      <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Session ID</p>
                      <p className="font-mono text-[#0071DC] font-bold overflow-hidden text-ellipsis">{session?.session_id}</p>
                    </div>

                    {isAuthenticated && customer ? (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-700">User: <span className="font-bold">{customer.first_name}</span></p>
                        <p className="font-medium text-gray-700">Level: <span className="font-bold uppercase text-[#FFC220]">{customer.membership}</span></p>
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

            <button 
              onClick={() => setIsCartOpen(true)}
              className="flex items-center space-x-2 bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-4 py-2 rounded-full transition-colors text-sm font-bold shadow-md relative"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart</span>
              {getCartTotalCount() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  {getCartTotalCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HEADER SECTION */}
      <section className="bg-white border-b py-6 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-baseline justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-[#041E42]">My Wishlist</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400 bg-gray-50 border px-3 py-1 rounded-xl">
            {isAuthenticated ? 'Authenticated Wishlist' : 'Temporary Guest Session'}
          </span>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {wishlist.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlist.map((item) => {
              const priceDifference = item.price - item.sale_price;
              const hasPriceDrop = item.discount > 0 && priceDifference > 0;

              return (
                <div 
                  key={item.product_id}
                  className="bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-xl transition-all flex flex-col justify-between space-y-4 group relative"
                >
                  {/* Remove cross action button */}
                  <button 
                    onClick={() => handleRemove(item.product_id)}
                    className="absolute top-4 right-4 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 p-2 rounded-full transition-colors z-20"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="relative cursor-pointer" onClick={() => navigate(`/product/${item.product_id}`)}>
                    {hasPriceDrop && (
                      <span className="absolute top-0 left-0 bg-[#0071DC] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase z-10">
                        Price Drop!
                      </span>
                    )}

                    {/* Image Block */}
                    <div className="bg-gray-50 h-40 rounded-2xl flex items-center justify-center text-center relative overflow-hidden p-2">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <span className="text-sm font-black uppercase text-gray-300 tracking-widest">{item.brand}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-grow">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{item.brand}</p>
                    <h3 
                      onClick={() => navigate(`/product/${item.product_id}`)}
                      className="text-xs font-extrabold text-gray-800 line-clamp-2 leading-tight cursor-pointer hover:text-[#0071DC] transition-colors"
                    >
                      {item.name}
                    </h3>
                    
                    <div className="flex items-center space-x-1.5 text-amber-500 text-[10px] font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="text-gray-700">{item.rating}</span>
                      <span className="text-gray-400">({item.review_count})</span>
                    </div>

                    <div className="pt-1.5 space-y-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-base font-black text-[#041E42]">₹{item.sale_price.toLocaleString()}</span>
                        {item.discount > 0 && (
                          <span className="text-xs text-gray-400 line-through">₹{item.price.toLocaleString()}</span>
                        )}
                      </div>
                      
                      {hasPriceDrop && (
                        <p className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                          Price dropped by ₹{priceDifference.toLocaleString()}!
                        </p>
                      )}
                    </div>

                    {/* Stock & Delivery details */}
                    <div className="text-[10px] font-bold text-gray-500 pt-2 space-y-0.5">
                      <p className={item.stock > 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {item.stock > 0 ? `✓ In Stock (${item.stock} available)` : 'Out of Stock'}
                      </p>
                      <p>Estimated Delivery: {item.delivery_days <= 1 ? 'Tomorrow' : `Within ${item.delivery_days} Days`}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleAddToCart(item)}
                    disabled={item.stock === 0}
                    className="w-full bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-100 shadow-md p-10 text-center space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="p-4 bg-blue-50 text-[#0071DC] rounded-full">
                <Heart className="w-10 h-10 text-[#0071DC]" />
              </div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">Your Wishlist is Empty</h2>
              <p className="text-xs text-gray-500 font-medium">Add items to your wishlist while browsing to track price drops and restock alerts!</p>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => navigate('/home')}
                className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md inline-flex items-center space-x-1"
              >
                <span>Browse Products</span>
              </button>
            </div>

            <div className="border-t pt-5 space-y-3 text-left">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Popular categories:</h3>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-[#0071DC]">
                {['electronics', 'fashion', 'home-furniture', 'grocery'].map(slug => (
                  <span 
                    key={slug} 
                    onClick={() => navigate(`/category/${slug}`)}
                    className="bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl cursor-pointer transition-colors capitalize"
                  >
                    {slug.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#FFC220]">NexDay Store Front</h4>
            <p className="text-gray-300 text-xs">Authoritative product catalog data and specifications served securely by MySQL operational database.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#FFC220]">Telemetry Status</h4>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] font-mono">
              <p>Active Session: {session?.session_id}</p>
              <p>User Authenticated: {customer ? `${customer.first_name}` : 'Guest'}</p>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-xs text-gray-400">NexDay details &bull; Real Images Catalog</p>
          </div>
        </div>
      </footer>

      {/* SLIDING SIDE CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col justify-between text-[#041E42]"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-[#0071DC]" />
                  <h3 className="font-black text-lg">Your Shopping Cart</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <div key={item.product_id} className="flex items-start justify-between border-b pb-4 space-x-3">
                      <div className="bg-gray-50 w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-black uppercase text-gray-400">{item.brand}</span>
                      </div>
                      
                      <div className="flex-grow space-y-1">
                        <h4 className="text-xs font-extrabold text-gray-800 line-clamp-2 leading-tight">{item.name}</h4>
                        <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                          <span>₹{item.sale_price.toLocaleString()}</span>
                          <span>&bull;</span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <button onClick={() => addItemToCart(item, 1)} className="bg-gray-100 hover:bg-gray-200 p-1 rounded-md text-gray-600">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeItemFromCart(item.product_id)} className="bg-gray-100 hover:bg-gray-200 p-1 rounded-md text-gray-600">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <p className="text-xs font-black">₹{(item.sale_price * item.quantity).toLocaleString()}</p>
                        <button onClick={() => removeItemFromCart(item.product_id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-gray-400 font-bold text-sm">Your cart is empty.</div>
                )}
              </div>

              <div className="p-6 border-t bg-[#F7F8F9] space-y-4">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Subtotal ({getCartTotalCount()} items)</span>
                  <span className="text-lg font-black text-[#041E42]">₹{getCartTotalPrice().toLocaleString()}</span>
                </div>
                
                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    if (!isAuthenticated) {
                      showTemporaryAlert('Checkout requires an account. Redirecting to Login...');
                      setTimeout(() => navigate('/login?redirect=checkout'), 800);
                    } else {
                      navigate('/checkout');
                    }
                  }}
                  disabled={cartItems.length === 0}
                  className="w-full bg-[#FFC220] hover:bg-[#E5AC12] disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed text-[#041E42] py-3.5 rounded-full font-black text-xs transition-colors shadow-md"
                >
                  Proceed to Checkout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
