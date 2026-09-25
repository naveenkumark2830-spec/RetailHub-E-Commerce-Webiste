import { Router, Request, Response } from 'express';
import {
  getFraudIncidentsFiltered,
  getFraudIncidentById,
  getCustomerSecurity,
  getFraudRestrictionsFiltered,
  getFraudRestrictionById,
  getActiveCustomerRestriction,
  getFraudAuditLogsFiltered,
  getFraudAuditLogById,
  getFraudAdminActionsFiltered,
  getFraudAdminActionById,
  getFraudOverviewMetrics
} from '../config/db';

const router = Router();

// Helper to parse pagination query options
const parsePagination = (req: Request) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 25;
  return { page: Math.max(1, page), limit: Math.min(100, Math.max(1, limit)) };
};

// ==================================================
// API GROUP 6 — FRAUD OVERVIEW (Placed before parameter routes)
// ==================================================

/**
 * GET /api/fraud/overview
 * Dashboard aggregation metric overview.
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const overview = await getFraudOverviewMetrics();
    res.json({
      success: true,
      data: overview
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving fraud overview' });
  }
});

// ==================================================
// API GROUP 1 — FRAUD INCIDENTS
// ==================================================

/**
 * GET /api/fraud/incidents
 * List fraud incidents with filtering and pagination. (Stage 1 Backward Compatible)
 */
router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const { incidents, total } = await getFraudIncidentsFiltered({
      risk_level: req.query.risk_level as string,
      severity: req.query.severity as string,
      fraud_type: req.query.fraud_type as string,
      action: req.query.action as string,
      customer_id: req.query.customer_id as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page,
      limit
    });

    res.json({
      success: true,
      count: incidents.length,
      total,
      page,
      limit,
      data: incidents
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving incidents' });
  }
});

/**
 * GET /api/fraud/incidents/:incidentId
 * Fetch single incident by incident_id.
 */
router.get('/incidents/:incidentId', async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const incident = await getFraudIncidentById(incidentId);

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    res.json({
      success: true,
      data: incident
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving incident' });
  }
});

/**
 * GET /api/fraud/incidents/:incidentId/audit
 * Fetch audit logs related to a specific incident.
 */
router.get('/incidents/:incidentId/audit', async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { page, limit } = parsePagination(req);
    const { auditLogs, total } = await getFraudAuditLogsFiltered({ incident_id: incidentId, page, limit });

    res.json({
      success: true,
      count: auditLogs.length,
      total,
      page,
      limit,
      data: auditLogs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving incident audit logs' });
  }
});

/**
 * GET /api/fraud/incidents/:incidentId/admin-actions
 * Fetch admin actions related to a specific incident.
 */
router.get('/incidents/:incidentId/admin-actions', async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { page, limit } = parsePagination(req);
    const { adminActions, total } = await getFraudAdminActionsFiltered({ incident_id: incidentId, page, limit });

    res.json({
      success: true,
      count: adminActions.length,
      total,
      page,
      limit,
      data: adminActions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving incident admin actions' });
  }
});

// ==================================================
// API GROUP 3 — RESTRICTIONS (Read-Only)
// ==================================================

/**
 * GET /api/fraud/restrictions
 * List restrictions with filtering and pagination.
 */
router.get('/restrictions', async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const { restrictions, total } = await getFraudRestrictionsFiltered({
      customer_id: req.query.customer_id as string,
      status: req.query.status as string,
      restriction_type: req.query.restriction_type as string,
      page,
      limit
    });

    res.json({
      success: true,
      count: restrictions.length,
      total,
      page,
      limit,
      data: restrictions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving restrictions' });
  }
});

/**
 * GET /api/fraud/restrictions/:restrictionId
 * Fetch single restriction by ID.
 */
