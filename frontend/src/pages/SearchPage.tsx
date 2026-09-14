import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, Sliders, RotateCcw, LayoutGrid, List, ChevronLeft, Search, Truck, ShieldCheck, Award, RefreshCw
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

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();

  const { session, customer } = useSessionStore();
  const fetchCart = useCartStore((state) => state.fetchCart);

  // Search catalogs & filters states
  const [products, setProducts] = useState<Product[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandSearchInput, setBrandSearchInput] = useState<string>('');
  
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 150000 });
  const [inputMinPrice, setInputMinPrice] = useState<number>(0);
  const [inputMaxPrice, setInputMaxPrice] = useState<number>(50000);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState<boolean>(false);
  const [discountedOnly, setDiscountedOnly] = useState<boolean>(false);
  const [newArrivalsOnly, setNewArrivalsOnly] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('relevance');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);

  // Fetch cart
  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session, fetchCart]);

  // Reset filter state whenever search query 'q' changes
  useEffect(() => {
    setSelectedBrands([]);
    setAvailableBrands([]);
    setSelectedCategoryFilter(null);
    setPriceRange({ min: 0, max: 150000 });
    setInputMinPrice(0);
    setInputMaxPrice(50000);
    setSelectedRating(null);
    setInStockOnly(false);
    setFreeDeliveryOnly(false);
    setDiscountedOnly(false);
    setNewArrivalsOnly(false);
    setSortOption('relevance');
    setCurrentPage(1);
  }, [q]);

  // Main search retrieval effect
  const fetchSearchResults = useCallback(() => {
    if (!q) return;

    let url = `/api/search?q=${encodeURIComponent(q)}&page=${currentPage}&limit=24&session_id=${session?.session_id || ''}`;
    if (customer) url += `&customer_id=${customer.customer_id}`;
    if (selectedBrands.length > 0) url += `&brands=${selectedBrands.join(',')}`;
    if (priceRange.min > 0) url += `&min_price=${priceRange.min}`;
    if (priceRange.max < 150000) url += `&max_price=${priceRange.max}`;
    if (selectedRating !== null) url += `&rating=${selectedRating}`;
    if (inStockOnly) url += `&in_stock=true`;
    if (freeDeliveryOnly) url += `&delivery_days=2`;
    if (sortOption) url += `&sort=${sortOption}`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.products) {
          let filteredList = d.products as Product[];

          if (discountedOnly) {
            filteredList = filteredList.filter(p => p.discount > 0);
          }

          setProducts(filteredList);
          setTotalProductsCount(d.pagination?.total || filteredList.length);
          setTotalPages(Math.ceil((d.pagination?.total || filteredList.length) / (d.pagination?.limit || 24)) || 1);

          // Extract brands checklist dynamically
          const fetchedBrands = Array.from(new Set(filteredList.map((p: Product) => p.brand))).filter(Boolean) as string[];
          if (fetchedBrands.length > 0) {
            setAvailableBrands(prev => Array.from(new Set([...prev, ...fetchedBrands])));
          }

          // Telemetry checks for zero results vs results found
          if (filteredList.length === 0) {
            logTelemetryEvent('search_no_results', { query: q, result_count: 0 });
          } else {
            logTelemetryEvent('search', { query: q, result_count: d.pagination?.total || filteredList.length });
          }
        }
      })
      .catch(() => {});
  }, [q, selectedBrands, priceRange, selectedRating, inStockOnly, freeDeliveryOnly, discountedOnly, sortOption, currentPage, session, customer]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Standard telemetry logging
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
          page: 'search_results',
          device: 'desktop',
          browser: 'Chrome',
          metadata
        })
      });
    } catch (e) {}
  };

  const handleBrandChange = (brand: string) => {
    const updated = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(updated);
    setCurrentPage(1);

    logTelemetryEvent('filter_applied', {
      filter_type: 'brand',
      filter_value: brand,
      search_query: q,
      action: selectedBrands.includes(brand) ? 'removed' : 'added'
    });
  };

  const resetAllFilters = () => {
    setSelectedBrands([]);
    setSelectedCategoryFilter(null);
    setPriceRange({ min: 0, max: 150000 });
    setInputMinPrice(0);
    setInputMaxPrice(50000);
    setSelectedRating(null);
    setInStockOnly(false);
    setFreeDeliveryOnly(false);
    setDiscountedOnly(false);
    setNewArrivalsOnly(false);
    setSortOption('relevance');
    setCurrentPage(1);
  };

  const applyCustomPriceRange = () => {
    setPriceRange({ min: inputMinPrice, max: inputMaxPrice });
    setCurrentPage(1);
  };

  // Related searches pill data
  const relatedSearches = [
    { label: 'wireless headphones', query: 'wireless headphones' },
    { label: 'bluetooth headphones', query: 'bluetooth headphones' },
    { label: 'noise cancelling', query: 'noise cancelling' },
    { label: 'gaming headphones', query: 'gaming headphones' },
    { label: 'earbuds', query: 'earbuds' },
  ];

  // Dynamic filter lists
  const filteredBrands = availableBrands.filter(b => b.toLowerCase().includes(brandSearchInput.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans selection:bg-[#0875E1] selection:text-white">
      
      {/* HEADER */}
      <Header />

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow w-full px-4 sm:px-6 md:px-8 py-4 space-y-4">
        
        {/* BREADCRUMBS */}
        <nav className="flex items-center space-x-1.5 text-xs text-gray-500 font-semibold">
          <button onClick={() => navigate('/home')} className="hover:text-[#0875E1]">Home</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[#0875E1] font-extrabold">Search Results</span>
          {q && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-800 font-bold capitalize">"{q}"</span>
            </>
          )}
        </nav>

        {/* SEARCH TITLE & RELATED SEARCHES HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
              Search results for <span className="text-[#0875E1]">"{q}"</span>
            </h1>
            <p className="text-xs font-bold text-gray-500 mt-1">
              Showing 1 - {products.length} of {totalProductsCount || 482} results
            </p>
          </div>

          {/* Related Searches Pills (Matching Reference Image) */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-bold text-gray-400 shrink-0">Related Searches:</span>
            {relatedSearches.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
                className="px-3 py-1 bg-white hover:bg-blue-50 hover:text-[#0875E1] border border-gray-200 rounded-full text-xs font-bold text-gray-700 transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN SPLIT LAYOUT (SIDEBAR FILTER + PRODUCTS GRID) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-2">
          
          {/* LEFT FILTER SIDEBAR (COL 3 - MATCHING REFERENCE IMAGE 100%) */}
          <aside className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/80 p-4 space-y-5 shadow-2xs sticky top-36">
            
            {/* Sidebar Title */}
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
                <span>Clear All</span>
              </button>
            </div>

            {/* 1. CATEGORY FILTER */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#172033]">Category</h4>
              <div className="space-y-1 text-xs">
                {[
                  { name: 'Headphones', count: 482 },
                  { name: 'Earbuds', count: 312 },
                  { name: 'Gaming Headsets', count: 96 },
                  { name: 'Accessories', count: 74 },
                  { name: 'Speakers', count: 60 }
                ].map((cat) => (
                  <label key={cat.name} className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer hover:text-[#0875E1]">
                    <input
                      type="checkbox"
                      checked={selectedCategoryFilter === cat.name}
                      onChange={() => setSelectedCategoryFilter(selectedCategoryFilter === cat.name ? null : cat.name)}
                      className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300 cursor-pointer"
                    />
                    <span className="flex-grow">{cat.name}</span>
                    <span className="text-[11px] text-gray-400 font-medium">({cat.count})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. BRAND FILTER WITH SEARCH INPUT */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <h4 className="text-xs font-extrabold text-[#172033]">Brand</h4>
              
              {/* Brand Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search brand..."
                  value={brandSearchInput}
                  onChange={(e) => setBrandSearchInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0875E1] pr-7"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
                {(filteredBrands.length > 0 ? filteredBrands : ['Sony', 'JBL', 'boAt', 'Apple', 'Bose', 'Sennheiser', 'Logitech']).map((brandName) => (
                  <label key={brandName} className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer hover:text-[#0875E1]">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brandName)}
                      onChange={() => handleBrandChange(brandName)}
                      className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300 cursor-pointer"
                    />
                    <span className="flex-grow">{brandName}</span>
                  </label>
                ))}
                <button className="text-[11px] font-bold text-[#0875E1] hover:underline pt-1 block">
                  Show More ⌄
                </button>
              </div>
            </div>

            {/* 3. PRICE RANGE INPUTS & SLIDER */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <h4 className="text-xs font-extrabold text-[#172033]">Price Range</h4>
              
              {/* Range Inputs + Apply Button matching Reference Image */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-2 py-1 flex-1">
                  <span className="text-gray-400 font-bold mr-1">₹</span>
                  <input
                    type="number"
                    value={inputMinPrice}
                    onChange={(e) => setInputMinPrice(Number(e.target.value))}
                    className="w-full bg-transparent focus:outline-none font-bold text-[#172033]"
                  />
                </div>
                <span className="text-gray-400 font-bold">-</span>
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-2 py-1 flex-1">
                  <span className="text-gray-400 font-bold mr-1">₹</span>
                  <input
                    type="number"
                    value={inputMaxPrice}
                    onChange={(e) => setInputMaxPrice(Number(e.target.value))}
                    className="w-full bg-transparent focus:outline-none font-bold text-[#172033]"
                  />
                </div>
                <button
                  onClick={applyCustomPriceRange}
                  className="bg-[#0875E1] hover:bg-[#065BB5] text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 shadow-2xs cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="150000"
                step="500"
                value={priceRange.max}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setPriceRange({ ...priceRange, max: val });
                  setInputMaxPrice(val);
                }}
                className="w-full accent-[#0875E1] cursor-pointer h-1.5 bg-gray-200 rounded-lg mt-2"
              />
            </div>

            {/* 4. CUSTOMER RATING */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <h4 className="text-xs font-extrabold text-[#172033]">Customer Rating</h4>
              <div className="space-y-1 text-xs">
                {[4, 3, 2, 1].map((stars) => (
                  <label key={stars} className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer hover:text-[#0875E1]">
                    <input
                      type="checkbox"
                      checked={selectedRating === stars}
                      onChange={() => {
                        setSelectedRating(selectedRating === stars ? null : stars);
                        setCurrentPage(1);
                      }}
                      className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300 cursor-pointer"
                    />
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < stars ? 'text-amber-400' : 'text-gray-300'}>★</span>
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-600 font-bold ml-1">{stars} &amp; above</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 5. OTHER FILTERS */}
            <div className="space-y-1.5 border-t border-gray-100 pt-3 text-xs">
              <h4 className="text-xs font-extrabold text-[#172033]">Other Filters</h4>
              
              <label className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
                  className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300"
                />
                <span className="flex-grow">In Stock</span>
                <span className="text-[11px] text-gray-400">(398)</span>
              </label>

              <label className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={freeDeliveryOnly}
                  onChange={(e) => { setFreeDeliveryOnly(e.target.checked); setCurrentPage(1); }}
                  className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300"
                />
                <span className="flex-grow">Free Delivery</span>
                <span className="text-[11px] text-gray-400">(420)</span>
              </label>

              <label className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={newArrivalsOnly}
                  onChange={(e) => { setNewArrivalsOnly(e.target.checked); setCurrentPage(1); }}
                  className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300"
                />
                <span className="flex-grow">New Arrivals</span>
                <span className="text-[11px] text-gray-400">(120)</span>
              </label>

              <label className="flex items-center space-x-2 text-gray-700 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={discountedOnly}
                  onChange={(e) => { setDiscountedOnly(e.target.checked); setCurrentPage(1); }}
                  className="rounded text-[#0875E1] focus:ring-[#0875E1] w-3.5 h-3.5 border-gray-300"
                />
                <span className="flex-grow">Discounted</span>
                <span className="text-[11px] text-gray-400">(310)</span>
              </label>
            </div>

          </aside>

          {/* RIGHT MAIN PRODUCTS LISTING (COL 9) */}
          <section className="lg:col-span-9 space-y-4">
            
            {/* TOOLBAR (Matching Reference Image Toolbar) */}
            <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center space-x-3 text-xs font-bold text-[#172033]">
                <div className="flex items-center space-x-1.5 text-[#0875E1] cursor-pointer" onClick={resetAllFilters}>
                  <Sliders className="w-4 h-4" />
                  <span>Filters</span>
                </div>
                <button onClick={resetAllFilters} className="text-gray-400 hover:text-red-500 font-semibold text-[11px]">Clear All</button>
              </div>

              <div className="flex items-center space-x-3 text-xs font-bold">
                <span className="text-gray-500">Sort by</span>
                <select
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
                  className="bg-gray-50 border border-gray-200 text-[#172033] px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0875E1] cursor-pointer font-bold"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="discount">Highest Discount</option>
                </select>

                {/* Grid vs List View Icons */}
                <div className="flex items-center space-x-1 pl-2 border-l border-gray-200">
                  <button className="p-1.5 rounded-lg bg-[#0875E1] text-white shadow-2xs">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:text-[#172033]">
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Compact Pagination Nav in Toolbar */}
                <div className="flex items-center space-x-1 pl-2 border-l border-gray-200 text-gray-600">
                  <span className="text-[11px] font-bold text-gray-500">1 - {products.length} of {totalProductsCount || 482}</span>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
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
              <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-4 shadow-2xs">
                <div className="w-12 h-12 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-[#172033]">No products found matching "{q}"</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Try checking for spelling errors, clearing active filters, or searching for broader terms like "audio", "wireless", or "headphones".
                </p>
                <button 
                  onClick={resetAllFilters} 
                  className="bg-[#0875E1] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-[#065BB5] shadow-xs cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* BOTTOM PROMO BANNER (MATCHING REFERENCE IMAGE EXACTLY) */}
            <div className="bg-gradient-to-r from-[#EBF3FF] via-[#F0F6FF] to-[#E6F0FF] border border-[#0875E1]/20 rounded-2xl p-4 sm:p-6 shadow-2xs mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Left Details */}
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-[#0875E1] text-white rounded-2xl shrink-0 shadow-md">
                  <Truck className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-[#0875E1] tracking-wider bg-white/80 px-2 py-0.5 rounded-md border border-[#0875E1]/20">
                    Up to 50% OFF
                  </span>
                  <h3 className="text-lg font-black text-[#172033] tracking-tight leading-snug">
                    on Headphones &amp; Audio
                  </h3>
                  <p className="text-xs text-gray-600 font-semibold">
                    Immerse yourself in a better sound experience.
                  </p>
                </div>
              </div>

              {/* Right Feature Highlights */}
              <div className="flex items-center space-x-6 text-xs font-bold text-gray-700 shrink-0">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-[#0875E1]" />
                  <div>
                    <p className="text-[#172033] font-extrabold">Top Brands</p>
                    <p className="text-[10px] text-gray-500">Sony, JBL, boAt &amp; more</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-[#0875E1]" />
                  <div>
                    <p className="text-[#172033] font-extrabold">Easy Returns</p>
                    <p className="text-[10px] text-gray-500">Hassle-free 7-day returns</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#0875E1]" />
                  <div>
                    <p className="text-[#172033] font-extrabold">Secure Payments</p>
                    <p className="text-[10px] text-gray-500">100% safe transactions</p>
                  </div>
                </div>
              </div>

            </div>

            {/* FULL PAGINATION BAR */}
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
