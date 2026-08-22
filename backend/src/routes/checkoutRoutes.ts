import { Router, Request, Response } from 'express';
import { 
  getAddresses, 
  getAddressById,
  addAddress, 
  getDeliveryOptions, 
  createOrderAndPayment, 
  retryOrderPayment,
  getCustomerById,
  getOrdersByCustomerId
} from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = Router();

// GET /api/checkout/addresses
router.get('/addresses', async (req: Request, res: Response) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      return res.status(400).json({ success: false, error: 'customer_id is required' });
    }
    let addresses = await getAddresses(customer_id as string);
    
    // Auto-seed default address from registered customer profile if addresses is empty
    if (addresses.length === 0) {
      const cust = await getCustomerById(customer_id as string);
      if (cust) {
        const defaultAddr = {
          address_type: 'Home',
          full_name: `${cust.first_name} ${cust.last_name}`,
          phone: cust.phone || '9999999999',
          address_line_1: 'Default Street Address, Main Road',
          address_line_2: '',
          city: cust.city,
          state: cust.state,
          postal_code: '560001',
          country: cust.country,
          is_default: true
        };
        await addAddress(customer_id as string, defaultAddr);
        addresses = await getAddresses(customer_id as string);
      }
    }
    
    return res.json({ success: true, addresses });
  } catch (error: any) {
    console.error('[API Error] Fetching addresses failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/checkout/addresses
router.post('/addresses', async (req: Request, res: Response) => {
  try {
    const { customer_id, address_type, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default, session_id } = req.body;
    if (!customer_id || !full_name || !phone || !address_line_1 || !city || !state || !postal_code) {
      return res.status(400).json({ success: false, error: 'Missing required address fields.' });
    }

    await addAddress(customer_id, {
      address_type,
      full_name,
      phone,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      is_default
    });

    return res.json({ success: true, message: 'Address added successfully' });
  } catch (error: any) {
    console.error('[API Error] Creating address failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/checkout/log-address-selected
router.post('/log-address-selected', (req: Request, res: Response) => {
  const { session_id, customer_id, address_id, city, state } = req.body;
  if (!session_id || !customer_id || !address_id) {
    return res.status(400).json({ success: false, error: 'Missing required tracking fields.' });
  }

  EventLogger.logEvent({
    event_type: 'address_selected',
    session_id,
    customer_id,
    user_type: 'registered',
    page: 'checkout',
    metadata: {
      address_id,
      shipping_address: {
        address_id,
        city,
        state,
        country: 'India'
      }
    }
  });

  return res.json({ success: true });
});

// GET /api/checkout/delivery-options
router.get('/delivery-options', async (req: Request, res: Response) => {
  try {
    const options = await getDeliveryOptions();
    return res.json({ success: true, options });
  } catch (error: any) {
    console.error('[API Error] Fetching delivery options failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/checkout/log-delivery-selected
router.post('/log-delivery-selected', (req: Request, res: Response) => {
  const { session_id, customer_id, delivery_option, delivery_fee, estimated_days } = req.body;
  if (!session_id || !customer_id) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  EventLogger.logEvent({
    event_type: 'delivery_option_selected',
    session_id,
    customer_id,
    user_type: 'registered',
    page: 'checkout',
    metadata: {
      delivery_option,
      delivery_fee,
      estimated_days
    }
  });

  return res.json({ success: true });
});

// POST /api/checkout/log-payment-method-selected
router.post('/log-payment-method-selected', (req: Request, res: Response) => {
  const { session_id, customer_id, payment_method } = req.body;
  if (!session_id || !customer_id || !payment_method) {
    return res.status(400).json({ success: false, error: 'Missing fields.' });
  }

  EventLogger.logEvent({
    event_type: 'payment_method_selected',
    session_id,
    customer_id,
    user_type: 'registered',
    page: 'checkout',
    metadata: {
      payment_method
    }
  });

  return res.json({ success: true });
});

// POST /api/checkout/place-order
router.post('/place-order', async (req: Request, res: Response) => {
  try {
    const { session_id, customer_id, address_id, delivery_option_id, payment_method, simulateFail } = req.body;
    if (!session_id || !customer_id || !address_id || !delivery_option_id || !payment_method) {
      return res.status(400).json({ success: false, error: 'Missing checkout parameters.' });
    }

    const result = await createOrderAndPayment(
      session_id,
      customer_id,
      address_id,
      delivery_option_id,
      payment_method,
      !!simulateFail
    );

    // Fetch address for shipping metadata enrichment
    const addr = await getAddressById(address_id);
    const shippingAddress = {
      address_id,
      city: addr?.city || 'Bengaluru',
      state: addr?.state || 'Karnataka',
      country: addr?.country || 'India'
    };

    // Log payment_initiated (CUSTOMER, website)
    EventLogger.logEvent({
      event_type: 'payment_initiated',
      event_version: 1,
      event_source: 'website',
      actor_type: 'CUSTOMER',
      session_id,
      customer_id,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'payment',
      entity: {
        cart_id: result.cart_id,
        payment_id: result.payment_id,
        order_id: result.order_id
      },
      metadata: {
        attempt_number: 1,
        payment_method,
        amount: result.total_amount,
        currency: 'INR'
      }
    });

    if (result.payment_status === 'PAID' || (payment_method === 'COD' && result.payment_status === 'PENDING')) {
      // 1. payment_success (SYSTEM, payment_service)
      if (payment_method !== 'COD') {
        EventLogger.logEvent({
          event_type: 'payment_success',
          event_version: 1,
          event_source: 'payment_service',
          actor_type: 'SYSTEM',
          session_id,
          customer_id,
          user_type: customer_id ? 'registered' : 'guest',
          page: null,
          entity: {
            order_id: result.order_id,
            payment_id: result.payment_id,
            cart_id: result.cart_id
          },
          metadata: {
            attempt_id: result.attempt_id,
            attempt_number: 1,
            payment_method,
            amount: result.total_amount,
            currency: 'INR'
          }
        });
      }

      // 2. order_created (SYSTEM, order_service)
      EventLogger.logEvent({
        event_type: 'order_created',
        event_version: 1,
        event_source: 'order_service',
        actor_type: 'SYSTEM',
        session_id,
        customer_id,
        user_type: customer_id ? 'registered' : 'guest',
        page: null,
        entity: {
          order_id: result.order_id,
          payment_id: result.payment_id,
          cart_id: result.cart_id || 'CART-UNKNOWN'
        },
        metadata: {
          total_amount: result.total_amount,
          payment_method,
          payment_status: payment_method === 'COD' ? 'PENDING' : 'SUCCESS',
          shipping_address: shippingAddress
        }
      });

      // 3. invoice_generated (SYSTEM, billing_service)
      EventLogger.logEvent({
        event_type: 'invoice_generated',
        event_version: 1,
        event_source: 'billing_service',
        actor_type: 'SYSTEM',
        session_id,
        customer_id,
        user_type: customer_id ? 'registered' : 'guest',
        page: null,
        entity: {
          order_id: result.order_id,
          payment_id: result.payment_id
        },
        metadata: {
          total_amount: result.total_amount,
          currency: 'INR'
        }
      });

      // 4. notification_created (SYSTEM, notification_service)
      EventLogger.logEvent({
        event_type: 'notification_created',
        event_version: 1,
        event_source: 'notification_service',
        actor_type: 'SYSTEM',
        session_id,
        customer_id,
        user_type: customer_id ? 'registered' : 'guest',
        page: null,
        entity: {
          order_id: result.order_id
        },
        metadata: {
          type: 'ORDER_CONFIRMED',
          channel: 'EMAIL'
        }
      });

      return res.json({ success: true, result });
    } else {
      // payment_failed (SYSTEM, payment_service)
      EventLogger.logEvent({
        event_type: 'payment_failed',
        event_version: 1,
        event_source: 'payment_service',
        actor_type: 'SYSTEM',
        session_id,
        customer_id,
        user_type: customer_id ? 'registered' : 'guest',
        page: null,
        entity: {
          order_id: result.order_id,
          payment_id: result.payment_id
        },
        metadata: {
          attempt_id: result.attempt_id,
          attempt_number: 1,
          payment_method,
          amount: result.total_amount,
          currency: 'INR',
          failure_reason: result.failure_reason || 'BANK_DECLINED'
        }
      });

      return res.status(402).json({ 
        success: false, 
        error: 'Payment simulated failure: Transaction declined.',
        result
      });
    }
  } catch (error: any) {
    console.error('[API Error] Placing order failed:', error);
    if (error.message.startsWith('PRICE_CHANGED')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    if (error.message.startsWith('Insufficient inventory')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

// POST /api/checkout/retry-payment
router.post('/retry-payment', async (req: Request, res: Response) => {
  try {
    const { order_id, payment_method, simulateFail, session_id, customer_id, address_id } = req.body;
    if (!order_id || !payment_method || !session_id || !customer_id) {
      return res.status(400).json({ success: false, error: 'Missing retry parameters.' });
    }

    const result = await retryOrderPayment(order_id, payment_method, !!simulateFail);

    // Payment Retry initiated (CUSTOMER, website)
    EventLogger.logEvent({
      event_type: 'payment_retry',
      event_version: 1,
      event_source: 'website',
      actor_type: 'CUSTOMER',
      session_id,
      customer_id,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'payment',
      entity: {
        order_id,
        payment_id: result.payment_id
      },
      metadata: {
        new_attempt_number: result.attempt_number,
        payment_method
      }
    });

    if (result.payment_status === 'PAID') {
      // payment_success (SYSTEM, payment_service)
      EventLogger.logEvent({
        event_type: 'payment_success',
        event_version: 1,
        event_source: 'payment_service',
        actor_type: 'SYSTEM',
        session_id,
        customer_id,
        user_type: customer_id ? 'registered' : 'guest',
        page: null,
        entity: {
          order_id,
          payment_id: result.payment_id
        },
        metadata: {
          attempt_id: result.attempt_id,
          attempt_number: result.attempt_number,
          payment_method,
          amount: result.total_amount,
          currency: 'INR'
        }
      });

      // order_created (SYSTEM, order_service)
      EventLogger.logEvent({
        event_type: 'order_created',
        event_version: 1,
        event_source: 'order_service',
        actor_type: 'SYSTEM',
        session_id,
        customer_id,
        user_type: customer_id ? 'registered' : 'guest',
        page: null,
        entity: {
          order_id,
          payment_id: result.payment_id
        },
        metadata: {
          total_amount: result.total_amount,
          payment_method,
          payment_status: 'SUCCESS'
        }
      });

      return res.json({ success: true, result });
    } else {
      // payment_failed (SYSTEM, payment_service)
      EventLogger.logEvent({
        event_type: 'payment_failed',
        event_version: 1,
        event_source: 'payment_service',
        actor_type: 'SYSTEM',
        session_id,
        customer_id,
        user_type: customer_id ? 'registered' : 'guest',
        page: null,
        entity: {
          order_id,
          payment_id: result.payment_id
        },
        metadata: {
          attempt_id: result.attempt_id,
          attempt_number: result.attempt_number,
          payment_method,
          amount: result.total_amount,
          currency: 'INR',
          failure_reason: result.failure_reason || 'BANK_DECLINED'
        }
      });

      return res.status(402).json({ 
        success: false, 
        error: 'Payment simulated retry failure: Transaction declined.',
        result
      });
    }
  } catch (error: any) {
    console.error('[API Error] Retrying payment failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

// GET /api/checkout/orders
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      return res.status(400).json({ success: false, error: 'customer_id is required' });
    }
    const orders = await getOrdersByCustomerId(customer_id as string);
    return res.json({ success: true, orders });
  } catch (error: any) {
    console.error('[API Error] Fetching customer orders history failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
