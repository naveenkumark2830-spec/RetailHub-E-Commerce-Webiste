import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Zap, Clock, Truck, Gift, ArrowRight } from 'lucide-react';

export const NexDayPlusBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-[#0B2A55] text-white rounded-2xl p-4 sm:p-6 my-8 shadow-xl border border-blue-900/60 overflow-hidden relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        
        {/* LEFT BRAND & TAGLINE */}
        <div className="flex items-center space-x-3 text-center md:text-left">
          <div className="w-10 h-10 bg-[#FFC20A] rounded-xl flex items-center justify-center text-[#0B2A55] shrink-0 shadow-md">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <span className="text-base font-black tracking-tight">Nex<span className="text-[#FFC20A]">Day</span> Plus</span>
              <span className="text-blue-300">|</span>
              <span className="text-xs text-blue-100 font-semibold hidden sm:inline">More Savings. More Convenience. A Brighter Everyday.</span>
            </div>
            <p className="text-xs text-blue-200 font-medium mt-0.5 sm:hidden">More Savings. More Convenience.</p>
          </div>
        </div>

        {/* CENTER BENEFIT PILLS */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-blue-100">
          <div className="flex items-center space-x-1.5 bg-blue-900/50 px-3 py-1.5 rounded-full border border-blue-800/40">
            <Zap className="w-3.5 h-3.5 text-[#FFC20A]" />
            <span>Exclusive Deals</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-blue-900/50 px-3 py-1.5 rounded-full border border-blue-800/40">
            <Clock className="w-3.5 h-3.5 text-[#FFC20A]" />
            <span>Early Access</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-blue-900/50 px-3 py-1.5 rounded-full border border-blue-800/40">
            <Truck className="w-3.5 h-3.5 text-[#FFC20A]" />
            <span>Free Delivery</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-blue-900/50 px-3 py-1.5 rounded-full border border-blue-800/40 hidden lg:flex">
            <Gift className="w-3.5 h-3.5 text-[#FFC20A]" />
            <span>Partner Offers</span>
          </div>
        </div>

        {/* RIGHT JOIN NOW BUTTON */}
        <button
          onClick={() => navigate('/category/offers')}
          className="bg-[#FFC20A] hover:bg-[#E5AD00] text-[#0B2A55] px-6 py-2.5 rounded-full font-black text-xs transition-transform duration-200 hover:scale-105 shadow-md flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <span>Join Now</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>
    </div>
  );
};
