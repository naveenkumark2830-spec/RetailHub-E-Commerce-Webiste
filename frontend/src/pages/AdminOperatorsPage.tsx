import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  ShoppingBag, 
  Warehouse, 
  TrendingUp, 
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  UserPlus,
  FolderOpen,
  Eye,
  Layers,
  Cpu
} from 'lucide-react';

interface Operator {
  admin_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
  category_access: string;
  status: string;
  created_at: string;
}

const CATEGORIES = [
  { id: 'CAT001', name: 'Electronics' },
  { id: 'CAT002', name: 'Fashion' },
  { id: 'CAT003', name: 'Home & Kitchen' },
  { id: 'CAT004', name: 'Grocery & Gourmet' },
  { id: 'CAT005', name: 'Beauty & Personal Care' },
  { id: 'CAT006', name: 'Sports & Outdoors' },
  { id: 'CAT007', name: 'Books' },
  { id: 'CAT008', name: 'Toys & Games' },
  { id: 'CAT009', name: 'Automotive' },
  { id: 'CAT010', name: 'Computers & Accessories' },
  { id: 'CAT011', name: 'Mobile & Tablets' },
  { id: 'CAT012', name: 'Home Appliances' },
  { id: 'CAT013', name: 'Kitchen & Dining' },
  { id: 'CAT014', name: 'Office Stationery' },
  { id: 'CAT015', name: 'Health & Wellness' },
  { id: 'CAT016', name: 'Baby Care' },
  { id: 'CAT017', name: 'Pet Supplies' },
  { id: 'CAT018', name: 'Shoes & Footwear' }
];

const ROLES = [
  { id: 'SUPER_ADMIN', name: 'Super Administrator' },
  { id: 'PRODUCT_MANAGER', name: 'Product Manager' },
  { id: 'INVENTORY_MANAGER', name: 'Inventory Manager' },
  { id: 'ORDER_MANAGER', name: 'Order Manager' },
  { id: 'CUSTOMER_SUPPORT', name: 'Customer Support Specialist' },
  { id: 'REVIEW_MANAGER', name: 'Review Manager' },
  { id: 'ANALYST', name: 'Data Analyst' }
];

