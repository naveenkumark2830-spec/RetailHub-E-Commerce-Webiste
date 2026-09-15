import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  ShoppingBag, 
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Edit2,
  FolderOpen
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface Category {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  product_count: number;
  display_order: number;
  status: string;
  subcategories: number;
  products: number;
}

const SUBCATEGORIES_MOCK: Record<string, string[]> = {
  'CAT001': ['Laptop', 'Mobile', 'Tablet', 'Monitor', 'Keyboard', 'Mouse', 'SSD', 'Hard Disk', 'GPU', 'CPU', 'Webcam', 'Printer'],
  'CAT002': ['T-Shirts', 'Shirts', 'Jeans', 'Shoes', 'Jackets', 'Watches', 'Bags'],
  'CAT003': ['Cookware', 'Bedding', 'Storage', 'Dinnerware', 'Lighting'],
  'CAT004': ['Snacks', 'Beverages', 'Spices', 'Dairy', 'Organic'],
  'CAT005': ['Skincare', 'Haircare', 'Makeup', 'Fragrances'],
  'CAT006': ['Fitness', 'Camping', 'Cycling', 'Outdoor Gear'],
  'CAT007': ['Fiction', 'Non-Fiction', 'Academic', 'Kids Books'],
  'CAT008': ['Action Figures', 'Board Games', 'Puzzles', 'Dolls'],
  'CAT009': ['Car Accessories', 'Tools', 'Cleaners', 'Tires'],
  'CAT010': ['Cables', 'Adapters', 'Cases', 'Stands']
};

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Search & Filter
  const [search, setSearch] = useState<string>('');

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [catStatus, setCatStatus] = useState<string>('ACTIVE');
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Subcategories toggle list
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const fetchCategories = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/categories?search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': token }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch categories list.');
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminUser');
    if (!token || !adminData) {
      localStorage.clear();
      navigate('/admin/login');
      return;
    }
    fetchCategories();
  }, [navigate, search]);

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        await fetch('/api/admin/auth/logout', { method: 'POST', headers: { 'Authorization': token } });
      } catch (e) {}
    }
    localStorage.clear();
    navigate('/admin/login');
  };

  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setName('');
    setDescription('');
    setImageUrl('');
    setDisplayOrder(1);
    setCatStatus('ACTIVE');
    setFormError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setModalMode('EDIT');
    setSelectedCatId(cat.category_id);
    setName(cat.name);
    setDescription(cat.description || '');
    setImageUrl(cat.image_url || '');
    setDisplayOrder(cat.display_order || 1);
    setCatStatus(cat.status || 'ACTIVE');
    setFormError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    const token = localStorage.getItem('adminToken');
    if (!token) return;

    if (!name) {
      setFormError('Category name is required.');
      return;
    }

    const payload = {
      name,
      description,
      image_url: imageUrl,
      display_order: displayOrder,
      status: catStatus
    };

    try {
      setFormLoading(true);
      const url = modalMode === 'CREATE' 
        ? '/api/admin/categories/create' 
        : `/api/admin/categories/update/${selectedCatId}`;
      const method = modalMode === 'CREATE' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');

      setSuccess(modalMode === 'CREATE' ? 'Category registered successfully!' : 'Category updated successfully!');
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (catId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    if (!window.confirm('Are you sure you want to deactivate this category? Linked products will no longer be visible on customer shopping routes.')) {
      return;
    }

    try {
      setSuccess('');
      setError('');
      const res = await fetch(`/api/admin/categories/deactivate/${catId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deactivation failed.');
      setSuccess('Category deactivated successfully.');
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getSubcategories = (catId: string) => {
    return SUBCATEGORIES_MOCK[catId] || ['Standard Items', 'Accessories'];
  };

  if (loading && categories.length === 0) {
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
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/admin/products')}>
          <img 
            src="/nexday-logo.png" 
            alt="NexDay™ Admin Portal" 
            className="h-10 w-auto object-contain bg-white rounded-xl px-2.5 py-1 shadow-sm hover:scale-105 transition-transform duration-200" 
          />
          <span className="text-[10px] font-black tracking-widest bg-[#FFC20A] text-[#0B2A55] uppercase px-2 py-0.5 rounded-md shadow-sm">
            Admin Portal
          </span>
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

      <div className="flex-grow flex flex-col lg:flex-row min-w-0 w-full overflow-x-hidden">
        {/* SIDEBAR NAVIGATION */}
        <AdminSidebar />

        {/* MAIN BODY AREA */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto w-full min-w-0">
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight">Category Management</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Structure shopping catalog departments</p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-white border border-gray-250 rounded-full px-4 py-2 flex items-center space-x-2 w-72 shadow-sm focus-within:border-[#0071DC] transition-all">
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs font-semibold focus:outline-none w-full text-[#041E42]"
                />
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 bg-[#0071DC] hover:bg-[#0046BE] text-white font-black py-2.5 px-6 rounded-full shadow-md uppercase tracking-wider text-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Feedback alerts */}
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

          {/* Catalog Structure Directory */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Table layout (Left 2 cols) */}
            <div className="lg:col-span-2 bg-white border border-gray-250 rounded-3xl p-6 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Display Order</th>
                      <th className="pb-3">Category Name</th>
                      <th className="pb-3 text-center">Products</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {categories.map((cat) => (
                      <tr 
                        key={cat.category_id} 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedCat === cat.category_id ? 'bg-blue-50/20' : ''}`}
                        onClick={() => setExpandedCat(expandedCat === cat.category_id ? null : cat.category_id)}
                      >
                        <td className="py-4 pl-2 font-mono font-bold text-gray-500 text-center">{cat.display_order}</td>
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            {cat.image_url ? (
                              <img src={cat.image_url} alt={cat.name} className="w-8 h-8 rounded-lg object-cover border border-gray-100 shadow-sm" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-400">
                                {cat.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-[#041E42]">{cat.name}</p>
                              <span className="text-[10px] text-gray-400 font-mono">{cat.category_id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center font-mono font-bold text-gray-600">{cat.products || 0} items</td>
                        <td className="py-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            cat.status === 'ACTIVE' 
                              ? 'text-green-700 bg-green-50 border-green-200' 
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}>
                            {cat.status}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-2 space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-[#0071DC] rounded-full transition-all inline-block"
                            title="Edit Category Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          {cat.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleDeactivate(cat.category_id)}
                              className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full transition-all inline-block"
                              title="Deactivate Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold italic pr-1">Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tree display detail view (Right col) */}
            <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
              <h3 className="text-sm font-black uppercase text-[#041E42] tracking-tight">Subcategories Map</h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                Click a category in the table on the left to explore its subcategories layout and products count.
              </p>

              {expandedCat ? (
                <div className="border border-blue-50 rounded-2xl p-4 bg-blue-50/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="text-xs font-black uppercase text-[#0071DC]">
                      {categories.find(c => c.category_id === expandedCat)?.name}
                    </span>
                    <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {expandedCat}
                    </span>
                  </div>

                  <div className="font-mono text-xs text-gray-600 space-y-2">
                    <p className="font-semibold text-gray-800">
                      {categories.find(c => c.category_id === expandedCat)?.name} (Root)
                    </p>
                    <div className="pl-4 space-y-1.5 relative border-l border-blue-100">
                      {getSubcategories(expandedCat).map((sub, idx, arr) => (
                        <div key={sub} className="flex items-center space-x-2">
                          <span className="text-[#0071DC]">{idx === arr.length - 1 ? '└──' : '├──'}</span>
                          <span className="text-gray-700 font-bold">{sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <FolderOpen className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500 font-bold">No Category Selected</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* CREATE / EDIT OVERLAY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-lg w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-150">
                <h3 className="text-sm font-black text-[#041E42] uppercase tracking-tight">
                  {modalMode === 'CREATE' ? 'Register Category Department' : 'Edit Category Details'}
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

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Electronics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about products in this category..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Display Order</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value))}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Status</label>
                    <select
                      value={catStatus}
                      onChange={(e) => setCatStatus(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Department Image URL</label>
                  <input
                    type="text"
                    placeholder="https://retailhub.com/images/categories/electronics.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-blue-300 text-white font-black py-3 rounded-full transition-all uppercase tracking-wider text-xs shadow-md mt-4"
                >
                  {formLoading ? 'Saving category...' : 'Save Category Details'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
