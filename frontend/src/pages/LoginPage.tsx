import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { login, error, isLoading, customer } = useSessionStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42]">
      {/* HEADER */}
      <header className="bg-[#0071DC] text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">NexDay</span>
          </div>

          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Landing</span>
          </button>
        </div>
      </header>

      {/* LOGIN CARD */}
      <main className="flex-grow flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-[#041E42]">Welcome back</h2>
            <p className="text-sm text-gray-500 font-medium">Sign in to continue shopping</p>
          </div>

          {/* Validation / Database Error Alerts */}
          {(validationError || error) && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center space-x-2 text-xs text-red-800 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{validationError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                <input 
                  type="email" 
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com" 
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-[#0071DC]">
              <label className="flex items-center space-x-2 cursor-pointer text-gray-600 font-medium">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0071DC] focus:ring-[#0071DC] border-gray-300"
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="hover:underline focus:outline-none">Forgot password?</button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="btn-haptic w-full bg-[#0071DC] hover:bg-[#0046BE] text-white py-3.5 rounded-full font-extrabold text-sm shadow-md transition-colors flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Signing In...' : 'SIGN IN'}</span>
            </motion.button>
          </form>

          <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase my-4">
            <span className="w-[42%] h-[1px] bg-gray-200"></span>
            <span>OR</span>
            <span className="w-[42%] h-[1px] bg-gray-200"></span>
          </div>

          <button 
            type="button"
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-full font-bold text-xs flex items-center justify-center space-x-2 focus:outline-none transition-colors"
          >
            <span>Continue with Google</span>
          </button>

          <div className="text-center border-t pt-4 text-xs font-medium text-gray-500">
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

      <footer className="py-4 text-center text-xs text-gray-400">
        NexDay Authentication &bull; Secure Portal
      </footer>
    </div>
  );
};
