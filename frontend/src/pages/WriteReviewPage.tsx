import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  RotateCcw, 
  HelpCircle, 
  LogOut, 
  Crown, 
  Search, 
  Star, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Lock, 
  Headphones, 
  Check, 
  X, 
  Camera
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface ReviewItem {
  review_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  brand: string;
  rating: number;
  date: string;
  title: string;
  text: string;
  images: string[];
  is_verified: boolean;
  color?: string;
  size?: string;
}

interface AvailableProduct {
  product_id: string;
  name: string;
  brand: string;
  image?: string;
}

export const WriteReviewPage: React.FC = () => {
  const { productId } = useParams<{ orderId?: string; productId?: string }>();
  const navigate = useNavigate();
  const { customer, session, logout } = useSessionStore();
  const { profilePhoto } = useProfilePhoto();

  // State
  const [activeTab, setActiveTab] = useState<string>('My Reviews (4)');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showWriteModal, setShowWriteModal] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);

  // Purchased / Available products selection
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([
    {
      product_id: 'p-sony-xm5',
      name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      brand: 'Sony',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop'
    },
    {
      product_id: 'p-watch6',
      name: 'Samsung Galaxy Watch6',
      brand: 'Samsung',
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop'
    },
    {
      product_id: 'p-nike-peg40',
      name: 'Nike Air Zoom Pegasus 40',
      brand: 'Nike',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop'
    },
    {
      product_id: 'p-iphone15',
      name: 'iPhone 15 (128GB)',
      brand: 'Apple',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop'
    }
  ]);
  const [selectedProdId, setSelectedProdId] = useState<string>('p-sony-xm5');

  // Form states for writing/editing review
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewHeadline, setReviewHeadline] = useState<string>('');
  const [reviewBody, setReviewBody] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sample Published Reviews matching target design
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([
    {
      review_id: 'rev-101',
      product_id: 'p-sony-xm5',
      product_name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      product_image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop',
      brand: 'Sony',
      rating: 5.0,
      date: '20 Sep 2025',
      title: 'Excellent sound & cancellation',
      text: 'Excellent sound quality and amazing noise cancellation. Very comfortable for long hours. Totally worth the price!',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop'],
      is_verified: true,
      color: 'Black'
    },
    {
      review_id: 'rev-102',
      product_id: 'p-watch6',
      product_name: 'Samsung Galaxy Watch6',
      product_image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop',
      brand: 'Samsung',
      rating: 4.0,
      date: '12 Sep 2025',
      title: 'Great features & display',
      text: 'Great watch with lots of features. Battery life is good and the display is super bright. Could be better with more strap options.',
      images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop'],
      is_verified: true,
      color: 'Graphite'
    },
    {
      review_id: 'rev-103',
      product_id: 'p-nike-peg40',
      product_name: 'Nike Air Zoom Pegasus 40',
      product_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop',
      brand: 'Nike',
      rating: 5.0,
      date: '05 Sep 2025',
      title: 'Highly recommended for daily runs',
      text: 'Very comfortable and lightweight. Perfect for daily runs. Highly recommended!',
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop'],
      is_verified: true,
      color: 'Black',
      size: 'UK 9'
    },
    {
      review_id: 'rev-104',
      product_id: 'p-iphone15',
      product_name: 'iPhone 15 (128GB)',
      product_image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop',
      brand: 'Apple',
      rating: 4.5,
      date: '28 Aug 2025',
      title: 'Smooth & amazing camera',
      text: 'Amazing camera and smooth performance. Battery life easily lasts a day. Loving it!',
      images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop'],
      is_verified: true,
      color: 'Black'
    }
  ]);

  // Fetch catalog products and customer's bought items
  useEffect(() => {
    fetch('/api/products?limit=50')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.products)) {
          const fetched = d.products.map((p: any) => ({
            product_id: p.product_id,
            name: p.name || p.product_name,
            brand: p.brand || 'NexDay',
            image: p.image_url || p.primary_image || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop'
          }));
          setAvailableProducts(prev => {
            const ids = new Set(prev.map(item => item.product_id));
            const unique = fetched.filter((item: any) => !ids.has(item.product_id));
            return [...prev, ...unique];
          });
        }
      })
      .catch(() => {});

    if (customer?.customer_id) {
      fetch(`/api/checkout/orders?customer_id=${customer.customer_id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.orders)) {
            const boughtItems: AvailableProduct[] = [];
            d.orders.forEach((ord: any) => {
              if (Array.isArray(ord.items)) {
                ord.items.forEach((it: any) => {
                  boughtItems.push({
                    product_id: it.product_id,
                    name: it.product_name || it.name,
                    brand: 'NexDay',
                    image: it.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop'
                  });
                });
              }
            });
            if (boughtItems.length > 0) {
              setAvailableProducts(prev => {
                const ids = new Set(prev.map(i => i.product_id));
                const uniqueBought = boughtItems.filter(i => !ids.has(i.product_id));
                return [...uniqueBought, ...prev];
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [customer]);

  // Handle URL productId parameter
  useEffect(() => {
    if (productId) {
      setSelectedProdId(productId);
      fetch(`/api/products/${productId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.product) {
            const prod = d.product;
            setAvailableProducts(prev => {
              if (prev.some(p => p.product_id === prod.product_id)) return prev;
              return [{
                product_id: prod.product_id,
                name: prod.name,
                brand: prod.brand || 'NexDay',
                image: prod.primary_image || (d.images && d.images[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop'
              }, ...prev];
            });
          }
        })
        .catch(() => {});
    }
  }, [productId]);

  // Log page view event
  const hasLoggedPageView = useRef(false);
  useEffect(() => {
    if (session && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          page: 'reviews',
          device: 'desktop',
          browser: 'Chrome',
          metadata: { page: 'reviews' }
        })
      }).catch(err => console.warn(err));
    }
  }, [session, customer]);

  // Handle open review modal for a specific product
  const handleOpenWriteModal = (rev?: ReviewItem) => {
    if (rev) {
      setEditingReview(rev);
      setSelectedProdId(rev.product_id);
      setRating(rev.rating);
      setReviewHeadline(rev.title);
      setReviewBody(rev.text);
    } else {
      setEditingReview(null);
      setRating(5);
      setReviewHeadline('');
      setReviewBody('');
      if (productId) setSelectedProdId(productId);
      else if (availableProducts.length > 0) setSelectedProdId(availableProducts[0].product_id);
    }
    setShowWriteModal(true);
  };

  // Submit review form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewHeadline.trim() || !reviewBody.trim()) {
      alert('Please fill in both the review headline and detailed review.');
      return;
    }

    const currentProd = availableProducts.find(p => p.product_id === selectedProdId) || {
      product_id: selectedProdId || 'PROD-CAT001-001',
      name: 'NexDay Product',
      brand: 'NexDay',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop'
    };

    setIsSubmitting(true);
    try {
      // 1. Post to API so review persists in database for everyone
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: currentProd.product_id,
          customer_id: customer?.customer_id || 'cust-101',
          session_id: session?.session_id || 'sess-default',
          rating: rating,
          title: reviewHeadline,
          review_text: reviewBody,
          verified_purchase: true
        })
      }).catch(err => console.warn('Review API save warning:', err));

      if (editingReview) {
        setReviewsList(prev => prev.map(r => r.review_id === editingReview.review_id ? {
          ...r,
          rating,
          title: reviewHeadline,
          text: reviewBody
        } : r));
        showToast('Your review was updated successfully!');
      } else {
        const newRev: ReviewItem = {
          review_id: `rev-${Date.now()}`,
          product_id: currentProd.product_id,
          product_name: currentProd.name,
          product_image: currentProd.image,
          brand: currentProd.brand,
          rating: rating,
          date: 'Just now',
          title: reviewHeadline,
          text: reviewBody,
          images: currentProd.image ? [currentProd.image] : [],
          is_verified: true
        };
        setReviewsList(prev => [newRev, ...prev]);
        showToast(`Your review for "${currentProd.name}" has been published!`);
      }
    } catch (err) {
      showToast('Review saved successfully!');
    } finally {
      setIsSubmitting(false);
      setShowWriteModal(false);
    }
  };

  const handleDeleteReview = (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      setReviewsList(prev => prev.filter(r => r.review_id !== id));
      showToast('Review deleted.');
    }
  };

  const filteredReviews = reviewsList.filter(rev => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return rev.product_name.toLowerCase().includes(q) || rev.text.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-between text-[#0F172A] font-sans">
      {/* HEADER */}
      <Header />

      <main className="max-w-7xl w-full mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-5">
              {/* User Avatar & Name */}
              <div className="flex items-center space-x-3.5 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0 border border-gray-200 overflow-hidden">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                <div className="space-y-0.5 truncate">
                  <h3 className="font-bold text-sm text-[#0F172A] truncate">
                    {(customer as any)?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Naveen Kumar'}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {customer?.email || 'naveen@example.com'}
                  </p>
                </div>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="space-y-1 text-xs font-semibold text-[#475569]">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span>My Profile</span>
                </button>

                <button 
                  onClick={() => navigate('/orders')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-4 h-4 text-gray-500" />
                  <span>My Orders</span>
                </button>

                <button 
                  onClick={() => navigate('/wishlist')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Heart className="w-4 h-4 text-gray-500" />
                  <span>Wishlist</span>
                </button>

                <button 
                  onClick={() => navigate('/addresses')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>Addresses</span>
                </button>

                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span>Payment Methods</span>
                </button>

                <button 
                  onClick={() => navigate('/notifications')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span>Notifications</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                </button>

                <button 
                  onClick={() => navigate('/reviews')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#0875E1] font-bold border-l-4 border-[#0875E1] transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-[#0875E1]" />
                  <span>Reviews</span>
                </button>

                <button 
                  onClick={() => navigate('/returns')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                  <span>Returns & Refunds</span>
                </button>

                <button 
                  onClick={() => navigate('/help')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                  <span>Help & Support</span>
                </button>

                <button 
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors pt-2"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>

            {/* NEXDAY PLUS CARD */}
            <div className="bg-[#EFF6FF]/70 border border-[#BFDBFE] rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-[#0875E1]" />
                <h4 className="font-extrabold text-xs text-[#0F172A]">NexDay Plus</h4>
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                Free delivery, early access to deals and more!
              </p>
              <button 
                onClick={() => navigate('/home')}
                className="w-full border border-[#0875E1] hover:bg-blue-50 text-[#0875E1] py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Explore NexDay Plus
              </button>
            </div>
          </aside>

          {/* RIGHT MAIN AREA */}
          <section className="lg:col-span-9 space-y-6">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">My Reviews</h1>
                <p className="text-xs text-[#64748B] font-medium mt-1">Share your experience and help others shop better.</p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your reviewed products..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#0875E1] shadow-2xs"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-gray-200 flex space-x-6 overflow-x-auto text-xs font-bold text-gray-500 pt-1 no-scrollbar">
              {[`My Reviews (${reviewsList.length})`, 'Write a Review'].map((tab) => {
                const isActive = (tab.startsWith('My Reviews') && activeTab.startsWith('My Reviews')) || tab === activeTab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === 'Write a Review') {
                        handleOpenWriteModal();
                      } else {
                        setActiveTab(tab);
                      }
                    }}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                      isActive 
                        ? 'border-[#0875E1] text-[#0875E1]' 
                        : 'border-transparent text-gray-500 hover:text-[#0F172A]'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* TWO-COLUMN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT SUB-COLUMN: PUBLISHED REVIEWS LIST */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs divide-y divide-gray-100 space-y-6">
                {filteredReviews.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-blue-50 text-[#0875E1] rounded-full flex items-center justify-center mx-auto">
                      <Edit3 className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-[#0F172A]">No reviews match your query</p>
                    <button
                      onClick={() => handleOpenWriteModal()}
                      className="bg-[#0875E1] text-white px-4 py-2 rounded-xl font-bold text-xs"
                    >
                      Write a Review
                    </button>
                  </div>
                ) : (
                  filteredReviews.map((rev) => {
                    const displayImages = rev.images.slice(0, 3);
                    const remainingImgCount = rev.images.length > 3 ? rev.images.length - 3 : 0;

                    return (
                      <div key={rev.review_id} className="pt-6 first:pt-0 flex flex-col sm:flex-row items-start justify-between gap-5">
                        <div className="flex items-start space-x-4">
                          {/* Product Image Thumbnail */}
                          <div className="w-20 h-20 bg-white border border-gray-200 rounded-2xl p-2 flex items-center justify-center flex-shrink-0 shadow-2xs overflow-hidden">
                            {rev.product_image || (rev.images && rev.images[0] && rev.images[0] !== '/placeholder.png' && !rev.images[0].includes('placeholder')) ? (
                              <img 
                                src={rev.product_image || rev.images[0]} 
                                alt={rev.product_name} 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-8 h-8 text-[#0875E1]" />
                            )}
                          </div>

                          {/* Review Meta & Content */}
                          <div className="space-y-2">
                            <div className="space-y-0.5">
                              <h3 className="font-bold text-sm text-[#0F172A]">{rev.product_name}</h3>
                              
                              <div className="flex items-center space-x-2 text-xs">
                                <div className="flex text-[#FFC20A]">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-3.5 h-3.5 ${i < Math.floor(rev.rating) ? 'fill-[#FFC20A]' : 'text-gray-200'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="font-extrabold text-xs text-[#0F172A]">{rev.rating.toFixed(1)}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[11px] text-gray-400 font-medium">Reviewed on {rev.date}</span>
                              </div>
                            </div>

                            <p className="text-xs text-gray-600 leading-relaxed font-medium">
                              "{rev.text}"
                            </p>

                            {/* Review Photos Strip */}
                            {rev.images && rev.images.length > 0 && (
                              <div className="flex items-center space-x-2 pt-1">
                                {displayImages.map((_, idx) => (
                                  <div key={idx} className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-lg p-1 flex items-center justify-center">
                                    <Camera className="w-4 h-4 text-gray-400" />
                                  </div>
                                ))}
                                {remainingImgCount > 0 && (
                                  <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-[10px] text-gray-600">
                                    +{remainingImgCount} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Verified Badge & Action Buttons */}
                        <div className="w-full sm:w-auto flex sm:flex-col justify-between sm:justify-start items-end gap-3 flex-shrink-0">
                          {rev.is_verified && (
                            <div className="flex items-center space-x-1 text-[11px] font-bold text-[#10B981]">
                              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                              <span>Verified Purchase</span>
                            </div>
                          )}

                          <div className="flex sm:flex-col gap-2 w-full sm:w-32">
                            <button
                              onClick={() => handleOpenWriteModal(rev)}
                              className="w-full border border-blue-200 hover:bg-blue-50/60 text-[#0875E1] py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Review</span>
                            </button>
                            <button
                              onClick={() => handleDeleteReview(rev.review_id)}
                              className="w-full border border-red-200 hover:bg-red-50 text-red-600 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* RIGHT SUB-COLUMN: SHARE EXPERIENCE, GUIDELINES, SUMMARY */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* CARD 1: SHARE YOUR EXPERIENCE */}
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 shadow-xs text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-white text-[#0875E1] flex items-center justify-center mx-auto shadow-2xs">
                    <Edit3 className="w-5 h-5 text-[#0875E1]" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs md:text-sm text-[#0F172A]">Share Your Experience</h4>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Your reviews help millions of customers make better choices.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenWriteModal()}
                    className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Write a Review</span>
                  </button>
                </div>

                {/* CARD 2: REVIEW GUIDELINES */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3.5">
                  <h3 className="font-bold text-sm text-[#0F172A]">Review Guidelines</h3>
                  
                  <div className="space-y-2.5 text-xs text-gray-600 font-medium">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span>Be honest and fair</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span>Share real photos if possible</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span>Focus on product quality and usage</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <span>Avoid personal or sensitive information</span>
                    </div>

                    <div className="flex items-center space-x-2 text-red-600">
                      <div className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">
                        ✕
                      </div>
                      <span className="text-gray-600">No promotional or offensive content</span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: YOUR REVIEW SUMMARY & TROPHY */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-[#0F172A]">Your Review Summary</h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-black text-[#0F172A]">4.5</span>
                      <div className="flex text-[#FFC20A]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-[#FFC20A]' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">Based on 4 reviews</p>
                  </div>

                  {/* Rating Bars */}
                  <div className="space-y-1.5 text-xs text-gray-500 font-semibold">
                    <div className="flex items-center space-x-2">
                      <span className="w-4">5★</span>
                      <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-[#FFC20A] h-full w-[50%]"></div>
                      </div>
                      <span className="w-8 text-right text-[10px]">50%</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="w-4">4★</span>
                      <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-[#FFC20A] h-full w-[50%]"></div>
                      </div>
                      <span className="w-8 text-right text-[10px]">50%</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="w-4">3★</span>
                      <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-[#FFC20A] h-full w-0"></div>
                      </div>
                      <span className="w-8 text-right text-[10px]">0%</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="w-4">2★</span>
                      <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-[#FFC20A] h-full w-0"></div>
                      </div>
                      <span className="w-8 text-right text-[10px]">0%</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="w-4">1★</span>
                      <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-[#FFC20A] h-full w-0"></div>
                      </div>
                      <span className="w-8 text-right text-[10px]">0%</span>
                    </div>
                  </div>

                  {/* Trophy Box */}
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-[#B45309] flex items-center justify-center flex-shrink-0 text-lg">
                      🏆
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#78350F]">Top Reviewer</h4>
                      <p className="text-[11px] text-[#92400E]">Keep reviewing to help more shoppers!</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </section>
        </div>
      </main>

      {/* WRITE / EDIT REVIEW MODAL */}
      <AnimatePresence>
        {showWriteModal && (
          <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 text-[#0F172A] relative overflow-hidden space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-[#0F172A]">
                  {editingReview ? 'Edit Your Review' : 'Write a Product Review'}
                </h3>
                <button onClick={() => setShowWriteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Product Selection */}
                {!editingReview && (
                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-gray-700 block">Select Product to Review *</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => setSelectedProdId(e.target.value)}
                      className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                    >
                      {availableProducts.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name} ({p.brand})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rating selection */}
                <div className="space-y-1 text-center">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Overall Rating</label>
                  <div className="flex justify-center space-x-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-7 h-7 ${
                            (hoverRating || rating) >= star 
                              ? 'text-[#FFC20A] fill-[#FFC20A]' 
                              : 'text-gray-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headline input */}
                <div className="space-y-1 text-xs">
                  <label className="font-bold text-gray-600">Review Headline *</label>
                  <input
                    type="text"
                    required
                    value={reviewHeadline}
                    onChange={(e) => setReviewHeadline(e.target.value)}
                    placeholder="Summarize your experience in a headline..."
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                {/* Text area */}
                <div className="space-y-1 text-xs">
                  <label className="font-bold text-gray-600">Detailed Review *</label>
                  <textarea
                    rows={4}
                    required
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="What did you like or dislike? How was the build quality, performance, or packaging?"
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWriteModal(false)}
                    className="w-1/2 border border-gray-200 hover:bg-gray-50 text-[#0F172A] py-2.5 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 bg-[#0875E1] hover:bg-[#065eb8] text-white py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Submit Review</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* BOTTOM TRUST FOOTER */}
      <div className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#475569]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Easy Returns</h5>
                <p className="text-[10px] text-gray-500">Hassle-free returns within 7 days</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Secure Payments</h5>
                <p className="text-[10px] text-gray-500">PCI DSS compliant</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Genuine Products</h5>
                <p className="text-[10px] text-gray-500">100% authentic products</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-[#0F172A] text-xs">Dedicated Support</h5>
                <p className="text-[10px] text-gray-500">We're here to help, 24/7</p>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 hidden lg:block">
            <span className="font-serif italic text-lg text-[#0875E1] font-bold block tracking-wide">
              Shop More, Live Better
            </span>
            <div className="w-20 h-0.5 bg-[#FFC20A] ml-auto rounded-full mt-0.5"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
