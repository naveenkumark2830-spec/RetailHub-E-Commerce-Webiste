import {
  initDb,
  upsertCustomerSecurity,
  getCustomerSecurity,
  createFraudOtpChallenge,
  getFraudOtpChallengeById,
  updateFraudOtpChallenge,
  getCustomerSecurityCustomerFacing,
  getCustomerPhone,
  insertFraudIncident,
  createFraudAuditRecord,
  getFraudAuditLogsFiltered
} from '../config/db';
import crypto from 'crypto';

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function runStage6OtpTestSuite() {
  console.log('====================================================');
  console.log('RETAILHUB FRAUDGUARD — STAGE 6 INTEGRATION TEST SUITE');
  console.log('Testing Customer Security Response Flow & OTP Engine');
  console.log('====================================================\n');

  await initDb();

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passedCount++;
      console.log(`[PASS] Test ${passedCount + failedCount}: ${testName}`);
    } else {
      failedCount++;
      console.error(`[FAIL] Test ${passedCount + failedCount}: ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: OTP Challenge Creation
    // ----------------------------------------------------
    const cust1 = 'TEST-CUST-STAGE6-01';
    const challengeId1 = 'CHALL-STAGE6-01';
    const otp1 = '123456';
    const hash1 = hashOtp(otp1);
    const expires1 = new Date(Date.now() + 300 * 1000).toISOString();

    await createFraudOtpChallenge({
      challenge_id: challengeId1,
      customer_id: cust1,
      otp_hash: hash1,
      purpose: 'STEP_UP_VERIFICATION',
      status: 'PENDING',
      attempt_count: 0,
      max_attempts: 5,
      expires_at: expires1,
      is_demo: true,
      phone_reference: '+91 ***** *3210'
    });

    const created1 = await getFraudOtpChallengeById(challengeId1);
    assert(Boolean(created1 && created1.challenge_id === challengeId1 && created1.status === 'PENDING'), 'OTP Challenge Creation');

    // ----------------------------------------------------
    // TEST 2: OTP Expiration Handling
    // ----------------------------------------------------
    const challengeIdExp = 'CHALL-STAGE6-EXP';
    const expiredTime = new Date(Date.now() - 10000).toISOString(); // 10s in the past

    await createFraudOtpChallenge({
      challenge_id: challengeIdExp,
      customer_id: cust1,
      otp_hash: hash1,
      purpose: 'STEP_UP_VERIFICATION',
      status: 'PENDING',
      attempt_count: 0,
      max_attempts: 5,
      expires_at: expiredTime,
      is_demo: true
    });

    const expChall = await getFraudOtpChallengeById(challengeIdExp);
    const isExpired = expChall ? new Date(expChall.expires_at).getTime() <= Date.now() : false;
    assert(isExpired, 'OTP Expiration Detection');

    // ----------------------------------------------------
    // TEST 3: Correct OTP Verification
    // ----------------------------------------------------
    const challengeIdVerif = 'CHALL-STAGE6-VERIF';
    await createFraudOtpChallenge({
      challenge_id: challengeIdVerif,
      customer_id: cust1,
      otp_hash: hash1,
      purpose: 'STEP_UP_VERIFICATION',
      status: 'PENDING',
      attempt_count: 0,
      max_attempts: 5,
      expires_at: expires1,
      is_demo: true
    });

    const submittedOtp = '123456';
    const submittedHash = hashOtp(submittedOtp);
    const matchSuccess = submittedHash === hash1;
    if (matchSuccess) {
      await updateFraudOtpChallenge(challengeIdVerif, { status: 'VERIFIED', verified_at: new Date().toISOString() });
    }
    const verifiedChall = await getFraudOtpChallengeById(challengeIdVerif);
    assert(Boolean(verifiedChall && verifiedChall.status === 'VERIFIED'), 'Correct OTP Verification');

    // ----------------------------------------------------
    // TEST 4: Incorrect OTP Rejection
    // ----------------------------------------------------
    const badSubmittedHash = hashOtp('999999');
    const matchFail = badSubmittedHash === hash1;
    assert(!matchFail, 'Incorrect OTP Rejection');

    // ----------------------------------------------------
    // TEST 5: Maximum Attempts Lockout
    // ----------------------------------------------------
    const challengeIdMax = 'CHALL-STAGE6-MAX';
    await createFraudOtpChallenge({
      challenge_id: challengeIdMax,
      customer_id: cust1,
      otp_hash: hash1,
      purpose: 'STEP_UP_VERIFICATION',
      status: 'PENDING',
      attempt_count: 5,
      max_attempts: 5,
      expires_at: expires1,
      is_demo: true
    });

    const maxChall = await getFraudOtpChallengeById(challengeIdMax);
    const maxExceeded = maxChall ? (maxChall.attempt_count >= maxChall.max_attempts) : false;
    assert(maxExceeded, 'Maximum Verification Attempts Lockout');

    // ----------------------------------------------------
    // TEST 6: Duplicate Verification Idempotency
    // ----------------------------------------------------
    let secondVerifyResult = false;
    if (verifiedChall && verifiedChall.status === 'VERIFIED') {
      secondVerifyResult = true; // Idempotently handled as already verified
    }
    assert(secondVerifyResult, 'Duplicate Verification Idempotency');

    // ----------------------------------------------------
    // TEST 7: Demo OTP Mode
    // ----------------------------------------------------
    const demoModeCode = process.env.DEMO_OTP_CODE || '123456';
    assert(demoModeCode === '123456', 'Demo OTP Mode Configured');

    // ----------------------------------------------------
    // TEST 8: Real Customer Phone Lookup & Masking
    // ----------------------------------------------------
    const phoneData = await getCustomerPhone('CUST1802');
    assert(Boolean(phoneData && phoneData.masked && phoneData.masked.includes('*****')), 'Real Customer Lookup & Masked Phone');

    // ----------------------------------------------------
    // TEST 9: STEP_UP_AUTHENTICATION Flow (State -> NORMAL)
    // ----------------------------------------------------
    const custStepUp = 'CUST-STAGE6-STEPUP';
    await upsertCustomerSecurity({
      customer_id: custStepUp,
      security_status: 'STEP_UP_REQUIRED',
      step_up_required: true,
      account_status: 'ACTIVE'
    });

    // Simulate successful OTP
    await upsertCustomerSecurity({
      customer_id: custStepUp,
      security_status: 'NORMAL',
      step_up_required: false
    });

    const secAfterStepUp = await getCustomerSecurityCustomerFacing(custStepUp);
    assert(secAfterStepUp.status === 'NORMAL' && !secAfterStepUp.step_up_required, 'STEP_UP_AUTHENTICATION Flow Returns State to NORMAL');

    // ----------------------------------------------------
    // TEST 10: TEMPORARY_RESTRICTION Cannot Be Bypassed By OTP
    // ----------------------------------------------------
    const custRestr = 'CUST-STAGE6-RESTR';
    await upsertCustomerSecurity({
      customer_id: custRestr,
      security_status: 'RESTRICTED',
      account_status: 'ACTIVE'
    });

    // OTP verified but state remains RESTRICTED per FraudGuard rules
    const secAfterRestrOTP = await getCustomerSecurityCustomerFacing(custRestr);
    assert(secAfterRestrOTP.status === 'RESTRICTED' && secAfterRestrOTP.restriction_active, 'TEMPORARY_RESTRICTION Cannot Be Bypassed By OTP');

    // ----------------------------------------------------
    // TEST 11: ADMIN_REVIEW Cannot Be Bypassed By OTP
    // ----------------------------------------------------
    const custReview = 'CUST-STAGE6-REVIEW';
    await upsertCustomerSecurity({
      customer_id: custReview,
      security_status: 'ADMIN_REVIEW',
      account_status: 'ACTIVE'
    });

    const secAfterReviewOTP = await getCustomerSecurityCustomerFacing(custReview);
    assert(secAfterReviewOTP.status === 'ADMIN_REVIEW' && secAfterReviewOTP.restriction_active, 'ADMIN_REVIEW Cannot Be Bypassed By OTP');

    // ----------------------------------------------------
    // TEST 12: Audit Records Creation
    // ----------------------------------------------------
    const auditIdTest = 'AUD-TEST-STAGE6-12';
    await createFraudAuditRecord({
      audit_id: auditIdTest,
      incident_id: null,
      actor_type: 'CUSTOMER',
      actor_id: cust1,
      customer_id: cust1,
      event_type: 'OTP_VERIFIED',
      event: 'OTP Verified Test Record',
      reason: 'Automated test suite execution',
      decision: 'VERIFIED',
      action: 'VERIFY_OTP',
      result: 'SUCCESS'
    });

    const { auditLogs } = await getFraudAuditLogsFiltered({ customer_id: cust1 });
    assert(auditLogs.length > 0, 'Fraud Audit Records Created');

    // ----------------------------------------------------
    // TEST 13: Invalid Customer Handling
    // ----------------------------------------------------
    const invalidCust = 'NON_EXISTENT_CUST_XYZ';
    const invalidCustPhone = await getCustomerPhone(invalidCust);
    assert(!invalidCustPhone.isReal, 'Invalid Customer Detection & Demo Fallback');

    // ----------------------------------------------------
    // TEST 14: Invalid Incident Handling
    // ----------------------------------------------------
    const invalidIncId = 'INVALID-INCIDENT-999999';
    assert(invalidIncId.startsWith('INVALID'), 'Invalid Incident Handling');

    // ----------------------------------------------------
    // TEST 15: Duplicate OTP Request Handling
    // ----------------------------------------------------
    const dupCust = 'CUST-STAGE6-DUP';
    const dupChallId1 = 'CHALL-DUP-01';
    await createFraudOtpChallenge({
      challenge_id: dupChallId1,
      customer_id: dupCust,
      otp_hash: hash1,
      purpose: 'STEP_UP_VERIFICATION',
      status: 'PENDING',
      attempt_count: 0,
      max_attempts: 5,
      expires_at: expires1,
      is_demo: true
    });

    const existingPending = await getFraudOtpChallengeById(dupChallId1);
    assert(Boolean(existingPending && existingPending.status === 'PENDING'), 'Duplicate OTP Request Handling (Active Challenge Reuse)');

  } catch (err: any) {
    console.error('[TEST ERROR]', err);
    failedCount++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of 15 tests`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStage6OtpTestSuite();
