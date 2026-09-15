import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  ShoppingBag,
  X,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  Database
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface ClickstreamEvent {
  event_id: string;
  event_type: string;
  event_version: number;
  event_source: string;
  session_id: string;
  customer_id: string | null;
  user_type: string;
  page: string;
  device?: string;
  browser?: string;
  timestamp: string;
  status: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface TelemetryMetrics {
  eventsRate: number;
  eventsCount: number;
  errorsCount: number;
  lateCount: number;
  duplicatesCount: number;
  invalidCount: number;
}

export default function AdminEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ClickstreamEvent[]>([]);
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'stream' | 'journey' | 'session' | 'order'>('stream');

  // Filters state
  const [filterType, setFilterType] = useState<string>('');
  const [filterCust, setFilterCust] = useState<string>('');
  const [filterSess, setFilterSess] = useState<string>('');
  const [filterOrder, setFilterOrder] = useState<string>('');
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterTime, setFilterTime] = useState<string>('');

  // Search terms for journey views
  const [journeyCust, setJourneyCust] = useState<string>('');
  const [journeySess, setJourneySess] = useState<string>('');
  const [journeyOrder, setJourneyOrder] = useState<string>('');

  // Selected event for detail inspector drawer
  const [selectedEvent, setSelectedEvent] = useState<ClickstreamEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEvents = async (silent = false) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      if (!silent) setLoading(true);
      
      let url = `/api/admin/events?`;
      if (filterType) url += `&eventType=${filterType}`;
      if (filterCust) url += `&customerId=${filterCust}`;
      if (filterSess) url += `&sessionId=${filterSess}`;
      if (filterOrder) url += `&orderId=${filterOrder}`;
      if (filterProduct) url += `&productId=${filterProduct}`;
      if (filterSource) url += `&source=${filterSource}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterTime) url += `&timeRange=${filterTime}`;

      const res = await fetch(url, { headers: { 'Authorization': token } });
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events);
        setMetrics(data.metrics);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch events.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');

    if (!token || !adminData) {
      localStorage.clear();
      navigate('/admin/login');
      return;
    }

    fetchEvents();

    // Set polling interval for live event telemetries (every 5 seconds)
    const interval = setInterval(() => fetchEvents(true), 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleApplyFilters = () => {
    fetchEvents();
  };

  const handleClearFilters = () => {
    setFilterType('');
    setFilterCust('');
    setFilterSess('');
    setFilterOrder('');
    setFilterProduct('');
    setFilterSource('');
    setFilterStatus('');
    setFilterTime('');
    setTimeout(() => fetchEvents(), 10);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  // Journey tracing filtering logic on the client side
  const customerJourneyEvents = events.filter(e => journeyCust ? e.customer_id === journeyCust : false);
  const sessionJourneyEvents = events.filter(e => journeySess ? e.session_id === journeySess : false);
  const orderJourneyEvents = events.filter(e => {
    if (!journeyOrder) return false;
    return e.metadata && (e.metadata.order_id === journeyOrder || e.metadata.cart_id === journeyOrder);
  });

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* HEADER */}
      <header className="bg-[#0071DC] text-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-45">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/admin/products')}>
          <img 
            src="/nexday-logo.png" 
            alt="NexDay™ Admin Portal" 
            className="h-10 w-auto object-contain bg-white rounded-xl px-2.5 py-1 shadow-sm hover:scale-105 transition-transform duration-200" 
          />
          <span className="text-[10px] font-black tracking-widest bg-[#FFC20A] text-[#0B2A55] uppercase px-2 py-0.5 rounded-md shadow-sm">
            Admin Portal
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1.5 text-xs font-bold bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Customer View</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 text-xs font-bold border border-white/20 bg-blue-900/30 hover:bg-blue-900/50 text-white px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col lg:flex-row min-w-0 w-full overflow-x-hidden">
        {/* SIDEBAR */}
        <AdminSidebar />

        {/* CONTENT */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto w-full min-w-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Telemetry Event Monitor</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Real-time clickstream ingestion telemetry, schemas quality analytics, and journeys tracing</p>
            </div>
            <button
              onClick={() => fetchEvents()}
              className="bg-white border border-gray-250 hover:bg-gray-50 text-gray-600 text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-full transition-all shadow-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Stream
            </button>
          </div>

          {/* Metrics Panel */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Events / Sec</span>
                <span className="text-2xl font-black text-[#0071DC] block mt-1">{metrics.eventsRate}</span>
                <span className="text-xs text-emerald-600 font-bold block mt-1">Live Telemetry Rate</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Events Today</span>
                <span className="text-2xl font-black text-[#041E42] block mt-1">{metrics.eventsCount.toLocaleString()}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Total ingestion stream</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Errors / Fails</span>
                <span className="text-2xl font-black text-red-500 block mt-1">{metrics.errorsCount}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Execution failures</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Late Arrived</span>
                <span className="text-2xl font-black text-amber-500 block mt-1">{metrics.lateCount}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Out-of-order latency</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Duplicates Detected</span>
                <span className="text-2xl font-black text-purple-600 block mt-1">{metrics.duplicatesCount}</span>
                <span className="text-xs text-gray-500 font-bold block mt-1">Idempotency repeats</span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-250 bg-white rounded-t-3xl p-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab('stream')}
              className={`flex-grow py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                activeTab === 'stream' ? 'bg-[#0071DC] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Live event stream
            </button>
            <button
              onClick={() => setActiveTab('journey')}
              className={`flex-grow py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                activeTab === 'journey' ? 'bg-[#0071DC] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Customer journey
            </button>
            <button
              onClick={() => setActiveTab('session')}
              className={`flex-grow py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                activeTab === 'session' ? 'bg-[#0071DC] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Session view
            </button>
            <button
              onClick={() => setActiveTab('order')}
              className={`flex-grow py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all ${
                activeTab === 'order' ? 'bg-[#0071DC] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Order timeline
            </button>
          </div>

          {activeTab === 'stream' && (
            <div className="space-y-6">
              {/* Event Filters */}
              <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-[#041E42] uppercase tracking-wider border-b border-gray-100 pb-2">Filter Clickstream Log</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Event Type</label>
                    <input
                      type="text"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      placeholder="e.g. cart_add"
                      className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Customer ID</label>
                    <input
                      type="text"
                      value={filterCust}
                      onChange={(e) => setFilterCust(e.target.value)}
                      placeholder="e.g. CUST001"
                      className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Session ID</label>
                    <input
                      type="text"
                      value={filterSess}
                      onChange={(e) => setFilterSess(e.target.value)}
                      placeholder="sess_..."
                      className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Order / Cart ID</label>
                    <input
                      type="text"
                      value={filterOrder}
                      onChange={(e) => setFilterOrder(e.target.value)}
                      placeholder="ORD_... or CART_..."
                      className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Product ID</label>
                    <input
                      type="text"
                      value={filterProduct}
                      onChange={(e) => setFilterProduct(e.target.value)}
                      placeholder="PROD_..."
                      className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Event Source</label>
                    <select
                      value={filterSource}
                      onChange={(e) => setFilterSource(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-bold cursor-pointer"
                    >
                      <option value="">[All Sources]</option>
                      <option value="website">website</option>
                      <option value="simulator">simulator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Evaluation Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-bold cursor-pointer"
                    >
                      <option value="">[All Statuses]</option>
                      <option value="PROCESSED">PROCESSED</option>
                      <option value="DUPLICATE">DUPLICATE</option>
                      <option value="INVALID">INVALID</option>
                      <option value="LATE">LATE</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1 mb-1">Time Range</label>
                    <select
                      value={filterTime}
                      onChange={(e) => setFilterTime(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-bold cursor-pointer"
                    >
                      <option value="">[All Time]</option>
                      <option value="15m">Last 15 minutes</option>
                      <option value="1h">Last 1 hour</option>
                      <option value="24h">Last 24 hours</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={handleClearFilters}
                    className="border border-gray-200 hover:bg-gray-150 text-gray-600 text-xs font-black uppercase tracking-wider py-2 px-6 rounded-full transition-all"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="bg-[#0071DC] hover:bg-[#0046BE] text-white text-xs font-black uppercase tracking-wider py-2 px-6 rounded-full transition-all shadow-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* Event Stream Listing Table */}
              <div className="bg-white border border-gray-250 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[#041E42] font-black uppercase text-[10px] tracking-wider">
                        <th className="py-4 px-6">Timestamp</th>
                        <th className="py-4 px-6">Event ID</th>
                        <th className="py-4 px-6">Event Type</th>
                        <th className="py-4 px-6">Customer</th>
                        <th className="py-4 px-6">Session ID</th>
                        <th className="py-4 px-6">Source</th>
                        <th className="py-4 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-xs font-semibold text-gray-700 font-mono">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8">
                            <div className="w-6 h-6 border-2 border-[#0071DC] border-t-transparent rounded-full animate-spin mx-auto"></div>
                          </td>
                        </tr>
                      ) : events.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-400 font-bold uppercase tracking-wider">No telemetry events logged</td>
                        </tr>
                      ) : (
                        events.map((evt) => (
                          <tr 
                            key={evt.event_id} 
                            onClick={() => { setSelectedEvent(evt); setIsDrawerOpen(true); }}
                            className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                          >
                            <td className="py-4 px-6 text-gray-400 font-medium">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                            <td className="py-4 px-6 font-bold text-[#0071DC] truncate max-w-[120px]">{evt.event_id}</td>
                            <td className="py-4 px-6 font-bold text-[#041E42]">{evt.event_type}</td>
                            <td className="py-4 px-6 text-gray-600 truncate max-w-[100px]">{evt.customer_id || 'guest'}</td>
                            <td className="py-4 px-6 text-gray-400 truncate max-w-[120px]">{evt.session_id}</td>
                            <td className="py-4 px-6 font-bold">{evt.event_source}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                evt.status === 'PROCESSED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                evt.status === 'DUPLICATE' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                evt.status === 'LATE' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                evt.status === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-100' :
                                'bg-red-100 text-red-900 border border-red-200'
                              }`}>
                                {evt.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'journey' && (
            <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Trace Customer Activity</h3>
              <div className="flex gap-4 items-end max-w-md">
                <div className="flex-grow space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1">Customer ID</label>
                  <input
                    type="text"
                    value={journeyCust}
                    onChange={(e) => setJourneyCust(e.target.value)}
                    placeholder="e.g. CUST001"
                    className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Vertical Journey Timeline logs */}
              <div className="space-y-4">
                {customerJourneyEvents.length === 0 ? (
                  <div className="text-gray-400 py-8 font-bold uppercase tracking-wider text-xs">Enter Customer ID to load activity funnel logs</div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-blue-100 space-y-6 text-xs font-semibold text-gray-600">
                    {customerJourneyEvents.map((evt, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[31px] top-0.5 bg-white border-2 border-[#0071DC] w-3 h-3 rounded-full"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-gray-400 mr-2">{new Date(evt.timestamp).toLocaleString()}</span>
                            <span className="font-bold text-[#041E42] uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-mono">{evt.event_type}</span>
                            {evt.metadata && evt.metadata.product_id && (
                              <span className="text-gray-500 font-medium ml-2">Product: {evt.metadata.product_id}</span>
                            )}
                          </div>
                          <button
                            onClick={() => { setSelectedEvent(evt); setIsDrawerOpen(true); }}
                            className="text-[#0071DC] hover:underline font-bold"
                          >
                            Inspect JSON
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'session' && (
            <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Trace Session Conversion Funnel</h3>
              <div className="flex gap-4 items-end max-w-md">
                <div className="flex-grow space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1">Session ID</label>
                  <input
                    type="text"
                    value={journeySess}
                    onChange={(e) => setJourneySess(e.target.value)}
                    placeholder="sess_..."
                    className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Horizontal Funnel Sequence */}
              <div className="space-y-4">
                {sessionJourneyEvents.length === 0 ? (
                  <div className="text-gray-400 py-8 font-bold uppercase tracking-wider text-xs">Enter Session ID to map conversion timeline</div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    {sessionJourneyEvents.map((evt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div 
                          onClick={() => { setSelectedEvent(evt); setIsDrawerOpen(true); }}
                          className="bg-[#0071DC] text-white font-mono font-black uppercase text-[10px] tracking-wider px-3.5 py-2 rounded-2xl cursor-pointer hover:bg-blue-700 transition-all shadow-sm"
                        >
                          {evt.event_type}
                        </div>
                        {idx < sessionJourneyEvents.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'order' && (
            <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Trace Order Lifecycle Timeline</h3>
              <div className="flex gap-4 items-end max-w-md">
                <div className="flex-grow space-y-1">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase pl-1">Order / Cart ID</label>
                  <input
                    type="text"
                    value={journeyOrder}
                    onChange={(e) => setJourneyOrder(e.target.value)}
                    placeholder="e.g. ORD-..."
                    className="w-full bg-gray-50 text-[#041E42] px-3.5 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none transition-all text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Order lifecycle flow log */}
              <div className="space-y-4">
                {orderJourneyEvents.length === 0 ? (
                  <div className="text-gray-400 py-8 font-bold uppercase tracking-wider text-xs">Enter Order ID to reconstruct fulfillment operations logs</div>
                ) : (
                  <div className="space-y-4">
                    {orderJourneyEvents.map((evt, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex justify-between items-center text-xs font-semibold text-gray-600">
                        <div className="flex items-center space-x-3">
                          <Database className="w-5 h-5 text-[#0071DC]" />
                          <div>
                            <span className="font-black text-[#041E42] uppercase font-mono block">{evt.event_type}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Logged on: {new Date(evt.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedEvent(evt); setIsDrawerOpen(true); }}
                          className="text-[#0071DC] hover:underline font-bold font-mono"
                        >
                          Inspect JSON
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* JSON INSPECTOR DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && selectedEvent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end z-50">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-[500px] border-l border-gray-250 shadow-2xl flex flex-col relative overflow-hidden font-mono"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              {/* Header */}
              <div className="p-6 border-b border-gray-150 flex items-center justify-between mt-1.5">
                <div>
                  <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight font-sans">Event Payload</h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{selectedEvent.event_id}</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quality Issue Notice */}
              {selectedEvent.status === 'INVALID' && (
                <div className="bg-red-50 border-y border-red-200 px-6 py-3 flex items-start space-x-2 text-xs font-bold text-red-800 font-sans">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span>Quality issue detected: </span>
                    <span className="font-normal text-red-700">This event contains corrupted syntax or negative numeric properties.</span>
                  </div>
                </div>
              )}
              {selectedEvent.status === 'DUPLICATE' && (
                <div className="bg-purple-50 border-y border-purple-200 px-6 py-3 flex items-start space-x-2 text-xs font-bold text-purple-800 font-sans">
                  <AlertTriangle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span>Duplicate event detected: </span>
                    <span className="font-normal text-purple-700">This message ID was already processed earlier.</span>
                  </div>
                </div>
              )}
              {selectedEvent.status === 'LATE' && (
                <div className="bg-amber-50 border-y border-amber-200 px-6 py-3 flex items-start space-x-2 text-xs font-bold text-amber-800 font-sans">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span>Late event: </span>
                    <span className="font-normal text-amber-700">Arrived with significant delay. May require watermarking.</span>
                  </div>
                </div>
              )}

              {/* JSON code view */}
              <div className="flex-grow overflow-y-auto p-6 bg-slate-950 text-emerald-400 text-xs leading-relaxed font-mono">
                <pre className="whitespace-pre-wrap">{JSON.stringify(selectedEvent, null, 2)}</pre>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-150 bg-gray-50">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] text-white font-black py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px] font-sans"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-100 p-4 rounded-2xl shadow-xl flex items-center space-x-2 border font-bold text-xs ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
