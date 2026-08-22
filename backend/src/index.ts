import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { initDb } from './config/db';
import sessionRoutes from './routes/sessionRoutes';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import checkoutRoutes from './routes/checkoutRoutes';
import eventRoutes from './routes/eventRoutes';
import trackingRoutes from './routes/trackingRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import returnRoutes from './routes/returnRoutes';
import reviewRoutes from './routes/reviewRoutes';
import profileRoutes from './routes/profileRoutes';
import addressRoutes from './routes/addressRoutes';
import notificationRoutes from './routes/notificationRoutes';
import helpSupportRoutes from './routes/helpSupportRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import adminProductRoutes from './routes/adminProductRoutes';
import adminCategoryRoutes from './routes/adminCategoryRoutes';
import adminInventoryRoutes from './routes/adminInventoryRoutes';
import adminOrderRoutes from './routes/adminOrderRoutes';
import adminCustomerRoutes from './routes/adminCustomerRoutes';
import adminReviewRoutes from './routes/adminReviewRoutes';
import adminCouponRoutes from './routes/adminCouponRoutes';
import adminWarehouseRoutes from './routes/adminWarehouseRoutes';
import adminEventRoutes from './routes/adminEventRoutes';
import adminSimulatorRoutes from './routes/adminSimulatorRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/help', helpSupportRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/coupons', adminCouponRoutes);
app.use('/api/admin/warehouses', adminWarehouseRoutes);
app.use('/api/admin/events', adminEventRoutes);
app.use('/api/admin/simulator', adminSimulatorRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ message: 'NexDay API Server running', version: '1.0.0' });
});

// Serve Frontend Static Files & SPA fallback
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[NexDay Server] Single unified server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[NexDay Server Startup Error]', err);
});
