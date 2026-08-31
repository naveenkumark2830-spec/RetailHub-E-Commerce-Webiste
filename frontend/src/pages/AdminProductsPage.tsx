import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  ShoppingBag, 
  Warehouse, 
  TrendingUp, 
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  FolderOpen,
  Eye,
  Layers,
  Cpu
} from 'lucide-react';

interface Product {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category_id: string;
  subcategory_id: string;
  description: string;
  price: number;
  discount: number;
  sale_price: number;
  stock: number;
  rating: number;
  review_count: number;
  weight: number;
  color: string;
  size: string;
  warranty: string;
  return_eligible: number;
  country: string;
  delivery_days: number;
  status: string;
  image_url: string;
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

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Filtering states
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Form / Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form inputs
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('CAT001');
  const [subcategoryId, setSubcategoryId] = useState<string>('SUBCAT001');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [stock, setStock] = useState<string>('50');
  const [weight, setWeight] = useState<string>('0.5');
  const [color, setColor] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [warranty, setWarranty] = useState<string>('');
  const [returnEligible, setReturnEligible] = useState<boolean>(true);
  const [country, setCountry] = useState<string>('India');
  const [deliveryDays, setDeliveryDays] = useState<string>('3');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('ACTIVE');

  const handleSlotImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const token = localStorage.getItem('adminToken');
      let uploadedUrl = base64Data;

