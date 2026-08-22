import { Router, Request, Response } from 'express';
import { submitProductReview, getProductReviews } from '../config/db';

const router = Router();

// Helper to query direct MySQL connection for custom review exist checks
async function checkReviewExists(orderItemId: string): Promise<boolean> {
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'retailhub'
  });
  
  try {
    const [rows]: any = await conn.query('SELECT review_id FROM reviews WHERE order_item_id = ?', [orderItemId]);
    return rows.length > 0;
  } finally {
    await conn.end();
  }
}

// GET /api/reviews/product/:productId
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const result = await getProductReviews(productId);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[API Error] Fetch product reviews failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/reviews/order-item/:orderItemId
router.get('/order-item/:orderItemId', async (req: Request, res: Response) => {
  try {
    const { orderItemId } = req.params;
    const exists = await checkReviewExists(orderItemId);
    return res.json({ success: true, exists });
  } catch (error: any) {
    console.error('[API Error] Check review exists failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/reviews/add
router.post('/add', async (req: Request, res: Response) => {
  try {
    const { customer_id, order_id, order_item_id, product_id, rating, review_title, review_text, file_paths } = req.body;

    if (!customer_id || !order_id || !order_item_id || !product_id || !rating || !review_title || !review_text) {
      return res.status(400).json({ success: false, error: 'Missing required parameters.' });
    }

    // Submit review in database
    const result = await submitProductReview(
      customer_id,
      order_id,
      order_item_id,
      product_id,
      parseInt(rating, 10),
      review_title,
      review_text,
      file_paths || []
    );

    return res.json({ success: true, result });
  } catch (error: any) {
    console.error('[API Error] Placing customer review failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

export default router;
