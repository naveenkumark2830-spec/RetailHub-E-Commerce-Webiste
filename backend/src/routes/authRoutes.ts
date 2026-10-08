import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import { 
  saveCustomer, 
  getCustomerByEmail, 
  getCustomerById, 
  linkSessionToCustomer,
  mergeCarts,
  endSession,
  mergeWishlists,
  getCustomerSecurity,
  checkAndReleaseExpiredRestrictions,
  isEmailOrPhoneBanned
} from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexday_super_secret_key_12345';

const RegisterSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
  date_of_birth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  country: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  language: z.string().default('English'),
  session_id: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  session_id: z.string().optional(),
});

interface AuthRequest extends Request {
  userId?: string;
}

// Middleware to verify JWT cookie
export function authMiddleware(req: AuthRequest, res: Response, next: () => void) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    }

    const data = parseResult.data;

    // Check if email or phone is permanently banned
    const isBanned = await isEmailOrPhoneBanned(data.email, data.phone);
    if (isBanned) {
      return res.status(403).json({
        success: false,
        error: 'This email address or phone number is permanently banned from RetailHub. Registration denied.'
      });
    }

    // Check if email already registered
    const existingCustomer = await getCustomerByEmail(data.email);
    if (existingCustomer) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const customerId = `CUST${crypto.randomInt(10000, 99999)}`;
    const passwordHash = await bcrypt.hash(data.password, 10);

    const newCustomer = await saveCustomer({
      customer_id: customerId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      password_hash: passwordHash,
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      country: data.country,
      state: data.state,
      city: data.city,
      language: data.language,
      membership: 'Standard',
      preferred_payment: 'UPI',
      account_status: 'ACTIVE',
    });

    const sessionId = data.session_id || `sess_${crypto.randomBytes(4).toString('hex')}`;
    
    // Link guest session to customer
    await linkSessionToCustomer(sessionId, customerId);
    
    // Merge guest cart to customer account cart
    await mergeCarts(sessionId, customerId);

    // Merge guest wishlist to customer wishlist
    await mergeWishlists(sessionId, customerId);

    // Telemetry Registration Event
    EventLogger.logEvent({
      event_type: 'customer_registered',
      session_id: sessionId,
      customer_id: customerId,
      user_type: 'registered',
      page: 'register',
      device: 'desktop',
      browser: 'Chrome',
      metadata: {
        country: data.country,
        state: data.state,
        city: data.city,
        membership: 'Standard',
      }
    });

    // Create JWT token and set in cookie
    const token = jwt.sign({ userId: customerId }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set secure=false to support localhost HTTP testing
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { password_hash, ...profile } = newCustomer;
    return res.status(201).json({ success: true, customer: profile });
  } catch (error: any) {
    console.error('[Auth API Error] Registration failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const sessionId = req.body.session_id || `sess_${crypto.randomBytes(4).toString('hex')}`;
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      // Failed login telemetry: Bad schema
      EventLogger.logEvent({
        event_type: 'login_failed',
        session_id: sessionId,
        customer_id: null,
        user_type: 'guest',
        page: 'login',
        metadata: { reason: 'invalid_payload' }
      });
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const { email, password } = parseResult.data;

    const customer = await getCustomerByEmail(email);
    console.log(`[Auth Login Attempt] email: "${email}" | customerFound: ${!!customer}`);
    
    if (!customer) {
      // Failed login telemetry: User not found
      EventLogger.logEvent({
        event_type: 'login_failed',
        session_id: sessionId,
        customer_id: null,
        user_type: 'guest',
        page: 'login',
        metadata: { reason: 'invalid_credentials' }
      });
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, customer.password_hash);
    console.log(`[Auth Login Attempt] email: "${email}" | bcryptMatch: ${isMatch}`);

    if (!isMatch) {
      // Failed login telemetry: Bad password
      EventLogger.logEvent({
        event_type: 'login_failed',
        session_id: sessionId,
        customer_id: null,
        user_type: 'guest',
        page: 'login',
        metadata: { reason: 'invalid_credentials' }
      });
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Check FraudGuard account & security status
    await checkAndReleaseExpiredRestrictions();
    const secState = await getCustomerSecurity(customer.customer_id);
    const accountStatus = String(customer.account_status || secState?.account_status || 'ACTIVE').toUpperCase();
    const securityStatus = String(secState?.security_status || 'NORMAL').toUpperCase();

    if (accountStatus === 'BANNED' || securityStatus === 'BANNED') {
      EventLogger.logEvent({
        event_type: 'login_failed',
        session_id: sessionId,
        customer_id: customer.customer_id,
        user_type: 'registered',
        page: 'login',
        metadata: { reason: 'account_banned' }
      });
      return res.status(403).json({
        success: false,
        error: 'Your account has been permanently banned due to severe fraud policy violations.',
        account_status: 'BANNED',
        customer_id: customer.customer_id
      });
    }

    if (accountStatus === 'DEACTIVATED' || securityStatus === 'DEACTIVATED') {
      EventLogger.logEvent({
        event_type: 'login_failed',
        session_id: sessionId,
        customer_id: customer.customer_id,
        user_type: 'registered',
        page: 'login',
        metadata: { reason: 'account_deactivated' }
      });
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated for security reasons. Please contact customer support.',
        account_status: 'DEACTIVATED',
        customer_id: customer.customer_id
      });
    }

    // Link guest session to customer
    await linkSessionToCustomer(sessionId, customer.customer_id);

    // Merge guest cart to customer account cart
    await mergeCarts(sessionId, customer.customer_id);

    // Merge guest wishlist to customer wishlist
    await mergeWishlists(sessionId, customer.customer_id);

    // Telemetry Login Event
    EventLogger.logEvent({
      event_type: 'login',
      session_id: sessionId,
      customer_id: customer.customer_id,
      user_type: 'registered',
      page: 'login'
    });

    const token = jwt.sign({ userId: customer.customer_id }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { password_hash, ...profile } = customer;
    return res.json({ success: true, customer: profile });
  } catch (error: any) {
    console.error('[Auth API Error] Login failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  const sessionId = req.body.session_id || 'sess_unknown';
  try {
    const userId = req.userId;
    res.clearCookie('token');

    // 1. Mark session as ended in database
    if (sessionId !== 'sess_unknown') {
      await endSession(sessionId);
    }

    // Telemetry Logout Event
    EventLogger.logEvent({
      event_type: 'logout',
      session_id: sessionId,
      customer_id: userId || null,
      user_type: 'guest',
      page: 'logout'
    });

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Auth API Error] Logout failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const customer = await getCustomerById(req.userId || '');
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer profile not found' });
    }

    const { password_hash, ...profile } = customer;
    return res.json({ success: true, customer: profile });
  } catch (error: any) {
    console.error('[Auth API Error] Fetch profile failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
