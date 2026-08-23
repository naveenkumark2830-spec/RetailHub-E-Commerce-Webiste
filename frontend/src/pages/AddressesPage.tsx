import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ArrowLeft, 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Home, 
  Briefcase, 
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

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
  const { customer, session } = useSessionStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form & modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [addressType, setAddressType] = useState<'HOME' | 'OFFICE' | 'OTHER'>('HOME');
  const [isDefault, setIsDefault] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch addresses
  const fetchAddresses = async () => {
    if (!customer) return;
    try {
      const res = await fetch(`/api/addresses/customer/${customer.customer_id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAddresses(data.addresses);
      }
    } catch (err) {
      console.error('Failed to load customer addresses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!customer) {
      navigate('/login?redirect=profile/addresses');
      return;
    }
    fetchAddresses();
  }, [customer, navigate]);

  // Log address_viewed telemetry
  useEffect(() => {
    if (!customer || !session) return;
    fetch('/api/profile/log-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customer.customer_id,
        session_id: session.session_id,
        section: 'addresses'
      })
    }).catch(err => console.error(err));
  }, [customer, session]);

  // Reset form fields
  const resetForm = () => {
    setEditingAddressId(null);
    setFullName('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('Karnataka');
    setPostalCode('');
    setCountry('India');
    setAddressType('HOME');
    setIsDefault(false);
    setValidationError(null);
  };

  // Open Add modal
  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (addr: Address) => {
    setEditingAddressId(addr.address_id);
    setFullName(addr.full_name);
    setPhone(addr.phone);
    setAddressLine1(addr.address_line_1);
    setAddressLine2(addr.address_line_2 || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postal_code);
    setCountry(addr.country);
    setAddressType(addr.address_type);
    setIsDefault(addr.is_default);
    setValidationError(null);
    setIsModalOpen(true);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !session) return;

    setValidationError(null);

    // Validations
    if (!fullName || !phone || !addressLine1 || !city || !postalCode) {
      setValidationError('Please fill in all required fields.');
      return;
    }
    if (postalCode.trim().length !== 6 || isNaN(Number(postalCode))) {
      setValidationError('Please enter a valid 6-digit postal code.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      session_id: session.session_id,
      addressData: {
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
      }
    };

    try {
      const url = editingAddressId 
        ? `/api/addresses/customer/${customer.customer_id}/update/${editingAddressId}`
        : `/api/addresses/customer/${customer.customer_id}/add`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        resetForm();
        fetchAddresses();
      } else {
        setValidationError(data.error || 'Failed to save address.');
      }
    } catch (err) {
      console.error(err);
      setValidationError('Connection error. Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDeleteAddress = async (addressId: string) => {
    if (!customer || !session) return;
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const res = await fetch(`/api/addresses/customer/${customer.customer_id}/delete/${addressId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.session_id })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchAddresses();
      } else {
        alert(data.error || 'Failed to delete address.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to delete address.');
    }
  };

  // Set Default handler
  const handleSetDefault = async (addressId: string) => {
    if (!customer || !session) return;

    try {
      const res = await fetch(`/api/addresses/customer/${customer.customer_id}/set-default/${addressId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.session_id })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchAddresses();
      } else {
        alert(data.error || 'Failed to update default address.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error. Failed to update default address.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42]">
      
      {/* HEADER */}
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
            onClick={() => navigate('/profile')}
            className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl w-full mx-auto flex-grow p-6 space-y-6">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-800">My Addresses</h1>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">Manage billing and delivery address destinations.</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-5 py-2.5 rounded-full font-black text-xs transition-colors flex items-center space-x-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>ADD ADDRESS</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : addresses.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4 shadow-sm"
          >
            <MapPin className="w-12 h-12 text-gray-300 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-gray-700">No Saved Addresses</h3>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Please add a shipping address destination to proceed with checkouts.</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-5 py-2 rounded-full font-bold text-xs"
            >
              Add Your First Address
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <motion.div
                key={addr.address_id}
                layout
                className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between ${
                  addr.is_default ? 'ring-2 ring-[#0071DC] border-transparent' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-50 text-[#0071DC] rounded-lg">
                        {addr.address_type === 'HOME' && <Home className="w-4 h-4" />}
                        {addr.address_type === 'OFFICE' && <Briefcase className="w-4 h-4" />}
                        {addr.address_type === 'OTHER' && <MapPin className="w-4 h-4" />}
                      </div>
                      <span className="text-xs font-black uppercase text-gray-400 tracking-wider">
                        {addr.address_type}
                      </span>
                    </div>

                    {addr.is_default && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase border border-emerald-100 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Default</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-800">{addr.full_name}</h4>
                    <p className="text-xs text-gray-500 font-medium">{addr.phone}</p>
                  </div>

                  <div className="text-xs text-gray-600 font-medium leading-relaxed">
                    <p>{addr.address_line_1}</p>
                    {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                    <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                    <p className="text-gray-400 font-bold text-[10px] uppercase mt-0.5 tracking-wider">{addr.country}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-50 text-[11px] font-bold">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(addr)}
                      className="text-gray-500 hover:text-[#0071DC] flex items-center space-x-1 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.address_id)}
                      className="text-gray-500 hover:text-red-600 flex items-center space-x-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr.address_id)}
                      className="text-[#0071DC] hover:text-[#0046BE] hover:underline"
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* ADD / EDIT ADDRESS MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-lg w-full p-6 text-[#041E42] relative overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <h2 className="text-base font-extrabold text-[#041E42]">
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                
                {validationError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 flex items-center space-x-2 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Naveen Kumar"
                      className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 XXXXX XXXXX"
                      className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street name, P.O. Box, Building name"
                    className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, unit, floor"
                    className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 560001"
                      className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-[#F7F8F9] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC]"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Address Type</label>
                    <div className="flex space-x-4 pt-1">
                      {['HOME', 'OFFICE', 'OTHER'].map((type) => (
                        <label key={type} className="flex items-center space-x-1.5 text-xs font-bold cursor-pointer">
                          <input
                            type="radio"
                            name="address_type"
                            value={type}
                            checked={addressType === type}
                            onChange={() => setAddressType(type as any)}
                            className="w-4 h-4 text-[#0071DC] border-gray-300 focus:ring-[#0071DC]"
                          />
                          <span className="capitalize">{type.toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0071DC] border-gray-300 focus:ring-[#0071DC]"
                  />
                  <label htmlFor="is_default" className="text-xs font-bold text-gray-600 cursor-pointer">
                    Make this my default address
                  </label>
                </div>

                <div className="flex space-x-2 pt-4 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/2 border border-gray-200 hover:bg-gray-50 text-[#041E42] py-2.5 rounded-full font-bold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 bg-[#0071DC] hover:bg-[#0046BE] text-white py-2.5 rounded-full font-black text-xs transition-colors flex items-center justify-center space-x-2 shadow-md focus:outline-none"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving...' : 'SAVE ADDRESS'}</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-6 text-center text-xs font-bold">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. Delivery destinations are securely mapped in compliance with real-time tracking standards.</p>
      </footer>

    </div>
  );
};
