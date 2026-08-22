import express from 'express';
import { 
  getAdminProductsList, 
  createAdminProduct, 
  updateAdminProduct, 
  deactivateAdminProduct 
} from '../config/db';
import { adminAuth, hasPermission } from '../middleware/adminMiddleware';

const router = express.Router();

// GET /api/admin/products (List all products with search & filters)
router.get('/', adminAuth, async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const status = (req.query.status as string) || '';

    const products = await getAdminProductsList(search, category, status);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/products/create (Create new product - requires PRODUCT_CREATE)
router.post('/create', adminAuth, hasPermission('PRODUCT_CREATE'), async (req: any, res) => {
  try {
    const adminId = req.admin.admin_id;
    const productData = req.body;

    if (!productData.name || !productData.price || !productData.category_id) {
      return res.status(400).json({ error: 'Please enter product Name, Price, and Category ID.' });
    }

    const result = await createAdminProduct(productData, adminId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/products/update/:productId (Update existing product - requires PRODUCT_UPDATE)
router.put('/update/:productId', adminAuth, hasPermission('PRODUCT_UPDATE'), async (req: any, res) => {
  try {
    const adminId = req.admin.admin_id;
    const { productId } = req.params;
    const productData = req.body;

    const success = await updateAdminProduct(productId, productData, adminId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product profile not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/products/deactivate/:productId (Deactivate product - requires PRODUCT_DELETE)
router.delete('/deactivate/:productId', adminAuth, hasPermission('PRODUCT_DELETE'), async (req: any, res) => {
  try {
    const adminId = req.admin.admin_id;
    const { productId } = req.params;

    const success = await deactivateAdminProduct(productId, adminId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product profile not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
