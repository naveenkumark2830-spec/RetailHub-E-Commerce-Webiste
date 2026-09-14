import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Zap, ChevronLeft, ChevronRight, Clock
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { TrustBar } from '../components/TrustBar';
import { ProductCard } from '../components/ProductCard';
import { NexDayPlusBanner } from '../components/NexDayPlusBanner';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { createGuestSession, isLoading, session, customer } = useSessionStore();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  useEffect(() => {
    if (customer || (session && session.user_type === 'registered')) {
      navigate('/home');
    }
  }, [customer, session, navigate]);

  // Default demonstration products matching reference image
  useEffect(() => {
    setFeaturedProducts([
      { product_id: 'PROD-CAT001-001', name: 'Apple iPhone 15 (128GB)', brand: 'APPLE', category_id: 'CAT001', price: 79900, sale_price: 61999, discount: 38, rating: 4.6, review_count: 12400 },
      { product_id: 'PROD-CAT001-002', name: 'boAt Airdopes 141 Bluetooth Earbuds', brand: 'BOAT', category_id: 'CAT001', price: 2499, sale_price: 1399, discount: 42, rating: 4.4, review_count: 8200 },
      { product_id: 'PROD-CAT002-001', name: "Nike Men's Running Shoes Air Zoom", brand: 'NIKE', category_id: 'CAT002', price: 4999, sale_price: 2499, discount: 50, rating: 4.5, review_count: 6100 },
      { product_id: 'PROD-CAT001-003', name: 'boAt Wave Call 2 Smartwatch', brand: 'BOAT', category_id: 'CAT001', price: 2999, sale_price: 1999, discount: 33, rating: 4.3, review_count: 9300 },
      { product_id: 'PROD-CAT003-001', name: 'Philips Air Fryer (4.1L)', brand: 'PHILIPS', category_id: 'CAT003', price: 8999, sale_price: 6499, discount: 28, rating: 4.4, review_count: 4100 },
    ]);
  }, []);

  const handleContinueAsGuest = async () => {
    await createGuestSession();
    navigate('/home');
  };

  const categories = [
    { name: 'Electronics', slug: 'electronics', icon: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&auto=format&fit=crop&q=80' },
    { name: 'Fashion', slug: 'fashion', icon: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80' },
    { name: 'Home & Living', slug: 'home-living', icon: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&auto=format&fit=crop&q=80' },
    { name: 'Groceries', slug: 'groceries', icon: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&auto=format&fit=crop&q=80' },
    { name: 'Beauty', slug: 'beauty', icon: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&auto=format&fit=crop&q=80' },
    { name: 'Sports', slug: 'sports-fitness', icon: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200&auto=format&fit=crop&q=80' },
    { name: 'Books', slug: 'books', icon: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80' },
    { name: 'Toys & Games', slug: 'toys-games', icon: 'https://images.unsplash.com/photo-1558060370-d644479be6e7?w=200&auto=format&fit=crop&q=80' },
    { name: 'Automotive', slug: 'automotive', icon: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=200&auto=format&fit=crop&q=80' },
    { name: 'Offers', slug: 'offers', isOffer: true, icon: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&auto=format&fit=crop&q=80' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans selection:bg-[#0875E1] selection:text-white">
      
      {/* HEADER */}
      <Header />

      {/* MAIN CONTENT CONTAINER (100% FULL BLEED VIEWPORT WIDTH) */}
      <main className="flex-grow w-full px-4 sm:px-8 md:px-10 py-6 space-y-6">
        
        {/* HERO BANNER SECTION (LESSER HEIGHT WITH HIGH RES DISPLAY & INTERACTIVE BUTTON) */}
        <div className="relative bg-[#FAF5EE] rounded-3xl border border-amber-900/10 shadow-sm overflow-hidden h-[190px] sm:h-[220px] flex items-center">
          
          {/* Navigation Arrows */}
          <button className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-all cursor-pointer hover:scale-110">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-all cursor-pointer hover:scale-110">
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Banner Grid Layout */}
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
                  onClick={handleContinueAsGuest}
                  disabled={isLoading}
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

        {/* TOP CATEGORIES SECTION (CIRCULAR CARDS IDENTICAL TO REFERENCE) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-[#172033] tracking-tight">Top Categories</h2>
            <button onClick={() => navigate('/home')} className="text-xs font-bold text-[#0875E1] hover:underline">View All &rarr;</button>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3">
            {categories.map((cat) => (
              <motion.div
                key={cat.slug}
                whileHover={{ y: -4, scale: 1.05 }}
                onClick={() => navigate(`/category/${cat.slug}`)}
                className="flex flex-col items-center space-y-2 cursor-pointer group select-none"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-[#EBF5FF] shadow-xs border transition-all flex items-center justify-center overflow-hidden ${cat.isOffer ? 'border-red-400 bg-red-50' : 'border-blue-100 group-hover:border-[#0875E1]'}`}>
                  {cat.isOffer ? (
                    <div className="w-full h-full rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xl shadow-inner">
                      %
                    </div>
                  ) : (
                    <img 
                      src={cat.icon} 
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
                <span className={`text-[11px] text-center font-bold line-clamp-1 ${cat.isOffer ? 'text-red-600 font-extrabold' : 'text-gray-700 group-hover:text-[#0875E1]'}`}>
                  {cat.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SERVICE / TRUST BAR */}
        <TrustBar />

        {/* DEALS OF THE DAY SECTION (MATCHING REFERENCE IMAGE 3 EXACTLY) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#172033] tracking-tight">Deals of the Day</h2>
              <div className="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-gray-500 pl-4 border-l border-gray-200">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Ends in:</span>
                <span className="bg-[#0B2A55] text-white px-1.5 py-0.5 rounded text-[11px] font-mono">06</span>
                <span>:</span>
                <span className="bg-[#0B2A55] text-white px-1.5 py-0.5 rounded text-[11px] font-mono">14</span>
                <span>:</span>
                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[11px] font-mono">18</span>
              </div>
            </div>
            <button onClick={handleContinueAsGuest} className="text-xs font-bold text-[#0875E1] hover:underline">
              View All Deals &rarr;
            </button>
          </div>

          {/* 3-COLUMN DEALS CONTAINER (LEFT SOFT BLUE PROMO | 5 PRODUCTS IN 1 ROW | RIGHT SOFT BEIGE PROMO) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            
            {/* Left Audio Sale Banner (Soft Light Blue Background matching Reference Image 3) */}
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
                onClick={handleContinueAsGuest}
                className="w-fit bg-[#0875E1] hover:bg-[#065eb8] text-white py-1.5 px-4 rounded-full text-xs font-extrabold shadow-md transition-colors z-10"
              >
                Shop Now &rarr;
              </button>
            </div>

            {/* Middle 5 Products Row */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 items-stretch">
              {featuredProducts.slice(0, 5).map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>

            {/* Right Home Essentials Promo Banner (Soft Warm Beige Background matching Reference Image 3) */}
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
                onClick={handleContinueAsGuest}
                className="w-fit bg-[#0875E1] hover:bg-[#065eb8] text-white py-1.5 px-4 rounded-full text-xs font-extrabold shadow-md transition-colors z-10"
              >
                Shop Now &rarr;
              </button>
            </div>

          </div>
        </div>

        {/* NEXDAY PLUS MEMBERSHIP BANNER */}
        <NexDayPlusBanner />

      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};

