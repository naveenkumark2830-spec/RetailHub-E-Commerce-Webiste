import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { Header } from '../components/Header';
import { useSessionStore } from '../store/useSessionStore';

interface SecurityStatusResponse {
  success: boolean;
  customer_id: string;
  security_status: string;
  is_restricted: boolean;
  started_at: string | null;
  expires_at: string | null;
  restriction_type: string | null;
  restriction_reason: string | null;
  message: string | null;
}

export const CustomerAccountRestrictedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customer } = useSessionStore();

  const customerIdFromQuery = searchParams.get('customer_id');
  const targetCustomerId = customerIdFromQuery || customer?.customer_id || 'CUST_1001';

  const [loading, setLoading] = useState<boolean>(true);
  const [secData, setSecData] = useState<SecurityStatusResponse | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fraud/customer/${targetCustomerId}/security`);
      if (res.ok) {
        const response = await res.json();
        const raw = response.data || response;
        const parsed: SecurityStatusResponse = {
          success: response.success ?? true,
          customer_id: raw.customer_id || targetCustomerId,
          security_status: raw.security_status || raw.status || 'NORMAL',
          is_restricted: raw.is_restricted || raw.restriction_active || false,
          started_at: raw.started_at || null,
          expires_at: raw.expires_at || null,
          restriction_type: raw.restriction_type || null,
          restriction_reason: raw.restriction_reason || raw.message || null,
          message: raw.message || null
        };
        setSecData(parsed);

        if (parsed.expires_at) {
          const expMs = new Date(parsed.expires_at).getTime();
          const nowMs = Date.now();
          const diffSec = Math.max(0, Math.floor((expMs - nowMs) / 1000));
          setRemainingSeconds(diffSec);
        } else {
          setRemainingSeconds(0);
        }
      }
    } catch (e) {
      console.error('Failed to fetch restricted account security status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [targetCustomerId]);

  // Live countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          fetchSecurityData(); // re-fetch status when timer expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '00h 00m 00s remaining';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s remaining`;
  };

  const formatDate = (isoString: string | null, fallbackHoursAgo = 0) => {
    if (isoString) {
      return new Date(isoString).toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    const d = new Date(Date.now() - fallbackHoursAgo * 3600 * 1000);
    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const isExpired = !loading && remainingSeconds <= 0;

  return (
    <div className="min-h-screen bg-slate-900/90 relative flex flex-col font-sans text-slate-900 backdrop-blur-xs">
      {/* Background dimmed shopping interface mock */}
      <div className="absolute inset-0 opacity-15 pointer-events-none select-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]">
        <Header />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-center transition-all animate-fadeIn">
          
          {/* Top RetailHub Header Strip */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-blue-400">RetailHub</span>
              <span className="text-xs text-slate-400 font-medium">| Security</span>
            </div>
            <button 
              onClick={() => navigate('/')} 
              className="text-xs text-slate-300 hover:text-white font-medium transition cursor-pointer"
            >
              My Account
            </button>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-medium text-slate-500">Checking account restriction status...</p>
              </div>
            ) : isExpired ? (
              /* RESTRICTION EXPIRED STATE */
              <div className="space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Restriction Expired
                  </h1>
                  <p className="text-sm text-slate-600 mt-2 font-medium">
                    Your account is now eligible for verification.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                  You can now request a One-Time Password (OTP) on the verification page to verify your identity and restore full shopping access.
                </div>

                <button
                  onClick={() => navigate(`/security-verification?customer_id=${targetCustomerId}`)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Verify Account</span>
                </button>
              </div>
            ) : (
              /* ACTIVE RESTRICTION STATE */
              <div className="space-y-6">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>

                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Account Temporarily Restricted
                  </h1>
                  <p className="text-sm text-slate-600 mt-2 font-medium">
                    Suspicious activity was detected on your account.
                  </p>
                </div>

                {/* Status Badge */}
                <div className="inline-block">
                  <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                    RESTRICTED
                  </span>
                </div>

                {/* Restriction Timeline Grid */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3 font-sans">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Restriction started</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {formatDate(secData?.started_at || null, 24)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Restriction duration</span>
                    <span className="text-xs font-bold text-slate-800">24 Hours</span>
                  </div>

                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Access available after</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {formatDate(secData?.expires_at || null, -24)}
                    </span>
                  </div>
                </div>

                {/* Live Countdown Pill */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="font-mono font-extrabold text-amber-900 text-sm flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
                    {formatCountdown(remainingSeconds)}
                  </span>
                </div>

                {/* Clear Explanations */}
                <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-medium">
                  <p>
                    For your security, verification is unavailable while your account is restricted.
                  </p>
                  <p>
                    Once the restriction expires, you can verify your account using OTP and continue shopping.
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 border border-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Customer ID: {targetCustomerId}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerAccountRestrictedPage;
