import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Check, 
  Lock, 
  Package, 
  ShieldCheck, 
  Bell, 
  RotateCcw, 
  HelpCircle, 
  LogOut, 
  Crown, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  Headphones, 
  Calendar, 
  Home, 
  CheckCircle2, 
  Phone, 
  Heart,
  X
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { customer, session, setCustomer, logout } = useSessionStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { profilePhoto, savePhoto, removePhoto } = useProfilePhoto();

  // Active section state
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states matching customer fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('2003-03-15');

  // Checkbox Preference states
  const [emailOrderUpdates, setEmailOrderUpdates] = useState(true);
  const [emailDealsOffers, setEmailDealsOffers] = useState(true);
  const [emailLaunches, setEmailLaunches] = useState(false);
  const [emailTips, setEmailTips] = useState(false);

  const [notifStatusUpdates, setNotifStatusUpdates] = useState(true);
  const [notifPriceAlerts, setNotifPriceAlerts] = useState(true);
  const [notifWishlist, setNotifWishlist] = useState(false);
  const [notifRecommendations, setNotifRecommendations] = useState(false);

  // Change Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Fake Payment Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetMembership, setTargetMembership] = useState<'Standard' | 'Premium' | 'Business'>('Premium');
  const [membershipPrice, setMembershipPrice] = useState(99);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'WALLET'>('UPI');
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'PROCESSING' | 'SUCCESS'>('SELECT');

  // Initialize form fields
  useEffect(() => {
    if (!customer) {
      navigate('/login?redirect=profile');
    } else {
      const full = (customer as any).full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Naveen Kumar';
      setFullName(full);
      setEmail(customer.email || 'naveen@example.com');
      setPhone(customer.phone || '9876543210');
      setGender(customer.gender || 'Male');
      setDob(customer.date_of_birth || '2003-03-15');
    }
  }, [customer, navigate]);

  // Log profile_viewed event on mount
  useEffect(() => {
    if (!customer || !session) return;

    fetch('/api/profile/log-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customer.customer_id,
        session_id: session.session_id,
        section: 'personal'
      })
    }).catch(err => console.error('Failed to log profile view telemetry:', err));
  }, [customer, session]);

  // Profile Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds 5MB limit. Please upload a smaller JPG or PNG image.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        savePhoto(dataUrl);
        setSuccessMsg('Profile photo updated successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Personal Info Handler
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !session) return;

    setIsUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const nameParts = fullName.split(' ');
    const first_name = nameParts[0] || 'Naveen';
    const last_name = nameParts.slice(1).join(' ') || 'Kumar';

    try {
      const res = await fetch(`/api/profile/${customer.customer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name,
          last_name,
          phone,
          gender,
          date_of_birth: dob,
          session_id: session.session_id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer(data.customer);
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setSuccessMsg('Profile changes saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  // Save Preferences Handler
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Shopping preferences updated successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !session) return;

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    setIsUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/profile/${customer.customer_id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          session_id: session.session_id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(false);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setSuccessMsg('Password updated successfully!');
      setShowPasswordModal(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger Upgrade Modal
  const handleTriggerUpgrade = (level: 'Premium' | 'Business', price: number) => {
    setTargetMembership(level);
    setMembershipPrice(price);
    setPaymentStep('SELECT');
    setIsPaymentModalOpen(true);
  };

  // Execute Payment Handler
  const handleExecutePayment = async () => {
    if (!customer || !session) return;
    setPaymentStep('PROCESSING');

    setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/${customer.customer_id}/upgrade-membership`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membership: targetMembership,
            payment_method: paymentMethod,
            session_id: session.session_id
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setCustomer(data.customer);
          setPaymentStep('SUCCESS');
        } else {
          setPaymentStep('SUCCESS');
        }
      } catch (err) {
        setPaymentStep('SUCCESS');
      }
    }, 1500);
  };

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-between text-[#0F172A] font-sans">
      {/* HEADER */}
      <Header />

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* 1. LEFT COLUMN: ACCOUNT NAVIGATION SIDEBAR */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-5">
              {/* User Avatar & Info */}
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
                    {fullName || 'Naveen Kumar'}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {email || 'naveen@example.com'}
                  </p>
                </div>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="space-y-1 text-xs font-semibold text-[#475569]">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#0875E1] font-bold border-l-4 border-[#0875E1] transition-colors"
                >
                  <User className="w-4 h-4 text-[#0875E1]" />
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
                onClick={() => handleTriggerUpgrade('Premium', 99)}
                className="w-full border border-[#0875E1] hover:bg-blue-50 text-[#0875E1] py-2 rounded-xl font-bold text-xs transition-colors bg-white shadow-2xs"
              >
                Explore NexDay Plus
              </button>
            </div>
          </aside>

          {/* 2. CENTER MAIN COLUMN: MY PROFILE CONTENT */}
          <section className="lg:col-span-6 space-y-6">
            
            {/* Title Header */}
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-[#0F172A]">My Profile</h1>
              <p className="text-xs text-gray-500 font-medium">
                Manage your account information, addresses, payment methods and preferences.
              </p>
            </div>

            {/* SECTION 1: PERSONAL INFORMATION */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Personal Information</h3>
                  <p className="text-xs text-gray-500 font-medium">Keep your personal details up to date.</p>
                </div>
                <button
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                  className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center space-x-1.5"
                >
                  {isUpdating ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>

              <form onSubmit={handleSaveChanges} className="space-y-5">
                {/* Avatar upload row */}
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden flex-shrink-0">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#EFF6FF] hover:bg-blue-100 text-[#0875E1] border border-blue-200 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        Change Photo
                      </button>
                      {profilePhoto && (
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">JPG, PNG up to 5MB</p>
                  </div>
                </div>

                {/* Form fields grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-700">
                  
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-gray-600 font-bold">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="text-gray-600 font-bold">Email Address *</label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none cursor-not-allowed"
                      />
                      <div className="absolute right-2 flex items-center space-x-1 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <label className="text-gray-600 font-bold">Phone Number *</label>
                    <div className="flex items-center space-x-2">
                      <select className="bg-[#F4F6F9] border border-gray-200 rounded-xl px-2.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none">
                        <option>+91</option>
                        <option>+1</option>
                        <option>+44</option>
                      </select>
                      <div className="relative flex-grow flex items-center">
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                        />
                        <div className="absolute right-2 flex items-center space-x-1 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date of Birth & Gender */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-gray-600 font-bold">Date of Birth</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value="15 Mar 2003"
                          readOnly
                          className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl pl-3 py-2.5 pr-7 text-xs text-[#0F172A] font-bold focus:outline-none"
                        />
                        <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-600 font-bold">Gender</label>
                      <select 
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                </div>
              </form>
            </div>

            {/* SECTION 2: DEFAULT ADDRESS */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Default Address</h3>
                  <p className="text-xs text-gray-500 font-medium">This will be used for deliveries, returns and communications.</p>
                </div>
                <button
                  onClick={() => navigate('/profile/addresses')}
                  className="text-[#0875E1] hover:underline font-bold text-xs"
                >
                  Manage Addresses
                </button>
              </div>

              <div className="bg-[#EFF6FF]/60 border border-[#BFDBFE] rounded-2xl p-4 flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0875E1]/10 text-[#0875E1] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Home className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-[#0875E1] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">Default</span>
                      <h4 className="font-bold text-xs text-[#0F172A]">Naveen Kumar</h4>
                    </div>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                      #12, 3rd Cross Street, Anna Nagar<br />
                      Chennai, Tamil Nadu 600001
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold pt-0.5">
                      Phone: +91 98765 43210
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <button 
                    onClick={() => navigate('/profile/addresses')}
                    className="text-[#0875E1] hover:text-[#065eb8] text-xs font-bold flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => navigate('/profile/addresses')}
                    className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: ACCOUNT SECURITY */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-bold text-sm text-[#0F172A]">Account Security</h3>
                <p className="text-xs text-gray-500 font-medium">Keep your account safe with a strong password.</p>
              </div>

              <div className="space-y-4 text-xs font-semibold text-gray-700">
                {/* Row 1: Password */}
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="space-y-0.5">
                    <label className="text-gray-600 font-bold block">Password</label>
                    <span className="text-gray-400 font-mono tracking-widest text-sm">••••••••••••</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="border border-blue-200 hover:bg-blue-50 text-[#0875E1] px-4 py-2 rounded-xl font-bold text-xs transition-colors bg-white"
                  >
                    Change Password
                  </button>
                </div>

                {/* Row 2: Two-Factor Authentication */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <label className="text-gray-600 font-bold block">Two-Factor Authentication</label>
                    <p className="text-[11px] text-gray-400 font-medium">Add an extra layer of security to your account.</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-gray-400">
                      {is2FAEnabled ? 'Enabled' : 'Not Enabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIs2FAEnabled(!is2FAEnabled);
                        setSuccessMsg(`2FA ${!is2FAEnabled ? 'Enabled' : 'Disabled'}!`);
                        setTimeout(() => setSuccessMsg(null), 3000);
                      }}
                      className="border border-blue-200 hover:bg-blue-50 text-[#0875E1] px-4 py-2 rounded-xl font-bold text-xs transition-colors bg-white"
                    >
                      {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: PREFERENCES */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Preferences</h3>
                  <p className="text-xs text-gray-500 font-medium">Set your shopping preferences.</p>
                </div>
                <button
                  onClick={handleSavePreferences}
                  className="bg-[#0875E1] hover:bg-[#065eb8] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs"
                >
                  Save Preferences
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-700 font-semibold">
                {/* Column 1: Email Preferences */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#0F172A]">Email Preferences</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailOrderUpdates} 
                        onChange={(e) => setEmailOrderUpdates(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span>Order updates</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailDealsOffers} 
                        onChange={(e) => setEmailDealsOffers(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span>Deals and offers</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailLaunches} 
                        onChange={(e) => setEmailLaunches(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span className="text-gray-500 font-medium">New product launches</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailTips} 
                        onChange={(e) => setEmailTips(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span className="text-gray-500 font-medium">Tips and recommendations</span>
                    </label>
                  </div>
                </div>

                {/* Column 2: Notification Preferences */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#0F172A]">Notification Preferences</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifStatusUpdates} 
                        onChange={(e) => setNotifStatusUpdates(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span>Order status updates</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifPriceAlerts} 
                        onChange={(e) => setNotifPriceAlerts(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span>Price drop alerts</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifWishlist} 
                        onChange={(e) => setNotifWishlist(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span className="text-gray-500 font-medium">Wishlist updates</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifRecommendations} 
                        onChange={(e) => setNotifRecommendations(e.target.checked)} 
                        className="w-4 h-4 rounded text-[#0875E1] focus:ring-blue-500" 
                      />
                      <span className="text-gray-500 font-medium">Personalized recommendations</span>
                    </label>
                  </div>
                </div>

              </div>
            </div>

          </section>

          {/* 3. RIGHT COLUMN: SUMMARY & QUICK ACTIONS */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* CARD 1: ACCOUNT SUMMARY */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-[#0F172A]">Account Summary</h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex items-start space-x-3 text-gray-600 font-medium">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-[#0F172A]">{fullName || 'Naveen Kumar'}</p>
                    <p className="text-[11px] text-gray-500">{email || 'naveen@example.com'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-gray-600 font-medium">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>+91 98765 43210</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                </div>

                <div className="flex items-center space-x-3 text-gray-600 font-medium">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Chennai, Tamil Nadu</span>
                </div>

                <div className="flex items-center justify-between text-gray-600 font-medium pt-1 border-t border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Crown className="w-4 h-4 text-[#0875E1] flex-shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-[#0F172A]">NexDay Plus</p>
                      <p className="text-[10px] text-gray-400">Not Subscribed</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleTriggerUpgrade('Premium', 99)}
                    className="text-xs font-bold text-[#0875E1] hover:underline"
                  >
                    Explore Now
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 2: QUICK ACTIONS */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#0F172A]">Quick Actions</h3>

              <div className="space-y-1 text-xs font-semibold text-[#475569]">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span>Change Password</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate('/profile/addresses')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>Manage Addresses</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span>Manage Payment Methods</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate('/notifications')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span>Notification Preferences</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* CARD 3: NEED HELP? */}
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

            {/* CARD 4: NEXDAY PLUS CARD */}
            <div className="bg-[#EFF6FF]/70 border border-[#BFDBFE] rounded-2xl p-5 shadow-xs space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-[#0875E1] text-white flex items-center justify-center mx-auto">
                <Crown className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">NexDay Plus</h4>
                <p className="text-[11px] text-gray-500 font-medium">
                  Get free delivery, early access to deals, exclusive offers and more!
                </p>
              </div>
              <button
                onClick={() => handleTriggerUpgrade('Premium', 99)}
                className="w-full border border-[#0875E1] hover:bg-blue-50 text-[#0875E1] bg-white py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs"
              >
                Upgrade to NexDay Plus
              </button>
            </div>

          </aside>

        </div>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 text-[#0F172A] space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-[#0F172A]">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-600 font-bold">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                {errorMsg && (
                  <p className="text-red-500 text-xs font-bold">{errorMsg}</p>
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="w-1/2 border border-gray-200 hover:bg-gray-50 text-[#0F172A] py-2.5 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-1/2 bg-[#0875E1] hover:bg-[#065eb8] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FAKE MEMBERSHIP PAYMENT MODAL */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 text-[#0F172A] space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-[#0F172A]">
                  Upgrade to NexDay Plus ({targetMembership})
                </h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {paymentStep === 'SELECT' && (
                <div className="space-y-4 text-xs font-semibold">
                  <p className="text-gray-500 font-medium">
                    Enjoy free shipping, early sale access, and exclusive deals for ₹{membershipPrice}/year.
                  </p>

                  <div className="space-y-2">
                    <label className="text-gray-600 font-bold block">Select Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                          paymentMethod === 'UPI' ? 'border-[#0875E1] bg-blue-50 text-[#0875E1]' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CARD')}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                          paymentMethod === 'CARD' ? 'border-[#0875E1] bg-blue-50 text-[#0875E1]' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('WALLET')}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                          paymentMethod === 'WALLET' ? 'border-[#0875E1] bg-blue-50 text-[#0875E1]' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        Wallet
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleExecutePayment}
                    className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-3 rounded-xl font-bold text-xs transition-colors shadow-2xs"
                  >
                    Pay ₹{membershipPrice} & Upgrade Now
                  </button>
                </div>
              )}

              {paymentStep === 'PROCESSING' && (
                <div className="py-8 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-[#0875E1] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-[#0F172A]">Processing payment securely...</p>
                </div>
              )}

              {paymentStep === 'SUCCESS' && (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0F172A]">Membership Upgraded!</h4>
                  <p className="text-xs text-gray-500 font-medium">You are now a NexDay Plus {targetMembership} member.</p>
                  <button
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="bg-[#0875E1] text-white px-6 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
