import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { 
  Bell, 
  CreditCard, 
  Truck, 
  Tag, 
  User, 
  Package, 
  Heart, 
  MapPin, 
  ShieldCheck, 
  RotateCcw, 
  HelpCircle, 
  LogOut, 
  Crown, 
  CheckCircle2, 
  MoreVertical, 
  Star, 
  Info, 
  Headphones, 
  Lock, 
  Check
} from 'lucide-react';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface NotificationItem {
  notification_id: string;
  type: 'ORDER_SHIPPED' | 'PAYMENT_SUCCESS' | 'SPECIAL_OFFER' | 'ORDER_CONFIRMED' | 'REVIEW_PROMPT' | 'PRICE_DROP' | 'ACCOUNT_UPDATE' | 'WELCOME';
  category: 'Orders' | 'Offers' | 'Account' | 'Updates';
  title: string;
  message: string;
  time: string;
  is_read: boolean;
  reference_id?: string;
  iconType: 'truck' | 'success' | 'tag' | 'box' | 'star' | 'bell' | 'info' | 'crown';
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { customer, logout } = useSessionStore();
  const { profilePhoto } = useProfilePhoto();

  // Active filter tab
  const [activeTab, setActiveTab] = useState<string>('All (12)');

  // Notification Settings Toggles
  const [orderUpdates, setOrderUpdates] = useState<boolean>(true);
  const [offersDeals, setOffersDeals] = useState<boolean>(true);
  const [accountAlerts, setAccountAlerts] = useState<boolean>(true);
  const [priceDropAlerts, setPriceDropAlerts] = useState<boolean>(true);
  const [newsletter, setNewsletter] = useState<boolean>(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sample Notifications list matching the target design
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      notification_id: 'notif-1',
      type: 'ORDER_SHIPPED',
      category: 'Orders',
      title: 'Order Shipped',
      message: 'Your order #ND20250915-782347 has been shipped and is on the way!',
      time: '2 hours ago',
      is_read: false,
      reference_id: 'ND20250915-782347',
      iconType: 'truck'
    },
    {
      notification_id: 'notif-2',
      type: 'PAYMENT_SUCCESS',
      category: 'Orders',
      title: 'Payment Successful',
      message: 'Your payment of ₹29,990 for order #ND20250915-782347 was successful.',
      time: '5 hours ago',
      is_read: false,
      reference_id: 'ND20250915-782347',
      iconType: 'success'
    },
    {
      notification_id: 'notif-3',
      type: 'SPECIAL_OFFER',
      category: 'Offers',
      title: 'Special Offer for You',
      message: 'Get up to 50% off on Electronics! Limited time deal.',
      time: '1 day ago',
      is_read: false,
      iconType: 'tag'
    },
    {
      notification_id: 'notif-4',
      type: 'ORDER_CONFIRMED',
      category: 'Orders',
      title: 'Order Confirmed',
      message: 'Your order #ND20250915-782347 has been confirmed.',
      time: '1 day ago',
      is_read: false,
      reference_id: 'ND20250915-782347',
      iconType: 'box'
    },
    {
      notification_id: 'notif-5',
      type: 'REVIEW_PROMPT',
      category: 'Updates',
      title: 'Review Your Purchase',
      message: 'How was your experience with Sony WH-1000XM5? Share your review!',
      time: '2 days ago',
      is_read: false,
      iconType: 'star'
    },
    {
      notification_id: 'notif-6',
      type: 'PRICE_DROP',
      category: 'Offers',
      title: 'Price Drop Alert',
      message: 'The price of iPhone 15 (128GB) has dropped by 10%! Shop now!',
      time: '3 days ago',
      is_read: false,
      iconType: 'bell'
    },
    {
      notification_id: 'notif-7',
      type: 'ACCOUNT_UPDATE',
      category: 'Account',
      title: 'Account Update',
      message: 'Your email address has been successfully updated.',
      time: '5 days ago',
      is_read: false,
      iconType: 'info'
    },
    {
      notification_id: 'notif-8',
      type: 'WELCOME',
      category: 'Account',
      title: 'Welcome to NexDay!',
      message: 'Thanks for joining NexDay. Start exploring amazing deals!',
      time: '1 week ago',
      is_read: false,
      iconType: 'crown'
    }
  ]);

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    showToast('All notifications marked as read');
  };

  // Toggle single notification read
  const handleNotificationClick = (id: string) => {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
  };

  // Filter notifications based on tab
  const filteredNotifs = notifications.filter(n => {
    if (activeTab.startsWith('All')) return true;
    if (activeTab.startsWith('Orders')) return n.category === 'Orders';
    if (activeTab.startsWith('Offers')) return n.category === 'Offers';
    if (activeTab.startsWith('Account')) return n.category === 'Account';
    if (activeTab.startsWith('Updates')) return n.category === 'Updates';
    return true;
  });

  const getIcon = (type: NotificationItem['iconType']) => {
    switch (type) {
      case 'truck':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        );
      case 'success':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'tag':
        return (
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        );
      case 'box':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
        );
      case 'star':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5" />
          </div>
        );
      case 'bell':
        return (
          <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
      case 'info':
        return (
          <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
      case 'crown':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5" />
          </div>
        );
    }
  };

  const tabsList = ['All (12)', 'Orders (5)', 'Offers (3)', 'Account (2)', 'Updates (2)'];

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#0F172A] flex flex-col justify-between font-sans">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* 1. LEFT SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-5">
              {/* User Info */}
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

              {/* Sidebar Links */}
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
                  onClick={() => navigate('/profile/addresses')}
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
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#0875E1] font-bold border-l-4 border-[#0875E1] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-[#0875E1]" />
                    <span>Notifications</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                </button>

                <button 
                  onClick={() => navigate('/reviews')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-gray-500" />
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

            {/* NEXDAY PLUS PROMO CARD */}
            <div className="bg-[#EFF6FF]/70 border border-[#BFDBFE] rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#0875E1] text-white flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs text-[#0F172A]">NexDay Plus</h4>
              </div>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                Free delivery, early access to deals and more!
              </p>
              <button 
                onClick={() => navigate('/profile')}
                className="w-full border border-[#0875E1] hover:bg-blue-50 text-[#0875E1] py-2 rounded-xl font-bold text-xs transition-colors bg-white shadow-2xs"
              >
                Explore NexDay Plus
              </button>
            </div>
          </aside>

          {/* 2. CENTER MAIN COLUMN: NOTIFICATIONS CONTENT */}
          <section className="lg:col-span-6 space-y-6">
            
            {/* Title Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-[#0F172A]">Notifications</h1>
                <p className="text-xs text-gray-500 font-medium">Stay updated with your orders, offers and more.</p>
              </div>

              <button
                onClick={handleMarkAllRead}
                className="border border-[#0875E1] text-[#0875E1] hover:bg-blue-50 bg-white px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5 text-[#0875E1]" />
                <span>Mark All as Read</span>
              </button>
            </div>

            {/* Tabs Filter Strip */}
            <div className="flex space-x-6 border-b border-gray-200 text-xs font-bold">
              {tabsList.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
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

            {/* NOTIFICATIONS LIST CONTAINER */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs divide-y divide-gray-100 space-y-4">
              {filteredNotifs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Bell className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-[#0F172A]">No notifications match this category</p>
                </div>
              ) : (
                filteredNotifs.map((notif) => (
                  <div 
                    key={notif.notification_id}
                    onClick={() => handleNotificationClick(notif.notification_id)}
                    className="pt-4 first:pt-0 flex items-start justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-start space-x-3.5">
                      {getIcon(notif.iconType)}
                      <div className="space-y-0.5 pt-0.5">
                        <h4 className="font-bold text-sm text-[#0F172A] group-hover:text-[#0875E1] transition-colors">
                          {notif.title}
                        </h4>
                        <p className="text-xs text-gray-600 font-medium leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 pt-0.5">
                      <span className="text-[11px] text-gray-400 font-medium">{notif.time}</span>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#0875E1]"></span>
                      )}
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </section>

          {/* 3. RIGHT COLUMN: NOTIFICATION SETTINGS & WIDGETS */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* WIDGET 1: NOTIFICATION SETTINGS */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Notification Settings</h3>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Choose what notifications you want to receive.</p>
              </div>

              <div className="space-y-3.5 text-xs">
                
                {/* Order Updates */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0F172A]">Order Updates</h5>
                      <p className="text-[10px] text-gray-400 leading-tight">Order confirmations, shipping updates, delivery alerts</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={orderUpdates}
                    onChange={(e) => setOrderUpdates(e.target.checked)}
                    className="w-4 h-4 text-[#0875E1] rounded focus:ring-blue-500 cursor-pointer mt-1"
                  />
                </div>

                {/* Offers & Deals */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Tag className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0F172A]">Offers & Deals</h5>
                      <p className="text-[10px] text-gray-400 leading-tight">Discounts, promotions, seasonal sales</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={offersDeals}
                    onChange={(e) => setOffersDeals(e.target.checked)}
                    className="w-4 h-4 text-[#0875E1] rounded focus:ring-blue-500 cursor-pointer mt-1"
                  />
                </div>

                {/* Account Alerts */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0F172A]">Account Alerts</h5>
                      <p className="text-[10px] text-gray-400 leading-tight">Security, account changes</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={accountAlerts}
                    onChange={(e) => setAccountAlerts(e.target.checked)}
                    className="w-4 h-4 text-[#0875E1] rounded focus:ring-blue-500 cursor-pointer mt-1"
                  />
                </div>

                {/* Price Drop Alerts */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bell className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0F172A]">Price Drop Alerts</h5>
                      <p className="text-[10px] text-gray-400 leading-tight">Get notified when prices drop</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={priceDropAlerts}
                    onChange={(e) => setPriceDropAlerts(e.target.checked)}
                    className="w-4 h-4 text-[#0875E1] rounded focus:ring-blue-500 cursor-pointer mt-1"
                  />
                </div>

                {/* Newsletter */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Info className="w-3 h-3" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0F172A]">Newsletter</h5>
                      <p className="text-[10px] text-gray-400 leading-tight">Product recommendations, tips and updates</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newsletter}
                    onChange={(e) => setNewsletter(e.target.checked)}
                    className="w-4 h-4 text-[#0875E1] rounded focus:ring-blue-500 cursor-pointer mt-1"
                  />
                </div>

              </div>

              <button
                onClick={() => showToast('Notification settings saved!')}
                className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs mt-2"
              >
                Save Preferences
              </button>
            </div>

            {/* WIDGET 2: NEED HELP? */}
            <div className="bg-[#EFF6FF]/70 border border-[#BFDBFE] rounded-2xl p-5 shadow-xs space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0875E1] flex items-center justify-center mx-auto">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">Need Help?</h4>
                <p className="text-[11px] text-gray-500 font-medium">Our support team is here for you.</p>
              </div>
              <button
                onClick={() => navigate('/help')}
                className="w-full border border-blue-200 hover:bg-blue-50 text-[#0875E1] bg-white py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs"
              >
                Contact Support
              </button>
            </div>

            {/* WIDGET 3: NEXDAY PLUS CARD */}
            <div className="bg-[#EFF6FF]/70 border border-[#BFDBFE] rounded-2xl p-5 shadow-xs space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-[#0875E1] text-white flex items-center justify-center mx-auto">
                <Crown className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">NexDay Plus</h4>
                <p className="text-[11px] text-gray-500 font-medium">
                  Get exclusive offers, early access to sales and more!
                </p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="w-full border border-[#0875E1] hover:bg-blue-50 text-[#0875E1] bg-white py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs"
              >
                Upgrade to NexDay Plus
              </button>
            </div>

          </aside>

        </div>
      </main>

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* BOTTOM TRUST FOOTER */}
      <div className="bg-white border-t border-gray-200 py-6 px-4 mt-8">
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
}
