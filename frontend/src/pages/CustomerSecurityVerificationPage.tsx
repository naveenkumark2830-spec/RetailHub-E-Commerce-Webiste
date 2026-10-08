import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldAlert, RefreshCw, CheckCircle, AlertTriangle, 
  Phone, ArrowRight, Shield, Clock, UserCheck, CheckCircle2
} from 'lucide-react';
import { Header } from '../components/Header';
import { useSessionStore } from '../store/useSessionStore';

interface SecurityStatusResponse {
  success: boolean;
  customer_id: string;
  security_status: string;
  step_up_required: boolean;
  is_restricted: boolean;
  is_banned: boolean;
  restriction_type: string | null;
  restriction_reason: string | null;
  started_at?: string | null;
  expires_at: string | null;
  phone_masked?: string | null;
  pending_challenge: {
    challenge_id: string;
    expires_at: string;
    attempts_left: number;
    channel: string;
  } | null;
}

interface OtpRequestResponse {
  success: boolean;
  challenge_id: string;
  channel?: string;
  masked_phone?: string;
  phone_masked?: string;
  expires_in_seconds?: number;
  expires_in?: number;
  message?: string;
  error?: string;
}

interface OtpVerifyResponse {
  success: boolean;
  verified: boolean;
  message: string;
  new_security_status?: string;
  step_up_cleared?: boolean;
  attempts_exceeded?: boolean;
  is_restricted?: boolean;
  expires_at?: string;
  error?: string;
}

