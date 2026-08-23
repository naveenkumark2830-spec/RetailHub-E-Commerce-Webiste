import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Lock, Mail, User, Phone, Globe, Calendar, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { register, error, isLoading } = useSessionStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('English');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Front-end validations
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !country || !state || !city) {
      setValidationError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }

    if (!agreeTerms) {
      setValidationError('You must agree to the Terms and Conditions.');
      return;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password,
      date_of_birth: dob,
      gender,
      country,
      state,
      city,
      language,
    };

    const success = await register(payload);
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

      {/* REGISTRATION FORM */}
      <main className="flex-grow flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white max-w-2xl w-full p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-[#041E42]">Create Account</h2>
            <p className="text-sm text-gray-500 font-medium">Join NexDay and start shopping with premium benefits</p>
          </div>

          {/* Validation / Database Error Alerts */}
          {(validationError || error) && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center space-x-2 text-xs text-red-800 font-medium animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{validationError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            
            {/* Row 1: Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">First Name *</label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John" 
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Last Name *</label>
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe" 
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@email.com" 
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number *</label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210" 
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters" 
                    autoComplete="new-password"
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

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password" 
                    autoComplete="new-password"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Row 4: Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="date" 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Gender</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-gray-700 bg-white"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-Binary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Preferred Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-gray-700 bg-white"
                >
                  <option>English</option>
                  <option>Tamil (தமிழ்)</option>
                  <option>Kannada (ಕನ್ನಡ)</option>
                  <option>Hindi (हिन्दी)</option>
                </select>
              </div>
            </div>

            {/* Row 5: Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Country *</label>
                <div className="relative">
                  <Globe className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">State *</label>
                <input 
                  type="text" 
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">City *</label>
                <input 
                  type="text" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#0071DC] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Agreement T&C */}
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-600">
              <input 
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded text-[#0071DC] focus:ring-[#0071DC] border-gray-300 cursor-pointer"
              />
              <span>I agree to the Terms & Conditions</span>
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="btn-haptic w-full bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] py-4 rounded-full font-extrabold text-sm shadow-md transition-colors flex items-center justify-center"
            >
              <span>{isLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}</span>
            </motion.button>
          </form>

          <div className="text-center border-t pt-4 text-xs font-medium text-gray-500">
            <span>Already have an account? </span>
            <button 
              onClick={() => navigate(redirect ? `/login?redirect=${redirect}` : '/login')} 
              className="font-bold text-[#0071DC] hover:underline focus:outline-none"
            >
              Sign In here
            </button>
          </div>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        NexDay Registration &bull; Secure Portal
      </footer>
    </div>
  );
};
