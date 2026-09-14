import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, User, Phone, Globe, Calendar, AlertCircle, Eye, EyeOff, Shield, Package, Heart, Zap, MessageSquare, UserPlus } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

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
  const [state, setState] = useState('Karnataka');
  const [city, setCity] = useState('Bengaluru');
  const [language, setLanguage] = useState('English');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Front-end validations
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
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
      setValidationError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || '+91 98765 43210',
      password,
      date_of_birth: dob || '1998-01-01',
      gender: gender || 'Male',
      country: country || 'India',
      state: state || 'Karnataka',
      city: city || 'Bengaluru',
      language: language || 'English',
    };

    const success = await register(payload);
    if (success) {
      navigate(redirect ? `/${redirect}` : '/home');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between text-[#172033] font-sans">
      
      {/* HEADER */}
      <Header />

      {/* MAIN CONTAINER (2-COLUMN SPLIT MATCHING REFERENCE IMAGE RIGHT SIDE) */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white max-w-5xl w-full rounded-3xl shadow-xl border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]"
        >
          
          {/* LEFT PROMO COLUMN (SOFT LIGHT MINT GREEN BACKGROUND) */}
          <div className="md:col-span-5 bg-[#E6F7F2] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-emerald-100">
            
            <div className="space-y-6 z-10">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
                  Join NexDay Today!
                </h1>
                <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                  Create your account and unlock a better shopping experience
                </p>
              </div>

              {/* Feature List with Mint Green Check Badges */}
              <div className="space-y-3.5 pt-2 text-xs font-extrabold text-[#172033]">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span>Exclusive Member Offers</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <span>Track Orders in Real-Time</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Heart className="w-4 h-4 text-emerald-200" />
                  </div>
                  <span>Save Favorites &amp; Wishlists</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Zap className="w-4 h-4 text-[#FFC20A]" />
                  </div>
                  <span>Faster Checkout</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span>Personalized Recommendations</span>
                </div>
              </div>
            </div>

            {/* Bottom Stacked Delivery Boxes Image & Script Overlay */}
            <div className="pt-6 relative z-10 flex flex-col items-center">
              <div className="relative w-full max-w-[240px]">
                <img
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80"
                  alt="NexDay Delivery Boxes"
                  className="w-full h-40 object-cover rounded-2xl shadow-md border-2 border-white"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-2xl flex items-end p-3">
                  <p className="font-serif italic text-white text-sm font-bold drop-shadow">
                    Shop More, Live Better &hearts;
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT CREATE ACCOUNT FORM COLUMN */}
          <div className="md:col-span-7 bg-white p-8 sm:p-10 flex flex-col justify-between space-y-5">
            
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[#172033] tracking-tight">Create Your Account</h2>
                <p className="text-xs font-semibold text-gray-500">Join thousands of happy customers</p>
              </div>

              {/* Validation / Database Error Alerts */}
              {(validationError || error) && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center space-x-2.5 text-xs text-red-800 font-semibold"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{validationError || error}</span>
                </motion.div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
                
                {/* Row 1: First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-extrabold text-[#172033]">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input 
                        type="text" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter first name" 
                        className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 focus:border-[#0875E1] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs font-semibold text-[#172033]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-extrabold text-[#172033]">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input 
                        type="text" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter last name" 
                        className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 focus:border-[#0875E1] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs font-semibold text-[#172033]"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Email Address */}
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-[#172033]">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address" 
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 focus:border-[#0875E1] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs font-semibold text-[#172033]"
                    />
                  </div>
                </div>

                {/* Row 3: Phone Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-[#172033]">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210" 
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 focus:border-[#0875E1] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs font-semibold text-[#172033]"
                    />
                  </div>
                </div>

                {/* Row 4: Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-extrabold text-[#172033]">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password" 
                        className="w-full pl-9 pr-9 py-2 bg-white rounded-xl border border-gray-200 focus:border-[#0875E1] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs font-semibold text-[#172033]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-extrabold text-[#172033]">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password" 
                        className="w-full pl-9 pr-9 py-2 bg-white rounded-xl border border-gray-200 focus:border-[#0875E1] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs font-semibold text-[#172033]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Optional Details (Location & Demographics) */}
                <details className="text-xs font-bold text-gray-500 cursor-pointer pt-1 group">
                  <summary className="hover:text-[#0875E1] transition-colors py-1 select-none flex items-center justify-between border-t border-gray-100">
                    <span>Optional Address &amp; Demographics</span>
                    <span className="text-[10px] text-blue-600 font-extrabold group-open:rotate-180 transition-transform">&blackdowntriangle;</span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-[#172033] uppercase mb-1">Date of Birth</label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                        <input 
                          type="date" 
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 focus:border-[#0875E1] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#172033] uppercase mb-1">Gender</label>
                      <select 
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 focus:border-[#0875E1] outline-none bg-white"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Non-Binary</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#172033] uppercase mb-1">Language</label>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 focus:border-[#0875E1] outline-none bg-white"
                      >
                        <option>English</option>
                        <option>Tamil</option>
                        <option>Kannada</option>
                        <option>Hindi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#172033] uppercase mb-1">Country</label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                        <input 
                          type="text" 
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="India" 
                          className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 focus:border-[#0875E1] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#172033] uppercase mb-1">State</label>
                      <input 
                        type="text" 
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="Karnataka" 
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 focus:border-[#0875E1] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-[#172033] uppercase mb-1">City</label>
                      <input 
                        type="text" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bengaluru" 
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 focus:border-[#0875E1] outline-none"
                      />
                    </div>
                  </div>
                </details>

                {/* Agreement Checkbox */}
                <div className="flex items-center space-x-2 text-xs font-semibold text-gray-600 pt-1">
                  <input 
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0875E1] focus:ring-[#0875E1] border-gray-300 cursor-pointer"
                  />
                  <span>
                    I agree to the <button type="button" onClick={() => navigate('/help')} className="text-[#0875E1] hover:underline font-bold">Terms of Service</button> and <button type="button" onClick={() => navigate('/help')} className="text-[#0875E1] hover:underline font-bold">Privacy Policy</button>
                  </span>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0875E1] hover:bg-[#065eb8] text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative flex py-0.5 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-extrabold text-gray-400 uppercase">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Social Registration Buttons Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => handleSubmit({ preventDefault: () => {} } as any)} 
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign up with Google</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => handleSubmit({ preventDefault: () => {} } as any)} 
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.16-.55 2.82-1.36z"/>
                  </svg>
                  <span>Sign up with Apple</span>
                </button>
              </div>
            </div>

            {/* Bottom Account Switch Link */}
            <div className="pt-3 border-t border-gray-100 text-center text-xs font-semibold text-gray-500">
              <span>Already have an account? </span>
              <button 
                type="button"
                onClick={() => navigate(redirect ? `/login?redirect=${redirect}` : '/login')} 
                className="font-extrabold text-[#0875E1] hover:underline"
              >
                Login here
              </button>
            </div>

          </div>

        </motion.div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};