router.get('/restrictions/:restrictionId', async (req: Request, res: Response) => {
  try {
    const { restrictionId } = req.params;
    const restriction = await getFraudRestrictionById(restrictionId);

    if (!restriction) {
      return res.status(404).json({ success: false, error: 'Restriction not found' });
    }

    res.json({
      success: true,
      data: restriction
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving restriction' });
  }
});

// ==================================================
// API GROUP 4 — AUDIT LOG (Read-Only)
// ==================================================

/**
 * GET /api/fraud/audit
 * List audit records with filtering and pagination.
 */
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const { auditLogs, total } = await getFraudAuditLogsFiltered({
      actor_type: req.query.actor_type as string,
      actor_id: req.query.actor_id as string,
      event_type: req.query.event_type as string,
      customer_id: req.query.customer_id as string,
      incident_id: req.query.incident_id as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page,
      limit
    });

    res.json({
      success: true,
      count: auditLogs.length,
      total,
      page,
      limit,
      data: auditLogs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving audit logs' });
  }
});

/**
 * GET /api/fraud/audit/:auditId
 * Fetch single audit log entry by audit_id.
 */
router.get('/audit/:auditId', async (req: Request, res: Response) => {
  try {
    const { auditId } = req.params;
    const auditLog = await getFraudAuditLogById(auditId);

    if (!auditLog) {
      return res.status(404).json({ success: false, error: 'Audit record not found' });
    }

    res.json({
      success: true,
      data: auditLog
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving audit record' });
  }
});

// ==================================================
// API GROUP 5 — ADMIN ACTION HISTORY (Read-Only)
// ==================================================

/**
 * GET /api/fraud/admin-actions
 * List historical admin decisions.
 */
router.get('/admin-actions', async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const { adminActions, total } = await getFraudAdminActionsFiltered({
      admin_id: req.query.admin_id as string,
      customer_id: req.query.customer_id as string,
      incident_id: req.query.incident_id as string,
      restriction_id: req.query.restriction_id as string,
      action: req.query.action as string,
      page,
      limit
    });

    res.json({
      success: true,
      count: adminActions.length,
      total,
      page,
      limit,
      data: adminActions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving admin actions' });
  }
});

/**
 * GET /api/fraud/admin-actions/:actionId
 * Fetch single admin action by action_id.
 */
router.get('/admin-actions/:actionId', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;
    const adminAction = await getFraudAdminActionById(actionId);

    if (!adminAction) {
      return res.status(404).json({ success: false, error: 'Admin action not found' });
    }

    res.json({
      success: true,
      data: adminAction
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving admin action' });
  }
});

// ==================================================
// API GROUP 2 & CUSTOMER SPECIFIC ENDPOINTS
// ==================================================

/**
 * GET /api/fraud/customers/:customerId/security
 * Returns customer's FraudGuard security state.
 */
router.get('/customers/:customerId/security', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const secState = await getCustomerSecurity(customerId);

    // Fetch up to 5 recent incidents for customer context
    const { incidents: recentIncidents } = await getFraudIncidentsFiltered({ customer_id: customerId, limit: 5 });

    if (!secState) {
      // Default normal state if no security record exists yet
      return res.json({
        success: true,
        data: {
          customer_id: customerId,
          account_status: 'ACTIVE',
          security_status: 'NORMAL',
          active_restriction_id: null,
          failed_login_count: 0,
          last_fraud_incident_id: null,
          step_up_required: false,
          updated_at: new Date().toISOString(),
          recent_incidents: recentIncidents
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...secState,
        recent_incidents: recentIncidents
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving customer security state' });
  }
});

/**
 * GET /api/fraud/customers/:customerId/incidents
 * List fraud incidents for a specific customer.
 */
router.get('/customers/:customerId/incidents', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { page, limit } = parsePagination(req);
    const { incidents, total } = await getFraudIncidentsFiltered({ customer_id: customerId, page, limit });

    res.json({
      success: true,
      count: incidents.length,
      total,
      page,
      limit,
      data: incidents
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving customer incidents' });
  }
});

/**
 * GET /api/fraud/customers/:customerId/restrictions
 * List restrictions for a specific customer.
 */
router.get('/customers/:customerId/restrictions', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { page, limit } = parsePagination(req);
    const { restrictions, total } = await getFraudRestrictionsFiltered({ customer_id: customerId, page, limit });

    res.json({
      success: true,
      count: restrictions.length,
      total,
      page,
      limit,
      data: restrictions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving customer restrictions' });
  }
});

/**
 * GET /api/fraud/customers/:customerId/restrictions/active
 * Get active restriction for a specific customer.
 */
router.get('/customers/:customerId/restrictions/active', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const activeRestr = await getActiveCustomerRestriction(customerId);

    if (!activeRestr) {
      return res.json({
        success: true,
        data: null,
        message: 'No active restriction for customer'
      });
    }

    res.json({
      success: true,
      data: activeRestr
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving active restriction' });
  }
});

/**
 * GET /api/fraud/customers/:customerId/audit
 * Fetch audit logs for a specific customer.
 */
router.get('/customers/:customerId/audit', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { page, limit } = parsePagination(req);
    const { auditLogs, total } = await getFraudAuditLogsFiltered({ customer_id: customerId, page, limit });

    res.json({
      success: true,
      count: auditLogs.length,
      total,
      page,
      limit,
      data: auditLogs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving customer audit logs' });
  }
});

/**
 * GET /api/fraud/customers/:customerId/admin-actions
 * Fetch admin action history for a specific customer.
 */
router.get('/customers/:customerId/admin-actions', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { page, limit } = parsePagination(req);
    const { adminActions, total } = await getFraudAdminActionsFiltered({ customer_id: customerId, page, limit });

    res.json({
      success: true,
      count: adminActions.length,
      total,
      page,
      limit,
      data: adminActions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving customer admin actions' });
  }
});

export default router;
