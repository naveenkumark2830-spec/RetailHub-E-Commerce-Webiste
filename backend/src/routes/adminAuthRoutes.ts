import express from 'express';
import bcrypt from 'bcryptjs';
import { 
  getAdminUserByEmail, 
  createAdminSession, 
  invalidateAdminSession, 
  getAdminPermissions,
  dbPool
} from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = express.Router();

// POST admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const admin = await getAdminUserByEmail(email);

    if (!admin) {
      // Log admin login failed event (INVALID_CREDENTIALS)
      EventLogger.logEvent({
        event_type: 'admin_login_failed',
        session_id: 'system_auth_attempt',
        customer_id: '',
        user_type: 'registered',
        page: 'admin_login',
        context: {
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          device: 'desktop',
          browser: 'Chrome'
        },
        metadata: {
          login_identifier_type: 'email',
          failure_reason: 'INVALID_CREDENTIALS'
        }
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (admin.status !== 'ACTIVE') {
      // Log admin login failed event (ACCOUNT_LOCKED/SUSPENDED)
      EventLogger.logEvent({
        event_type: 'admin_login_failed',
        session_id: 'system_auth_attempt',
        customer_id: '',
        user_type: 'registered',
        page: 'admin_login',
        context: {
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          device: 'desktop',
          browser: 'Chrome'
        },
        metadata: {
          login_identifier_type: 'email',
          failure_reason: `ACCOUNT_${admin.status}`
        }
      });
      return res.status(403).json({ error: `This account is currently ${admin.status.toLowerCase()}.` });
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      // Log admin login failed event (INVALID_CREDENTIALS)
      EventLogger.logEvent({
        event_type: 'admin_login_failed',
        session_id: 'system_auth_attempt',
        customer_id: '',
        user_type: 'registered',
        page: 'admin_login',
        context: {
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          device: 'desktop',
          browser: 'Chrome'
        },
        metadata: {
          login_identifier_type: 'email',
          failure_reason: 'INVALID_CREDENTIALS'
        }
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create session and log success inside helper
    const session = await createAdminSession(admin.admin_id, typeof ipAddress === 'string' ? ipAddress : null, userAgent);
    const permissions = await getAdminPermissions(admin.role_id);

    res.json({
      token: session.session_id,
      admin: {
        admin_id: admin.admin_id,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        role_id: admin.role_id
      },
      permissions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST admin logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(400).json({ error: 'Authorization header is required.' });
    }

    const success = await invalidateAdminSession(token);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Session not found or already inactive.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET current admin status / details
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. No active session token.' });
    }

    // Find active session
    const [sessRows]: any = await dbPool!.query(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND status = "ACTIVE"',
      [token]
    );
    if (sessRows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    // Find admin user details
    const adminId = sessRows[0].admin_id;
    const [adminRows]: any = await dbPool!.query('SELECT * FROM admin_users WHERE admin_id = ?', [adminId]);
    if (adminRows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found.' });
    }
    const admin = adminRows[0];
    const permissions = await getAdminPermissions(admin.role_id);

    res.json({
      admin: {
        admin_id: admin.admin_id,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        role_id: admin.role_id
      },
      permissions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST admin registration (authorized only for active admins with SUPER_ADMIN role)
router.post('/register', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No active admin token provided.' });
    }

    // Verify active session is SUPER_ADMIN
    const [sessRows]: any = await dbPool!.query(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND status = "ACTIVE"',
      [token]
    );
    if (sessRows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    const operatorId = sessRows[0].admin_id;
    const [operatorRows]: any = await dbPool!.query('SELECT role_id FROM admin_users WHERE admin_id = ?', [operatorId]);
    if (operatorRows.length === 0 || operatorRows[0].role_id !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Only SUPER_ADMIN users can register new administrators.' });
    }

    const { firstName, lastName, email, password, roleId, categoryAccess } = req.body;
    if (!firstName || !lastName || !email || !password || !roleId) {
      return res.status(400).json({ error: 'Please enter all required fields.' });
    }

    // Check if email already exists
    const [existingAdmins]: any = await dbPool!.query('SELECT admin_id FROM admin_users WHERE email = ?', [email]);
    if (existingAdmins.length > 0) {
      return res.status(400).json({ error: 'An administrator with this email address already exists.' });
    }

    // Verify role exists
    const [roleRows]: any = await dbPool!.query('SELECT role_id FROM roles WHERE role_id = ?', [roleId]);
    if (roleRows.length === 0) {
      return res.status(400).json({ error: `Selected role ID "${roleId}" is invalid.` });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const newAdminId = `ADM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    await dbPool!.query(
      `INSERT INTO admin_users (admin_id, first_name, last_name, email, password_hash, role_id, category_access, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [newAdminId, firstName, lastName, email, passwordHash, roleId, categoryAccess || 'ALL']
    );

    res.json({
      success: true,
      admin: {
        admin_id: newAdminId,
        first_name: firstName,
        last_name: lastName,
        email,
        role_id: roleId,
        category_access: categoryAccess || 'ALL'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET list of all admin users (authorized only for active admins)
router.get('/users', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No active admin token provided.' });
    }

    // Verify active session
    const [sessRows]: any = await dbPool!.query(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND status = "ACTIVE"',
      [token]
    );
    if (sessRows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    const [users]: any = await dbPool!.query(
      'SELECT admin_id, first_name, last_name, email, role_id, category_access, status, created_at FROM admin_users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE admin user (authorized only for active SUPER_ADMINs)
router.delete('/users/:adminId', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No active admin token provided.' });
    }

    // Verify active session is SUPER_ADMIN
    const [sessRows]: any = await dbPool!.query(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND status = "ACTIVE"',
      [token]
    );
    if (sessRows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    const operatorId = sessRows[0].admin_id;
    const [operatorRows]: any = await dbPool!.query('SELECT role_id FROM admin_users WHERE admin_id = ?', [operatorId]);
    if (operatorRows.length === 0 || operatorRows[0].role_id !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Only SUPER_ADMIN users can delete administrators.' });
    }

    const { adminId } = req.params;

    // Prevent deleting self or primary ADM001 system admin
    if (adminId === operatorId) {
      return res.status(400).json({ error: 'Access denied. You cannot delete your own administrative account.' });
    }
    if (adminId === 'ADM001') {
      return res.status(400).json({ error: 'Access denied. The primary system administrator profile cannot be deleted.' });
    }

    // Delete session records and audit logs first to prevent FK failures
    await dbPool!.query('DELETE FROM admin_sessions WHERE admin_id = ?', [adminId]);
    await dbPool!.query('DELETE FROM admin_audit_logs WHERE admin_id = ?', [adminId]);
    
    // Delete user
    const [result]: any = await dbPool!.query('DELETE FROM admin_users WHERE admin_id = ?', [adminId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Administrator profile not found.' });
    }

    res.json({ success: true, message: 'Administrator profile deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
