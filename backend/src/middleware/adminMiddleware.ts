import { Request, Response, NextFunction } from 'express';
import { dbPool, getAdminPermissions } from '../config/db';

export interface AdminRequest extends Request {
  admin?: {
    admin_id: string;
    first_name: string;
    last_name: string;
    email: string;
    role_id: string;
    permissions: string[];
  };
}

export async function adminAuth(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No active admin token provided.' });
    }

    if (!dbPool) {
      return res.status(500).json({ error: 'Database connection offline.' });
    }

    // Query active session
    const [sessRows]: any = await dbPool.query(
      'SELECT * FROM admin_sessions WHERE session_id = ? AND status = "ACTIVE"',
      [token]
    );

    if (sessRows.length === 0) {
      return res.status(401).json({ error: 'Access denied. Invalid or expired administrative session.' });
    }

    const session = sessRows[0];
    const adminId = session.admin_id;

    // Fetch admin details
    const [adminRows]: any = await dbPool.query('SELECT * FROM admin_users WHERE admin_id = ?', [adminId]);
    if (adminRows.length === 0) {
      return res.status(401).json({ error: 'Access denied. Administrator profile not found.' });
    }

    const admin = adminRows[0];

    if (admin.status !== 'ACTIVE') {
      return res.status(403).json({ error: `Access denied. Admin account is currently ${admin.status.toLowerCase()}.` });
    }

    // Load permissions list
    const permissions = await getAdminPermissions(admin.role_id);

    // Bind to request object
    req.admin = {
      admin_id: admin.admin_id,
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      role_id: admin.role_id,
      permissions
    };

    // Update last activity in session
    await dbPool.query(
      'UPDATE admin_sessions SET last_activity_at = NOW() WHERE session_id = ?',
      [token]
    );

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export function hasPermission(requiredPermission: string) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Access denied. Unauthenticated administrator.' });
    }

    const hasAccess = req.admin.permissions.includes(requiredPermission);
    if (!hasAccess) {
      return res.status(403).json({ error: `Access denied. Permission "${requiredPermission}" is required for this action.` });
    }

    next();
  };
}