export default function AdminOperatorsPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('PRODUCT_MANAGER');
  const [accessType, setAccessType] = useState<string>('ALL'); // 'ALL' or 'RESTRICTED'
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const fetchOperators = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/auth/users', {
        headers: { 'Authorization': token }
      });
      
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load operators catalog.');
      }
      setOperators(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    const permsData = localStorage.getItem('adminPermissions');

    if (!token || !adminData || !permsData) {
      localStorage.clear();
      navigate('/admin/login');
      return;
    }

    setAdmin(JSON.parse(adminData));
    fetchOperators();
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

  const handleOpenAddModal = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRoleId('PRODUCT_MANAGER');
    setAccessType('ALL');
    setSelectedCategories([]);
    setFormError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleCategoryCheckboxChange = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    const token = localStorage.getItem('adminToken');
    if (!token) return;

    if (!firstName || !lastName || !email || !password || !roleId) {
      setFormError('Please fill in all operator profile fields.');
      return;
    }

    // Determine category access value
    let categoryAccess = 'ALL';
    if (accessType === 'RESTRICTED') {
      if (selectedCategories.length === 0) {
        setFormError('Please select at least one restricted category.');
        return;
      }
      categoryAccess = selectedCategories.join(',');
    }

    const payload = {
      firstName,
      lastName,
      email,
      password,
      roleId,
      categoryAccess
    };

    try {
      setFormLoading(true);
      const res = await fetch('/api/admin/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register operator.');
      }

      setSuccess(`Operator profile registered successfully: ${data.admin.admin_id}`);
      setIsModalOpen(false);
      fetchOperators();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteOperator = async (operatorId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    if (operatorId === admin.admin_id) {
      alert('Self-deletion is blocked. You cannot delete your own administrative session account.');
      return;
    }

    if (operatorId === 'ADM001') {
      alert('Primary admin deletion is blocked. The root ADM001 profile cannot be deleted.');
      return;
    }

    if (!window.confirm('Are you sure you want to permanently delete this administrator operator profile?')) {
      return;
    }

    try {
      setSuccess('');
      setError('');
      const res = await fetch(`/api/admin/auth/users/${operatorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete administrator account.');
      }
      setSuccess('Operator profile deleted successfully.');
      fetchOperators();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getCategoryAccessLabel = (accessStr: string) => {
    if (!accessStr || accessStr === 'ALL') {
      return <span className="text-[#0071DC] font-bold">ALL Categories</span>;
    }
    const ids = accessStr.split(',');
    const names = ids.map(id => {
      const match = CATEGORIES.find(c => c.id === id);
      return match ? match.name : id;
    });
    return <span className="text-gray-600 font-semibold">{names.join(', ')}</span>;
  };

  const isSuperAdmin = admin?.role_id === 'SUPER_ADMIN';

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-[#F7F8F9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col font-sans selection:bg-[#FFC220] selection:text-[#041E42]">
      
      {/* HEADER NAVBAR */}
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
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-3">OPERATIONS DESK</p>

            <nav className="space-y-1">
              {[
                { name: 'Simulator', icon: <Cpu className="w-4 h-4" />, path: '/admin/simulator' },
                { name: 'Products', icon: <ShoppingBag className="w-4 h-4" />, path: '/admin/products' },
                { name: 'Categories', icon: <FolderOpen className="w-4 h-4" />, path: '/admin/categories' },
                { name: 'Operators', icon: <User className="w-4 h-4" />, path: '/admin/operators' },
                { name: 'Inventory', icon: <Warehouse className="w-4 h-4" />, path: '/admin/inventory' },
                { name: 'Orders', icon: <TrendingUp className="w-4 h-4" />, path: '/admin/orders' },
                { name: 'Customers', icon: <User className="w-4 h-4" />, path: '/admin/customers' },
                { name: 'Reviews', icon: <Eye className="w-4 h-4" />, path: '/admin/reviews' },
                { name: 'Coupons', icon: <Layers className="w-4 h-4" />, path: '/admin/coupons' },
                { name: 'Warehouses', icon: <Warehouse className="w-4 h-4" />, path: '/admin/warehouses' }
              ].map((item, idx) => (
                <div
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                    idx === 3
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
        <main className="flex-grow p-8 space-y-6 overflow-y-auto">
          
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Operators Directory</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Admin Account Security Registry</p>
            </div>

            {isSuperAdmin && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center space-x-2 bg-[#0071DC] hover:bg-[#0046BE] text-white font-black py-2.5 px-6 rounded-full shadow-md uppercase tracking-wider text-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Operator</span>
              </button>
            )}
          </div>

          {/* Alerts Feedback */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3 text-green-700 text-xs">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Table List of Admin Users */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-250 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Admin ID</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Role ID</th>
                    <th className="pb-3">Category Restrictions</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {operators.map((op) => (
                    <tr key={op.admin_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 pl-2 font-mono font-bold text-[#0071DC]">{op.admin_id}</td>
                      <td className="py-3.5 text-[#041E42] font-semibold">{op.first_name} {op.last_name}</td>
                      <td className="py-3.5 text-gray-600 font-mono">{op.email}</td>
                      <td className="py-3.5">
                        <span className="text-[10px] font-bold text-[#041E42] bg-[#FFC220] px-2.5 py-0.5 rounded-full">
                          {op.role_id}
                        </span>
                      </td>
                      <td className="py-3.5 max-w-xs truncate">{getCategoryAccessLabel(op.category_access)}</td>
                      <td className="py-3.5">
                        <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 uppercase">
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        {isSuperAdmin && op.admin_id !== admin.admin_id && op.admin_id !== 'ADM001' ? (
                          <button
                            onClick={() => handleDeleteOperator(op.admin_id)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-all inline-block"
                            title="Delete Administrator Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-gray-300 font-semibold italic text-[10px]">Restricted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* REGISTER NEW OPERATOR OVERLAY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto relative overflow-hidden"
            >
              {/* Decorative top bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-150">
                <h3 className="text-lg font-black text-[#041E42] uppercase tracking-tight">
                  Register Admin Operator
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="jane.doe@retailhub.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Assigned Role *</label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                    ))}
                  </select>
                </div>

                {/* Category Access Restrictions Setup */}
                <div className="border-t border-gray-150 pt-3 space-y-2">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Category Access Permissions</label>
                  
                  <div className="flex space-x-4 pl-1">
                    <label className="flex items-center space-x-2 text-xs font-bold text-gray-600 cursor-pointer">
                      <input
                        type="radio"
                        name="accessType"
                        checked={accessType === 'ALL'}
                        onChange={() => setAccessType('ALL')}
                        className="text-[#0071DC] focus:ring-0 cursor-pointer"
                      />
                      <span>ALL Categories (Unrestricted)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs font-bold text-gray-600 cursor-pointer">
                      <input
                        type="radio"
                        name="accessType"
                        checked={accessType === 'RESTRICTED'}
                        onChange={() => setAccessType('RESTRICTED')}
                        className="text-[#0071DC] focus:ring-0 cursor-pointer"
                      />
                      <span>Specific Restricted Categories</span>
                    </label>
                  </div>

                  {accessType === 'RESTRICTED' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-4 max-h-48 overflow-y-auto mt-2"
                    >
                      {CATEGORIES.map((cat) => (
                        <label key={cat.id} className="flex items-center space-x-2 text-xs font-semibold text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.id)}
                            onChange={() => handleCategoryCheckboxChange(cat.id)}
                            className="rounded border-gray-300 text-[#0071DC] focus:ring-0 cursor-pointer w-4 h-4"
                          />
                          <span>{cat.name}</span>
                        </label>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-blue-300 text-white font-black py-3 rounded-full transition-all uppercase tracking-wider text-xs shadow-md mt-4"
                >
                  {formLoading ? 'Registering administrator...' : 'Register Operator Profile'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
