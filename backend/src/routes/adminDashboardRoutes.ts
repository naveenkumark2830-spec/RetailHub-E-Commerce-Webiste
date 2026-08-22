import express from 'express';
import { getAdminDashboardMetrics } from '../config/db';
import { adminAuth } from '../middleware/adminMiddleware';
import { EventLogger } from '../services/eventLogger';

const router = express.Router();

// GET /api/admin/dashboard (Secured by adminAuth)
router.get('/', adminAuth, async (req: any, res) => {
  try {
    const adminId = req.admin?.admin_id || 'UNKNOWN';
    const roleId = req.admin?.role_id || 'ANALYST';

    // Log admin_dashboard_viewed telemetry
    EventLogger.logEvent({
      event_type: 'admin_dashboard_viewed',
      session_id: req.headers.authorization || 'unknown_admin_session',
      customer_id: '',
      user_type: 'registered',
      page: 'admin_dashboard',
      context: {
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        admin_id: adminId,
        role: roleId
      }
    });

    const metrics = await getAdminDashboardMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
