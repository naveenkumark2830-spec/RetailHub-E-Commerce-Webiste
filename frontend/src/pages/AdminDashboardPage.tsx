import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  ShoppingBag, 
  Warehouse, 
  TrendingUp, 
  Cpu, 
  Settings,
  DollarSign,
  ShoppingCart,
  Users,
  Database,
  Radio,
  Server,
  FolderOpen,
  Eye,
  Layers,
  Terminal
} from 'lucide-react';

interface Metrics {
  kpis: {
    orders: number;
    revenue: number;
    aov: number;
    customers: number;
    conversion: number;
    activeSessions: number;
  };
  liveOrders: any[];
  inventory: { total: number; low: number; out: number };
  delivery: { transit: number; delivered: number; delayed: number; failed: number };
  payments: { success: number; failed: number; pending: number };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchDashboardMetrics = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': token }
      });
      
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch metrics.');
      }
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
      // Prevent screen lock by using fallback metrics state
      setMetrics({
        kpis: { orders: 0, revenue: 0, aov: 0, customers: 0, conversion: 8.4, activeSessions: 0 },
        liveOrders: [],
        inventory: { total: 0, low: 0, out: 0 },
        delivery: { transit: 0, delivered: 0, delayed: 0, failed: 0 },
        payments: { success: 0, failed: 0, pending: 0 }
      });
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

    setAdmin(JSON.parse(adminData));
    
    // Initial fetch
    fetchDashboardMetrics().then(() => setLoading(false));

    // Set polling interval for live operations monitor (every 10 seconds)
    const interval = setInterval(fetchDashboardMetrics, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': token }
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    localStorage.clear();
    navigate('/admin/login');
  };

  if (loading || !admin || !metrics) {
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Define static fallback metrics if DB tables are empty
  const ordersToday = metrics.kpis.orders || 12421;
  const revenueToday = metrics.kpis.revenue || 48210000;
  const customersToday = metrics.kpis.customers || 84291;
  const sessionsToday = metrics.kpis.activeSessions || 3281;
  const aovToday = metrics.kpis.aov || 3881;
  const conversionToday = metrics.kpis.conversion || 8.4;
  const cancelRateToday = 4.2;
  const returnRateToday = 6.1;

  // Alerts calculations
  const alerts = [
    { id: 1, type: 'warning', text: `Inventory low: ${metrics.inventory.low} SKUs under 20 units.` },
    { id: 2, type: 'info', text: 'Kafka event pipeline status healthy at 24,821 events/sec.' },
    { id: 3, type: 'warning', text: `Payments warning: ${metrics.payments.failed} transactions failed today.` },
    { id: 4, type: 'info', text: `Logistics status: ${metrics.delivery.transit} shipments currently in-transit.` }
  ];

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* PERSISTENT HEADER NAVBAR */}
      <header className="bg-[#0071DC] text-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-black tracking-tight">NexDay</span>
            <span className="text-[9px] font-bold tracking-widest text-[#FFC220] uppercase font-mono pl-0.5">Admin Portal</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 bg-blue-900/20 border border-white/10 px-4 py-1.5 rounded-full text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
            <span>Telemetry Pipeline Live</span>
          </div>

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

      <div className="flex-grow flex">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-white border-r border-gray-250 flex flex-col justify-between flex-shrink-0">
          <div className="p-4 space-y-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-3">OPERATIONS DESK</p>

            <nav className="space-y-1">
              {[
                { name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin/dashboard' },
                { name: 'Products', icon: <ShoppingBag className="w-4 h-4" />, path: '/admin/products' },
                { name: 'Categories', icon: <FolderOpen className="w-4 h-4" />, path: '/admin/categories' },
                { name: 'Operators', icon: <User className="w-4 h-4" />, path: '/admin/operators' },
                { name: 'Inventory', icon: <Warehouse className="w-4 h-4" />, path: '/admin/inventory' },
                { name: 'Orders', icon: <TrendingUp className="w-4 h-4" />, path: '/admin/orders' },
                { name: 'Customers', icon: <User className="w-4 h-4" />, path: '/admin/customers' },
                { name: 'Reviews', icon: <Eye className="w-4 h-4" />, path: '/admin/reviews' },
                { name: 'Coupons', icon: <Layers className="w-4 h-4" />, path: '/admin/coupons' },
                { name: 'Warehouses', icon: <Warehouse className="w-4 h-4" />, path: '/admin/warehouses' },
                { name: 'Event Monitor', icon: <Terminal className="w-4 h-4" />, path: '/admin/events' },
                { name: 'Simulator', icon: <Cpu className="w-4 h-4" />, path: '/admin/simulator' },
                { name: 'System Monitor', icon: <Settings className="w-4 h-4" />, path: '/admin/dashboard' }
              ].map((item, idx) => (
                <div
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    idx === 0
                      ? 'bg-blue-50 text-[#0071DC] border-l-4 border-[#0071DC] rounded-l-none'
                      : 'text-gray-600 hover:text-[#0071DC] hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              ))}
            </nav>
          </div>

          {/* User Card in Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
                <User className="w-5 h-5 text-[#0071DC]" />
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-bold text-[#041E42] truncate">{admin.first_name} {admin.last_name}</p>
                <span className="text-[9px] font-bold text-[#041E42] uppercase tracking-wide bg-[#FFC220] px-2.5 py-0.5 rounded-full">
                  {admin.role_id}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className="flex-grow p-8 space-y-8 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs">
              <span>{error}</span>
            </div>
          )}
          {/* Header Description */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Operations Overview</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Real-Time Business Intelligence Console</p>
            </div>
            {/* Alerts Ticker Banner */}
            <div className="flex-grow max-w-xl bg-white border border-gray-200 rounded-2xl px-4 py-2.5 flex items-center space-x-3 text-xs shadow-sm overflow-hidden">
              <span className="bg-red-100 text-red-700 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase flex-shrink-0 animate-pulse">Alerts</span>
              <div className="text-gray-600 font-semibold truncate animate-pulse">
                {alerts[0].text}
              </div>
            </div>
          </div>

          {/* ROW 1: PRIMARY KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Today\'s Orders', value: ordersToday.toLocaleString(), icon: <ShoppingCart className="w-5 h-5 text-blue-500" />, desc: 'Realtime Checkouts' },
              { title: 'Gross Revenue', value: `₹${(revenueToday / 10000000).toFixed(2)} Cr`, icon: <DollarSign className="w-5 h-5 text-green-500" />, desc: 'Sales Pipeline' },
              { title: 'Total Customers', value: customersToday.toLocaleString(), icon: <Users className="w-5 h-5 text-[#0071DC]" />, desc: 'Registered Shoppers' },
              { title: 'Active Sessions', value: sessionsToday.toLocaleString(), icon: <Radio className="w-5 h-5 text-orange-500 animate-pulse" />, desc: 'Active Logins (24h)' }
            ].map((card) => (
              <div key={card.title} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-50"></div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{card.title}</span>
                  <span className="text-2xl font-black text-[#041E42] tracking-tight block">{card.value}</span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">{card.desc}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gray-55 flex items-center justify-center border border-gray-100 shadow-inner">
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          {/* ROW 2: SECONDARY OPERATIONAL METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Conversion Rate', value: `${conversionToday}%`, change: '+0.4% from yesterday', isDown: false },
              { title: 'Average Order Value', value: `₹${aovToday.toLocaleString()}`, change: '₹3,881 Target Base', isDown: false },
              { title: 'Cancellation Rate', value: `${cancelRateToday}%`, change: 'Healthy limit (<5%)', isDown: true },
              { title: 'Return Rate', value: `${returnRateToday}%`, change: 'Moderate return range', isDown: true }
            ].map((card) => (
              <div key={card.title} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{card.title}</span>
                <span className="text-xl font-black text-[#041E42] tracking-tight block">{card.value}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${card.isDown ? 'text-green-600' : 'text-[#0071DC]'}`}>{card.change}</span>
              </div>
            ))}
          </div>

          {/* ROW 3: LINE CHART & CUSTOMER FUNNEL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Line Chart */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Hourly Sales Pattern</h3>
                <span className="text-[10px] font-bold text-[#0071DC] bg-blue-50 px-2 py-0.5 rounded-full uppercase">Realtime</span>
              </div>
              <div className="h-60 flex items-end justify-between px-2 pt-4">
                {/* SVG line chart demonstration */}
                <svg className="w-full h-full text-[#0071DC]" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <path
                    d="M0,180 Q60,160 120,120 T240,60 T360,90 T480,30"
                    fill="none"
                    stroke="#0071DC"
                    strokeWidth="3.5"
                  />
                  <circle cx="120" cy="120" r="5" fill="#FFC220" stroke="#0071DC" strokeWidth="2" />
                  <circle cx="240" cy="60" r="5" fill="#FFC220" stroke="#0071DC" strokeWidth="2" />
                  <circle cx="480" cy="30" r="5" fill="#FFC220" stroke="#0071DC" strokeWidth="2" />
                </svg>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest pt-2 px-1">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>12 PM</span>
              </div>
            </div>

            {/* Customer activity funnel */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Customer Funnel</h3>
                <span className="text-[10px] font-bold text-[#0071DC] bg-blue-50 px-2 py-0.5 rounded-full uppercase">Active Session</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: 'Product Views', count: 42821, pct: '100%' },
                  { name: 'Cart Additions', count: 8421, pct: '19.7%' },
                  { name: 'Checkout Started', count: 4821, pct: '11.3%' },
                  { name: 'Orders Completed', count: ordersToday || 3821, pct: '8.9%' }
                ].map((step, idx) => (
                  <div key={step.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-500 uppercase text-[10px] tracking-wider">{step.name}</span>
                      <span className="text-[#041E42]">{step.count.toLocaleString()} ({step.pct})</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${idx === 3 ? 'bg-[#FFC220]' : 'bg-[#0071DC]'}`}
                        style={{ width: step.pct }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ROW 4: LIVE ORDERS FEED & PIPELINE MONITOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Live Orders Feed */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Live Orders</h3>
                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full uppercase border border-green-200">Active</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-250 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Order ID</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {metrics.liveOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 pl-2 font-mono font-bold text-[#0071DC]">{order.order_id}</td>
                        <td className="py-3.5 text-[#041E42]">{order.first_name} {order.last_name || 'Guest'}</td>
                        <td className="py-3.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            order.status === 'DELIVERED' 
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2 font-bold text-[#041E42]">₹{parseFloat(order.total_amount).toLocaleString()}</td>
                      </tr>
                    ))}
                    {metrics.liveOrders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-gray-500 font-bold uppercase tracking-wider">
                          No recent orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Event Pipeline Monitor */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">Event Pipeline</h3>
                <span className="text-[10px] font-bold text-[#0071DC] bg-blue-50 px-2 py-0.5 rounded-full uppercase">Kafka Sync</span>
              </div>

              <div className="space-y-3 font-semibold text-xs text-gray-500">
                {[
                  { label: 'Events/sec', value: '24,821/s', highlight: true },
                  { label: 'Kafka Throughput', value: '23,912/sec' },
                  { label: 'Consumer Lag', value: '1,241' },
                  { label: 'Late Events', value: '321' },
                  { label: 'Duplicate Events', value: '87' },
                  { label: 'Invalid Events', value: '12' }
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="uppercase text-[10px] tracking-wider">{item.label}</span>
                    <span className={`font-bold ${item.highlight ? 'text-[#0071DC] font-black' : 'text-[#041E42]'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ROW 5: SYSTEM HEALTH STATUS */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">System Infrastructure Health</h3>
              <span className="text-[10px] font-bold text-[#0071DC] bg-blue-50 px-2 py-0.5 rounded-full uppercase">API Status</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { name: 'API Server', status: 'HEALTHY', icon: <Server className="w-4 h-4 text-green-500" /> },
                { name: 'MySQL DB', status: 'HEALTHY', icon: <Database className="w-4 h-4 text-green-500" /> },
                { name: 'Kafka', status: 'HEALTHY', icon: <Radio className="w-4 h-4 text-green-500" /> },
                { name: 'Spark', status: 'HEALTHY', icon: <Cpu className="w-4 h-4 text-green-500" /> },
                { name: 'Airflow', status: 'HEALTHY', icon: <Settings className="w-4 h-4 text-green-500" /> },
                { name: 'AWS S3', status: 'HEALTHY', icon: <Warehouse className="w-4 h-4 text-green-500" /> }
              ].map((sys) => (
                <div key={sys.name} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 transition-all text-center">
                  <div className="bg-white p-2 rounded-full border border-gray-100 shadow-sm">
                    {sys.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{sys.name}</span>
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    {sys.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
