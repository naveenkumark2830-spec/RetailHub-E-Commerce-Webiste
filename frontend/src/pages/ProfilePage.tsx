import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Award, 
  Shield, 
  Settings, 
  ShoppingBag,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  QrCode,
  Wallet,
  Check,
  Lock
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

type Section = 'personal' | 'addresses' | 'payments' | 'membership' | 'wishlist' | 'notifications' | 'security' | 'settings';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { customer, session, setCustomer } = useSessionStore();

  // Navigation states
  const [activeSection, setActiveSection] = useState<Section>('personal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states matching customer fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [language, setLanguage] = useState('English');
  const [preferredPayment, setPreferredPayment] = useState('UPI');

  // Change Password Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fake Payment Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetMembership, setTargetMembership] = useState<'Standard' | 'Premium' | 'Business'>('Premium');
  const [membershipPrice, setMembershipPrice] = useState(99);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'WALLET'>('UPI');
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'PROCESSING' | 'SUCCESS'>('SELECT');
  
  // Card input states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // UPI QR state
  const [upiHandle] = useState('naveen@upi');

  // Initialize form fields
  useEffect(() => {
    if (!customer) {
      navigate('/login?redirect=profile');
    } else {
      setFirstName(customer.first_name || '');
      setLastName(customer.last_name || '');
      setPhone(customer.phone || '');
      setGender(customer.gender || '');
      setDob(customer.date_of_birth || '');
      setLanguage(customer.language || 'English');
      setPreferredPayment(customer.preferred_payment || 'UPI');
    }
  }, [customer, navigate]);

  // Log profile_viewed event on mount or section change
  useEffect(() => {
    if (!customer || !session) return;

    fetch('/api/profile/log-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customer.customer_id,
        session_id: session.session_id,
        section: activeSection
      })
    }).catch(err => console.error('Failed to log profile view telemetry:', err));
  }, [activeSection, customer, session]);

  // Save Personal Info / Settings Changes Handler
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !session) return;

    setIsUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const payload = {
      session_id: session.session_id,
      fields: {
        first_name: firstName,
        last_name: lastName,
        phone,
        gender: gender || null,
        date_of_birth: dob || null,
        language,
        preferred_payment: preferredPayment
      }
    };

    try {
      const response = await fetch(`/api/profile/${customer.customer_id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setCustomer(data.customer);
        setSuccessMsg('Changes saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to update profile settings.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error. Failed to save changes.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !session) return;

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
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
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error. Failed to update password.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update Payment Preference Handler
  const handleUpdatePaymentPreference = async (pref: string) => {
    if (!customer || !session) return;

    setIsUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/profile/${customer.customer_id}/update-payment-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_payment: pref,
          session_id: session.session_id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer(data.customer);
        setPreferredPayment(pref);
        setSuccessMsg('Payment preference updated!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to update payment preference.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger Fake Payment flow
  const handleTriggerUpgrade = (level: 'Premium' | 'Business', price: number) => {
    setTargetMembership(level);
    setMembershipPrice(price);
    setPaymentStep('SELECT');
    setIsPaymentModalOpen(true);
  };

  // Process Fake Payment Simulation
  const handleProcessFakePayment = () => {
    setPaymentStep('PROCESSING');
    
    // Simulate gateway delay
    setTimeout(async () => {
      if (!customer || !session) return;
      try {
        const res = await fetch(`/api/profile/${customer.customer_id}/update-membership`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membership: targetMembership,
            session_id: session.session_id
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setCustomer(data.customer);
          setPaymentStep('SUCCESS');
        } else {
          alert(data.error || 'Failed to update membership level.');
          setIsPaymentModalOpen(false);
        }
      } catch (err) {
        console.error(err);
        alert('Network error.');
        setIsPaymentModalOpen(false);
      }
    }, 2500);
  };

  const menuItems = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'addresses', label: 'Addresses Book', icon: MapPin },
    { id: 'payments', label: 'Payment Preferences', icon: CreditCard },
    { id: 'membership', label: 'Membership Level', icon: Award },
    { id: 'security', label: 'Security & Login', icon: Shield },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ];

  if (!customer) return null;

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
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl w-full mx-auto flex-grow p-6 space-y-6">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-800 uppercase">My Account</h1>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">Manage details, preferences, addresses, security, and membership settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-gray-50">
              <div className="w-12 h-12 bg-blue-50 text-[#0071DC] rounded-full flex items-center justify-center font-black text-lg border border-blue-100 uppercase">
                {customer.first_name[0]}{customer.last_name[0]}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#041E42]">{customer.first_name} {customer.last_name}</h3>
                <span className="text-[10px] bg-blue-50 text-[#0071DC] font-black px-2 py-0.5 rounded-full uppercase">
                  {customer.membership || 'Standard'} Member
                </span>
              </div>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'addresses') {
                        navigate('/profile/addresses');
                      } else {
                        setActiveSection(item.id as Section);
                      }
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                      active 
                        ? 'bg-[#0071DC] text-white shadow-md' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-[#041E42]'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* MAIN DETAILS PANEL */}
          <div className="md:col-span-3">
            
            <AnimatePresence mode="wait">
              
              {/* SECTION: PERSONAL INFORMATION */}
              {activeSection === 'personal' && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
                >
                  <div className="border-b border-gray-50 pb-4">
                    <h2 className="text-base font-extrabold text-[#041E42]">Personal Information</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Ensure your personal identifiers and delivery details are up to date.</p>
                  </div>

                  <form onSubmit={handleSaveChanges} className="space-y-4">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">First Name</label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Last Name</label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email Address (Non-editable)</label>
                        <input
                          type="email"
                          disabled
                          value={customer.email}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date of Birth</label>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Preferred Language</label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        >
                          <option value="English">English</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Kannada">Kannada</option>
                          <option value="Spanish">Spanish</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Preferred Payment Method</label>
                        <select
                          value={preferredPayment}
                          onChange={(e) => setPreferredPayment(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        >
                          <option value="UPI">UPI (Unified Payments Interface)</option>
                          <option value="Credit Card">Credit / Debit Card</option>
                          <option value="Wallet">Wallet App</option>
                          <option value="COD">Cash on Delivery (COD)</option>
                        </select>
                      </div>
                    </div>

                    {/* Feedback Messages */}
                    {successMsg && (
                      <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-xl border border-emerald-100 flex items-center space-x-2 text-xs font-bold">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}
                    {errorMsg && (
                      <div className="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-100 flex items-center space-x-2 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full font-black text-xs transition-colors flex items-center space-x-2 shadow-md focus:outline-none disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>SAVE CHANGES</span>
                      </button>
                    </div>

                  </form>
                </motion.div>
              )}

              {/* SECTION: PAYMENT PREFERENCES */}
              {activeSection === 'payments' && (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
                >
                  <div className="border-b border-gray-50 pb-4">
                    <h2 className="text-base font-extrabold text-[#041E42]">Payment Preferences</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Select your default checkout transaction method.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'UPI', label: 'UPI (Unified Payments Interface)', desc: 'Pay instantly via Google Pay, PhonePe, or BHIM scan.' },
                      { id: 'Credit Card', label: 'Credit or Debit Card', desc: 'Securely transact using Visa, Mastercard, or RuPay.' },
                      { id: 'Wallet', label: 'Mobile Wallets', desc: 'Deduct from Paytm, Amazon Pay, or Mobikwik balance.' },
                      { id: 'COD', label: 'Cash on Delivery (COD)', desc: 'Pay cash or scanning dynamically upon package arrival.' }
                    ].map((opt) => (
                      <div 
                        key={opt.id}
                        onClick={() => handleUpdatePaymentPreference(opt.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                          preferredPayment === opt.id 
                            ? 'border-[#0071DC] bg-blue-50/30 ring-1 ring-[#0071DC]' 
                            : 'border-gray-100 bg-white hover:bg-gray-50/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_pref"
                          checked={preferredPayment === opt.id}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 text-[#0071DC]"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-gray-800">{opt.label}</h4>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {successMsg && (
                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100 flex items-center space-x-2 text-xs font-bold">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* SECTION: MEMBERSHIP LEVEL */}
              {activeSection === 'membership' && (
                <motion.div
                  key="membership"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
                >
                  <div className="border-b border-gray-50 pb-4">
                    <h2 className="text-base font-extrabold text-[#041E42]">Membership Level</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Upgrade or toggle membership privileges with simulated sandbox payments.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { level: 'Standard', price: 0, desc: 'Basic delivery, standard speeds.', color: 'bg-gray-100 text-gray-800' },
                      { level: 'Premium', price: 99, desc: 'Free Next-Day Delivery on eligible items, priority support, exclusive coupons.', color: 'bg-[#FFC220] text-[#041E42]' },
                      { level: 'Business', price: 299, desc: 'Free same-day delivery, corporate bulk discounts, separate invoicing.', color: 'bg-blue-900 text-white' }
                    ].map((plan) => {
                      const isCurrent = (customer.membership || 'Standard') === plan.level;
                      return (
                        <div 
                          key={plan.level}
                          className={`p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${
                            isCurrent ? 'ring-2 ring-[#0071DC] border-transparent' : 'border-gray-100'
                          }`}
                        >
                          <div className="space-y-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${plan.color}`}>
                              {plan.level}
                            </span>
                            <div className="pt-2">
                              <span className="text-2xl font-black">₹{plan.price}</span>
                              <span className="text-[10px] text-gray-400 font-bold"> / month</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{plan.desc}</p>
                          </div>

                          {isCurrent ? (
                            <div className="w-full text-center text-emerald-600 font-bold text-xs flex items-center justify-center space-x-1 py-2">
                              <Check className="w-4 h-4" />
                              <span>Current Plan</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleTriggerUpgrade(plan.level as any, plan.price)}
                              className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-2 rounded-full font-bold text-xs transition-colors shadow-sm"
                            >
                              Upgrade Plan
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* SECTION: SECURITY & LOGIN */}
              {activeSection === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
                >
                  <div className="border-b border-gray-50 pb-4">
                    <h2 className="text-base font-extrabold text-[#041E42]">Security & Login</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Manage your credentials and login passwords.</p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Current Password *</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">New Password *</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Confirm New Password *</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                      />
                    </div>

                    {successMsg && (
                      <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100 flex items-center space-x-2 text-xs font-bold">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}
                    {errorMsg && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 flex items-center space-x-2 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-5 py-2.5 rounded-full font-black text-xs transition-colors flex items-center space-x-1.5 shadow-md focus:outline-none disabled:opacity-50"
                      >
                        <Lock className="w-4 h-4" />
                        <span>CHANGE PASSWORD</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* SECTION: ACCOUNT SETTINGS */}
              {activeSection === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
                >
                  <div className="border-b border-gray-50 pb-4">
                    <h2 className="text-base font-extrabold text-[#041E42]">Account Settings</h2>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Control credentials, profile parameters, and upgrade membership status.</p>
                  </div>

                  <form onSubmit={handleSaveChanges} className="space-y-6">
                    <div className="space-y-4 max-w-md">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Profile Credentials</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">First Name</label>
                          <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Last Name</label>
                          <input
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 space-y-4">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Membership Actions</h3>
                      <div className="p-5 bg-blue-50/30 rounded-2xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-800">Current Level: <span className="text-[#0071DC]">{customer.membership || 'Standard'}</span></p>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Toggle and simulate Premium/Business upgrade triggers.</p>
                        </div>
                        {(customer.membership || 'Standard') !== 'Business' && (
                          <button
                            type="button"
                            onClick={() => handleTriggerUpgrade('Premium', 99)}
                            className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-4 py-2 rounded-full font-bold text-[10px]"
                          >
                            UPGRADE MEMBERSHIP
                          </button>
                        )}
                      </div>
                    </div>

                    {successMsg && (
                      <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100 flex items-center space-x-2 text-xs font-bold">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-50 flex justify-between">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full font-black text-xs transition-colors flex items-center space-x-2 shadow-md"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isUpdating ? 'Saving...' : 'SAVE SETTINGS'}</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </main>

      {/* FAKE PAYMENT MODAL (SANDBOX membership upgrades) */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full p-6 text-[#041E42] relative overflow-hidden"
            >
              
              {paymentStep === 'SELECT' && (
                <div className="space-y-5">
                  <div className="border-b pb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-black">Upgrade to {targetMembership}</h2>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">Sandbox simulated gateway payment.</p>
                    </div>
                    <span className="text-xl font-black text-[#0071DC]">₹{membershipPrice}</span>
                  </div>

                  {/* Payment selector */}
                  <div className="flex justify-around border-b pb-3">
                    {[
                      { id: 'UPI', label: 'UPI Scan', icon: QrCode },
                      { id: 'CARD', label: 'Mock Card', icon: CreditCard },
                      { id: 'WALLET', label: 'Wallet', icon: Wallet }
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSel = paymentMethod === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setPaymentMethod(item.id as any)}
                          className={`flex flex-col items-center p-3 rounded-2xl border transition-all space-y-1 w-24 ${
                            isSel ? 'border-[#0071DC] bg-blue-50/50 text-[#0071DC]' : 'border-gray-100 text-gray-500'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Method Content */}
                  {paymentMethod === 'UPI' && (
                    <div className="space-y-4 text-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="w-32 h-32 bg-white border border-gray-200 rounded-xl mx-auto flex items-center justify-center p-2 relative">
                        {/* Dynamic QR block */}
                        <QrCode className="w-full h-full text-gray-700" />
                        <div className="absolute inset-0 bg-black/5 flex items-center justify-center rounded-xl font-black text-[9px] text-[#0071DC] uppercase tracking-wider">
                          MOCK QR CODE
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-700">Scan QR to pay ₹{membershipPrice}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Or enter VPA: <span className="font-bold">{upiHandle}</span></p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'CARD' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Card Number</label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                          placeholder="4111 2222 3333 4444"
                          maxLength={19}
                          className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Expiry Date</label>
                          <input
                            type="text"
                            required
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">CVV</label>
                          <input
                            type="password"
                            required
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            maxLength={3}
                            className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'WALLET' && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] text-gray-500 font-bold text-center">Selected wallet: PhonePe Sandbox Wallet Link</p>
                      <input
                        type="text"
                        disabled
                        value={`${customer.phone}@phonepe`}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-400 text-center cursor-not-allowed"
                      />
                    </div>
                  )}

                  <div className="flex space-x-2 pt-3 border-t">
                    <button
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="w-1/2 border border-gray-200 py-2.5 rounded-full font-bold text-xs text-[#041E42] hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProcessFakePayment}
                      className="w-1/2 bg-[#0071DC] hover:bg-[#0046BE] text-white py-2.5 rounded-full font-black text-xs shadow-md"
                    >
                      Pay ₹{membershipPrice}
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 'PROCESSING' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-gray-800">Simulating Bank Authorization</h3>
                    <p className="text-[10px] text-gray-400 font-semibold">Validating sandbox currency transfer credentials...</p>
                  </div>
                </div>
              )}

              {paymentStep === 'SUCCESS' && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm animate-bounce">
                    <Check className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-emerald-700">Payment Approved!</h3>
                    <p className="text-xs text-gray-500 font-medium">Your profile has been upgraded to **{targetMembership}** status.</p>
                  </div>
                  <button
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full font-bold text-xs transition-colors shadow-md mt-2"
                  >
                    Return to Profile
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-6 text-center text-xs font-bold mt-12">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. Personal details are securely encrypted in compliance with mock-data privacy rules.</p>
      </footer>

    </div>
  );
};
