import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, ChevronRight, ShoppingCart, Heart, ShieldCheck, 
  Truck, RotateCcw, Check, Sparkles, Zap, MapPin, 
  Share2, Award, ChevronDown, Search, Lock, HelpCircle
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import { getProductImage } from '../utils/productImageMap';

interface ProductImage {
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text?: string;
}

interface ProductSpec {
  spec_name: string;
  spec_value: string;
}

interface Review {
  review_id: number;
  customer_id: string;
  rating: number;
  title: string;
  review_title?: string;
  review_text: string;
  verified_purchase: boolean;
  created_at?: string;
}

interface ProductDetails {
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
  color?: string;
  size?: string;
  warranty?: string;
  delivery_days?: number;
  image_url?: string;
}

export const ProductDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const { session, customer, isAuthenticated } = useSessionStore();
  const { addItemToCart, fetchCart } = useCartStore();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [specifications, setSpecifications] = useState<ProductSpec[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('Black');
  const [quantity] = useState(1);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews' | 'qna'>('details');

  // Frequently bought together bundle checkboxes state
  const [bundleStand, setBundleStand] = useState(true);
  const [bundleCase, setBundleCase] = useState(true);

  // Review Form
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');

  useEffect(() => {
    if (session) fetchCart();
  }, [session, fetchCart]);

  useEffect(() => {
    if (!productId) return;

    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.product) {
          setProduct(d.product);
          const rawImages: ProductImage[] = d.images || [];
          setImages(rawImages);
          setSpecifications(d.specifications || []);
          setReviews(d.reviews || []);

          const firstApiImg = rawImages.find(img => img.image_url && img.image_url.trim().length > 0)?.image_url;
          const primaryUrl = firstApiImg || d.product.image_url || getProductImage(d.product);
          setActiveImage(primaryUrl);

          fetch(`/api/products?category_id=${d.product.category_id}&limit=5`)
            .then(r => r.json())
            .then(simData => {
              if (simData.success && simData.products) {
                setSimilarProducts(simData.products.filter((p: any) => p.product_id !== productId));
              }
            }).catch(() => {});
        }
      }).catch(() => {});
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setIsWishlisted(stored.some((item: any) => item.product_id === productId));
    } catch (e) {}
  }, [productId]);

  const showAlert = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 3000);
  };

  const toggleWishlist = () => {
    if (!product) return;
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      let updated;
      if (isWishlisted) {
        updated = stored.filter((item: any) => item.product_id !== product.product_id);
      } else {
        updated = [...stored, product];
      }
      localStorage.setItem('wishlist', JSON.stringify(updated));
      setIsWishlisted(!isWishlisted);
      window.dispatchEvent(new Event('storage'));
      showAlert(isWishlisted ? 'Removed from Wishlist' : 'Saved to Wishlist!');
    } catch (e) {}
  };

  const handleAddToCart = async () => {
    if (!product) return;
    await addItemToCart({
      product_id: product.product_id,
      name: product.name,
      brand: product.brand || 'RetailHub',
      price: product.price,
      discount: product.discount || 0,
      sale_price: product.sale_price || product.price,
    }, quantity, 'product_details');
    showAlert('Added to Cart!');
  };

  const handleBuyNow = async () => {
    if (!product) return;
    await addItemToCart({
      product_id: product.product_id,
      name: product.name,
      brand: product.brand || 'RetailHub',
      price: product.price,
      discount: product.discount || 0,
      sale_price: product.sale_price || product.price,
    }, quantity, 'buy_now');
    if (!isAuthenticated) {
      navigate('/login?redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  const handleAddBundleToCart = async () => {
    if (!product) return;
    await addItemToCart({
      product_id: product.product_id,
      name: product.name,
      brand: product.brand || 'RetailHub',
      price: product.price,
      discount: product.discount || 0,
      sale_price: product.sale_price || product.price,
    }, 1, 'bundle');

    if (bundleStand) {
      await addItemToCart({
        product_id: 'ACC-STAND-01',
        name: 'Headphone Stand',
        brand: product.brand || 'RetailHub',
        price: 1500,
        discount: 13,
        sale_price: 1299,
      }, 1, 'bundle');
    }
    if (bundleCase) {
      await addItemToCart({
        product_id: 'ACC-CASE-02',
        name: 'Carrying Case',
        brand: product.brand || 'RetailHub',
        price: 2999,
        discount: 17,
        sale_price: 2499,
      }, 1, 'bundle');
    }
    showAlert('Bundle Added to Cart!');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !customer) {
      showAlert('You must be signed in to submit reviews.');
      return;
    }
    if (!formTitle.trim() || !formText.trim()) {
      showAlert('Please fill out all review fields.');
      return;
    }

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          customer_id: customer.customer_id,
          session_id: session?.session_id,
          rating: formRating,
          title: formTitle.trim(),
          review_text: formText.trim(),
          verified_purchase: true
        })
      });
      const data = await response.json();
      if (data.success) {
        showAlert('Review submitted successfully!');
        setReviews([{ review_id: Date.now(), customer_id: customer.customer_id, rating: formRating, title: formTitle, review_text: formText, verified_purchase: true }, ...reviews]);
        setFormTitle('');
        setFormText('');
      }
    } catch (err) {
      showAlert('Failed to submit review');
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between font-sans">
        <Header />
        <div className="flex-grow flex items-center justify-center p-12 text-center text-gray-500 font-bold">
          Loading product details...
        </div>
        <Footer />
      </div>
    );
  }

  const currentPrice = product.sale_price || product.price;
  const originalPrice = product.sale_price ? product.price : Math.round(currentPrice * 1.15);
  const discountPercent = product.discount || Math.round(((originalPrice - currentPrice) / originalPrice) * 100);

  // Gallery image list (strictly product images without hardcoded fallbacks)
  const apiImages = images.map((img) => img.image_url).filter(Boolean);
  let galleryImages: string[] = [];

  if (apiImages.length > 0) {
    galleryImages = Array.from(new Set(apiImages));
  } else if (product.image_url && product.image_url.trim().length > 0) {
    galleryImages = [product.image_url.trim()];
  } else {
    galleryImages = [getProductImage(product)];
  }

  // Bundle calculations
  let bundleTotal = currentPrice;
  if (bundleStand) bundleTotal += 1299;
  if (bundleCase) bundleTotal += 2499;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col justify-between font-sans selection:bg-[#0875E1] selection:text-white">
      
      {/* HEADER */}
      <Header />

      {/* FLOATING ALERT NOTIFICATION */}
      {infoMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B2A55] text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-400 text-xs font-bold flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#FFC20A]" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow w-full px-4 sm:px-6 md:px-8 py-4 space-y-4">
        
        {/* BREADCRUMBS (Home > Electronics > Audio & Headphones > Over-Ear Headphones > Sony WH-1000XM5) */}
        <nav className="flex items-center space-x-1.5 text-xs text-gray-500 font-semibold overflow-x-auto no-scrollbar">
          <button onClick={() => navigate('/home')} className="hover:text-[#0875E1] shrink-0">Home</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <button onClick={() => navigate('/category/electronics')} className="hover:text-[#0875E1] capitalize shrink-0">Electronics</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="hover:text-[#0875E1] shrink-0 cursor-pointer">Audio &amp; Headphones</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="hover:text-[#0875E1] shrink-0 cursor-pointer">Over-Ear Headphones</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-gray-800 font-bold truncate max-w-xs">{product.name}</span>
        </nav>

        {/* TOP MAIN PRODUCT GRID (IMAGE GALLERY + PRODUCT DETAILS + FULFILLMENT SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* A. LEFT IMAGE GALLERY COLUMN (COL 5 - MATCHING REFERENCE IMAGE 100%) */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row gap-3">
            
            {/* Vertical Thumbnails Column */}
            <div className="flex sm:flex-col items-center space-x-2 sm:space-x-0 sm:space-y-2 shrink-0">
              {galleryImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(url)}
                  className={`w-14 h-14 rounded-xl border-2 overflow-hidden bg-white p-1 transition-all cursor-pointer shadow-2xs ${
                    (activeImage || galleryImages[0]) === url ? 'border-[#0875E1] ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <img src={url} alt="thumbnail" className="w-full h-full object-contain" />
                </button>
              ))}
              <button className="w-14 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center shrink-0 hidden sm:flex">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Large Product Display Preview Box */}
            <div className="relative flex-grow aspect-square bg-white rounded-3xl border border-gray-200/80 p-6 flex items-center justify-center overflow-hidden shadow-2xs group">
              
              {/* Bestseller Badge */}
              <span className="absolute top-4 left-4 bg-[#0875E1] text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                BESTSELLER
              </span>

              {/* Wishlist Icon Button */}
              <button
                onClick={toggleWishlist}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm transition-colors cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
              </button>

              {/* Main Product Image */}
              <img
                src={activeImage || galleryImages[0]}
                alt={product.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />

              {/* Click to Zoom Pill Badge */}
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xs text-gray-700 text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs border border-gray-200 flex items-center space-x-1.5 cursor-pointer hover:bg-white">
                <Search className="w-3.5 h-3.5 text-[#0875E1]" />
                <span>Click to zoom</span>
              </span>

            </div>

          </div>

          {/* B. MIDDLE PRODUCT DETAILS COLUMN (COL 4) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Brand, Title & Tagline */}
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-[#0875E1]">
                {product.brand || 'SONY'}
              </span>

              <h1 className="text-xl sm:text-2xl font-black text-[#172033] leading-snug">
                {product.name}
              </h1>

              <p className="text-xs font-semibold text-gray-600 line-clamp-2">
                {product.description 
                  ? (product.description.length > 150 ? product.description.slice(0, 150) + '...' : product.description)
                  : `${product.brand || 'RetailHub'} - Premium Quality Product`}
              </p>

              {/* Rating & Sales Row */}
              <div className="flex items-center space-x-2 pt-1 text-xs">
                <div className="flex items-center space-x-1 font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[#172033] font-black">{product.rating || 4.6}</span>
                  <span className="text-gray-400 font-medium">({(product.review_count || 12458).toLocaleString()} ratings)</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600 font-extrabold">1K+ bought in past month</span>
              </div>

              {/* Category Rank Badge */}
              <div className="pt-1">
                <span className="inline-flex items-center space-x-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-md">
                  <span className="bg-[#E67E22] text-white text-[9px] px-1 rounded mr-1">#1 Best Seller</span>
                  <span>in {product.brand || 'Featured Catalog'}</span>
                </span>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-0.5 pt-1 border-t border-gray-100">
              <div className="flex items-baseline space-x-2.5">
                <span className="text-3xl font-black text-[#172033] tracking-tight">
                  ₹{currentPrice.toLocaleString()}
                </span>
                {originalPrice > currentPrice && (
                  <span className="text-sm font-bold text-gray-400 line-through">
                    ₹{originalPrice.toLocaleString()}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs font-black text-emerald-600">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 font-semibold">Inclusive of all taxes</p>
            </div>

            {/* Bank Offer Box (Matching Reference Image) */}
            <div className="bg-[#E8F8F0] border border-emerald-200 rounded-2xl p-3 flex items-start space-x-2.5 text-xs">
              <div className="p-1 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                <span className="text-[10px] font-black">%</span>
              </div>
              <div className="flex-grow space-y-0.5">
                <p className="font-extrabold text-emerald-950">Bank Offer</p>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Get up to ₹3,000 instant discount with select credit cards
                </p>
              </div>
              <button className="text-[11px] font-extrabold text-[#0875E1] hover:underline shrink-0">
                View Offers &gt;
              </button>
            </div>

            {/* Color Swatch Selection */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-[#172033]">
                Color: <strong className="text-[#0875E1]">{selectedColor}</strong>
              </span>

              <div className="flex items-center space-x-3">
                {[
                  { name: 'Black', img: galleryImages[0] },
                  { name: 'Silver', img: galleryImages[1] },
                  { name: 'Navy', img: galleryImages[2] },
                ].map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-12 h-12 rounded-xl border-2 p-1 bg-white flex items-center justify-center transition-all cursor-pointer ${
                      selectedColor === color.name ? 'border-[#0875E1] ring-2 ring-blue-100 shadow-2xs' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={color.img} alt={color.name} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons (Add to Cart & Buy Now matching Reference Image) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              
              <button
                onClick={handleAddToCart}
                className="w-full bg-white hover:bg-blue-50 text-[#0875E1] border-2 border-[#0875E1] py-3 px-4 rounded-xl font-extrabold text-xs transition-all shadow-2xs flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                onClick={handleBuyNow}
                className="w-full bg-[#FFC20A] hover:bg-[#E5AD00] text-[#172033] py-3 px-4 rounded-xl font-black text-xs transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
              >
                <Zap className="w-4 h-4 fill-black text-black" />
                <span>Buy Now</span>
              </button>

            </div>

            {/* 4 Trust Guarantees Bar (Matching Reference Image) */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 text-center text-[10px] font-bold text-gray-700">
              <div className="space-y-1">
                <RotateCcw className="w-4 h-4 text-[#0875E1] mx-auto" />
                <p>7 Days Replacement</p>
              </div>
              <div className="space-y-1">
                <Award className="w-4 h-4 text-[#0875E1] mx-auto" />
                <p>1 Year Warranty</p>
              </div>
              <div className="space-y-1">
                <ShieldCheck className="w-4 h-4 text-[#0875E1] mx-auto" />
                <p>100% Genuine Products</p>
              </div>
              <div className="space-y-1">
                <Lock className="w-4 h-4 text-[#0875E1] mx-auto" />
                <p>Secure Payments</p>
              </div>
            </div>

          </div>

          {/* C. RIGHT FULFILLMENT & TRUST SIDEBAR (COL 3 - MATCHING REFERENCE IMAGE 100%) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Card 1: Delivery Location & Fulfillment */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs text-xs">
              <div className="flex items-center justify-between font-extrabold text-[#172033]">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-[#0875E1]" />
                  <span>Deliver to <strong>Chennai 600001</strong></span>
                </div>
                <button className="text-[#0875E1] hover:underline font-bold text-[11px]">Change</button>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-2.5">
                <div className="flex items-start space-x-2">
                  <Truck className="w-4 h-4 text-[#0875E1] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-gray-900">FREE Delivery</p>
                    <p className="text-emerald-700 font-bold">Tomorrow, 15 Sep</p>
                    <p className="text-[10px] text-emerald-800 font-medium">Order within 5 hrs 12 mins</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-1 border-t border-gray-50">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-gray-900">Express Delivery</p>
                    <p className="text-gray-700 font-bold">Today by 10 PM</p>
                    <p className="text-[10px] text-gray-500 font-medium">₹40 <span className="line-through">₹0</span> with NexDay One</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Stock Status & Seller */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs text-xs">
              <div>
                <p className="text-emerald-700 font-black text-sm">In Stock</p>
                <p className="text-gray-600 font-semibold mt-0.5">Sold by <strong>NexDay Retail</strong></p>
                <div className="flex items-center space-x-1 pt-1 text-[11px]">
                  <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">4.5 ★</span>
                  <span className="text-gray-500 font-semibold">Seller Rating</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={toggleWishlist}
                  className="w-full py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-700 font-bold flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="text-[11px]">Add to Wishlist</span>
                </button>

                <button className="w-full py-1.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-700 font-bold flex items-center justify-center space-x-1 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-[11px]">Share</span>
                </button>
              </div>
            </div>

            {/* Card 3: Why shop with NexDay? */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-2.5 shadow-2xs text-xs">
              <h4 className="font-black text-[#172033]">Why shop with NexDay?</h4>
              
              <ul className="space-y-2 text-[11px] font-semibold text-gray-700">
                <li className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#0875E1]" />
                  <span>Original Products</span>
                </li>
                <li className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-[#0875E1]" />
                  <span>Easy Returns</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-[#0875E1]" />
                  <span>Secure Payments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-[#0875E1]" />
                  <span>Dedicated Customer Support</span>
                </li>
              </ul>
            </div>

            {/* Card 4: Frequently Bought Together Bundle (Matching Reference Image) */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 space-y-3 shadow-2xs text-xs">
              <h4 className="font-black text-[#172033]">Frequently bought together</h4>

              {/* Bundle Images Row */}
              <div className="flex items-center justify-center space-x-2 py-1">
                <img src={galleryImages[0]} alt="Headphones" className="w-12 h-12 object-contain bg-gray-50 p-1 border border-gray-200 rounded-lg" />
                <span className="text-gray-400 font-bold">+</span>
                <img src="https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&auto=format&fit=crop" alt="Stand" className="w-12 h-12 object-contain bg-gray-50 p-1 border border-gray-200 rounded-lg" />
                <span className="text-gray-400 font-bold">+</span>
                <img src="https://images.unsplash.com/photo-1484704849700-f032a568e944?w=300&auto=format&fit=crop" alt="Case" className="w-12 h-12 object-contain bg-gray-50 p-1 border border-gray-200 rounded-lg" />
              </div>

              {/* Bundle Checkboxes List */}
              <div className="space-y-1.5 text-[11px] font-semibold text-gray-700 border-t border-gray-100 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked disabled className="rounded text-[#0875E1] w-3.5 h-3.5" />
                  <span className="truncate flex-grow">This item: {product.name.slice(0, 18)}...</span>
                  <span className="font-bold text-gray-900">₹{currentPrice.toLocaleString()}</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleStand}
                    onChange={(e) => setBundleStand(e.target.checked)}
                    className="rounded text-[#0875E1] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate flex-grow">Headphone Stand</span>
                  <span className="font-bold text-gray-900">₹1,299</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundleCase}
                    onChange={(e) => setBundleCase(e.target.checked)}
                    className="rounded text-[#0875E1] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate flex-grow">Carrying Case</span>
                  <span className="font-bold text-gray-900">₹2,499</span>
                </label>
              </div>

              {/* Total & Add All to Cart Button */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">Total Price:</span>
                  <span className="text-sm font-black text-[#172033]">₹{bundleTotal.toLocaleString()}</span>
                </div>

                <button
                  onClick={handleAddBundleToCart}
                  className="bg-[#FFC20A] hover:bg-[#E5AD00] text-[#172033] py-2 px-3 rounded-xl text-xs font-extrabold shadow-2xs cursor-pointer active:scale-98"
                >
                  Add all to Cart
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM TABBED SECTION (PRODUCT DETAILS / SPECS / REVIEWS / QNA MATCHING REFERENCE IMAGE) */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden">
          
          {/* Tab Header Bar */}
          <div className="flex items-center space-x-6 px-6 border-b border-gray-200 overflow-x-auto no-scrollbar text-xs font-extrabold">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'details' ? 'border-[#0875E1] text-[#0875E1]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Product Details
            </button>

            <button
              onClick={() => setActiveTab('specs')}
              className={`py-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'specs' ? 'border-[#0875E1] text-[#0875E1]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Specifications
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'reviews' ? 'border-[#0875E1] text-[#0875E1]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Customer Reviews ({reviews.length > 0 ? reviews.length : '12,458'})
            </button>

            <button
              onClick={() => setActiveTab('qna')}
              className={`py-4 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'qna' ? 'border-[#0875E1] text-[#0875E1]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Questions &amp; Answers (245)
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-6 sm:p-8">
            
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Left: About this item */}
                <div className="md:col-span-7 space-y-3">
                  <h3 className="text-sm font-black text-[#172033]">About this item</h3>
                  {product.description ? (
                    <div className="text-xs text-gray-700 leading-relaxed font-medium space-y-2">
                      {product.description.split('\n').filter(line => line.trim().length > 0).map((paragraph, idx) => (
                        <p key={idx} className="flex items-start gap-2">
                          <span className="text-[#0875E1] font-bold">•</span>
                          <span>{paragraph.replace(/^[-•*]\s*/, '')}</span>
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 font-medium italic">No detailed description available for this product.</p>
                  )}
                </div>

                {/* Right: Key Specifications Table */}
                <div className="md:col-span-5 bg-[#F8FAFC] p-5 rounded-2xl border border-gray-200/80 space-y-3">
                  <h3 className="text-sm font-black text-[#172033]">Key Specifications</h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500 font-semibold">Brand</span>
                      <span className="font-bold text-[#172033]">{product.brand || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500 font-semibold">SKU / Model</span>
                      <span className="font-bold text-[#172033]">{product.sku || product.product_id}</span>
                    </div>
                    {product.color && (
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500 font-semibold">Color</span>
                        <span className="font-bold text-[#172033]">{product.color}</span>
                      </div>
                    )}
                    {product.size && (
                      <div className="flex justify-between py-1 border-b border-gray-200/60">
                        <span className="text-gray-500 font-semibold">Size</span>
                        <span className="font-bold text-[#172033]">{product.size}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500 font-semibold">Delivery</span>
                      <span className="font-bold text-[#172033]">{product.delivery_days ? `Estimated ${product.delivery_days} Business Days` : 'Fast Standard Delivery'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-500 font-semibold">Warranty</span>
                      <span className="font-bold text-[#172033]">{product.warranty || 'Standard Guarantee'}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'specs' && (
              <div className="max-w-2xl space-y-3">
                <h3 className="text-sm font-black text-[#172033]">Full Technical Specifications</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 font-semibold">SKU Code</span>
                    <span className="font-bold text-[#172033]">{product.sku}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 font-semibold">Brand</span>
                    <span className="font-bold text-[#0875E1]">{product.brand}</span>
                  </div>
                  {specifications.map((spec, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 font-semibold">{spec.spec_name}</span>
                      <span className="font-bold text-[#172033]">{spec.spec_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Reviews List (COL 8) */}
                <div className="md:col-span-8 space-y-4">
                  <h3 className="text-sm font-black text-[#172033]">Customer Reviews &amp; Ratings</h3>
                  
                  {reviews.map((rev, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-[#F8FAFC] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-[#172033]">{rev.title || rev.review_title || 'Verified Review'}</span>
                        </div>
                        {rev.verified_purchase && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Verified Buyer</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">{rev.review_text}</p>
                    </div>
                  ))}
                </div>

                {/* Review Form (COL 4) */}
                <div className="md:col-span-4 bg-[#F8FAFC] p-5 rounded-2xl border border-gray-200/80 space-y-3">
                  <h3 className="text-sm font-black text-[#172033]">Write a Review</h3>
                  
                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-600">Rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setFormRating(star)}
                          className="text-amber-400 cursor-pointer"
                        >
                          <Star className={`w-4 h-4 ${star <= formRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Headline (e.g. Incredible sound quality!)"
                      className="w-full bg-white text-xs font-medium border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0875E1]"
                    />

                    <textarea
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      placeholder="Share details of your experience with this product..."
                      rows={3}
                      className="w-full bg-white text-xs font-medium border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0875E1]"
                    />

                    <button
                      type="submit"
                      className="w-full bg-[#0875E1] hover:bg-[#065BB5] text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
                    >
                      Submit Review
                    </button>
                  </form>
                </div>

              </div>
            )}

            {activeTab === 'qna' && (
              <div className="space-y-4 max-w-3xl">
                <h3 className="text-sm font-black text-[#172033]">Questions &amp; Answers</h3>
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100 space-y-1">
                    <p className="font-bold text-[#172033]">Q: Does it support dual device connectivity simultaneously?</p>
                    <p className="text-gray-600 font-medium">A: Yes, the Sony WH-1000XM5 features Bluetooth Multipoint, allowing seamless connection between two devices at once.</p>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100 space-y-1">
                    <p className="font-bold text-[#172033]">Q: Is the carrying case included in the box?</p>
                    <p className="text-gray-600 font-medium">A: Yes! A collapsible hard carrying case along with USB-C and 3.5mm audio cables are included in the box.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* SIMILAR PRODUCTS SECTION */}
        {similarProducts.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-black text-[#172033] tracking-tight">You May Also Like</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarProducts.slice(0, 4).map((p) => (
                <ProductCard key={p.product_id} product={p} />
              ))}
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};

export default ProductDetailsPage;
