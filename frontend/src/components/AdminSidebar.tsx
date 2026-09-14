import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';
import { CANONICAL_NAV_ITEMS } from '../config/sidebarConfig';
import { isRouteAllowed } from '../utils/rbac';

export const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {}
    }
  }, []);

  const permittedItems = CANONICAL_NAV_ITEMS.filter(item => 
    isRouteAllowed(admin?.role_id, item.path)
  );

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 min-h-[calc(100vh-53px)] select-none">
      <div className="p-4 space-y-4">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-3">
          OPERATIONS DESK
        </p>

        <nav className="space-y-1">
          {permittedItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPath === item.path && (
              item.key === 'simulator' ? currentPath === '/admin/simulator' :
              item.key === 'products' ? currentPath === '/admin/products' :
              item.key === 'categories' ? currentPath === '/admin/categories' :
              item.key === 'operators' ? currentPath === '/admin/operators' :
              item.key === 'inventory' ? currentPath === '/admin/inventory' :
              item.key === 'orders' ? currentPath === '/admin/orders' :
              item.key === 'customers' ? currentPath === '/admin/customers' :
              item.key === 'reviews' ? currentPath === '/admin/reviews' :
              item.key === 'coupons' ? currentPath === '/admin/coupons' :
              item.key === 'warehouses' ? currentPath === '/admin/warehouses' :
              false
            );

            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider cursor-pointer transition-all text-left ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#0875E1] font-black border-l-4 border-[#0875E1] rounded-l-none'
                    : 'text-[#475569] hover:text-[#0875E1] hover:bg-gray-50'
                }`}
              >
                <IconComponent className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Card Footer */}
      <div className="p-3.5 border-t border-gray-200 bg-gray-50/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#0071DC] font-bold text-xs border border-blue-200 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-xs font-bold text-[#041E42] truncate">
              {admin?.first_name ? `${admin.first_name} ${admin.last_name || ''}` : 'Admin Operator'}
            </p>
            <span className="text-[9px] font-bold text-[#041E42] uppercase tracking-wide bg-[#FFC220] px-2 py-0.5 rounded-full inline-block mt-0.5">
              {admin?.role_id || 'SUPER_ADMIN'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
