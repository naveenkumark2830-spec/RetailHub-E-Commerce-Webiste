import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  MessageSquare,
  FileText,
  ShoppingBag,
  Send,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

interface HelpArticle {
  article_id: string;
  category: string;
  title: string;
  content: string;
  keywords: string;
}

interface SupportMessage {
  message_id: string;
  ticket_id: string;
  sender_type: 'CUSTOMER' | 'ADMIN';
  sender_id: string;
  message: string;
  created_at: string;
}

interface SupportTicket {
  ticket_id: string;
  customer_id: string;
  order_id: string | null;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  messages?: SupportMessage[];
}

interface Order {
  order_id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const FAQ_CATEGORIES = [
  { name: 'All Topics', icon: <Search className="w-4 h-4 text-blue-500" /> },
  { name: 'Orders', icon: <ShoppingBag className="w-4 h-4 text-[#0875E1]" /> },
  { name: 'Delivery', icon: <Clock className="w-4 h-4 text-amber-500" /> },
  { name: 'Payments', icon: <FileText className="w-4 h-4 text-emerald-500" /> },
  { name: 'Account', icon: <Briefcase className="w-4 h-4 text-purple-500" /> },
];

const PREDEFINED_FAQS: HelpArticle[] = [
  {
    article_id: 'faq-1',
    category: 'Orders',
    title: 'How do I track my order status?',
    content: 'Go to the "My Orders" page from your profile sidebar or header menu. Click "Track Order" next to any order to view live status updates, delivery partner details, and estimated delivery dates.',
    keywords: 'track order status shipping delivery'
  },
  {
    article_id: 'faq-2',
    category: 'Orders',
    title: 'Can I cancel my order after placing it?',
    content: 'Yes! You can cancel any order that is currently in "Confirmed" or "Processing" status directly from the My Orders page by clicking "Cancel Order". If your order has already been shipped, you can refuse delivery or initiate a return upon receipt.',
    keywords: 'cancel order return refund'
  },
  {
    article_id: 'faq-3',
    category: 'Delivery',
    title: 'What are the estimated delivery timelines?',
    content: 'Standard delivery takes 2 to 4 business days depending on your location. NexDay Plus members enjoy guaranteed next-day delivery on eligible products.',
    keywords: 'delivery timeline shipping time nexday plus'
  },
  {
    article_id: 'faq-4',
    category: 'Delivery',
    title: 'What should I do if my package is delayed?',
    content: 'Check the real-time tracking link on your Order Tracking page. If the delay exceeds 48 hours past the estimated delivery date, please click "Get Help" or raise a support ticket below for immediate assistance.',
    keywords: 'delayed package late delivery help support'
  },
  {
    article_id: 'faq-5',
    category: 'Payments',
    title: 'What payment methods are supported on NexDay?',
    content: 'We support all major payment methods including UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards (Visa, MasterCard, RuPay), Net Banking across all major banks, and Cash on Delivery (COD).',
    keywords: 'payment methods upi card cod netbanking'
  },
  {
    article_id: 'faq-6',
    category: 'Payments',
    title: 'How long does a refund take to reflect in my bank account?',
    content: 'Once a return is received and verified, refunds are initiated within 24 hours. Refunds to UPI or Wallets credit instantly or within 24 hours. Bank card refunds take 3-5 business days.',
    keywords: 'refund status timeline bank credit upi'
  },
  {
    article_id: 'faq-7',
    category: 'Account',
    title: 'How do I update my delivery address or phone number?',
    content: 'Navigate to My Profile -> Addresses Book to manage saved delivery addresses, or edit your phone number directly on the Personal Information tab.',
    keywords: 'update address profile phone number change'
  },
  {
    article_id: 'faq-8',
    category: 'Account',
    title: 'How do I change or reset my password?',
    content: 'You can change your password under My Profile -> Account Security by clicking "Change Password". If you forgot your password, use the "Forgot Password" link on the login screen.',
    keywords: 'password reset change security login'
  }
];

function FAQCollapseCard({ article }: { article: HelpArticle }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-gray-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 text-left flex items-center justify-between focus:outline-none"
      >
        <span className="font-bold text-[#0F172A] text-sm">{article.title}</span>
        <div className="p-1.5 rounded-full bg-gray-100 text-gray-600">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-4 pt-1 text-gray-600 text-xs md:text-sm border-t border-gray-100 leading-relaxed whitespace-pre-line font-medium">
              {article.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HelpSupportPage() {
  // Retrieve customer data from local storage session
  const storedCustomer = localStorage.getItem('retailhub_customer');
  const storedSession = localStorage.getItem('retailhub_session');

  const customerId = storedCustomer ? JSON.parse(storedCustomer).customer_id : null;
  const sessionId = storedSession ? JSON.parse(storedSession).session_id : null;

  const [articles, setArticles] = useState<HelpArticle[]>(PREDEFINED_FAQS);
  const [selectedTopic, setSelectedTopic] = useState<string>('All Topics');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingFAQs, setLoadingFAQs] = useState<boolean>(false);

  // Ticket creation state
  const [showRaiseForm, setShowRaiseForm] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('GENERAL');
  const [priority] = useState<string>('MEDIUM');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  // Selected ticket view
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');

  useEffect(() => {
    fetchFAQs();
    if (customerId) {
      fetchTickets();
      fetchOrders();
    }
  }, [customerId]);

  const fetchFAQs = async (query = '') => {
    try {
      setLoadingFAQs(true);
      const res = await fetch(`/api/help/faqs?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && data.articles && data.articles.length > 0) {
        setArticles(data.articles);
      } else {
        setArticles(PREDEFINED_FAQS);
      }
    } catch (err) {
      setArticles(PREDEFINED_FAQS);
    } finally {
      setLoadingFAQs(false);
    }
  };

  const fetchTickets = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/help/customer/${customerId}/tickets`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
        if (selectedTicket) {
          const updated = (data.tickets || []).find((t: SupportTicket) => t.ticket_id === selectedTicket.ticket_id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  const fetchOrders = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/orders/customer/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setOrders((data.orders || []).slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFAQs(searchQuery);
  };

  const handleRaiseTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description || !customerId) return;

    try {
      const res = await fetch(`/api/help/customer/${customerId}/tickets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderId || null,
          category,
          priority,
          subject,
          description,
          sessionId
        })
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setFormSuccess(true);
        setSubject('');
        setDescription('');
        setSelectedOrderId('');
        fetchTickets();
        setTimeout(() => {
          setFormSuccess(false);
          setShowRaiseForm(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Error raising ticket:', err);
    }
  };

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !customerId) return;

    try {
      const res = await fetch(`/api/help/tickets/${selectedTicket.ticket_id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderType: 'CUSTOMER',
          senderId: customerId,
          message: newMessage.trim(),
          sessionId
        })
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setNewMessage('');
        fetchTickets();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleQuickHelpOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCategory('ORDERS');
    setSubject(`Query regarding Order #${orderId}`);
    setShowRaiseForm(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033] flex flex-col font-sans">
      <Header />

      {/* HERO BANNER */}
      <div className="bg-[#0B2A55] text-white py-12 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">How Can We Help You?</h1>
          <p className="text-blue-100 text-sm">Search our Help Center or connect directly with NexDay Customer Care</p>

          <form onSubmit={handleSearchSubmit} className="relative mt-6 max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search orders, payments, returns, delivery..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-[#172033] placeholder-gray-400 pl-12 pr-4 py-3.5 rounded-full border-none focus:ring-2 focus:ring-[#FFC20A] focus:outline-none transition-all shadow-md text-sm font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </form>

          {/* Quick FAQ Pills matching target reference pill design */}
          <div className="flex flex-wrap justify-center gap-2.5 pt-3">
            {FAQ_CATEGORIES.map((cat) => {
              const isSelected = selectedTopic === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedTopic(cat.name)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-white text-[#0B2A55] border-white shadow-md scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* GRID BODY LAYOUT */}
      <main className="max-w-6xl w-full mx-auto p-6 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: FAQ SEARCH RESULTS & RECENT ORDERS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* FAQ Search Results */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#0B2A55] tracking-tight">Help Topics ({selectedTopic})</h2>
              {selectedTopic !== 'All Topics' && (
                <button
                  onClick={() => setSelectedTopic('All Topics')}
                  className="text-xs font-bold text-[#0875E1] hover:underline"
                >
                  Show All Topics
                </button>
              )}
            </div>
            
            {loadingFAQs ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-[#0875E1] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (() => {
              const filteredArticles = articles.filter(art => {
                if (selectedTopic !== 'All Topics' && art.category.toLowerCase() !== selectedTopic.toLowerCase()) {
                  return false;
                }
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  return art.title.toLowerCase().includes(q) || art.content.toLowerCase().includes(q) || (art.keywords && art.keywords.toLowerCase().includes(q));
                }
                return true;
              });

              if (filteredArticles.length === 0) {
                return (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 text-gray-500 text-sm font-medium">
                    No help articles found for "{selectedTopic}"{searchQuery ? ` matching "${searchQuery}"` : ''}.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredArticles.map((art) => (
                    <FAQCollapseCard key={art.article_id} article={art} />
                  ))}
                </div>
              );
            })()}
          </section>

          {/* Quick Help for Recent Orders */}
          {orders.length > 0 && (
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#0B2A55] uppercase tracking-wider">Quick Help For Recent Orders</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {orders.map((ord) => (
                  <div key={ord.order_id} className="p-4 rounded-xl border border-gray-100 bg-[#F5F7FA] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>Order #{ord.order_id.slice(-8)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1">₹{ord.total_amount.toLocaleString()} &bull; {ord.status}</p>
                    </div>
                    <button
                      onClick={() => handleQuickHelpOrder(ord.order_id)}
                      className="w-full mt-2 bg-[#0875E1] hover:bg-[#065eb8] text-white py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      Get Help
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: SUPPORT TICKETS & CHAT */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#0B2A55] uppercase tracking-wider">Support Tickets</h3>
              <button
                onClick={() => setShowRaiseForm(!showRaiseForm)}
                className="bg-[#FFC20A] hover:bg-[#e0a908] text-[#0B2A55] px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center space-x-1 shadow-sm transition-colors uppercase tracking-wider"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Ticket</span>
              </button>
            </div>

            {showRaiseForm ? (
              <form onSubmit={handleRaiseTicketSubmit} className="space-y-4 pt-2">
                {formSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ticket created! Redirecting...</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 bg-white"
                  >
                    <option value="GENERAL">General Support</option>
                    <option value="ORDERS">Order Issues</option>
                    <option value="PAYMENTS">Payment Failures</option>
                    <option value="DELIVERY">Delivery Status</option>
                    <option value="RETURNS">Returns & Refunds</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain your problem..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRaiseForm(false)}
                    className="w-1/2 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 bg-[#0875E1] hover:bg-[#065eb8] text-white rounded-xl text-xs font-bold shadow transition-colors"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            ) : tickets.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No active support tickets found.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {tickets.map((tkt) => (
                  <div
                    key={tkt.ticket_id}
                    onClick={() => setSelectedTicket(tkt)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedTicket?.ticket_id === tkt.ticket_id
                        ? 'border-[#0875E1] bg-blue-50/50'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#0B2A55]">#{tkt.ticket_id.slice(-6)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                        tkt.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{tkt.status}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 mt-1 line-clamp-1">{tkt.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Messages View */}
          {selectedTicket && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h4 className="text-xs font-bold text-[#0B2A55] uppercase">Ticket Chat #{selectedTicket.ticket_id.slice(-6)}</h4>
                <button onClick={() => setSelectedTicket(null)} className="text-xs text-gray-400 hover:text-gray-600 font-bold">Close</button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {(selectedTicket.messages || []).map((msg) => (
                  <div key={msg.message_id} className={`flex flex-col ${msg.sender_type === 'CUSTOMER' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-xs ${
                      msg.sender_type === 'CUSTOMER' ? 'bg-[#0875E1] text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'CLOSED' && (
                <form onSubmit={handleSendMessageSubmit} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Write a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800"
                  />
                  <button type="submit" className="bg-[#0875E1] hover:bg-[#065eb8] text-white p-2 rounded-xl">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  );
}

export default HelpSupportPage;
