import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, User, Heart, ShoppingCart, MapPin, 
  ChevronDown, Package, LogOut, Menu, X, Star
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { useProfilePhoto } from '../hooks/useProfilePhoto';
import { CANONICAL_CATEGORIES, fetchCategoryList, CategoryItem } from '../utils/categoryData';

interface HeaderProps {
  onSearchSubmit?: (query: string) => void;
  activeCategorySlug?: string;
}

export const Header: React.FC<HeaderProps> = ({ onSearchSubmit, activeCategorySlug }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, isAuthenticated, logout } = useSessionStore();
  const { getCartTotalCount } = useCartStore();
  const { profilePhoto } = useProfilePhoto();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Sync delivery location dynamically
  const [deliveryLocation, setDeliveryLocation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('delivery_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.city && parsed.pincode) return `${parsed.city} ${parsed.pincode}`;
      }
    } catch (e) {}
    return 'Chennai 600001';
  });

  useEffect(() => {
    const updateLocation = () => {
      try {
        const saved = localStorage.getItem('delivery_location');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.city && parsed.pincode) {
            setDeliveryLocation(`${parsed.city} ${parsed.pincode}`);
          }
        }
      } catch (e) {}
    };

    updateLocation();
    window.addEventListener('storage', updateLocation);
    window.addEventListener('address_updated', updateLocation);
    return () => {
      window.removeEventListener('storage', updateLocation);
      window.removeEventListener('address_updated', updateLocation);
    };
  }, []);

  // Sync wishlist count from localStorage with live window storage event listener
  useEffect(() => {
    const updateWishlistCount = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlistCount(stored.length);
      } catch (e) {
        setWishlistCount(0);
      }
    };
    updateWishlistCount();
    window.addEventListener('storage', updateWishlistCount);
    return () => window.removeEventListener('storage', updateWishlistCount);
  }, [location.pathname]);

  // Autocomplete search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.suggestions)) {
            setSuggestions(d.suggestions);
          }
        })
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSuggestOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSuggestionText = (item: any): string => {
    if (typeof item === 'string') return item;
    if (!item) return '';
    return item.text || item.title || item.name || item.query || item.search_term || String(item);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSuggestOpen(false);
    if (onSearchSubmit) {
      onSearchSubmit(searchQuery.trim());
    }
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectSuggestion = (rawItem: any) => {
    const titleText = getSuggestionText(rawItem);
    if (!titleText.trim()) return;
    setSearchQuery(titleText);
    setIsSuggestOpen(false);
    if (onSearchSubmit) {
      onSearchSubmit(titleText);
    }
    navigate(`/search?q=${encodeURIComponent(titleText)}`);
  };

  const [categories, setCategories] = useState<CategoryItem[]>(CANONICAL_CATEGORIES);

  useEffect(() => {
    fetchCategoryList().then(list => {
      if (list && list.length > 0) setCategories(list);
    });
  }, []);

  return (
    <header className="w-full bg-[#0875E1] text-white sticky top-0 z-50 shadow-md">
      {/* 1. TOP ANNOUNCEMENT & UTILITY BAR (WITH SMOOTH RUNNING TICKER) */}
      <div className="bg-[#07468A] text-xs font-medium py-1.5 px-4 sm:px-6 border-b border-blue-900/40 w-full overflow-hidden">
        <div className="w-full flex items-center justify-between text-white gap-4">
          
          {/* Location indicator */}
          <div className="flex items-center space-x-1.5 text-blue-100 hover:text-white cursor-pointer transition-colors font-semibold shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#FFC20A]" />
            <span>Deliver to <strong className="text-white font-bold">{deliveryLocation}</strong></span>
            <ChevronDown className="w-3 h-3 text-blue-200" />
          </div>

          {/* Center Animated Running Notification Bar */}
          <div className="hidden md:flex flex-1 overflow-hidden relative mx-6">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
              className="flex items-center space-x-8 whitespace-nowrap text-blue-100 font-bold text-[11px]"
            >
              <span>🚀 Free Delivery on orders above ₹499</span>
              <span>•</span>
              <span>🔄 Easy 7-Day Hassle-Free Returns</span>
              <span>•</span>
              <span>🔒 100% Safe & Secure Payments</span>
              <span>•</span>
              <span>⚡ NexDay Member Flash Deals Live Now</span>
              <span>•</span>
              <span>🚀 Free Delivery on orders above ₹499</span>
              <span>•</span>
              <span>🔄 Easy 7-Day Hassle-Free Returns</span>
              <span>•</span>
              <span>🔒 100% Safe & Secure Payments</span>
              <span>•</span>
              <span>⚡ NexDay Member Flash Deals Live Now</span>
            </motion.div>
          </div>

          {/* Right Links */}
          <div className="flex items-center space-x-3 text-[#FFC20A] font-semibold shrink-0">
            <button onClick={() => navigate('/help')} className="hover:text-[#FFE066] transition-colors">Help</button>
            <span className="text-[#FFC20A]/60 font-mono">|</span>
            <button onClick={() => navigate('/orders')} className="hover:text-[#FFE066] transition-colors">Track Order</button>
            <span className="text-[#FFC20A]/60 font-mono hidden sm:inline">|</span>
            <button onClick={() => navigate('/help')} className="hover:text-[#FFE066] transition-colors hidden sm:inline">Sell on NexDay</button>
          </div>

        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <div className="w-full px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-4">
        
        {/* LOGO AREA */}
        <div 
          onClick={() => navigate('/home')} 
          className="flex items-center cursor-pointer group shrink-0 select-none py-0.5"
        >
          <img 
            src="/nexday-logo.png" 
            alt="NexDay™ - Brand New Day. Brand New Products." 
            className="h-10 sm:h-12 w-auto object-contain bg-white rounded-xl px-2.5 py-1 shadow-md group-hover:scale-105 transition-transform duration-200" 
          />
        </div>

        {/* SEARCH BAR */}
        <div className="flex-1 max-w-2xl relative" ref={searchRef}>
          <form onSubmit={handleSearch} className="flex items-center w-full">
            <div className="relative w-full flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSuggestOpen(true)}
                placeholder="Search for products, brands and more..."
                className="w-full bg-white text-[#172033] pl-4 pr-12 py-2.5 rounded-l-lg rounded-r-none text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC20A] shadow-inner placeholder-gray-400"
              />
              <button
                type="submit"
                className="bg-[#FFC20A] hover:bg-[#E5AD00] text-[#0B2A55] px-5 py-2.5 rounded-r-lg rounded-l-none font-bold transition-colors flex items-center justify-center shrink-0 shadow-sm"
                aria-label="Search"
              >
                <Search className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          <AnimatePresence>
            {isSuggestOpen && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white text-[#172033] rounded-lg shadow-2xl border border-gray-100 py-2 z-50 max-h-80 overflow-y-auto"
              >
                {suggestions.map((item, idx) => {
                  const text = getSuggestionText(item);
                  const type = typeof item === 'object' && item ? item.type : null;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(text)}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 flex items-center justify-between text-gray-700 hover:text-[#0875E1] cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <span>{text}</span>
                      </div>
                      {type && (
                        <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {type}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center space-x-5 shrink-0">
          
          {/* USER ACCOUNT DROPDOWN */}
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center space-x-2 text-white hover:text-[#FFC20A] transition-colors py-1 px-2 rounded-lg"
            >
              {profilePhoto ? (
                <div className="w-7 h-7 rounded-full overflow-hidden border border-blue-200/80 flex-shrink-0">
                  <img src={profilePhoto} alt="User Avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <User className="w-5 h-5 stroke-[2]" />
              )}
              <div className="hidden sm:flex flex-col text-left text-xs leading-tight">
                <span className="text-[10px] text-blue-200 font-medium">
                  {isAuthenticated ? 'Hello,' : 'Welcome'}
                </span>
                <span className="font-bold truncate max-w-[100px]">
                  {customer ? (customer.first_name || 'Account') : 'Login'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
            </button>

            {/* Account Menu */}
            <AnimatePresence>
              {isAccountOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-white text-[#172033] rounded-xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center space-x-3">
                    {profilePhoto && (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-200 flex-shrink-0">
                        <img src={profilePhoto} alt="User Avatar" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs text-gray-500 font-medium">Signed in as</p>
                      <p className="text-xs font-bold text-[#0B2A55] truncate">
                        {customer ? customer.email : 'Guest Customer'}
                      </p>
                    </div>
                  </div>
                  
                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={() => { setIsAccountOpen(false); navigate('/profile'); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 flex items-center space-x-2 text-gray-700"
                      >
                        <User className="w-4 h-4 text-[#0875E1]" />
                        <span>My Account</span>
                      </button>
                      <button
                        onClick={() => { setIsAccountOpen(false); navigate('/orders'); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 flex items-center space-x-2 text-gray-700"
                      >
                        <Package className="w-4 h-4 text-[#0875E1]" />
                        <span>My Orders</span>
                      </button>
                      <button
                        onClick={() => { setIsAccountOpen(false); navigate('/reviews'); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 flex items-center space-x-2 text-gray-700"
                      >
                        <Star className="w-4 h-4 text-[#0875E1]" />
                        <span>My Reviews</span>
                      </button>
                      <button
                        onClick={() => { setIsAccountOpen(false); navigate('/wishlist'); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-blue-50 flex items-center space-x-2 text-gray-700"
                      >
                        <Heart className="w-4 h-4 text-[#0875E1]" />
                        <span>Wishlist</span>
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => { setIsAccountOpen(false); logout(); navigate('/login'); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-red-50 text-red-600 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setIsAccountOpen(false); navigate('/login'); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#0875E1] hover:bg-blue-50"
                      >
                        Log In
                      </button>
                      <button
                        onClick={() => { setIsAccountOpen(false); navigate('/register'); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                      >
                        New customer? Create account
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* WISHLIST BUTTON */}
          <button
            onClick={() => navigate('/wishlist')}
            className="flex items-center space-x-1.5 text-white hover:text-[#FFC20A] transition-colors relative"
          >
            <div className="relative">
              <Heart className="w-5 h-5 stroke-[2]" />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FFC20A] text-[#0B2A55] font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-xs font-bold">Wishlist</span>
          </button>

          {/* CART BUTTON */}
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center space-x-1.5 text-white hover:text-[#FFC20A] transition-colors relative"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6 stroke-[2]" />
              {getCartTotalCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FFC20A] text-[#0B2A55] font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm">
                  {getCartTotalCount()}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-xs font-bold">Cart</span>
          </button>

          {/* MOBILE MENU TOGGLE BUTTON */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white p-1"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>

      </div>

      {/* 3. CATEGORY NAVIGATION BAR (ALIGNED PROPERLY MATCHING REFERENCE IMAGE 2) */}
      <div className="bg-white text-[#172033] border-b border-gray-200 shadow-2xs hidden lg:block">
        <div className="w-full px-4 sm:px-6 md:px-8 flex items-center space-x-6">
          
          {/* ALL CATEGORIES DROPDOWN BUTTON (CLEAN INTEGRATED LAYOUT MATCHING IMAGE 2) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsCategoriesMenuOpen(!isCategoriesMenuOpen)}
              className="flex items-center space-x-2 text-[#172033] py-2.5 font-extrabold text-xs hover:text-[#0875E1] transition-colors cursor-pointer pr-6 border-r border-gray-200"
            >
              <Menu className="w-4 h-4 text-[#0B2A55]" />
              <span>All Categories</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>

            <AnimatePresence>
              {isCategoriesMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 w-64 bg-white shadow-2xl border border-gray-100 py-2 z-50 rounded-b-xl"
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        setIsCategoriesMenuOpen(false);
                        navigate(`/category/${cat.slug}`);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-[#0875E1] flex items-center justify-between"
                    >
                      <span>{cat.name}</span>
                      {cat.isOffer && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Sale</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* HORIZONTAL CATEGORY LINKS (PROPERLY ALIGNED MATCHING IMAGE 2) */}
          <nav className="flex items-center space-x-8 py-2.5 text-xs font-bold text-[#172033] overflow-x-auto no-scrollbar">
            {categories.map((cat) => {
              const isActive = activeCategorySlug === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  className={`transition-colors whitespace-nowrap ${
                    cat.isOffer 
                      ? 'text-[#FF0033] font-black hover:text-red-700' 
                      : isActive 
                        ? 'text-[#0875E1] border-b-2 border-[#0875E1] pb-0.5' 
                        : 'hover:text-[#0875E1]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </nav>

        </div>
      </div>

      {/* MOBILE COLLAPSIBLE MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white text-[#172033] border-b border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2 text-xs font-bold">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-extrabold px-1">Categories</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate(`/category/${cat.slug}`);
                    }}
                    className={`text-left p-2 rounded-lg ${cat.isOffer ? 'bg-red-50 text-red-600 font-black' : 'bg-gray-50 text-gray-800'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/wishlist'); }}
                  className="w-full text-left py-2 px-2 rounded-lg bg-gray-50 flex items-center justify-between"
                >
                  <span>Wishlist ({wishlistCount})</span>
                  <Heart className="w-4 h-4 text-red-500" />
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/cart'); }}
                  className="w-full text-left py-2 px-2 rounded-lg bg-gray-50 flex items-center justify-between"
                >
                  <span>Shopping Cart ({getCartTotalCount()})</span>
                  <ShoppingCart className="w-4 h-4 text-[#0875E1]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
