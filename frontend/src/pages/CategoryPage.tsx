import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, ChevronRight, Sliders, RotateCcw, LayoutGrid, List, Check
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';

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
  const { session, customer } = useSessionStore();
  const { fetchCart } = useCartStore();

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 150000 });
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [deliverySpeed, setDeliverySpeed] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState('popularity');
  const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductsCount, setTotalProductsCount] = useState(0);

  // Reset filters when category slug changes
  useEffect(() => {
    setSelectedBrands([]);
    setAvailableBrands([]);
    setPriceRange({ min: 0, max: 150000 });
    setSelectedRating(null);
    setInStockOnly(false);
    setDeliverySpeed(null);
    setSelectedDiscount(null);
    setCurrentPage(1);
  }, [slug]);

  // Fetch Category metadata
  useEffect(() => {
    if (!slug) return;
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.categories) {
          const active = d.categories.find((c: Category) => c.slug === slug || (slug === 'home-living' && c.slug === 'home-furniture') || (slug === 'groceries' && c.slug === 'grocery'));
          if (active) setActiveCategory(active);
          else setActiveCategory({ category_id: 'CAT001', name: slug.replace(/-/g, ' ').toUpperCase(), slug, description: 'Explore top brands and quality products.' });
        }
      })
      .catch(() => {
        setActiveCategory({ category_id: 'CAT001', name: slug.replace(/-/g, ' ').toUpperCase(), slug, description: 'Explore top brands and quality products.' });
      });
  }, [slug]);

  // Fetch cart
  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session]);

  // Fetch products
  const fetchFilteredProducts = useCallback(() => {
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
        if (d.success && d.products) {
          setProducts(d.products);
          setTotalProductsCount(d.pagination?.total || d.products.length);
          setTotalPages(Math.ceil((d.pagination?.total || d.products.length) / (d.pagination?.limit || 12)) || 1);

          // Extract unique brands for this category/subcategory dynamically
          const fetchedBrands = Array.from(new Set(d.products.map((p: Product) => p.brand))).filter(Boolean) as string[];
          if (fetchedBrands.length > 0) {
            setAvailableBrands(prev => {
              const combined = Array.from(new Set([...prev, ...fetchedBrands]));
              return combined;
            });
          }
        }
      })
      .catch(() => {});
  }, [slug, subSlug, selectedBrands, priceRange, selectedRating, inStockOnly, deliverySpeed, sortOption, currentPage]);

  useEffect(() => {
    fetchFilteredProducts();
  }, [fetchFilteredProducts]);

  // Telemetry log helper
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
    } catch (e) {}
  };

  useEffect(() => {
    if (session && slug) {
      logTelemetryEvent('page_view', { page: `category_${slug}`, subcategory: subSlug || null });
    }
  }, [session, slug, subSlug]);

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

  const resetAllFilters = () => {
    setSelectedBrands([]);
    setPriceRange({ min: 0, max: 150000 });
    setSelectedRating(null);
    setInStockOnly(false);
    setDeliverySpeed(null);
    setSelectedDiscount(null);
    setSortOption('popularity');
    setCurrentPage(1);
  };

  const categoryTitle = activeCategory ? activeCategory.name : (slug ? slug.replace(/-/g, ' ').toUpperCase() : 'SPORTS & FITNESS');

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans selection:bg-[#0875E1] selection:text-white">
      
      {/* HEADER */}
      <Header activeCategorySlug={slug} />

      {/* MAIN BODY (100% FULL BLEED VIEWPORT WIDTH MATCHING REFERENCE) */}
      <main className="flex-grow w-full px-4 sm:px-6 md:px-8 py-4 space-y-4">
        
        {/* BREADCRUMBS (Home > Sports & Fitness) */}
        <nav className="flex items-center space-x-1.5 text-xs text-gray-500 font-semibold">
          <button onClick={() => navigate('/home')} className="hover:text-[#0875E1]">Home</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[#0875E1] font-extrabold capitalize">{categoryTitle.toLowerCase()}</span>
          {subSlug && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-800 capitalize font-extrabold">{subSlug.replace(/-/g, ' ')}</span>
            </>
          )}
        </nav>

        {/* CATEGORY BANNER (MATCHING REFERENCE IMAGE 100%) */}
        <div className="relative bg-[#FAF5EE] rounded-3xl border border-amber-900/10 shadow-sm overflow-hidden h-[180px] sm:h-[200px] flex items-center">
          <div className="w-full grid grid-cols-1 md:grid-cols-12 items-center px-6 sm:px-10 gap-4">
            
            {/* Left Title & Tagline */}
            <div className="md:col-span-7 space-y-1.5 text-left z-10">
              <h1 className="text-2xl sm:text-4xl font-black text-[#172033] tracking-tight leading-tight capitalize">
                {categoryTitle}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-gray-600 max-w-lg">
                {activeCategory?.description || 'Explore top brands and quality products for your daily lifestyle.'}
              </p>
            </div>

            {/* Right Banner Promo & Script Text matching Reference Image */}
            <div className="md:col-span-5 flex items-center justify-end space-x-6 z-10 hidden md:flex">
              <div className="text-right space-y-0.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#0B2A55]">
                  PREMIUM SELECTION FOR YOU
                </p>
                <p className="text-[10px] font-bold text-gray-500">
                  Top Brands &nbsp;|&nbsp; Best Prices &nbsp;|&nbsp; Fast Delivery
                </p>
              </div>

              {/* High Res Banner Photo */}
              <div className="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80"
                  alt="Category Banner"
                  className="w-44 h-32 object-cover rounded-2xl shadow-md border-2 border-white"
                />
              </div>

              {/* Script Cursive Overlay */}
              <div className="relative shrink-0 hidden lg:block">
                <p className="font-serif italic text-xl font-black text-[#172033]">
                  Better Everyday.
                </p>
                <div className="w-full h-1 bg-[#FFC20A] rounded-full -rotate-2 mt-0.5"></div>
              </div>
            </div>

          </div>
        </div>

        {/* MAIN FILTER + PRODUCTS LISTING SPLIT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-2">
          
          {/* LEFT FILTER SIDEBAR (COL 3 - MATCHING REFERENCE IMAGE 100%) */}
          <aside className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/80 p-4 space-y-5 shadow-2xs sticky top-36">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-[#172033]">
                <Sliders className="w-4 h-4 text-[#0875E1]" />
                <h3 className="text-xs font-black uppercase tracking-wider">Filters</h3>
              </div>
              <button 
                onClick={resetAllFilters}
                className="text-xs font-bold text-[#0875E1] hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>

            {/* BRAND FILTER */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#172033]">Brand</h4>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                {availableBrands.length > 0 ? (
                  availableBrands.map((brandName) => (
                    <label key={brandName} className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer hover:text-[#0875E1]">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brandName)}
                        onChange={() => handleBrandChange(brandName)}
                        className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300 cursor-pointer"
                      />
                      <span>{brandName}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 font-medium">All Category Brands</p>
                )}
              </div>
            </div>

            {/* PRICE RANGE SLIDER */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#172033]">
                <h4>Price Range</h4>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="500"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) })}
                className="w-full accent-[#0875E1] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
              />
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                <span>₹0</span>
                <span className="text-[#0875E1] font-black">₹{priceRange.max.toLocaleString()}</span>
              </div>
            </div>

            {/* CUSTOMER RATING FILTER */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <h4 className="text-xs font-extrabold text-[#172033]">Customer Rating</h4>
              <div className="space-y-1 text-xs">
                {[4, 3, 2, 1].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => { setSelectedRating(selectedRating === stars ? null : stars); setCurrentPage(1); }}
                    className={`w-full flex items-center justify-between text-xs font-semibold p-1 rounded-lg transition-colors ${
                      selectedRating === stars ? 'bg-blue-50 text-[#0875E1] font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-600 font-bold ml-1">{stars} &amp; above</span>
                    </div>
                    {selectedRating === stars && <Check className="w-3.5 h-3.5 text-[#0875E1]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* AVAILABILITY FILTER */}
            <div className="space-y-1.5 border-t border-gray-100 pt-3 text-xs">
              <h4 className="text-xs font-extrabold text-[#172033]">Availability</h4>
              <label className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
                  className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5"
                />
                <span>In Stock (42)</span>
              </label>
              <label className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  onChange={() => {}}
                  className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5"
                />
                <span>Out of Stock (8)</span>
              </label>
            </div>

            {/* DISCOUNT FILTER */}
            <div className="space-y-1.5 border-t border-gray-100 pt-3 text-xs">
              <h4 className="text-xs font-extrabold text-[#172033]">Discount</h4>
              {[10, 20, 30].map((disc) => (
                <label key={disc} className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDiscount === disc}
                    onChange={() => setSelectedDiscount(selectedDiscount === disc ? null : disc)}
                    className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5"
                  />
                  <span>{disc}% or more</span>
                </label>
              ))}
            </div>

          </aside>

          {/* RIGHT PRODUCTS LISTING (COL 9) */}
          <section className="lg:col-span-9 space-y-3">
            
            {/* TOOLBAR (Item Count, Sorting Dropdown & Grid View Toggle) */}
            <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-extrabold text-[#172033]">
                Showing products <strong className="text-[#0875E1]">1 &ndash; {products.length}</strong> of {totalProductsCount || 50}
              </span>

              <div className="flex items-center space-x-3 text-xs font-bold">
                <span className="text-gray-500">Sort by</span>
                <select
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
                  className="bg-gray-50 border border-gray-200 text-[#172033] px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0875E1] cursor-pointer font-bold"
                >
                  <option value="popularity">Popularity</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>

                {/* View Mode Icons */}
                <div className="flex items-center space-x-1 pl-2 border-l border-gray-200">
                  <button className="p-1.5 rounded-lg bg-[#0875E1] text-white shadow-2xs">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:text-[#172033]">
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* PRODUCT CARDS GRID (6 COLUMNS MATCHING REFERENCE IMAGE EXACTLY) */}
            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 items-stretch">
                {products.map((product) => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
                <p className="text-sm font-bold text-gray-600">No products found matching your active filters.</p>
                <button 
                  onClick={resetAllFilters} 
                  className="bg-[#0875E1] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#065BB5]"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* PAGINATION BUTTONS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 pt-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-40 cursor-pointer shadow-2xs"
                >
                  Next
                </button>
              </div>
            )}

          </section>

        </div>

      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};
