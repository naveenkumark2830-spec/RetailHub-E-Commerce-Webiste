import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Menu, X } from 'lucide-react';
import { CANONICAL_NAV_ITEMS } from '../config/sidebarConfig';
import { isRouteAllowed } from '../utils/rbac';

export const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [admin, setAdmin] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {}
    }
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  const permittedItems = CANONICAL_NAV_ITEMS.filter(item => 
    isRouteAllowed(admin?.role_id, item.path)
  );

  const activeItem = permittedItems.find(item => item.path === currentPath);

  const navContent = (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-3">
            OPERATIONS DESK
          </p>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {permittedItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPath === item.path;

            return (
              <button
                key={item.key}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wider cursor-pointer transition-all text-left min-h-[44px] ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#0875E1] font-black border-l-4 border-[#0875E1] rounded-l-none shadow-xs'
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
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar (< lg) */}
      <div className="lg:hidden w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-6 h-6 text-[#041E42]" />
          </button>
          <span className="text-xs font-black text-[#041E42] uppercase tracking-wider">
            {activeItem ? activeItem.name : 'Operations Desk'}
          </span>
        </div>
        <span className="text-[10px] font-extrabold text-[#0875E1] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
          {admin?.role_id || 'ADMIN'}
        </span>
      </div>

      {/* Mobile Drawer Overlay (< lg) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10">
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar (>= lg) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col justify-between flex-shrink-0 min-h-[calc(100vh-53px)] select-none">
        {navContent}
      </aside>
    </>
  );
};

export default AdminSidebar;
