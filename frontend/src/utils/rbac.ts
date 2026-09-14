export type AdminRole = 
  | 'SUPER_ADMIN' 
  | 'SUPER_ADMINISTRATOR' 
  | 'PRODUCT_MANAGER' 
  | 'CATALOG_MANAGER'
  | 'INVENTORY_MANAGER' 
  | 'ORDER_MANAGER' 
  | 'CUSTOMER_MANAGER' 
  | 'REVIEW_MANAGER' 
  | 'COUPON_MANAGER' 
  | 'WAREHOUSE_MANAGER' 
  | 'WAREHOUSE'
  | 'SIMULATOR_MANAGER'
  | string;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    '/admin/simulator',
    '/admin/products',
    '/admin/categories',
    '/admin/operators',
    '/admin/inventory',
    '/admin/orders',
    '/admin/customers',
    '/admin/reviews',
    '/admin/coupons',
    '/admin/warehouses'
  ],
  SUPER_ADMINISTRATOR: [
    '/admin/simulator',
    '/admin/products',
    '/admin/categories',
    '/admin/operators',
    '/admin/inventory',
    '/admin/orders',
    '/admin/customers',
    '/admin/reviews',
    '/admin/coupons',
    '/admin/warehouses'
  ],
  PRODUCT_MANAGER: ['/admin/products', '/admin/categories'],
  CATALOG_MANAGER: ['/admin/products', '/admin/categories'],
  INVENTORY_MANAGER: ['/admin/inventory', '/admin/warehouses'],
  ORDER_MANAGER: ['/admin/orders'],
  CUSTOMER_MANAGER: ['/admin/customers'],
  REVIEW_MANAGER: ['/admin/reviews'],
  COUPON_MANAGER: ['/admin/coupons'],
  WAREHOUSE_MANAGER: ['/admin/warehouses', '/admin/inventory'],
  WAREHOUSE: ['/admin/warehouses', '/admin/inventory'],
  SIMULATOR_MANAGER: ['/admin/simulator'],
};

export function isRouteAllowed(roleId: string | undefined | null, path: string): boolean {
  if (!roleId) return false;
  const normalizedRole = (roleId || '').toUpperCase().trim();
  if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPER_ADMINISTRATOR' || normalizedRole === 'ADMIN') {
    return true;
  }
  const allowed = ROLE_PERMISSIONS[normalizedRole];
  if (!allowed) return false;
  return allowed.some(p => path.startsWith(p));
}

export function getDefaultRouteForRole(roleId: string | undefined | null): string {
  if (!roleId) return '/admin/login';
  const normalizedRole = (roleId || '').toUpperCase().trim();
  if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPER_ADMINISTRATOR' || normalizedRole === 'ADMIN') {
    return '/admin/products';
  }
  const allowed = ROLE_PERMISSIONS[normalizedRole];
  if (allowed && allowed.length > 0) {
    return allowed[0];
  }
  return '/admin/orders';
}