      try {
        setUploadingImage(true);
        const res = await fetch('/api/admin/products/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token || ''
          },
          body: JSON.stringify({ filename: file.name, base64Data })
        });
        const data = await res.json();
        if (res.ok && data.image_url) {
          uploadedUrl = data.image_url;
        }
      } catch (err) {
        uploadedUrl = base64Data;
      } finally {
        setUploadingImage(false);
      }

      setGalleryImages(prev => {
        const updated = [...prev];
        while (updated.length <= slotIndex) updated.push('');
        updated[slotIndex] = uploadedUrl;
        return updated;
      });

      if (slotIndex === 0) {
        setImageUrl(uploadedUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSlotUrlChange = (url: string, slotIndex: number) => {
    setGalleryImages(prev => {
      const updated = [...prev];
      while (updated.length <= slotIndex) updated.push('');
      updated[slotIndex] = url;
      return updated;
    });
    if (slotIndex === 0) setImageUrl(url);
  };

  const addPhotoSlot = () => {
    setGalleryImages(prev => [...prev, '']);
  };

  const removePhotoSlot = (slotIndex: number) => {
    setGalleryImages(prev => {
      const updated = prev.filter((_, i) => i !== slotIndex);
      if (slotIndex === 0 && updated.length > 0) {
        setImageUrl(updated[0]);
      } else if (updated.length === 0) {
        setImageUrl('');
      }
      return updated;
    });
  };

  const setTotalPhotoCount = (count: number) => {
    setGalleryImages(prev => {
      const updated = [...prev];
      if (updated.length < count) {
        while (updated.length < count) updated.push('');
      } else if (updated.length > count) {
        return updated.slice(0, count);
      }
      return updated;
    });
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search,
        category: categoryFilter,
        status: statusFilter
      });

      const res = await fetch(`/api/admin/products?${queryParams.toString()}`, {
        headers: { 'Authorization': token }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch products.');
      }
      setProducts(data);
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
    setPermissions(JSON.parse(permsData));
    fetchProducts();
  }, [navigate, categoryFilter, statusFilter]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenAddModal = () => {
    setEditProductId(null);
    setName('');
    setSku('');
    setBrand('');
    setCategoryId('CAT001');
    setSubcategoryId('SUBCAT001');
    setDescription('');
    setPrice('');
    setDiscount('0');
    setStock('50');
    setWeight('0.5');
    setColor('');
    setSize('');
    setWarranty('');
    setReturnEligible(true);
    setCountry('India');
    setDeliveryDays('3');
    setImageUrl('');
    setGalleryImages([]);
    setStatus('ACTIVE');
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditProductId(product.product_id);
    setName(product.name);
    setSku(product.sku);
    setBrand(product.brand);
    setCategoryId(product.category_id);
    setSubcategoryId(product.subcategory_id);
    setDescription(product.description || '');
    setPrice(product.price.toString());
    setDiscount(product.discount.toString());
    setStock(product.stock.toString());
    setWeight(product.weight?.toString() || '0.5');
    setColor(product.color || '');
    setSize(product.size || '');
    setWarranty(product.warranty || '');
    setReturnEligible(product.return_eligible === 1);
    setCountry(product.country || 'India');
    setDeliveryDays(product.delivery_days?.toString() || '3');
    setImageUrl(product.image_url || '');
    setGalleryImages((product as any).gallery_images || [product.image_url].filter(Boolean));
    setStatus(product.status);
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    const token = localStorage.getItem('adminToken');
    if (!token) return;

    if (!name || !price || !categoryId) {
      setError('Please fill in Name, Price, and Category ID.');
      return;
    }

    const cleanGalleryImages = galleryImages.filter(img => img && img.trim().length > 0);
    const primaryCover = cleanGalleryImages[0] || imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop';

    const productPayload = {
      name,
      sku,
      brand,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      description,
      price: parseFloat(price),
      discount: parseFloat(discount),
      stock: parseInt(stock),
      weight: parseFloat(weight),
      color,
      size,
      warranty,
      return_eligible: returnEligible,
      country,
      delivery_days: parseInt(deliveryDays),
      image_url: primaryCover,
      gallery_images: cleanGalleryImages.length > 0 ? cleanGalleryImages : [primaryCover],
      status
    };

    try {
      setFormLoading(true);
      const url = editProductId 
        ? `/api/admin/products/update/${editProductId}`
        : '/api/admin/products/create';
      const method = editProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(productPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit product catalog change.');
      }

      setSuccess(editProductId ? 'Product profile updated successfully.' : 'New product registered successfully.');
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (productId: string) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    if (!window.confirm('Are you sure you want to deactivate this product? It will no longer display to shopping customers.')) {
      return;
    }

    try {
      setSuccess('');
      setError('');
      const res = await fetch(`/api/admin/products/deactivate/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deactivate product.');
      }
      setSuccess('Product deactivated successfully.');
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const hasCreatePermission = permissions.includes('PRODUCT_CREATE');
  const hasUpdatePermission = permissions.includes('PRODUCT_UPDATE');
  const hasDeletePermission = permissions.includes('PRODUCT_DELETE');

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
                    idx === 1
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
              <h2 className="text-2xl font-black text-[#041E42] uppercase tracking-tight font-sans">Product Catalog</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Admin CRUD Control Directory</p>
            </div>

            {hasCreatePermission && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center space-x-2 bg-[#0071DC] hover:bg-[#0046BE] text-white font-black py-2.5 px-6 rounded-full shadow-md uppercase tracking-wider text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
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

          {/* FILTERING HEADER */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-grow max-w-md w-full relative">
              <input
                type="text"
                placeholder="Search by name, brand, or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 text-[#041E42] placeholder-gray-400 pl-10 pr-4 py-2.5 rounded-full border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all text-xs font-semibold"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            </form>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-2 bg-gray-50 border border-gray-250 rounded-full px-3.5 py-2 w-full md:w-auto">
                <Filter className="w-3.5 h-3.5 text-gray-450" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-gray-600 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 bg-gray-50 border border-gray-250 rounded-full px-3.5 py-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-gray-600 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>

          {/* PRODUCTS TABLE */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-250 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">SKU / ID</th>
                    <th className="pb-3">Thumbnail</th>
                    <th className="pb-3">Product Name</th>
                    <th className="pb-3">Brand</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Stock</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {products.map((prod) => (
                    <tr key={prod.product_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 pl-2">
                        <span className="block font-bold text-gray-500 font-mono">{prod.sku}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{prod.product_id}</span>
                      </td>
                      <td className="py-3.5">
                        {prod.image_url ? (
                          <img 
                            src={prod.image_url} 
                            alt={prod.name} 
                            className="w-10 h-10 object-cover rounded-xl border border-gray-150"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-150">
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-[#041E42] font-semibold max-w-xs truncate" title={prod.name}>
                        {prod.name}
                      </td>
                      <td className="py-3.5 text-gray-600">{prod.brand}</td>
                      <td className="py-3.5">
                        <span className="block font-bold text-[#041E42]">₹{prod.sale_price.toLocaleString()}</span>
                        {prod.discount > 0 && (
                          <span className="text-[10px] text-gray-400 line-through">₹{prod.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className={`font-mono font-bold ${prod.stock < 20 ? 'text-red-500' : 'text-gray-600'}`}>
                          {prod.stock}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          prod.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {prod.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2 space-x-1">
                        {hasUpdatePermission && (
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="text-gray-500 hover:text-[#0071DC] p-1.5 rounded-full hover:bg-blue-50 transition-all inline-block"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasDeletePermission && prod.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDeactivate(prod.product_id)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-all inline-block"
                            title="Deactivate product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500 font-bold uppercase tracking-wider">
                        No products match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ADD / EDIT OVERLAY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto relative overflow-hidden"
            >
              {/* Decorative top bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#FFC220]"></div>

              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-150">
                <h3 className="text-lg font-black text-[#041E42] uppercase tracking-tight">
                  {editProductId ? 'Edit Product Profile' : 'Register New Product'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-55 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {/* Form Error message inside modal */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Section 1: Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Sony Wireless Headset"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Brand Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Sony"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">SKU Code</label>
                    <input
                      type="text"
                      placeholder="SONY-WH-1000XM4"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Category *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Subcategory ID</label>
                    <input
                      type="text"
                      placeholder="SUBCAT001"
                      value={subcategoryId}
                      onChange={(e) => setSubcategoryId(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                </div>

                {/* Section 2: Pricing & Inventory */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="12999"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Discount (%)</label>
                    <input
                      type="number"
                      placeholder="10"
                      min="0"
                      max="90"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Stock Level *</label>
                    <input
                      type="number"
                      required
                      placeholder="150"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                </div>

                {/* Section 3: Attributes */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Weight (kg)</label>
                    <input
                      type="text"
                      placeholder="0.25"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Color</label>
                    <input
                      type="text"
                      placeholder="Matte Black"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Size</label>
                    <input
                      type="text"
                      placeholder="Standard"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Warranty</label>
                    <input
                      type="text"
                      placeholder="1 Year Brand"
                      value={warranty}
                      onChange={(e) => setWarranty(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Country of Origin</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Delivery Time (Days)</label>
                    <input
                      type="number"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-gray-50 text-[#041E42] px-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider pl-1">Description</label>
                  <textarea
                    placeholder="Provide deep product features specifications details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-50 text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:bg-white focus:outline-none transition-all font-medium text-xs shadow-sm"
                  />
                </div>

                {/* Dynamic Multi-Photo Slots Manager */}
                <div className="space-y-4 pt-2 border-t border-gray-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[10px] font-black text-[#041E42] uppercase tracking-wider">
                        Product Photo Gallery Manager
                      </label>
                      <span className="text-[9px] text-gray-400 font-medium">Configure exact photo slots to display on product detail page</span>
                    </div>
                    {uploadingImage && <span className="text-[10px] text-[#0071DC] font-bold animate-pulse">Uploading file...</span>}
                  </div>

                  {/* Photo Count Quick Selector */}
                  <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Photos Count:</span>
                    <div className="flex space-x-1.5">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTotalPhotoCount(num)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${
                            galleryImages.length === num
                              ? 'bg-[#0071DC] text-white shadow-sm'
                              : 'bg-white text-gray-600 border border-gray-250 hover:bg-gray-100'
                          }`}
                        >
                          {num} {num === 1 ? 'Photo' : 'Photos'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Photo Slot Cards List */}
                  <div className="space-y-3">
                    {(galleryImages.length > 0 ? galleryImages : ['']).map((url, slotIdx) => (
                      <div key={slotIdx} className="bg-gray-50/90 p-3 rounded-2xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-[#0071DC] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-4 h-4 bg-[#0071DC] text-white rounded-full flex items-center justify-center text-[9px]">
                              {slotIdx + 1}
                            </span>
                            {slotIdx === 0 ? 'Photo #1 (Primary Cover Image)' : `Photo #${slotIdx + 1}`}
                          </span>
                          {slotIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => removePhotoSlot(slotIdx)}
                              className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-0.5"
                            >
                              <X className="w-3.5 h-3.5" /> Remove Slot
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder={slotIdx === 0 ? "https://... or /uploads/products/sample.png" : `Paste URL for photo #${slotIdx + 1}...`}
                            value={url}
                            onChange={(e) => handleSlotUrlChange(e.target.value, slotIdx)}
                            className="flex-grow bg-white text-[#041E42] pl-3 pr-3 py-2 rounded-xl border border-gray-250 focus:border-[#0071DC] focus:outline-none font-medium text-xs shadow-sm"
                          />
                          <label className="cursor-pointer bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] text-[10px] font-bold px-3 py-2 rounded-xl flex items-center space-x-1 flex-shrink-0 transition-all shadow-sm">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Upload Local</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSlotImageFileUpload(e, slotIdx)}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {url && (
                          <div className="mt-1 relative w-16 h-16 rounded-xl border border-gray-250 overflow-hidden bg-white shadow-inner">
                            <img src={url} alt={`Preview ${slotIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Slot Button */}
                  <button
                    type="button"
                    onClick={addPhotoSlot}
                    className="w-full bg-white hover:bg-gray-50 border border-dashed border-[#0071DC] text-[#0071DC] font-bold py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Another Photo Slot
                  </button>
                </div>

                {/* Return Checkbox */}
                <div className="flex items-center space-x-2 pl-1 pt-1">
                  <input
                    type="checkbox"
                    id="returnable"
                    checked={returnEligible}
                    onChange={(e) => setReturnEligible(e.target.checked)}
                    className="rounded border-gray-300 bg-gray-50 text-[#0071DC] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                  />
                  <label htmlFor="returnable" className="text-xs font-bold text-gray-500 cursor-pointer select-none">
                    Eligible for customer return & refund
                  </label>
                </div>

                {/* Submit action */}
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#0071DC] hover:bg-[#0046BE] disabled:bg-blue-300 text-white font-black py-3 rounded-full transition-all uppercase tracking-wider text-xs shadow-md mt-4"
                >
                  {formLoading ? 'Submitting catalog changes...' : editProductId ? 'Update Product Catalog' : 'Register Product Profile'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
