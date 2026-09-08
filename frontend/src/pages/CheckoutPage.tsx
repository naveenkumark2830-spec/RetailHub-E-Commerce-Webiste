import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, ShieldCheck, CheckCircle, X, AlertTriangle, Play, Sparkles, ArrowLeft
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { useCartStore } from '../store/useCartStore';

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
  const { items, cartSummary, fetchCart, applyCouponCode, removeCouponCode } = useCartStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('D1');

  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
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
  const [upiId, setUpiId] = useState('naveen@upi');
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
    // Track selected address behavior event
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

    // Simulated step animation sequences
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
        fetchCart(); // clean active cart
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
        fetchCart(); // clean active cart
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
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] font-sans flex flex-col justify-between">
      
      {/* FLOATING ALERTS */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#0071DC] text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold font-mono border border-white/20"
          >
            <CheckCircle className="w-4 h-4 text-[#FFC220] fill-[#FFC220]" />
            <span>{infoMessage}</span>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-bold font-mono border border-white/20"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="bg-[#0071DC] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div onClick={() => navigate('/home')} className="flex items-center space-x-2 cursor-pointer">
              <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black tracking-tight">NexDay</span>
            </div>
            
            <button 
              onClick={() => navigate('/cart')}
              className="flex items-center space-x-1.5 text-xs font-bold text-blue-100 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-xl border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Cart</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold font-mono text-blue-100 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SECURE 256-BIT SSL CHECKOUT</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: CHECKOUT STEPS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: DELIVERY ADDRESS */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-black flex items-center gap-2">
                <span className="bg-[#041E42] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                <span>Delivery Address</span>
              </h2>
              <button 
                onClick={() => setIsAddAddressOpen(true)}
                className="text-xs font-black text-[#0071DC] hover:underline"
              >
                + Add New Address
              </button>
            </div>

            {addresses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div 
                    key={addr.address_id}
                    onClick={() => handleSelectAddress(addr)}
                    className={`p-4 rounded-2xl border-2 text-xs transition-all cursor-pointer relative ${selectedAddressId === addr.address_id ? 'border-[#0071DC] bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-[10px] uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        {addr.address_type}
                      </span>
                      {addr.is_default && (
                        <span className="text-[9px] font-mono text-emerald-600 font-bold">Default</span>
                      )}
                    </div>
                    <p className="font-extrabold text-gray-800 text-sm mb-1">{addr.full_name}</p>
                    <p className="text-gray-500 leading-relaxed">
                      {addr.address_line_1}, {addr.address_line_2 ? `${addr.address_line_2}, ` : ''}{addr.city}, {addr.state} - {addr.postal_code}
                    </p>
                    <p className="text-gray-400 mt-2 font-mono">Mob: {addr.phone}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400 font-bold space-y-3">
                <p>No shipping addresses found on your account.</p>
                <button 
                  onClick={() => setIsAddAddressOpen(true)}
                  className="bg-[#0071DC] text-white px-4 py-2 rounded-full font-bold hover:bg-[#0046BE] transition-colors"
                >
                  Create Shipping Address
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: DELIVERY OPTION */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-black flex items-center gap-2 border-b pb-3">
              <span className="bg-[#041E42] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
              <span>Delivery Option</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {deliveryOptions.map((opt) => (
                <div 
                  key={opt.delivery_option_id}
                  onClick={() => handleSelectDelivery(opt)}
                  className={`p-4 rounded-2xl border-2 text-xs transition-all cursor-pointer flex flex-col justify-between h-28 ${selectedDeliveryId === opt.delivery_option_id ? 'border-[#0071DC] bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <div>
                    <h4 className="font-extrabold text-gray-800">{opt.name}</h4>
                    <p className="text-gray-400 text-[10px] mt-0.5">
                      {opt.delivery_option_id === 'D3' ? 'Delivered by tonight' : `Delivered in ${opt.delivery_days_min}–${opt.delivery_days_max} days`}
                    </p>
                  </div>
                  <span className="text-sm font-black text-[#041E42]">
                    {opt.price == 0 ? 'FREE' : `₹${opt.price}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: REVIEW ORDER ITEMS */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-black flex items-center gap-2 border-b pb-3">
              <span className="bg-[#041E42] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
              <span>Review Order Items</span>
            </h2>

            <div className="divide-y text-xs">
              {items.map((item) => (
                <div key={item.product_id} className="py-3.5 flex justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold uppercase text-gray-300">{item.brand}</span>
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-gray-800 leading-tight">{item.name}</h4>
                      <p className="text-gray-400 text-[10px]">Quantity: <span className="font-bold text-gray-600">{item.quantity}</span></p>
                    </div>
                  </div>
                  <span className="font-black text-gray-800 text-sm whitespace-nowrap">
                    ₹{(item.sale_price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 4: PAYMENT OPTIONS */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-black flex items-center gap-2 border-b pb-3">
              <span className="bg-[#041E42] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">4</span>
              <span>Payment Method</span>
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              {[
                { id: 'UPI', label: '⚡ UPI / Google Pay' },
                { id: 'CARD', label: '💳 Credit / Debit Card' },
                { id: 'WALLET', label: '👛 Digital Wallet' },
                { id: 'COD', label: '💵 Cash on Delivery (COD)' }
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => handleSelectPayment(m.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-colors ${paymentMethod === m.id ? 'border-[#0071DC] bg-blue-50/50 text-[#0071DC]' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Interactive payment forms */}
            {paymentMethod === 'UPI' && (
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">Enter UPI ID</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@bank"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0071DC]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">⚡ UPI</span>
                </div>
                <p className="text-[10px] text-gray-400 font-normal">A transaction authorization notification will be pushed to your mobile device.</p>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">Card Number</label>
                  <input 
                    type="text" 
                    maxLength={19}
                    placeholder="4532 8921 4821 9920"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0071DC]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">Expiry Date</label>
                    <input 
                      type="text" 
                      maxLength={5}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">CVV</label>
                    <input 
                      type="password" 
                      maxLength={3}
                      placeholder="***"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">Cardholder Name</label>
                  <input 
                    type="text" 
                    placeholder="Naveen Kumar"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0071DC]"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'WALLET' && (
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">Select Wallet Provider</label>
                <select 
                  value={walletProvider}
                  onChange={(e) => setWalletProvider(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#0071DC]"
                >
                  <option value="Paytm">Paytm Wallet</option>
                  <option value="PhonePe">PhonePe Wallet</option>
                  <option value="AmazonPay">Amazon Pay Balance</option>
                </select>
              </div>
            )}

            {paymentMethod === 'COD' && (
              <div className="bg-[#0071DC]/5 p-4 rounded-2xl border border-[#0071DC]/10 space-y-2">
                <span className="text-xs font-bold text-[#0071DC] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cash on Delivery Confirmed</span>
                </span>
                <p className="text-[10px] text-gray-500 leading-relaxed font-normal">
                  Pay ₹{getGrandTotal().toLocaleString()} in cash or scan the delivery executive's UPI QR code when your package is delivered.
                </p>
              </div>
            )}

            {/* Test Simulation failure tool checkbox */}
            <div className="border-t pt-4 flex items-start space-x-2.5 bg-rose-50/50 border-rose-100 p-3 rounded-2xl border">
              <input 
                type="checkbox" 
                id="fail_sim" 
                checked={forceSimulatedFailure}
                onChange={(e) => setForceSimulatedFailure(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 mt-0.5"
              />
              <label htmlFor="fail_sim" className="text-[10px] font-bold text-rose-800 cursor-pointer">
                Simulate Payment Failure (Declined by Bank)
                <p className="font-mono text-gray-400 font-normal mt-0.5">Use this to test failure retry telemetry event logs in events.jsonl.</p>
              </label>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY ORDER SUMMARY PANEL */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5 sticky top-24">
            <h3 className="text-base font-black border-b pb-3">Checkout Totals</h3>

            <div className="space-y-3.5 text-xs font-bold text-gray-500">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-gray-800">₹{getSubtotal().toLocaleString()}</span>
              </div>

              {getCouponDiscount() > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon Deduction</span>
                  <span>-₹{getCouponDiscount().toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping & Handling</span>
                <span className="text-gray-800">
                  {getDeliveryFee() === 0 ? 'FREE' : `₹${getDeliveryFee().toLocaleString()}`}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Estimated GST (18%)</span>
                <span className="text-gray-800">₹{getTax().toLocaleString()}</span>
              </div>

              <div className="border-t pt-4 flex justify-between items-baseline text-[#041E42]">
                <span className="text-sm font-black">Order Total</span>
                <span className="text-2xl font-black">₹{getGrandTotal().toLocaleString()}</span>
              </div>
            </div>

            {/* Promo Code Input Panel */}
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2.5">
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">Apply Promo Coupon</span>
              {cartSummary?.coupon_code ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-emerald-800 font-bold">
                  <div className="flex items-center space-x-1.5 font-sans">
                    <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                      {cartSummary.coupon_code}
                    </span>
                    <span className="text-[10px]">Applied!</span>
                  </div>
                  <button 
                    onClick={async () => {
                      await removeCouponCode();
                      showTemporaryAlert('Promo coupon removed successfully.');
                    }}
                    className="text-gray-400 hover:text-red-500 text-[10px] uppercase font-bold"
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
                    showTemporaryAlert('Applying promo coupon...');
                  }}
                  className="flex gap-2"
                >
                  <input 
                    type="text" 
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="e.g. SAVE10, NEXDAY500"
                    className="flex-grow bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0071DC] font-bold"
                  />
                  <button 
                    type="submit"
                    className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                  >
                    Apply
                  </button>
                </form>
              )}
            </div>

            <button 
              onClick={handlePlaceOrder}
              disabled={items.length === 0 || !selectedAddressId}
              className="w-full bg-[#FFC220] hover:bg-[#E5AC12] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-[#041E42] py-3.5 rounded-full font-black text-xs transition-colors shadow-md flex items-center justify-center space-x-1"
            >
              <span>Place Your Order</span>
            </button>

            <div className="text-[10px] text-gray-400 text-center leading-relaxed">
              By placing your order, you agree to NexDay's terms of service and conditional privacy policies.
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-8 mt-12 text-center text-xs font-bold">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. All transactions are securely routed through mock banking interfaces.</p>
      </footer>

      {/* MODAL: ADD ADDRESS */}
      <AnimatePresence>
        {isAddAddressOpen && (
          <div className="fixed inset-0 bg-[#041E42]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 text-xs text-[#041E42]"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-sm font-black uppercase tracking-wider">Add Shipping Address</h3>
                <button onClick={() => setIsAddAddressOpen(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-700" />
                </button>
              </div>

              <form onSubmit={handleAddAddressSubmit} className="space-y-4 font-bold text-gray-600">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full border p-2 rounded-xl focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Mobile Number *</label>
                    <input 
                      type="text" 
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full border p-2 rounded-xl focus:outline-none focus:border-[#0071DC]"
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
                    className="w-full border p-2 rounded-xl focus:outline-none focus:border-[#0071DC]"
                  />
                </div>

                <div className="space-y-1">
                  <label>Street / Area / Colony (Optional)</label>
                  <input 
                    type="text" 
                    value={formLine2}
                    onChange={(e) => setFormLine2(e.target.value)}
                    className="w-full border p-2 rounded-xl focus:outline-none focus:border-[#0071DC]"
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
                      className="w-full border p-2 rounded-xl focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>State *</label>
                    <input 
                      type="text" 
                      required
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="w-full border p-2 rounded-xl focus:outline-none focus:border-[#0071DC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>PIN Code *</label>
                    <input 
                      type="text" 
                      required
                      value={formPostal}
                      onChange={(e) => setFormPostal(e.target.value)}
                      className="w-full border p-2 rounded-xl focus:outline-none focus:border-[#0071DC]"
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
                        className={`px-3 py-1.5 rounded-lg border text-[10px] ${formType === type ? 'bg-[#041E42] text-white border-transparent' : 'bg-white border-gray-200'}`}
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
                    className="w-4 h-4 rounded text-[#0071DC]"
                  />
                  <label htmlFor="addr_def" className="cursor-pointer">Set as Default Shipping Address</label>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-3 rounded-full font-bold text-xs transition-colors mt-2"
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
          <div className="fixed inset-0 bg-[#041E42]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border"
            >
              {transactionResult === null ? (
                // Processing Animation Statuses
                <div className="space-y-4">
                  <div className="w-12 h-12 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Securing Transaction</h3>
                  <div className="text-[11px] text-gray-400 font-mono space-y-1">
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
                    <h3 className="text-base font-black text-emerald-600">Order Placed Successfully!</h3>
                    <p className="text-[11px] text-gray-400 font-mono">Order ID: <span className="font-extrabold text-gray-700">{generatedOrderId}</span></p>
                    <p className="text-xs text-gray-500 leading-relaxed px-4">
                      Your payment of <span className="font-black text-[#041E42]">₹{(paidAmount || getGrandTotal()).toLocaleString()}</span> via <span className="font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{confirmedPaymentMethod || paymentMethod}</span> was verified. The package will be shipped to your selected address immediately.
                    </p>
                  </div>

                  <button 
                    onClick={() => { setIsProcessing(false); navigate('/orders'); }}
                    className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-3 rounded-full font-bold text-xs transition-colors"
                  >
                    Go to Orders
                  </button>
                </div>
              ) : (
                // Failed Scenario
                <div className="space-y-5">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-rose-100">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-rose-600">Payment Unsuccessful</h3>
                    <p className="text-[11px] text-gray-400 font-mono">Order Reference: <span className="font-extrabold text-gray-700">{generatedOrderId}</span></p>
                    <p className="text-xs text-gray-500 leading-relaxed px-4">
                      {transactionErrorMsg || 'The transaction was declined by the simulated banking interface.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsProcessing(false)}
                      className="w-1/2 border py-3 rounded-full font-bold text-xs hover:bg-gray-50 transition-colors"
                    >
                      Close / Edit details
                    </button>
                    <button 
                      onClick={handleRetryPayment}
                      className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-full font-bold text-xs transition-colors flex items-center justify-center space-x-1"
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
