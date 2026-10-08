import { Router, Request, Response } from 'express';
import crypto from 'crypto';
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
  getFraudOverviewMetrics,
  getFraudVerificationChallengesFiltered,
  getFraudAnalyticsData,
  getFraudHealthStatus,
  getPendingAdminReviews,
  clearIncidentAdminReview,
  upsertCustomerSecurity,
  createFraudRestriction,
  createFraudAdminAction,
  createFraudAuditRecord,
  createFraudOtpChallenge,
  getFraudOtpChallengeById,
  getActivePendingChallengeForCustomer,
  updateFraudOtpChallenge,
  getCustomerPhone,
  getCustomerSecurityCustomerFacing,
  getFraudOtpChallengesFiltered,
  getBannedAccounts,
  checkAndReleaseExpiredRestrictions,
  updateAllVerificationChallengesForCustomer,
  revokeCustomerBan,
  releaseFraudRestrictionAdmin
} from '../config/db';

const router = Router();

// Helper to parse pagination query options
const parsePagination = (req: Request) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 25;
  return { page: Math.max(1, page), limit: Math.min(100, Math.max(1, limit)) };
};

// ==================================================
// API GROUP 6 — FRAUD OVERVIEW, ANALYTICS & HEALTH
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

/**
 * GET /api/fraud/analytics
 * Aggregated incident trend, risk level distribution, and fraud type breakdown.
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const data = await getFraudAnalyticsData(startDate, endDate);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving fraud analytics' });
  }
});

/**
 * GET /api/fraud/health
 * Real system health indicator for Kafka, Database, FraudGuard engine, and API.
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const data = await getFraudHealthStatus();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving system health' });
  }
});

/**
 * GET /api/fraud/verification
 * Read-only list of verification challenges for Stage 5.
 */
