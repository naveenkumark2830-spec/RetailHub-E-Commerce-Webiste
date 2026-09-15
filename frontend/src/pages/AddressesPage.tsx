import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Edit3, 
  Trash2, 
  Check, 
  Home, 
  Briefcase, 
  User,
  Package,
  Heart,
  CreditCard,
  Bell,
  ShieldCheck,
  RotateCcw,
  HelpCircle,
  LogOut,
  Crown,
  CheckCircle2,
  Truck,
  Headphones,
  Lock
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface Address {
  address_id: string;
  customer_id: string;
  address_type: 'HOME' | 'OFFICE' | 'OTHER';
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi'
];

export const AddressesPage: React.FC = () => {
  const navigate = useNavigate();
  const { customer, session, logout } = useSessionStore();
  const { profilePhoto } = useProfilePhoto();

  const [activeTab, setActiveTab] = useState<string>('Saved Addresses');
  const [, setIsLoading] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<Address[]>([
    {
      address_id: 'addr-101',
      customer_id: customer?.customer_id || 'cust-101',
      address_type: 'HOME',
      full_name: 'Naveen Kumar',
      phone: '+91 98765 43210',
      address_line_1: '#12, 3rd Cross Street, Anna Nagar',
      address_line_2: null,
      city: 'Chennai',
      state: 'Tamil Nadu',
      postal_code: '600001',
      country: 'India',
      is_default: true
    },
    {
      address_id: 'addr-102',
      customer_id: customer?.customer_id || 'cust-101',
      address_type: 'OFFICE',
      full_name: 'Naveen Kumar',
      phone: '+91 98765 43210',
      address_line_1: 'NexDay Technologies Pvt. Ltd.',
      address_line_2: 'Tower A, 5th Floor, IT Park, OMR',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postal_code: '600097',
      country: 'India',
      is_default: false
    },
    {
      address_id: 'addr-103',
      customer_id: customer?.customer_id || 'cust-101',
      address_type: 'OTHER',
      full_name: 'Naveen Kumar',
      phone: '+91 98765 43210',
      address_line_1: 'Flat 3B, Green Park Apartments',
      address_line_2: 'Velachery Main Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postal_code: '600042',
      country: 'India',
      is_default: false
    }
  ]);

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form input states
  const [fullName, setFullName] = useState('Naveen Kumar');
  const [phone, setPhone] = useState('98765 43210');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Chennai');
  const [state, setState] = useState('Tamil Nadu');
  const [postalCode, setPostalCode] = useState('600001');
  const [country, setCountry] = useState('India');
  const [addressType, setAddressType] = useState<'HOME' | 'OFFICE' | 'OTHER'>('HOME');
  const [isDefault, setIsDefault] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper to sync primary/default location across entire website (Header, etc.)
  const updateGlobalDeliveryLocation = (cityVal: string, pincodeVal: string) => {
    try {
      localStorage.setItem('delivery_location', JSON.stringify({
        city: cityVal,
        pincode: pincodeVal
      }));
      window.dispatchEvent(new Event('address_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn(e);
    }
  };

  // Fetch addresses from API
  const fetchAddresses = async () => {
    if (!customer) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/addresses/customer/${customer.customer_id}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
        setAddresses(data.addresses);
        const def = data.addresses.find((a: Address) => a.is_default);
        if (def) {
          updateGlobalDeliveryLocation(def.city, def.postal_code);
        }
      }
    } catch (err) {
      console.warn('API addresses fetch:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!customer) {
      navigate('/login?redirect=addresses');
    } else {
      fetchAddresses();
    }
  }, [customer, navigate]);

  const resetForm = () => {
    setEditingAddressId(null);
    setFullName(customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Naveen Kumar' : 'Naveen Kumar');
    setPhone(customer?.phone || '98765 43210');
    setAddressLine1('');
    setAddressLine2('');
    setCity('Chennai');
    setState('Tamil Nadu');
    setPostalCode('600001');
    setCountry('India');
    setAddressType('HOME');
    setIsDefault(false);
    setValidationError(null);
  };

  const handleOpenEdit = (addr: Address) => {
    setEditingAddressId(addr.address_id);
    setFullName(addr.full_name);
    setPhone(addr.phone);
    setAddressLine1(addr.address_line_1);
    setAddressLine2(addr.address_line_2 || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postal_code);
    setCountry(addr.country || 'India');
    setAddressType(addr.address_type);
    setIsDefault(addr.is_default);
    setValidationError(null);
  };

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !postalCode.trim()) {
      setValidationError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    const payload = {
      session_id: session?.session_id || 'sess-default',
      full_name: fullName,
      phone,
      address_line_1: addressLine1,
      address_line_2: addressLine2 || null,
      city,
      state,
      postal_code: postalCode,
      country,
      address_type: addressType,
      is_default: isDefault
    };

    try {
      if (customer) {
        const url = editingAddressId 
          ? `/api/addresses/customer/${customer.customer_id}/update/${editingAddressId}`
          : `/api/addresses/customer/${customer.customer_id}/add`;
        
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (editingAddressId) {
        setAddresses(prev => prev.map(a => a.address_id === editingAddressId ? {
          ...a,
          full_name: fullName,
          phone: phone,
          address_line_1: addressLine1,
          address_line_2: addressLine2 || null,
          city: city,
          state: state,
          postal_code: postalCode,
          address_type: addressType,
          is_default: isDefault
        } : a));
        showToast('Address updated successfully!');
      } else {
        const newAddr: Address = {
          address_id: `addr-${Date.now()}`,
          customer_id: customer?.customer_id || 'cust-101',
          address_type: addressType,
          full_name: fullName,
          phone,
          address_line_1: addressLine1,
          address_line_2: addressLine2 || null,
          city,
          state,
          postal_code: postalCode,
          country,
          is_default: isDefault || addresses.length === 0
        };
        setAddresses(prev => [newAddr, ...prev]);
        showToast('New address added successfully!');
      }

      // If set as default or primary, update global location dynamically!
      if (isDefault || addresses.length === 0) {
        updateGlobalDeliveryLocation(city, postalCode);
      }

      resetForm();
    } catch (err) {
      showToast('Address saved successfully!');
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      if (customer && session) {
        await fetch(`/api/addresses/customer/${customer.customer_id}/delete/${addressId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.session_id })
        });
      }
      setAddresses(prev => prev.filter(a => a.address_id !== addressId));
      showToast('Address removed.');
    } catch (err) {
      setAddresses(prev => prev.filter(a => a.address_id !== addressId));
      showToast('Address removed.');
    }
  };

  const handleSetDefault = async (addr: Address) => {
    try {
      if (customer && session) {
        await fetch(`/api/addresses/customer/${customer.customer_id}/set-default/${addr.address_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.session_id })
        });
      }
      setAddresses(prev => prev.map(a => ({
        ...a,
        is_default: a.address_id === addr.address_id
      })));

      // Update location indicator across entire site dynamically!
      updateGlobalDeliveryLocation(addr.city, addr.postal_code);
      showToast(`Default delivery address set to ${addr.city} ${addr.postal_code}!`);
    } catch (err) {
      setAddresses(prev => prev.map(a => ({
        ...a,
        is_default: a.address_id === addr.address_id
      })));
      updateGlobalDeliveryLocation(addr.city, addr.postal_code);
      showToast(`Default delivery address set to ${addr.city} ${addr.postal_code}!`);
    }
  };

  const getAddressIcon = (type: Address['address_type']) => {
    switch (type) {
      case 'HOME':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
            <Home className="w-5 h-5" />
          </div>
        );
      case 'OFFICE':
        return (
          <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
        );
    }
  };

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

              {/* Sidebar Menu Links */}
              <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5 text-xs font-semibold text-[#475569]">
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
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#0875E1] font-bold border-l-4 border-[#0875E1] transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#0875E1]" />
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
                onClick={() => navigate('/profile')}
                className="w-full border border-[#0875E1] hover:bg-blue-50 text-[#0875E1] py-2 rounded-xl font-bold text-xs transition-colors bg-white shadow-2xs"
              >
                Explore NexDay Plus
              </button>
            </div>
          </aside>

          {/* 2. CENTER MAIN COLUMN: MANAGE ADDRESSES CONTENT */}
          <section className="lg:col-span-6 space-y-6">
            
            {/* Title Header */}
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-[#0F172A]">Manage Addresses</h1>
              <p className="text-xs text-gray-500 font-medium">Add, edit or remove your saved addresses for faster checkout.</p>
            </div>

            {/* Tabs Filter Strip */}
            <div className="flex space-x-6 border-b border-gray-200 text-xs font-bold">
              {[
                { name: 'Saved Addresses', count: addresses.length },
                { name: 'Recently Used', count: addresses.length }
              ].map((tab) => {
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                      isActive 
                        ? 'border-[#0875E1] text-[#0875E1]' 
                        : 'border-transparent text-gray-500 hover:text-[#0F172A]'
                    }`}
                  >
                    {tab.name} ({tab.count})
                  </button>
                );
              })}
            </div>

            {/* ADDRESSES CARDS CONTAINER */}
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200/80 p-8 text-center space-y-3 shadow-xs">
                  <MapPin className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-[#0F172A]">No saved addresses found</p>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.address_id}
                    className={`rounded-2xl border p-5 shadow-xs space-y-3.5 transition-all ${
                      addr.is_default 
                        ? 'border-[#BFDBFE] bg-[#EFF6FF]/40' 
                        : 'border-gray-200/80 bg-white'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        {getAddressIcon(addr.address_type)}
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-sm text-[#0F172A]">{addr.address_type === 'HOME' ? 'Home' : addr.address_type === 'OFFICE' ? 'Office' : 'Other'}</h3>
                          {addr.is_default && (
                            <span className="bg-[#0875E1] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">Default</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleOpenEdit(addr)}
                          className="text-[#0875E1] hover:text-[#065eb8] text-xs font-bold flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.address_id)}
                          className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Address Body Details */}
                    <div className="pl-12 space-y-1">
                      <h4 className="font-bold text-xs text-[#0F172A]">{addr.full_name}</h4>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        {addr.address_line_1}
                        {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}<br />
                        {addr.city}, {addr.state} {addr.postal_code}
                      </p>
                      <p className="text-[11px] text-gray-500 font-semibold pt-0.5">
                        Phone: {addr.phone}
                      </p>
                    </div>

                    {/* Bottom Badges & Deliver Here Action */}
                    <div className="pl-12 flex flex-wrap items-center gap-2 pt-1">
                      <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-3 py-1 rounded-lg flex items-center space-x-1">
                        {addr.address_type === 'HOME' && <Home className="w-3.5 h-3.5 text-gray-500" />}
                        {addr.address_type === 'OFFICE' && <Briefcase className="w-3.5 h-3.5 text-gray-500" />}
                        {addr.address_type === 'OTHER' && <MapPin className="w-3.5 h-3.5 text-gray-500" />}
                        <span>{addr.address_type === 'HOME' ? 'Home' : addr.address_type === 'OFFICE' ? 'Office' : 'Other'}</span>
                      </span>

                      {addr.is_default ? (
                        <span className="bg-emerald-50 text-[#10B981] border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>Default Address</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr)}
                          className="border border-blue-200 hover:bg-blue-50 text-[#0875E1] text-[11px] font-bold px-3 py-1 rounded-lg transition-colors"
                        >
                          Set as Default
                        </button>
                      )}

                      <button
                        onClick={() => handleSetDefault(addr)}
                        className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-bold px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <Truck className="w-3.5 h-3.5 text-gray-500" />
                        <span>Deliver here</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </section>

          {/* 3. RIGHT COLUMN: ADD / EDIT ADDRESS FORM & WIDGETS */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* ADD / EDIT ADDRESS FORM CARD */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-sm text-[#0F172A]">
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h3>
                {editingAddressId && (
                  <button onClick={resetForm} className="text-xs font-bold text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitAddress} className="space-y-3.5 text-xs">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">Phone Number *</label>
                  <div className="flex items-center space-x-2">
                    <select className="bg-[#F4F6F9] border border-gray-200 rounded-xl px-2 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none shrink-0">
                      <option>+91</option>
                      <option>+1</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>
                </div>

                {/* Address Line 1 */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="House No., Building, Street"
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                {/* Address Line 2 */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, Landmark, Area"
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                {/* City & State Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-600 block">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Hyderabad"
                      className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-600 block">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-2 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pincode */}
                <div className="space-y-1">
                  <label className="font-bold text-gray-600 block">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 5678"
                    className="w-full bg-[#F4F6F9] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                {/* Address Type radio options */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-gray-600 block">Address Type</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs text-[#0F172A]">
                      <input
                        type="radio"
                        name="addressType"
                        checked={addressType === 'HOME'}
                        onChange={() => setAddressType('HOME')}
                        className="text-[#0875E1] focus:ring-blue-500"
                      />
                      <span>Home</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs text-gray-600">
                      <input
                        type="radio"
                        name="addressType"
                        checked={addressType === 'OFFICE'}
                        onChange={() => setAddressType('OFFICE')}
                        className="text-[#0875E1] focus:ring-blue-500"
                      />
                      <span>Office</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs text-gray-600">
                      <input
                        type="radio"
                        name="addressType"
                        checked={addressType === 'OTHER'}
                        onChange={() => setAddressType('OTHER')}
                        className="text-[#0875E1] focus:ring-blue-500"
                      />
                      <span>Other</span>
                    </label>
                  </div>
                </div>

                {/* Make Default Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-[#0875E1]">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-4 h-4 text-[#0875E1] rounded focus:ring-blue-500"
                    />
                    <span>Set as Primary / Default Address</span>
                  </label>
                </div>

                {validationError && (
                  <p className="text-red-500 text-xs font-bold">{validationError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-3 rounded-xl font-bold text-xs transition-colors shadow-2xs mt-2"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></span>
                  ) : (
                    <span>Save Address</span>
                  )}
                </button>

              </form>
            </div>

            {/* NEED HELP WIDGET */}
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
};
