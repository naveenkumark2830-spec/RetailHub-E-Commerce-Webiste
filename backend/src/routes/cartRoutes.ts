import { Router, Request, Response } from 'express';
import { 
  getOrCreateCart,
  getCartItems,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  saveForLater,
  moveToCart,
  getSavedCartItems,
  removeSavedCartItem,
  applyCoupon,
  removeCoupon,
  getCouponByCode,
  getCustomerById
} from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = Router();

async function getGeoContext(customerId: string | null) {
  let country = 'India';
  let state = 'Karnataka';
  let city = 'Bengaluru';
  if (customerId) {
    const cust = await getCustomerById(customerId);
    if (cust) {
      country = cust.country;
      state = cust.state;
      city = cust.city;
    }
  }
  return {
    country,
    state,
    city,
    device: 'desktop',
    browser: 'Chrome'
  };
}

// GET /api/cart
router.get('/', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    const cart = await getOrCreateCart(session_id as string, customer_id ? (customer_id as string) : null);
    const items = await getCartItems(session_id as string, customer_id ? (customer_id as string) : null);
    const savedItems = await getSavedCartItems(session_id as string, customer_id ? (customer_id as string) : null);

    // Calculate Prices
    const subtotal = items.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
    let discount = 0;

    if (cart.coupon_code) {
      const coupon = await getCouponByCode(cart.coupon_code);
      if (coupon && subtotal >= Number(coupon.minimum_order_value)) {
        if (coupon.discount_type === 'percentage') {
          discount = subtotal * (Number(coupon.discount_value) / 100);
          if (discount > Number(coupon.maximum_discount)) {
            discount = Number(coupon.maximum_discount);
          }
        } else if (coupon.discount_type === 'flat') {
          discount = Number(coupon.discount_value);
        }
        discount = Math.min(discount, subtotal);
      } else {
        // If min order value not met, reset coupon code in DB to keep it clean
        await removeCoupon(session_id as string, customer_id ? (customer_id as string) : null);
        cart.coupon_code = null;
      }
    }

    const netTotal = subtotal - discount;
    const shipping = (netTotal >= 1500 || netTotal === 0) ? 0 : 99;
    const tax = Number((netTotal * 0.18).toFixed(2));
    const total = netTotal + shipping + tax;

    return res.json({
      success: true,
      cart: {
        cart_id: cart.cart_id,
        coupon_code: cart.coupon_code,
        subtotal,
        discount,
        shipping,
        tax,
        total
      },
      items,
      savedItems
    });
  } catch (error: any) {
    console.error('[API Error] Fetching cart failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/cart/items
router.post('/items', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id, product_id, quantity, price, name, source } = req.body;
    if (!session_id || !product_id || !quantity) {
      return res.status(400).json({ success: false, error: 'session_id, product_id, and quantity are required' });
    }

    const cart = await getOrCreateCart(session_id, customer_id || null);
    const unitPrice = await addToCart(session_id, customer_id || null, product_id, quantity, price);

    const context = await getGeoContext(customer_id || null);

    // Emit cart_add clickstream telemetry event
    EventLogger.logEvent({
      event_type: 'cart_add',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: source === 'wishlist' ? 'wishlist' : 'product_details',
      device: 'desktop',
      browser: 'Chrome',
      context,
      metadata: {
        cart_id: cart.cart_id,
        product_id,
        quantity,
        unit_price: unitPrice,
        source: source || 'product_page'
      }
    });

    return res.json({ success: true, message: 'Added to cart successfully' });
  } catch (error: any) {
    console.error('[API Error] Adding to cart failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// PATCH /api/cart/items/:productId
router.patch('/items/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { session_id, customer_id, quantity, old_quantity } = req.body;

    if (!session_id || !productId || quantity === undefined) {
      return res.status(400).json({ success: false, error: 'session_id and quantity are required' });
    }

    await updateCartItemQuantity(session_id, customer_id || null, productId, quantity);

    const context = await getGeoContext(customer_id || null);

    // Telemetry: Cart Update
    EventLogger.logEvent({
      event_type: 'cart_update',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'cart',
      context,
      metadata: {
        product_id: productId,
        old_quantity: old_quantity || 1,
        new_quantity: quantity
      }
    });

    return res.json({ success: true, message: 'Quantity updated' });
  } catch (error: any) {
    console.error('[API Error] Updating quantity failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { session_id, customer_id, reason, price } = req.query;

    if (!session_id || !productId) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    await removeFromCart(session_id as string, customer_id ? (customer_id as string) : null, productId);

    const context = await getGeoContext((customer_id as string) || null);

    // Telemetry: Cart Remove
    EventLogger.logEvent({
      event_type: 'cart_remove',
      session_id: session_id as string,
      customer_id: (customer_id as string) || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'cart',
      context,
      metadata: {
        product_id: productId,
        reason: (reason as string) || 'not_specified',
        price: price ? parseFloat(price as string) : 0,
        cart_age_seconds: Math.floor(Math.random() * 3600) + 120 // mock time duration
      }
    });

    return res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    console.error('[API Error] Removing from cart failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/cart/coupon
router.post('/coupon', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id, coupon_code } = req.body;
    if (!session_id || !coupon_code) {
      return res.status(400).json({ success: false, error: 'session_id and coupon_code are required' });
    }

    const items = await getCartItems(session_id, customer_id || null);
    const subtotal = items.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);

    try {
      const coupon = await applyCoupon(session_id, customer_id || null, coupon_code);

      if (subtotal < Number(coupon.minimum_order_value)) {
        await removeCoupon(session_id, customer_id || null);
        
        // Log failed coupon application
        EventLogger.logEvent({
          event_type: 'coupon_failed',
          session_id,
          customer_id: customer_id || null,
          user_type: customer_id ? 'registered' : 'guest',
          page: 'cart',
          metadata: {
            coupon_code,
            reason: 'minimum_not_met',
            cart_value: subtotal
          }
        });

        return res.status(422).json({ 
          success: false, 
          error: `Minimum order value of ₹${Number(coupon.minimum_order_value).toLocaleString()} required.` 
        });
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = subtotal * (Number(coupon.discount_value) / 100);
        if (discountAmount > Number(coupon.maximum_discount)) {
          discountAmount = Number(coupon.maximum_discount);
        }
      } else {
        discountAmount = Number(coupon.discount_value);
      }
      discountAmount = Math.min(discountAmount, subtotal);

      // Log successful coupon application
      EventLogger.logEvent({
        event_type: 'coupon_applied',
        session_id,
        customer_id: customer_id || null,
        user_type: customer_id ? 'registered' : 'guest',
        page: 'cart',
        metadata: {
          coupon_code,
          discount_amount: discountAmount,
          cart_value: subtotal
        }
      });

      return res.json({ success: true, message: 'Coupon applied successfully', coupon });
    } catch (e: any) {
      // Log invalid/expired coupon try
      EventLogger.logEvent({
        event_type: 'coupon_failed',
        session_id,
        customer_id: customer_id || null,
        user_type: customer_id ? 'registered' : 'guest',
        page: 'cart',
        metadata: {
          coupon_code,
          reason: e.message || 'invalid'
        }
      });

      return res.status(404).json({ success: false, error: 'Coupon code is invalid or expired.' });
    }
  } catch (error: any) {
    console.error('[API Error] Applying coupon failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/cart/coupon
router.delete('/coupon', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    await removeCoupon(session_id as string, customer_id ? (customer_id as string) : null);
    return res.json({ success: true, message: 'Coupon removed' });
  } catch (error: any) {
    console.error('[API Error] Removing coupon failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/cart/items/:productId/save-for-later
router.post('/items/:productId/save-for-later', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { session_id, customer_id } = req.body;

    if (!session_id || !productId) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    const cart = await getOrCreateCart(session_id, customer_id || null);
    await saveForLater(session_id, customer_id || null, productId);

    // Telemetry: Save for Later
    EventLogger.logEvent({
      event_type: 'save_for_later',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'cart',
      metadata: {
        cart_id: cart.cart_id,
        product_id: productId
      }
    });

    return res.json({ success: true, message: 'Moved item to Save for Later' });
  } catch (error: any) {
    console.error('[API Error] Save for later failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/cart/saved-items/:productId/move-to-cart
router.post('/saved-items/:productId/move-to-cart', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { session_id, customer_id } = req.body;

    if (!session_id || !productId) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    const cart = await getOrCreateCart(session_id, customer_id || null);
    await moveToCart(session_id, customer_id || null, productId);

    // Telemetry: cart_add from Save for Later
    EventLogger.logEvent({
      event_type: 'cart_add',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'cart',
      metadata: {
        cart_id: cart.cart_id,
        product_id: productId,
        quantity: 1,
        source: 'save_for_later'
      }
    });

    return res.json({ success: true, message: 'Moved item to cart' });
  } catch (error: any) {
    console.error('[API Error] Move to cart failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/cart/saved-items/:productId
router.delete('/saved-items/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { session_id, customer_id } = req.query;

    if (!session_id || !productId) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    await removeSavedCartItem(session_id as string, customer_id ? (customer_id as string) : null, productId);
    return res.json({ success: true, message: 'Saved item deleted' });
  } catch (error: any) {
    console.error('[API Error] Deleting saved item failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/cart/checkout-start
router.post('/checkout-start', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'session_id is required' });
    }

    const cart = await getOrCreateCart(session_id, customer_id || null);
    const items = await getCartItems(session_id, customer_id || null);

    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty.' });
    }

    // Validate inventory availability
    for (const item of items) {
      if (item.stock < item.quantity) {
        return res.status(409).json({ 
          success: false, 
          error: `Insufficient inventory for ${item.name}. Only ${item.stock} units left.` 
        });
      }
    }

    // Calculate Grand Total
    const subtotal = items.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
    let discount = 0;
    if (cart.coupon_code) {
      const coupon = await getCouponByCode(cart.coupon_code);
      if (coupon && subtotal >= Number(coupon.minimum_order_value)) {
        if (coupon.discount_type === 'percentage') {
          discount = subtotal * (Number(coupon.discount_value) / 100);
          if (discount > Number(coupon.maximum_discount)) {
            discount = Number(coupon.maximum_discount);
          }
        } else {
          discount = Number(coupon.discount_value);
        }
        discount = Math.min(discount, subtotal);
      }
    }
    const netTotal = subtotal - discount;
    const shipping = (netTotal >= 1500 || netTotal === 0) ? 0 : 99;
    const tax = Number((netTotal * 0.18).toFixed(2));
    const total = netTotal + shipping + tax;

    // Telemetry: Checkout Started
    EventLogger.logEvent({
      event_type: 'checkout_started',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'cart',
      metadata: {
        cart_id: cart.cart_id,
        item_count: items.reduce((sum, item) => sum + item.quantity, 0),
        cart_value: total
      }
    });

    return res.json({ success: true, message: 'Checkout validation successful' });
  } catch (error: any) {
    console.error('[API Error] Starting checkout failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
