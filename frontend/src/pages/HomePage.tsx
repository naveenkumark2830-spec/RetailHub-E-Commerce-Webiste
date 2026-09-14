import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, ArrowRight, Clock
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import { TrustBar } from '../components/TrustBar';
import { NexDayPlusBanner } from '../components/NexDayPlusBanner';
import { getCategoryIconImage } from '../utils/productImageMap';

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

  const defaultCategoryList = [
    { name: 'Electronics', slug: 'electronics', catId: 'CAT001' },
    { name: 'Fashion', slug: 'fashion', catId: 'CAT002' },
    { name: 'Home & Living', slug: 'home-living', catId: 'CAT003' },
    { name: 'Groceries', slug: 'groceries', catId: 'CAT004' },
    { name: 'Beauty', slug: 'beauty', catId: 'CAT005' },
    { name: 'Sports', slug: 'sports-fitness', catId: 'CAT006' },
    { name: 'Books', slug: 'books', catId: 'CAT007' },
    { name: 'Toys & Games', slug: 'toys-games', catId: 'CAT008' },
    { name: 'Automotive', slug: 'automotive', catId: 'CAT009' },
    { name: 'Offers', slug: 'offers', catId: 'CAT010', isOffer: true },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans">
      
      {/* HEADER */}
      <Header />

      {/* MAIN BODY (100% FULL BLEED VIEWPORT WIDTH) */}
      <main className="flex-grow w-full px-4 sm:px-8 md:px-10 py-6 space-y-6">
        
        {/* 1. HERO BANNER SECTION (LESSER HEIGHT WITH HIGH RES DISPLAY & INTERACTIVE BUTTON) */}
        <div className="relative bg-[#FAF5EE] rounded-3xl border border-amber-900/10 shadow-sm overflow-hidden h-[190px] sm:h-[220px] flex items-center">
          
          <div className="w-full grid grid-cols-1 md:grid-cols-12 items-center px-6 sm:px-12 gap-4">
            
            {/* Left Column: Text Content */}
            <div className="md:col-span-5 space-y-2 text-left z-10">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                WORK &nbsp;|&nbsp; CREATE &nbsp;|&nbsp; GAME
              </p>
              <h1 className="text-2xl sm:text-4xl font-black text-[#172033] tracking-tight leading-tight">
                Power Your <br />
                Next Big Idea
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-gray-600">
                Latest Laptops | Top Brands | Best Prices
              </p>

              <div className="pt-1 flex items-center space-x-3">
                <button
                  onClick={() => navigate('/category/electronics')}
                  className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-5 py-2 rounded-full font-extrabold text-xs shadow-md flex items-center space-x-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-20"
                >
                  <span>Shop Laptops</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Center Column: High-Res Laptop Image */}
            <div className="md:col-span-4 flex items-center justify-center relative z-10">
              <img
                src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1000&auto=format&fit=crop&q=80"
                alt="NexDay Laptop Promo"
                className="w-full max-w-[320px] max-h-[170px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Right Column: Deal of the Week Promo Card */}
            <div className="md:col-span-3 space-y-1.5 text-left border-l border-amber-900/10 pl-5 z-10 hidden md:block">
              <span className="bg-[#0B2A55] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                Deal of the Week
              </span>
              <div className="space-y-0.5 pt-0.5">
                <p className="text-[11px] font-extrabold text-gray-700">Up to</p>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0B2A55] leading-none">40% OFF</h2>
                <p className="text-[11px] font-bold text-gray-700">On Laptops & Accessories</p>
              </div>

              <div className="pt-1 text-[9px] font-black tracking-widest text-gray-500 uppercase flex items-center space-x-1.5">
                <span>DELL</span>
                <span>&bull;</span>
                <span>HP</span>
                <span>&bull;</span>
                <span>ASUS</span>
                <span>&bull;</span>
                <span>LENOVO</span>
              </div>

              {/* Script Cursive Text with Yellow Underline Swoosh */}
              <div className="relative inline-block pt-1">
                <p className="font-serif italic text-xl font-black text-[#172033]">
                  Better Everyday.
                </p>
                <div className="w-full h-1 bg-[#FFC20A] rounded-full -rotate-2 mt-0.5"></div>
              </div>
            </div>

          </div>
        </div>

        {/* 2. CATEGORY ICONS SECTION */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#172033] tracking-tight">Top Categories</h2>
            <button onClick={() => navigate('/category/electronics')} className="text-xs font-bold text-[#0875E1] hover:underline">View All &rarr;</button>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3">
            {defaultCategoryList.map((cat) => {
              const iconImg = getCategoryIconImage(cat.slug);
              return (
                <motion.div
                  key={cat.slug}
                  whileHover={{ y: -4, scale: 1.05 }}
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  className="flex flex-col items-center space-y-2 cursor-pointer group select-none"
                >
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-white shadow-md border-2 transition-all flex items-center justify-center overflow-hidden ${cat.isOffer ? 'border-red-500' : 'border-blue-100 group-hover:border-[#0875E1]'}`}>
                    <img 
                      src={iconImg} 
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span className={`text-[11px] text-center font-bold line-clamp-1 ${cat.isOffer ? 'text-red-600 font-extrabold' : 'text-gray-700 group-hover:text-[#0875E1]'}`}>
                    {cat.name}
                  </span>
                </motion.div>
              );
            })}
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
