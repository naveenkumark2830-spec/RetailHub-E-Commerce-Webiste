import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  ShoppingBag,
  Eye,
  EyeOff,
  HelpCircle,
  Home,
  Package,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  Clock,
  ShieldCheck,
  Search
} from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  useEffect(() => {
    // If admin is already logged in, redirect to dashboard
    const token = localStorage.getItem('adminToken');
    if (token) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Store auth session
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
      localStorage.setItem('adminPermissions', JSON.stringify(data.permissions));
      
      // Redirect to Dashboard
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4FA] flex flex-col justify-between font-sans text-[#0F172A]">
      
      {/* 1. TOP HEADER BAR */}
      <header className="bg-[#0071DC] text-white px-6 py-3 shadow-md flex items-center justify-between space-x-4">
        {/* Brand Logo */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center cursor-pointer flex-shrink-0"
        >
          <img 
            src="/nexday-logo.png" 
            alt="NexDay™ - Brand New Day. Brand New Products." 
            className="h-10 w-auto object-contain bg-white rounded-xl px-2.5 py-1 shadow-sm hover:scale-105 transition-transform duration-200" 
          />
        </div>

        {/* Center Search Bar */}
        <div className="hidden md:flex items-center max-w-lg w-full bg-white rounded-xl overflow-hidden shadow-inner border border-blue-400/30">
          <input
            type="text"
            placeholder="Search for products, brands and more..."
            className="w-full px-4 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none"
          />
          <button className="bg-[#FFC20A] text-[#041E42] px-4 py-2 hover:bg-yellow-400 transition-colors flex items-center justify-center font-bold">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Right Header Navigation Links */}
        <div className="flex items-center space-x-5 text-xs font-semibold">
          <button 
            onClick={() => navigate('/help')}
            className="flex items-center space-x-1.5 hover:text-[#FFC20A] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-blue-200" />
            <span>Help</span>
          </button>

          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-1.5 hover:text-[#FFC20A] transition-colors"
          >
            <Home className="w-4 h-4 text-blue-200" />
            <span>Go to Store</span>
          </button>

          <div className="bg-[#0046BE]/70 border border-blue-300/40 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 text-white font-bold">
            <Lock className="w-3.5 h-3.5 text-[#FFC20A]" />
            <span>Admin Login</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT SCREEN SECTION */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-8 items-center">
        
        {/* LEFT COLUMN: HERO GRAPHIC & OVERVIEW */}
        <div className="lg:col-span-7 relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0038A8] via-[#0058C6] to-[#0071DC] p-8 lg:p-12 text-white shadow-2xl min-h-[540px] flex flex-col justify-between border border-blue-400/20">
          {/* Background Warehouse / Dashboard Parallax Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay" 
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#002B82] via-transparent to-transparent opacity-80"></div>

          {/* Top Brand Badge */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-[#FFC20A] text-[#041E42] p-2.5 rounded-2xl shadow-md">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-md">
                NexDay <br />
                <span className="text-blue-100">Admin Portal</span>
              </h1>
            </div>

            <div className="w-12 h-1 bg-[#FFC20A] rounded-full"></div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white tracking-wide">
                Manage. Monitor. Grow.
              </h2>
              <p className="text-blue-100 text-xs font-medium max-w-md leading-relaxed">
                Access the NexDay admin dashboard to manage products, orders, customers, inventory, and more.
              </p>
            </div>
          </div>

          {/* Feature List Items */}
          <div className="relative z-10 my-6 space-y-3.5">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-200 flex-shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Product Management</h3>
                <p className="text-[11px] text-blue-100 font-medium">Add, update and manage products</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-200 flex-shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Order Management</h3>
                <p className="text-[11px] text-blue-100 font-medium">Track and manage customer orders</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-200 flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Customer Management</h3>
                <p className="text-[11px] text-blue-100 font-medium">View and support customers</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-200 flex-shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Analytics & Reports</h3>
                <p className="text-[11px] text-blue-100 font-medium">Real-time insights and business metrics</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-200 flex-shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">System Settings</h3>
                <p className="text-[11px] text-blue-100 font-medium">Manage categories, offers and configurations</p>
              </div>
            </div>
          </div>

          {/* Bottom Cursive Script Tagline */}
          <div className="relative z-10 pt-4 border-t border-white/10">
            <p className="font-serif italic text-lg lg:text-xl font-medium text-[#FFC20A] tracking-wide">
              Powering a Better Shopping Experience
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM CARD */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100/80 max-w-md w-full space-y-6"
          >
            {/* Header Shield Badge */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-[#0875E1] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md mb-3">
                <Shield className="w-7 h-7 fill-white/20" />
              </div>
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
                Admin Login
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Access your NexDay admin dashboard
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700 text-xs font-semibold">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="admin@nexday.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#0875E1] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-xs font-semibold text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#0875E1] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="flex items-center space-x-2 cursor-pointer text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-[#0875E1] focus:ring-0 w-4 h-4"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setError('Password reset instructions have been sent to system administrator.')}
                  className="text-[#0875E1] hover:underline font-bold"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Login to Admin Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider OR */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full"></div>
              <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase">OR</span>
              <div className="border-t border-gray-200 w-full"></div>
            </div>

            {/* Restricted Access Box */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-start space-x-3 text-xs text-[#1E3A8A]">
              <ShieldCheck className="w-5 h-5 text-[#0875E1] flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="font-bold text-[#0F172A]">Restricted Access</h4>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  This portal is for authorized personnel only. All login attempts are monitored and logged.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* 3. BOTTOM FOOTER BAR */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-600">
        
        {/* 3 Assurance Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full md:w-auto">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-[#0F172A] text-xs">Secure Access</h5>
              <p className="text-[11px] text-gray-400">Your data is safe with us</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-[#0F172A] text-xs">Authorized Personnel Only</h5>
              <p className="text-[11px] text-gray-400">Restricted admin access</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0875E1] flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-[#0F172A] text-xs">24/7 Monitoring</h5>
              <p className="text-[11px] text-gray-400">All activities are logged</p>
            </div>
          </div>
        </div>

        {/* Right Footer Brand */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
        >
          <div className="bg-[#FFC20A] text-[#041E42] w-7 h-7 rounded-lg flex items-center justify-center shadow-xs font-black">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black tracking-tight text-[#0F172A]">NexDay</span>
            <span className="text-[9px] text-gray-400 font-semibold">Shop More, Live Better</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
