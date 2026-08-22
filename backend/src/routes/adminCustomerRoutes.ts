import { Router } from 'express';
import { getAdminCustomersList, getAdminCustomer360, updateAdminCustomerStatus } from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';

const router = Router();

// GET all customers
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const search = (req.query.search as string) || '';
    const membership = (req.query.membership as string) || '';
    const country = (req.query.country as string) || '';
    const status = (req.query.status as string) || '';

    const customers = await getAdminCustomersList(search, membership, country, status);
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET customer 360 profile details
router.get('/360/:customerId', adminAuth, async (req: any, res) => {
  try {
    const { customerId } = req.params;
    const details = await getAdminCustomer360(customerId);
    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ error: 'Customer not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update customer status (suspend / activate)
router.put('/status/:customerId', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { customerId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const success = await updateAdminCustomerStatus(customerId, status, admin.admin_id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Customer not found or update failed.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
