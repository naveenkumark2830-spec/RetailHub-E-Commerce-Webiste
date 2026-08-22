import { Router } from 'express';
import { 
  getAdminCouponsList, 
  createAdminCoupon, 
  deactivateAdminCoupon, 
  getCouponAnalytics 
} from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';

const router = Router();

// GET all coupons
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const coupons = await getAdminCouponsList(search, status);
    res.json(coupons);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET coupon analytics
router.get('/analytics', adminAuth, async (req: any, res) => {
  try {
    const analytics = await getCouponAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new coupon
router.post('/create', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { code, discount_type, discount_value, minimum_order_value, maximum_discount, start_date, end_date, usage_limit, status } = req.body;
    if (!code || !discount_type || discount_value === undefined || !start_date || !end_date) {
      return res.status(400).json({ error: 'Code, discount type, value, start, and end dates are required.' });
    }

    const result = await createAdminCoupon(
      { code, discount_type, discount_value, minimum_order_value, maximum_discount, start_date, end_date, usage_limit, status },
      admin.admin_id
    );

    if (result) {
      res.status(201).json({ success: true, coupon: result });
    } else {
      res.status(500).json({ error: 'Failed to create coupon record.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT deactivate coupon
router.put('/:couponId/deactivate', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    const { couponId } = req.params;
    const success = await deactivateAdminCoupon(couponId, admin.admin_id);
    if (success) {
      res.json({ success: true, message: 'Coupon deactivated successfully.' });
    } else {
      res.status(404).json({ error: 'Coupon record not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
