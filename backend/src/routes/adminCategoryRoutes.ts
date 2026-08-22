import { Router } from 'express';
import { 
  getAdminCategoriesList, 
  createAdminCategory, 
  updateAdminCategory, 
  deactivateAdminCategory 
} from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';

const router = Router();

// GET all categories
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const search = (req.query.search as string) || '';
    const categories = await getAdminCategoriesList(search);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST register new category
router.post('/create', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin; // populated by adminAuth middleware
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { name, slug, description, image_url, display_order } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const result = await createAdminCategory(
      { name, slug, description, image_url, display_order },
      admin.admin_id
    );

    if (result) {
      res.status(201).json({ success: true, category: result });
    } else {
      res.status(500).json({ error: 'Failed to create category record.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update category details
router.put('/update/:catId', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { catId } = req.params;
    const { name, slug, description, image_url, display_order, status } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const success = await updateAdminCategory(
      catId,
      { name, slug, description, image_url, display_order, status },
      admin.admin_id
    );

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Category not found or update failed.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE deactivate category
router.delete('/deactivate/:catId', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { catId } = req.params;
    const success = await deactivateAdminCategory(catId, admin.admin_id);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Category not found or deactivation failed.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
