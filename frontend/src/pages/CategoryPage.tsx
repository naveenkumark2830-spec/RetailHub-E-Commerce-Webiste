import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, ArrowLeft, User, ShoppingCart, Heart, 
  Star, Trash2, X, Plus, Minus, Sliders, Zap, LogOut
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

interface Category {
  category_id: string;
  name: string;
  slug: string;
  description: string;
}

export const CategoryPage: React.FC = () => {
  const { slug, subSlug } = useParams<{ slug: string; subSlug?: string }>();
  const navigate = useNavigate();
  const { session, customer, isAuthenticated, logout, terminateSession } = useSessionStore();
  const { items: cartItems, addItemToCart, removeItemFromCart, fetchCart, getCartTotalCount, getCartTotalPrice } = useCartStore();

  // Category Meta data
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  // Lists & Filters
  const [products, setProducts] = useState<Product[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 150000 });
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [deliverySpeed, setDeliverySpeed] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState('popularity');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  // Layout UI states
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Telemetry impressions tracker
  const loggedImpressions = useRef<Set<string>>(new Set());

  // Fetch categories & subcategories metadata
  useEffect(() => {
    if (!slug) return;
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const active = d.categories.find((c: Category) => c.slug === slug);
          if (active) setActiveCategory(active);
        }
      });

    fetch(`/api/categories/${slug}/subcategories`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSubcategories(d.subcategories);
        }
      });
  }, [slug]);

  // Fetch cart when session is loaded
  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session, fetchCart]);

  // Fetch products with all active query filters
  const fetchFilteredProducts = () => {
    if (!slug) return;
    
    let url = `/api/products?category_slug=${slug}&page=${currentPage}&limit=12`;
    if (subSlug) url += `&subcategory_slug=${subSlug}`;
    if (selectedBrands.length > 0) url += `&brands=${selectedBrands.join(',')}`;
    if (priceRange.min > 0) url += `&min_price=${priceRange.min}`;
    if (priceRange.max < 150000) url += `&max_price=${priceRange.max}`;
    if (selectedRating !== null) url += `&rating=${selectedRating}`;
    if (inStockOnly) url += `&in_stock=true`;
    if (deliverySpeed !== null) url += `&delivery_days=${deliverySpeed}`;
    if (sortOption) url += `&sort=${sortOption}`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProducts(d.products);
          setTotalProductsCount(d.pagination.total);
          setTotalPages(Math.ceil(d.pagination.total / d.pagination.limit) || 1);

          // Extract brands from result list if brands not yet populated
          if (availableBrands.length === 0 && d.products.length > 0) {
            const brandsSet = new Set<string>(d.products.map((p: Product) => p.brand));
            setAvailableBrands(Array.from(brandsSet));
          }
        }
      });
  };

  useEffect(() => {
    fetchFilteredProducts();
  }, [slug, subSlug, selectedBrands, priceRange, selectedRating, inStockOnly, deliverySpeed, sortOption, currentPage]);

  // Telemetry triggers
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
          page: `category_${slug}`,
          device: 'desktop',
          browser: 'Chrome',
          metadata
        })
      });
    } catch (e) {
      console.warn('[Telemetry Event Send Failed]', e);
    }
  };

  // Log page view
  useEffect(() => {
    if (session && slug) {
      logTelemetryEvent('page_view', { page: `category_${slug}`, subcategory: subSlug || null });
    }
  }, [session, slug, subSlug]);

  const trackImpression = (productId: string, index: number) => {
    const key = `category_${slug}_${productId}`;
    if (loggedImpressions.current.has(key)) return;
    loggedImpressions.current.add(key);

    logTelemetryEvent('product_impression', {
      product_id: productId,
      position: index + 1 + (currentPage - 1) * 12,
      section: 'category_page',
      page: currentPage
    });
  };

  const observeImpression = (node: HTMLDivElement | null, productId: string, index: number) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackImpression(productId, index);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
  };

  // User filter handlers
  const handleBrandChange = (brand: string) => {
    const updated = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(updated);
    setCurrentPage(1);

    logTelemetryEvent('filter_applied', {
      filter_type: 'brand',
      filter_value: brand,
      action: selectedBrands.includes(brand) ? 'removed' : 'added'
    });
  };

  const handleRatingChange = (rating: number) => {
    const val = selectedRating === rating ? null : rating;
    setSelectedRating(val);
    setCurrentPage(1);

    logTelemetryEvent('filter_applied', {
      filter_type: 'rating',
      filter_value: val ? `${val}★` : 'clear'
    });
  };

  const handleStockChange = (checked: boolean) => {
    setInStockOnly(checked);
    setCurrentPage(1);

    logTelemetryEvent('filter_applied', {
      filter_type: 'availability',
      filter_value: checked ? 'in_stock' : 'all'
    });
  };

  const handleDeliveryChange = (days: number | null) => {
    setDeliverySpeed(days);
    setCurrentPage(1);

    logTelemetryEvent('filter_applied', {
      filter_type: 'delivery',
      filter_value: days ? `${days}_days` : 'all'
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSortOption(val);
    setCurrentPage(1);

    logTelemetryEvent('sort_applied', {
      sort_by: val
    });
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
          category: slug,
          price: product.sale_price,
          source: 'category_page'
        })
      });

      navigate(`/product/${product.product_id}`);
    } catch (e) {
      console.error(e);
      navigate(`/product/${product.product_id}`);
    }
  };

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
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

      {/* HEADER NAVBAR */}
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
              <span>Catalog Home</span>
            </button>

            {/* Wishlist Link */}
            <button 
              onClick={() => navigate('/wishlist')}
              className="flex items-center space-x-1.5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors text-sm font-bold focus:outline-none"
            >
              <Heart className="w-4 h-4 text-rose-200 fill-rose-200" />
              <span>Wishlist</span>
            </button>

            {/* Account Panel */}
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
                        <p className="font-medium text-gray-700">Name: <span className="font-bold">{customer.first_name}</span></p>
                        <p className="font-medium text-gray-700">Type: <span className="font-bold uppercase">{customer.membership}</span></p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setIsAccountOpen(false); navigate('/login'); }}
                        className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-full font-bold transition-colors"
                      >
                        Sign In / Register
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
              onClick={() => navigate('/cart')}
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

      {/* CATEGORY METADATA HEADER BANNER */}
      <section className="bg-white border-b border-gray-200 py-8 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/home')}>Home</span>
            <span>&gt;</span>
            <span className="text-[#0071DC]">{activeCategory?.name || 'Category'}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-[#041E42] tracking-tight">{activeCategory?.name || 'Category Catalog'}</h1>
              <p className="text-sm text-gray-500 font-medium">{activeCategory?.description || 'Explore products in this category.'}</p>
            </div>
            <div className="bg-[#F2F8FD] px-4 py-2 rounded-2xl border border-blue-50 text-right flex-shrink-0">
              <span className="text-xs text-gray-400 font-bold uppercase block">Products Sourced</span>
              <span className="text-xl font-black text-[#0071DC]">{totalProductsCount} items</span>
            </div>
          </div>

          {/* Subcategories navigation chips line */}
          {subcategories.length > 0 && (
            <div className="flex items-center space-x-3 pt-3 overflow-x-auto scrollbar-none py-1 border-t">
              {subcategories.map((sub) => (
                <button 
                  key={sub.subcategory_id}
                  onClick={() => {
                    const path = subSlug === sub.slug ? `/category/${slug}` : `/category/${slug}/${sub.slug}`;
                    navigate(path);
                    logTelemetryEvent('subcategory_click', { subcategory_slug: sub.slug });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${subSlug === sub.slug ? 'bg-[#0071DC] text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'}`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATALOG FILTER LAYOUT */}
      <section className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT SIDEBAR FILTER COMPONENT */}
          <aside className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-8 h-fit">
            <div className="flex items-center justify-between border-b pb-3 text-[#041E42]">
              <div className="flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-[#0071DC]" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Filters</h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedBrands([]);
                  setPriceRange({ min: 0, max: 150000 });
                  setSelectedRating(null);
                  setInStockOnly(false);
                  setDeliverySpeed(null);
                }}
                className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase transition-colors focus:outline-none"
              >
                Reset All
              </button>
            </div>

            {/* Brands Checkbox List */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">Brand</h4>
              <div className="space-y-2">
                {availableBrands.map((brandName) => (
                  <label key={brandName} className="flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedBrands.includes(brandName)}
                      onChange={() => handleBrandChange(brandName)}
                      className="w-4 h-4 rounded text-[#0071DC] focus:ring-[#0071DC] border-gray-300"
                    />
                    <span>{brandName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price slider inputs */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">Price Range</h4>
              <div className="space-y-3">
                <input 
                  type="range" 
                  min="0" 
                  max="150000" 
                  step="500"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0071DC]"
                />
                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>₹0</span>
                  <span>₹{priceRange.max.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Ratings Checkbox */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">Rating</h4>
              <div className="space-y-2">
                {[4, 3].map((starNum) => (
                  <button 
                    key={starNum}
                    onClick={() => handleRatingChange(starNum)}
                    className={`w-full flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-xl text-left border transition-all ${selectedRating === starNum ? 'bg-[#F2F8FD] border-[#0071DC] text-[#0071DC]' : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{starNum}★ & above</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">Availability</h4>
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => handleStockChange(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0071DC] focus:ring-[#0071DC] border-gray-300"
                />
                <span>Exclude Out of Stock</span>
              </label>
            </div>

            {/* Delivery Days Speed */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">Delivery Speed</h4>
              <div className="space-y-2">
                {[1, 2].map((days) => (
                  <button 
                    key={days}
                    onClick={() => handleDeliveryChange(deliverySpeed === days ? null : days)}
                    className={`w-full flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-xl text-left border transition-all ${deliverySpeed === days ? 'bg-[#F2F8FD] border-[#0071DC] text-[#0071DC]' : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700'}`}
                  >
                    <span>{days === 1 ? 'Tomorrow Delivery' : 'Within 2 Days'}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN PRODUCT GRID CATALOG */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Top Grid Info Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-xs font-bold text-gray-600">
              <span>Showing products {(currentPage - 1) * 12 + 1} - {Math.min(currentPage * 12, totalProductsCount)} of {totalProductsCount}</span>
              
              <div className="flex items-center space-x-2">
                <span>Sort By:</span>
                <select 
                  value={sortOption}
                  onChange={handleSortChange}
                  className="bg-gray-50 text-gray-800 px-3 py-1.5 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value="popularity">Popularity</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Rating Score</option>
                  <option value="discount">Highest Discount</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((prod, idx) => (
                  <div 
                    key={prod.product_id}
                    ref={(el) => observeImpression(el, prod.product_id, idx)}
                    onClick={() => handleProductClick(prod)}
                    className="bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                  >
                    <div className="relative">
                      {prod.discount > 0 && (
                        <span className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase z-10">
                          {prod.discount}% OFF
                        </span>
                      )}

                      {/* Product Image */}
                      <div className="bg-gray-50 h-40 rounded-2xl flex items-center justify-center text-center text-[#041E42] relative overflow-hidden p-2">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-sm font-black uppercase text-gray-300 tracking-widest">{prod.brand}</span>
                            <span className="text-xs font-bold text-gray-400 mt-1">₹{prod.sale_price.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
                        <span>{prod.brand}</span>
                        <span>SKU: {prod.sku.split('-')[1]}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-gray-800 line-clamp-2 leading-snug">{prod.name}</h4>
                      
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
                      </div>

                      <div className="text-[10px] font-bold text-gray-500 pt-1 flex justify-between">
                        <span>Delivery within {prod.delivery_days} days</span>
                        <span className={`${prod.stock > 5 ? 'text-emerald-600' : prod.stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {prod.stock > 5 ? 'In Stock' : prod.stock > 0 ? `Only ${prod.stock} left` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-gray-50">
                      <button 
                        onClick={(e) => handleAddToCart(prod, e)}
                        disabled={prod.stock === 0}
                        className="flex-grow bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        {prod.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      <button 
                        type="button" 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          if (!session) return;
                          try {
                            await fetch('/api/wishlist', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                session_id: session.session_id,
                                customer_id: customer?.customer_id || null,
                                product_id: prod.product_id,
                                category: prod.category_id,
                                price: prod.sale_price
                              })
                            });
                            showTemporaryAlert(`Saved ${prod.name} to Wishlist!`); 
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2.5 rounded-xl transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 space-y-2">
                <p className="font-bold text-gray-500">No products matching the active filters.</p>
                <button 
                  onClick={() => {
                    setSelectedBrands([]);
                    setPriceRange({ min: 0, max: 150000 });
                    setSelectedRating(null);
                    setInStockOnly(false);
                    setDeliverySpeed(null);
                  }}
                  className="text-[#0071DC] font-bold text-xs hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 pt-6">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  &lt; Prev
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold border transition-colors ${currentPage === i + 1 ? 'bg-[#0071DC] text-white border-transparent shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#FFC220]">NexDay Discovery</h4>
            <p className="text-gray-300 text-xs">Fully functional e-commerce category grids, database filters, offset pagination, and client clickstream trackers.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#FFC220]">Active Session</h4>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] font-mono">
              <p>Session ID: {session?.session_id}</p>
              <p>Identity: {customer ? `${customer.first_name}` : 'Guest'}</p>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-xs text-gray-400">NexDay Store Front &bull; Paginated Category List</p>
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
                      showTemporaryAlert('Check out requires an account. Redirecting you to Login...');
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
