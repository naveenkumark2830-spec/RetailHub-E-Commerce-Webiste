import express from 'express';
import { 
  getCustomerNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '../config/db';
import { EventLogger } from '../services/eventLogger';
import { dbPool } from '../config/db';

const router = express.Router();

// GET all notifications for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const notifications = await getCustomerNotifications(customerId);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST mark a notification as read
router.post('/customer/:customerId/read/:notificationId', async (req, res) => {
  try {
    const { customerId, notificationId } = req.params;
    const { sessionId } = req.body;
    const success = await markNotificationRead(notificationId, customerId, sessionId || 'sess_notif_read');
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST mark all notifications as read
router.post('/customer/:customerId/read-all', async (req, res) => {
  try {
    const { customerId } = req.params;
    await markAllNotificationsRead(customerId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST log notification clicked event
router.post('/log-click', async (req, res) => {
  try {
    const { customerId, sessionId, notificationId, notificationType, referenceType, referenceId } = req.body;

    // Fetch customer context for click enrichment
    let country = 'India';
    let state = 'Karnataka';
    let city = 'Bengaluru';

    if (dbPool) {
      const [custRows]: any = await dbPool.query('SELECT country, state, city FROM customers WHERE customer_id = ?', [customerId]);
      if (custRows.length > 0) {
        country = custRows[0].country;
        state = custRows[0].state;
        city = custRows[0].city;
      }
    }

    EventLogger.logEvent({
      event_type: 'notification_clicked',
      session_id: sessionId || 'sess_notif_click',
      customer_id: customerId,
      user_type: 'registered',
      page: 'notifications',
      context: {
        country,
        state,
        city,
        device: 'desktop',
        browser: 'Chrome'
      },
      metadata: {
        notification_id: notificationId,
        notification_type: notificationType,
        reference_type: referenceType,
        reference_id: referenceId
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
