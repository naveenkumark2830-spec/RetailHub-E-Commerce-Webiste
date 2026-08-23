import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HelpCircle,
  Search,
  MessageSquare,
  FileText,
  ShoppingBag,
  Send,
  PlusCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';

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
  { name: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
  { name: 'Delivery', icon: <Clock className="w-4 h-4" /> },
  { name: 'Payments', icon: <FileText className="w-4 h-4" /> },
  { name: 'Returns', icon: <HelpCircle className="w-4 h-4 text-rose-400" /> },
  { name: 'Refunds', icon: <FileText className="w-4 h-4 text-emerald-400" /> },
  { name: 'Account', icon: <Briefcase className="w-4 h-4" /> }
];

export default function HelpSupportPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingFAQs, setLoadingFAQs] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  
  // Ticket Form States
  const [showRaiseForm, setShowRaiseForm] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('ORDERS');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  const customerId = localStorage.getItem('customerId') || 'CUST87527';
  const sessionId = localStorage.getItem('sessionId') || 'sess_default';

  useEffect(() => {
    fetchFAQs();
    fetchTickets();
    fetchOrders();
  }, [customerId]);

  const fetchFAQs = async (queryStr = '') => {
    try {
      setLoadingFAQs(true);
      const res = await fetch(`/api/help/search?q=${encodeURIComponent(queryStr)}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error('FAQ load error:', err);
    } finally {
      setLoadingFAQs(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/help/customer/${customerId}/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        // Refresh active ticket reference if open
        if (selectedTicket) {
          const updated = data.find((t: SupportTicket) => t.ticket_id === selectedTicket.ticket_id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Tickets fetch error:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/checkout/orders?customer_id=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.slice(0, 3)); // show top 3 recent orders
      }
    } catch (err) {
      console.error('Orders load error:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFAQs(searchQuery);
  };

  const handleCategoryClick = (catName: string) => {
    setSearchQuery(catName);
    fetchFAQs(catName);
  };

  const handleRaiseTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

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
      if (res.ok) {
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
    if (!newMessage.trim() || !selectedTicket) return;

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
      if (res.ok) {
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* NAVBAR */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">RetailHub Support</span>
          </div>

          <button 
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </button>
        </div>
      </header>

      {/* HERO HERO CONTAINER */}
      <div className="bg-gradient-to-b from-blue-900/20 to-slate-900 border-b border-slate-800 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">How can we help?</h1>
          <p className="text-slate-400 text-lg">Search our FAQ database or raise a direct support request</p>

          <form onSubmit={handleSearchSubmit} className="relative mt-6 max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search orders, payments, returns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-850 hover:bg-slate-800 text-slate-100 placeholder-slate-500 pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-none transition-all shadow-md"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          </form>

          {/* Quick FAQ Pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-750 transition-colors"
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID BODY LAYOUT */}
      <main className="max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: FAQ SEARCH RESULTS & RECENT ORDERS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* FAQ Search Results */}
          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Help Topics</h2>
            
            {loadingFAQs ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : articles.length === 0 ? (
              <div className="bg-slate-800/40 p-6 rounded-xl text-slate-400">
                No FAQ articles match "{searchQuery}". Try a different keyword.
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((art) => (
                  <FAQCollapseCard key={art.article_id} article={art} />
                ))}
              </div>
            )}
          </section>

          {/* Recent Orders Support Quick Access */}
          {orders.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Your Recent Orders</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {orders.map((ord) => (
                  <div key={ord.order_id} className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/40 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">#{ord.order_id}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          ord.status === 'DELIVERED' 
                            ? 'bg-emerald-950 text-emerald-400' 
                            : 'bg-blue-950 text-blue-400'
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white mt-1">₹{Number(ord.total_amount).toLocaleString('en-IN')}</h4>
                    </div>
                    <button
                      onClick={() => handleQuickHelpOrder(ord.order_id)}
                      className="w-full text-center bg-slate-750 hover:bg-slate-700 text-blue-400 font-semibold py-2 rounded-lg text-xs transition-colors border border-slate-700/50"
                    >
                      Get Help
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: SUPPORT TICKETS & TICKET MESSAGES */}
        <div className="space-y-8">
          
          {/* Support Tickets Section */}
          <section className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Support Tickets</h2>
              <button
                onClick={() => setShowRaiseForm(true)}
                className="flex items-center space-x-1 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Raise Ticket</span>
              </button>
            </div>

            {/* Raise Ticket Modal Overlay Form */}
            {showRaiseForm && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl relative"
                >
                  <h3 className="text-2xl font-bold text-white">Create Support Ticket</h3>
                  
                  {formSuccess ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
                      <p className="text-lg text-white font-bold">Ticket Submitted Successfully!</p>
                    </div>
                  ) : (
                    <form onSubmit={handleRaiseTicketSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Issue Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-slate-800 text-slate-100 px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 font-medium"
                        >
                          <option value="ORDERS">Orders & Delivery</option>
                          <option value="PAYMENTS">Payments</option>
                          <option value="RETURNS">Returns</option>
                          <option value="REFUNDS">Refunds</option>
                          <option value="ACCOUNT">Account Settings</option>
                          <option value="TECHNICAL">Technical Issue</option>
                          <option value="OTHER">Other Issues</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Priority</label>
                          <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full bg-slate-800 text-slate-100 px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Order ID (Optional)</label>
                          <input
                            type="text"
                            placeholder="ORD..."
                            value={selectedOrderId}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                            className="w-full bg-slate-800 text-slate-100 px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Subject</label>
                        <input
                          type="text"
                          required
                          placeholder="Brief summary of issue"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full bg-slate-800 text-slate-100 px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Description</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Provide details about your query..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-slate-800 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
                        />
                      </div>

                      <div className="flex space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRaiseForm(false)}
                          className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-lg border border-slate-750 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                        >
                          Submit Ticket
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </div>
            )}

            {/* Tickets list */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>You have no support tickets yet.</p>
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.ticket_id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedTicket?.ticket_id === t.ticket_id
                        ? 'bg-slate-800 border-blue-500/40'
                        : 'bg-slate-800/40 border-slate-700/30 hover:border-slate-750 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">#{t.ticket_id}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'RESOLVED' || t.status === 'CLOSED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-900/30'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-white mt-1.5 truncate">{t.subject}</h4>
                    <p className="text-xs text-slate-400 truncate mt-1">{t.description}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Ticket Messages conversation thread view */}
          {selectedTicket && (
            <section className="bg-slate-850 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col h-[450px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
                <div>
                  <h3 className="font-bold text-white truncate max-w-[200px]">{selectedTicket.subject}</h3>
                  <p className="text-xs text-slate-400">Ticket #{selectedTicket.ticket_id}</p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close Chat
                </button>
              </div>

              {/* Chat Thread Container */}
              <div className="flex-grow overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-750 text-xs text-slate-300">
                  <div className="font-bold text-white uppercase text-[10px] tracking-wide mb-1">Description:</div>
                  {selectedTicket.description}
                </div>

                {selectedTicket.messages?.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.sender_type === 'CUSTOMER' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.sender_type === 'CUSTOMER'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-850 text-slate-100 rounded-bl-none border border-slate-700/50'
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat Reply Form */}
              {selectedTicket.status !== 'CLOSED' && (
                <form onSubmit={handleSendMessageSubmit} className="relative flex-shrink-0 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    placeholder="Type support reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 pl-4 pr-12 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// Sub-component for Collapsible FAQ Article Cards
function FAQCollapseCard({ article }: { article: HelpArticle }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl overflow-hidden transition-all hover:border-slate-700/60">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-6 py-4 flex items-center justify-between bg-slate-800/10 hover:bg-slate-800/30 transition-colors"
      >
        <span className="font-bold text-white text-base md:text-lg tracking-tight pr-4">{article.title}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-slate-750 bg-slate-800/10 text-slate-350 leading-relaxed text-sm">
          {article.content}
        </div>
      )}
    </div>
  );
}
