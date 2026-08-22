import { Router, Request, Response } from 'express';
import { getCustomerById, updateCustomerProfile, cancelCustomerOrder, dbPool } from '../config/db';
import { EventLogger } from '../services/eventLogger';
import bcrypt from 'bcryptjs';

const router = Router();

// POST /api/profile/log-view
router.post('/log-view', async (req: Request, res: Response) => {
  try {
    const { customer_id, session_id, section } = req.body;
    if (!customer_id || !session_id) {
      return res.status(400).json({ success: false, error: 'Missing customer_id or session_id.' });
    }

    const customer = await getCustomerById(customer_id);

    EventLogger.logEvent({
      event_type: 'profile_viewed',
      session_id,
      customer_id,
      user_type: 'registered',
      page: 'profile',
      context: {
        country: customer?.country || 'India',
        state: customer?.state || 'Karnataka',
        city: customer?.city || 'Bengaluru',
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        section: section || 'personal_information'
      }
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[API Error] Log profile view failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/profile/:customerId
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const customer = await getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    const { password_hash, ...profile } = customer;
    return res.json({ success: true, customer: profile });
  } catch (error: any) {
    console.error('[API Error] Fetch profile failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/profile/:customerId/update
router.post('/:customerId/update', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { fields, session_id } = req.body;

    if (!fields || !session_id) {
      return res.status(400).json({ success: false, error: 'Missing update fields or session_id.' });
    }

    const updatedProfile = await updateCustomerProfile(customerId, fields, session_id);
    if (!updatedProfile) {
      return res.status(404).json({ success: false, error: 'Customer profile not found or update failed.' });
    }

    const { password_hash, ...profile } = updatedProfile;
    return res.json({ success: true, customer: profile });
  } catch (error: any) {
    console.error('[API Error] Update profile failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/profile/:customerId/orders/:orderId/cancel
router.post('/:customerId/orders/:orderId/cancel', async (req: Request, res: Response) => {
  try {
    const { customerId, orderId } = req.params;
    const { reason, session_id } = req.body;

    if (!reason || !session_id) {
      return res.status(400).json({ success: false, error: 'Cancellation reason and session_id are required.' });
    }

    const result = await cancelCustomerOrder(customerId, orderId, reason, session_id);
    return res.json({ success: true, result });
  } catch (error: any) {
    console.error('[API Error] Order cancellation failed:', error);
    return res.status(400).json({ success: false, error: error.message || 'Cancellation failed.' });
  }
});

// POST /api/profile/:customerId/change-password
router.post('/:customerId/change-password', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { currentPassword, newPassword, session_id } = req.body;

    if (!currentPassword || !newPassword || !session_id) {
      return res.status(400).json({ success: false, error: 'Current password, new password, and session_id are required.' });
    }

    const customer = await getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, customer.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await dbPool!.query('UPDATE customers SET password_hash = ? WHERE customer_id = ?', [newHash, customerId]);

    EventLogger.logEvent({
      event_type: 'profile_updated',
      session_id,
      customer_id: customerId,
      user_type: 'registered',
      page: 'profile',
      context: {
        country: customer.country,
        state: customer.state,
        city: customer.city,
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        updated_sections: ['security']
      }
    });

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error: any) {
    console.error('[API Error] Change password failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/profile/:customerId/update-membership
router.post('/:customerId/update-membership', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { membership, session_id } = req.body;

    if (!membership || !session_id) {
      return res.status(400).json({ success: false, error: 'Membership level and session_id are required.' });
    }

    const customer = await getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    await dbPool!.query('UPDATE customers SET membership = ? WHERE customer_id = ?', [membership, customerId]);

    const updatedCustomer = await getCustomerById(customerId);

    // Log membership_changed event
    EventLogger.logEvent({
      event_type: 'membership_changed',
      session_id,
      customer_id: customerId,
      user_type: 'registered',
      page: 'profile',
      context: {
        country: customer.country,
        state: customer.state,
        city: customer.city,
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        previous_membership: customer.membership,
        new_membership: membership
      }
    });

    if (!updatedCustomer) {
      return res.status(404).json({ success: false, error: 'Updated customer not found.' });
    }
    const { password_hash, ...profile } = updatedCustomer;
    return res.json({ success: true, customer: profile });
  } catch (error: any) {
    console.error('[API Error] Update membership failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/profile/:customerId/update-payment-preference
router.post('/:customerId/update-payment-preference', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { preferred_payment, session_id } = req.body;

    if (!preferred_payment || !session_id) {
      return res.status(400).json({ success: false, error: 'Preferred payment and session_id are required.' });
    }

    const customer = await getCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    await dbPool!.query('UPDATE customers SET preferred_payment = ? WHERE customer_id = ?', [preferred_payment, customerId]);

    const updatedCustomer = await getCustomerById(customerId);

    // Log preferences_updated event
    EventLogger.logEvent({
      event_type: 'preferences_updated',
      session_id,
      customer_id: customerId,
      user_type: 'registered',
      page: 'profile',
      context: {
        country: customer.country,
        state: customer.state,
        city: customer.city,
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        updated_sections: ['preferred_payment']
      }
    });

    if (!updatedCustomer) {
      return res.status(404).json({ success: false, error: 'Updated customer not found.' });
    }
    const { password_hash, ...profile } = updatedCustomer;
    return res.json({ success: true, customer: profile });
  } catch (error: any) {
    console.error('[API Error] Update payment preference failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
