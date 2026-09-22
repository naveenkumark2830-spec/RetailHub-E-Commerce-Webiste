import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, ArrowRight, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import { TrustBar } from '../components/TrustBar';
import { NexDayPlusBanner } from '../components/NexDayPlusBanner';
import { getCategoryIconImage } from '../utils/productImageMap';
import { CANONICAL_CATEGORIES, fetchCategoryList, CategoryItem } from '../utils/categoryData';

interface Product {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category_id: string;
  description?: string;
  price: number;
  discount: number;
  sale_price: number;
  rating: number;
  review_count: number;
  stock?: number;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSessionStore();
  const { fetchCart } = useCartStore();

  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [categoryList, setCategoryList] = useState<CategoryItem[]>(CANONICAL_CATEGORIES);

  // Category Slider Scroll Control
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkCategoryScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    fetchCategoryList().then(list => {
      if (list && list.length > 0) setCategoryList(list);
    });
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    window.addEventListener('resize', checkCategoryScroll);
    return () => window.removeEventListener('resize', checkCategoryScroll);
  }, [categoryList]);

  const slideCategoriesLeft = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const slideCategoriesRight = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // 3D Hero Showcase Banner Slides
  const heroSlides = [
    {
      id: 'laptops',
      tag: 'WORK | CREATE | GAME',
      titleLine1: 'Power Your',
      titleLine2: 'Next Big Idea',
      subtext: 'Latest Laptops | Top Brands | Best Prices',
      buttonText: 'Shop Laptops',
      categorySlug: 'electronics',
      image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1000&auto=format&fit=crop&q=80',
      badge1: '✨ M3 Max Power',
      badge2: '🚀 Guaranteed Next-Day',
      dealTitle: 'Up to 40% OFF',
      dealSubtext: 'On Laptops & Accessories',
      brands: ['APPLE', 'DELL', 'HP', 'ASUS']
    },
    {
      id: 'audio',
      tag: 'SOUND | SPATIAL | IMMERSIVE',
      titleLine1: 'Elevate Your',
      titleLine2: 'Audio Experience',
      subtext: 'Premium Wireless Headphones | Active Noise Cancellation',
      buttonText: 'Shop Audio',
      categorySlug: 'electronics',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&auto=format&fit=crop&q=80',
      badge1: '🎧 Spatial Audio 3D',
      badge2: '🔋 40-Hour Battery',
      dealTitle: 'Flat 50% OFF',
      dealSubtext: 'On Top Audio Gear',
      brands: ['SONY', 'BOSE', 'BOAT', 'JBL']
    },
    {
      id: 'wearables',
      tag: 'FITNESS | STYLE | CONNECTED',
      titleLine1: 'Track Every',
      titleLine2: 'Second in Style',
      subtext: 'Next-Gen Smartwatches & Wearable Tech',
      buttonText: 'Shop Watches',
      categorySlug: 'electronics',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80',
      badge1: '⌚ AMOLED Retina',
      badge2: '❤️ Heart & SpO2 Sync',
      dealTitle: 'Up to 35% OFF',
      dealSubtext: 'On Fitness Wearables',
      brands: ['APPLE', 'SAMSUNG', 'NOISE', 'BOAT']
    }
  ];

  // Auto rotation for 3D Hero Carousel (4 seconds)
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(slideTimer);
  }, [heroSlides.length]);

  // Flash Deal countdown timer state (HH MM SS)
  const [timeLeft, setTimeLeft] = useState({ hours: 6, minutes: 14, seconds: 23 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data
  useEffect(() => {
    const initSession = async () => {
      if (!session) {
        await useSessionStore.getState().createGuestSession();
      }
    };
    initSession();

    fetch('/api/products/flash-deals').then(r => r.json()).then(d => d.success && setFlashDeals(d.products)).catch(() => {});
  }, []);

  // Fetch cart
  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session]);

  // Fetch main products catalog dynamically
  useEffect(() => {
    fetch('/api/products?limit=24')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.products) {
          setAllProducts(d.products);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans">
      
      {/* HEADER */}
      <Header />

      {/* MAIN BODY (100% FULL BLEED VIEWPORT WIDTH) */}
      <main className="flex-grow w-full px-4 sm:px-8 md:px-10 py-6 space-y-6">
        
        {/* 1. 3D HERO SHOWCASE BANNER SECTION */}
        {(() => {
          const currentSlide = heroSlides[activeSlideIndex];
          return (
            <div className="relative bg-gradient-to-r from-[#FAF5EE] via-[#F4F8FE] to-[#FAF5EE] rounded-3xl border border-amber-900/10 shadow-md overflow-hidden min-h-[200px] sm:min-h-[225px] flex items-center group">
              
              {/* Navigation Arrows */}
              <button 
                onClick={() => setActiveSlideIndex((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-[#0B2A55] hover:bg-white hover:scale-110 transition-all cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button 
                onClick={() => setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-[#0B2A55] hover:bg-white hover:scale-110 transition-all cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="w-full grid grid-cols-1 md:grid-cols-12 items-center px-6 sm:px-10 py-2.5 gap-2 sm:gap-4 h-full">
                
                {/* Left Column: Headline, Action & Micro Badges (Equal Height) */}
                <div className="md:col-span-4 h-full flex flex-col justify-center space-y-2 text-left z-10">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0875E1]">
                    {currentSlide.tag}
                  </p>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#172033] tracking-tight leading-tight">
                    {currentSlide.titleLine1} <br />
                    <span className="text-[#0071DC]">{currentSlide.titleLine2}</span>
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-gray-600 line-clamp-1">
                    {currentSlide.subtext}
                  </p>

                  {/* Action Button & Micro Feature Badges */}
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => navigate(`/category/${currentSlide.categorySlug}`)}
                      className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-4 py-1.5 rounded-full font-extrabold text-xs shadow-md flex items-center space-x-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                    >
                      <span>{currentSlide.buttonText}</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <span className="bg-blue-50 text-[#0071DC] border border-blue-200/80 px-2 py-0.5 rounded-full text-[9px] font-bold">
                      ⚡ Next-Day
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full text-[9px] font-bold hidden xl:inline">
                      🛡️ 1-Yr Warranty
                    </span>
                  </div>
                </div>

                {/* Center Column: 3D Product Showcase (Fills Empty Gap & Equal Height) */}
                <div className="md:col-span-5 h-full flex flex-col items-center justify-center relative z-10 py-1">
                  
                  {/* Glowing Ambient Backdrop Aura */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/15 via-[#FFC20A]/20 to-amber-400/15 rounded-full blur-xl opacity-75 -z-10 animate-pulse"></div>

                  <div className="relative flex items-center justify-center w-full max-w-[320px] h-[145px] sm:h-[160px]">
                    
                    {/* Primary 3D Product Photo */}
                    <motion.img
                      key={currentSlide.id}
                      initial={{ opacity: 0, scale: 0.95, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      src={currentSlide.image}
                      alt={currentSlide.titleLine2}
                      className="max-h-[145px] sm:max-h-[160px] max-w-full w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.25)] rounded-2xl group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Floating Feature Badge 1 (Top Right) */}
                    <motion.div
                      animate={{ y: [2, -2, 2] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-0 -right-1 bg-[#0B2A55] text-white rounded-full px-2.5 py-0.5 shadow-md border border-blue-400/30 text-[9px] font-extrabold flex items-center space-x-1 z-20"
                    >
                      <span>{currentSlide.badge1}</span>
                    </motion.div>

                    {/* Floating Feature Badge 2 (Top Left) */}
                    <motion.div
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-0 -left-1 bg-[#FFC20A] text-[#0B2A55] rounded-full px-2.5 py-0.5 shadow-md text-[9px] font-black z-20"
                    >
                      <span>{currentSlide.badge2}</span>
                    </motion.div>

                    {/* Neatly Aligned NexDay Brand Logo Pill (Bottom Center) */}
                    <motion.div
                      animate={{ y: [1.5, -1.5, 1.5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      onClick={() => navigate('/home')}
                      className="absolute -bottom-1 bg-white/95 backdrop-blur-md border border-amber-300/80 rounded-full px-3 py-0.5 shadow-md flex items-center space-x-1.5 z-20 cursor-pointer hover:scale-105 transition-transform"
                    >
                      <img 
                        src="/nexday-logo.png" 
                        alt="NexDay™" 
                        className="h-3.5 max-h-[14px] w-auto object-contain" 
                      />
                      <span className="text-[9px] font-black text-[#0B2A55] tracking-wider uppercase">Express</span>
                    </motion.div>

                  </div>
                </div>

                {/* Right Column: Deal of the Week Promo Card (Equal Height) */}
                <div className="md:col-span-3 h-full flex flex-col justify-center space-y-1 text-left border-l border-amber-900/10 pl-4 z-10 hidden md:flex">
                  <span className="bg-[#0B2A55] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider w-fit">
                    Deal of the Week
                  </span>
                  <div className="space-y-0.5 pt-0.5">
                    <p className="text-[10px] font-extrabold text-gray-700">Up to</p>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0B2A55] leading-none">{currentSlide.dealTitle}</h2>
                    <p className="text-[10px] font-bold text-gray-700 line-clamp-1">{currentSlide.dealSubtext}</p>
                  </div>

                  <div className="pt-0.5 text-[8px] sm:text-[9px] font-black tracking-widest text-gray-500 uppercase flex items-center space-x-1">
                    {currentSlide.brands.map((b, i) => (
                      <React.Fragment key={b}>
                        <span>{b}</span>
                        {i < currentSlide.brands.length - 1 && <span>&bull;</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Script Cursive Text with Yellow Underline Swoosh */}
                  <div className="relative inline-block pt-0.5">
                    <p className="font-serif italic text-base sm:text-lg font-black text-[#172033]">
                      Better Everyday.
                    </p>
                    <div className="w-full h-1 bg-[#FFC20A] rounded-full -rotate-2 mt-0.5"></div>
                  </div>
                </div>

              </div>

              {/* Dots Pagination Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 z-30">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === activeSlideIndex ? 'w-5 bg-[#0875E1]' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

            </div>
          );
        })()}

        {/* 2. CATEGORY ICONS SECTION (HORIZONTAL SLIDER WITH DESKTOP ARROW NAVIGATION) */}
        <div className="space-y-3 pt-2 relative">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#172033] tracking-tight">Top Categories</h2>
            <button onClick={() => navigate('/category/electronics')} className="text-xs font-bold text-[#0875E1] hover:underline">View All &rarr;</button>
          </div>

          <div className="relative group/slider">
            {/* Desktop Left Arrow Button */}
            {canScrollLeft && (
              <button 
                onClick={slideCategoriesLeft}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200/80 flex items-center justify-center text-[#0B2A55] hover:bg-gray-50 hover:scale-110 transition-all cursor-pointer hidden md:flex"
                aria-label="Scroll Left Categories"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            {/* Desktop Right Arrow Button */}
            {canScrollRight && (
              <button 
                onClick={slideCategoriesRight}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200/80 flex items-center justify-center text-[#0B2A55] hover:bg-gray-50 hover:scale-110 transition-all cursor-pointer hidden md:flex"
                aria-label="Scroll Right Categories"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            {/* Horizontal Scroll Track */}
            <div 
              ref={categoryScrollRef}
              onScroll={checkCategoryScroll}
              tabIndex={0}
              className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar py-2 px-1 focus:outline-none focus:ring-1 focus:ring-[#0875E1]/30 rounded-2xl"
            >
              {categoryList.map((cat) => {
                const iconImg = getCategoryIconImage(cat.slug);
                return (
                  <motion.div
                    key={cat.slug}
                    whileHover={{ y: -4, scale: 1.05 }}
                    onClick={() => navigate(`/category/${cat.slug}`)}
                    className="flex flex-col items-center space-y-2 cursor-pointer group/cat select-none shrink-0 snap-start"
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-white shadow-md border-2 transition-all flex items-center justify-center overflow-hidden ${cat.isOffer ? 'border-red-500' : 'border-blue-100 group-hover/cat:border-[#FFC20A]'}`}>
                      <img 
                        src={iconImg} 
                        alt={cat.name}
                        className="w-full h-full object-cover rounded-full group-hover/cat:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <span className={`text-[11px] text-center font-bold line-clamp-1 w-20 sm:w-24 px-0.5 ${cat.isOffer ? 'text-red-600 font-extrabold' : 'text-gray-700 group-hover/cat:text-[#D99B00]'}`}>
                      {cat.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. SERVICE / TRUST BAR */}
        <TrustBar />

        {/* 4. FLASH DEALS SECTION WITH COUNTDOWN TIMER & LEFT/RIGHT PROMOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          
          {/* LEFT AUDIO PROMO BANNER (Soft Light Blue Background matching Reference Image 3) */}
          <div className="lg:col-span-3 bg-[#D2E8FF] rounded-2xl p-4 sm:p-5 text-[#0B2A55] flex flex-col justify-between shadow-xs border border-blue-200/60 relative overflow-hidden group">
            <div className="space-y-1 z-10">
              <h3 className="text-lg font-black text-[#0B2A55] leading-tight">Feel the Beat Everyday</h3>
              <div className="w-12 h-1 bg-[#0875E1]/40 rounded-full my-1"></div>
              <p className="text-xs font-extrabold text-[#0B2A55]/80">Up to 60% OFF On Headphones & Audio</p>
            </div>

            <div className="my-auto py-2 flex items-center justify-center z-10 relative">
              <img 
                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80" 
                alt="Woman Headphones Lifestyle"
                className="w-full h-36 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <button
              onClick={() => navigate('/category/electronics')}
              className="w-fit bg-[#0875E1] hover:bg-[#065eb8] text-white py-1.5 px-4 rounded-full text-xs font-extrabold shadow-md transition-colors z-10"
            >
              Shop Now &rarr;
            </button>
          </div>

          {/* CENTER FLASH DEALS GRID (COL 6) */}
          <div className="lg:col-span-6 space-y-2.5 flex flex-col justify-between">
            
            {/* Header with Flash Deals timer */}
            <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h2 className="text-sm sm:text-base font-extrabold text-[#172033]">Deals of the Day</h2>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center space-x-1 text-[11px] font-bold text-gray-600">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Ends in:</span>
                <span className="bg-[#0B2A55] text-white px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-[#0B2A55] text-white px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Flash Deals Cards Grid (5 Products in 1 row) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 items-stretch flex-1">
              {(flashDeals.length > 0 ? flashDeals.slice(0, 5) : allProducts.slice(0, 5)).map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>

          </div>

          {/* RIGHT PROMO BANNER (Soft Warm Beige Background matching Reference Image 3) */}
          <div className="lg:col-span-3 bg-[#F5EFE6] rounded-2xl p-4 sm:p-5 text-[#172033] flex flex-col justify-between shadow-xs border border-amber-200/60 relative overflow-hidden group">
            <div className="space-y-1 z-10">
              <h3 className="text-lg font-black text-[#172033] leading-tight">Make Home Happier</h3>
              <p className="text-xs font-extrabold text-gray-600">Top Home & Kitchen Essentials</p>
            </div>

            <div className="my-auto py-2 flex items-center justify-center z-10 relative">
              <img 
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80" 
                alt="Living Room Sofa Lifestyle"
                className="w-full h-36 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <button
              onClick={() => navigate('/category/home-living')}
              className="w-fit bg-[#0875E1] hover:bg-[#065eb8] text-white py-1.5 px-4 rounded-full text-xs font-extrabold shadow-md transition-colors z-10"
            >
              Shop Now &rarr;
            </button>
          </div>

        </div>

        {/* 5. RECOMMENDED / ALL PRODUCTS GRID */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-black text-[#172033] tracking-tight">
              Recommended For You
            </h2>
            <span className="text-xs font-semibold text-gray-500">
              Showing {allProducts.length} items
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {allProducts.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </div>

        {/* 6. NEXDAY PLUS MEMBERSHIP BANNER */}
        <NexDayPlusBanner />

      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};
