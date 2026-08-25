import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Lock, Mail, AlertCircle, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { login, error, isLoading, customer } = useSessionStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to /home immediately if already authenticated
  useEffect(() => {
    if (customer) {
      navigate(redirect ? `/${redirect}` : '/home');
    }
  }, [customer, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email || !password) {
      setValidationError('Please enter both email and password.');
      return;
    }

    const success = await login({ email, password });
    if (success) {
      navigate(redirect ? `/${redirect}` : '/home');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F7FC] via-[#EBF3FC] to-[#F7F8F9] flex flex-col justify-between text-[#041E42] relative overflow-hidden font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* Dynamic 3D Ambient Parallax Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FFC220]/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="bg-[#0071DC] backdrop-blur-md text-white py-4 px-6 shadow-xl relative z-10 border-b border-blue-400/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2.5 rounded-2xl shadow-lg font-black group-hover:rotate-12 transition-transform duration-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-2xl font-black tracking-tight drop-shadow-sm">NexDay</span>
              <span className="text-[10px] font-bold text-[#FFC220] tracking-widest uppercase">E-Commerce Experience</span>
            </div>
          </motion.div>

          <motion.button 
            whileHover={{ x: -4 }}
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-xs font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </motion.button>
        </div>
      </header>

      {/* MAIN 3D CINEMATIC CARD */}
      <main className="flex-grow flex items-center justify-center p-4 relative z-10 my-6">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4 }}
          className="bg-white/90 backdrop-blur-2xl max-w-md w-full p-8 md:p-10 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,113,220,0.18)] border border-white/80 space-y-6 relative overflow-hidden"
        >
          {/* Top Yellow Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFC220] via-yellow-400 to-[#FFC220]"></div>

          {/* Header Title with Floating Badge */}
          <div className="text-center space-y-3 relative">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-14 h-14 bg-gradient-to-tr from-[#0071DC] to-blue-500 rounded-3xl flex items-center justify-center mx-auto text-white shadow-lg shadow-blue-500/30 mb-3"
            >
              <ShieldCheck className="w-7 h-7" />
            </motion.div>
            <h2 className="text-3xl font-black tracking-tight text-[#041E42]">Welcome back</h2>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center justify-center space-x-1">
              <span>Sign in to continue shopping</span>
              <Sparkles className="w-3.5 h-3.5 text-[#FFC220]" />
            </p>
          </div>

          {/* Error Alert Box */}
          {(validationError || error) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50/90 backdrop-blur-md border border-red-200 p-4 rounded-2xl flex items-center space-x-3 text-xs text-red-800 font-semibold shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{validationError || error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative group">
                <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-[#0071DC] absolute left-4 top-3.5 transition-colors" />
                <input 
                  type="email" 
                  name="user_email_no_autofill"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address" 
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white rounded-2xl border border-gray-200 focus:border-[#0071DC] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider pl-1">Password</label>
              <div className="relative group">
                <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-[#0071DC] absolute left-4 top-3.5 transition-colors" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="user_pass_no_autofill"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password" 
                  autoComplete="new-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white rounded-2xl border border-gray-200 focus:border-[#0071DC] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-semibold shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-[#0071DC] pt-1">
              <label className="flex items-center space-x-2.5 cursor-pointer text-gray-600 font-semibold select-none">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4.5 h-4.5 rounded-lg text-[#0071DC] focus:ring-[#0071DC] border-gray-300 transition-colors"
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="hover:underline focus:outline-none">Forgot password?</button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, translateY: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#0071DC] to-[#005bb5] hover:from-[#005bb5] hover:to-[#0046BE] text-white py-4 rounded-2xl font-black text-xs tracking-wider uppercase shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>SIGN IN TO STORE</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </>
              )}
            </motion.button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase my-4">
            <span className="w-[42%] h-[1px] bg-gray-200"></span>
            <span>OR</span>
            <span className="w-[42%] h-[1px] bg-gray-200"></span>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            className="w-full border border-gray-200/80 hover:bg-gray-50/80 text-gray-700 py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <span>Continue with Google</span>
          </motion.button>

          <div className="text-center border-t border-gray-100 pt-4 text-xs font-semibold text-gray-500">
            <span>New to NexDay? </span>
            <button 
              onClick={() => navigate(redirect ? `/register?redirect=${redirect}` : '/register')} 
              className="font-bold text-[#0071DC] hover:underline focus:outline-none"
            >
              Create account
            </button>
          </div>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400 relative z-10 border-t border-gray-200/40 bg-white/50 backdrop-blur-md">
        NexDay Customer Experience &bull; Secure Authentication Portal
      </footer>
    </div>
  );
};
