import { Router } from 'express';
import { getAdminInventoryList, adjustAdminInventory } from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';

const router = Router();

// GET all inventory levels
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const search = (req.query.search as string) || '';
    const warehouseId = (req.query.warehouseId as string) || '';
    const categoryId = (req.query.categoryId as string) || '';
    const statusFilter = (req.query.statusFilter as string) || '';

    const inventory = await getAdminInventoryList(search, warehouseId, categoryId, statusFilter);
    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST adjust inventory
router.post('/adjust', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { productId, warehouseId, amount, type, reason } = req.body;
    if (!productId || !warehouseId || amount === undefined || !type) {
      return res.status(400).json({ error: 'Missing required adjustment parameters.' });
    }

    const value = parseInt(amount);
    if (isNaN(value) || value < 0) {
      return res.status(400).json({ error: 'Adjustment amount must be a valid non-negative integer.' });
    }

    const success = await adjustAdminInventory(
      productId,
      warehouseId,
      value,
      type,
      reason || 'ADMIN_MANUAL_ADJUST',
      admin.admin_id
    );

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product SKU inventory record not found or adjustment failed.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
