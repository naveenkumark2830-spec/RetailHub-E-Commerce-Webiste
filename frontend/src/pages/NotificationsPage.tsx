import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';
import { 
  Bell, 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  Tag, 
  User, 
  CheckCircle, 
  ArrowLeft,
  Calendar,
  ChevronRight
} from 'lucide-react';

interface Notification {
  notification_id: string;
  customer_id: string;
  notification_type: string;
  notification_category: 'TRANSACTIONAL' | 'MARKETING';
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: number | boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);

  // Retrieve customer info from global Session Store
  const { customer, session } = useSessionStore();
  const customerId = customer?.customer_id || 'CUST87527';
  const sessionId = session?.session_id || 'sess_default';

  useEffect(() => {
    fetchNotifications();
  }, [customerId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications/customer/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`/api/notifications/customer/${customerId}/read-all`, {
        method: 'POST'
      });
      if (res.ok) {
        // Optimistically update all to read
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // 1. Mark as read on backend
    try {
      await fetch(`/api/notifications/customer/${customerId}/read/${notif.notification_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }

    // 2. Log click event
    try {
      await fetch('/api/notifications/log-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          sessionId,
          notificationId: notif.notification_id,
          notificationType: notif.notification_type,
          referenceType: notif.reference_type,
          referenceId: notif.reference_id
        })
      });
    } catch (err) {
      console.error('Error logging click event:', err);
    }

    // Update state locally
    setNotifications(prev => prev.map(n => 
      n.notification_id === notif.notification_id ? { ...n, is_read: true } : n
    ));

    // 3. Deep link routing
    if (notif.reference_type === 'ORDER' && notif.reference_id) {
      navigate('/orders');
    } else if (notif.reference_type === 'RETURN') {
      navigate('/profile');
    } else if (notif.reference_type === 'REFUND') {
      navigate('/profile');
    } else {
      // General fallbacks
      navigate('/profile');
    }
  };

  // Get Notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CONFIRMED':
      case 'ORDER_CANCELLED':
      case 'RETURN_REQUESTED':
      case 'RETURN_APPROVED':
      case 'RETURN_REJECTED':
      case 'RETURN_PICKED_UP':
      case 'RETURN_RECEIVED':
        return <ShoppingBag className="w-5 h-5 text-blue-500" />;
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
      case 'REFUND_INITIATED':
      case 'REFUND_SUCCESS':
      case 'REFUND_FAILED':
        return <CreditCard className="w-5 h-5 text-emerald-500" />;
      case 'ORDER_PACKED':
      case 'ORDER_SHIPPED':
      case 'OUT_FOR_DELIVERY':
      case 'ORDER_DELIVERED':
        return <Truck className="w-5 h-5 text-amber-500" />;
      case 'PROMOTION':
      case 'COUPON':
        return <Tag className="w-5 h-5 text-purple-500" />;
      case 'PROFILE_UPDATED':
      case 'ADDRESS_UPDATED':
        return <User className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  // Filter based on selected category tab
  const getFilteredNotifications = () => {
    if (activeTab === 'All') return notifications;
    return notifications.filter(n => {
      const type = n.notification_type;
      if (activeTab === 'Orders') {
        return ['ORDER_CONFIRMED', 'ORDER_CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_PICKED_UP', 'RETURN_RECEIVED'].includes(type);
      }
      if (activeTab === 'Payments') {
        return ['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'REFUND_INITIATED', 'REFUND_SUCCESS', 'REFUND_FAILED'].includes(type);
      }
      if (activeTab === 'Delivery') {
        return ['ORDER_PACKED', 'ORDER_SHIPPED', 'OUT_FOR_DELIVERY', 'ORDER_DELIVERED'].includes(type);
      }
      if (activeTab === 'Offers') {
        return ['PROMOTION', 'COUPON'].includes(type);
      }
      if (activeTab === 'Account') {
        return ['PROFILE_UPDATED', 'ADDRESS_UPDATED'].includes(type);
      }
      return true;
    });
  };

  const filteredNotifs = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 6000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* NAVBAR */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">RetailHub</span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              <span>My Account</span>
            </button>
            <button 
              onClick={() => navigate('/home')}
              className="flex items-center space-x-1 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Shop</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl w-full mx-auto flex-grow p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Notifications</h1>
            <p className="text-slate-400 mt-1">
              You have <span className="text-blue-400 font-semibold">{unreadCount} unread</span> alerts
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="self-start flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-bold px-4 py-2.5 rounded-lg border border-slate-700/50 transition-all shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* TABS FILTER */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          {['All', 'Orders', 'Payments', 'Delivery', 'Offers', 'Account'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* LIST CONTAINER */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-medium">Fetching alerts...</p>
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-12 text-center">
              <div className="bg-slate-850 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                <Bell className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-white">No notifications here</h3>
              <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                Any transactional status changes or offers relating to your profile will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {filteredNotifs.map((notif) => (
                  <motion.div
                    key={notif.notification_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative flex items-start space-x-4 p-4 rounded-xl border transition-all cursor-pointer ${
                      !notif.is_read
                        ? 'bg-slate-800/90 border-blue-500/30 hover:border-blue-500/50 hover:bg-slate-750'
                        : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-700/50 hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Unread Indicator Dot */}
                    {!notif.is_read && (
                      <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></span>
                    )}

                    {/* Left Icon Badge */}
                    <div className="bg-slate-850 p-3 rounded-lg border border-slate-700/50 flex-shrink-0 group-hover:scale-105 transition-transform">
                      {getNotificationIcon(notif.notification_type)}
                    </div>

                    {/* Content Details */}
                    <div className="flex-grow space-y-1 pr-6">
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-bold tracking-tight ${!notif.is_read ? 'text-white' : 'text-slate-200'}`}>
                          {notif.title}
                        </h4>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          notif.notification_category === 'TRANSACTIONAL'
                            ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                            : 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
                        }`}>
                          {notif.notification_category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{notif.message}</p>
                      
                      <div className="flex items-center space-x-3 pt-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(notif.created_at)}</span>
                        </span>
                        {notif.reference_id && (
                          <span className="text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/30 font-semibold">
                            #{notif.reference_id}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chevron Arrow */}
                    <div className="self-center text-slate-500 group-hover:text-white transition-colors pl-2">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
