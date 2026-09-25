import {
  FraudIncidentRecord,
  getCustomerSecurity,
  upsertCustomerSecurity,
  createFraudRestriction,
  getActiveCustomerRestriction,
  createFraudAuditRecord,
  getFraudAuditLogsFiltered
} from '../config/db';

export const SECURITY_PRIORITY: Record<string, number> = {
  NORMAL: 1,
  STEP_UP_REQUIRED: 2,
  PROTECTED: 3,
  RESTRICTED: 4,
  DEACTIVATED: 5,
  BANNED: 6
};

/**
 * Executes the security workflow corresponding to a FraudGuard incident decision.
 * Idempotent, failure-safe, and enforces security status priority hierarchy.
 */
export async function processFraudSecurityWorkflow(incident: FraudIncidentRecord): Promise<boolean> {
  if (!incident || !incident.incident_id || !incident.customer_id) {
    console.warn('[Security Workflow] Invalid incident record provided to workflow processor');
    return false;
  }

  try {
    // 1. Idempotency Check: Skip if audit log for this incident workflow already exists
    const existingAudit = await getFraudAuditLogsFiltered({
      incident_id: incident.incident_id,
      event_type: 'SECURITY_WORKFLOW_PROCESSED',
      limit: 1
    });

    if (existingAudit.auditLogs && existingAudit.auditLogs.length > 0) {
      console.log(`[Security Workflow] Incident ${incident.incident_id} security workflow already executed. Idempotent skip.`);
      return true;
    }

    // 2. Retrieve existing customer security state
    const existingSec = await getCustomerSecurity(incident.customer_id);
    const existingStatus = existingSec?.security_status || 'NORMAL';
    const existingPriority = SECURITY_PRIORITY[existingStatus] || 1;

    const rawAction = (incident.action || 'MONITOR').toUpperCase().trim();
    const normalizedAction = rawAction.replace(/-/g, '_');

    console.log(`[Security Workflow] [DIAGNOSTIC] Processing incident ${incident.incident_id} for customer ${incident.customer_id}: rawAction="${rawAction}", normalizedAction="${normalizedAction}"`);

    // Determine target security status based on action
    let candidateStatus = 'NORMAL';
    let restrictionType: string | null = null;
    let defaultMinutes = 60;
    let stepUpRequired = existingSec?.step_up_required || false;

    if (['MONITOR', 'FLAG', 'LOG', 'ALLOW', 'PASS', 'INFORM', 'IGNORE'].includes(normalizedAction)) {
      candidateStatus = 'NORMAL';
      if (typeof incident.restriction_minutes === 'number' && incident.restriction_minutes > 0) {
        restrictionType = 'TEMPORARY_RESTRICTION';
        defaultMinutes = incident.restriction_minutes;
        candidateStatus = 'RESTRICTED';
      }
    } else if (['STEP_UP_AUTHENTICATION', 'STEP_UP', 'VERIFY', 'OTP_REQUIRED', 'CHALLENGE', 'REQUIRE_OTP', 'AUTHENTICATE', '2FA_REQUIRED'].includes(normalizedAction)) {
      candidateStatus = 'STEP_UP_REQUIRED';
      stepUpRequired = true;
      if (typeof incident.restriction_minutes === 'number' && incident.restriction_minutes > 0) {
        restrictionType = 'STEP_UP_AUTHENTICATION';
        defaultMinutes = incident.restriction_minutes;
      }
    } else if (['TEMPORARY_PROTECTION', 'TEMP_PROTECTION', 'PROTECT', 'PROTECTION', 'ACCOUNT_PROTECTION', 'PROTECT_ACCOUNT'].includes(normalizedAction)) {
      candidateStatus = 'PROTECTED';
      restrictionType = 'TEMPORARY_PROTECTION';
      defaultMinutes = 60;
      stepUpRequired = true;
    } else if (['TEMPORARY_RESTRICTION', 'TEMP_RESTRICTION', 'RESTRICT', 'RESTRICTION', 'SUSPEND', 'SUSPENSION', 'BLOCK', 'BLOCKED', 'LOCK', 'LOCKED', 'DISABLE', 'DISABLED', 'BAN_TEMP'].includes(normalizedAction)) {
      candidateStatus = 'RESTRICTED';
      restrictionType = 'TEMPORARY_RESTRICTION';
      defaultMinutes = 1440; // 24 hours
      stepUpRequired = true;
    } else if (['ADMIN_REVIEW', 'REVIEW', 'MANUAL_REVIEW', 'ESCALATE', 'ADMIN_EVALUATION', 'PENDING_REVIEW'].includes(normalizedAction)) {
      candidateStatus = 'RESTRICTED';
      restrictionType = 'ADMIN_REVIEW';
      defaultMinutes = 2880; // 48 hours
      stepUpRequired = true;
    } else {
      candidateStatus = 'NORMAL';
      if (typeof incident.restriction_minutes === 'number' && incident.restriction_minutes > 0) {
        candidateStatus = 'RESTRICTED';
        restrictionType = 'TEMPORARY_RESTRICTION';
        defaultMinutes = incident.restriction_minutes;
        stepUpRequired = true;
      }
    }

    // 3. Enforce Priority Hierarchy: candidate status only upgrades status if candidatePriority > existingPriority
    const candidatePriority = SECURITY_PRIORITY[candidateStatus] || 1;
    const finalSecurityStatus = candidatePriority > existingPriority ? candidateStatus : existingStatus;

    console.log(`[Security Workflow] [DIAGNOSTIC] Evaluation: candidateStatus="${candidateStatus}" (priority ${candidatePriority}), existingStatus="${existingStatus}" (priority ${existingPriority}), finalStatus="${finalSecurityStatus}", restrictionType="${restrictionType}"`);

    let createdRestrictionId: string | null = null;

    // 4. Create Fraud Restriction if action requires restriction
    if (restrictionType) {
      createdRestrictionId = `restr_wf_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const minutes = typeof incident.restriction_minutes === 'number' && incident.restriction_minutes > 0
        ? incident.restriction_minutes
        : defaultMinutes;

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + minutes * 60 * 1000);

      const restrSuccess = await createFraudRestriction({
        restriction_id: createdRestrictionId,
        customer_id: incident.customer_id,
        incident_id: incident.incident_id,
        restriction_type: restrictionType,
        status: 'ACTIVE',
        reason: incident.reason || `FraudGuard ${restrictionType} applied`,
        started_at: startedAt,
        expires_at: expiresAt
      });

      if (!restrSuccess) {
        console.error(`[Security Workflow] [ERROR] Failed to persist fraud restriction ${createdRestrictionId} for customer ${incident.customer_id}`);
        createdRestrictionId = null;
      } else {
        console.log(`[Security Workflow] [SUCCESS] Fraud restriction persisted: id=${createdRestrictionId}, type=${restrictionType}, customer=${incident.customer_id}`);
      }
    }

    // Determine current active restriction ID for customer security record
    const activeRestr = await getActiveCustomerRestriction(incident.customer_id);
    const finalActiveRestrictionId = createdRestrictionId || (activeRestr ? activeRestr.restriction_id : null);

    // 5. Upsert Customer Security Record with priority-preserved status
    await upsertCustomerSecurity({
      customer_id: incident.customer_id,
      security_status: finalSecurityStatus,
      active_restriction_id: finalActiveRestrictionId,
      last_fraud_incident_id: incident.incident_id,
      step_up_required: stepUpRequired
    });

    console.log(`[Security Workflow] [DIAGNOSTIC] Customer security updated: customer=${incident.customer_id}, status=${finalSecurityStatus}, active_restriction=${finalActiveRestrictionId}, step_up=${stepUpRequired}`);

    // 6. Record Append-only Audit Log
    const auditId = `audit_wf_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await createFraudAuditRecord({
      audit_id: auditId,
      actor_type: 'FRAUDGUARD',
      actor_id: 'fraudguard-workflow',
      customer_id: incident.customer_id,
      incident_id: incident.incident_id,
      event_type: 'SECURITY_WORKFLOW_PROCESSED',
      event: `Security workflow executed for decision ${rawAction}`,
      reason: incident.reason || `Workflow processed for ${incident.fraud_type}`,
      evidence: {
        fraud_type: incident.fraud_type,
        risk_score: incident.risk_score,
        risk_level: incident.risk_level,
        severity: incident.severity
      },
      decision: rawAction,
      confidence: incident.ai_confidence || null,
      action: rawAction,
      approval: 'AUTO',
      result: 'SUCCESS',
      metadata: {
        workflow_action: rawAction,
        normalized_action: normalizedAction,
        previous_security_status: existingStatus,
        applied_security_status: finalSecurityStatus,
        restriction_id: createdRestrictionId,
        step_up_required: stepUpRequired
      }
    });

    console.log(`[Security Workflow] Successfully processed incident ${incident.incident_id} for customer ${incident.customer_id} (Action: ${rawAction}, Status: ${finalSecurityStatus})`);
    return true;

  } catch (err: any) {
    console.error(`[Security Workflow] Error processing workflow for incident ${incident.incident_id}:`, err?.message || err);
    // Non-blocking: workflow error caught cleanly without crashing main caller
    return false;
  }
}
