import { Router } from 'express';
import { 
  getAdminWarehousesList, 
  getWarehouseDetail, 
  getWarehouseInventory, 
  getWarehouseAnalytics,
  createAdminWarehouse 
} from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';

const router = Router();

// GET all warehouses
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const search = (req.query.search as string) || '';
    const warehouses = await getAdminWarehousesList(search);
    res.json(warehouses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create warehouse
router.post('/', adminAuth, async (req: any, res) => {
  try {
    const wh = await createAdminWarehouse(req.body);
    res.json(wh);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single warehouse details
router.get('/:warehouseId', adminAuth, async (req: any, res) => {
  try {
    const { warehouseId } = req.params;
    const wh = await getWarehouseDetail(warehouseId);
    if (!wh) {
      return res.status(404).json({ error: 'Warehouse not found.' });
    }
    res.json(wh);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET warehouse inventory
router.get('/:warehouseId/inventory', adminAuth, async (req: any, res) => {
  try {
    const { warehouseId } = req.params;
    const inventory = await getWarehouseInventory(warehouseId);
    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET warehouse analytics
router.get('/:warehouseId/analytics', adminAuth, async (req: any, res) => {
  try {
    const { warehouseId } = req.params;
    const analytics = await getWarehouseAnalytics(warehouseId);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
