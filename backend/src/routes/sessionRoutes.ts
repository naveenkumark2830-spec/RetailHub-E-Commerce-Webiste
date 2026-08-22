import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { saveSession, endSession, getCustomerById } from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = Router();

const CreateSessionSchema = z.object({
  user_type: z.enum(['guest', 'registered']).default('guest'),
  device: z.string().optional().default('desktop'),
  browser: z.string().optional().default('Chrome'),
});

const LogoutSessionSchema = z.object({
  session_id: z.string(),
});

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

// POST /api/sessions
router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = CreateSessionSchema.safeParse(req.body);
    const body = parseResult.success ? parseResult.data : { user_type: 'guest' as const, device: 'desktop', browser: 'Chrome' };
    
    const uaInfo = parseUserAgent(req.headers['user-agent']);
    const device = req.body?.device || uaInfo.device;
    const browser = req.body?.browser || uaInfo.browser;

    // Generate session ID as sess_<hex>
    const sessionId = `sess_${crypto.randomBytes(4).toString('hex')}`;
    const customerId = null; // Guests have customer_id = null
    const userType = body.user_type;
    const ipHash = crypto.createHash('sha256').update(req.ip || '127.0.0.1').digest('hex').substring(0, 16);

    // 1. Save session to MySQL operational database
    const savedRecord = await saveSession({
      session_id: sessionId,
      customer_id: customerId,
      session_type: userType,
      device,
      browser,
      ip_hash: ipHash,
    });

    const context = {
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      device,
      browser
    };

    // 2. Log event to JSONL file (Clickstream telemetry)
    const event = EventLogger.logEvent({
      event_type: 'session_started',
      session_id: sessionId,
      customer_id: customerId,
      user_type: userType,
      page: 'landing',
      device,
      browser,
      context,
      event_time: savedRecord.started_at.toISOString(),
      ingestion_time: savedRecord.started_at.toISOString(),
    });

    // Return session payload
    return res.status(201).json({
      success: true,
      session: {
        session_id: sessionId,
        customer_id: customerId,
        user_type: userType,
        device,
        browser,
        started_at: savedRecord.started_at.toISOString(),
      },
      event_logged: event,
    });
  } catch (error: any) {
    console.error('[API Error] Session creation failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/sessions/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const parseResult = LogoutSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload: session_id is required' });
    }

    const { session_id } = parseResult.data;

    // 1. Mark session as ended in operational database
    const endedRecord = await endSession(session_id);
    if (!endedRecord) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Resolve location
    let country = 'India';
    let state = 'Karnataka';
    let city = 'Bengaluru';
    if (endedRecord.customer_id) {
      const cust = await getCustomerById(endedRecord.customer_id);
      if (cust) {
        country = cust.country;
        state = cust.state;
        city = cust.city;
      }
    }

    const context = {
      country,
      state,
      city,
      device: endedRecord.device || 'desktop',
      browser: endedRecord.browser || 'Chrome'
    };

    // 2. Log event to JSONL file (session_ended telemetry)
    const event = EventLogger.logEvent({
      event_type: 'session_ended',
      session_id: endedRecord.session_id,
      customer_id: endedRecord.customer_id,
      user_type: endedRecord.session_type as 'guest' | 'registered',
      page: 'home',
      device: endedRecord.device,
      browser: endedRecord.browser,
      context,
      event_time: endedRecord.ended_at ? endedRecord.ended_at.toISOString() : new Date().toISOString(),
      ingestion_time: endedRecord.ended_at ? endedRecord.ended_at.toISOString() : new Date().toISOString(),
    });

    return res.json({
      success: true,
      session: {
        session_id: endedRecord.session_id,
        ended_at: endedRecord.ended_at ? endedRecord.ended_at.toISOString() : null,
      },
      event_logged: event,
    });
  } catch (error: any) {
    console.error('[API Error] Session termination failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/sessions/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
