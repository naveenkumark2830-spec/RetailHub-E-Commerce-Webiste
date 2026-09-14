import { create } from 'zustand';
import { useSessionStore } from './useSessionStore';

export interface CartItem {
  cart_item_id: string;
  product_id: string;
  name: string;
  brand: string;
  price: number;
  discount: number;
  sale_price: number;
  added_price: number;
  quantity: number;
  stock: number;
  delivery_days: number;
}

export interface SavedCartItem {
  saved_item_id: string;
  product_id: string;
  name: string;
  brand: string;
  price: number;
  discount: number;
  sale_price: number;
  stock: number;
  delivery_days: number;
}

interface CartSummary {
  cart_id: string;
  coupon_code: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

interface CartState {
  items: CartItem[];
  savedItems: SavedCartItem[];
  cartSummary: CartSummary | null;
  isLoading: boolean;
  error: string | null;
  
  fetchCart: () => Promise<void>;
  addItemToCart: (
    product: { product_id: string; name: string; brand: string; price: number; discount: number; sale_price: number }, 
    quantity: number, 
    source?: string
  ) => Promise<void>;
  updateCartItemQuantity: (productId: string, quantity: number, oldQuantity: number) => Promise<void>;
  removeItemFromCart: (productId: string, reason?: string, price?: number) => Promise<void>;
  
  applyCouponCode: (couponCode: string) => Promise<void>;
  removeCouponCode: () => Promise<void>;
  
  saveItemForLater: (productId: string) => Promise<void>;
  moveSavedItemToCart: (productId: string) => Promise<void>;
  removeSavedItem: (productId: string) => Promise<void>;
  
  clearCart: () => void;
  getCartTotalCount: () => number;
  getCartTotalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  savedItems: [],
  cartSummary: null,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    let session = useSessionStore.getState().session;
    if (!session) {
      session = await useSessionStore.getState().createGuestSession();
    }
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    set({ isLoading: true, error: null });
    try {
      const url = `/api/cart?session_id=${session.session_id}${customer ? `&customer_id=${customer.customer_id}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.success) {
        set({ 
          items: data.items, 
          savedItems: data.savedItems || [], 
          cartSummary: data.cart,
          isLoading: false 
        });
      } else {
        throw new Error(data.error || 'Failed to load cart');
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addItemToCart: async (product, quantity, source = 'product_page') => {
    let session = useSessionStore.getState().session;
    if (!session) {
      session = await useSessionStore.getState().createGuestSession();
    }
    const customer = useSessionStore.getState().customer;
    const sessionId = session?.session_id || 'sess_anonymous';
    const customerId = customer?.customer_id || null;

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          customer_id: customerId,
          product_id: product.product_id,
          quantity,
          price: product.sale_price,
          name: product.name,
          source
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await get().fetchCart();
      }
    } catch (e) {
      console.error('[Cart store error] Adding item failed:', e);
    }
  },

  updateCartItemQuantity: async (productId, quantity, oldQuantity) => {
    const session = useSessionStore.getState().session;
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    try {
      const response = await fetch(`/api/cart/items/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          quantity,
          old_quantity: oldQuantity
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await get().fetchCart();
      }
    } catch (e) {
      console.error(e);
    }
  },

  removeItemFromCart: async (productId, reason = 'not_specified', price = 0) => {
    const session = useSessionStore.getState().session;
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    try {
      const url = `/api/cart/items/${productId}?session_id=${session.session_id}${customer ? `&customer_id=${customer.customer_id}` : ''}&reason=${reason}&price=${price}`;
      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        await get().fetchCart();
      }
    } catch (e) {
      console.error(e);
    }
  },

  applyCouponCode: async (couponCode) => {
    const session = useSessionStore.getState().session;
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    set({ error: null });
    try {
      const response = await fetch('/api/cart/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          coupon_code: couponCode
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await get().fetchCart();
      } else {
        set({ error: data.error || 'Failed to apply coupon' });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  removeCouponCode: async () => {
    const session = useSessionStore.getState().session;
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    try {
      const url = `/api/cart/coupon?session_id=${session.session_id}${customer ? `&customer_id=${customer.customer_id}` : ''}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        await get().fetchCart();
      }
    } catch (e) {
      console.error(e);
    }
  },

  saveItemForLater: async (productId) => {
    const session = useSessionStore.getState().session;
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    try {
      const response = await fetch(`/api/cart/items/${productId}/save-for-later`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          customer_id: customer?.customer_id || null
        })
      });
      if (response.ok) {
        await get().fetchCart();
      }
    } catch (e) {
      console.error(e);
    }
  },

  moveSavedItemToCart: async (productId) => {
    const session = useSessionStore.getState().session;
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    try {
      const response = await fetch(`/api/cart/saved-items/${productId}/move-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          customer_id: customer?.customer_id || null
        })
      });
      if (response.ok) {
        await get().fetchCart();
      }
    } catch (e) {
      console.error(e);
    }
  },

  removeSavedItem: async (productId) => {
    const session = useSessionStore.getState().session;
    const customer = useSessionStore.getState().customer;
    if (!session) return;

    try {
      const url = `/api/cart/saved-items/${productId}?session_id=${session.session_id}${customer ? `&customer_id=${customer.customer_id}` : ''}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        await get().fetchCart();
      }
    } catch (e) {
      console.error(e);
    }
  },

  clearCart: () => {
    set({ items: [], savedItems: [], cartSummary: null });
  },

  getCartTotalCount: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getCartTotalPrice: () => {
    return get().cartSummary?.total || get().items.reduce((total, item) => total + item.sale_price * item.quantity, 0);
  },
}));
