import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, AlertTriangle } from 'lucide-react';
import { Header } from '../components/Header';
import { useSessionStore } from '../store/useSessionStore';

interface SecurityStatusResponse {
  success: boolean;
  customer_id: string;
  security_status: string;
  account_status?: string;
  is_banned: boolean;
  message: string | null;
  banned_at?: string | null;
  ban_reason?: string | null;
}

export const CustomerAccountBannedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customer } = useSessionStore();

  const customerIdFromQuery = searchParams.get('customer_id');
  const targetCustomerId = customerIdFromQuery || customer?.customer_id || 'CUST_1001';

  const [loading, setLoading] = useState<boolean>(true);
  const [secData, setSecData] = useState<SecurityStatusResponse | null>(null);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fraud/customer/${targetCustomerId}/security`);
      if (res.ok) {
        const response = await res.json();
        const raw = response.data || response;
        setSecData({
          success: response.success ?? true,
          customer_id: raw.customer_id || targetCustomerId,
          security_status: raw.security_status || raw.status || 'BANNED',
          account_status: raw.account_status || 'BANNED',
          is_banned: true,
          message: raw.message || 'Account has been permanently banned due to security policy violations.',
          banned_at: raw.updated_at || raw.started_at || new Date().toISOString(),
          ban_reason: raw.restriction_reason || raw.message || 'Critical fraud policy violation detected.'
        });
      }
    } catch (e) {
      console.error('Failed to fetch banned account security status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [targetCustomerId]);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return new Date().toLocaleString('en-US');
    return new Date(isoString).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-slate-900/90 relative flex flex-col font-sans text-slate-900 backdrop-blur-xs select-none">
      {/* Background dimmed shopping interface mock */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px]">
        <Header />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden text-center transition-all animate-fadeIn">
          
          {/* Top RetailHub Header Strip */}
          <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-rose-950/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-rose-500">RetailHub</span>
              <span className="text-xs text-slate-400 font-medium">| Security Operations</span>
            </div>
            <button 
              onClick={() => navigate('/')} 
              className="text-xs text-slate-300 hover:text-white font-medium transition cursor-pointer"
            >
              Back to Store
            </button>
          </div>

          <div className="p-8 space-y-6">
            {loading ? (
              <div className="py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-medium text-slate-500">Checking account status...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-rose-200">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Account Permanently Banned
                  </h1>
                  <p className="text-sm text-slate-600 mt-2 font-medium">
                    Your account has been permanently restricted due to critical security policy violations.
                  </p>
                </div>

                {/* Status Badge */}
                <div className="inline-block">
                  <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> BANNED
                  </span>
                </div>

                {/* Banned Details Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3 font-sans">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer Reference ID</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {targetCustomerId}
                    </span>
                  </div>

                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Enforcement Date</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {formatDate(secData?.banned_at || null)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200/60 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Policy Reason</span>
                    <span className="text-xs font-bold text-rose-700">
                      {secData?.ban_reason || 'Critical fraud policy violation detected by FraudGuard.'}
                    </span>
                  </div>
                </div>

                {/* Enforcement Notice */}
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-left space-y-1 text-xs text-rose-950 font-medium">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Access &amp; Verification Locked</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-rose-900">
                    For platform safety, OTP verification and account actions are permanently disabled for banned accounts. Bypassing this restriction is not permitted.
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
              </>
            )}
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            RetailHub FraudGuard Enforcement System • Incident Ref #{targetCustomerId}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerAccountBannedPage;
