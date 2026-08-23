import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  LogOut, 
  ShoppingBag, 
  Warehouse, 
  TrendingUp, 
  FolderOpen, 
  Eye, 
  Layers, 
  Cpu, 
  Play, 
  Pause, 
  Square, 
  Activity, 
  AlertCircle 
} from 'lucide-react';

interface RunHistoryItem {
  run_id: string;
  users: number;
  target_rate: number;
  rate_unit: string;
  duration: string;
  traffic_profile: string;
  total_events: number;
  orders: number;
  payments: number;
  returns: number;
  invalid: number;
  duplicates: number;
  late: number;
  status: string;
  started_at: string;
  ended_at: string | null;
}

interface CoverageItem {
  event_type: string;
  generated: boolean;
  count: number;
}

export default function AdminSimulatorPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>({ first_name: 'Admin', last_name: 'Operator', role_id: 'SUPER_ADMIN' });

  // Form Controls
  const [usersCount, setUsersCount] = useState<string>('100');
  const [customUsers, setCustomUsers] = useState<string>('');
  const [targetRate, setTargetRate] = useState<string>('50');
  const [customRate, setCustomRate] = useState<string>('');
  const [rateUnit, setRateUnit] = useState<string>('/sec');
  const [duration, setDuration] = useState<string>('5 min');
  const [customDuration, setCustomDuration] = useState<string>('');
  const [trafficProfile, setTrafficProfile] = useState<string>('Mixed / Realistic');
  const [mode, setMode] = useState<'CLEAN' | 'DIRTY'>('CLEAN');

  // Live Metrics & Status
  const [running, setRunning] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [runId, setRunId] = useState<string>('');
  const [elapsedDuration, setElapsedDuration] = useState<string>('00:00:00');
  const [actualRate, setActualRate] = useState<number>(0);
  const [liveStats, setLiveStats] = useState<any>({
    active_sessions: 0,
    total_events: 0,
    orders: 0,
    payments: 0,
    returns: 0,
    invalid: 0,
    duplicates: 0,
    late: 0,
    out_of_order: 0,
    invalid_timestamp: 0,
    missing_customer: 0,
    negative_price: 0,
    invalid_category: 0,
    corrupted_json: 0
  });

  // Traces & Dropdown Selectors
  const [customerJourney, setCustomerJourney] = useState<any>(null);
  const [orderJourney, setOrderJourney] = useState<any>(null);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [orderOptions, setOrderOptions] = useState<string[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [customerJourneysMap, setCustomerJourneysMap] = useState<Record<string, string[]>>({});
  const [orderJourneysMap, setOrderJourneysMap] = useState<Record<string, string[]>>({});

  // Lists
  const [_history, setHistory] = useState<RunHistoryItem[]>([]);
  const [coverageReport, setCoverageReport] = useState<CoverageItem[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAdminToken = () => localStorage.getItem('adminToken') || 'ADMIN_BEARER_TOKEN';

  const fetchStatusAndMetrics = async () => {
    const token = getAdminToken();

    try {
      const res = await fetch('/api/admin/simulator/status', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setRunning(data.running);
        setPaused(data.paused);
        setRunId(data.runId || '');
        setElapsedDuration(data.elapsedDuration);
        setActualRate(data.actualRate);
        setLiveStats(data.liveStats);
        setCustomerJourney(data.customerJourney);
        setOrderJourney(data.orderJourney);
        if (data.config?.mode) {
          setMode(data.config.mode);
        }

        if (data.customerIds && data.customerIds.length > 0) {
          setCustomerOptions(data.customerIds);
          setSelectedCustomerId(prev => (prev && data.customerIds.includes(prev) ? prev : data.customerIds[0]));
        }
        if (data.orderIds && data.orderIds.length > 0) {
          setOrderOptions(data.orderIds);
          setSelectedOrderId(prev => (prev && data.orderIds.includes(prev) ? prev : data.orderIds[0]));
        }
        if (data.customerJourneys) setCustomerJourneysMap(data.customerJourneys);
        if (data.orderJourneys) setOrderJourneysMap(data.orderJourneys);
      }

      const covRes = await fetch('/api/admin/simulator/coverage-report', {
        headers: { 'Authorization': token }
      });
      if (covRes.ok) {
        const reportData = await covRes.json();
        setCoverageReport(reportData);
      }
    } catch (err) {
      console.error('Failed to sync simulator telemetry:', err);
    }
  };

  const fetchHistory = async () => {
    const token = getAdminToken();
    try {
      const res = await fetch('/api/admin/simulator/history', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load runs history:', err);
    }
  };

  useEffect(() => {
    fetchStatusAndMetrics();
    fetchHistory();

    const interval = setInterval(() => {
      fetchStatusAndMetrics();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    if (!token || !adminData) {
      navigate('/admin/login');
      return;
    }
    try {
      setAdmin(JSON.parse(adminData));
    } catch (e) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleStart = async () => {
    const token = getAdminToken();
    const finalUsers = usersCount === 'Custom' ? parseInt(customUsers) : parseInt(usersCount);
    const finalRate = targetRate === 'Custom' ? parseInt(customRate) : parseInt(targetRate);
    const finalDuration = duration === 'Custom' ? customDuration : duration;

    if (!finalUsers || finalUsers <= 0) {
      showToast('Please enter a valid count of virtual users.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/simulator/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          usersCount: finalUsers,
          targetRate: finalRate,
          rateUnit,
          duration: finalDuration,
          trafficProfile,
          mode
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Simulator started successfully in ${mode} mode.`);
        setRunning(true);
        setPaused(false);
        setRunId(data.status.runId);
        fetchHistory();
      } else {
        showToast(data.error || 'Failed to start simulator.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred.', 'error');
    }
  };

  const handlePause = async () => {
    const token = getAdminToken();
    try {
      const res = await fetch('/api/admin/simulator/pause', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        showToast('Simulator paused.');
        setPaused(true);
      }
    } catch (err) {
      showToast('Failed to pause simulator.', 'error');
    }
  };

  const handleResume = async () => {
    const token = getAdminToken();
    try {
      const res = await fetch('/api/admin/simulator/resume', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        showToast('Simulator resumed.');
        setPaused(false);
      }
    } catch (err) {
      showToast('Failed to resume simulator.', 'error');
    }
  };

  const handleStop = async () => {
    const token = getAdminToken();
    try {
      const res = await fetch('/api/admin/simulator/stop', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        showToast('Simulator terminated safely.');
        setRunning(false);
        setPaused(false);
        fetchHistory();
      }
    } catch (err) {
      showToast('Failed to stop simulator.', 'error');
    }
  };

  const handleTriggerCoverageTest = async () => {
    const token = getAdminToken();
    try {
      showToast('Running Forced Event Coverage Test...');
      const res = await fetch('/api/admin/simulator/test-coverage', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        showToast('Event coverage completed successfully!');
        fetchStatusAndMetrics();
        fetchHistory();
      } else {
        showToast('Coverage test execution failed.', 'error');
      }
    } catch (err) {
      showToast('Error executing coverage test.', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const totalSimulatedEvents = coverageReport.reduce((acc, curr) => acc + curr.count, 0);
  const activeEventTypes = coverageReport
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const activeCustomerId = selectedCustomerId || customerJourney?.customerId || '';
  const currentCustomerSteps = (activeCustomerId && customerJourneysMap[activeCustomerId])
    ? customerJourneysMap[activeCustomerId]
    : (customerJourney?.steps || []);

  const activeOrderId = selectedOrderId || orderJourney?.orderId || '';
  const currentOrderSteps = (activeOrderId && orderJourneysMap[activeOrderId])
    ? orderJourneysMap[activeOrderId]
    : (orderJourney?.steps || []);

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* HEADER NAVBAR */}
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
          <div className="flex items-center space-x-2 bg-blue-900/30 border border-white/20 px-4 py-1.5 rounded-full text-xs font-mono">
            <span className={`w-2.5 h-2.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-[#FFC220]'}`}></span>
            <span className="font-bold text-white">
              {running ? (paused ? '● SIMULATION PAUSED' : `● SIMULATOR RUNNING [${mode}]`) : '● SYSTEM READY'}
            </span>
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
                { name: 'Simulator', icon: <Cpu className="w-4 h-4" />, path: '/admin/simulator' },
                { name: 'Products', icon: <ShoppingBag className="w-4 h-4" />, path: '/admin/products' },
                { name: 'Categories', icon: <FolderOpen className="w-4 h-4" />, path: '/admin/categories' },
                { name: 'Operators', icon: <User className="w-4 h-4" />, path: '/admin/operators' },
                { name: 'Inventory', icon: <Warehouse className="w-4 h-4" />, path: '/admin/inventory' },
                { name: 'Orders', icon: <TrendingUp className="w-4 h-4" />, path: '/admin/orders' },
                { name: 'Customers', icon: <User className="w-4 h-4" />, path: '/admin/customers' },
                { name: 'Reviews', icon: <Eye className="w-4 h-4" />, path: '/admin/reviews' },
                { name: 'Coupons', icon: <Layers className="w-4 h-4" />, path: '/admin/coupons' },
                { name: 'Warehouses', icon: <Warehouse className="w-4 h-4" />, path: '/admin/warehouses' }
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

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
                <User className="w-5 h-5 text-[#0071DC]" />
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-bold text-[#041E42] truncate">{admin?.first_name} {admin?.last_name}</p>
                <span className="text-[9px] font-bold text-[#041E42] uppercase tracking-wide bg-[#FFC220] px-2.5 py-0.5 rounded-full">
                  {admin?.role_id}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT BODY */}
        <main className="flex-grow p-8 space-y-6 overflow-y-auto">
          
          <div>
            <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Event Simulator & Telemetry Engine</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">High-throughput synthetic user journey generator & real-time streaming pipeline tester</p>
          </div>

          {/* TOAST */}
          {toast && (
            <div className={`fixed bottom-6 right-6 px-6 py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider shadow-2xl z-50 flex items-center space-x-2 ${
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <AlertCircle className="w-4 h-4" />
              <span>{toast.message}</span>
            </div>
          )}

          {/* SIMULATION CONFIGURATION PANEL */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#041E42] uppercase tracking-widest">
                SIMULATION CONFIGURATION {runId && `— RUN ID: ${runId}`}
              </h3>
              <span className="text-[10px] font-bold bg-blue-50 text-[#0071DC] px-3 py-1 rounded-full uppercase tracking-wider">
                Target Rate & Journey Controls
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              
              {/* Mode Selector */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Simulation Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'CLEAN' | 'DIRTY')}
                  disabled={running}
                  className="bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                >
                  <option value="CLEAN">Clean (Production Mode)</option>
                  <option value="DIRTY">Data Quality (Chaos Mode)</option>
                </select>
              </div>

              {/* Virtual Users */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Virtual Users</label>
                <div className="flex space-x-2">
                  <select
                    value={usersCount}
                    onChange={(e) => setUsersCount(e.target.value)}
                    disabled={running}
                    className="flex-grow bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                  >
                    <option value="10">10 Users</option>
                    <option value="100">100 Users</option>
                    <option value="1000">1,000 Users</option>
                    <option value="10000">10,000 Users</option>
                    <option value="Custom">Custom count...</option>
                  </select>
                  {usersCount === 'Custom' && (
                    <input
                      type="number"
                      placeholder="Count"
                      value={customUsers}
                      onChange={(e) => setCustomUsers(e.target.value)}
                      disabled={running}
                      className="w-24 bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                    />
                  )}
                </div>
              </div>

              {/* Event Rate */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Event Rate</label>
                <div className="flex space-x-2">
                  <select
                    value={targetRate}
                    onChange={(e) => setTargetRate(e.target.value)}
                    disabled={running}
                    className="flex-grow bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                  >
                    <option value="10">10</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                    <option value="1000">1,000</option>
                    <option value="5000">5,000</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {targetRate === 'Custom' && (
                    <input
                      type="number"
                      placeholder="Rate"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      disabled={running}
                      className="w-20 bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                    />
                  )}
                  <select
                    value={rateUnit}
                    onChange={(e) => setRateUnit(e.target.value)}
                    disabled={running}
                    className="bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                  >
                    <option value="/sec">/sec</option>
                    <option value="/min">/min</option>
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Duration</label>
                <div className="flex space-x-2">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={running}
                    className="flex-grow bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                  >
                    <option value="10 sec">10 seconds</option>
                    <option value="30 sec">30 seconds</option>
                    <option value="1 min">1 minute</option>
                    <option value="5 min">5 minutes</option>
                    <option value="10 min">10 minutes</option>
                    <option value="30 min">30 minutes</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {duration === 'Custom' && (
                    <input
                      type="text"
                      placeholder="e.g. 15 min"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      disabled={running}
                      className="w-24 bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                    />
                  )}
                </div>
              </div>

              {/* Traffic Profile */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Traffic Profile</label>
                <select
                  value={trafficProfile}
                  onChange={(e) => setTrafficProfile(e.target.value)}
                  disabled={running}
                  className="bg-gray-50 border border-gray-250 rounded-xl px-3 py-2.5 text-xs font-bold text-[#041E42] focus:outline-none focus:border-[#0071DC] disabled:opacity-50"
                >
                  <option value="Mixed / Realistic">Mixed / Realistic</option>
                  <option value="Browser Heavy">Browser Heavy</option>
                  <option value="Deal Hunter">Deal Hunter</option>
                  <option value="Regular Buyer">Regular Buyer</option>
                  <option value="Impulse Buyer">Impulse Buyer</option>
                  <option value="High Value Buyer">High Value Buyer</option>
                  <option value="Cart Abandoner">Cart Abandoner</option>
                  <option value="Return Prone">Return Prone</option>
                </select>
              </div>

            </div>

            {/* ACTION CONTROLS */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-150">
              {!running ? (
                <button
                  onClick={handleStart}
                  className="flex items-center space-x-2 bg-[#0071DC] hover:bg-[#0046BE] text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-2xl shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Simulation</span>
                </button>
              ) : (
                <>
                  {paused ? (
                    <button
                      onClick={handleResume}
                      className="flex items-center space-x-2 bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] text-xs font-black uppercase tracking-wider px-6 py-3 rounded-2xl shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-[#041E42] text-xs font-black uppercase tracking-wider px-6 py-3 rounded-2xl transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleStop}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-2xl shadow-sm transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              <button
                onClick={handleTriggerCoverageTest}
                disabled={running}
                className="flex items-center space-x-2 bg-gray-50 border border-gray-250 hover:bg-gray-100 text-[#041E42] text-xs font-black uppercase tracking-wider px-6 py-3 rounded-2xl transition-all disabled:opacity-40"
              >
                <Activity className="w-3.5 h-3.5 text-[#0071DC]" />
                <span>Run Event Coverage Test</span>
              </button>
            </div>
          </div>

          {/* LIVE KPIs GRID */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#041E42] uppercase tracking-widest">LIVE TELEMETRY KPIs & DATA QUALITY METRICS</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">ACTIVE SESSIONS</span>
                <span className="text-2xl font-black text-[#041E42] font-mono mt-1">
                  {running ? liveStats.active_sessions : '0'}
                </span>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">TARGET RATE</span>
                <span className="text-2xl font-black text-[#0071DC] font-mono mt-1">
                  {running ? `${targetRate}${rateUnit}` : '—'}
                </span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">ACTUAL RATE</span>
                <span className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {running ? `${actualRate}/sec` : '0/sec'}
                </span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">ELAPSED DURATION</span>
                <span className="text-2xl font-black text-[#041E42] font-mono mt-1">
                  {running ? elapsedDuration : '00:00:00'}
                </span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">EVENTS GENERATED</span>
                <span className="text-2xl font-black text-[#041E42] font-mono mt-1">
                  {(liveStats?.total_events ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">ORDERS CREATED</span>
                <span className="text-2xl font-black text-[#0071DC] font-mono mt-1">
                  {(liveStats?.orders ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">PAYMENTS COMPLETED</span>
                <span className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {(liveStats?.payments ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">RETURNS PROCESSED</span>
                <span className="text-2xl font-black text-amber-600 font-mono mt-1">
                  {(liveStats?.returns ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-red-50/60 border border-red-150 rounded-2xl p-4 flex flex-col justify-between col-span-2">
                <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">TOTAL DIRTY / INVALID EVENTS</span>
                <span className="text-2xl font-black text-red-600 font-mono mt-1">
                  {(liveStats?.invalid ?? 0).toLocaleString()}
                </span>
              </div>

            </div>

            {/* DETAILED DATA QUALITY BREAKDOWN */}
            <div className="border-t border-gray-150 pt-4">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-3">
                CHAOS MODE — DETAILED DIRTY TYPE BREAKDOWN
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
                
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-amber-700 uppercase">DUPLICATE</span>
                  <span className="text-base font-black text-amber-800 mt-1">{(liveStats?.duplicates ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-amber-700 uppercase">LATE</span>
                  <span className="text-base font-black text-amber-800 mt-1">{(liveStats?.late ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-purple-700 uppercase">OUT OF ORDER</span>
                  <span className="text-base font-black text-purple-800 mt-1">{(liveStats?.out_of_order ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-red-50/60 border border-red-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-red-700 uppercase">BAD TIMESTAMP</span>
                  <span className="text-base font-black text-red-800 mt-1">{(liveStats?.invalid_timestamp ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-orange-700 uppercase">MISSING CUST</span>
                  <span className="text-base font-black text-orange-800 mt-1">{(liveStats?.missing_customer ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-amber-700 uppercase">NEG PRICE</span>
                  <span className="text-base font-black text-amber-800 mt-1">{(liveStats?.negative_price ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-pink-50/60 border border-pink-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-pink-700 uppercase">BAD CATEGORY</span>
                  <span className="text-base font-black text-pink-800 mt-1">{(liveStats?.invalid_category ?? 0).toLocaleString()}</span>
                </div>

                <div className="bg-red-50/60 border border-red-200 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[8px] font-bold text-red-700 uppercase">CORRUPT JSON</span>
                  <span className="text-base font-black text-red-800 mt-1">{(liveStats?.corrupted_json ?? 0).toLocaleString()}</span>
                </div>

              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* EVENT DISTRIBUTION */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col">
              <h3 className="text-xs font-black text-[#041E42] uppercase tracking-widest mb-4">LIVE EVENT DISTRIBUTION</h3>
              
              <div className="flex-grow overflow-y-auto max-h-[360px] pr-1">
                {activeEventTypes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <Activity className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">No telemetry stream recorded yet</p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 uppercase text-[9px] font-black tracking-wider">
                        <th className="pb-2">Event Type</th>
                        <th className="pb-2 text-right">Count</th>
                        <th className="pb-2 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-gray-700 divide-y divide-gray-150">
                      {activeEventTypes.map((item) => {
                        const pct = totalSimulatedEvents > 0 ? ((item.count / totalSimulatedEvents) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={item.event_type} className="hover:bg-gray-50">
                            <td className="py-2.5 font-bold text-[#041E42]">{item.event_type}</td>
                            <td className="py-2.5 text-right font-bold">{item.count.toLocaleString()}</td>
                            <td className="py-2.5 text-right font-bold text-[#0071DC]">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* LIVE CUSTOMER JOURNEY */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#041E42] uppercase tracking-widest mb-4">LIVE CUSTOMER JOURNEY</h3>
              
              {!customerJourney && customerOptions.length === 0 ? (
                <div className="h-[360px] flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <User className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">Waiting for active customer events...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">CUSTOMER ID</span>
                    {customerOptions.length > 0 ? (
                      <select 
                        value={activeCustomerId} 
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="bg-white text-xs font-bold text-[#0071DC] font-mono border border-gray-250 rounded-xl px-2.5 py-1 focus:outline-none focus:border-[#0071DC]"
                      >
                        {customerOptions.map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-bold text-[#0071DC] font-mono">{activeCustomerId || 'CUST0000'}</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center space-y-2 overflow-y-auto max-h-[290px] py-2 pr-1">
                    {currentCustomerSteps.map((step: string, idx: number) => (
                      <div key={idx} className="flex flex-col items-center w-full">
                        <div className="bg-blue-50 border border-blue-200 text-[#0071DC] text-[10px] font-bold font-mono px-4 py-2 rounded-2xl text-center w-4/5 shadow-xs">
                          {step}
                        </div>
                        {idx < currentCustomerSteps.length - 1 && (
                          <span className="text-gray-400 text-lg leading-none py-1">↓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* LIVE ORDER JOURNEY */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#041E42] uppercase tracking-widest mb-4">LIVE ORDER JOURNEY</h3>
              
              {!orderJourney && orderOptions.length === 0 ? (
                <div className="h-[360px] flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <TrendingUp className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">Waiting for active order events...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">ORDER ID</span>
                    {orderOptions.length > 0 ? (
                      <select 
                        value={activeOrderId} 
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="bg-white text-xs font-bold text-emerald-600 font-mono border border-gray-250 rounded-xl px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                      >
                        {orderOptions.map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 font-mono">{activeOrderId || 'ORD0000'}</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center space-y-2 overflow-y-auto max-h-[290px] py-2 pr-1">
                    {currentOrderSteps.map((step: string, idx: number) => (
                      <div key={idx} className="flex flex-col items-center w-full">
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold font-mono px-4 py-2 rounded-2xl text-center w-4/5 shadow-xs">
                          {step}
                        </div>
                        {idx < currentOrderSteps.length - 1 && (
                          <span className="text-gray-400 text-lg leading-none py-1">↓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