export const CustomerSecurityVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customer } = useSessionStore();

  const customerIdFromQuery = searchParams.get('customer_id');
  const initialCustomerId = customerIdFromQuery || customer?.customer_id || 'CUST_1001';

  const [targetCustomerId, setTargetCustomerId] = useState<string>(initialCustomerId);
  const [inputCustId, setInputCustId] = useState<string>(initialCustomerId);

  const [, setLoading] = useState<boolean>(true);
  const [secData, setSecData] = useState<SecurityStatusResponse | null>(null);

  // OTP State Machine: 'INITIAL' | 'SENT' | 'VERIFIED' | 'ATTEMPTS_EXCEEDED'
  const [otpStage, setOtpStage] = useState<'INITIAL' | 'SENT' | 'VERIFIED' | 'ATTEMPTS_EXCEEDED'>('INITIAL');
  
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string>('+91 ••••••4821');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const maxAttempts = 3;

  const [requestingOtp, setRequestingOtp] = useState<boolean>(false);
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fetchSecurityStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fraud/customer/${targetCustomerId}/security`);
      if (res.ok) {
        const response = await res.json();
        const rawData = response.data || response;
        const parsed: SecurityStatusResponse = {
          success: response.success ?? true,
          customer_id: rawData.customer_id || targetCustomerId,
          security_status: rawData.security_status || rawData.status || 'NORMAL',
          step_up_required: rawData.step_up_required || false,
          is_restricted: rawData.is_restricted || rawData.restriction_active || false,
          is_banned: rawData.is_banned || rawData.status === 'BANNED' || rawData.security_status === 'BANNED',
          restriction_type: rawData.restriction_type || null,
          restriction_reason: rawData.restriction_reason || rawData.message || null,
          started_at: rawData.started_at || null,
          expires_at: rawData.expires_at || null,
          phone_masked: rawData.phone_masked || '+91 ••••••4821',
          pending_challenge: rawData.pending_challenge || null
        };
        setSecData(parsed);

        if (parsed.phone_masked) {
          setMaskedPhone(parsed.phone_masked);
        }

        // If banned, redirect to /account-banned
        if (parsed.is_banned || parsed.security_status === 'BANNED' || parsed.security_status === 'DEACTIVATED') {
          navigate(`/account-banned?customer_id=${targetCustomerId}`, { replace: true });
          return;
        }

        // If restricted and restriction is active, redirect to /account-restricted
        if (parsed.is_restricted && parsed.expires_at && new Date(parsed.expires_at).getTime() > Date.now()) {
          navigate(`/account-restricted?customer_id=${targetCustomerId}`, { replace: true });
          return;
        }

        if (parsed.security_status === 'NORMAL' && otpStage !== 'VERIFIED') {
          setOtpStage('INITIAL');
        }
      }
    } catch (err) {
      console.error('Failed to fetch security status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
  }, [targetCustomerId]);

  // Handle OTP countdown timer
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const handleRequestOtp = async () => {
    setRequestingOtp(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/fraud/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: targetCustomerId,
          channel: 'sms'
        })
      });
      const data: OtpRequestResponse = await res.json();
      if (data.success) {
        setChallengeId(data.challenge_id);
        const pMask = data.masked_phone || data.phone_masked || secData?.phone_masked || '+91 ••••••4821';
        setMaskedPhone(pMask);
        setTimerSeconds(data.expires_in_seconds || data.expires_in || 300);
        setOtpStage('SENT');
        setFeedback({
          type: 'info',
          message: `Verification code sent to ${pMask}.`
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to send verification code. Please try again.'
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Network error requesting OTP code.'
      });
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const trigger24HourRestriction = async () => {
    setOtpStage('ATTEMPTS_EXCEEDED');
    try {
      await fetch('/api/fraud/admin/restrict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: targetCustomerId,
          duration_minutes: 1440,
          reason: 'Maximum verification attempts exceeded (3 failed OTP attempts). Account restricted for 24 hours.'
        })
      });
    } catch (e) {}
    
    // Redirect to Restricted Account Page
    setTimeout(() => {
      navigate(`/account-restricted?customer_id=${targetCustomerId}`, { replace: true });
    }, 1500);
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setFeedback({ type: 'error', message: 'Please enter all 6 digits of the verification code.' });
      return;
    }

    setVerifyingOtp(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/fraud/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: targetCustomerId,
          challenge_id: challengeId || undefined,
          otp: code,
          otp_code: code
        })
      });
      const data: OtpVerifyResponse = await res.json();
      if (data.success && data.verified) {
        setOtpStage('VERIFIED');
        setFeedback({
          type: 'success',
          message: 'Your account has been verified. You can now continue shopping.'
        });
        setOtpDigits(['', '', '', '', '', '']);
        await fetchSecurityStatus();
      } else {
        const nextAttempts = attemptCount + 1;
        setAttemptCount(nextAttempts);

        if (nextAttempts >= maxAttempts || data.attempts_exceeded) {
          setFeedback({
            type: 'error',
            message: 'Maximum verification attempts exceeded (3 failed attempts). Account restricted for 24 hours. Redirecting...'
          });
          await trigger24HourRestriction();
        } else {
          setFeedback({
            type: 'error',
            message: data.error || data.message || `Invalid verification code. Attempt ${nextAttempts} of ${maxAttempts}.`
          });
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error verifying OTP code.' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 select-none">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        
        {/* Top Header & Customer Selector */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Verify Your Account
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Your account requires identity verification before you can continue shopping.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs font-bold text-slate-400">ID:</span>
            <input
              type="text"
              value={inputCustId}
              onChange={(e) => setInputCustId(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                const clean = inputCustId.trim();
                if (clean) {
                  setTargetCustomerId(clean);
                  setOtpStage('INITIAL');
                  setAttemptCount(0);
                  setFeedback(null);
                  navigate(`/security-verification?customer_id=${clean}`, { replace: true });
                }
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
            >
              Load
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 shadow-2xs ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
            feedback.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
            'bg-blue-50 text-blue-900 border border-blue-200'
          }`}>
            {feedback.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {feedback.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
            {feedback.type === 'info' && <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* ================================================== */}
        {/* MAIN CARD STAGES                                   */}
        {/* ================================================== */}

        {/* STAGE 1: INITIAL STATE (Send OTP) */}
        {otpStage === 'INITIAL' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 text-center p-8">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Account Verification Required</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-4">
              We'll send a 6-digit One-Time Password (OTP) to your registered mobile number for identity verification.
            </p>

            <div className="inline-block px-4 py-2 bg-slate-100 rounded-xl font-mono text-base font-bold text-slate-800 tracking-wider mb-6 border border-slate-200">
              {maskedPhone}
            </div>

            <div className="block">
              <button
                onClick={handleRequestOtp}
                disabled={requestingOtp}
                className="w-full max-w-xs mx-auto py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {requestingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-5">
              Your OTP will expire after 5 minutes.
            </p>
          </div>
        )}

        {/* STAGE 2: AFTER SEND OTP (Enter 6-Digit Code) */}
        {otpStage === 'SENT' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8 p-8 max-w-md mx-auto text-center">
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Enter Verification Code</h2>
            <p className="text-sm text-slate-600 mb-6">
              We've sent a 6-digit OTP to <span className="font-bold text-slate-800 font-mono">{maskedPhone}</span>
            </p>

            <form onSubmit={handleVerifyOtp}>
              {/* 6 Individual OTP Boxes */}
              <div className="flex justify-center gap-2 mb-6">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-extrabold font-mono border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                  />
                ))}
              </div>

              {/* Expiry Timer */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-mono mb-6">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Expires in <strong className="text-slate-800">{formatTimer(timerSeconds)}</strong></span>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={verifyingOtp || otpDigits.join('').length < 6}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
              >
                {verifyingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Verify OTP</span>
                  </>
                )}
              </button>

              {/* Resend Link */}
              <div className="text-xs text-slate-500">
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={requestingOtp}
                  className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STAGE 3: SUCCESSFUL VERIFICATION */}
        {otpStage === 'VERIFIED' && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden mb-8 text-center p-8 max-w-md mx-auto space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification Complete</h2>
              <p className="text-sm text-slate-600 mt-2 font-medium">
                Your identity has been verified and your shopping access has been restored.
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        )}

        {/* STAGE 4: ATTEMPTS EXCEEDED LOCKOUT */}
        {otpStage === 'ATTEMPTS_EXCEEDED' && (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden mb-8 p-8 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900">Verification Attempt Limit Exceeded</h2>

            <p className="text-sm text-slate-600 font-medium">
              You failed to enter the correct OTP in 3 attempts. For security, your account has been restricted for 24 hours.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
              Access available after: {new Date(Date.now() + 24 * 3600 * 1000).toLocaleString()}
            </div>

            <button
              onClick={() => navigate(`/account-restricted?customer_id=${targetCustomerId}`)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition cursor-pointer shadow-sm"
            >
              Go to Restriction Page
            </button>
          </div>
        )}

      </main>
    </div>
  );
};

export default CustomerSecurityVerificationPage;