router.get('/verification', async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const { challenges, total } = await getFraudVerificationChallengesFiltered({
      customer_id: req.query.customer_id as string,
      incident_id: req.query.incident_id as string,
      status: req.query.status as string,
      channel: req.query.channel as string,
      page,
      limit
    });
    res.json({
      success: true,
      count: challenges.length,
      total,
      page,
      limit,
      data: challenges
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving verification challenges' });
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
 * GET /api/fraud/banned-accounts
 * List all permanently banned customer accounts for the Admin FraudGuard Banned Accounts registry.
 */
router.get('/banned-accounts', async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const search = req.query.search as string;
    const { bannedAccounts, total } = await getBannedAccounts({ search, page, limit });

    res.json({
      success: true,
      count: bannedAccounts.length,
      total,
      page,
      limit,
      data: bannedAccounts
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving banned accounts' });
  }
});

/**
 * GET /api/fraud/verification
 * List OTP verification challenges and synced step-up incidents.
 */
router.get('/verification', async (req: Request, res: Response) => {
  try {
    const { page, limit } = parsePagination(req);
    const { challenges, total } = await getFraudVerificationChallengesFiltered({
      customer_id: req.query.customer_id as string,
      status: req.query.status as string,
      channel: req.query.channel as string,
      page,
      limit
    });

    res.json({
      success: true,
      count: challenges.length,
      total,
      page,
      limit,
      data: challenges
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving verification challenges' });
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

// ==================================================
// API GROUP 7 — ADMIN REVIEWS & MUTATION ACTIONS
// ==================================================

/**
 * GET /api/fraud/reviews
 * List pending cases requiring administrator review.
 */
router.get('/reviews', async (_req: Request, res: Response) => {
  try {
    const reviews = await getPendingAdminReviews();
    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving pending reviews' });
  }
});

/**
 * POST /api/fraud/admin/review
 * Approve / Execute admin review decision.
 */
router.post('/admin/review', async (req: Request, res: Response) => {
  try {
    const { customer_id, incident_id, action, reason, admin_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });

    const adminId = admin_id || 'admin-001';
    const actionType = (action || 'APPROVE_REVIEW').toUpperCase();
    const actionId = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    await clearIncidentAdminReview(incident_id || null, customer_id);

    await upsertCustomerSecurity({
      customer_id,
      step_up_required: false,
      updated_at: new Date().toISOString()
    });

    await createFraudAdminAction({
      action_id: actionId,
      admin_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      restriction_id: null,
      action: actionType,
      reason: reason || 'Administrator completed review evaluation',
      previous_state: 'PENDING_REVIEW',
      new_state: 'REVIEWED'
    });

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'ADMIN',
      actor_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      event_type: 'ADMIN_ACTION_' + actionType,
      event: `Administrator executed ${actionType} for customer ${customer_id}`,
      reason: reason || 'Administrator review decision executed',
      decision: actionType,
      action: actionType,
      result: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Admin review decision executed successfully',
      data: { action_id: actionId, audit_id: auditId, customer_id }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error executing admin review' });
  }
});

/**
 * POST /api/fraud/admin/restrict
 * Apply or extend customer account restriction.
 */
router.post('/admin/restrict', async (req: Request, res: Response) => {
  try {
    const { customer_id, incident_id, restriction_type, duration_minutes, reason, admin_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });

    const adminId = admin_id || 'admin-001';
    const duration = duration_minutes ? parseInt(duration_minutes, 10) : 60;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
    const restrictionId = 'RESTR-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const actionId = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    await createFraudRestriction({
      restriction_id: restrictionId,
      customer_id,
      incident_id: incident_id || null,
      restriction_type: restriction_type || 'TEMPORARY_RESTRICTION',
      status: 'ACTIVE',
      reason: reason || 'Restriction applied by administrator',
      started_at: new Date().toISOString(),
      expires_at: expiresAt
    });

    await upsertCustomerSecurity({
      customer_id,
      security_status: 'RESTRICTED',
      active_restriction_id: restrictionId,
      updated_at: new Date().toISOString()
    });

    await clearIncidentAdminReview(incident_id || null, customer_id);

    await createFraudAdminAction({
      action_id: actionId,
      admin_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      restriction_id: restrictionId,
      action: 'APPROVE_RESTRICTION',
      reason: reason || 'Administrator created restriction record',
      previous_state: 'NORMAL',
      new_state: 'RESTRICTED'
    });

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'ADMIN',
      actor_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      event_type: 'ADMIN_ACTION_RESTRICT',
      event: `Administrator restricted customer ${customer_id} for ${duration} minutes`,
      reason: reason || 'Administrator restriction applied',
      decision: 'APPROVE_RESTRICTION',
      action: 'APPROVE_RESTRICTION',
      result: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Customer restriction executed successfully',
      data: { restriction_id: restrictionId, action_id: actionId, audit_id: auditId, expires_at: expiresAt }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error creating restriction' });
  }
});

/**
 * POST /api/fraud/admin/deactivate
 * Deactivate customer account.
 */
router.post('/admin/deactivate', async (req: Request, res: Response) => {
  try {
    const { customer_id, incident_id, reason, admin_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });

    const adminId = admin_id || 'admin-001';
    const actionId = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    await upsertCustomerSecurity({
      customer_id,
      account_status: 'DEACTIVATED',
      security_status: 'DEACTIVATED',
      updated_at: new Date().toISOString()
    });

    await clearIncidentAdminReview(incident_id || null, customer_id);

    await createFraudAdminAction({
      action_id: actionId,
      admin_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      restriction_id: null,
      action: 'DEACTIVATE_ACCOUNT',
      reason: reason || 'Account deactivated by administrator',
      previous_state: 'ACTIVE',
      new_state: 'DEACTIVATED'
    });

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'ADMIN',
      actor_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      event_type: 'ADMIN_ACTION_DEACTIVATE',
      event: `Administrator deactivated account for customer ${customer_id}`,
      reason: reason || 'Administrator account deactivation executed',
      decision: 'DEACTIVATE_ACCOUNT',
      action: 'DEACTIVATE_ACCOUNT',
      result: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Account deactivated successfully',
      data: { action_id: actionId, audit_id: auditId, customer_id }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error deactivating account' });
  }
});

/**
 * POST /api/fraud/admin/ban
 * Permanently ban customer account.
 */
router.post('/admin/ban', async (req: Request, res: Response) => {
  try {
    const { customer_id, incident_id, reason, admin_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });

    const adminId = admin_id || 'admin-001';
    const actionId = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    await upsertCustomerSecurity({
      customer_id,
      account_status: 'BANNED',
      security_status: 'BANNED',
      updated_at: new Date().toISOString()
    });

    await clearIncidentAdminReview(incident_id || null, customer_id);

    await createFraudAdminAction({
      action_id: actionId,
      admin_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      restriction_id: null,
      action: 'BAN_ACCOUNT',
      reason: reason || 'Account permanently banned by administrator',
      previous_state: 'ACTIVE',
      new_state: 'BANNED'
    });

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'ADMIN',
      actor_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      event_type: 'ADMIN_ACTION_BAN',
      event: `Administrator permanently banned customer ${customer_id}`,
      reason: reason || 'Administrator account ban executed',
      decision: 'BAN_ACCOUNT',
      action: 'BAN_ACCOUNT',
      result: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Account permanently banned successfully',
      data: { action_id: actionId, audit_id: auditId, customer_id }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error banning account' });
  }
});

/**
 * POST /api/fraud/admin/unban
 * Revoke permanent ban on a customer account and restore status to ACTIVE.
 */
router.post('/admin/unban', async (req: Request, res: Response) => {
  try {
    const { customer_id, reason, admin_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });

    const adminId = admin_id || 'admin-001';
    const actionId = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    await revokeCustomerBan(customer_id, reason, adminId);

    await createFraudAdminAction({
      action_id: actionId,
      admin_id: adminId,
      customer_id,
      incident_id: null,
      restriction_id: null,
      action: 'UNBAN_ACCOUNT',
      reason: reason || 'Permanent account ban revoked by administrator',
      previous_state: 'BANNED',
      new_state: 'ACTIVE'
    });

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'ADMIN',
      actor_id: adminId,
      customer_id,
      incident_id: null,
      event_type: 'ADMIN_ACTION_UNBAN',
      event: `Administrator revoked ban for customer ${customer_id}`,
      reason: reason || 'Account ban revoked. Customer account reinstated to ACTIVE.',
      decision: 'UNBAN_ACCOUNT',
      action: 'UNBAN_ACCOUNT',
      result: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Account ban revoked successfully. Customer account restored to ACTIVE.',
      data: { action_id: actionId, audit_id: auditId, customer_id }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error revoking account ban' });
  }
});

/**
 * POST /api/fraud/admin/release-restriction
 * Release active restriction and restore customer status to NORMAL & ACTIVE.
 */
router.post('/admin/release-restriction', async (req: Request, res: Response) => {
  try {
    const { restriction_id, customer_id, reason, admin_id } = req.body;
    if (!customer_id && !restriction_id) {
      return res.status(400).json({ success: false, error: 'customer_id or restriction_id is required' });
    }

    const adminId = admin_id || 'admin-001';
    const actionId = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    let targetCustomerId = customer_id;
    if (!targetCustomerId && restriction_id) {
      const restr = await getFraudRestrictionById(restriction_id);
      if (restr) targetCustomerId = restr.customer_id;
    }

    await releaseFraudRestrictionAdmin(restriction_id, targetCustomerId, reason, adminId);

    await createFraudAdminAction({
      action_id: actionId,
      admin_id: adminId,
      customer_id: targetCustomerId || 'UNKNOWN',
      incident_id: null,
      restriction_id: restriction_id || null,
      action: 'RELEASE_RESTRICTION',
      reason: reason || 'Account restriction released by administrator',
      previous_state: 'RESTRICTED',
      new_state: 'NORMAL'
    });

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'ADMIN',
      actor_id: adminId,
      customer_id: targetCustomerId || null,
      incident_id: null,
      event_type: 'ADMIN_ACTION_RELEASE_RESTRICTION',
      event: `Administrator released restriction for customer ${targetCustomerId || restriction_id}`,
      reason: reason || 'Restriction released. Customer status set to ACTIVE.',
      decision: 'RELEASE_RESTRICTION',
      action: 'RELEASE_RESTRICTION',
      result: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Account restriction released successfully. Customer status restored to ACTIVE.',
      data: { action_id: actionId, audit_id: auditId, customer_id: targetCustomerId }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error releasing restriction' });
  }
});

/**
 * POST /api/fraud/admin/clear-review
 * Clear administrator review requirement.
 */
router.post('/admin/clear-review', async (req: Request, res: Response) => {
  try {
    const { customer_id, incident_id, reason, admin_id } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });

    const adminId = admin_id || 'admin-001';
    const actionId = 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    await clearIncidentAdminReview(incident_id || null, customer_id);

    await upsertCustomerSecurity({
      customer_id,
      step_up_required: false,
      updated_at: new Date().toISOString()
    });

    await createFraudAdminAction({
      action_id: actionId,
      admin_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      restriction_id: null,
      action: 'CLEAR_REVIEW',
      reason: reason || 'Review requirement cleared by administrator',
      previous_state: 'PENDING_REVIEW',
      new_state: 'NORMAL'
    });

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'ADMIN',
      actor_id: adminId,
      customer_id,
      incident_id: incident_id || null,
      event_type: 'ADMIN_ACTION_CLEAR_REVIEW',
      event: `Administrator cleared review requirement for customer ${customer_id}`,
      reason: reason || 'Review cleared',
      decision: 'CLEAR_REVIEW',
      action: 'CLEAR_REVIEW',
      result: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Review cleared successfully',
      data: { action_id: actionId, audit_id: auditId, customer_id }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error clearing review' });
  }
});

