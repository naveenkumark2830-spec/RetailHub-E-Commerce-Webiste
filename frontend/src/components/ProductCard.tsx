import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, ShoppingCart, Check } from 'lucide-react';
import { getProductImage } from '../utils/productImageMap';
import { useCartStore } from '../store/useCartStore';
import { useSessionStore } from '../store/useSessionStore';

export interface ProductCardProps {
  product: {
    product_id: string;
    name: string;
    brand?: string;
    category_id?: string;
    price: number;
    sale_price?: number;
    discount?: number;
    rating?: number;
    review_count?: number;
    image_url?: string;
    stock?: number;
  };
  onAddToCartSuccess?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCartSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItemToCart } = useCartStore();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Check wishlist state from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setIsWishlisted(stored.some((item: any) => item.product_id === product.product_id));
    } catch (e) {}
  }, [product.product_id]);

  // Event Generation 1: Wishlist Toggle Event
  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      let updated;
      if (isWishlisted) {
        updated = stored.filter((item: any) => item.product_id !== product.product_id);
      } else {
        updated = [...stored, product];
        
        // Log wishlist event to backend event pipeline
        const session = useSessionStore.getState().session;
        const customer = useSessionStore.getState().customer;
        if (session) {
          fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'wishlist_added',
              session_id: session.session_id,
              customer_id: customer?.customer_id || null,
              page: location.pathname || 'home',
              metadata: {
                product_id: product.product_id,
                name: product.name,
                price: product.sale_price || product.price,
                category_id: product.category_id || 'CAT001'
              }
            })
          }).catch(() => {});
        }
      }
      localStorage.setItem('wishlist', JSON.stringify(updated));
      setIsWishlisted(!isWishlisted);
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  };

  // Event Generation 2: Add to Cart Event (triggers /api/cart/items & Kafka producer)
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdding) return;
    setIsAdding(true);
    try {
      await addItemToCart({
        product_id: product.product_id,
        name: product.name,
        brand: product.brand || 'RetailHub',
        price: product.price,
        discount: product.discount || 0,
        sale_price: product.sale_price || product.price,
      }, 1, 'product_card');
      setJustAdded(true);
      if (onAddToCartSuccess) onAddToCartSuccess();
      setTimeout(() => setJustAdded(false), 1800);
    } catch (err) {
      console.error('Failed to add item to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Event Generation 3: Product Click & View Tracking Event
  const handleCardClick = () => {
    try {
      const session = useSessionStore.getState().session;
      const customer = useSessionStore.getState().customer;
      if (session) {
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'product_clicked',
            session_id: session.session_id,
            customer_id: customer?.customer_id || null,
            page: location.pathname || 'home',
            metadata: {
              product_id: product.product_id,
              name: product.name,
              price: product.sale_price || product.price,
              category_id: product.category_id || 'CAT001'
            }
          })
        }).catch(() => {});
      }
    } catch (e) {}
    navigate(`/product/${product.product_id}`);
  };

  const currentPrice = product.sale_price || product.price;
  const originalPrice = product.sale_price ? product.price : Math.round(currentPrice * 1.3);
  const discountPercent = product.discount || Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  const rating = product.rating || 4.4;
  const reviewCount = product.review_count || Math.floor(100 + (parseInt(product.product_id.replace(/\D/g, '') || '1') * 37) % 1500);
  const imageUrl = getProductImage(product);

  const formatReviews = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}K`;
    }
    return count.toString();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -3 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }}
      onClick={handleCardClick}
      className="bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:shadow-[0_8px_25px_rgba(8,117,225,0.25)] hover:border-[#0875E1]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer group relative h-full p-2.5 select-none"
    >
      {/* Discount Badge */}
      {discountPercent > 0 && (
        <span className="absolute top-2 left-2 bg-[#FF0033] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-2xs z-10 uppercase tracking-tight">
          {discountPercent}% OFF
        </span>
      )}

      {/* Wishlist Heart Button (Event Generator) */}
      <button
        onClick={toggleWishlist}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs shadow-xs flex items-center justify-center z-10 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Wishlist"
      >
        <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
      </button>

      {/* Product Image Container */}
      <div className="relative w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden p-1">
        <img
          src={imageUrl}
          alt={product.name}
          className="max-h-full max-w-full object-contain object-center group-hover:scale-110 transition-transform duration-500 ease-out"
          loading="lazy"
        />
      </div>

      {/* CARD CONTENT AREA */}
      <div className="mt-1.5 space-y-1 flex-1 flex flex-col justify-between">
        
        {/* Product Title (2-line clamp) */}
        <h3 className="text-[11px] font-bold text-[#172033] line-clamp-2 leading-tight group-hover:text-[#0875E1] transition-colors min-h-[30px]" title={product.name}>
          {product.name}
        </h3>

        <div className="pt-1 border-t border-gray-100/60 space-y-1">
          {/* PRICING */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xs sm:text-sm font-black text-[#FF0033]">
                ₹{currentPrice.toLocaleString()}
              </span>
              {originalPrice > currentPrice && (
                <span className="text-[10px] font-normal text-gray-400 line-through">
                  ₹{originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* QUICK ADD TO CART ICON BUTTON (Event Generator) */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`p-1.5 rounded-lg transition-all shadow-2xs cursor-pointer ${
                justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#0875E1]/10 text-[#0875E1] hover:bg-[#0875E1] hover:text-white active:scale-95'
              }`}
              title="Add to Cart"
            >
              {justAdded ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* RATING */}
          <div className="flex items-center space-x-1 text-[10px]">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-extrabold text-[#FF0033]">{rating}</span>
            <span className="text-gray-400 font-medium">({formatReviews(reviewCount)})</span>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
