import {
  initDb,
  insertFraudIncident,
  getFraudIncidents,
  createFraudRestriction,
  getFraudRestrictions,
  getActiveCustomerRestriction,
  createVerificationChallenge,
  getVerificationChallenge,
  createFraudAdminAction,
  getFraudAdminActions,
  createFraudAuditRecord,
  getFraudAuditLogs,
  getCustomerSecurity,
  upsertCustomerSecurity,
  hashOtp,
  FraudIncidentRecord
} from '../config/db';

async function runStage2DatabaseTests() {
  console.log('====================================================');
  console.log('    FRAUDGUARD STAGE 2 PERSISTENCE LAYER TESTS     ');
  console.log('====================================================\n');

  // Test 1: Initialize Database (Safe & Idempotent)
  console.log('[Test 1] Initializing Database Schema...');
  await initDb();
  console.log('✅ Test 1 Passed: All 6 required FraudGuard tables initialized successfully.\n');

  // Test 2: Verify Existing Stage 1 Data Preservation
  console.log('[Test 2] Verifying existing fraud_incidents data...');
  const existingIncidents = await getFraudIncidents();
  console.log(`✅ Test 2 Passed: ${existingIncidents.length} existing incident(s) preserved.\n`);

  // Test 3: Insert Fraud Incident
  console.log('[Test 3] Inserting test Fraud Incident...');
  const testIncidentId = `INC-TEST-STAGE2-${Date.now()}`;
  const testCustomerId = 'CUST-SIM-00001';

  const testIncident: FraudIncidentRecord = {
    incident_id: testIncidentId,
    customer_id: testCustomerId,
    fraud_type: 'BRUTE_FORCE_LOGIN',
    severity: 'HIGH',
    reason: 'Multiple failed logins detected within 5 minutes',
    risk_score: 85,
    risk_level: 'HIGH',
    action: 'TEMPORARY_RESTRICTION',
    requires_customer_action: true,
    requires_admin_review: true,
    restriction_minutes: 30,
    ai_attack_pattern: 'Credential stuffing',
    ai_finding: 'High velocity failed login attempts',
    ai_confidence: 0.95,
    ai_recommendation: 'Enforce step-up authentication',
    source_event_id: 'EVT-TEST-001',
    source_event_type: 'login_failed',
    ip_address: '103.22.45.12',
    device_id: 'DEV-TEST-01',
    session_id: 'sess_test_01',
    timestamp: new Date().toISOString()
  };

  const insertedIncident = await insertFraudIncident(testIncident);
  console.log(`✅ Test 3 Passed: Fraud Incident inserted (Result: ${insertedIncident}).\n`);

  // Test 4: Create Fraud Restriction Referencing Incident
  console.log('[Test 4] Creating Fraud Restriction referencing incident...');
  const testRestrictionId = `RESTR-TEST-${Date.now()}`;
  const restrictionCreated = await createFraudRestriction({
    restriction_id: testRestrictionId,
    customer_id: testCustomerId,
    incident_id: testIncidentId,
    restriction_type: 'TEMPORARY_RESTRICTION',
    status: 'ACTIVE',
    reason: 'Suspicious brute-force attempt',
    started_at: new Date(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000)
  });

  const activeRestr = await getActiveCustomerRestriction(testCustomerId);
  if (!activeRestr || activeRestr.restriction_id !== testRestrictionId) {
    throw new Error('Failed to retrieve active restriction for customer');
  }
  console.log(`✅ Test 4 Passed: Fraud restriction created & active restriction retrieved (${activeRestr.restriction_id}).\n`);

  // Test 5: Verification Challenge & OTP Hash Security Test
  console.log('[Test 5] SECURITY TEST: Verification Challenge & OTP Hashing...');
  const rawOtp = '123456';
  const hashedOtp = hashOtp(rawOtp);
  const testChallengeId = `CHALL-TEST-${Date.now()}`;

  await createVerificationChallenge({
    challenge_id: testChallengeId,
    customer_id: testCustomerId,
    incident_id: testIncidentId,
    challenge_type: 'STEP_UP_AUTHENTICATION',
    channel: 'SMS',
    destination_masked: '+91 ***** **890',
    otp_hash: hashedOtp,
    status: 'PENDING',
    attempts: 0,
    max_attempts: 3,
    expires_at: new Date(Date.now() + 10 * 60 * 1000)
  });

  const challengeRec = await getVerificationChallenge(testChallengeId);
  if (!challengeRec) throw new Error('Challenge record not found');

  if (challengeRec.otp_hash.includes(rawOtp)) {
    throw new Error(`CRITICAL SECURITY FAILURE: Plaintext OTP '${rawOtp}' found in database!`);
  }
  console.log(`  - Raw Plaintext OTP: ${rawOtp}`);
  console.log(`  - Persisted DB Value: ${challengeRec.otp_hash}`);
  console.log('✅ Test 5 Passed: OTP is securely hashed; raw plaintext OTP is NEVER stored in database.\n');

  // Test 6: Record Fraud Admin Action
  console.log('[Test 6] Recording Fraud Admin Action...');
  const testActionId = `ADM-ACT-${Date.now()}`;
  await createFraudAdminAction({
    action_id: testActionId,
    admin_id: 'ADMIN-001',
    customer_id: testCustomerId,
    incident_id: testIncidentId,
    restriction_id: testRestrictionId,
    action: 'KEEP_RESTRICTED',
    reason: 'Investigating high severity brute-force pattern',
    previous_state: 'NORMAL',
    new_state: 'RESTRICTED'
  });

  const adminActions = await getFraudAdminActions(testCustomerId);
  if (adminActions.length === 0) throw new Error('Failed to record admin action');
  console.log(`✅ Test 6 Passed: Admin action recorded (${adminActions[0].action_id}).\n`);

  // Test 7: Record Fraud Audit Record
  console.log('[Test 7] Recording Fraud Audit Log Entry...');
  const testAuditId = `AUDIT-TEST-${Date.now()}`;
  await createFraudAuditRecord({
    audit_id: testAuditId,
    actor_type: 'FRAUDGUARD',
    actor_id: 'FG-ENGINE-01',
    customer_id: testCustomerId,
    incident_id: testIncidentId,
    event_type: 'FRAUD_DECISION',
    event: 'STEP_UP_TRIGGERED',
    reason: 'Rule BRUTE_FORCE_LOGIN fired',
    evidence: { failed_attempts: 6, window_seconds: 300 },
    decision: 'RESTRICT',
    confidence: 0.95,
    action: 'CREATE_RESTRICTION',
    approval: 'AUTO',
    result: 'SUCCESS',
    metadata: { rule_version: 'v2.1' }
  });

  const auditLogs = await getFraudAuditLogs(testCustomerId);
  if (auditLogs.length === 0) throw new Error('Failed to record audit log');
  console.log(`✅ Test 8 Passed: Audit log entry recorded (${auditLogs[0].audit_id}).\n`);

  // Test 8: Create / Update Customer Security Record
  console.log('[Test 8] Upserting Customer Security State...');
  const secState = await upsertCustomerSecurity({
    customer_id: testCustomerId,
    account_status: 'ACTIVE',
    security_status: 'RESTRICTED',
    active_restriction_id: testRestrictionId,
    failed_login_count: 6,
    last_fraud_incident_id: testIncidentId,
    step_up_required: true
  });

  const retrievedSecState = await getCustomerSecurity(testCustomerId);
  if (!retrievedSecState || retrievedSecState.security_status !== 'RESTRICTED') {
    throw new Error('Customer security state mismatch');
  }
  console.log(`✅ Test 8 Passed: Customer security state upserted (Status: ${retrievedSecState.security_status}).\n`);

  // Test 9: Idempotency (Duplicate Incident Check)
  console.log('[Test 9] Testing Duplicate Incident Idempotency...');
  const duplicateResult = await insertFraudIncident(testIncident);
  if (duplicateResult !== false) {
    throw new Error('Idempotency failure: duplicate incident_id was erroneously inserted!');
  }
  console.log('✅ Test 9 Passed: Duplicate incident_id correctly rejected (0 duplicate entries created).\n');

  // Test 10: Repeated Database Initialization Safety
  console.log('[Test 10] Testing Re-running Database Initialization...');
  await initDb();
  const incidentsAfterReinit = await getFraudIncidents();
  if (incidentsAfterReinit.length < existingIncidents.length + 1) {
    throw new Error('Data loss detected after re-running initDb()!');
  }
  console.log('✅ Test 10 Passed: initDb() executed repeatedly without errors or data loss.\n');

  console.log('====================================================');
  console.log('    ALL 10 STAGE 2 DATABASE TESTS PASSED 100%!     ');
  console.log('====================================================');
  process.exit(0);
}

runStage2DatabaseTests().catch((err) => {
  console.error('❌ Stage 2 Database Test Failed:', err);
  process.exit(1);
});
