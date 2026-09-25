import express from 'express';
import http from 'http';
import { initDb, insertFraudIncident, createFraudRestriction, createVerificationChallenge, createFraudAdminAction, createFraudAuditRecord, upsertCustomerSecurity, hashOtp } from '../config/db';
import fraudRoutes from '../routes/fraudRoutes';

const app = express();
app.use(express.json());
app.use('/api/fraud', fraudRoutes);
app.get('/api/health', (_req, res) => res.json({ message: 'NexDay API Server running' }));

let server: http.Server;

async function requestJson(path: string, options: any = {}) {
  const address: any = server.address();
  const port = address.port;
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = http.request({
      host: 'localhost',
      port,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve({ status: res.statusCode || 200, body });
        } catch (e) {
          resolve({ status: res.statusCode || 200, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runStage3ApiTests() {
  console.log('====================================================');
  console.log('    FRAUDGUARD STAGE 3 REST API INTEGRATION TESTS   ');
  console.log('====================================================\n');

  // Initialize DB
  await initDb();

  // Seed known test data
  const testIncId = `INC-STAGE3-${Date.now()}`;
  const testCustId = 'CUST-STAGE3-001';
  const testRestrId = `RESTR-STAGE3-${Date.now()}`;
  const testAuditId = `AUDIT-STAGE3-${Date.now()}`;
  const testActId = `ACT-STAGE3-${Date.now()}`;

  await insertFraudIncident({
    incident_id: testIncId,
    customer_id: testCustId,
    fraud_type: 'MULTI_IP_LOGIN_ATTACK',
    severity: 'HIGH',
    reason: 'Stage 3 test incident',
    risk_score: 90,
    risk_level: 'HIGH',
    action: 'STEP_UP_AUTHENTICATION',
    requires_customer_action: true,
    requires_admin_review: false,
    restriction_minutes: 15,
    ai_attack_pattern: 'Distributed login',
    ai_finding: 'Multiple IPs used',
    ai_confidence: 0.9,
    ai_recommendation: 'STEP_UP_AUTHENTICATION',
    source_event_id: 'EVT-S3-1',
    source_event_type: 'login_failed',
    ip_address: '103.22.1.1',
    device_id: 'DEV-S3-1',
    session_id: 'SESS-S3-1',
    timestamp: new Date().toISOString()
  });

  await createFraudRestriction({
    restriction_id: testRestrId,
    customer_id: testCustId,
    incident_id: testIncId,
    restriction_type: 'TEMPORARY_RESTRICTION',
    status: 'ACTIVE',
    reason: 'Stage 3 active test restriction',
    started_at: new Date(),
    expires_at: new Date(Date.now() + 600000)
  });

  await createFraudAuditRecord({
    audit_id: testAuditId,
    actor_type: 'SYSTEM',
    actor_id: 'SYS-01',
    customer_id: testCustId,
    incident_id: testIncId,
    event_type: 'FRAUD_DECISION',
    event: 'STEP_UP_TRIGGERED',
    reason: 'Multi-IP attack',
    evidence: { ip_list: ['103.22.1.1', '103.22.1.2'] },
    decision: 'STEP_UP',
    confidence: 0.9,
    action: 'CREATE_CHALLENGE',
    approval: 'AUTO',
    result: 'SUCCESS',
    metadata: { version: 'v3.0' }
  });

  await createFraudAdminAction({
    action_id: testActId,
    admin_id: 'ADM-01',
    customer_id: testCustId,
    incident_id: testIncId,
    restriction_id: testRestrId,
    action: 'KEEP_RESTRICTED',
    reason: 'Under review',
    previous_state: 'NORMAL',
    new_state: 'RESTRICTED'
  });

  await upsertCustomerSecurity({
    customer_id: testCustId,
    account_status: 'ACTIVE',
    security_status: 'RESTRICTED',
    active_restriction_id: testRestrId,
    failed_login_count: 4,
    last_fraud_incident_id: testIncId,
    step_up_required: true
  });

  // Start ephemeral HTTP server
  server = app.listen(0);

  // Test 1: GET /api/fraud/incidents
  console.log('[Test 1] GET /api/fraud/incidents...');
  const res1 = await requestJson('/api/fraud/incidents');
  if (res1.status !== 200 || !res1.body.success || !Array.isArray(res1.body.data)) {
    throw new Error(`GET /api/fraud/incidents failed with status ${res1.status}`);
  }
  console.log(`✅ Test 1 Passed: Retrieved ${res1.body.count} incident(s).\n`);

  // Test 2: GET /api/fraud/incidents/:incidentId
  console.log(`[Test 2] GET /api/fraud/incidents/${testIncId}...`);
  const res2 = await requestJson(`/api/fraud/incidents/${testIncId}`);
  if (res2.status !== 200 || !res2.body.success || res2.body.data.incident_id !== testIncId) {
    throw new Error('GET /api/fraud/incidents/:incidentId failed');
  }
  console.log(`✅ Test 2 Passed: Single incident retrieved successfully.\n`);

  // Test 3: GET /api/fraud/customers/:customerId/incidents
  console.log(`[Test 3] GET /api/fraud/customers/${testCustId}/incidents...`);
  const res3 = await requestJson(`/api/fraud/customers/${testCustId}/incidents`);
  if (res3.status !== 200 || !res3.body.success || res3.body.data.length === 0) {
    throw new Error('GET customer incidents failed');
  }
  console.log(`✅ Test 3 Passed: Customer incidents retrieved.\n`);

  // Test 4: GET /api/fraud/customers/:customerId/security
  console.log(`[Test 4] GET /api/fraud/customers/${testCustId}/security...`);
  const res4 = await requestJson(`/api/fraud/customers/${testCustId}/security`);
  if (res4.status !== 200 || !res4.body.success || res4.body.data.security_status !== 'RESTRICTED') {
    throw new Error('GET customer security failed');
  }
  console.log(`✅ Test 4 Passed: Customer security state retrieved (Status: ${res4.body.data.security_status}).\n`);

  // Test 5: GET /api/fraud/restrictions
  console.log('[Test 5] GET /api/fraud/restrictions...');
  const res5 = await requestJson('/api/fraud/restrictions');
  if (res5.status !== 200 || !res5.body.success) {
    throw new Error('GET restrictions failed');
  }
  console.log(`✅ Test 5 Passed: Retrieved ${res5.body.count} restriction(s).\n`);

  // Test 6: GET /api/fraud/customers/:customerId/restrictions/active
  console.log(`[Test 6] GET /api/fraud/customers/${testCustId}/restrictions/active...`);
  const res6 = await requestJson(`/api/fraud/customers/${testCustId}/restrictions/active`);
  if (res6.status !== 200 || !res6.body.success || !res6.body.data) {
    throw new Error('GET active restriction failed');
  }
  console.log(`✅ Test 6 Passed: Active restriction retrieved (${res6.body.data.restriction_id}).\n`);

  // Test 7: GET /api/fraud/audit
  console.log('[Test 7] GET /api/fraud/audit...');
  const res7 = await requestJson('/api/fraud/audit');
  if (res7.status !== 200 || !res7.body.success) {
    throw new Error('GET audit logs failed');
  }
  console.log(`✅ Test 7 Passed: Retrieved ${res7.body.count} audit record(s).\n`);

  // Test 8: GET /api/fraud/incidents/:incidentId/audit
  console.log(`[Test 8] GET /api/fraud/incidents/${testIncId}/audit...`);
  const res8 = await requestJson(`/api/fraud/incidents/${testIncId}/audit`);
  if (res8.status !== 200 || !res8.body.success || res8.body.data.length === 0) {
    throw new Error('GET incident audit logs failed');
  }
  console.log(`✅ Test 8 Passed: Incident audit logs retrieved.\n`);

  // Test 9: GET /api/fraud/admin-actions
  console.log('[Test 9] GET /api/fraud/admin-actions...');
  const res9 = await requestJson('/api/fraud/admin-actions');
  if (res9.status !== 200 || !res9.body.success) {
    throw new Error('GET admin actions failed');
  }
  console.log(`✅ Test 9 Passed: Admin actions history retrieved.\n`);

  // Test 10: GET /api/fraud/overview
  console.log('[Test 10] GET /api/fraud/overview...');
  const res10 = await requestJson('/api/fraud/overview');
  if (res10.status !== 200 || !res10.body.success || typeof res10.body.data.total_incidents !== 'number') {
    throw new Error('GET fraud overview failed');
  }
  console.log(`✅ Test 10 Passed: Overview metrics aggregated (Total Incidents: ${res10.body.data.total_incidents}, Active Restrictions: ${res10.body.data.active_restrictions}).\n`);

  // Test 11: Pagination Test (limit=1&page=1)
  console.log('[Test 11] Pagination Test (limit=1)...');
  const res11 = await requestJson('/api/fraud/incidents?page=1&limit=1');
  if (res11.status !== 200 || res11.body.data.length !== 1 || res11.body.limit !== 1) {
    throw new Error('Pagination test failed');
  }
  console.log(`✅ Test 11 Passed: Pagination correctly bounded output to 1 item.\n`);

  // Test 12: Filtering Test (risk_level=HIGH)
  console.log('[Test 12] Filtering Test (risk_level=HIGH)...');
  const res12 = await requestJson('/api/fraud/incidents?risk_level=HIGH');
  if (res12.status !== 200 || !res12.body.data.every((i: any) => i.risk_level === 'HIGH')) {
    throw new Error('Filtering test failed');
  }
  console.log(`✅ Test 12 Passed: Filter risk_level=HIGH matched ${res12.body.count} record(s).\n`);

  // Test 13: 404 Behavior Test
  console.log('[Test 13] 404 Behavior Test (Non-existent ID)...');
  const res13 = await requestJson('/api/fraud/incidents/NON_EXISTENT_ID_9999');
  if (res13.status !== 404 || res13.body.success !== false) {
    throw new Error('404 test failed');
  }
  console.log(`✅ Test 13 Passed: Non-existent item correctly returned HTTP 404.\n`);

  // Test 14: Health & Existing API Backward Compatibility Test
  console.log('[Test 14] Existing API Health Check...');
  const res14 = await requestJson('/api/health');
  if (res14.status !== 200 || !res14.body.message) {
    throw new Error('Health check failed');
  }
  console.log(`✅ Test 14 Passed: Existing API /api/health returned 200 OK.\n`);

  server.close();

  console.log('====================================================');
  console.log('   ALL STAGE 3 REST API INTEGRATION TESTS PASSED!   ');
  console.log('====================================================');
  process.exit(0);
}

runStage3ApiTests().catch((err) => {
  console.error('❌ Stage 3 API Test Failed:', err);
  if (server) server.close();
  process.exit(1);
});
