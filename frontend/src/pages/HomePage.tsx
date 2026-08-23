import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, LogOut, Search, User, ShoppingCart, Heart, 
  ChevronLeft, ChevronRight, Zap, Star, Eye, Trash2, X, Plus, Minus, Info 
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';

interface Product {
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
}

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
}

interface Category {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { session, customer, isAuthenticated, logout, terminateSession } = useSessionStore();
  const { items: cartItems, addItemToCart, removeItemFromCart, fetchCart, getCartTotalCount, getCartTotalPrice } = useCartStore();

  // Component States
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Banners carousel control
  const [bannerIdx, setBannerIdx] = useState(0);

  // Cart slide-out Drawer state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  
  // Custom alerts
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Autocomplete debounced fetch effect
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const delay = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setSuggestions(d.suggestions);
        });
    }, 200);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Track impressions to prevent duplicate logging
  const loggedImpressions = useRef<Set<string>>(new Set());

  // Fetch init data
  useEffect(() => {
    // 1. Ensure user has a session (guest session fallback)
    const initSession = async () => {
      if (!session) {
        await useSessionStore.getState().createGuestSession();
      }
    };
    initSession();

    // 2. Fetch banners, categories, products
    fetch('/api/home/banners').then(r => r.json()).then(d => d.success && setBanners(d.banners));
    fetch('/api/categories').then(r => r.json()).then(d => d.success && setCategories(d.categories));
    
    // Fetch categorized highlights
    fetch('/api/products/flash-deals').then(r => r.json()).then(d => d.success && setFlashDeals(d.products));
    fetch('/api/products/trending').then(r => r.json()).then(d => d.success && setTrending(d.products));
  }, []);

  // Banner auto rotation (Vibrant carousel like Flipkart/Amazon)
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 4500); // auto-advance slides every 4.5 seconds

    return () => clearInterval(interval);
  }, [banners]);

  // Fetch cart and recently viewed when session is loaded
  useEffect(() => {
    if (session) {
      fetchCart();
      fetch(`/api/products/recently-viewed?session_id=${session.session_id}${customer ? `&customer_id=${customer.customer_id}` : ''}`)
        .then(r => r.json())
        .then(d => d.success && setRecentlyViewed(d.products));
    }
  }, [session, customer]);

  // Fetch main products catalog dynamically on filter change
  useEffect(() => {
    let url = '/api/products?limit=24';
    if (activeCategory) url += `&category_id=${activeCategory}`;
    if (activeSearch) url += `&search=${encodeURIComponent(activeSearch)}`;
    
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAllProducts(d.products);
          
          // Basic rule-based recommendations: products from the same category
          if (d.products.length > 0) {
            setRecommended(d.products.slice().sort(() => 0.5 - Math.random()).slice(0, 8));
          }
        }
      });
  }, [activeCategory, activeSearch]);

  // Log page view event
  useEffect(() => {
    if (session) {
      logTelemetryEvent('page_view', { page: 'home' });
    }
  }, [session]);

  // Telemetry client helper
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
          page: 'home',
          device: 'desktop',
          browser: 'Chrome',
          metadata
        })
      });
    } catch (e) {
      console.warn('[Telemetry Event Send Failed]', e);
    }
  };

  // Track product card impression when it enters viewport
  const trackImpression = (productId: string, index: number, section: string) => {
    if (loggedImpressions.current.has(`${section}_${productId}`)) return;
    loggedImpressions.current.add(`${section}_${productId}`);
    
    logTelemetryEvent('product_impression', {
      product_id: productId,
      position: index + 1,
      section: section
    });
  };

  // Intersection Observer hook for impressions
  const observeImpression = (node: HTMLDivElement | null, productId: string, index: number, section: string) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackImpression(productId, index, section);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
  };

  // Actions
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSuggestOpen(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleCategoryClick = (catSlug: string) => {
    navigate(`/category/${catSlug}`);
  };

  const handleProductClick = async (product: Product) => {
    if (!session) return;
    try {
      await fetch('/api/products/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.product_id,
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          category: product.category_id,
          price: product.sale_price
        })
      });

      navigate(`/product/${product.product_id}`);
    } catch (e) {
      console.error(e);
      navigate(`/product/${product.product_id}`);
    }
  };

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering product details view
    await addItemToCart({
      product_id: product.product_id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      discount: product.discount,
      sale_price: product.sale_price
    }, 1);

    showTemporaryAlert(`Added ${product.name} to cart!`);
  };

  const showTemporaryAlert = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => {
      setInfoMessage(null);
    }, 3500);
  };

  const nextBanner = () => {
    if (banners.length === 0) return;
    setBannerIdx((bannerIdx + 1) % banners.length);
  };

  const prevBanner = () => {
    if (banners.length === 0) return;
    setBannerIdx((bannerIdx - 1 + banners.length) % banners.length);
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
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42] relative overflow-x-hidden font-sans">
      
      {/* FLOATING ACTION NOTIFICATION ALERT */}
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

      {/* PERSISTENT HEADER NAVBAR */}
      <header className="bg-[#0071DC] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand Logo */}
          <div 
            onClick={() => { setActiveCategory(''); setActiveSearch(''); setSearchQuery(''); }}
            className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black tracking-tight">NexDay</span>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex-grow max-w-2xl relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSuggestOpen(true)}
              onBlur={() => setTimeout(() => setIsSuggestOpen(false), 250)}
              placeholder="Search products by brand, category or specifications..." 
              className="w-full text-gray-800 pl-4 pr-12 py-2.5 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-[#FFC220] text-sm font-medium shadow-inner"
            />
            <button 
              type="submit"
              className="absolute right-2 top-1.5 bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] p-1.5 rounded-full transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Suggestions Overlay */}
            {isSuggestOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 text-gray-800 z-50 text-xs font-bold font-mono">
                {suggestions.map((item, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      logTelemetryEvent('search_suggestion_click', { query: searchQuery, selected_text: item.text });
                      setSearchQuery(item.text);
                      setIsSuggestOpen(false);
                      navigate(`/search?q=${encodeURIComponent(item.text)}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 hover:text-[#0071DC] cursor-pointer"
                  >
                    <span>{item.text}</span>
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{item.type}</span>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* User & Cart Info Actions */}
          <div className="flex items-center justify-between md:justify-end space-x-4 flex-shrink-0">
            
            {/* Wishlist Link */}
            <button 
              onClick={() => navigate('/wishlist')}
              className="flex items-center space-x-1.5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors text-sm font-bold focus:outline-none"
            >
              <Heart className="w-4 h-4 text-rose-200 fill-rose-200" />
              <span>Wishlist</span>
            </button>

            {/* Account Panel Dropdown */}
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
                      <div className="space-y-2">
                        <p className="font-medium text-gray-700">Name: <span className="font-bold">{customer.first_name} {customer.last_name}</span></p>
                        <p className="font-medium text-gray-700">Membership: <span className="font-bold text-[#FFC220] bg-blue-900 px-2 py-0.5 rounded-full">{customer.membership}</span></p>
                        <p className="font-medium text-gray-700">Preferred Pay: <span className="font-bold">{customer.preferred_payment}</span></p>
                        <button
                          onClick={() => { setIsAccountOpen(false); navigate('/profile'); }}
                          className="w-full mt-2 bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-xl font-bold transition-colors text-[10px] uppercase tracking-wider text-center"
                        >
                          My Account / Profile
                        </button>
                        <button
                          onClick={() => { setIsAccountOpen(false); navigate('/orders'); }}
                          className="w-full bg-blue-50 hover:bg-blue-100 text-[#0071DC] py-2 rounded-xl font-bold transition-colors text-[10px] uppercase tracking-wider text-center"
                        >
                          View My Orders
                        </button>
                        <button
                          onClick={() => { setIsAccountOpen(false); navigate('/notifications'); }}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl font-bold transition-colors text-[10px] uppercase tracking-wider text-center"
                        >
                          Notifications
                        </button>
                        <button
                          onClick={() => { setIsAccountOpen(false); navigate('/help'); }}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl font-bold transition-colors text-[10px] uppercase tracking-wider text-center"
                        >
                          Help & Support
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-medium text-gray-500">You are browsing as a guest.</p>
                        <button 
                          onClick={() => { setIsAccountOpen(false); navigate('/login'); }}
                          className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-full font-bold transition-colors"
                        >
                          Sign In / Register
                        </button>
                      </div>
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

            {/* Shopping Cart Trigger */}
            <button 
              onClick={() => navigate('/cart')}
              className="flex items-center space-x-2 bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-4 py-2 rounded-full transition-colors text-sm font-bold shadow-md relative"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Cart</span>
              {getCartTotalCount() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white animate-bounce">
                  {getCartTotalCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CATEGORIES HORIZONTAL NAVIGATION BAR */}
      <nav className="bg-white border-b border-gray-200 py-2 shadow-sm overflow-x-auto scrollbar-none sticky top-[72px] z-30">
        <div className="max-w-7xl mx-auto px-4 flex items-center space-x-2 whitespace-nowrap">
          <button 
            onClick={() => { setActiveCategory(''); logTelemetryEvent('category_click', { category_id: 'ALL', category_name: 'All' }); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${!activeCategory ? 'bg-[#0071DC] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.category_id}
              onClick={() => handleCategoryClick(cat.slug)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${activeCategory === cat.category_id ? 'bg-[#0071DC] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTAINER CONTENT */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">

        {/* HERO BANNER CAROUSEL CAMPAIGNS */}
        {banners.length > 0 && (
          <div className="relative bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 h-64 sm:h-80 md:h-96 group">
            <AnimatePresence mode="wait">
              <motion.div 
                key={bannerIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-cover bg-center flex items-center p-8 sm:p-12 md:p-20 text-white"
                style={{ 
                  backgroundImage: `linear-gradient(to right, rgba(4,30,66,0.9), rgba(4,30,66,0.3)), url(${banners[bannerIdx].image_url})`,
                  backgroundColor: '#041E42'
                }}
              >
                <div className="max-w-md space-y-4">
                  <span className="bg-[#FFC220] text-[#041E42] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                    Campaign Live
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                    {banners[bannerIdx].title}
                  </h2>
                  <p className="text-sm text-gray-200 font-medium">
                    {banners[bannerIdx].subtitle}
                  </p>
                  <button 
                    onClick={() => {
                      logTelemetryEvent('banner_click', { banner_id: banners[bannerIdx].id, title: banners[bannerIdx].title });
                      navigate(banners[bannerIdx].link_url);
                    }}
                    className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full text-xs font-bold transition-colors shadow-md"
                  >
                    Shop Deals Now
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider arrows */}
            <button 
              onClick={prevBanner}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextBanner}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Slide indicators dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setBannerIdx(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${bannerIdx === idx ? 'bg-[#FFC220] w-6' : 'bg-white/50 hover:bg-white'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* SHOP BY CATEGORY CIRCLE GRID */}
        {!activeCategory && !activeSearch && (
          <div className="space-y-4">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>Shop by Category</span>
              <span className="w-2 h-2 rounded-full bg-[#0071DC] animate-ping"></span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
              {categories.slice(0, 8).map((cat) => (
                <motion.div 
                  key={cat.category_id}
                  whileHover={{ y: -6, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="bg-white p-4 rounded-3xl border border-gray-100 text-center hover:shadow-lg transition-all cursor-pointer space-y-2 flex flex-col items-center justify-between group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100/60 text-[#0071DC] rounded-full flex items-center justify-center font-black text-base shadow-inner uppercase group-hover:bg-[#0071DC] group-hover:text-white transition-colors duration-300">
                    {cat.name.substring(0, 2)}
                  </div>
                  <span className="text-xs font-bold text-gray-700 tracking-tight block group-hover:text-[#0071DC] transition-colors">
                    {cat.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* FLASH DEALS ROW */}
        {!activeCategory && !activeSearch && flashDeals.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <Zap className="w-6 h-6 fill-red-600 animate-bounce" />
              <h3 className="text-xl font-black tracking-tight">Flash Deals</h3>
              <span className="bg-red-100 text-red-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                Up to 50% Off
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
              {flashDeals.map((prod, idx) => (
                <motion.div 
                  key={prod.product_id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  ref={(el) => observeImpression(el, prod.product_id, idx, 'flash_deals')}
                  onClick={() => handleProductClick(prod)}
                  className="bg-white p-4 rounded-3xl border border-gray-150 hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between space-y-4 relative group"
                >
                  <span className="absolute top-3 left-3 bg-gradient-to-r from-red-600 to-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase z-10 shadow-sm">
                    {prod.discount}% OFF
                  </span>
                  
                  {/* Product Image */}
                  <div className="bg-gray-50 h-32 rounded-2xl flex items-center justify-center text-center text-[#041E42] relative overflow-hidden p-2">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out" />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs font-black uppercase text-gray-300 tracking-widest">{prod.brand}</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-1">{prod.category_id}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#0071DC] tracking-wide uppercase">{prod.brand}</span>
                    <h4 className="text-xs font-extrabold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#0071DC] transition-colors">{prod.name}</h4>
                    
                    {/* Rating */}
                    <div className="flex items-center space-x-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="text-[10px] font-bold text-gray-700">{prod.rating}</span>
                      <span className="text-[9px] text-gray-400 font-medium">({prod.review_count.toLocaleString()})</span>
                    </div>

                    <div className="flex items-baseline space-x-1.5 pt-1">
                      <span className="text-sm font-black text-[#041E42]">₹{prod.sale_price.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-400 line-through">₹{prod.price.toLocaleString()}</span>
                    </div>
                  </div>

                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleAddToCart(prod, e)}
                    className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
                  >
                    Add to Cart
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* CATALOG / SEARCH RESULTS MAIN GRID */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-xl font-black tracking-tight">
              {activeSearch ? `Search Results for "${activeSearch}"` : activeCategory ? 'Category Catalog' : 'Explore Products'}
            </h3>
            <span className="text-xs text-gray-400 font-bold">
              {allProducts.length} items found
            </span>
          </div>

          {allProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {allProducts.map((prod, idx) => (
                <motion.div 
                  key={prod.product_id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  ref={(el) => observeImpression(el, prod.product_id, idx, 'main_catalog')}
                  onClick={() => handleProductClick(prod)}
                  className="bg-white p-5 rounded-3xl border border-gray-150 hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="relative">
                    {prod.discount > 0 && (
                      <span className="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase z-10 shadow-sm">
                        {prod.discount}% OFF
                      </span>
                    )}

                    {/* Product Image */}
                    <div className="bg-gray-50 h-40 rounded-2xl flex items-center justify-center text-center text-[#041E42] relative overflow-hidden p-2">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out" />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-black uppercase text-gray-300 tracking-widest">{prod.brand}</span>
                          <span className="text-xs font-bold text-gray-400 mt-1">₹{prod.sale_price.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#0071DC] tracking-wide uppercase">{prod.brand}</span>
                      <span className="text-[9px] font-bold bg-[#F2F8FD] text-[#0071DC] px-2 py-0.5 rounded-md">{prod.sku.split('-')[1]}</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#0071DC] transition-colors">{prod.name}</h4>
                    
                    {/* Rating */}
                    <div className="flex items-center space-x-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="text-xs font-bold text-gray-700">{prod.rating}</span>
                      <span className="text-[10px] text-gray-400 font-medium">({prod.review_count.toLocaleString()})</span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-black text-[#041E42]">₹{prod.sale_price.toLocaleString()}</span>
                        {prod.discount > 0 && (
                          <span className="text-xs text-gray-400 line-through">₹{prod.price.toLocaleString()}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${prod.stock > 5 ? 'text-emerald-600' : prod.stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {prod.stock > 5 ? 'In Stock' : prod.stock > 0 ? `Only ${prod.stock} left` : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-50">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => handleAddToCart(prod, e)}
                      disabled={prod.stock === 0}
                      className="flex-grow bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
                    >
                      {prod.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </motion.button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); showTemporaryAlert(`Saved ${prod.name} to Wishlist!`); }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2.5 rounded-xl transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 space-y-2">
              <p className="font-bold text-gray-500">No products matching your filters.</p>
              <button 
                onClick={() => { setActiveCategory(''); setActiveSearch(''); setSearchQuery(''); }}
                className="text-[#0071DC] font-bold text-xs hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* RECOMMENDED PRODUCTS SECTION */}
        {recommended.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-black tracking-tight">Recommended For You</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {recommended.map((prod, idx) => (
                <div 
                  key={`rec_${prod.product_id}`}
                  ref={(el) => observeImpression(el, prod.product_id, idx, 'recommendations')}
                  onClick={() => handleProductClick(prod)}
                  className="bg-white p-4 rounded-3xl border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="bg-gray-50 h-32 rounded-2xl flex flex-col items-center justify-center text-center text-[#041E42] relative overflow-hidden">
                    <span className="text-xs font-black uppercase text-gray-300 tracking-widest">{prod.brand}</span>
                    <span className="text-[10px] font-bold text-gray-400 mt-1">₹{prod.sale_price.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-extrabold text-gray-800 line-clamp-2 leading-snug">{prod.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#041E42]">₹{prod.sale_price.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{prod.brand}</span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => handleAddToCart(prod, e)}
                    className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRENDING NOW PRODUCTS SECTION */}
        {trending.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-black tracking-tight">Trending Now</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {trending.map((prod, idx) => (
                <div 
                  key={`trend_${prod.product_id}`}
                  ref={(el) => observeImpression(el, prod.product_id, idx, 'trending')}
                  onClick={() => handleProductClick(prod)}
                  className="bg-white p-4 rounded-3xl border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="bg-gray-50 h-32 rounded-2xl flex flex-col items-center justify-center text-center text-[#041E42] relative overflow-hidden">
                    <span className="text-xs font-black uppercase text-gray-300 tracking-widest">{prod.brand}</span>
                    <span className="text-[10px] font-bold text-gray-400 mt-1">₹{prod.sale_price.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-extrabold text-gray-800 line-clamp-2 leading-snug">{prod.name}</h4>
                    <div className="flex items-center space-x-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="text-[10px] font-bold text-gray-700">{prod.rating}</span>
                      <span className="text-[9px] text-gray-400 font-medium">({prod.review_count.toLocaleString()})</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-black text-[#041E42]">₹{prod.sale_price.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{prod.brand}</span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => handleAddToCart(prod, e)}
                    className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENTLY VIEWED CAROUSEL ROW */}
        {recentlyViewed.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-1.5">
              <Eye className="w-5 h-5 text-gray-600" />
              <h3 className="text-xl font-black tracking-tight">Recently Viewed Items</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {recentlyViewed.map((prod) => (
                <div 
                  key={`rv_${prod.product_id}`}
                  onClick={() => handleProductClick(prod)}
                  className="bg-white p-3 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow cursor-pointer space-y-2 flex flex-col justify-between"
                >
                  <div className="bg-gray-50 h-24 rounded-xl flex items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase text-gray-300">{prod.brand}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold text-gray-700 line-clamp-2 leading-tight">{prod.name}</h4>
                    <p className="text-xs font-extrabold text-[#041E42]">₹{prod.sale_price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRANDS BANNER ROW */}
        <div className="space-y-4">
          <h3 className="text-xl font-black tracking-tight">Shop Top Brands</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {['Apple', 'Samsung', 'Sony', 'Nike', 'Dell', 'Logitech'].map((brandName) => (
              <motion.div 
                key={brandName}
                whileHover={{ scale: 1.05, y: -4 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                onClick={() => { 
                  setSearchQuery(brandName); 
                  setActiveSearch(brandName); 
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white border border-gray-100 p-6 rounded-2xl flex items-center justify-center text-gray-400 font-extrabold text-sm uppercase tracking-widest hover:border-[#0071DC] hover:text-[#0071DC] transition-colors cursor-pointer shadow-sm hover:shadow-md"
              >
                {brandName}
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* PERSISTENT FOOTER */}
      <footer className="bg-[#041E42] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 border-b border-white/10 pb-8 text-sm">
          <div className="space-y-3">
            <h4 className="font-extrabold text-base text-[#FFC220]">NexDay</h4>
            <p className="text-gray-300 text-xs">Brand New Day, Everything You Needed, Delivered Faster. Your Premium Storefront Destination.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#FFC220]">Services</h4>
            <ul className="text-gray-300 text-xs space-y-1">
              <li>Same Day Delivery</li>
              <li>Express Groceries</li>
              <li>Enterprise Warehousing</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#FFC220]">Analytics & Logs</h4>
            <ul className="text-gray-300 text-xs space-y-1">
              <li>Clickstream Event Tracking</li>
              <li>Kafka Pipelines (Planned)</li>
              <li>Medallion Data Lakehouses</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#FFC220]">Session Info</h4>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] font-mono space-y-1">
              <p>ID: {session?.session_id}</p>
              <p>Type: {session?.user_type}</p>
              <p>User: {customer ? `${customer.first_name}` : 'Guest'}</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-6 text-center text-xs text-gray-400">
          NexDay &bull; Premium Storefront &bull; 1,000 Products Catalog Seed Enabled
        </div>
      </footer>

      {/* SLIDING SIDE CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Panel */}
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
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
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
                          <button 
                            onClick={() => addItemToCart(item, 1)}
                            className="bg-gray-100 hover:bg-gray-200 p-1 rounded-md text-gray-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => removeItemFromCart(item.product_id)}
                            className="bg-gray-100 hover:bg-gray-200 p-1 rounded-md text-gray-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <p className="text-xs font-black">₹{(item.sale_price * item.quantity).toLocaleString()}</p>
                        <button 
                          onClick={() => removeItemFromCart(item.product_id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 space-y-3">
                    <p className="text-gray-400 font-bold text-sm">Your cart is empty.</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-[#0071DC] text-xs font-bold hover:underline"
                    >
                      Start adding products!
                    </button>
                  </div>
                )}
              </div>

              {/* Subtotal & Checkout Trigger */}
              <div className="p-6 border-t bg-[#F7F8F9] space-y-4">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Subtotal ({getCartTotalCount()} items)</span>
                  <span className="text-lg font-black text-[#041E42]">₹{getCartTotalPrice().toLocaleString()}</span>
                </div>
                
                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    if (!isAuthenticated) {
                      showTemporaryAlert('Check out requires an account. Redirecting you to Login...');
                      setTimeout(() => navigate('/login?redirect=checkout'), 800);
                    } else {
                      navigate('/checkout');
                    }
                  }}
                  disabled={cartItems.length === 0}
                  className="w-full bg-[#FFC220] hover:bg-[#E5AC12] disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed text-[#041E42] py-3.5 rounded-full font-black text-xs transition-colors shadow-md flex items-center justify-center"
                >
                  Proceed to Checkout
                </button>
                
                {!isAuthenticated && (
                  <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-semibold leading-relaxed">
                    <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>Guests can browse and add items, but completing checkout requires creating a customer profile.</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
