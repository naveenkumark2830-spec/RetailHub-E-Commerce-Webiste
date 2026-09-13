import { Router, Request, Response } from 'express';
import { 
  getCustomerAddresses, 
  saveCustomerAddress, 
  updateCustomerAddress, 
  deleteCustomerAddress, 
  setDefaultAddress 
} from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = Router();

// GET /api/addresses/customer/:customerId
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const addresses = await getCustomerAddresses(customerId);
    return res.json({ success: true, addresses });
  } catch (error: any) {
    console.error('[API Error] Fetch customer addresses failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/addresses/customer/:customerId/add
router.post('/customer/:customerId/add', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { addressData, session_id } = req.body;

    if (!addressData || !session_id) {
      return res.status(400).json({ success: false, error: 'Missing address data or session_id.' });
    }

    const newAddress = await saveCustomerAddress(customerId, addressData, session_id);
    return res.status(201).json({ success: true, address: newAddress });
  } catch (error: any) {
    console.error('[API Error] Add customer address failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/addresses/customer/:customerId/update/:addressId
router.post('/customer/:customerId/update/:addressId', async (req: Request, res: Response) => {
  try {
    const { customerId, addressId } = req.params;
    const { addressData, session_id } = req.body;

    if (!addressData || !session_id) {
      return res.status(400).json({ success: false, error: 'Missing address data or session_id.' });
    }

    const updatedAddress = await updateCustomerAddress(customerId, addressId, addressData, session_id);
    return res.json({ success: true, address: updatedAddress });
  } catch (error: any) {
    console.error('[API Error] Update customer address failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/addresses/customer/:customerId/delete/:addressId
router.post('/customer/:customerId/delete/:addressId', async (req: Request, res: Response) => {
  try {
    const { customerId, addressId } = req.params;
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ success: false, error: 'Missing session_id.' });
    }

    const success = await deleteCustomerAddress(customerId, addressId, session_id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Address not found or delete failed.' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[API Error] Delete customer address failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/addresses/customer/:customerId/set-default/:addressId
router.post('/customer/:customerId/set-default/:addressId', async (req: Request, res: Response) => {
  try {
    const { customerId, addressId } = req.params;
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ success: false, error: 'Missing session_id.' });
    }

    const success = await setDefaultAddress(customerId, addressId, session_id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Address not found or action failed.' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[API Error] Set default address failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/addresses/select-event
router.post('/select-event', async (req: Request, res: Response) => {
  try {
    const { customer_id, session_id, address_id, address_type, cart_id } = req.body;
    
    if (!session_id || !address_id) {
      return res.status(400).json({ success: false, error: 'Missing session_id or address_id.' });
    }

    EventLogger.logEvent({
      event_type: 'address_selected',
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: 'checkout',
      context: {
        country: 'IN',
        state: 'Karnataka',
        city: 'Bengaluru',
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        address_id,
        cart_id: cart_id || null,
        address_type: address_type || 'HOME'
      }
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[API Error] Log address select telemetry failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