// Helper function to hash OTP code & config helpers
const getOtpMode = () => (process.env.OTP_MODE || 'demo').toLowerCase();
const getDemoOtpCode = () => process.env.DEMO_OTP_CODE || '123456';
const getOtpExpirySeconds = () => parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10);
const getOtpMaxAttempts = () => parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// ==================================================
// STAGE 6 — CUSTOMER OTP & SECURITY RESPONSE ENDPOINTS
// ==================================================

/**
 * GET /api/fraud/customer/:customerId/security
 * Returns non-sensitive customer-facing security state.
 */
router.get('/customer/:customerId/security', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const data = await getCustomerSecurityCustomerFacing(customerId);
    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error retrieving customer security state' });
  }
});

/**
 * POST /api/fraud/otp/request
 * Issue OTP challenge for customer step-up verification.
 */
router.post('/otp/request', async (req: Request, res: Response) => {
  try {
    const { customer_id, incident_id } = req.body;
    if (!customer_id) {
      return res.status(400).json({ success: false, error: 'customer_id is required' });
    }

    // 1. Validate customer & phone
    const secState = await getCustomerSecurity(customer_id);
    const { phone, masked, isReal } = await getCustomerPhone(customer_id);

    // 2. Validate incident if provided
    if (incident_id) {
      const incident = await getFraudIncidentById(incident_id);
      if (!incident) {
        return res.status(404).json({ success: false, error: 'Incident not found' });
      }
    }

    // 3. Check security state (e.g. BANNED / DEACTIVATED / ADMIN_REVIEW / Active RESTRICTED cannot request OTP)
    const rawStatus = secState ? String(secState.security_status || 'NORMAL').toUpperCase() : 'NORMAL';
    const accountStatus = secState ? String(secState.account_status || 'ACTIVE').toUpperCase() : 'ACTIVE';

    if (accountStatus === 'BANNED' || rawStatus === 'BANNED') {
      return res.status(403).json({ success: false, error: 'Account is permanently banned. Cannot request OTP.' });
    }
    if (accountStatus === 'DEACTIVATED' || rawStatus === 'DEACTIVATED') {
      return res.status(403).json({ success: false, error: 'Account is deactivated. Cannot request OTP.' });
    }
    if (rawStatus === 'ADMIN_REVIEW') {
      return res.status(403).json({ success: false, error: 'Account is under Admin Review. Cannot request OTP until review is complete.' });
    }
    if (rawStatus === 'RESTRICTED') {
      const activeRestr = await getActiveCustomerRestriction(customer_id);
      if (activeRestr && activeRestr.expires_at && new Date(activeRestr.expires_at).getTime() > Date.now()) {
        return res.status(403).json({ success: false, error: 'Account is currently under temporary restriction. Cannot request OTP until restriction duration expires.' });
      }
    }

    // 4. Idempotency: Check if an active non-expired PENDING challenge already exists
    const forceNew = Boolean(req.body.force_new || req.body.forceNew);
    const activeChallenge = await getActivePendingChallengeForCustomer(customer_id, incident_id);
    if (activeChallenge && !forceNew) {
      const nowMs = Date.now();
      const expMs = new Date(activeChallenge.expires_at).getTime();
      const expiresInSec = Math.max(0, Math.floor((expMs - nowMs) / 1000));

      if (expiresInSec > 5) {
        const otpMode = getOtpMode();
        const isDemo = otpMode === 'demo' || customer_id.startsWith('SIM-') || customer_id.startsWith('DEMO-') || !isReal;
        const resp: any = {
          success: true,
          challenge_id: activeChallenge.challenge_id,
          expires_in: expiresInSec,
          phone_masked: masked,
          message: 'Existing active verification code reused.',
          is_demo: isDemo
        };
        if (isDemo && otpMode === 'demo') {
          resp.demo_otp = getDemoOtpCode();
        }
        return res.json(resp);
      }
    }

    // 5. Determine demo vs provider mode & generate OTP
    const otpMode = getOtpMode();
    const isDemo = otpMode === 'demo' || customer_id.startsWith('SIM-') || customer_id.startsWith('DEMO-') || !isReal;

    let otpCode = getDemoOtpCode();
    if (!isDemo && otpMode === 'provider') {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const otpHash = hashOtp(otpCode);
    const expirySec = getOtpExpirySeconds();
    const maxAttempts = getOtpMaxAttempts();
    const challengeId = 'CHALL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const expiresAt = new Date(Date.now() + expirySec * 1000).toISOString();

    // 6. Store Challenge
    await createFraudOtpChallenge({
      challenge_id: challengeId,
      customer_id,
      incident_id: incident_id || null,
      phone_reference: masked,
      otp_hash: otpHash,
      purpose: 'STEP_UP_VERIFICATION',
      status: 'PENDING',
      attempt_count: 0,
      max_attempts: maxAttempts,
      expires_at: expiresAt,
      is_demo: isDemo,
      metadata: { phone_masked: masked, mode: isDemo ? 'demo' : 'provider' }
    });

    // 7. Write Audit Log
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'CUSTOMER',
      actor_id: customer_id,
      customer_id,
      incident_id: incident_id || null,
      event_type: 'OTP_REQUESTED',
      event: 'OTP Verification Challenge Requested',
      reason: 'Customer requested step-up authentication OTP',
      decision: 'CHALLENGE_CREATED',
      action: 'SEND_OTP',
      result: 'SUCCESS',
      metadata: { challenge_id: challengeId, is_demo: isDemo }
    });

    // 8. Build Response
    const responseData: any = {
      success: true,
      challenge_id: challengeId,
      expires_in: expirySec,
      phone_masked: masked,
      message: 'Verification code sent.',
      is_demo: isDemo
    };

    // Expose demo_otp ONLY when in demo mode (never when OTP_MODE=provider)
    if (isDemo && otpMode === 'demo') {
      responseData.demo_otp = otpCode;
      console.log(`[DEMO OTP LOG] Generated OTP for customer ${customer_id} (${masked}): ${otpCode}`);
    } else {
      console.log(`[PROVIDER OTP LOG] Sent OTP via SMS provider to customer ${customer_id} (${masked})`);
    }

    res.json(responseData);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error requesting OTP' });
  }
});

