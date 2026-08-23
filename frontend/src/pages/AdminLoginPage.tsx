import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  ShoppingBag
} from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

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
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col justify-between font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* PERSISTENT HEADER NAVBAR */}
      <header className="bg-[#0071DC] text-white shadow-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-black tracking-tight">NexDay</span>
            <span className="text-[9px] font-bold tracking-widest text-[#FFC220] uppercase font-mono pl-0.5">Admin Portal</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/home')}
          className="flex items-center space-x-1.5 text-xs font-bold bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-4 py-2 rounded-full shadow-sm transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Go to Customer View</span>
        </button>
      </header>

      {/* LOGIN CARD */}
      <main className="flex-grow flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white border border-gray-200/80 rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden"
        >
          {/* Top Decorative Border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <div className="bg-blue-50 border border-blue-150 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-[#0071DC] shadow-inner mb-2">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-[#041E42] uppercase">Admin Sign In</h2>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Operations & Management Portal</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700 text-xs leading-relaxed animate-shake">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@retailhub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-[#041E42] placeholder-gray-400 pl-10 pr-4 py-3 rounded-2xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-sm shadow-sm"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  className="text-[10px] font-bold text-[#0071DC] hover:underline transition-all"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-[#041E42] placeholder-gray-400 pl-10 pr-4 py-3 rounded-2xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-sm shadow-sm"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Remember Me Checklist */}
            <div className="flex items-center space-x-2 pt-1 pl-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded-md border-gray-300 bg-gray-50 text-[#0071DC] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4.5 h-4.5"
              />
              <label htmlFor="remember" className="text-xs font-bold text-gray-500 cursor-pointer select-none">
                Remember this device
              </label>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-blue-300 text-white font-black py-3.5 rounded-full transition-all shadow-md hover:shadow-lg uppercase tracking-wider text-xs"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In Operations</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="px-6 py-4 flex flex-col md:flex-row items-center justify-between border-t border-gray-200 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-white">
        <span>© 2026 NexDay Operations Portal. All rights reserved.</span>
        <div className="flex items-center space-x-4 mt-2 md:mt-0">
          <span className="cursor-pointer hover:text-[#0071DC] transition-colors">Privacy Policy</span>
          <span className="cursor-pointer hover:text-[#0071DC] transition-colors">Terms of Service</span>
          <span className="cursor-pointer hover:text-[#0071DC] transition-colors">Support Desk</span>
        </div>
      </footer>
    </div>
  );
}
