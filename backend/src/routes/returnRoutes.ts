import { Router, Request, Response } from 'express';
import { getReturnByOrderId, createReturnRequest, advanceReturnLifecycle, getOrdersByCustomerId } from '../config/db';
import mysqlPromise from 'mysql2/promise';

const router = Router();

// Helper to query direct MySQL connection for custom order items fetches
async function getOrderDetailsForReturn(orderId: string) {
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'retailhub'
  });
  
  try {
    const [orders]: any = await conn.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (orders.length === 0) return null;
    const order = orders[0];

    const [items]: any = await conn.query(
      `SELECT oi.*, p.name as product_name, p.sku, p.return_eligible, p.warranty
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const [addresses]: any = await conn.query('SELECT * FROM addresses WHERE address_id = ?', [order.address_id]);
    const address = addresses.length > 0 ? addresses[0] : null;

    return {
      order_id: order.order_id,
      customer_id: order.customer_id,
      status: order.status,
      delivery_status: order.delivery_status,
      subtotal: order.subtotal,
      discount: order.discount,
      coupon_discount: order.coupon_discount,
      shipping_fee: order.shipping_fee,
      tax: order.tax,
      total_amount: order.total_amount,
      created_at: order.created_at,
      payment_method: order.payment_method,
      address,
      items
    };
  } finally {
    await conn.end();
  }
}

// GET /api/returns/by-order/:orderId
router.get('/by-order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    // Check if a return already exists
    const activeReturn = await getReturnByOrderId(orderId);
    
    // Fetch full order details
    const orderDetails = await getOrderDetailsForReturn(orderId);
    if (!orderDetails) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    if (activeReturn) {
      return res.json({ 
        success: true, 
        returnExists: true, 
        activeReturn,
        orderDetails 
      });
    }

    return res.json({ 
      success: true, 
      returnExists: false, 
      orderDetails 
    });
  } catch (error: any) {
    console.error('[API Error] Fetch return status failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/returns/request
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { order_id, customer_id, return_reason, customer_comments, pickup_address_id, items } = req.body;

    if (!order_id || !customer_id || !return_reason || !pickup_address_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Missing required parameters.' });
    }

    const result = await createReturnRequest(
      order_id,
      customer_id,
      return_reason,
      customer_comments || null,
      pickup_address_id,
      items
    );

    return res.json({ success: true, result });
  } catch (error: any) {
    console.error('[API Error] Placing return request failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

// POST /api/returns/:returnId/simulate-step
router.post('/:returnId/simulate-step', async (req: Request, res: Response) => {
  try {
    const { returnId } = req.params;
    const { next_status, simulate_fail } = req.body;

    if (!next_status) {
      return res.status(400).json({ success: false, error: 'next_status parameter is required.' });
    }

    const result = await advanceReturnLifecycle(returnId, next_status, !!simulate_fail);
    return res.json({ success: true, result });
  } catch (error: any) {
    console.error('[API Error] Simulating return step failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

export default router;
