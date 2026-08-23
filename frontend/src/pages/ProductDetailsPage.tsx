import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, ArrowLeft, User, ShoppingCart, Heart, 
  Star, Trash2, X, Plus, Minus, Zap, LogOut, CheckCircle, Eye
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';

interface ProductImage {
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string;
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
  media?: any[];
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
  color: string;
  size: string;
  warranty: string;
  delivery_days: number;
}

export const ProductDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const { session, customer, isAuthenticated, logout, terminateSession } = useSessionStore();
  const { items: cartItems, addItemToCart, removeItemFromCart, fetchCart, getCartTotalCount, getCartTotalPrice } = useCartStore();

  // Product states
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [specifications, setSpecifications] = useState<ProductSpec[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [seller, setSeller] = useState({ name: '', rating: 4.5 });
  const [stock, setStock] = useState(0);

  // UI state variables
  const [activeImage, setActiveImage] = useState<string>('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 0, y: 0 });
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('560001');
  const [deliveryEstimate, setDeliveryEstimate] = useState('Tomorrow');
  
  // Frequently Bought Together states
  const [accessories, setAccessories] = useState<any[]>([]);
  const [checkedAccessories, setCheckedAccessories] = useState<string[]>([]);
  
  // Similar products state
  const [similarProducts, setSimilarProducts] = useState<ProductDetails[]>([]);

  // Review form states
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Fetch cart
  useEffect(() => {
    if (session) {
      fetchCart();
    }
  }, [session, fetchCart]);

  // Fetch details
  useEffect(() => {
    if (!productId) return;

    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProduct(d.product);
          setImages(d.images);
          setSpecifications(d.specifications);
          setReviews(d.reviews);
          setSeller(d.seller);
          setStock(d.stock);

          // Select primary image
          const primaryImg = d.images.find((img: ProductImage) => img.image_type === 'primary') || d.images[0];
          setActiveImage(primaryImg?.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop');

          // Log product_view event
          logTelemetryEvent('product_view', {
            product_id: d.product.product_id,
            category_id: d.product.category_id,
            price: d.product.sale_price,
            source: 'details_page'
          });

          // Fetch similar products in same category
          fetch(`/api/products?category_id=${d.product.category_id}&limit=4`)
            .then(r => r.json())
            .then(simData => {
              if (simData.success) {
                setSimilarProducts(simData.products.filter((p: any) => p.product_id !== productId));
              }
            });

          // Setup rule-based accessory items for co-purchase suggestions
          setupCoPurchaseAccessories(d.product);
        }
      });
  }, [productId, session]);

  const setupCoPurchaseAccessories = (p: ProductDetails) => {
    let list = [];
    if (p.category_id === 'CAT001' || p.category_id === 'CAT010' || p.category_id === 'CAT011') {
      list = [
        { product_id: 'ACC-001', name: 'Premium Tech Organizer Pouch', price: 1499, brand: 'NexCase' },
        { product_id: 'ACC-002', name: 'Ergonomic Wireless Mouse', price: 2499, brand: 'Logitech' }
      ];
    } else if (p.category_id === 'CAT002' || p.category_id === 'CAT018') {
      list = [
        { product_id: 'ACC-003', name: 'Premium Leather Polish Spray', price: 699, brand: 'Groomer' },
        { product_id: 'ACC-004', name: 'Sleek Canvas Travel Belt', price: 999, brand: 'Levi\'s' }
      ];
    } else {
      list = [
        { product_id: 'ACC-005', name: 'Universal Storage Container', price: 499, brand: 'IKEA' },
        { product_id: 'ACC-006', name: 'Microfiber Cleaning Pack (Set of 3)', price: 299, brand: 'NexClean' }
      ];
    }
    setAccessories(list);
    setCheckedAccessories(list.map(a => a.product_id));
  };

  // Telemetry event logging
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
          page: 'product_details',
          device: 'desktop',
          browser: 'Chrome',
          metadata
        })
      });
    } catch (e) {
      console.warn('[Telemetry Event Logging failed]', e);
    }
  };

  // Image zoom handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomCoords({ x, y });
  };

  // Dynamic pincode delivery simulation
  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode.match(/^\d{6}$/)) {
      showTemporaryAlert('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    if (pincode.startsWith('560')) {
      setDeliveryEstimate('Tomorrow');
      showTemporaryAlert('Bengaluru delivery detected: Delivery scheduled for Tomorrow!');
    } else {
      setDeliveryEstimate('Within 3 Days');
      showTemporaryAlert(`Standard shipping updated: Delivery within 3 days.`);
    }

    logTelemetryEvent('pincode_checked', { pincode, estimated_delivery: deliveryEstimate });
  };

  // Accessory checkboxes
  const handleAccessoryToggle = (id: string) => {
    setCheckedAccessories(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Unified add to cart for main product + selected accessories
  const handleAddToCart = async () => {
    if (!product) return;

    // 1. Add main product
    await addItemToCart({
      product_id: product.product_id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      discount: product.discount,
      sale_price: product.sale_price
    }, quantity);

    // 2. Add co-purchased checked accessories
    for (const accId of checkedAccessories) {
      const acc = accessories.find(a => a.product_id === accId);
      if (acc) {
        await addItemToCart({
          product_id: acc.product_id,
          name: acc.name,
          brand: acc.brand,
          price: acc.price,
          discount: 0,
          sale_price: acc.price
        }, 1);
      }
    }

    showTemporaryAlert(`Successfully added item(s) to cart!`);
    setIsCartOpen(true);
  };

  // Buy Now checkout flow
  const handleBuyNow = async () => {
    if (!product) return;
    logTelemetryEvent('buy_now_clicked', { product_id: product.product_id });
    
    // Add primary item to cart
    await addItemToCart({
      product_id: product.product_id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      discount: product.discount,
      sale_price: product.sale_price
    }, quantity);

    // Add selected co-purchase accessories if any
    for (const accId of checkedAccessories) {
      const acc = accessories.find(a => a.product_id === accId);
      if (acc) {
        await addItemToCart({
          product_id: acc.product_id,
          name: acc.name,
          brand: acc.brand,
          price: acc.price,
          discount: 0,
          sale_price: acc.price
        }, 1);
      }
    }

    if (!isAuthenticated) {
      navigate('/login?redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  // Submit Review Form
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !customer) {
      showTemporaryAlert('You must be signed in to submit reviews.');
      return;
    }
    if (!formTitle.trim() || !formText.trim()) {
      showTemporaryAlert('Please fill out all review fields.');
      return;
    }

    const payload = {
      product_id: productId,
      customer_id: customer.customer_id,
      session_id: session?.session_id,
      rating: formRating,
      title: formTitle.trim(),
      review_text: formText.trim(),
      verified_purchase: true
    };

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        showTemporaryAlert('Review submitted successfully! Refreshing details...');
        
        // Append locally to list
        const newRev: Review = {
          review_id: Date.now(),
          customer_id: customer.customer_id,
          rating: formRating,
          title: formTitle,
          review_text: formText,
          verified_purchase: true
        };
        setReviews([newRev, ...reviews]);

        // Reset fields
        setFormTitle('');
        setFormText('');
      }
    } catch (err) {
      console.error(err);
    }
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

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 font-mono text-xs">
        <Zap className="w-8 h-8 text-blue-500 animate-bounce mb-3" />
        <span>Retrieving authoritative product metadata...</span>
      </div>
    );
  }

  // Accessories combined pricing calculation
  const accessoriesTotal = accessories
    .filter(a => checkedAccessories.includes(a.product_id))
    .reduce((sum, a) => sum + a.price, 0);

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

      {/* NAVBAR */}
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
              <span>Back Home</span>
            </button>

            {/* Wishlist Link */}
            <button 
              onClick={() => navigate('/wishlist')}
              className="flex items-center space-x-1.5 hover:bg-white/10 px-3 py-2 rounded-full transition-colors text-sm font-bold focus:outline-none"
            >
              <Heart className="w-4 h-4 text-rose-200 fill-rose-200" />
              <span>Wishlist</span>
            </button>

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
                      <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Session ID</p>
                      <p className="font-mono text-[#0071DC] font-bold overflow-hidden text-ellipsis">{session?.session_id}</p>
                    </div>

                    {isAuthenticated && customer ? (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-700">User: <span className="font-bold">{customer.first_name}</span></p>
                        <p className="font-medium text-gray-700">Level: <span className="font-bold uppercase text-[#FFC220]">{customer.membership}</span></p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setIsAccountOpen(false); navigate('/login'); }}
                        className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-full font-bold transition-colors"
                      >
                        Sign In
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

      {/* BREADCRUMB */}
      <section className="bg-white border-b py-3 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/home')}>Home</span>
          <span>&gt;</span>
          <span className="cursor-pointer hover:underline">Catalog</span>
          <span>&gt;</span>
          <span className="text-gray-700">{product.brand}</span>
          <span>&gt;</span>
          <span className="text-[#0071DC] truncate max-w-xs">{product.name}</span>
        </div>
      </section>

      {/* MAIN TWO-COLUMN DETAILS GRID */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-md">
          
          {/* LEFT: Dynamic Multi-Image Gallery */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            
            {/* Main Interactive Zoom Box */}
            <div 
              className="border border-gray-100 rounded-3xl relative h-[450px] bg-gray-50 flex items-center justify-center overflow-hidden cursor-zoom-in"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <img 
                src={activeImage} 
                alt={product.name}
                className={`w-full h-full object-contain p-4 transition-transform duration-100 ${isZoomed ? 'scale-150' : 'scale-100'}`}
                style={isZoomed ? {
                  transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`
                } : undefined}
              />
              
              <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-gray-100 text-[10px] font-bold text-gray-500 flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span>Hover to Zoom Image</span>
              </div>
            </div>

            {/* Thumbnail Selection List */}
            {images.length > 0 && (
              <div className="flex space-x-3 overflow-x-auto py-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveImage(img.image_url);
                      logTelemetryEvent('product_image_change', { image_url: img.image_url, order: img.display_order });
                    }}
                    className={`w-20 h-20 bg-gray-50 border rounded-2xl overflow-hidden p-1 transition-all ${activeImage === img.image_url ? 'border-[#0071DC] ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <img src={img.image_url} alt={img.alt_text} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product specifications & actions */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#0071DC] uppercase tracking-widest">{product.brand} Brand</span>
              <h1 className="text-3xl font-black tracking-tight text-[#041E42] leading-tight">{product.name}</h1>
              
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="ml-1 font-bold text-gray-800">{product.rating}</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500 font-bold hover:underline cursor-pointer">{product.review_count.toLocaleString()} Ratings</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-[#0071DC] font-extrabold uppercase">SKU: {product.sku}</span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Price Box */}
            <div className="space-y-1 bg-[#F2F8FD] p-5 rounded-2xl border border-blue-50/50">
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-black text-[#041E42]">₹{product.sale_price.toLocaleString()}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-sm text-gray-400 line-through">MRP ₹{product.price.toLocaleString()}</span>
                    <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-md">{product.discount}% OFF</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-medium">Inclusive of all local taxes. Secured price verified by server.</p>
            </div>

            {/* Availability / Inventory / Seller */}
            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-600 bg-gray-50 p-4 rounded-2xl">
              <div>
                <p className="text-gray-400 uppercase text-[9px] tracking-wider">Availability</p>
                <p className={`mt-0.5 text-sm ${stock > 5 ? 'text-emerald-600' : stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {stock > 5 ? '✓ In Stock' : stock > 0 ? `! Only ${stock} left` : 'Out of Stock'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 uppercase text-[9px] tracking-wider">Sold By</p>
                <p className="mt-0.5 text-sm text-gray-800">{seller.name || 'NexDay Enterprise'} ({seller.rating}★)</p>
              </div>
            </div>

            {/* Pincode logistics simulator */}
            <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Estimated Delivery Date:</span>
                <span className="text-emerald-600 font-black text-sm">{deliveryEstimate}</span>
              </div>
              <form onSubmit={handlePincodeSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Enter 6-digit Pincode (e.g. 560001)"
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
                <button 
                  type="submit"
                  className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-all text-[#041E42]"
                >
                  Verify
                </button>
              </form>
            </div>

            {/* Quantity controls */}
            <div className="flex items-center space-x-4 pt-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Quantity</span>
              <div className="flex items-center space-x-3 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                <button 
                  onClick={() => setQuantity(q => Math.max(q - 1, 1))}
                  className="p-1 text-gray-500 hover:text-[#041E42]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold w-6 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => Math.min(q + 1, Math.min(stock, 10)))}
                  className="p-1 text-gray-500 hover:text-[#041E42]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Purchase action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button 
                onClick={handleAddToCart}
                disabled={stock === 0}
                className="flex-grow bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3.5 rounded-full font-black text-xs transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
              <button 
                onClick={handleBuyNow}
                disabled={stock === 0}
                className="flex-grow bg-[#FFC220] hover:bg-[#E5AC12] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-[#041E42] py-3.5 rounded-full font-black text-xs transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                <Zap className="w-4 h-4 fill-[#041E42]" />
                <span>Buy Now</span>
              </button>
              <button 
                onClick={async () => {
                  if (!session) return;
                  try {
                    await fetch('/api/wishlist', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        session_id: session.session_id,
                        customer_id: customer?.customer_id || null,
                        product_id: product.product_id,
                        category: product.category_id,
                        price: product.sale_price
                      })
                    });
                    showTemporaryAlert(`Added ${product.name} to your Wishlist!`);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="border border-gray-200 hover:bg-gray-50 p-3.5 rounded-full transition-colors flex-shrink-0"
              >
                <Heart className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Offers row checklist */}
            <div className="border-t pt-5 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">Available Offers</h4>
              <div className="space-y-2 text-xs font-semibold text-gray-700">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Bank Offer: 10% instant discount on Axis and ICICI cards.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>No-Cost EMI: Available on major Credit Cards for up to 6 months.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Free Delivery on orders above ₹499 in Bengaluru.</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SPECIFICATIONS & DETAILS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          
          {/* Specifications table */}
          <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-md space-y-4">
            <h2 className="text-xl font-black text-[#041E42] tracking-tight">Product Specifications</h2>
            <div className="border border-gray-100 rounded-2xl overflow-hidden text-xs">
              {specifications.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                      <th className="p-3.5">Specification Key</th>
                      <th className="p-3.5">Spec Value</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-gray-700 divide-y divide-gray-100">
                    {specifications.map((spec, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="p-3.5 text-[#0071DC] font-bold">{spec.spec_name}</td>
                        <td className="p-3.5">{spec.spec_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-5 text-center text-gray-400 font-medium">No specifications loaded.</div>
              )}
            </div>
            
            <div className="pt-3">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Product Description</h3>
              <p className="text-xs text-gray-600 leading-relaxed pt-1.5 font-medium">{product.description}</p>
            </div>
          </div>

          {/* FREQUENTLY BOUGHT TOGETHER PANEL */}
          <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-md space-y-6">
            <h2 className="text-sm font-black uppercase text-gray-400 tracking-widest">Frequently Bought Together</h2>
            <div className="space-y-4 text-xs font-semibold text-gray-700">
              
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-[#0071DC] font-bold truncate max-w-[200px]">{product.name}</span>
                <span className="font-black text-gray-900">₹{product.sale_price.toLocaleString()}</span>
              </div>

              {accessories.map((acc) => (
                <div key={acc.product_id} className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer truncate max-w-[220px]">
                    <input 
                      type="checkbox"
                      checked={checkedAccessories.includes(acc.product_id)}
                      onChange={() => handleAccessoryToggle(acc.product_id)}
                      className="w-4 h-4 rounded text-[#0071DC] focus:ring-[#0071DC]"
                    />
                    <span className="truncate">{acc.name}</span>
                  </label>
                  <span className="font-bold text-gray-900 flex-shrink-0">₹{acc.price.toLocaleString()}</span>
                </div>
              ))}

              <div className="bg-[#F2F8FD] p-4 rounded-xl border border-blue-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Combined Price ({1 + checkedAccessories.length} items):</span>
                  <span className="text-sm font-black text-[#0071DC]">₹{(product.sale_price + accessoriesTotal).toLocaleString()}</span>
                </div>
                <button 
                  onClick={handleAddToCart}
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider"
                >
                  Add Combined Bundle to Cart
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* CUSTOMER REVIEWS & FORM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Reviews list */}
          <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-md space-y-6">
            <h2 className="text-xl font-black text-[#041E42] tracking-tight">Customer Reviews</h2>
            
            {/* Aggregate Ratings Summary Header */}
            {reviews.length > 0 && (
              <div className="bg-[#F7F8F9] p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-center gap-6 justify-between text-xs font-semibold">
                <div className="text-center md:text-left space-y-1">
                  <div className="text-3xl font-black text-[#041E42]">{product?.rating || 0} <span className="text-sm font-bold text-gray-400">/ 5</span></div>
                  <div className="flex items-center justify-center md:justify-start text-[#FFC220] py-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(product?.rating || 0) ? 'fill-[#FFC220] text-[#FFC220]' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{reviews.length} Verified Customer Ratings</p>
                </div>
                
                {/* Distribution bars */}
                <div className="flex-grow max-w-sm w-full space-y-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviews.filter(r => Math.floor(r.rating) === stars).length;
                    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center space-x-2 text-[10px] text-gray-500 font-bold">
                        <span className="w-4 text-right">{stars}★</span>
                        <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0071DC]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev.review_id} className="py-4 first:pt-0 space-y-2 text-xs font-semibold">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < Math.floor(rev.rating) ? 'fill-amber-500 text-amber-500' : 'text-gray-200'}`} 
                            />
                          ))}
                        </div>
                        <span className="font-extrabold text-gray-800">{rev.review_title || rev.title}</span>
                      </div>
                      
                      {rev.verified_purchase ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-0.5 uppercase">
                          Verified Purchase
                        </span>
                      ) : null}
                    </div>

                    <p className="text-gray-600 leading-relaxed font-medium">{rev.review_text}</p>
                    
                    {/* Media Attachments Preview */}
                    {(rev as any).media && (rev as any).media.length > 0 && (
                      <div className="flex gap-2 pt-1.5">
                        {(rev as any).media.map((img: any, idx: number) => (
                          <div key={idx} className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden p-0.5">
                            <img src={img.file_path} alt="Review attachment" className="w-full h-full object-cover rounded-lg" />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-[9px] text-gray-400 font-medium">Submitted by Customer: {rev.customer_id.substring(0, 8)}...</p>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-gray-400 font-medium">Be the first to write a customer review!</div>
              )}
            </div>
          </div>

          {/* Review write box form */}
          <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-md h-fit">
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-4">Write a Product Review</h3>
            {isAuthenticated ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-gray-500 mb-1">Overall Rating</label>
                  <div className="flex space-x-1.5">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setFormRating(starVal)}
                        className="text-amber-500 focus:outline-none"
                      >
                        <Star className={`w-5 h-5 ${starVal <= formRating ? 'fill-amber-500 text-amber-500' : 'text-gray-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 mb-1">Review Title</label>
                  <input 
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Summarize your review"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 mb-1">Detailed Feedback</label>
                  <textarea 
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="Tell us what you liked or disliked"
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2.5 rounded-xl font-bold uppercase transition-all tracking-wider text-[10px]"
                >
                  Submit Review
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-gray-400 font-bold space-y-3">
                <p>Sign in to share your customer feedback.</p>
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-5 py-2 rounded-full text-xs font-bold"
                >
                  Login Here
                </button>
              </div>
            )}
          </div>

        </div>

        {/* SIMILAR PRODUCTS RECOMMENDED SLIDER */}
        {similarProducts.length > 0 && (
          <div className="space-y-4 pt-6">
            <h2 className="text-xl font-black text-[#041E42] tracking-tight">Similar Products You May Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {similarProducts.map((simProd) => (
                <div 
                  key={simProd.product_id}
                  onClick={() => {
                    navigate(`/product/${simProd.product_id}`);
                    logTelemetryEvent('recommendation_click', { clicked_product_id: simProd.product_id });
                  }}
                  className="bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="bg-gray-50 h-36 rounded-2xl flex items-center justify-center text-center relative overflow-hidden">
                    <span className="text-xs font-black uppercase text-gray-300 tracking-widest">{simProd.brand}</span>
                    <span className="absolute bottom-2 right-2 bg-white/80 px-2 py-0.5 rounded-md text-[9px] font-bold text-gray-500">₹{simProd.sale_price.toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{simProd.brand}</p>
                    <h3 className="text-xs font-extrabold text-gray-800 line-clamp-2 leading-tight group-hover:text-[#0071DC] transition-colors">{simProd.name}</h3>
                    <div className="flex items-center text-amber-500 text-[10px] font-bold pt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="ml-1 text-gray-700">{simProd.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#FFC220]">NexDay Store Front</h4>
            <p className="text-gray-300 text-xs">Authoritative product catalog data and specifications served securely by MySQL operational database.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#FFC220]">Telemetry Status</h4>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[10px] font-mono">
              <p>Active Session: {session?.session_id}</p>
              <p>User Authenticated: {customer ? `${customer.first_name}` : 'Guest'}</p>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-xs text-gray-400">NexDay details &bull; Real Images Catalog</p>
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
                      showTemporaryAlert('Checkout requires an account. Redirecting to Login...');
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
