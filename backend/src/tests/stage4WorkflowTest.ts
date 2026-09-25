import {
  initDb,
  insertFraudIncident,
  getCustomerSecurity,
  getActiveCustomerRestriction,
  getFraudAuditLogsFiltered,
  getFraudRestrictionsFiltered,
  FraudIncidentRecord
} from '../config/db';
import { processFraudSecurityWorkflow, SECURITY_PRIORITY } from '../services/fraudSecurityWorkflow';

async function runStage4WorkflowTests() {
  console.log('====================================================');
  console.log('   FRAUDGUARD STAGE 4 SECURITY WORKFLOW TESTS     ');
  console.log('====================================================\n');

  // Test 1: Initialize Database Schema
  console.log('[Test 1] Initializing Database Schema...');
  await initDb();
  console.log('✅ Test 1 Passed: Database schema initialized successfully.\n');

  // Test 2: Verify Priority Hierarchy Map
  console.log('[Test 2] Verifying Security Priority Hierarchy...');
  if (
    SECURITY_PRIORITY.BANNED <= SECURITY_PRIORITY.DEACTIVATED ||
    SECURITY_PRIORITY.DEACTIVATED <= SECURITY_PRIORITY.RESTRICTED ||
    SECURITY_PRIORITY.RESTRICTED <= SECURITY_PRIORITY.PROTECTED ||
    SECURITY_PRIORITY.PROTECTED <= SECURITY_PRIORITY.STEP_UP_REQUIRED ||
    SECURITY_PRIORITY.STEP_UP_REQUIRED <= SECURITY_PRIORITY.NORMAL
  ) {
    throw new Error('CRITICAL FAILURE: Security status priority hierarchy order is incorrect!');
  }
  console.log('✅ Test 2 Passed: Priority hierarchy correctly defined (BANNED > DEACTIVATED > RESTRICTED > PROTECTED > STEP_UP_REQUIRED > NORMAL).\n');

  // Test 3: MONITOR Action Workflow
  console.log('[Test 3] Testing MONITOR action workflow...');
  const custId1 = `CUST-STG4-MON-${Date.now()}`;
  const incMonitor: FraudIncidentRecord = {
    incident_id: `INC-STG4-MON-${Date.now()}`,
    customer_id: custId1,
    fraud_type: 'CHECKOUT_VELOCITY',
    severity: 'LOW',
    reason: 'Normal checkout activity',
    risk_score: 15,
    risk_level: 'LOW',
    action: 'MONITOR',
    requires_customer_action: false,
    requires_admin_review: false,
    restriction_minutes: null,
    ai_attack_pattern: null,
    ai_finding: null,
    ai_confidence: 0.2,
    ai_recommendation: null,
    source_event_id: 'EVT-001',
    source_event_type: 'checkout',
    ip_address: '192.168.1.1',
    device_id: 'DEV-001',
    session_id: 'SESS-001',
    timestamp: new Date().toISOString()
  };

  await insertFraudIncident(incMonitor);
  const monRes = await processFraudSecurityWorkflow(incMonitor);
  if (!monRes) throw new Error('MONITOR workflow execution returned false');

  const secMon = await getCustomerSecurity(custId1);
  if (!secMon || secMon.security_status !== 'NORMAL') {
    throw new Error(`Expected security status NORMAL, got ${secMon?.security_status}`);
  }
  const auditMon = await getFraudAuditLogsFiltered({ incident_id: incMonitor.incident_id });
  if (auditMon.auditLogs.length === 0) throw new Error('Audit log for MONITOR action missing');
  console.log(`✅ Test 3 Passed: MONITOR action created NORMAL status & logged audit entry.\n`);

  // Test 4: STEP_UP_AUTHENTICATION Action Workflow
  console.log('[Test 4] Testing STEP_UP_AUTHENTICATION action workflow...');
  const custId2 = `CUST-STG4-STEP-${Date.now()}`;
  const incStep: FraudIncidentRecord = {
    incident_id: `INC-STG4-STEP-${Date.now()}`,
    customer_id: custId2,
    fraud_type: 'BRUTE_FORCE_LOGIN',
    severity: 'MEDIUM',
    reason: 'Multiple failed login attempts',
    risk_score: 55,
    risk_level: 'MEDIUM',
    action: 'STEP_UP_AUTHENTICATION',
    requires_customer_action: true,
    requires_admin_review: false,
    restriction_minutes: null,
    ai_attack_pattern: 'Credential testing',
    ai_finding: 'Repeated failed auth from unknown IP',
    ai_confidence: 0.85,
    ai_recommendation: 'Request OTP verification',
    source_event_id: 'EVT-002',
    source_event_type: 'login_failed',
    ip_address: '192.168.1.2',
    device_id: 'DEV-002',
    session_id: 'SESS-002',
    timestamp: new Date().toISOString()
  };

  await insertFraudIncident(incStep);
  const stepRes = await processFraudSecurityWorkflow(incStep);
  if (!stepRes) throw new Error('STEP_UP_AUTHENTICATION workflow execution returned false');

  const secStep = await getCustomerSecurity(custId2);
  if (!secStep || secStep.security_status !== 'STEP_UP_REQUIRED' || !secStep.step_up_required) {
    throw new Error(`Expected STEP_UP_REQUIRED security status with step_up_required=true, got ${JSON.stringify(secStep)}`);
  }
  const auditStep = await getFraudAuditLogsFiltered({ incident_id: incStep.incident_id });
  if (auditStep.auditLogs.length === 0) throw new Error('Audit log for STEP_UP_AUTHENTICATION action missing');
  console.log(`✅ Test 4 Passed: STEP_UP_AUTHENTICATION set status STEP_UP_REQUIRED & step_up_required=true.\n`);

  // Test 5: TEMPORARY_PROTECTION Action Workflow
  console.log('[Test 5] Testing TEMPORARY_PROTECTION action workflow...');
  const custId3 = `CUST-STG4-PROT-${Date.now()}`;
  const incProt: FraudIncidentRecord = {
    incident_id: `INC-STG4-PROT-${Date.now()}`,
    customer_id: custId3,
    fraud_type: 'ACCOUNT_CHANGE_NEW_DEVICE',
    severity: 'HIGH',
    reason: 'Password change from unrecognized device',
    risk_score: 75,
    risk_level: 'HIGH',
    action: 'TEMPORARY_PROTECTION',
    requires_customer_action: true,
    requires_admin_review: false,
    restriction_minutes: 60,
    ai_attack_pattern: 'Account takeover attempt',
    ai_finding: 'Critical credential update on new IP',
    ai_confidence: 0.90,
    ai_recommendation: 'Place account under temporary protection',
    source_event_id: 'EVT-003',
    source_event_type: 'password_changed',
    ip_address: '192.168.1.3',
    device_id: 'DEV-003',
    session_id: 'SESS-003',
    timestamp: new Date().toISOString()
  };

  await insertFraudIncident(incProt);
  const protRes = await processFraudSecurityWorkflow(incProt);
  if (!protRes) throw new Error('TEMPORARY_PROTECTION workflow execution returned false');

  const secProt = await getCustomerSecurity(custId3);
  if (!secProt || secProt.security_status !== 'PROTECTED' || !secProt.active_restriction_id) {
    throw new Error(`Expected PROTECTED security status with active restriction ID, got ${JSON.stringify(secProt)}`);
  }
  const restrProt = await getActiveCustomerRestriction(custId3);
  if (!restrProt || restrProt.restriction_type !== 'TEMPORARY_PROTECTION') {
    throw new Error(`Expected active TEMPORARY_PROTECTION restriction record, got ${JSON.stringify(restrProt)}`);
  }
  console.log(`✅ Test 5 Passed: TEMPORARY_PROTECTION restriction created (${restrProt.restriction_id}) & security status updated to PROTECTED.\n`);

  // Test 6: TEMPORARY_RESTRICTION Action Workflow
  console.log('[Test 6] Testing TEMPORARY_RESTRICTION action workflow...');
  const custId4 = `CUST-STG4-REST-${Date.now()}`;
  const incRest: FraudIncidentRecord = {
    incident_id: `INC-STG4-REST-${Date.now()}`,
    customer_id: custId4,
    fraud_type: 'PAYMENT_FAILURE_VELOCITY',
    severity: 'HIGH',
    reason: 'Excessive credit card authorization failures',
    risk_score: 88,
    risk_level: 'HIGH',
    action: 'TEMPORARY_RESTRICTION',
    requires_customer_action: true,
    requires_admin_review: true,
    restriction_minutes: 120,
    ai_attack_pattern: 'Card testing attack',
    ai_finding: '10+ payment failures in 2 minutes',
    ai_confidence: 0.96,
    ai_recommendation: 'Apply temporary transaction restriction',
    source_event_id: 'EVT-004',
    source_event_type: 'payment_failed',
    ip_address: '192.168.1.4',
    device_id: 'DEV-004',
    session_id: 'SESS-004',
    timestamp: new Date().toISOString()
  };

  await insertFraudIncident(incRest);
  const restRes = await processFraudSecurityWorkflow(incRest);
  if (!restRes) throw new Error('TEMPORARY_RESTRICTION workflow execution returned false');

  const secRest = await getCustomerSecurity(custId4);
  if (!secRest || secRest.security_status !== 'RESTRICTED' || !secRest.active_restriction_id) {
    throw new Error(`Expected RESTRICTED status, got ${JSON.stringify(secRest)}`);
  }
  const restrRest = await getActiveCustomerRestriction(custId4);
  if (!restrRest || restrRest.restriction_type !== 'TEMPORARY_RESTRICTION') {
    throw new Error(`Expected active TEMPORARY_RESTRICTION record, got ${JSON.stringify(restrRest)}`);
  }
  console.log(`✅ Test 6 Passed: TEMPORARY_RESTRICTION restriction created (${restrRest.restriction_id}) & status updated to RESTRICTED.\n`);

  // Test 7: ADMIN_REVIEW Action Workflow
  console.log('[Test 7] Testing ADMIN_REVIEW action workflow...');
  const custId5 = `CUST-STG4-ADM-${Date.now()}`;
  const incAdm: FraudIncidentRecord = {
    incident_id: `INC-STG4-ADM-${Date.now()}`,
    customer_id: custId5,
    fraud_type: 'HIGH_VALUE_TRANSACTION',
    severity: 'CRITICAL',
    reason: 'Anomalous high value transaction from new IP',
    risk_score: 95,
    risk_level: 'CRITICAL',
    action: 'ADMIN_REVIEW',
    requires_customer_action: true,
    requires_admin_review: true,
    restriction_minutes: 2880,
    ai_attack_pattern: 'High value fraud',
    ai_finding: 'INR 450,000 order attempt on fresh account',
    ai_confidence: 0.98,
    ai_recommendation: 'Escalate to security compliance analyst for review',
    source_event_id: 'EVT-005',
    source_event_type: 'order_created',
    ip_address: '192.168.1.5',
    device_id: 'DEV-005',
    session_id: 'SESS-005',
    timestamp: new Date().toISOString()
  };

  await insertFraudIncident(incAdm);
  const admRes = await processFraudSecurityWorkflow(incAdm);
  if (!admRes) throw new Error('ADMIN_REVIEW workflow execution returned false');

  const restrAdm = await getActiveCustomerRestriction(custId5);
  if (!restrAdm || restrAdm.restriction_type !== 'ADMIN_REVIEW') {
    throw new Error(`Expected ADMIN_REVIEW restriction type, got ${JSON.stringify(restrAdm)}`);
  }
  console.log(`✅ Test 7 Passed: ADMIN_REVIEW restriction created (${restrAdm.restriction_id}) & escalated for admin review.\n`);

  // Test 8: Idempotency Verification
  console.log('[Test 8] Testing Workflow Idempotency (Duplicate Prevention)...');
  const initialAuditCount = (await getFraudAuditLogsFiltered({ incident_id: incRest.incident_id })).total;
  const initialRestrCount = (await getFraudRestrictionsFiltered({ incident_id: incRest.incident_id })).total;

  // Run workflow again for same incident
  const idempRes = await processFraudSecurityWorkflow(incRest);
  if (!idempRes) throw new Error('Idempotent re-execution returned false');

  const finalAuditCount = (await getFraudAuditLogsFiltered({ incident_id: incRest.incident_id })).total;
  const finalRestrCount = (await getFraudRestrictionsFiltered({ incident_id: incRest.incident_id })).total;

  if (finalAuditCount !== initialAuditCount || finalRestrCount !== initialRestrCount) {
    throw new Error(`Idempotency failure: duplicate records created! Audit: ${initialAuditCount} -> ${finalAuditCount}, Restrictions: ${initialRestrCount} -> ${finalRestrCount}`);
  }
  console.log('✅ Test 8 Passed: Re-executing workflow for duplicate incident safely skipped (0 duplicate restrictions or audit entries created).\n');

  // Test 9: Security Status Priority Downgrade Protection
  console.log('[Test 9] Testing Security Status Priority Downgrade Protection...');
  // Customer custId4 is currently RESTRICTED (Priority 4)
  const lowerIncident: FraudIncidentRecord = {
    incident_id: `INC-STG4-LOWER-${Date.now()}`,
    customer_id: custId4, // Same customer as Test 6!
    fraud_type: 'CHECKOUT_VELOCITY',
    severity: 'LOW',
    reason: 'Minor checkout velocity notification',
    risk_score: 30,
    risk_level: 'LOW',
    action: 'STEP_UP_AUTHENTICATION', // Priority 2 (lower than RESTRICTED Priority 4)
    requires_customer_action: true,
    requires_admin_review: false,
    restriction_minutes: null,
    ai_attack_pattern: null,
    ai_finding: null,
    ai_confidence: 0.4,
    ai_recommendation: null,
    source_event_id: 'EVT-006',
    source_event_type: 'checkout',
    ip_address: '192.168.1.4',
    device_id: 'DEV-004',
    session_id: 'SESS-004',
    timestamp: new Date().toISOString()
  };

  await insertFraudIncident(lowerIncident);
  await processFraudSecurityWorkflow(lowerIncident);

  const customerSecAfterLower = await getCustomerSecurity(custId4);
  if (!customerSecAfterLower || customerSecAfterLower.security_status !== 'RESTRICTED') {
    throw new Error(`SECURITY DOWNGRADE VIOLATION: Customer status degraded from RESTRICTED to ${customerSecAfterLower?.security_status}!`);
  }
  console.log('✅ Test 9 Passed: Security status RESTRICTED (Priority 4) preserved; lower-priority STEP_UP_AUTHENTICATION (Priority 2) did NOT downgrade customer status.\n');

  // Test 10: Graceful Failure Handling
  console.log('[Test 10] Testing Graceful Failure Handling on invalid input...');
  const failRes = await processFraudSecurityWorkflow(null as any);
  if (failRes !== false) {
    throw new Error('Expected invalid input handling to return false');
  }
  console.log('✅ Test 10 Passed: Invalid inputs handled safely without uncaught exceptions.\n');

  console.log('====================================================');
  console.log('   ALL 10 STAGE 4 WORKFLOW TESTS PASSED 100%!       ');
  console.log('====================================================');
  process.exit(0);
}

runStage4WorkflowTests().catch((err) => {
  console.error('❌ Stage 4 Workflow Test Failed:', err);
  process.exit(1);
});
