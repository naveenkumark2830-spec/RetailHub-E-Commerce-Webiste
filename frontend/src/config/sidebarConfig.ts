import { 
  TrendingUp, 
  Cpu, 
  ShoppingBag, 
  FolderOpen, 
  User, 
  Warehouse, 
  Star, 
  Layers, 
  ShieldAlert
} from 'lucide-react';

export interface NavItemConfig {
  key: string;
  name: string;
  path: string;
  icon: any;
}

export const CANONICAL_NAV_ITEMS: NavItemConfig[] = [
  { key: 'fraudguard', name: 'FraudGuard', path: '/admin/fraud', icon: ShieldAlert },
  { key: 'simulator', name: 'Simulator', path: '/admin/simulator', icon: Cpu },
  { key: 'products', name: 'Products', path: '/admin/products', icon: ShoppingBag },
  { key: 'categories', name: 'Categories', path: '/admin/categories', icon: FolderOpen },
  { key: 'operators', name: 'Operators', path: '/admin/operators', icon: User },
  { key: 'inventory', name: 'Inventory', path: '/admin/inventory', icon: Warehouse },
  { key: 'orders', name: 'Orders', path: '/admin/orders', icon: TrendingUp },
  { key: 'customers', name: 'Customers', path: '/admin/customers', icon: User },
  { key: 'reviews', name: 'Reviews', path: '/admin/reviews', icon: Star },
  { key: 'coupons', name: 'Coupons', path: '/admin/coupons', icon: Layers },
  { key: 'warehouses', name: 'Warehouses', path: '/admin/warehouses', icon: Warehouse },
];
