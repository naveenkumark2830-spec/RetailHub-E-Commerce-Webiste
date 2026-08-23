import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  User, 
  LogOut, 
  LayoutDashboard, 
  ShoppingBag, 
  Warehouse, 
  TrendingUp, 
  Activity, 
  Cpu, 
  Settings,
  AlertOctagon,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Trash2,
  Users
} from 'lucide-react';

interface AdminUser {
  admin_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
}

export default function AdminDashboardPlaceholder() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // List of administrative users
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  // Form states for creating new admin users
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('PRODUCT_MANAGER');
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const fetchAdminUsers = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/auth/users', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error('Failed to load admin users:', err);
    }
  };

  useEffect(() => {
    // 1. Guard route: redirect if not logged in
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    const permsData = localStorage.getItem('adminPermissions');

    if (!token || !adminData || !permsData) {
      localStorage.clear();
      navigate('/admin/login');
      return;
    }

    setAdmin(JSON.parse(adminData));
    setPermissions(JSON.parse(permsData));
    setLoading(false);
    
    // Fetch all admin users list
    fetchAdminUsers();
  }, [navigate]);

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': token }
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }

    localStorage.clear();
    navigate('/admin/login');
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');

    const token = localStorage.getItem('adminToken');
    if (!token) {
      setFormError('Authentication session missing.');
      return;
    }

    if (!newFirstName || !newLastName || !newEmail || !newPassword || !newRole) {
      setFormError('Please fill in all user profile fields.');
      return;
    }

    try {
      setFormLoading(true);
      const res = await fetch('/api/admin/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          firstName: newFirstName,
          lastName: newLastName,
          email: newEmail,
          password: newPassword,
          roleId: newRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admin user.');
      }

      setFormSuccess(`Admin profile created: ${data.admin.admin_id} (${data.admin.first_name})`);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('PRODUCT_MANAGER');
      
      // Reload admin list
      fetchAdminUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAdmin = async (targetId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    
    if (!window.confirm('Are you sure you want to permanently delete this administrator profile?')) {
      return;
    }

    try {
      setFormSuccess('');
      setFormError('');
      const res = await fetch(`/api/admin/auth/users/${targetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete administrator account.');
      }

      setFormSuccess('Administrator profile deleted successfully.');
      fetchAdminUsers();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans">
      
      {/* PERSISTENT HEADER NAVBAR */}
      <header className="bg-[#0071DC] text-white shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-black tracking-tight">NexDay</span>
            <span className="text-[9px] font-bold tracking-widest text-[#FFC220] uppercase font-mono pl-0.5">Admin Portal</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center space-x-1.5 text-xs font-bold bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Customer View</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 text-xs font-bold border border-white/20 bg-blue-900/30 hover:bg-blue-900/50 text-white px-4 py-2 rounded-full shadow-sm transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-white border-r border-gray-250 flex flex-col justify-between flex-shrink-0">
          <div className="p-4 space-y-6">
            {/* Nav Title */}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-3">OPERATIONS DESK</p>

            {/* Nav Items */}
            <nav className="space-y-1">
              {[
                { name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Products', icon: <ShoppingBag className="w-4 h-4" /> },
                { name: 'Inventory', icon: <Warehouse className="w-4 h-4" /> },
                { name: 'Orders', icon: <TrendingUp className="w-4 h-4" /> },
                { name: 'Event Monitor', icon: <Activity className="w-4 h-4" /> },
                { name: 'Simulator', icon: <Cpu className="w-4 h-4" /> },
                { name: 'System Monitor', icon: <Settings className="w-4 h-4" /> }
              ].map((item, idx) => (
                <div
                  key={item.name}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    idx === 0
                      ? 'bg-blue-50 text-[#0071DC] border-l-4 border-[#0071DC] rounded-l-none'
                      : 'text-gray-600 hover:text-[#0071DC] hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              ))}
            </nav>
          </div>

          {/* User Card in Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-inner">
                <User className="w-5 h-5 text-[#0071DC]" />
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-bold text-[#041E42] truncate">{admin.first_name} {admin.last_name}</p>
                <span className="text-[9px] font-bold text-[#041E42] uppercase tracking-wide bg-[#FFC220] px-2.5 py-0.5 rounded-full">
                  {admin.role_id}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className="flex-grow p-8 space-y-8 overflow-y-auto">
          
          {/* Status Alert Banners */}
          {formSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3 text-green-700 text-xs">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Row 1: Status & Create User Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* STATUS CONTAINER */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-3xl p-8 space-y-6 shadow-md relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 border border-blue-100 w-14 h-14 rounded-full flex items-center justify-center text-[#0071DC] shadow-inner">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#041E42] uppercase tracking-tight">Redirection Successful</h2>
                  <p className="text-xs font-bold text-[#0071DC] uppercase tracking-wider mt-0.5">Console Access Authenticated</p>
                </div>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed">
                You are currently active as a <span className="text-[#0071DC] font-black">{admin.role_id}</span> operations officer. Role permissions have been populated from the database.
              </p>

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-2.5">
                  <AlertOctagon className="w-4.5 h-4.5 text-[#0071DC]" />
                  <span>Authorized Role Permissions</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-[9px] font-mono font-bold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-lg shadow-sm"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center pt-2">
                Operational status: MySQL Online ● Telemetry Event Sync Active
              </div>
            </motion.div>

            {/* CREATE ADMIN USERS FORM */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-3xl p-8 space-y-6 shadow-md relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0071DC]"></div>

              <div className="flex items-center space-x-3.5">
                <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center text-[#0071DC]">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#041E42] uppercase tracking-tight">Create Admin User Account</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Configure new operational roles</p>
                </div>
              </div>

              {/* Only Super Admins see the registry form */}
              {admin.role_id === 'SUPER_ADMIN' ? (
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="manager@retailhub.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                        <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                        <option value="ORDER_MANAGER">ORDER_MANAGER</option>
                        <option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option>
                        <option value="REVIEW_MANAGER">REVIEW_MANAGER</option>
                        <option value="ANALYST">ANALYST</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-blue-300 text-white font-bold py-2.5 rounded-full transition-all uppercase tracking-wider text-[10px]"
                  >
                    {formLoading ? 'Registering Operator...' : 'Create Operator Account'}
                  </button>
                </form>
              ) : (
                <div className="text-gray-500 text-xs font-semibold text-center p-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  Only Super Administrators can create operational staff profiles.
                </div>
              )}
            </motion.div>
          </div>

          {/* Row 2: Manage Admin Users List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-3xl p-8 shadow-md relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0071DC]"></div>

            <div className="flex items-center space-x-3.5 mb-6 border-b border-gray-150 pb-4">
              <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center text-[#0071DC]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#041E42] uppercase tracking-tight">Active Platform Administrators</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered administrative staff registry</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-250 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Admin ID</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Assigned Role</th>
                    <th className="pb-3">Status</th>
                    {admin.role_id === 'SUPER_ADMIN' && <th className="pb-3 text-right pr-2">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {adminUsers.map((user) => {
                    const isSelf = user.admin_id === admin.admin_id;
                    const isPrimary = user.admin_id === 'ADM001';
                    
                    return (
                      <tr key={user.admin_id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 pl-2 font-mono font-bold text-gray-500">{user.admin_id}</td>
                        <td className="py-3.5 text-[#041E42] font-semibold">{user.first_name} {user.last_name} {isSelf && <span className="text-[9px] font-bold bg-blue-100 text-[#0071DC] px-2 py-0.5 rounded-full ml-1.5 uppercase">You</span>}</td>
                        <td className="py-3.5 text-gray-650">{user.email}</td>
                        <td className="py-3.5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            user.role_id === 'SUPER_ADMIN' ? 'bg-[#FFC220] text-[#041E42]' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.role_id}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            {user.status}
                          </span>
                        </td>
                        {admin.role_id === 'SUPER_ADMIN' && (
                          <td className="py-3.5 text-right pr-2">
                            <button
                              disabled={isSelf || isPrimary}
                              onClick={() => handleDeleteAdmin(user.admin_id)}
                              className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed p-1.5 rounded-full hover:bg-red-50 disabled:hover:bg-transparent transition-all"
                              title={isSelf ? "You cannot delete yourself" : isPrimary ? "Primary system administrator cannot be deleted" : "Delete administrative operator"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {adminUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-gray-500 font-semibold uppercase tracking-wider">
                        No administrators found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

        </main>
      </div>
    </div>
  );
}
