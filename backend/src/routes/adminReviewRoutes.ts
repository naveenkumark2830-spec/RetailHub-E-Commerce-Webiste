import { Router } from 'express';
import { 
  getAdminReviewsList, 
  getAdminReviewDetail, 
  updateAdminReviewStatus, 
  getReviewAnalytics 
} from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';

const router = Router();

// GET all reviews
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const search = (req.query.search as string) || '';
    const rating = (req.query.rating as string) || '';
    const status = (req.query.status as string) || '';
    const reviews = await getAdminReviewsList(search, rating, status);
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET review analytics
router.get('/analytics', adminAuth, async (req: any, res) => {
  try {
    const analytics = await getReviewAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single review details
router.get('/:reviewId', adminAuth, async (req: any, res) => {
  try {
    const { reviewId } = req.params;
    const review = await getAdminReviewDetail(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    res.json(review);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update review status
router.put('/:reviewId/status', adminAuth, async (req: any, res) => {
  try {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    const { reviewId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const success = await updateAdminReviewStatus(reviewId, status, admin.admin_id);
    if (success) {
      res.json({ success: true, message: `Review status updated to ${status} successfully.` });
    } else {
      res.status(404).json({ error: 'Review record not found.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
