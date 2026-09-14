import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Trash2, ShoppingCart, Sparkles, ChevronRight, 
  Bell, Gift, Clock, ChevronLeft, Star, Settings, X, CheckCircle
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { getProductImage } from '../utils/productImageMap';

interface WishlistItem {
  product_id: string;
  sku?: string;
  name: string;
  brand?: string;
  category_id?: string;
  description?: string;
  price: number;
  discount?: number;
  sale_price?: number;
  rating?: number;
  review_count?: number;
  stock?: number;
  delivery_days?: number;
  warranty?: string;
  image_url?: string;
  wishlist_id?: string;
}

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, customer } = useSessionStore();
  const { addItemToCart, fetchCart } = useCartStore();

  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [priceDropAlerts, setPriceDropAlerts] = useState<boolean>(true);
  const [isManageAlertsOpen, setIsManageAlertsOpen] = useState<boolean>(false);

  // Manage Alerts Form States
  const [alertChannels, setAlertChannels] = useState({ email: true, push: true, sms: false });
  const [alertThreshold, setAlertThreshold] = useState<string>('any');

  useEffect(() => {
    if (session) fetchCart();
  }, [session]);

  const fetchWishlistItems = () => {
    let localItems: WishlistItem[] = [];
    try {
      localItems = JSON.parse(localStorage.getItem('wishlist') || '[]');
    } catch (e) {}

    if (localItems.length > 0) {
      setWishlist(localItems);
    }

    if (!session) return;
    const customerParam = customer ? `&customer_id=${customer.customer_id}` : '';
    fetch(`/api/wishlist?session_id=${session.session_id}${customerParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.wishlist) && data.wishlist.length > 0) {
          const combinedMap = new Map<string, WishlistItem>();
          localItems.forEach(item => combinedMap.set(item.product_id, item));
          data.wishlist.forEach((item: WishlistItem) => combinedMap.set(item.product_id, item));
          const merged = Array.from(combinedMap.values());
          setWishlist(merged);
          localStorage.setItem('wishlist', JSON.stringify(merged));
          window.dispatchEvent(new Event('storage'));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchWishlistItems();

    // Recommended items fallback
    fetch('/api/products/trending')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.products) {
          setRecommended(d.products.slice(0, 5));
        }
      })
      .catch(() => {});
  }, [session, customer]);

  const showAlert = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 3000);
  };

  const handleRemove = async (productId: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const updated = stored.filter((item: any) => item.product_id !== productId);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      setWishlist(prev => prev.filter(item => item.product_id !== productId));
      setSelectedItemIds(prev => prev.filter(id => id !== productId));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    // Sync removal with savedItems in CartStore
    try {
      await useCartStore.getState().removeSavedItem(productId);
    } catch (e) {}

    if (session) {
      const customerParam = customer ? `&customer_id=${customer.customer_id}` : '';
      fetch(`/api/wishlist/${productId}?session_id=${session.session_id}${customerParam}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    await addItemToCart({
      product_id: item.product_id,
      name: item.name,
      brand: item.brand || 'RetailHub',
      price: item.price,
      discount: item.discount || 0,
      sale_price: item.sale_price || item.price,
    }, 1, 'wishlist');
    await handleRemove(item.product_id);
    showAlert(`Added ${item.name} to cart and removed from wishlist!`);
  };

  const handleAddAllToCart = async () => {
    if (wishlist.length === 0) return;
    const itemsToAdd = [...wishlist];

    for (const item of itemsToAdd) {
      await addItemToCart({
        product_id: item.product_id,
        name: item.name,
        brand: item.brand || 'RetailHub',
        price: item.price,
        discount: item.discount || 0,
        sale_price: item.sale_price || item.price,
      }, 1, 'wishlist');
    }

    const addedIds = new Set(itemsToAdd.map(i => i.product_id));
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const updated = stored.filter((item: any) => !addedIds.has(item.product_id));
      localStorage.setItem('wishlist', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    setWishlist(prev => prev.filter(item => !addedIds.has(item.product_id)));
    setSelectedItemIds([]);

    for (const item of itemsToAdd) {
      if (session) {
        const customerParam = customer ? `&customer_id=${customer.customer_id}` : '';
        fetch(`/api/wishlist/${item.product_id}?session_id=${session.session_id}${customerParam}`, {
          method: 'DELETE'
        }).catch(() => {});
      }
    }

    await fetchCart();
    showAlert(`Added all ${itemsToAdd.length} items to cart!`);
  };

  const handleToggleSelect = (productId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === wishlist.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(wishlist.map(i => i.product_id));
    }
  };

  const handleAddSelectedToCart = async () => {
    const itemsToAdd = wishlist.filter(i => selectedItemIds.includes(i.product_id));
    if (itemsToAdd.length === 0) return;

    for (const item of itemsToAdd) {
      await addItemToCart({
        product_id: item.product_id,
        name: item.name,
        brand: item.brand || 'RetailHub',
        price: item.price,
        discount: item.discount || 0,
        sale_price: item.sale_price || item.price,
      }, 1, 'wishlist');
    }

    const addedIds = new Set(itemsToAdd.map(i => i.product_id));
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      const updated = stored.filter((item: any) => !addedIds.has(item.product_id));
      localStorage.setItem('wishlist', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}

    setWishlist(prev => prev.filter(item => !addedIds.has(item.product_id)));
    setSelectedItemIds([]);

    for (const item of itemsToAdd) {
      if (session) {
        const customerParam = customer ? `&customer_id=${customer.customer_id}` : '';
        fetch(`/api/wishlist/${item.product_id}?session_id=${session.session_id}${customerParam}`, {
          method: 'DELETE'
        }).catch(() => {});
      }
    }

    await fetchCart();
    showAlert(`Added ${itemsToAdd.length} selected items to cart!`);
  };

  const handleRemoveSelected = () => {
    if (selectedItemIds.length === 0) return;
    selectedItemIds.forEach(id => handleRemove(id));
  };

  // Calculate totals
  const totalWishlistValue = wishlist.reduce((acc, item) => acc + (item.sale_price || item.price), 0);

  // Sorting wishlist
  const sortedWishlist = [...wishlist].sort((a, b) => {
    if (sortOption === 'price_low') return (a.sale_price || a.price) - (b.sale_price || b.price);
    if (sortOption === 'price_high') return (b.sale_price || b.price) - (a.sale_price || a.price);
    if (sortOption === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  // Demo Recently Viewed Items
  const recentlyViewed = [
    { product_id: 'P-RV1', name: 'MacBook Air M2', price: 89990, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop' },
    { product_id: 'P-RV2', name: 'iPad 10th Gen', price: 34900, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&auto=format&fit=crop' },
    { product_id: 'P-RV3', name: 'Adidas Ultraboost', price: 12999, img: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=300&auto=format&fit=crop' },
    { product_id: 'P-RV4', name: 'Sony WH-1000XM5', price: 29990, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop' },
    { product_id: 'P-RV5', name: 'Samsung Galaxy S24', price: 74999, img: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=300&auto=format&fit=crop' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans relative selection:bg-[#0875E1] selection:text-white">
      
      {/* HEADER */}
      <Header />

      {/* ALERT NOTIFICATION */}
      {infoMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B2A55] text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 border border-blue-400">
          <Sparkles className="w-4 h-4 text-[#FFC20A]" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-5 space-y-5">
        
        {/* BREADCRUMBS */}
        <nav className="flex items-center space-x-1.5 text-xs text-gray-500 font-semibold">
          <button onClick={() => navigate('/home')} className="hover:text-[#0875E1]">Home</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[#0875E1] font-bold">My Wishlist</span>
        </nav>

        {/* TOP BANNER & TITLE AREA MATCHING REFERENCE IMAGE 100% */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Left Title Column */}
          <div className="lg:col-span-8 flex items-start space-x-3.5">
            <div className="p-3.5 bg-red-100/70 text-red-500 rounded-2xl shrink-0 shadow-2xs">
              <Heart className="w-7 h-7 fill-red-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">My Wishlist</h1>
              <p className="text-xs font-extrabold text-gray-500">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved</p>
              <p className="text-xs text-gray-500 font-medium">Keep track of your favorite products. Prices may change, so grab them soon!</p>
            </div>
          </div>

          {/* Right Top Promo Card */}
          <div className="lg:col-span-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-[#0875E1]">Save what you love</h4>
              <p className="text-[11px] font-semibold text-gray-600">Shop when you're ready!</p>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl shadow-xs flex items-center justify-center text-[#0875E1] shrink-0">
              <Gift className="w-5 h-5 text-[#0875E1]" />
            </div>
          </div>

        </div>

        {/* MAIN SPLIT LAYOUT (WISHLIST ITEMS + ACTION SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT COLUMN: ACTION BAR + PRODUCT CARDS GRID (COL 8/9) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* ACTION BAR (SELECT ALL + BULK ACTIONS + SORT) */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center space-x-3 text-xs font-bold">
                {/* Select All Checkbox */}
                <label className="flex items-center space-x-2 cursor-pointer select-none text-gray-700">
                  <input
                    type="checkbox"
                    checked={wishlist.length > 0 && selectedItemIds.length === wishlist.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-[#0875E1] focus:ring-[#0875E1] border-gray-300 cursor-pointer"
                  />
                  <span>Select All</span>
                </label>

                {/* Bulk Action Buttons */}
                <button
                  disabled={selectedItemIds.length === 0}
                  onClick={handleAddSelectedToCart}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 text-[#0875E1] border border-[#0875E1]/40 hover:border-[#0875E1] rounded-xl font-bold transition-all disabled:opacity-40 disabled:hover:bg-white flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add Selected to Cart</span>
                </button>

                <button
                  disabled={selectedItemIds.length === 0}
                  onClick={handleRemoveSelected}
                  className="px-3 py-1.5 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl font-bold transition-all disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Selected</span>
                </button>
              </div>

              {/* Right Sort Dropdown */}
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-600">
                <span className="text-gray-400">Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-[#172033] px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0875E1] cursor-pointer font-bold"
                >
                  <option value="newest">Date Added (Newest)</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Highest Rating</option>
                </select>
              </div>

            </div>

            {/* PRODUCT CARDS GRID (4 COLUMNS MATCHING REFERENCE IMAGE EXACTLY) */}
            {sortedWishlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 items-stretch">
                {sortedWishlist.map((item) => {
                  const imgUrl = getProductImage(item);
                  const currentPrice = item.sale_price || item.price;
                  const originalPrice = item.sale_price ? item.price : Math.round(currentPrice * 1.2);
                  const discountPercent = item.discount || Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
                  const isSelected = selectedItemIds.includes(item.product_id);

                  return (
                    <motion.div
                      key={item.product_id}
                      whileHover={{ y: -3 }}
                      className={`bg-white rounded-2xl border ${isSelected ? 'border-[#0875E1] ring-1 ring-blue-200' : 'border-gray-200/80'} shadow-2xs p-3.5 flex flex-col justify-between space-y-2.5 relative group transition-all`}
                    >
                      {/* Checkbox Top Left */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.product_id)}
                        className="absolute top-3 left-3 w-4 h-4 rounded text-[#0875E1] focus:ring-[#0875E1] border-gray-300 z-20 cursor-pointer"
                      />

                      {/* Heart Delete Button Top Right */}
                      <button
                        onClick={() => handleRemove(item.product_id)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 shadow-2xs border border-gray-100 flex items-center justify-center text-red-500 hover:scale-110 transition-transform z-20 cursor-pointer"
                        title="Remove from Wishlist"
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </button>

                      {/* Image Stage Container */}
                      <div 
                        onClick={() => navigate(`/product/${item.product_id}`)}
                        className="w-full aspect-square bg-[#FAF5EE]/30 rounded-xl p-3 flex items-center justify-center cursor-pointer overflow-hidden group"
                      >
                        <img 
                          src={imgUrl} 
                          alt={item.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>

                      {/* Details Content Area */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                          {item.brand || 'BRAND'}
                        </span>
                        <h3 
                          onClick={() => navigate(`/product/${item.product_id}`)}
                          className="text-xs font-bold text-[#172033] line-clamp-1 cursor-pointer hover:text-[#0875E1] tracking-tight"
                          title={item.name}
                        >
                          {item.name}
                        </h3>

                        {/* Rating Row */}
                        <div className="flex items-center space-x-1 text-[11px] font-bold text-gray-500">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-[#172033]">{item.rating || 4.5}</span>
                          <span className="text-gray-400">({(item.review_count || 1240).toLocaleString()})</span>
                        </div>

                        {/* Price Row */}
                        <div className="flex items-baseline space-x-1.5 pt-0.5">
                          <span className="text-sm font-black text-[#172033]">₹{currentPrice.toLocaleString()}</span>
                          {originalPrice > currentPrice && (
                            <span className="text-[11px] font-semibold text-gray-400 line-through">₹{originalPrice.toLocaleString()}</span>
                          )}
                          {discountPercent > 0 && (
                            <span className="text-[11px] font-black text-emerald-600">{discountPercent}% OFF</span>
                          )}
                        </div>

                        {/* Stock Badge */}
                        <div className="pt-0.5">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            (item.stock || 10) < 5 
                              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                          }`}>
                            {(item.stock || 10) < 5 ? `Only ${item.stock || 2} left` : 'In Stock'}
                          </span>
                        </div>
                      </div>

                      {/* Add to Cart Outline Button */}
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-white hover:bg-blue-50 text-[#0875E1] border border-[#0875E1] py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add to Cart</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4 shadow-2xs">
                <div className="w-14 h-14 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-7 h-7 text-[#0875E1]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-[#172033]">Your Wishlist is Empty</h3>
                  <p className="text-xs text-gray-500 font-medium">Explore products and click the heart icon to save your favorites!</p>
                </div>
                <button
                  onClick={() => navigate('/home')}
                  className="bg-[#0875E1] text-white font-extrabold text-xs px-6 py-2.5 rounded-full hover:bg-[#065BB5] transition-all shadow-sm cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR (COL 4 MATCHING REFERENCE IMAGE EXACTLY) */}
          <aside className="lg:col-span-4 space-y-4">
            
            {/* 1. WISHLIST SUMMARY CARD */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-4 shadow-2xs">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#172033]">Wishlist Summary</h3>
              </div>

              {/* 2 Big Stat Metrics */}
              <div className="grid grid-cols-2 gap-3 text-center bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                <div>
                  <p className="text-lg font-black text-[#172033]">{wishlist.length}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Items Saved</p>
                </div>
                <div>
                  <p className="text-lg font-black text-[#172033]">₹{totalWishlistValue.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Value</p>
                </div>
              </div>

              {/* Add All to Cart Button */}
              <button
                disabled={wishlist.length === 0}
                onClick={handleAddAllToCart}
                className="w-full bg-[#0875E1] hover:bg-[#065BB5] disabled:opacity-40 text-white py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer active:scale-98"
              >
                <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                <span>Add All To Cart</span>
              </button>
            </div>

            {/* 2. PRICE DROP ALERTS CARD */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-[#0875E1]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#172033]">Price Drop Alerts</h3>
                </div>

                {/* Smooth Animated Toggle Switch Knob */}
                <button
                  onClick={() => {
                    const next = !priceDropAlerts;
                    setPriceDropAlerts(next);
                    showAlert(next ? 'Price Drop Alerts turned ON' : 'Price Drop Alerts turned OFF');
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shadow-inner ${
                    priceDropAlerts ? 'bg-[#0875E1]' : 'bg-gray-300'
                  }`}
                  title="Toggle Price Drop Alerts"
                >
                  <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    priceDropAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Get notified when prices drop on items in your wishlist.
              </p>

              <button
                onClick={() => setIsManageAlertsOpen(true)}
                className="w-full bg-gray-50 hover:bg-blue-50 hover:text-[#0875E1] hover:border-blue-200 text-gray-700 border border-gray-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage Alerts</span>
              </button>
            </div>

            {/* 3. YOU MAY ALSO LIKE CARD */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#172033]">You may also like</h3>
                  <p className="text-[10px] text-gray-400 font-semibold">Based on your wishlist</p>
                </div>
                <button onClick={() => navigate('/home')} className="text-xs font-extrabold text-[#0875E1] hover:underline">
                  View All
                </button>
              </div>

              {/* 3 Horizontal Recommendation Rows */}
              <div className="space-y-3">
                {(recommended.length > 0 ? recommended.slice(0, 3) : [
                  { product_id: 'REC1', name: 'AirPods Pro (2nd Gen)', rating: 4.6, review_count: 9322, price: 22900, image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=200&auto=format&fit=crop' },
                  { product_id: 'REC2', name: 'Samsung T7 SSD 1TB', rating: 4.5, review_count: 4921, price: 8999, image_url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=200&auto=format&fit=crop' },
                  { product_id: 'REC3', name: 'Logitech MX Master 3S', rating: 4.4, review_count: 3812, price: 7495, image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=200&auto=format&fit=crop' }
                ]).map((rec) => {
                  const recImg = getProductImage(rec);
                  return (
                    <div key={rec.product_id} className="flex items-center justify-between space-x-3 p-2 bg-gray-50/70 rounded-xl border border-gray-100">
                      <img src={recImg} alt={rec.name} className="w-10 h-10 object-contain bg-white p-1 rounded-lg border border-gray-200 shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#172033] truncate">{rec.name}</p>
                        <div className="flex items-center space-x-1 text-[10px] text-gray-500 font-semibold">
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          <span>{rec.rating || 4.5} ({(rec.review_count || 1200).toLocaleString()})</span>
                        </div>
                        <p className="text-xs font-black text-[#172033]">₹{(rec.sale_price || rec.price).toLocaleString()}</p>
                      </div>

                      <button
                        onClick={() => handleAddToCart({ product_id: rec.product_id, name: rec.name, price: rec.price })}
                        className="px-3 py-1 bg-white hover:bg-blue-50 text-[#0875E1] border border-[#0875E1] rounded-lg text-xs font-bold shadow-2xs shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </aside>

        </div>

        {/* BOTTOM RECENTLY VIEWED CAROUSEL (MATCHING REFERENCE IMAGE EXACTLY) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs mt-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#0875E1]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#172033]">Recently Viewed</h3>
            </div>

            <div className="flex items-center space-x-2">
              <button onClick={() => navigate('/home')} className="text-xs font-extrabold text-[#0875E1] hover:underline mr-2">
                View All
              </button>
              <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroll Pill Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {recentlyViewed.map((rv) => (
              <div 
                key={rv.product_id}
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2.5 p-2 rounded-xl bg-gray-50 hover:bg-blue-50/60 border border-gray-200/70 cursor-pointer transition-colors group"
              >
                <img src={rv.img} alt={rv.name} className="w-10 h-10 object-contain bg-white p-1 rounded-lg border border-gray-200 shrink-0 group-hover:scale-105 transition-transform" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#172033] truncate group-hover:text-[#0875E1]">{rv.name}</p>
                  <p className="text-xs font-black text-[#172033]">₹{rv.price.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MANAGE ALERTS MODAL POPUP */}
        <AnimatePresence>
          {isManageAlertsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 relative"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2 text-[#172033]">
                    <div className="p-2 bg-blue-50 text-[#0875E1] rounded-xl">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black">Price Drop Alert Settings</h3>
                      <p className="text-xs text-gray-500 font-semibold">Customize your wishlist price notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsManageAlertsOpen(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. Notification Channels */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Notification Channels</label>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/80 cursor-pointer">
                      <span className="font-bold text-[#172033]">Email Notifications</span>
                      <input
                        type="checkbox"
                        checked={alertChannels.email}
                        onChange={(e) => setAlertChannels({ ...alertChannels, email: e.target.checked })}
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-[#0875E1]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/80 cursor-pointer">
                      <span className="font-bold text-[#172033]">App Push Notifications</span>
                      <input
                        type="checkbox"
                        checked={alertChannels.push}
                        onChange={(e) => setAlertChannels({ ...alertChannels, push: e.target.checked })}
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-[#0875E1]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/80 cursor-pointer">
                      <span className="font-bold text-[#172033]">SMS Alerts</span>
                      <input
                        type="checkbox"
                        checked={alertChannels.sms}
                        onChange={(e) => setAlertChannels({ ...alertChannels, sms: e.target.checked })}
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-[#0875E1]"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Alert Threshold */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Price Drop Threshold</label>
                  <select
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-xs font-bold text-[#172033] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0875E1]"
                  >
                    <option value="any">Notify on Any Price Drop</option>
                    <option value="5">Notify when Price Drops by 5% or more</option>
                    <option value="10">Notify when Price Drops by 10% or more</option>
                    <option value="20">Notify when Price Drops by 20% or more</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => setIsManageAlertsOpen(false)}
                    className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsManageAlertsOpen(false);
                      showAlert('Price Drop Alert preferences updated successfully!');
                    }}
                    className="w-1/2 bg-[#0875E1] hover:bg-[#065BB5] text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Preferences</span>
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
