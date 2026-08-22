import { Router } from 'express';
import { 
  getAdminOrdersList, 
  getAdminOrderDetail, 
  updateAdminOrderStatus, 
  cancelAdminOrder 
} from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';

const router = Router();

// GET all orders
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const state = (req.query.state as string) || '';
    const city = (req.query.city as string) || '';
    const payment = (req.query.payment as string) || '';

    const orders = await getAdminOrdersList({ search, status, state, city, payment });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET specific order details
router.get('/:orderId', adminAuth, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const order = await getAdminOrderDetail(orderId);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update order status
router.put('/update-status/:orderId', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { orderId } = req.params;
    const { status, reason } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const success = await updateAdminOrderStatus(
      orderId,
      status,
      reason || 'Operational update',
      admin.admin_id
    );

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Order not found or update failed.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST cancel order
router.post('/cancel/:orderId', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { orderId } = req.params;
    const { reason } = req.body;

    const success = await cancelAdminOrder(
      orderId,
      reason || 'Cancelled by Admin',
      admin.admin_id
    );

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Order not found or cancellation failed.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
