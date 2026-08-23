import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Download, 
  Printer, 
  FileText, 
  Calendar, 
  CreditCard,
  User,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

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
    city: string;
    state: string;
    country: string;
  } | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const InvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { customer: sessionCust, session } = useSessionStore();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasLoggedPageView = useRef(false);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setInvoice(data.invoice);
        setErrorMsg(null);
      } else {
        setErrorMsg(data.error || 'Invoice not found.');
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setErrorMsg('Failed to query financial receipts database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  // Log page view event
  useEffect(() => {
    if (session && invoice && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session.session_id,
          customer_id: sessionCust?.customer_id || null,
          page: 'invoice',
          device: 'desktop',
          browser: 'Chrome',
          metadata: { 
            page: 'invoice',
            invoice_id: invoiceId,
            order_id: invoice.order_id
          }
        })
      }).catch(err => console.warn(err));
    }
  }, [session, invoice, invoiceId, sessionCust]);

  const handleDownload = async () => {
    if (!invoice) return;
    
    // Log telemetry click
    if (session) {
      try {
        await fetch(`/api/invoices/${invoiceId}/download-click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.session_id,
            customer_id: sessionCust?.customer_id || 'guest_telemetry'
          })
        });
      } catch (e) {
        console.warn(e);
      }
    }

    // Trigger file download
    window.open(`/api/invoices/${invoiceId}/download-file`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42] print:bg-white print:text-black">
      {/* HEADER - HIDDEN ON PRINT */}
      <header className="bg-[#0071DC] text-white py-4 px-6 shadow-md print:hidden">
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
            onClick={() => navigate('/orders')}
            className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
        </div>
      </header>

      {/* MAIN INVOICE CONTAINER */}
      <main className="max-w-4xl w-full mx-auto flex-grow p-6 space-y-6 print:p-0 print:max-w-full">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 print:hidden">
            <div className="w-8 h-8 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : errorMsg ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white p-12 rounded-3xl border border-red-100 text-center space-y-4 shadow-sm print:hidden"
          >
            <div className="text-red-500 w-16 h-16 mx-auto flex items-center justify-center bg-red-50 rounded-full">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-700">Invoice not available</h3>
            <p className="text-xs text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
              {errorMsg}
            </p>
            <button 
              onClick={() => navigate('/orders')}
              className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full font-bold text-xs transition-colors"
            >
              Back to Orders
            </button>
          </motion.div>
        ) : invoice ? (
          <div className="space-y-6">
            
            {/* ACTION BUTTON PANEL - HIDDEN ON PRINT */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm print:hidden">
              <div className="flex items-center space-x-2 text-xs font-black uppercase text-gray-400">
                <FileText className="w-4 h-4 text-gray-400" />
                <span>Invoice Ready for Download</span>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate('/home')}
                  className="bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-5 py-2 rounded-full font-bold text-xs transition-colors flex items-center space-x-1.5 focus:outline-none"
                  title="Shop Again"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Shop Again</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-gray-100 hover:bg-gray-200 text-[#041E42] px-4 py-2 rounded-full font-bold text-xs transition-colors flex items-center space-x-1.5 focus:outline-none"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-5 py-2 rounded-full font-bold text-xs transition-colors flex items-center space-x-1.5 focus:outline-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Text Receipt</span>
                </button>
              </div>
            </div>

            {/* INVOICE CARD IN SHEET ASPECT */}
            <div className="relative bg-gradient-to-br from-[#0071DC]/5 via-white to-[#FFC220]/5 rounded-3xl border border-gray-100 shadow-md print:shadow-none print:border-none print:p-0 overflow-hidden">
              
              {/* TOP YELLOW-BLUE STRIPE ACCENT */}
              <div className="h-2 bg-gradient-to-r from-[#0071DC] via-[#FFC220] to-[#0071DC] rounded-t-3xl print:hidden"></div>

              {/* DIAGONAL WATERMARK */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                <div className="text-[120px] font-black text-gray-400/[0.08] rotate-[-18deg] tracking-widest uppercase font-sans">
                  NEXDAY
                </div>
              </div>

              {/* MAIN CONTENT WRAPPER */}
              <div className="relative p-10 space-y-8 z-10 print:p-0">
                
                {/* BRAND HEADER */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-6">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-[#0071DC] uppercase">RetailHub</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Everything you need, delivered fast.</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[9px] font-black uppercase bg-blue-50 text-[#0071DC] px-2.5 py-1 rounded-full border border-blue-100">
                      Financial Snapshot
                    </span>
                    <p className="text-xs font-mono font-black text-gray-600 mt-2">
                      {invoice.invoice_number}
                    </p>
                  </div>
                </div>

                {/* METADATA DATAGRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-50 pb-6 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                      <Calendar className="w-3 h-3" />
                      <span>Transaction References</span>
                    </div>
                    <p className="text-gray-700">Invoice Date: <span className="font-bold text-[#041E42]">{new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                    <p className="text-gray-700">Order Reference: <span className="font-mono font-bold text-[#041E42] bg-gray-50 px-1.5 py-0.5 rounded">{invoice.order_id}</span></p>
                    <p className="text-gray-700">GSTIN: <span className="font-bold text-[#041E42]">29AAAAA0000A1Z5</span></p>
                  </div>

                  <div className="space-y-1.5 md:text-right">
                    <div className="flex items-center md:justify-end space-x-1 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                      <CreditCard className="w-3 h-3" />
                      <span>Payment Information</span>
                    </div>
                    <p className="text-gray-700">Method: <span className="font-bold text-[#041E42] uppercase">{invoice.payment_method}</span></p>
                    <p className="text-gray-700">Status: <span className="font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">{invoice.payment_status}</span></p>
                  </div>
                </div>

                {/* ADDRESS DATAGRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-50 pb-6 text-xs text-gray-700">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                      <User className="w-3 h-3" />
                      <span>Billed To</span>
                    </div>
                    <div>
                      <h4 className="font-black text-[#041E42] text-sm">{invoice.customer?.first_name} {invoice.customer?.last_name}</h4>
                      <p className="text-gray-400 font-semibold">{invoice.customer?.email}</p>
                      <p className="mt-1">{invoice.address?.city}, {invoice.address?.state}</p>
                      <p>{invoice.address?.country}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-1 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                      <MapPin className="w-3 h-3" />
                      <span>Shipped To</span>
                    </div>
                    <div>
                      <h4 className="font-black text-[#041E42] text-sm">{invoice.customer?.first_name} {invoice.customer?.last_name}</h4>
                      <p className="mt-1">{invoice.address?.city}, {invoice.address?.state}</p>
                      <p>{invoice.address?.country}</p>
                    </div>
                  </div>
                </div>

                {/* PRODUCTS LIST TABLE */}
                <div className="space-y-3">
                  <div className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                    Itemized Line Details
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[9px]">
                          <th className="py-2.5">Product Description</th>
                          <th className="py-2.5 text-center">Qty</th>
                          <th className="py-2.5 text-right">Price</th>
                          <th className="py-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-700">
                        {invoice.items.map((item) => (
                          <tr key={item.invoice_item_id}>
                            <td className="py-3 font-semibold text-[#041E42]">
                              <div>{item.product_name}</div>
                              <span className="text-[9px] font-mono text-gray-400 font-medium">SKU: {item.sku}</span>
                            </td>
                            <td className="py-3 text-center font-bold text-gray-500">{item.quantity}</td>
                            <td className="py-3 text-right font-bold">₹{Number(item.unit_price).toLocaleString()}</td>
                            <td className="py-3 text-right font-black text-[#041E42]">₹{Number(item.line_total).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TOTALS BILL BREAKDOWN */}
                <div className="flex justify-end pt-4">
                  <div className="w-full md:w-80 space-y-2.5 text-xs text-gray-600 font-semibold border-t border-gray-100 pt-4">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span className="text-[#041E42] font-black">₹{Number(invoice.subtotal).toLocaleString()}</span>
                    </div>
                    {Number(invoice.discount) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Promo Coupon Discount</span>
                        <span className="font-black">-₹{Number(invoice.discount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Estimated Tax (GST 18%)</span>
                      <span className="text-[#041E42] font-black">₹{Number(invoice.tax).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping & Handling Fee</span>
                      <span className="text-[#041E42] font-black">
                        {Number(invoice.shipping_fee) === 0 ? 'FREE' : '₹' + Number(invoice.shipping_fee).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-3 text-sm font-black text-[#041E42]">
                      <span>Grand Total Due</span>
                      <span className="text-lg text-[#0071DC]">₹{Number(invoice.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* BILL CLOSING FOOTER */}
                <div className="border-t border-gray-100 pt-6 text-center text-[10px] text-gray-400 font-bold leading-relaxed">
                  <p>This is a computer generated financial invoice statement. All billing details are securely registered under test parameters.</p>
                  <p className="mt-0.5">Thank you for choosing RetailHub!</p>
                </div>

              </div>

            </div>
          </div>
        ) : null}
      </main>

      {/* FOOTER - HIDDEN ON PRINT */}
      <footer className="bg-[#041E42] text-white py-6 mt-12 text-center text-xs font-bold print:hidden">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. All transactions are securely routed through mock banking interfaces.</p>
      </footer>
    </div>
  );
};
