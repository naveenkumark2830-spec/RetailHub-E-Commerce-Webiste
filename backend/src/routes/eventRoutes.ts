import { Router, Request, Response } from 'express';
import { EventLogger } from '../services/eventLogger';
import { getCustomerById } from '../config/db';

const router = Router();

function parseUserAgent(ua?: string): { device: string; browser: string } {
  if (!ua) return { device: 'desktop', browser: 'Chrome' };
  let device = 'desktop';
  if (/mobile|android|iphone|ipad/i.test(ua)) device = 'mobile';
  if (/tablet|ipad/i.test(ua)) device = 'tablet';

  let browser = 'Chrome';
  if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';

  return { device, browser };
}

// POST /api/events
router.post('/', async (req: Request, res: Response) => {
  try {
    const { event_type, session_id, customer_id, page, device, browser, metadata } = req.body;
    if (!event_type || !session_id) {
      return res.status(400).json({ success: false, error: 'event_type and session_id are required' });
    }

    const uaInfo = parseUserAgent(req.headers['user-agent'] as string);
    const clientDevice = device || uaInfo.device;
    const clientBrowser = browser || uaInfo.browser;

    // Resolve location dimensions
    let country = 'India';
    let state = 'Karnataka';
    let city = 'Bengaluru';

    if (customer_id) {
      const cust = await getCustomerById(customer_id);
      if (cust) {
        country = cust.country;
        state = cust.state;
        city = cust.city;
      }
    }

    const clientDeviceId = (req.headers['x-device-id'] as string) || req.body.device_id || `DEV-FP-${req.ip || '127.0.0.1'}`;
    const clientIpAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const context = {
      country,
      state,
      city,
      device: clientDevice,
      browser: clientBrowser,
      device_id: clientDeviceId,
      ip_address: clientIpAddress
    };

    // Log the event directly to the JSONL clickstream file
    EventLogger.logEvent({
      event_type,
      session_id,
      customer_id: customer_id || null,
      user_type: customer_id ? 'registered' : 'guest',
      page: page || 'home',
      device: clientDevice,
      browser: clientBrowser,
      context,
      metadata: metadata || {}
    });

    return res.json({ success: true, message: 'Event logged successfully' });
  } catch (error: any) {
    console.error('[API Error] Logging client event failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
