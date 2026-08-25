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
  Sparkles,
  Zap
} from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
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
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#041E42] to-[#002868] text-white flex flex-col justify-between font-sans selection:bg-[#FFC220] selection:text-[#041E42] relative overflow-hidden">
      
      {/* 3D Ambient Glowing Background Parallax Particles */}
      <div className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[600px] h-[600px] bg-[#FFC220]/20 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      {/* PERSISTENT HEADER NAVBAR */}
      <header className="bg-white/10 backdrop-blur-xl border-b border-white/10 shadow-2xl px-6 py-4 flex items-center justify-between relative z-10">
        <motion.div 
          whileHover={{ scale: 1.03 }}
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="bg-[#FFC220] text-[#041E42] p-2.5 rounded-2xl shadow-lg font-black">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-black tracking-tight text-white drop-shadow-md">NexDay</span>
            <span className="text-[10px] font-bold tracking-widest text-[#FFC220] uppercase font-mono">Operations Portal</span>
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/home')}
          className="flex items-center space-x-2 text-xs font-bold bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-5 py-2.5 rounded-full shadow-lg transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Go to Customer View</span>
        </motion.button>
      </header>

      {/* 3D CINEMATIC LOGIN CARD */}
      <main className="flex-grow flex items-center justify-center p-6 relative z-10 my-6">
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4 }}
          className="max-w-md w-full bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] p-8 md:p-10 space-y-6 shadow-[0_30px_70px_rgba(0,0,0,0.35)] relative overflow-hidden text-[#041E42]"
        >
          {/* Top Yellow Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFC220] via-yellow-400 to-[#FFC220]"></div>

          {/* Heading */}
          <div className="text-center space-y-3 relative">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="bg-gradient-to-tr from-[#0071DC] to-blue-600 text-white w-14 h-14 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 mb-3"
            >
              <Shield className="w-7 h-7" />
            </motion.div>
            <h2 className="text-2xl font-black tracking-tight text-[#041E42] uppercase flex items-center justify-center space-x-2">
              <span>Admin Sign In</span>
              <Zap className="w-4 h-4 text-[#FFC220]" />
            </h2>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center space-x-1">
              <span>Operations & Management Portal</span>
              <Sparkles className="w-3.5 h-3.5 text-[#0071DC]" />
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50/90 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700 text-xs font-semibold leading-relaxed shadow-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

  {/* Login Form */}
          <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-5">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  name="admin_email_no_autofill"
                  required
                  placeholder="Enter admin email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full bg-gray-50/80 hover:bg-gray-100/80 text-[#041E42] placeholder-gray-400 pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-semibold text-sm shadow-inner"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#0071DC] transition-colors" />
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
              <div className="relative group">
                <input
                  type="password"
                  name="admin_pass_no_autofill"
                  required
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-gray-50/80 hover:bg-gray-100/80 text-[#041E42] placeholder-gray-400 pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-semibold text-sm shadow-inner"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#0071DC] transition-colors" />
              </div>
            </div>

            {/* Remember Me Checklist */}
            <div className="flex items-center space-x-2 pt-1 pl-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded-lg border-gray-300 bg-gray-50 text-[#0071DC] focus:ring-0 cursor-pointer w-4.5 h-4.5"
              />
              <label htmlFor="remember" className="text-xs font-bold text-gray-500 cursor-pointer select-none">
                Remember this device
              </label>
            </div>

            {/* Submit CTA */}
            <motion.button
              whileHover={{ scale: 1.02, translateY: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#0071DC] to-[#0046BE] hover:from-[#005bb5] hover:to-[#0038a8] disabled:bg-blue-300 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/25 uppercase tracking-wider text-xs cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In Operations</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="px-6 py-4 flex flex-col md:flex-row items-center justify-between border-t border-white/10 text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-black/20 backdrop-blur-xl relative z-10">
        <span>© 2026 NexDay Operations Portal. All rights reserved.</span>
        <div className="flex items-center space-x-4 mt-2 md:mt-0">
          <span className="cursor-pointer hover:text-[#FFC220] transition-colors">Privacy Policy</span>
          <span className="cursor-pointer hover:text-[#FFC220] transition-colors">Terms of Service</span>
          <span className="cursor-pointer hover:text-[#FFC220] transition-colors">Support Desk</span>
        </div>
      </footer>
    </div>
  );
}
