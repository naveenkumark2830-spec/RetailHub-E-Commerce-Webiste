import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  ShoppingBag, 
  Warehouse, 
  TrendingUp, 
  X,
  FolderOpen,
  Eye,
  AlertTriangle,
  Layers,
  Star,
  CheckCircle,
  Cpu
} from 'lucide-react';

interface ReviewSummary {
  review_id: string;
  customer_id: string;
  order_id: string;
  product_id: string;
  rating: number;
  review_title: string;
  review_text: string;
  verified_purchase: number | boolean;
  review_status: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  product_name: string;
  sku?: string;
}

interface ReviewAnalytics {
  avgRating: number;
  totalCount: number;
  pendingCount: number;
  flaggedCount: number;
  verifiedPct: number;
  distribution: Record<number, number>;
}

export default function AdminReviewsPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [search, setSearch] = useState<string>('');
  const [rating, setRating] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  
  // Modals / Detail View
  const [detail, setDetail] = useState<ReviewSummary | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchReviews = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      let url = `/api/admin/reviews?search=${encodeURIComponent(search)}`;
      if (rating) url += `&rating=${rating}`;
      if (status) url += `&status=${status}`;

      const res = await fetch(url, { headers: { 'Authorization': token } });
      const data = await res.json();
      if (res.ok) {
        setReviews(data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch reviews.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/reviews/analytics', { headers: { 'Authorization': token } });
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load review analytics:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');

    if (!token || !adminData) {
      localStorage.clear();
      navigate('/admin/login');
      return;
    }

    setAdmin(JSON.parse(adminData));
    fetchReviews();
    fetchAnalytics();
  }, [navigate, search, rating, status]);

  const handleUpdateStatus = async (reviewId: string, newStatus: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setStatusLoading(true);
      const res = await fetch(`/api/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status.');

      showToast(`Review ${newStatus.toLowerCase()} successfully.`, 'success');
      setIsDetailOpen(false);
      fetchReviews();
      fetchAnalytics();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex space-x-0.5 text-amber-500">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < count ? 'fill-amber-500' : 'text-gray-200'}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* HEADER */}
      <header className="bg-[#0071DC] text-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-black tracking-tight">NexDay</span>
            <span className="text-[9px] font-bold tracking-widest text-[#FFC220] uppercase font-mono pl-0.5">Admin Portal</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1.5 text-xs font-bold bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Customer View</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 text-xs font-bold border border-white/20 bg-blue-900/30 hover:bg-blue-900/50 text-white px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-gray-250 flex flex-col justify-between flex-shrink-0">
          <div className="p-4 space-y-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-3">OPERATIONS DESK</p>

            <nav className="space-y-1">
              {[
                { name: 'Simulator', icon: <Cpu className="w-4 h-4" />, path: '/admin/simulator' },
                { name: 'Products', icon: <ShoppingBag className="w-4 h-4" />, path: '/admin/products' },
                { name: 'Categories', icon: <FolderOpen className="w-4 h-4" />, path: '/admin/categories' },
                { name: 'Operators', icon: <User className="w-4 h-4" />, path: '/admin/operators' },
                { name: 'Inventory', icon: <Warehouse className="w-4 h-4" />, path: '/admin/inventory' },
                { name: 'Orders', icon: <TrendingUp className="w-4 h-4" />, path: '/admin/orders' },
                { name: 'Customers', icon: <User className="w-4 h-4" />, path: '/admin/customers' },
                { name: 'Reviews', icon: <Eye className="w-4 h-4" />, path: '/admin/reviews' },
                { name: 'Coupons', icon: <Layers className="w-4 h-4" />, path: '/admin/coupons' },
                { name: 'Warehouses', icon: <Warehouse className="w-4 h-4" />, path: '/admin/warehouses' }
              ].map((item, idx) => (
                <div
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    idx === 7
                      ? 'bg-blue-50 text-[#0071DC] border-l-4 border-[#0071DC] rounded-l-none'
                      : 'text-gray-600 hover:text-[#0071DC] hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
                <User className="w-5 h-5 text-[#0071DC]" />
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-bold text-[#041E42] truncate">{admin?.first_name} {admin?.last_name}</p>
                <span className="text-[9px] font-bold text-[#041E42] uppercase tracking-wide bg-[#FFC220] px-2.5 py-0.5 rounded-full">
                  {admin?.role_id}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-grow p-8 space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Review Management</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Moderate customer reviews, track average ratings, and handle flagged items</p>
          </div>

          {/* Stats Bar */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Reviews</span>
                <span className="text-2xl font-black text-[#041E42] block mt-1">{analytics.totalCount.toLocaleString()}</span>
                <span className="text-xs text-emerald-600 font-bold block mt-1">Average rating: {analytics.avgRating} ★</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pending Moderation</span>
                <span className="text-2xl font-black text-amber-500 block mt-1">{analytics.pendingCount}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Awaiting approval status</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Flagged Reports</span>
                <span className="text-2xl font-black text-red-500 block mt-1">{analytics.flaggedCount}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Needs review verification</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Verified Purchase Rate</span>
                <span className="text-2xl font-black text-blue-600 block mt-1">{analytics.verifiedPct}%</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Completed order validations</span>
              </div>
            </div>
          )}

          {/* Analytics Graphs (Rating Distribution) */}
          {analytics && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-[#041E42] tracking-wider border-b border-gray-100 pb-2">Rating Distribution</h3>
              <div className="space-y-2 max-w-lg">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = analytics.distribution[stars] || 0;
                  const pct = analytics.totalCount > 0 ? (count / analytics.totalCount) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center text-xs text-gray-600">
                      <span className="w-12 font-bold">{stars} Stars</span>
                      <div className="flex-grow bg-gray-100 h-2 rounded-full overflow-hidden mx-3">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="w-12 text-right text-gray-400 font-bold">{count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters & Actions Panel */}
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-wrap gap-4 items-center">
            {/* Search Box */}
            <div className="flex-grow max-w-sm relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Review / Product / Customer..."
                className="w-full bg-gray-50 text-[#041E42] pl-4 pr-10 py-2.5 rounded-full border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-medium text-xs shadow-inner"
              />
            </div>

            {/* Rating Filter */}
            <div className="w-36">
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full bg-gray-50 text-[#041E42] px-3 py-2.5 rounded-full border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-bold text-xs cursor-pointer shadow-sm"
              >
                <option value="">Rating [All]</option>
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-gray-50 text-[#041E42] px-3 py-2.5 rounded-full border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all font-bold text-xs cursor-pointer shadow-sm"
              >
                <option value="">Status [All]</option>
                <option value="PENDING">PENDING</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="HIDDEN">HIDDEN</option>
                <option value="FLAGGED">FLAGGED</option>
              </select>
            </div>
          </div>

          {/* Reviews Table */}
          <div className="bg-white border border-gray-250 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[#041E42] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-4 px-6">Review ID</th>
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">Rating</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Verified</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs font-semibold text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : reviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 font-bold uppercase tracking-wider">No reviews found</td>
                    </tr>
                  ) : (
                    reviews.map((rev) => (
                      <tr key={rev.review_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-[#0071DC]">{rev.review_id}</td>
                        <td className="py-4 px-6 font-bold truncate max-w-xs">{rev.product_name}</td>
                        <td className="py-4 px-6">{renderStars(rev.rating)}</td>
                        <td className="py-4 px-6 font-mono text-gray-500">{rev.customer_id}</td>
                        <td className="py-4 px-6">
                          {Number(rev.verified_purchase) === 1 ? (
                            <span className="text-emerald-600 font-black flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> YES
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">NO</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase ${
                            rev.review_status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            rev.review_status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            rev.review_status === 'FLAGGED' ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {rev.review_status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => { setDetail(rev); setIsDetailOpen(true); }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider transition-all"
                          >
                            Moderate
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* DETAIL MODAL DRAWER */}
      <AnimatePresence>
        {isDetailOpen && detail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-[500px] border-l border-gray-250 shadow-2xl flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>
              
              {/* Header */}
              <div className="p-6 border-b border-gray-150 flex items-center justify-between mt-1.5">
                <div>
                  <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Review Details</h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{detail.review_id}</span>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6 text-xs font-semibold">
                <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Product Name</span>
                      <span className="text-[#041E42] font-black">{detail.product_name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Product SKU</span>
                      <span className="text-gray-600 font-mono">{detail.sku || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Customer</span>
                      <span className="text-[#041E42]">{detail.first_name} {detail.last_name} ({detail.customer_id})</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Order ID</span>
                      <span className="text-gray-600 font-mono">{detail.order_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Verified Purchase</span>
                      <span className="flex items-center gap-1 mt-0.5">
                        {Number(detail.verified_purchase) === 1 ? (
                          <span className="text-emerald-600 font-black flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> YES
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">NO</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Rating Given</span>
                      <span className="block mt-0.5">{renderStars(detail.rating)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Review Title</span>
                  <p className="text-sm font-black text-[#041E42]">"{detail.review_title}"</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Review Content</span>
                  <div className="bg-gray-50 border border-gray-200 rounded-3xl p-4 text-gray-700 leading-relaxed">
                    {detail.review_text}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Moderation History</span>
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 text-gray-500">
                    <span>Submitted on:</span>
                    <span>{new Date(detail.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action moderation buttons */}
              <div className="p-6 border-t border-gray-150 bg-gray-50 flex gap-3">
                <button
                  onClick={() => handleUpdateStatus(detail.review_id, 'PUBLISHED')}
                  disabled={statusLoading}
                  className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px]"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleUpdateStatus(detail.review_id, 'REJECTED')}
                  disabled={statusLoading}
                  className="flex-grow bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px]"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleUpdateStatus(detail.review_id, 'HIDDEN')}
                  disabled={statusLoading}
                  className="flex-grow bg-gray-200 hover:bg-gray-300 text-gray-700 font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px]"
                >
                  Hide
                </button>
                <button
                  onClick={() => handleUpdateStatus(detail.review_id, 'FLAGGED')}
                  disabled={statusLoading}
                  className="flex-grow bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Flag
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-100 p-4 rounded-2xl shadow-xl flex items-center space-x-2 border font-bold text-xs ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
