import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Star, 
  Camera, 
  RefreshCw, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

interface ProductInfo {
  product_id: string;
  name: string;
  brand: string;
  image_url: string;
  category: string;
}

interface OrderItemInfo {
  order_item_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export const WriteReviewPage: React.FC = () => {
  const { orderId, productId } = useParams<{ orderId: string; productId: string }>();
  const navigate = useNavigate();
  const { customer, session } = useSessionStore();
  const hasLoggedPageView = useRef(false);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [orderItem, setOrderItem] = useState<OrderItemInfo | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Form states
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mockImages, setMockImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Order and Product Context to determine verified eligibility
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await fetch(`/api/returns/by-order/${orderId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMsg(data.error || 'Failed to verify purchase context.');
          setIsLoading(false);
          return;
        }

        const details = data.orderDetails;
        // Find matching item
        const matchedItem = details.items.find((item: any) => item.product_id === productId);
        if (!matchedItem) {
          setErrorMsg('You can only review products purchased in this order.');
          setIsLoading(false);
          return;
        }

        // Fetch product information
        const prodResponse = await fetch(`/api/products/${productId}`);
        const prodData = await prodResponse.json();
        
        if (prodResponse.ok && prodData.success) {
          setProduct(prodData.product);
        } else {
          // Fallback metadata if API fails
          setProduct({
            product_id: productId || 'PROD',
            name: matchedItem.product_name,
            brand: 'RetailHub Partner',
            image_url: '/assets/placeholder.jpg',
            category: matchedItem.category || 'General'
          });
        }

        setOrderItem(matchedItem);
        setIsVerified(details.delivery_status === 'DELIVERED');
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load review context:', err);
        setErrorMsg('Network error. Failed to load purchase validation.');
        setIsLoading(false);
      }
    };

    fetchContext();
  }, [orderId, productId]);

  // Telemetry page view
  useEffect(() => {
    if (!isLoading && product && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session?.session_id || 'sess_ex3mk4wa',
          customer_id: customer?.customer_id || 'guest',
          user_type: customer ? 'registered' : 'guest',
          page: 'write_review',
          context: {
            country: customer?.country || 'India',
            state: customer?.state || 'Karnataka',
            city: customer?.city || 'Bengaluru',
            device: 'desktop',
            browser: 'Chrome'
          },
          metadata: {
            order_id: orderId,
            product_id: productId,
            verified_purchase: isVerified
          }
        })
      }).catch(err => console.error('Failed to log review page view telemetry:', err));
    }
  }, [isLoading, product]);

  // Mock Photo Uploader
  const handleUploadPhoto = () => {
    setIsUploading(true);
    setTimeout(() => {
      setMockImages(prev => [
        ...prev,
        `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&q=80`
      ]);
      setIsUploading(false);
    }, 1000);
  };

  // Submit Review Form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !orderItem || !product) return;

    if (rating === 0) {
      alert('Please select a star rating between 1 and 5.');
      return;
    }
    if (!title.trim() || !text.trim()) {
      alert('Please fill out both review title and review text details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviews/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          order_id: orderId,
          order_item_id: orderItem.order_item_id,
          product_id: productId,
          rating: rating,
          review_title: title,
          review_text: text,
          file_paths: mockImages
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessToast('Your review has been successfully submitted!');
        setTimeout(() => {
          setSuccessToast(null);
          navigate('/orders');
        }, 1500);
      } else {
        alert(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to post review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42]">
      
      {/* HEADER NAVBAR */}
      <header className="bg-[#0071DC] text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => navigate('/home')} 
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">NexDay</span>
          </div>

          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-2xl w-full mx-auto flex-grow p-6 space-y-6">
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : errorMsg ? (
          <div className="bg-white p-12 rounded-3xl border border-red-100 text-center space-y-4 shadow-sm">
            <div className="text-red-500 w-16 h-16 mx-auto flex items-center justify-center bg-red-50 rounded-full">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-700">Write review not available</h3>
            <p className="text-xs text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">{errorMsg}</p>
            <button 
              onClick={() => navigate('/orders')}
              className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full font-bold text-xs transition-colors"
            >
              Back to Orders
            </button>
          </div>
        ) : product ? (
          
          <div className="space-y-6">
            
            {/* INTRO PRODUCT SNAPSHOT */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 p-1">
                <img 
                  src={product.image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80'} 
                  alt={product.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80';
                  }}
                />
              </div>
              <div className="flex-grow">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{product.brand}</span>
                <h2 className="text-sm font-bold text-[#041E42] mt-0.5 leading-snug">{product.name}</h2>
                <div className="flex items-center space-x-2 mt-1.5">
                  {isVerified ? (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-1">
                      <CheckCircle className="w-2.5 h-2.5" />
                      <span>Verified Purchase</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      Unverified Purchase
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* REVIEW FORM */}
            <form onSubmit={handleSubmitReview} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-center border-b border-gray-50 pb-4">WRITE A REVIEW</h3>

              {/* RATING SELECTION (STARS) */}
              <div className="space-y-3 text-center">
                <label className="text-xs font-bold text-[#041E42] uppercase tracking-wide block">Your Rating</label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-gray-200 hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star 
                          className={`w-8 h-8 ${active ? 'fill-[#FFC220] text-[#FFC220]' : 'text-gray-200'}`} 
                        />
                      </button>
                    );
                  })}
                </div>
                {rating > 0 && (
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    {rating === 5 && 'Excellent!'}
                    {rating === 4 && 'Good'}
                    {rating === 3 && 'Average'}
                    {rating === 2 && 'Below Average'}
                    {rating === 1 && 'Poor'}
                  </p>
                )}
              </div>

              {/* REVIEW TITLE */}
              <div className="space-y-2 pt-4 border-t border-gray-50">
                <label className="text-xs font-bold text-[#041E42] uppercase tracking-wide block">Review Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your review in a short title..."
                  className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] placeholder-gray-400 focus:outline-none focus:border-[#0071DC]"
                />
              </div>

              {/* REVIEW BODY TEXT */}
              <div className="space-y-2 pt-4 border-t border-gray-50">
                <label className="text-xs font-bold text-[#041E42] uppercase tracking-wide block">Your Review</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share your detailed experience using this product. What did you like or dislike?"
                  rows={6}
                  className="w-full bg-[#F7F8F9] border border-gray-200 rounded-2xl px-4 py-3 text-xs font-medium text-[#041E42] placeholder-gray-400 focus:outline-none focus:border-[#0071DC] resize-none"
                />
              </div>

              {/* IMAGES MOCK UPLOADER */}
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <label className="text-xs font-bold text-[#041E42] uppercase tracking-wide block">Add Photos</label>
                <p className="text-[10px] text-gray-400 font-medium">Add photos to show what the product looks like in reality.</p>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={isUploading}
                    className="w-20 h-20 border border-dashed border-gray-300 rounded-2xl flex flex-col justify-center items-center text-gray-400 hover:border-[#0071DC] hover:text-[#0071DC] transition-colors focus:outline-none disabled:opacity-50"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mb-1" />
                        <span className="text-[9px] font-bold uppercase">Add Photo</span>
                      </>
                    )}
                  </button>

                  {mockImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <img src={img} alt="Review attachment preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setMockImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-[#041E42]/80 text-white rounded-full p-1 hover:bg-red-500 transition-colors focus:outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-6 text-center border-t border-gray-50">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-8 py-3 rounded-full font-black text-xs transition-colors shadow-md flex items-center space-x-2 mx-auto focus:outline-none disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Posting review...</span>
                    </>
                  ) : (
                    <span>SUBMIT REVIEW</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        ) : null}

      </main>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-6 text-center text-xs font-bold">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. All transactions are securely routed through mock banking interfaces.</p>
      </footer>

      {/* SUCCESS TOAST MESSAGE */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 bg-[#041E42] text-white border border-[#FFC220] px-6 py-4.5 rounded-2xl shadow-xl z-50 flex items-center space-x-3 text-xs"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-1.5 rounded-full">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