/**
 * POST /api/fraud/otp/verify
 * Validate OTP code and execute security state workflow transition.
 */
router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const customer_id = req.body.customer_id || req.body.customerId;
    let challenge_id = req.body.challenge_id || req.body.challengeId;
    const otp = req.body.otp || req.body.otp_code || req.body.code;

    // Auto-lookup active pending challenge if challenge_id wasn't passed directly but customer_id was
    if (!challenge_id && customer_id) {
      const active = await getActivePendingChallengeForCustomer(customer_id);
      if (active) {
        challenge_id = active.challenge_id;
      }
    }

    if (!challenge_id || !otp) {
      return res.status(400).json({ success: false, error: 'challenge_id and otp are required' });
    }

    // 1. Fetch challenge
    const challenge = await getFraudOtpChallengeById(challenge_id);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    const customerId = challenge.customer_id;
    const auditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Check customer security state
    const currentSec = await getCustomerSecurity(customerId);
    const rawStatus = currentSec ? String(currentSec.security_status || 'NORMAL').toUpperCase() : 'NORMAL';
    const accountStatus = currentSec ? String(currentSec.account_status || 'ACTIVE').toUpperCase() : 'ACTIVE';

    if (accountStatus === 'BANNED' || rawStatus === 'BANNED') {
      return res.status(403).json({ success: false, error: 'Account is permanently banned. OTP verification unavailable.' });
    }
    if (accountStatus === 'DEACTIVATED' || rawStatus === 'DEACTIVATED') {
      return res.status(403).json({ success: false, error: 'Account is deactivated. OTP verification unavailable.' });
    }
    if (rawStatus === 'ADMIN_REVIEW') {
      return res.status(403).json({ success: false, error: 'Account is under Admin Review. OTP verification unavailable until review is complete.' });
    }
    if (rawStatus === 'RESTRICTED') {
      const activeRestr = await getActiveCustomerRestriction(customerId);
      if (activeRestr && activeRestr.expires_at && new Date(activeRestr.expires_at).getTime() > Date.now()) {
        return res.status(403).json({ success: false, error: 'Account is currently under temporary restriction. OTP verification unavailable until restriction duration expires.' });
      }
    }

    // 2. Check Idempotency: If already verified
    if (challenge.status === 'VERIFIED') {
      const secState = await getCustomerSecurity(customerId);
      return res.json({
        success: true,
        challenge_id: challenge.challenge_id,
        status: 'VERIFIED',
        verified: true,
        security_status: secState ? secState.security_status : 'NORMAL',
        message: 'Challenge has already been verified.'
      });
    }

    // 3 & 4. Check status & Expiration
    const isExpired = new Date(challenge.expires_at).getTime() <= Date.now() || challenge.status === 'EXPIRED';
    if (isExpired || challenge.status !== 'PENDING') {
      const demoCode = getDemoOtpCode();
      const isDemoMatch = (String(otp).trim() === demoCode) && getOtpMode() === 'demo';

      if (isDemoMatch) {
        // Auto-renew expired challenge for seamless demo testing
        await updateFraudOtpChallenge(challenge_id, { status: 'PENDING', expires_at: new Date(Date.now() + 300000).toISOString() });
      } else {
        if (isExpired) {
          await updateFraudOtpChallenge(challenge_id, { status: 'EXPIRED' });
          await createFraudAuditRecord({
            audit_id: auditId,
            actor_type: 'CUSTOMER',
            actor_id: customerId,
            customer_id: customerId,
            incident_id: challenge.incident_id || null,
            event_type: 'OTP_EXPIRED',
            event: 'OTP Verification Attempt Failed',
            reason: 'Verification code expired',
            decision: 'REJECT',
            action: 'VERIFY_OTP',
            result: 'EXPIRED'
          });
          return res.status(400).json({ success: false, error: 'Verification code has expired. Please click Resend Code to request a new code.' });
        }
        return res.status(400).json({
          success: false,
          error: `Challenge status is ${challenge.status}. Verification not allowed.`
        });
      }
    }

    // 5. Check Maximum Attempts
    const newAttemptCount = (challenge.attempt_count || 0) + 1;
    if (newAttemptCount >= challenge.max_attempts) {
      await updateFraudOtpChallenge(challenge_id, { status: 'FAILED', attempt_count: newAttemptCount });

      const restrId = 'RESTR-ATTEMPTS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      await createFraudRestriction({
        restriction_id: restrId,
        customer_id: customerId,
        incident_id: challenge.incident_id || null,
        restriction_type: 'TEMPORARY_RESTRICTION',
        status: 'ACTIVE',
        reason: 'Maximum verification attempts exceeded (3 failed attempts). Account restricted for 24 hours.',
        started_at: new Date().toISOString(),
        expires_at: expiresAt
      });

      await upsertCustomerSecurity({
        customer_id: customerId,
        security_status: 'RESTRICTED',
        active_restriction_id: restrId,
        updated_at: new Date().toISOString()
      });

      await createFraudAuditRecord({
        audit_id: auditId,
        actor_type: 'CUSTOMER',
        actor_id: customerId,
        customer_id: customerId,
        incident_id: challenge.incident_id || null,
        event_type: 'OTP_MAX_ATTEMPTS_RESTRICTED',
        event: 'OTP Maximum Verification Attempts Exceeded - Account Restricted 24h',
        reason: `Exceeded max attempts limit (${challenge.max_attempts}). Enforced 24h restriction.`,
        decision: 'RESTRICT_ACCOUNT_24H',
        action: 'RESTRICT_ACCOUNT',
        result: 'SUCCESS'
      });

      return res.status(403).json({
        success: false,
        verified: false,
        attempts_exceeded: true,
        is_restricted: true,
        expires_at: expiresAt,
        error: 'Maximum verification attempts exceeded (3 failed attempts). Account restricted for 24 hours.'
      });
    }

    // 6. Verify OTP Hash / Code
    const inputHash = hashOtp(String(otp).trim());
    const demoCode = getDemoOtpCode();
    const isMatch = (challenge.otp_hash === inputHash) ||
                    (challenge.is_demo && String(otp).trim() === demoCode) ||
                    (String(otp).trim() === demoCode && getOtpMode() === 'demo');

    if (!isMatch) {
      await updateFraudOtpChallenge(challenge_id, { attempt_count: newAttemptCount });

      if (newAttemptCount >= 3) {
        const restrId = 'RESTR-ATTEMPTS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

        await createFraudRestriction({
          restriction_id: restrId,
          customer_id: customerId,
          incident_id: challenge.incident_id || null,
          restriction_type: 'TEMPORARY_RESTRICTION',
          status: 'ACTIVE',
          reason: 'Maximum verification attempts exceeded (3 failed attempts). Account restricted for 24 hours.',
          started_at: new Date().toISOString(),
          expires_at: expiresAt
        });

        await upsertCustomerSecurity({
          customer_id: customerId,
          security_status: 'RESTRICTED',
          active_restriction_id: restrId,
          updated_at: new Date().toISOString()
        });

        return res.status(403).json({
          success: false,
          verified: false,
          attempts_exceeded: true,
          is_restricted: true,
          expires_at: expiresAt,
          error: 'Maximum verification attempts exceeded (3 failed attempts). Account restricted for 24 hours.'
        });
      }

      await createFraudAuditRecord({
        audit_id: auditId,
        actor_type: 'CUSTOMER',
        actor_id: customerId,
        customer_id: customerId,
        incident_id: challenge.incident_id || null,
        event_type: 'OTP_FAILED',
        event: 'OTP Verification Failed',
        reason: `Invalid OTP attempt ${newAttemptCount} of ${challenge.max_attempts}`,
        decision: 'REJECT',
        action: 'VERIFY_OTP',
        result: 'FAILED'
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please check and try again.',
        attempts_left: Math.max(0, challenge.max_attempts - newAttemptCount)
      });
    }

    // 7. OTP Match Verified! Update challenge state globally for customer
    await updateFraudOtpChallenge(challenge_id, {
      status: 'VERIFIED',
      attempt_count: newAttemptCount,
      verified_at: new Date().toISOString()
    });

    await updateAllVerificationChallengesForCustomer(customerId, 'VERIFIED');

    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'CUSTOMER',
      actor_id: customerId,
      customer_id: customerId,
      incident_id: challenge.incident_id || null,
      event_type: 'OTP_VERIFIED',
      event: 'OTP Successfully Verified',
      reason: 'Customer verified step-up OTP challenge',
      decision: 'VERIFIED',
      action: 'VERIFY_OTP',
      result: 'SUCCESS'
    });

    // 8. Update Customer Security State strictly per FraudGuard rules:
    const secState = await getCustomerSecurity(customerId);
    const postRawStatus = secState ? String(secState.security_status || 'NORMAL').toUpperCase() : 'NORMAL';
    const postAccountStatus = secState ? String(secState.account_status || 'ACTIVE').toUpperCase() : 'ACTIVE';
    const isStepUp = secState ? (Boolean(secState.step_up_required) || postRawStatus === 'STEP_UP_REQUIRED') : true;

    let updatedStatus = postRawStatus;

    if (postAccountStatus === 'BANNED' || postRawStatus === 'BANNED') {
      updatedStatus = 'BANNED';
    } else if (postAccountStatus === 'DEACTIVATED' || postRawStatus === 'DEACTIVATED') {
      updatedStatus = 'DEACTIVATED';
    } else if (isStepUp || postRawStatus === 'STEP_UP_REQUIRED' || postRawStatus === 'NORMAL') {
      // STEP_UP_AUTHENTICATION: Verification returns customer state to NORMAL
      updatedStatus = 'NORMAL';
      await upsertCustomerSecurity({
        customer_id: customerId,
        security_status: 'NORMAL',
        step_up_required: false,
        failed_login_count: 0,
        updated_at: new Date().toISOString()
      });

      const secAuditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await createFraudAuditRecord({
        audit_id: secAuditId,
        actor_type: 'SYSTEM',
        actor_id: 'FRAUDGUARD_WORKFLOW',
        customer_id: customerId,
        incident_id: challenge.incident_id || null,
        event_type: 'SECURITY_STATE_UPDATED',
        event: 'Customer Security State Returned to NORMAL',
        reason: 'Step-up OTP verification completed successfully',
        decision: 'RESTORE_NORMAL',
        action: 'UPDATE_SECURITY_STATE',
        result: 'SUCCESS',
        metadata: { previous_state: rawStatus, new_state: 'NORMAL' }
      });
    } else {
      // For RESTRICTED, ADMIN_REVIEW, PROTECTED: OTP does NOT remove restriction/review!
      const secAuditId = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await createFraudAuditRecord({
        audit_id: secAuditId,
        actor_type: 'SYSTEM',
        actor_id: 'FRAUDGUARD_WORKFLOW',
        customer_id: customerId,
        incident_id: challenge.incident_id || null,
        event_type: 'SECURITY_STATE_UPDATED',
        event: `Customer Identity Verified (State Remains ${rawStatus})`,
        reason: `Identity verified via OTP; active state ${rawStatus} remains binding per workflow rules`,
        decision: 'MAINTAIN_STATE',
        action: 'UPDATE_SECURITY_STATE',
        result: 'SUCCESS',
        metadata: { state: rawStatus }
      });
    }

    res.json({
      success: true,
      challenge_id: challenge.challenge_id,
      status: 'VERIFIED',
      verified: true,
      security_status: updatedStatus,
      message: updatedStatus === 'NORMAL' ? 'Verification successful. Your account access has been restored.' : 'Identity verified successfully. Note: Active account policy remains binding.'
    });

  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error verifying OTP' });
  }
});

export default router;
