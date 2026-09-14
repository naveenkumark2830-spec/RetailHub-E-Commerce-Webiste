import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, CheckCircle, X, AlertTriangle, Play, Sparkles, Lock, Truck,
  Plus, CreditCard, Landmark, Clock, Wallet, Banknote, RefreshCw, Check
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { getProductImage } from '../utils/productImageMap';

interface Address {
  address_id: string;
  address_type: string;
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

interface DeliveryOption {
  delivery_option_id: string;
  name: string;
  delivery_days_min: number;
  delivery_days_max: number;
  price: number;
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, customer, isAuthenticated } = useSessionStore();
  const { items, cartSummary, fetchCart, applyCouponCode, removeCouponCode, updateCartItemQuantity } = useCartStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('D1');

  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('gpay');
  const [forceSimulatedFailure, setForceSimulatedFailure] = useState<boolean>(false);
  const [couponInput, setCouponInput] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState<string>('UPI');

  // Modals / Overlays
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [transactionResult, setTransactionResult] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [transactionErrorMsg, setTransactionErrorMsg] = useState<string | null>(null);
  const [generatedOrderId, setGeneratedOrderId] = useState<string | null>(null);

  // Address Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLine1, setFormLine1] = useState('');
  const [formLine2, setFormLine2] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPostal, setFormPostal] = useState('');
  const [formType, setFormType] = useState('Home');
  const [formDefault, setFormDefault] = useState(true);

  // Payment Form States
  const [upiId, setUpiId] = useState('naveenkumar@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [walletProvider, setWalletProvider] = useState('Paytm');

  // Global Notification Messages
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Enforce authentication logic
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=checkout');
    } else if (session) {
      fetchCart();
      loadAddresses();
      loadDeliveryOptions();
      logTelemetryEvent('checkout_started', { status: 'initiated' });
    }
  }, [isAuthenticated, session]);

  const loadAddresses = async () => {
    if (!customer) return;
    try {
      const response = await fetch(`/api/checkout/addresses?customer_id=${customer.customer_id}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          const defaultAddr = data.addresses.find((a: Address) => a.is_default) || data.addresses[0];
          handleSelectAddress(defaultAddr);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDeliveryOptions = async () => {
    try {
      const response = await fetch('/api/checkout/delivery-options');
      const data = await response.json();
      if (response.ok && data.success) {
        setDeliveryOptions(data.options);
      }
    } catch (e) {
      console.error(e);
    }
  };

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
          page: 'checkout',
          device: 'desktop',
          browser: 'Chrome',
          metadata
        })
      });
    } catch (e) {
      console.warn('[Telemetry Event Failed]', e);
    }
  };

  const handleSelectAddress = async (addr: Address) => {
    setSelectedAddressId(addr.address_id);
    if (session && customer) {
      try {
        await fetch('/api/checkout/log-address-selected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.session_id,
            customer_id: customer.customer_id,
            address_id: addr.address_id,
            city: addr.city,
            state: addr.state
          })
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSelectDelivery = async (opt: DeliveryOption) => {
    setSelectedDeliveryId(opt.delivery_option_id);
    if (session && customer) {
      try {
        await fetch('/api/checkout/log-delivery-selected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.session_id,
            customer_id: customer.customer_id,
            delivery_option: opt.name.toUpperCase(),
            delivery_fee: opt.price,
            estimated_days: opt.delivery_days_max
          })
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSelectPayment = async (method: string) => {
    setPaymentMethod(method);
    if (session && customer) {
      try {
        await fetch('/api/checkout/log-payment-method-selected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.session_id,
            customer_id: customer.customer_id,
            payment_method: method
          })
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!formName || !formPhone || !formLine1 || !formCity || !formState || !formPostal) {
      showTemporaryError('All fields with asterisks (*) are required.');
      return;
    }

    try {
      const response = await fetch('/api/checkout/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          address_type: formType,
          full_name: formName,
          phone: formPhone,
          address_line_1: formLine1,
          address_line_2: formLine2 || null,
          city: formCity,
          state: formState,
          postal_code: formPostal,
          country: 'India',
          is_default: formDefault,
          session_id: session?.session_id
        })
      });

      if (response.ok) {
        setIsAddAddressOpen(false);
        setFormName('');
        setFormPhone('');
        setFormLine1('');
        setFormLine2('');
        setFormCity('');
        setFormState('');
        setFormPostal('');
        await loadAddresses();
        showTemporaryAlert('Address added successfully!');
      }
    } catch (e) {
      showTemporaryError('Failed to save address.');
    }
  };

  const handlePlaceOrder = async () => {
    if (!session || !customer || !selectedAddressId) {
      showTemporaryError('Please select a delivery address to proceed.');
      return;
    }

    const orderTotal = getGrandTotal();
    setPaidAmount(orderTotal);
    setConfirmedPaymentMethod(paymentMethod);

    setIsProcessing(true);
    setTransactionResult(null);
    setTransactionErrorMsg(null);
    setProcessingStep(0);

    const steps = [
      'Validating order pricing structures...',
      'Checking warehouse stock capacity...',
      'Initializing secure banking transaction...',
      'Simulating payment gateway handshake...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 900));
      setProcessingStep(i + 1);
    }

    try {
      const response = await fetch('/api/checkout/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          customer_id: customer.customer_id,
          address_id: selectedAddressId,
          delivery_option_id: selectedDeliveryId,
          payment_method: paymentMethod,
          simulateFail: forceSimulatedFailure
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTransactionResult('SUCCESS');
        setGeneratedOrderId(data.result.order_id);
        setPaidAmount(data.result?.total_amount ? Number(data.result.total_amount) : orderTotal);
        setConfirmedPaymentMethod(paymentMethod);
        fetchCart();
      } else {
        setTransactionResult('FAILED');
        setTransactionErrorMsg(data.error || 'The transaction was declined.');
        setGeneratedOrderId(data.result?.order_id || null);
      }
    } catch (e: any) {
      setTransactionResult('FAILED');
      setTransactionErrorMsg(e.message || 'Placing order failed.');
    }
  };

  const handleRetryPayment = async () => {
    if (!session || !customer || !generatedOrderId) return;

    setIsProcessing(true);
    setTransactionResult(null);
    setTransactionErrorMsg(null);
    setProcessingStep(0);

    const steps = [
      'Initiating transaction retry pipeline...',
      'Simulating payment gateway response...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProcessingStep(i + 1);
    }

    try {
      const response = await fetch('/api/checkout/retry-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: generatedOrderId,
          payment_method: paymentMethod,
          simulateFail: forceSimulatedFailure,
          session_id: session.session_id,
          customer_id: customer.customer_id,
          address_id: selectedAddressId
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTransactionResult('SUCCESS');
        setPaidAmount(data.result?.total_amount ? Number(data.result.total_amount) : (paidAmount || getGrandTotal()));
        setConfirmedPaymentMethod(paymentMethod);
        fetchCart();
      } else {
        setTransactionResult('FAILED');
        setTransactionErrorMsg(data.error || 'Retry attempt was declined.');
      }
    } catch (e: any) {
      setTransactionResult('FAILED');
      setTransactionErrorMsg(e.message || 'Retry payment failed.');
    }
  };

  const showTemporaryAlert = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 3000);
  };

  const showTemporaryError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const getSubtotal = () => cartSummary?.subtotal || 0;
  const getCouponDiscount = () => cartSummary?.discount || 0;
  const getDeliveryFee = () => {
    const selectedOpt = deliveryOptions.find(o => o.delivery_option_id === selectedDeliveryId);
    return selectedOpt ? Number(selectedOpt.price) : 0;
  };
  const getTax = () => {
    const net = getSubtotal() - getCouponDiscount();
    return Number((net * 0.18).toFixed(2));
  };
  const getGrandTotal = () => {
    const net = getSubtotal() - getCouponDiscount();
    return net + getTax() + getDeliveryFee();
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#172033] font-sans flex flex-col justify-between">
      
      {/* HEADER */}
      <Header />

      {/* FLOATING ALERTS */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#0875E1] text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold border border-white/20"
          >
            <CheckCircle className="w-4 h-4 text-[#FFC20A] fill-[#FFC20A]" />
            <span>{infoMessage}</span>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold border border-white/20"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHECKOUT BODY CONTAINER */}
      <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 flex-grow">
        
        {/* HEADER TITLE & STEPPER BAR ROW */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A55] tracking-tight">Checkout</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Almost there! Review your details and place your order.</p>
          </div>

          {/* 4-STEP PROGRESS STEPPER */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            {/* Step 1 */}
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-[#0875E1] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                1
              </div>
              <span className="font-bold text-[#0875E1]">Address</span>
            </div>

            <div className="w-8 sm:w-12 h-[2px] bg-gray-300"></div>

            {/* Step 2 */}
            <div className="flex items-center space-x-2 opacity-70">
              <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <span className="font-medium text-gray-600">Delivery</span>
            </div>

            <div className="w-8 sm:w-12 h-[2px] bg-gray-300"></div>

            {/* Step 3 */}
            <div className="flex items-center space-x-2 opacity-70">
              <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <span className="font-medium text-gray-600">Payment</span>
            </div>

            <div className="w-8 sm:w-12 h-[2px] bg-gray-300"></div>

            {/* Step 4 */}
            <div className="flex items-center space-x-2 opacity-70">
              <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <span className="font-medium text-gray-600 hidden sm:inline">Review & Place Order</span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 8 COLUMNS: STEPS 1, 2, 3 CARDS */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* STEP 1: DELIVERY ADDRESS CARD */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-[#0875E1] text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-[#0875E1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0B2A55]">Delivery Address</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddAddressOpen(true)}
                  className="text-xs font-bold text-[#0875E1] hover:underline"
                >
                  Change
                </button>
              </div>

              {/* ADDRESS CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.address_id;
                  return (
                    <div 
                      key={addr.address_id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {/* Top Header Row with Radio & Default Badge */}
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#0875E1] bg-[#0875E1]' : 'border-gray-400'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                            </div>
                            <span className="font-bold text-[#0B2A55] text-xs">
                              {addr.full_name} {addr.address_type ? `(${addr.address_type})` : ''}
                            </span>
                          </div>
                          {addr.is_default && (
                            <span className="text-[10px] font-bold text-[#0875E1] border border-blue-200 bg-blue-50 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>

                        {/* Address Details */}
                        <p className="text-[11px] text-gray-600 leading-relaxed font-normal pl-6">
                          {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}<br />
                          {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                      </div>

                      {/* Phone Number */}
                      <p className="text-[11px] text-gray-600 font-normal pl-6 mt-3">
                        Phone: {addr.phone}
                      </p>
                    </div>
                  );
                })}

                {/* ADD NEW ADDRESS DASHED BUTTON CARD */}
                <div 
                  onClick={() => setIsAddAddressOpen(true)}
                  className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0875E1] bg-gray-50/50 hover:bg-blue-50/10 cursor-pointer flex flex-col items-center justify-center text-center space-y-2 min-h-[140px] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full border border-[#0875E1] text-[#0875E1] flex items-center justify-center group-hover:bg-[#0875E1] group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#0875E1]">Add New Address</span>
                </div>
              </div>
            </div>

            {/* STEP 2: DELIVERY OPTIONS CARD */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 pb-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#0875E1] text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-[#0875E1]" />
                  <h2 className="text-base font-bold text-[#0B2A55]">Delivery Options</h2>
                </div>
              </div>
              <p className="text-xs text-gray-500 pl-11 mb-5">Choose a delivery speed that works for you.</p>

              {/* 3 DELIVERY SPEED CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. FREE Delivery */}
                <div 
                  onClick={() => {
                    const opt = deliveryOptions.find(o => o.delivery_option_id === 'D1') || { delivery_option_id: 'D1', name: 'FREE Delivery', price: 0, delivery_days_min: 1, delivery_days_max: 2 };
                    handleSelectDelivery(opt as DeliveryOption);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedDeliveryId === 'D1' 
                      ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedDeliveryId === 'D1' ? 'border-[#0875E1] bg-[#0875E1]' : 'border-gray-400'}`}>
                          {selectedDeliveryId === 'D1' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className="font-bold text-[#0B2A55] text-xs">FREE Delivery</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">FREE</span>
                    </div>
                    <p className="text-xs font-bold text-emerald-600 pl-6">Tomorrow, 15 Sep</p>
                    <p className="text-[11px] text-gray-500 pl-6 mt-1">Order within 5 hrs 12 mins</p>
                  </div>
                </div>

                {/* 2. Express Delivery */}
                <div 
                  onClick={() => {
                    const opt = deliveryOptions.find(o => o.delivery_option_id === 'D2') || { delivery_option_id: 'D2', name: 'Express Delivery', price: 40, delivery_days_min: 0, delivery_days_max: 1 };
                    handleSelectDelivery(opt as DeliveryOption);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedDeliveryId === 'D2' 
                      ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedDeliveryId === 'D2' ? 'border-[#0875E1] bg-[#0875E1]' : 'border-gray-400'}`}>
                          {selectedDeliveryId === 'D2' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className="font-bold text-[#0B2A55] text-xs">Express Delivery</span>
                      </div>
                      <span className="text-xs font-bold text-[#0B2A55]">₹40</span>
                    </div>
                    <p className="text-xs font-medium text-gray-700 pl-6">Today by 10 PM</p>
                    <p className="text-[11px] text-gray-500 pl-6 mt-1">Get it in 8 hrs 12 mins</p>
                  </div>
                </div>

                {/* 3. Scheduled Delivery */}
                <div 
                  onClick={() => {
                    const opt = deliveryOptions.find(o => o.delivery_option_id === 'D3') || { delivery_option_id: 'D3', name: 'Scheduled Delivery', price: 0, delivery_days_min: 2, delivery_days_max: 5 };
                    handleSelectDelivery(opt as DeliveryOption);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedDeliveryId === 'D3' 
                      ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedDeliveryId === 'D3' ? 'border-[#0875E1] bg-[#0875E1]' : 'border-gray-400'}`}>
                          {selectedDeliveryId === 'D3' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                        <span className="font-bold text-[#0B2A55] text-xs">Scheduled Delivery</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">FREE</span>
                    </div>
                    <p className="text-xs font-medium text-gray-700 pl-6">Choose a date & time</p>
                    <p className="text-[11px] text-gray-500 pl-6 mt-1">Select your preferred slot</p>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: PAYMENT METHOD CARD */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 pb-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#0875E1] text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#0875E1]" />
                  <h2 className="text-base font-bold text-[#0B2A55]">Payment Method</h2>
                </div>
              </div>
              <p className="text-xs text-gray-500 pl-11 mb-5">Choose a payment method to continue.</p>

              {/* SIDE-BY-SIDE TABS AND CONTENT CONTAINER */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-gray-200 rounded-xl overflow-hidden">
                
                {/* LEFT TAB SIDEBAR (4 COLUMNS) */}
                <div className="md:col-span-4 bg-gray-50/70 border-r border-gray-200 divide-y divide-gray-200/60">
                  {[
                    { id: 'UPI', label: 'UPI', icon: (
                      <svg className="w-4 h-4 text-[#0875E1]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 19h20L12 2zm0 3.8L18.5 17H5.5L12 5.8z" />
                      </svg>
                    ) },
                    { id: 'CARD', label: 'Credit / Debit Card', icon: <CreditCard className="w-4 h-4 text-gray-500" /> },
                    { id: 'NETBANKING', label: 'Net Banking', icon: <Landmark className="w-4 h-4 text-gray-500" /> },
                    { id: 'EMI', label: 'EMI (No Cost)', icon: <Clock className="w-4 h-4 text-gray-500" /> },
                    { id: 'WALLET', label: 'Wallets', icon: <Wallet className="w-4 h-4 text-gray-500" /> },
                    { id: 'COD', label: 'Cash on Delivery', icon: <Banknote className="w-4 h-4 text-gray-500" /> }
                  ].map((tab) => {
                    const isActive = paymentMethod === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSelectPayment(tab.id)}
                        className={`w-full text-left px-4 py-3.5 flex items-center space-x-3 text-xs font-bold transition-all relative ${
                          isActive 
                            ? 'bg-white text-[#0875E1]' 
                            : 'text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0875E1]"></div>
                        )}
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* RIGHT CONTENT PANEL (8 COLUMNS) */}
                <div className="md:col-span-8 p-6 bg-white flex flex-col justify-between">
                  {paymentMethod === 'UPI' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-[#0B2A55]">Pay using UPI</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Fast, secure and easy payments</p>
                      </div>

                      {/* 5 UPI APP OPTIONS LOGOS */}
                      <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {/* Google Pay */}
                        <div 
                          onClick={() => setSelectedUpiApp('gpay')}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                            selectedUpiApp === 'gpay' ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-8 h-8 flex items-center justify-center mb-1">
                            <span className="font-extrabold text-xs text-[#4285F4]">G<span className="text-[#EA4335]">P</span><span className="text-[#FBBC05]">a</span><span className="text-[#34A853]">y</span></span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-700">Google Pay</span>
                        </div>

                        {/* PhonePe */}
                        <div 
                          onClick={() => setSelectedUpiApp('phonepe')}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                            selectedUpiApp === 'phonepe' ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#5f259f] text-white flex items-center justify-center font-bold text-xs mb-1">
                            पे
                          </div>
                          <span className="text-[10px] font-bold text-gray-700">PhonePe</span>
                        </div>

                        {/* Paytm */}
                        <div 
                          onClick={() => setSelectedUpiApp('paytm')}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                            selectedUpiApp === 'paytm' ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-8 h-7 flex items-center justify-center font-black text-[11px] text-[#002e6e] mb-1">
                            Paytm
                          </div>
                          <span className="text-[10px] font-bold text-gray-700">Paytm</span>
                        </div>

                        {/* Amazon Pay */}
                        <div 
                          onClick={() => setSelectedUpiApp('amazonpay')}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                            selectedUpiApp === 'amazonpay' ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#232f3e] text-[#ff9900] flex items-center justify-center font-extrabold text-[10px] mb-1">
                            a
                          </div>
                          <span className="text-[10px] font-bold text-gray-700">Amazon Pay</span>
                        </div>

                        {/* Other UPI Apps */}
                        <div 
                          onClick={() => setSelectedUpiApp('other')}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                            selectedUpiApp === 'other' ? 'border-[#0875E1] bg-blue-50/20 ring-2 ring-[#0875E1]/20' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-7 h-7 text-gray-500 flex items-center justify-center mb-1">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-bold text-gray-700">Other UPI Apps</span>
                        </div>
                      </div>

                      {/* ENTER UPI ID INPUT */}
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-[#0B2A55] block">Enter UPI ID</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="naveenkumar@okhdfcbank"
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-[#0875E1] pr-12 font-medium"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <span className="text-[10px] font-bold text-[#002e6e] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              UPI
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SAVE UPI CHECKBOX */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input 
                          type="checkbox" 
                          id="save_upi" 
                          defaultChecked 
                          className="w-4 h-4 rounded text-[#0875E1] border-gray-300 focus:ring-[#0875E1]"
                        />
                        <label htmlFor="save_upi" className="text-xs text-gray-600 font-medium cursor-pointer">
                          Save UPI ID for faster payments
                        </label>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'CARD' && (
                    <div className="space-y-4 text-xs">
                      <h3 className="text-sm font-bold text-[#0B2A55]">Credit or Debit Card</h3>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 block">Card Number</label>
                        <input 
                          type="text" 
                          maxLength={19}
                          placeholder="4532 8921 4821 9920"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                          className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#0875E1]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 block">Expiry Date</label>
                          <input 
                            type="text" 
                            maxLength={5}
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#0875E1]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 block">CVV</label>
                          <input 
                            type="password" 
                            maxLength={3}
                            placeholder="***"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#0875E1]"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 block">Cardholder Name</label>
                        <input 
                          type="text" 
                          placeholder="Naveen Kumar"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#0875E1]"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'NETBANKING' && (
                    <div className="space-y-4 text-xs">
                      <h3 className="text-sm font-bold text-[#0B2A55]">Net Banking</h3>
                      <p className="text-gray-500">Select your bank from the list to proceed to secure login.</p>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0875E1]">
                        <option>HDFC Bank</option>
                        <option>ICICI Bank</option>
                        <option>State Bank of India (SBI)</option>
                        <option>Axis Bank</option>
                        <option>Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}

                  {paymentMethod === 'EMI' && (
                    <div className="space-y-4 text-xs">
                      <h3 className="text-sm font-bold text-[#0B2A55]">No Cost EMI Options</h3>
                      <p className="text-gray-500">Select your credit card bank for zero interest monthly EMI plans.</p>
                    </div>
                  )}

                  {paymentMethod === 'WALLET' && (
                    <div className="space-y-4 text-xs">
                      <h3 className="text-sm font-bold text-[#0B2A55]">Digital Wallets</h3>
                      <select 
                        value={walletProvider}
                        onChange={(e) => setWalletProvider(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0875E1]"
                      >
                        <option value="Paytm">Paytm Wallet</option>
                        <option value="PhonePe">PhonePe Wallet</option>
                        <option value="AmazonPay">Amazon Pay Balance</option>
                      </select>
                    </div>
                  )}

                  {paymentMethod === 'COD' && (
                    <div className="space-y-3 text-xs">
                      <h3 className="text-sm font-bold text-[#0B2A55]">Cash on Delivery (COD)</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Pay ₹{getGrandTotal().toLocaleString()} in cash or via QR scan when your parcel is delivered to your doorstep.
                      </p>
                    </div>
                  )}

                  {/* SIMULATED FAILURE CHECKBOX */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="fail_sim" 
                      checked={forceSimulatedFailure}
                      onChange={(e) => setForceSimulatedFailure(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="fail_sim" className="text-[11px] font-semibold text-gray-500 cursor-pointer">
                      Simulate payment failure test
                    </label>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* RIGHT 4 COLUMNS: STICKY ORDER SUMMARY SIDEBAR */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5 sticky top-24">
              
              {/* Order Summary Header with Edit Cart link */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-base font-bold text-[#0B2A55]">
                  Order Summary <span className="text-gray-500 font-medium text-xs">({items.length} items)</span>
                </h3>
                <button 
                  onClick={() => navigate('/cart')}
                  className="text-xs font-bold text-[#0875E1] hover:underline"
                >
                  Edit Cart
                </button>
              </div>

              {/* CART ITEMS LIST WITH THUMBNAIL, QTY SELECTOR, PRICE */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => {
                  const imgUrl = getProductImage({ product_id: item.product_id, name: item.name });
                  return (
                    <div key={item.product_id} className="flex items-center justify-between gap-3 text-xs py-1">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg border border-gray-200 p-1 flex items-center justify-center flex-shrink-0 bg-white">
                          <img src={imgUrl} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-800 truncate text-xs">{item.name}</h4>
                          <div className="flex items-center space-x-1.5 mt-1">
                            <span className="text-gray-500 text-[11px]">Qty:</span>
                            <select 
                              value={item.quantity}
                              onChange={(e) => updateCartItemQuantity(item.product_id, Number(e.target.value), item.quantity)}
                              className="border border-gray-300 rounded px-1 py-0.5 text-[11px] bg-gray-50 font-bold focus:outline-none"
                            >
                              {[1,2,3,4,5,6,7,8,9,10].map(q => (
                                <option key={q} value={q}>{q}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 font-bold text-gray-900 text-xs">
                        ₹{(item.sale_price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COST BREAKDOWN DEDUCTIONS */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Item Total</span>
                  <span className="font-bold text-gray-800">₹{getSubtotal().toLocaleString()}</span>
                </div>

                {getCouponDiscount() > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>- ₹{getCouponDiscount().toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-bold text-emerald-600">
                    {getDeliveryFee() === 0 ? 'FREE' : `₹${getDeliveryFee().toLocaleString()}`}
                  </span>
                </div>

                {/* Grand Total Row */}
                <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-[#0B2A55]">Total Amount</span>
                    <p className="text-[10px] text-gray-400 font-normal">Inclusive of all taxes</p>
                  </div>
                  <span className="text-xl font-extrabold text-[#0B2A55]">
                    ₹{getGrandTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* COUPON INPUT OPTION */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                {cartSummary?.coupon_code ? (
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>Coupon '{cartSummary.coupon_code}' Applied</span>
                    <button 
                      onClick={() => removeCouponCode()} 
                      className="text-red-500 hover:underline text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!couponInput.trim()) return;
                      await applyCouponCode(couponInput.trim().toUpperCase());
                      setCouponInput('');
                      showTemporaryAlert('Promo coupon applied!');
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      type="text" 
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Promo / Coupon Code"
                      className="flex-grow bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#0875E1]"
                    />
                    <button 
                      type="submit"
                      className="bg-[#0875E1] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>

              {/* GOLD PLACE ORDER BUTTON */}
              <button 
                onClick={handlePlaceOrder}
                disabled={items.length === 0 || !selectedAddressId}
                className="w-full bg-[#FFC20A] hover:bg-[#f0b400] text-[#0B2A55] py-3.5 rounded-xl font-extrabold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-[#0B2A55]" />
                <span>Place Order</span>
              </button>

              {/* 100% SECURE PAYMENTS SHIELD CARD */}
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3.5 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-emerald-900">100% Secure Payments</h5>
                  <p className="text-[10px] text-emerald-700 font-medium">Your payment information is safe with us.</p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM ASSURANCES TICKER FOOTER */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
            
            {/* 1. Easy Returns */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2A55]">Easy Returns</h4>
                <p className="text-[10px] text-gray-500">Hassle-free returns within 7 days</p>
              </div>
            </div>

            {/* 2. Secure Payments */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2A55]">Secure Payments</h4>
                <p className="text-[10px] text-gray-500">PCI DSS compliant</p>
              </div>
            </div>

            {/* 3. Genuine Products */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2A55]">Genuine Products</h4>
                <p className="text-[10px] text-gray-500">100% authentic products</p>
              </div>
            </div>

            {/* 4. Dedicated Support */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#0875E1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2A55]">Dedicated Support</h4>
                <p className="text-[10px] text-gray-500">We're here to help</p>
              </div>
            </div>

          </div>

          {/* Slogan Signature */}
          <div className="text-center md:text-right flex-shrink-0">
            <span className="font-serif italic text-lg sm:text-xl font-bold text-[#0B2A55] tracking-wide relative">
              Shop More, Live Better
              <div className="h-1 bg-[#FFC20A] rounded-full w-full mt-0.5"></div>
            </span>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <Footer />

      {/* MODAL: ADD ADDRESS */}
      <AnimatePresence>
        {isAddAddressOpen && (
          <div className="fixed inset-0 bg-[#0B2A55]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-xs text-[#172033]"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-sm font-extrabold text-[#0B2A55] uppercase tracking-wider">Add Shipping Address</h3>
                <button onClick={() => setIsAddAddressOpen(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-700" />
                </button>
              </div>

              <form onSubmit={handleAddAddressSubmit} className="space-y-4 font-bold text-gray-700">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full border border-gray-200 p-2.5 rounded-lg focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Mobile Number *</label>
                    <input 
                      type="text" 
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full border border-gray-200 p-2.5 rounded-lg focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Flat / House Number / Building *</label>
                  <input 
                    type="text" 
                    required
                    value={formLine1}
                    onChange={(e) => setFormLine1(e.target.value)}
                    className="w-full border border-gray-200 p-2.5 rounded-lg focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                <div className="space-y-1">
                  <label>Street / Area / Colony (Optional)</label>
                  <input 
                    type="text" 
                    value={formLine2}
                    onChange={(e) => setFormLine2(e.target.value)}
                    className="w-full border border-gray-200 p-2.5 rounded-lg focus:outline-none focus:border-[#0875E1]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label>City *</label>
                    <input 
                      type="text" 
                      required
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full border border-gray-200 p-2.5 rounded-lg focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>State *</label>
                    <input 
                      type="text" 
                      required
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="w-full border border-gray-200 p-2.5 rounded-lg focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>PIN Code *</label>
                    <input 
                      type="text" 
                      required
                      value={formPostal}
                      onChange={(e) => setFormPostal(e.target.value)}
                      className="w-full border border-gray-200 p-2.5 rounded-lg focus:outline-none focus:border-[#0875E1]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-center pt-2">
                  <label>Address Type:</label>
                  <div className="flex gap-2">
                    {['Home', 'Work'].map(type => (
                      <button 
                        type="button" 
                        key={type}
                        onClick={() => setFormType(type)}
                        className={`px-3 py-1.5 rounded-lg border text-xs ${formType === type ? 'bg-[#0B2A55] text-white border-transparent' : 'bg-white border-gray-200'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5">
                  <input 
                    type="checkbox" 
                    id="addr_def" 
                    checked={formDefault}
                    onChange={(e) => setFormDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0875E1]"
                  />
                  <label htmlFor="addr_def" className="cursor-pointer">Set as Default Shipping Address</label>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-3 rounded-lg font-bold text-xs transition-colors mt-2"
                >
                  Save Address
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSACTION OVERLAY MODAL */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 bg-[#0B2A55]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border"
            >
              {transactionResult === null ? (
                // Processing Animation Statuses
                <div className="space-y-4">
                  <div className="w-12 h-12 border-4 border-[#0875E1] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h3 className="text-sm font-extrabold text-[#0B2A55] uppercase tracking-wider">Securing Transaction</h3>
                  <div className="text-xs text-[#667085] space-y-1.5">
                    <p className={processingStep >= 1 ? 'text-emerald-600 font-bold' : ''}>✓ Pricing verification</p>
                    <p className={processingStep >= 2 ? 'text-emerald-600 font-bold' : ''}>
                      {processingStep >= 2 ? '✓ Inventory items locked' : '• Checking warehouse stock'}
                    </p>
                    <p className={processingStep >= 3 ? 'text-emerald-600 font-bold' : ''}>
                      {processingStep >= 3 ? '✓ Secure connection initialized' : '• Connecting gateway api'}
                    </p>
                    <p className={processingStep >= 4 ? 'text-emerald-600 font-bold' : ''}>
                      {processingStep >= 4 ? '✓ Processing checkout request' : '• Simulating bank response'}
                    </p>
                  </div>
                </div>
              ) : transactionResult === 'SUCCESS' ? (
                // Success Scenario
                <div className="space-y-5">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-emerald-600">Order Placed Successfully!</h3>
                    <p className="text-xs text-[#667085]">Order ID: <span className="font-mono font-bold text-[#172033]">{generatedOrderId}</span></p>
                    <p className="text-xs text-[#667085] leading-relaxed px-2">
                      Your payment of <span className="font-black text-[#0B2A55]">₹{(paidAmount || getGrandTotal()).toLocaleString()}</span> via <span className="font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{confirmedPaymentMethod || paymentMethod}</span> was verified. Your items are being prepared for shipping!
                    </p>
                  </div>

                  <button 
                    onClick={() => { setIsProcessing(false); navigate('/orders'); }}
                    className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-3 rounded-lg font-bold text-xs transition-colors"
                  >
                    View My Orders
                  </button>
                </div>
              ) : (
                // Failed Scenario
                <div className="space-y-5">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-rose-100">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-rose-600">Payment Unsuccessful</h3>
                    <p className="text-xs text-[#667085]">Order Ref: <span className="font-mono font-bold text-[#172033]">{generatedOrderId}</span></p>
                    <p className="text-xs text-[#667085] leading-relaxed px-2">
                      {transactionErrorMsg || 'The transaction was declined by the banking interface.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsProcessing(false)}
                      className="w-1/2 border border-gray-200 py-3 rounded-lg font-bold text-xs hover:bg-gray-50 transition-colors"
                    >
                      Close / Edit
                    </button>
                    <button 
                      onClick={handleRetryPayment}
                      className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Retry Payment</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

