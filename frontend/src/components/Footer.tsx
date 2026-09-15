import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#0B2A55] text-white pt-10 pb-8 border-t border-blue-900/60 font-sans text-xs w-full">
      <div className="w-full px-4 sm:px-8 md:px-12 space-y-8">
        


        {/* FOOTER BRAND HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-blue-900/50">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/home')}>
            <img 
              src="/nexday-logo.png" 
              alt="NexDay™ - Brand New Day. Brand New Products." 
              className="h-11 w-auto object-contain bg-white rounded-xl px-2.5 py-1 shadow-sm hover:scale-105 transition-transform duration-200" 
            />
          </div>
          <p className="text-xs text-blue-200 font-medium max-w-md">
            India's premier online retail store delivering authentic products, lightning fast shipping, and unmatched customer support.
          </p>
        </div>

        {/* FOOTER LINKS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 text-blue-100 pt-2">
          
          <div className="space-y-3">
            <p className="text-white font-black text-xs uppercase tracking-wider">Shop Categories</p>
            <ul className="space-y-2 font-semibold">
              <li><button onClick={() => navigate('/category/electronics')} className="hover:text-[#FFC20A] transition-colors">Electronics</button></li>
              <li><button onClick={() => navigate('/category/fashion')} className="hover:text-[#FFC20A] transition-colors">Fashion & Apparel</button></li>
              <li><button onClick={() => navigate('/category/home-living')} className="hover:text-[#FFC20A] transition-colors">Home & Living</button></li>
              <li><button onClick={() => navigate('/category/groceries')} className="hover:text-[#FFC20A] transition-colors">Groceries</button></li>
              <li><button onClick={() => navigate('/category/beauty')} className="hover:text-[#FFC20A] transition-colors">Beauty & Personal Care</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-white font-black text-xs uppercase tracking-wider">More Categories</p>
            <ul className="space-y-2 font-semibold">
              <li><button onClick={() => navigate('/category/sports-fitness')} className="hover:text-[#FFC20A] transition-colors">Sports & Fitness</button></li>
              <li><button onClick={() => navigate('/category/books')} className="hover:text-[#FFC20A] transition-colors">Books & Media</button></li>
              <li><button onClick={() => navigate('/category/toys-games')} className="hover:text-[#FFC20A] transition-colors">Toys & Games</button></li>
              <li><button onClick={() => navigate('/category/automotive')} className="hover:text-[#FFC20A] transition-colors">Automotive Gear</button></li>
              <li><button onClick={() => navigate('/category/offers')} className="text-[#FFC20A] font-bold hover:underline">Daily Flash Offers</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-white font-black text-xs uppercase tracking-wider">Customer Support</p>
            <ul className="space-y-2 font-semibold">
              <li><button onClick={() => navigate('/help')} className="hover:text-[#FFC20A] transition-colors">Help Center & FAQ</button></li>
              <li><button onClick={() => navigate('/orders')} className="hover:text-[#FFC20A] transition-colors">Track Your Order</button></li>
              <li><button onClick={() => navigate('/profile/addresses')} className="hover:text-[#FFC20A] transition-colors">Shipping Info</button></li>
              <li><button onClick={() => navigate('/help')} className="hover:text-[#FFC20A] transition-colors">Returns & Refunds</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-white font-black text-xs uppercase tracking-wider">My Account</p>
            <ul className="space-y-2 font-semibold">
              <li><button onClick={() => navigate('/login')} className="hover:text-[#FFC20A] transition-colors">Sign In</button></li>
              <li><button onClick={() => navigate('/cart')} className="hover:text-[#FFC20A] transition-colors">View Cart</button></li>
              <li><button onClick={() => navigate('/wishlist')} className="hover:text-[#FFC20A] transition-colors">My Wishlist</button></li>
              <li><button onClick={() => navigate('/orders')} className="hover:text-[#FFC20A] transition-colors">Order History</button></li>
            </ul>
          </div>

          <div className="col-span-1 sm:col-span-2 md:col-span-1 space-y-3">
            <p className="text-white font-black text-xs uppercase tracking-wider">NexDay Plus</p>
            <p className="text-[11px] text-blue-100 leading-relaxed font-semibold">
              Join NexDay Plus for exclusive member benefits, free express delivery on all orders & early access to sale events.
            </p>
            <button 
              onClick={() => navigate('/category/offers')}
              className="bg-[#FFC20A] hover:bg-[#E5AD00] text-[#0B2A55] px-4 py-2 rounded-lg font-black text-xs transition-colors shadow-md w-full"
            >
              Explore Plus Benefits
            </button>
          </div>

        </div>

        {/* COPYRIGHT & BOTTOM CREDS */}
        <div className="pt-6 border-t border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-semibold">
          <p className="text-[#FFC20A] font-bold">&copy; {new Date().getFullYear()} NexDay™ Retail. Brand New Day. Brand New Products.</p>
          <div className="flex items-center space-x-4 text-blue-200">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); navigate('/help'); }} className="hover:text-[#FFC20A] transition-colors">Privacy Policy</a>
            <span>&bull;</span>
            <a href="#terms" onClick={(e) => { e.preventDefault(); navigate('/help'); }} className="hover:text-[#FFC20A] transition-colors">Terms of Use</a>
            <span>&bull;</span>
            <a href="#security" onClick={(e) => { e.preventDefault(); navigate('/help'); }} className="hover:text-[#FFC20A] transition-colors">Security</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
