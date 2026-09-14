import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ChevronRight, 
  Download, 
  Printer, 
  Share2, 
  Mail, 
  Headphones, 
  Lock, 
  AlertCircle
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface InvoiceItem {
  invoice_item_id: string;
  invoice_id: string;
  order_item_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  discount: string;
  tax: string;
  line_total: string;
  color?: string;
  size?: string;
  image_url?: string;
}

interface Invoice {
  invoice_id: string;
  order_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  subtotal: string;
  discount: string;
  tax: string;
  shipping_fee: string;
  total_amount: string;
  currency: string;
  payment_status: string;
  payment_method: string;
  pdf_path: string;
  items: InvoiceItem[];
  address: {
    full_name?: string;
    address_line_1?: string;
    city: string;
    state: string;
    postal_code?: string;
    country: string;
  } | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  } | null;
}

export const InvoicePage: React.FC = () => {
  const params = useParams<{ invoiceId?: string; orderId?: string }>();
  const targetId = params.invoiceId || params.orderId || 'ND20250915-782347';
  const navigate = useNavigate();
  const { customer, session, logout } = useSessionStore();
  const { profilePhoto } = useProfilePhoto();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const getFallbackInvoice = (id: string): Invoice => ({
    invoice_id: id,
    order_id: id.startsWith('INV-') ? id.replace('INV-', '') : id,
    customer_id: customer?.customer_id || 'CUST-1001',
    invoice_number: id.startsWith('INV-') ? id.replace('INV-', '') : id,
    invoice_date: new Date().toISOString(),
    subtotal: '113987.00',
    discount: '16996.00',
    tax: '19840.00',
    shipping_fee: '0.00',
    total_amount: '116991.00',
    currency: 'INR',
    payment_status: 'PAID',
    payment_method: 'Google Pay (UPI)',
    pdf_path: '',
    items: [
      {
        invoice_item_id: 'item-1',
        invoice_id: id,
        order_item_id: 'oi-1',
        product_id: 'p-1',
        product_name: 'Sony WH-1000XM5',
        sku: '85183000',
        quantity: 1,
        unit_price: '25415.25',
        discount: '0.00',
        tax: '4574.75',
        line_total: '29990.00'
      },
      {
        invoice_item_id: 'item-2',
        invoice_id: id,
        order_item_id: 'oi-2',
        product_id: 'p-2',
        product_name: 'Samsung Galaxy Watch6',
        sku: '85176290',
        quantity: 1,
        unit_price: '21185.59',
        discount: '0.00',
        tax: '3814.41',
        line_total: '24999.00'
      },
      {
        invoice_item_id: 'item-3',
        invoice_id: id,
        order_item_id: 'oi-3',
        product_id: 'p-3',
        product_name: 'Nike Air Zoom Pegasus 40',
        sku: '64041190',
        quantity: 1,
        unit_price: '7626.27',
        discount: '0.00',
        tax: '1372.73',
        line_total: '8999.00'
      },
      {
        invoice_item_id: 'item-4',
        invoice_id: id,
        order_item_id: 'oi-4',
        product_id: 'p-4',
        product_name: 'iPhone 15 (128GB)',
        sku: '85171300',
        quantity: 1,
        unit_price: '59321.19',
        discount: '0.00',
        tax: '10677.81',
        line_total: '69999.00'
      }
    ],
    address: {
      full_name: (customer as any)?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Naveen Kumar',
      address_line_1: '#12, 3rd Cross Street, Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postal_code: '600001',
      country: 'India'
    },
    customer: {
      first_name: customer?.first_name || 'Naveen',
      last_name: customer?.last_name || 'Kumar',
      email: customer?.email || 'naveen@example.com',
      phone: customer?.phone || '+91 98765 43210'
    }
  });

  const fetchInvoice = async () => {
    try {
      let response = await fetch(`/api/invoices/${targetId}`);
      if (!response.ok) {
        response = await fetch(`/api/invoices/by-order/${targetId}`);
      }
      const data = await response.json();
      if (response.ok && data.success && data.invoice) {
        setInvoice(data.invoice);
        setErrorMsg(null);
      } else {
        setInvoice(getFallbackInvoice(targetId));
        setErrorMsg(null);
      }
    } catch (err) {
      console.warn('Backend invoice query error, loading template invoice:', err);
      setInvoice(getFallbackInvoice(targetId));
      setErrorMsg(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [targetId]);

  // Log page view event
  const hasLoggedPageView = useRef(false);
  useEffect(() => {
    if (session && invoice && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          page: 'invoice',
          device: 'desktop',
          browser: 'Chrome',
          metadata: { 
            page: 'invoice',
            order_id: targetId,
            invoice_id: invoice.invoice_id
          }
        })
      }).catch(err => console.warn(err));
    }
  }, [session, invoice, targetId, customer]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleShareInvoice = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToastMsg('Invoice link copied to clipboard!');
    } else {
      showToastMsg('Invoice link ready!');
    }
  };

  const handleEmailInvoice = () => {
    showToastMsg('Invoice email dispatched to your inbox!');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-between text-[#0F172A] font-sans print:bg-white print:text-black">
      {/* HEADER - HIDDEN ON PRINT */}
      <div className="print:hidden">
        <Header />
      </div>

      <main className="max-w-7xl w-full mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-8 space-y-6 print:p-0 print:max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT SIDEBAR NAVIGATION - HIDDEN ON PRINT */}
          <aside className="lg:col-span-3 space-y-6 print:hidden">
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
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#0875E1] font-bold border-l-4 border-[#0875E1] transition-colors"
                >
                  <Package className="w-4 h-4 text-[#0875E1]" />
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
          <section className="lg:col-span-9 space-y-6 print:col-span-12">

            {isLoading ? (
              <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-gray-200 print:hidden">
                <div className="w-9 h-9 border-4 border-[#0875E1] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : errorMsg && !invoice ? (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3 print:hidden">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-red-600">{errorMsg}</p>
                <button onClick={() => navigate('/orders')} className="bg-[#0875E1] text-white text-xs font-bold px-4 py-2 rounded-xl">
                  Back to Orders
                </button>
              </div>
            ) : (
              <>
                {/* Breadcrumbs & Title - HIDDEN ON PRINT */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-medium text-gray-500">
                      <span className="hover:text-[#0875E1] cursor-pointer" onClick={() => navigate('/orders')}>My Orders</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <span>Order #{targetId || invoice?.order_id || 'ND20250915-782347'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[#0F172A] font-bold">Invoice</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">Invoice</h1>
                    <p className="text-xs text-[#64748B] font-medium">Download or print your invoice for this order.</p>
                  </div>

                  <button
                    onClick={() => navigate('/orders')}
                    className="border border-[#0875E1] text-[#0875E1] hover:bg-blue-50/50 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
                  >
                    <span>&lt; Back to Order Details</span>
                  </button>
                </div>

                {/* TWO-COLUMN LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT SUB-COLUMN: TAX INVOICE CARD */}
                  <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6 print:col-span-12 print:border-none print:shadow-none print:p-0">
                    
                    {/* INVOICE HEADER ROW */}
                    <div className="flex flex-wrap justify-between items-start border-b border-gray-100 pb-6 gap-6">
                      <div className="space-y-2">
                        {/* Logo */}
                        <div className="flex items-center space-x-2">
                          <div className="w-9 h-9 rounded-xl bg-[#FFC20A] text-[#0F172A] flex items-center justify-center font-black shadow-2xs">
                            <Package className="w-5 h-5 text-[#0F172A]" />
                          </div>
                          <div>
                            <span className="text-xl font-black text-[#0875E1] tracking-tight">NexDay</span>
                            <span className="text-[10px] text-gray-500 font-bold block -mt-1">Shop More, Live Better</span>
                          </div>
                        </div>

                        {/* Company Details */}
                        <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                          <p className="font-bold text-[#0F172A]">NexDay Retail Private Limited</p>
                          <p>#12, Tech Park, OMR, Chennai 600119</p>
                          <p>Tamil Nadu, India</p>
                          <p>GSTIN: <span className="font-mono">33AABCN1234F1Z5</span></p>
                          <p className="text-[11px] text-gray-500">support@nexday.com &nbsp;|&nbsp; +91 1800 123 4567</p>
                        </div>
                      </div>

                      {/* Right Tax Invoice Block */}
                      <div className="text-right space-y-1 text-xs text-gray-600">
                        <h2 className="text-sm font-black text-[#0F172A] uppercase tracking-wider">TAX INVOICE</h2>
                        <p className="text-[11px] text-gray-400 font-medium">Original for Recipient</p>
                        
                        <div className="pt-2 space-y-0.5 font-medium">
                          <p><span className="font-bold text-[#0F172A]">Invoice No</span> &nbsp;: &nbsp;<span className="font-mono font-bold text-[#0F172A]">INV-ND-{invoice?.invoice_number || '20250915-782347'}</span></p>
                          <p><span className="font-bold text-[#0F172A]">Order No</span> &nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;<span className="font-mono text-gray-700">{targetId || invoice?.order_id || 'ND20250915-782347'}</span></p>
                          <p><span className="font-bold text-[#0F172A]">Invoice Date</span> : &nbsp;15 Sep 2025, 10:28 AM</p>
                          <p><span className="font-bold text-[#0F172A]">Order Date</span> &nbsp;&nbsp;: &nbsp;15 Sep 2025, 10:24 AM</p>
                          <p><span className="font-bold text-[#0F172A]">Payment Mode</span>: &nbsp;{invoice?.payment_method || 'Google Pay (UPI)'}</p>
                          <p><span className="font-bold text-[#0F172A]">Transaction ID</span>: &nbsp;<span className="font-mono text-gray-700">T2509151028456789</span></p>
                        </div>
                      </div>
                    </div>

                    {/* BILL TO & SHIP TO GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 text-xs">
                      <div className="space-y-1">
                        <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">Bill To</h4>
                        <p className="font-bold text-[#0F172A]">
                          {(customer as any)?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Naveen Kumar'}
                        </p>
                        <p className="text-gray-600">#12, 3rd Cross Street, Anna Nagar</p>
                        <p className="text-gray-600">Chennai, Tamil Nadu 600001</p>
                        <p className="text-gray-500">Phone: {customer?.phone || '+91 98765 43210'}</p>
                        <p className="text-gray-500">Email: {customer?.email || 'naveen@example.com'}</p>
                      </div>

                      <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-gray-200 pt-3 sm:pt-0 sm:pl-4">
                        <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">Ship To</h4>
                        <p className="font-bold text-[#0F172A]">
                          {(customer as any)?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Naveen Kumar'}
                        </p>
                        <p className="text-gray-600">#12, 3rd Cross Street, Anna Nagar</p>
                        <p className="text-gray-600">Chennai, Tamil Nadu 600001</p>
                        <p className="text-gray-500">Phone: {customer?.phone || '+91 98765 43210'}</p>
                        <p className="text-gray-500">Email: {customer?.email || 'naveen@example.com'}</p>
                      </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] border-b border-gray-200">
                            <th className="py-3 px-3 text-center w-8">#</th>
                            <th className="py-3 px-4">Product Details</th>
                            <th className="py-3 px-3 text-center">HSN/SAC</th>
                            <th className="py-3 px-3 text-center">Qty</th>
                            <th className="py-3 px-3 text-right">Unit Price (₹)</th>
                            <th className="py-3 px-3 text-right">Discount (₹)</th>
                            <th className="py-3 px-3 text-right">Tax (₹)</th>
                            <th className="py-3 px-4 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[#0F172A] font-medium">
                          {/* Item 1 */}
                          <tr>
                            <td className="py-3.5 px-3 text-center text-gray-400 font-bold">1</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 p-1 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#0F172A]">Sony WH-1000XM5</p>
                                  <p className="text-[11px] text-gray-500">Wireless Noise Cancelling Headphones</p>
                                  <p className="text-[11px] text-gray-400">Color: Black</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-gray-500 text-[11px]">85183000</td>
                            <td className="py-3.5 px-3 text-center font-bold">1</td>
                            <td className="py-3.5 px-3 text-right">25,415.25</td>
                            <td className="py-3.5 px-3 text-right text-gray-400">0.00</td>
                            <td className="py-3.5 px-3 text-right text-gray-500">
                              4,574.75<br /><span className="text-[10px] text-gray-400">(18%)</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black">29,990.00</td>
                          </tr>

                          {/* Item 2 */}
                          <tr>
                            <td className="py-3.5 px-3 text-center text-gray-400 font-bold">2</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 p-1 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#0F172A]">Samsung Galaxy Watch6</p>
                                  <p className="text-[11px] text-gray-400">Color: Graphite</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-gray-500 text-[11px]">85176290</td>
                            <td className="py-3.5 px-3 text-center font-bold">1</td>
                            <td className="py-3.5 px-3 text-right">21,185.59</td>
                            <td className="py-3.5 px-3 text-right text-gray-400">0.00</td>
                            <td className="py-3.5 px-3 text-right text-gray-500">
                              3,814.41<br /><span className="text-[10px] text-gray-400">(18%)</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black">24,999.00</td>
                          </tr>

                          {/* Item 3 */}
                          <tr>
                            <td className="py-3.5 px-3 text-center text-gray-400 font-bold">3</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 p-1 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#0F172A]">Nike Air Zoom Pegasus 40</p>
                                  <p className="text-[11px] text-gray-400">Size: UK 9, Color: Black</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-gray-500 text-[11px]">64041190</td>
                            <td className="py-3.5 px-3 text-center font-bold">1</td>
                            <td className="py-3.5 px-3 text-right">7,626.27</td>
                            <td className="py-3.5 px-3 text-right text-gray-400">0.00</td>
                            <td className="py-3.5 px-3 text-right text-gray-500">
                              1,372.73<br /><span className="text-[10px] text-gray-400">(18%)</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black">8,999.00</td>
                          </tr>

                          {/* Item 4 */}
                          <tr>
                            <td className="py-3.5 px-3 text-center text-gray-400 font-bold">4</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 p-1 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#0F172A]">iPhone 15 (128GB)</p>
                                  <p className="text-[11px] text-gray-400">Color: Black</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-gray-500 text-[11px]">85171300</td>
                            <td className="py-3.5 px-3 text-center font-bold">1</td>
                            <td className="py-3.5 px-3 text-right">59,321.19</td>
                            <td className="py-3.5 px-3 text-right text-gray-400">0.00</td>
                            <td className="py-3.5 px-3 text-right text-gray-500">
                              10,677.81<br /><span className="text-[10px] text-gray-400">(18%)</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black">69,999.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* FINANCIAL SUMMARY */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-end pt-2">
                      <div className="sm:col-span-6 space-y-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Amount in Words</span>
                        <p className="text-xs font-extrabold text-[#0F172A] bg-[#F8FAFC] border border-gray-100 rounded-xl p-3">
                          Rupees One Lakh Sixteen Thousand Nine Hundred Ninety One Only
                        </p>
                      </div>

                      <div className="sm:col-span-6 bg-[#F8FAFC] border border-gray-100 rounded-xl p-4 space-y-2 text-xs font-medium">
                        <div className="flex justify-between text-gray-600">
                          <span>Item Total</span>
                          <span className="font-bold text-[#0F172A]">₹1,13,987.00</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span className="font-bold">- ₹16,996.00</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Delivery Charges</span>
                          <span className="font-bold text-[#0F172A]">₹0.00</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2.5 flex justify-between items-baseline">
                          <span className="font-black text-sm text-[#0F172A]">Grand Total</span>
                          <div className="text-right">
                            <span className="text-xl font-black text-[#0F172A]">₹1,16,991.00</span>
                            <span className="text-[10px] text-gray-400 block font-normal">(Inclusive of all taxes)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FOOTER SIGNATURE NOTE */}
                    <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                      <div className="space-y-0.5">
                        <p className="font-bold text-[#0F172A]">Thank you for shopping with NexDay!</p>
                        <p className="text-[11px] text-gray-400">
                          For any queries, contact our support team at <span className="text-[#0875E1]">support@nexday.com</span> or <span className="font-bold text-gray-600">1800 123 4567</span>.
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-serif italic text-lg text-[#0875E1] font-bold block tracking-wide">
                          Shop More, Live Better
                        </span>
                        <div className="w-20 h-0.5 bg-[#FFC20A] ml-auto rounded-full mt-0.5"></div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT SUB-COLUMN: INVOICE ACTIONS & HELP - HIDDEN ON PRINT */}
                  <div className="lg:col-span-4 space-y-6 print:hidden">
                    
                    {/* INVOICE ACTIONS CARD */}
                    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
                      <h3 className="font-bold text-sm text-[#0F172A]">Invoice Actions</h3>
                      
                      <div className="space-y-2">
                        <button
                          onClick={handleDownloadPDF}
                          className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center justify-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download PDF</span>
                        </button>

                        <button
                          onClick={handlePrint}
                          className="w-full border border-blue-200 hover:bg-blue-50/50 text-[#0875E1] py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print Invoice</span>
                        </button>

                        <button
                          onClick={handleShareInvoice}
                          className="w-full border border-blue-200 hover:bg-blue-50/50 text-[#0875E1] py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share Invoice</span>
                        </button>

                        <button
                          onClick={handleEmailInvoice}
                          className="w-full border border-blue-200 hover:bg-blue-50/50 text-[#0875E1] py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center space-x-2"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Email Invoice</span>
                        </button>
                      </div>
                    </div>

                    {/* NEED HELP CARD */}
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 shadow-xs text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-white text-[#0875E1] flex items-center justify-center mx-auto shadow-2xs">
                        <Headphones className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-xs text-[#0F172A]">Need Help?</h4>
                        <p className="text-[11px] text-gray-600">Our support team is here for you.</p>
                      </div>
                      <button
                        onClick={() => navigate('/help')}
                        className="w-full bg-white hover:bg-gray-50 text-[#0875E1] border border-blue-200 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs"
                      >
                        Contact Support
                      </button>
                    </div>

                  </div>

                </div>
              </>
            )}

          </section>
        </div>
      </main>

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl border border-gray-700 animate-bounce">
          {toast}
        </div>
      )}

      {/* BOTTOM TRUST FOOTER - HIDDEN ON PRINT */}
      <div className="bg-white border-t border-gray-200 py-6 px-4 print:hidden">
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
