import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { CategoryPage } from './pages/CategoryPage';
import { SearchPage } from './pages/SearchPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { WishlistPage } from './pages/WishlistPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { InvoicePage } from './pages/InvoicePage';
import { ReturnPage } from './pages/ReturnPage';
import { WriteReviewPage } from './pages/WriteReviewPage';
import { ProfilePage } from './pages/ProfilePage';
import { AddressesPage } from './pages/AddressesPage';
import NotificationsPage from './pages/NotificationsPage';
import HelpSupportPage from './pages/HelpSupportPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminOperatorsPage from './pages/AdminOperatorsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminInventoryPage from './pages/AdminInventoryPage';
import AdminOrderManagementPage from './pages/AdminOrderManagementPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import AdminCouponsPage from './pages/AdminCouponsPage';
import AdminWarehousesPage from './pages/AdminWarehousesPage';
import AdminSimulatorPage from './pages/AdminSimulatorPage';
import { isRouteAllowed, getDefaultRouteForRole } from './utils/rbac';
import { useSessionStore } from './store/useSessionStore';

// Protected Admin Route wrapper: redirects to /admin/login if not logged in or unauthorized for specific route
const ProtectedAdminRoute = ({ children, path }: { children: React.ReactElement; path: string }) => {
  const token = localStorage.getItem('adminToken');
  const adminData = localStorage.getItem('adminUser');
  if (!token || !adminData) {
    return <Navigate to="/admin/login" replace />;
  }
  try {
    const admin = JSON.parse(adminData);
    if (!isRouteAllowed(admin.role_id, path)) {
      const defaultPath = getDefaultRouteForRole(admin.role_id);
      return <Navigate to={defaultPath} replace />;
    }
  } catch (e) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  const checkAuth = useSessionStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/category/:slug/:subSlug" element={<CategoryPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/product/:productId" element={<ProductDetailsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId/tracking" element={<OrderTrackingPage />} />
        <Route path="/invoices/:invoiceId" element={<InvoicePage />} />
        <Route path="/orders/:orderId/return" element={<ReturnPage />} />
        <Route path="/returns" element={<ReturnPage />} />
        <Route path="/returns-refunds" element={<ReturnPage />} />
        <Route path="/orders/:orderId/review/:productId" element={<WriteReviewPage />} />
        <Route path="/reviews" element={<WriteReviewPage />} />
        <Route path="/my-reviews" element={<WriteReviewPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/addresses" element={<AddressesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/help" element={<HelpSupportPage />} />

        {/* Admin Login Route (Unprotected) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Admin Routes */}
        <Route path="/admin/dashboard" element={<Navigate to="/admin/simulator" replace />} />
        <Route path="/admin/products" element={<ProtectedAdminRoute path="/admin/products"><AdminProductsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/operators" element={<ProtectedAdminRoute path="/admin/operators"><AdminOperatorsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/categories" element={<ProtectedAdminRoute path="/admin/categories"><AdminCategoriesPage /></ProtectedAdminRoute>} />
        <Route path="/admin/inventory" element={<ProtectedAdminRoute path="/admin/inventory"><AdminInventoryPage /></ProtectedAdminRoute>} />
        <Route path="/admin/orders" element={<ProtectedAdminRoute path="/admin/orders"><AdminOrderManagementPage /></ProtectedAdminRoute>} />
        <Route path="/admin/customers" element={<ProtectedAdminRoute path="/admin/customers"><AdminCustomersPage /></ProtectedAdminRoute>} />
        <Route path="/admin/reviews" element={<ProtectedAdminRoute path="/admin/reviews"><AdminReviewsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/coupons" element={<ProtectedAdminRoute path="/admin/coupons"><AdminCouponsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/warehouses" element={<ProtectedAdminRoute path="/admin/warehouses"><AdminWarehousesPage /></ProtectedAdminRoute>} />
        <Route path="/admin/events" element={<Navigate to="/admin/simulator" replace />} />
        <Route path="/admin/simulator" element={<ProtectedAdminRoute path="/admin/simulator"><AdminSimulatorPage /></ProtectedAdminRoute>} />
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
