import React from 'react';
import { Truck, ShieldCheck, RotateCcw, Headset, Award } from 'lucide-react';

export const TrustBar: React.FC = () => {
  const features = [
    {
      icon: Truck,
      title: 'Free Delivery',
      subtitle: 'on orders above ₹499',
      color: 'bg-blue-50 text-[#0875E1]'
    },
    {
      icon: ShieldCheck,
      title: 'Secure Payments',
      subtitle: '100% safe transactions',
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      icon: RotateCcw,
      title: 'Easy Returns',
      subtitle: 'Hassle free 7-day returns',
      color: 'bg-amber-50 text-amber-600'
    },
    {
      icon: Headset,
      title: '24/7 Customer Support',
      subtitle: "We're here to help",
      color: 'bg-[#0B2A55]/10 text-[#0B2A55]'
    },
    {
      icon: Award,
      title: 'NexDay Plus',
      subtitle: 'Exclusive member benefits',
      color: 'bg-purple-50 text-purple-600'
    }
  ];

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 sm:p-5 my-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {features.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
              <div className={`p-3 rounded-xl ${item.color} shrink-0`}>
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#172033] leading-tight">{item.title}</h4>
                <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
