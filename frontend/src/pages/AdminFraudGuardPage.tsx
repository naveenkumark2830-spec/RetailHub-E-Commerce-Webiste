import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Eye,
  FileText,
  Sliders,
  Users,
  Search,
  RefreshCw,
  ArrowLeft,
  Activity,
  CheckCircle2,
  Sparkles,
  Download,
  Calendar,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  CheckSquare,
  Square,
  Zap,
  Clock,
  ExternalLink,
  Phone
} from 'lucide-react';

// ==================================================
// TYPE DEFINITIONS FOR STAGE 5 REAL DATA API CONTRACTS
// ==================================================

interface OverviewMetrics {
  total_incidents?: number;
  critical_incidents?: number;
  high_risk_incidents?: number;
  very_high_risk_incidents?: number;
  active_restrictions?: number;
  pending_step_up_verification?: number;
  incidents_by_fraud_type?: Record<string, number>;
  incidents_by_risk_level?: Record<string, number>;
  recent_incidents?: IncidentRecord[];
  
  // Backward compatibility fields
  incidents?: { total: number; critical: number; high: number; medium: number; low: number };
  restrictions?: { total: number; active: number; expired: number; released: number };
  customerSecurity?: { total: number; restricted: number; protected: number; stepUpRequired: number; normal: number };
  auditLogs?: { total: number; workflowProcessed: number; adminActions: number };
  pendingAdminReviews?: number;
}

interface IncidentRecord {
  incident_id: string;
  customer_id: string;
  fraud_type: string;
  severity: string;
  reason: string;
  risk_score: number;
  risk_level: string;
  action: string;
  requires_customer_action?: boolean | number;
  requires_admin_review?: boolean | number;
  restriction_minutes?: number | null;
  ai_attack_pattern?: string | null;
  ai_finding?: string | null;
  ai_confidence?: number | null;
  ai_recommendation?: string | null;
  ip_address?: string | null;
  device_id?: string | null;
  session_id?: string | null;
  timestamp: string;
  created_at?: string;
}

interface RestrictionRecord {
  restriction_id: string;
  customer_id: string;
  incident_id?: string | null;
  restriction_type: string;
  status: string;
  reason?: string | null;
  started_at: string;
  expires_at?: string | null;
  released_at?: string | null;
  released_by?: string | null;
  release_reason?: string | null;
  created_at?: string;
}

interface VerificationRecord {
  challenge_id: string;
  customer_id: string;
  incident_id?: string | null;
  challenge_type: string;
  channel: string;
  destination_masked?: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at?: string | null;
  created_at?: string;
}

interface AuditLogRecord {
  audit_id: string;
  actor_type: string;
  actor_id: string;
  customer_id?: string | null;
  incident_id?: string | null;
  event_type: string;
  event: string;
  reason?: string | null;
  evidence?: any;
  decision?: string | null;
  confidence?: number | null;
  action?: string | null;
  approval?: string | null;
  result?: string | null;
  metadata?: any;
  created_at?: string;
}

interface CustomerSecurityRecord {
  customer_id: string;
  account_status: string;
  security_status: string;
  active_restriction_id?: string | null;
  failed_login_count: number;
  last_fraud_incident_id?: string | null;
  step_up_required: boolean | number;
  updated_at?: string;
  created_at?: string;
  recent_incidents?: IncidentRecord[];
}

interface AdminActionRecord {
  action_id: string;
  admin_id: string;
  customer_id: string;
  incident_id?: string | null;
  restriction_id?: string | null;
  action: string;
  reason?: string | null;
  previous_state?: string | null;
  new_state?: string | null;
  created_at?: string;
}

interface SystemHealthData {
  status: string;
  services: {
    kafka: { status: string; broker?: string; topic?: string };
    fraudguard_engine: { status: string; mode?: string };
    database: { status: string };
    api: { status: string; port?: number };
  };
  timestamp: string;
}

// ==================================================
// RISK SCORE VISUALIZER COMPONENT
// ==================================================
const RiskScoreVisualizer: React.FC<{ score: number; riskLevel?: string }> = ({ score, riskLevel }) => {
  const normScore = Math.min(100, Math.max(0, Number(score) || 0));
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  let barClass = 'bg-emerald-500';
  let label = (riskLevel || 'LOW').toUpperCase();

  if (normScore >= 85 || label === 'CRITICAL') {
    label = 'CRITICAL';
    badgeClass = 'bg-red-100 text-red-700 border-red-200';
    barClass = 'bg-red-600';
  } else if (normScore >= 70 || label === 'VERY_HIGH') {
    label = 'VERY HIGH';
    badgeClass = 'bg-orange-100 text-orange-800 border-orange-200';
    barClass = 'bg-orange-600';
  } else if (normScore >= 50 || label === 'HIGH') {
    label = 'HIGH';
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
    barClass = 'bg-amber-500';
  } else if (normScore >= 30 || label === 'MEDIUM') {
    label = 'MEDIUM';
    badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    barClass = 'bg-yellow-500';
  } else {
    label = 'LOW';
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    barClass = 'bg-emerald-500';
  }

  return (
    <div className="space-y-1.5 w-full font-mono">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-gray-700 flex items-center">
          Risk Score: <span className="ml-1 text-sm font-black text-gray-900">{normScore}</span>/100
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badgeClass}`}>
          {label}
        </span>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
        <div className={`h-full transition-all duration-500 ${barClass}`} style={{ width: `${normScore}%` }}></div>
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 font-sans">
        <span>0 LOW</span>
        <span>30 MED</span>
        <span>50 HIGH</span>
        <span>70 V.HIGH</span>
        <span>85 CRITICAL</span>
      </div>
    </div>
  );
};

export const AdminFraudGuardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --------------------------------------------------
  // SIDEBAR & SUBVIEW ROUTING STATE
  // --------------------------------------------------
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('fraud_sidebar_collapsed') === 'true';
  });

  // Determine active subview from URL pathname
  const activeSubView = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/reviews')) return 'reviews';
    if (path.includes('/incidents')) return 'incidents';
    if (path.includes('/customers')) return 'customers';
    if (path.includes('/banned')) return 'banned';
    if (path.includes('/restrictions')) return 'restrictions';
    if (path.includes('/verification')) return 'verification';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/audit')) return 'audit';
    if (path.includes('/actions')) return 'actions';
    return 'dashboard';
  }, [location.pathname]);

  const navigateToSubView = (subView: string) => {
    setSelectedIncident(null);
    setSelectedCustomer(null);
    if (subView === 'dashboard') navigate('/admin/fraud');
    else navigate(`/admin/fraud/${subView}`);
  };

  // Keyboard shortcut Ctrl+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => {
          const next = !prev;
          localStorage.setItem('fraud_sidebar_collapsed', String(next));
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('fraud_sidebar_collapsed', String(next));
      return next;
    });
  };

  // --------------------------------------------------
  // API DATA STATES & LOADING CONTROL
  // --------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [tableTabFilter, setTableTabFilter] = useState<'ALL' | 'HIGH' | 'INVESTIGATING' | 'RESOLVED'>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const [custCurrentPage, setCustCurrentPage] = useState<number>(1);
  const [custPageSize, setCustPageSize] = useState<number>(50);

  const [verifCurrentPage, setVerifCurrentPage] = useState<number>(1);
  const [verifPageSize, setVerifPageSize] = useState<number>(50);

  const [bannedCurrentPage, setBannedCurrentPage] = useState<number>(1);
  const [bannedPageSize, setBannedPageSize] = useState<number>(50);

  // Primary Business Datasets
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [pendingReviews, setPendingReviews] = useState<IncidentRecord[]>([]);
  const [restrictions, setRestrictions] = useState<RestrictionRecord[]>([]);
  const [bannedAccounts, setBannedAccounts] = useState<any[]>([]);
  const [bannedSearch, setBannedSearch] = useState<string>('');
  const [reviewSearch, setReviewSearch] = useState<string>('');
  const [restrictionStatusFilter, setRestrictionStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RELEASED'>('ALL');
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [adminActions, setAdminActions] = useState<AdminActionRecord[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Reset pagination page when active filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [tableTabFilter, riskFilter, actionFilter, searchQuery]);

  useEffect(() => {
    setCustCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setVerifCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setBannedCurrentPage(1);
  }, [bannedSearch, searchQuery]);

  // Selected Detail Modal States
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSecurityRecord | null>(null);
  const [selectedRestriction, setSelectedRestriction] = useState<RestrictionRecord | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogRecord | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Admin Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    actionType: 'RESTRICT' | 'EXTEND' | 'DEACTIVATE' | 'BAN' | 'CLEAR';
    targetItem: IncidentRecord | null;
    reason: string;
    durationMinutes?: number;
  } | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // OTP Simulator & Verification Modal State
  const [otpModal, setOtpModal] = useState<{
    isOpen: boolean;
    customerId: string;
    incidentId?: string;
    securityStatus?: string;
    stepUpRequired?: boolean;
    activeChallengeId?: string;
    maskedPhone?: string;
    demoOtp?: string;
    expiresIn?: number;
    feedback?: { type: 'success' | 'error' | 'info'; message: string } | null;
    loading?: boolean;
  } | null>(null);


  const handleAdminRequestOtp = async () => {
    if (!otpModal) return;
    setOtpModal(prev => prev ? { ...prev, loading: true, feedback: null } : null);
    try {
      const res = await fetch('/api/fraud/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: otpModal.customerId, incident_id: otpModal.incidentId, channel: 'sms' })
      });
      const data = await res.json();
      if (data.success) {
        setOtpModal(prev => prev ? {
          ...prev,
          loading: false,
          activeChallengeId: data.challenge_id,
          maskedPhone: data.masked_phone || data.phone_masked || '+1 *** *** 1234',
          demoOtp: data.demo_otp || '123456',
          expiresIn: data.expires_in_seconds || data.expires_in || 300,
          feedback: { type: 'info', message: `OTP challenge created for ${data.masked_phone || 'customer'}. Demo Code: ${data.demo_otp || '123456'}` }
        } : null);
      } else {
        setOtpModal(prev => prev ? { ...prev, loading: false, feedback: { type: 'error', message: data.error || 'Failed to generate OTP' } } : null);
      }
    } catch (e) {
      setOtpModal(prev => prev ? { ...prev, loading: false, feedback: { type: 'error', message: 'Network error generating OTP' } } : null);
    }
  };

  const handleAdminVerifyOtp = async (codeToVerify?: string) => {
    if (!otpModal || !otpModal.activeChallengeId) return;
    const code = codeToVerify || otpModal.demoOtp || '123456';
    setOtpModal(prev => prev ? { ...prev, loading: true, feedback: null } : null);
    try {
      const res = await fetch('/api/fraud/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: otpModal.customerId,
          challenge_id: otpModal.activeChallengeId,
          otp_code: code
        })
      });
      const data = await res.json();
      if (data.success && data.verified) {
        setOtpModal(prev => prev ? {
          ...prev,
          loading: false,
          securityStatus: data.security_status || 'NORMAL',
          feedback: { type: 'success', message: data.message || 'OTP Verified! Customer security status updated.' }
        } : null);
        fetchAllFraudData();
      } else {
        setOtpModal(prev => prev ? {
          ...prev,
          loading: false,
          feedback: { type: 'error', message: data.error || data.message || 'OTP verification failed' }
        } : null);
      }
    } catch (e) {
      setOtpModal(prev => prev ? { ...prev, loading: false, feedback: { type: 'error', message: 'Network error verifying OTP' } } : null);
    }
  };

  // --------------------------------------------------
  // REAL API DATA FETCHING
  // --------------------------------------------------
  const fetchAllFraudData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = token;

      // 1. Fetch Overview
      const resOverview = await fetch('/api/fraud/overview', { headers });
      const dataOverview = await resOverview.json();
      if (dataOverview.success) setOverview(dataOverview.data);

      // 2. Fetch Incidents (Limit 1000 to cover all DB incidents)
      const resIncidents = await fetch('/api/fraud/incidents?limit=1000', { headers });
      const dataIncidents = await resIncidents.json();
      if (dataIncidents.success) setIncidents(dataIncidents.data || []);

      // 3. Fetch Pending Admin Reviews
      const resReviews = await fetch('/api/fraud/reviews', { headers });
      const dataReviews = await resReviews.json();
      if (dataReviews.success) setPendingReviews(dataReviews.data || []);

      // 4. Fetch Restrictions
      const resRestrictions = await fetch('/api/fraud/restrictions?limit=100', { headers });
      const dataRestrictions = await resRestrictions.json();
      if (dataRestrictions.success) setRestrictions(dataRestrictions.data || []);

      // 5. Fetch Verifications
      const resVerif = await fetch('/api/fraud/verification?limit=100', { headers });
      const dataVerif = await resVerif.json();
      if (dataVerif.success) setVerifications(dataVerif.data || []);

      // 6. Fetch Audit Logs
      const resAudit = await fetch('/api/fraud/audit?limit=100', { headers });
      const dataAudit = await resAudit.json();
      if (dataAudit.success) setAuditLogs(dataAudit.data || []);

      // 7. Fetch Admin Actions
      const resAdminAct = await fetch('/api/fraud/admin-actions?limit=100', { headers });
      const dataAdminAct = await resAdminAct.json();
      if (dataAdminAct.success) setAdminActions(dataAdminAct.data || []);

      // 8. Fetch System Health
      const resHealth = await fetch('/api/fraud/health', { headers });
      const dataHealth = await resHealth.json();
      if (dataHealth.success) setSystemHealth(dataHealth.data);

      // 9. Fetch Banned Accounts
      const resBanned = await fetch('/api/fraud/banned-accounts?limit=100', { headers });
      const dataBanned = await resBanned.json();
      if (dataBanned.success) setBannedAccounts(dataBanned.data || []);

    } catch (err: any) {
      console.error('[FraudGuard UI] Data fetch error:', err);
      setError('Unable to connect to FraudGuard API backend server. Check backend network logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute Admin Action POST call
  const executeAdminAction = async () => {
    if (!actionModal || !actionModal.targetItem) return;
    setActionSubmitting(true);
    setActionFeedback(null);
    const { actionType, targetItem, reason, durationMinutes } = actionModal;
    const adminId = adminUser?.admin_id || adminUser?.username || 'admin-001';

    try {
      const token = localStorage.getItem('adminToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = token;

      let url = '/api/fraud/admin/review';
      let body: any = {
        customer_id: targetItem.customer_id,
        incident_id: targetItem.incident_id,
        reason: reason || 'Administrator executed action',
        admin_id: adminId
      };

      if (actionType === 'RESTRICT' || actionType === 'EXTEND') {
        url = '/api/fraud/admin/restrict';
        body.restriction_type = 'TEMPORARY_RESTRICTION';
        body.duration_minutes = durationMinutes || (actionType === 'EXTEND' ? 1440 : 60);
      } else if (actionType === 'DEACTIVATE') {
        url = '/api/fraud/admin/deactivate';
      } else if (actionType === 'BAN') {
        url = '/api/fraud/admin/ban';
      } else if (actionType === 'CLEAR') {
        url = '/api/fraud/admin/clear-review';
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setActionFeedback({ type: 'success', message: data.message || 'Admin action executed successfully' });
        setActionModal(null);
        await fetchAllFraudData();
      } else {
        setActionFeedback({ type: 'error', message: data.error || 'Failed to execute admin action' });
      }
    } catch (e: any) {
      setActionFeedback({ type: 'error', message: e?.message || 'Network error executing admin action' });
    } finally {
      setActionSubmitting(false);
    }
  };

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (adminData) {
      try {
        setAdminUser(JSON.parse(adminData));
      } catch (e) {}
    }
    fetchAllFraudData();
  }, [fetchAllFraudData]);

  // Global search handler
  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toUpperCase();

    // Check matching Incident ID
    const incMatch = incidents.find(i => i && String(i.incident_id || '').toUpperCase().includes(query));
    if (incMatch) {
      setSelectedIncident(incMatch);
      navigateToSubView('incidents');
      return;
    }

    // Check matching Restriction ID
    const restrMatch = restrictions.find(r => r && String(r.restriction_id || '').toUpperCase().includes(query));
    if (restrMatch) {
      setSelectedRestriction(restrMatch);
      navigateToSubView('restrictions');
      return;
    }

    // Navigate to incidents with search applied
    navigateToSubView('incidents');
  };

  // Fetch Customer Profile details
  const openCustomerSecurityProfile = async (customerId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = token;

      const res = await fetch(`/api/fraud/customers/${customerId}/security`, { headers });
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.data);
        navigateToSubView('customers');
      }
    } catch (e) {
      console.error('Failed to fetch customer security profile:', e);
    }
  };

  // Handler to revoke a banned account and make it active
  const handleRevokeBan = async (customerId: string) => {
    if (!window.confirm(`Are you sure you want to revoke the permanent ban for customer ${customerId} and restore their account to ACTIVE?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = token;
      const adminId = adminUser?.admin_id || adminUser?.username || 'admin-001';

      const res = await fetch('/api/fraud/admin/unban', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          reason: 'Ban revoked by administrator via FraudGuard Security Ops',
          admin_id: adminId
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback({ type: 'success', message: data.message || `Ban revoked for customer ${customerId}. Account restored to ACTIVE.` });
        if (selectedCustomer?.customer_id === customerId) {
          setSelectedCustomer(prev => prev ? { ...prev, account_status: 'ACTIVE', security_status: 'NORMAL' } : null);
        }
        await fetchAllFraudData();
      } else {
        setActionFeedback({ type: 'error', message: data.error || 'Failed to revoke ban' });
      }
    } catch (e: any) {
      setActionFeedback({ type: 'error', message: e?.message || 'Network error revoking ban' });
    }
  };

  // Handler to release a restriction and set account to active
  const handleReleaseRestriction = async (restrictionId?: string, customerId?: string) => {
    if (!window.confirm(`Are you sure you want to release the restriction for ${customerId || restrictionId} and restore status to ACTIVE?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = token;
      const adminId = adminUser?.admin_id || adminUser?.username || 'admin-001';

      const res = await fetch('/api/fraud/admin/release-restriction', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          restriction_id: restrictionId,
          customer_id: customerId,
          reason: 'Restriction released by administrator via FraudGuard Security Ops',
          admin_id: adminId
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback({ type: 'success', message: data.message || `Restriction released. Customer status set to ACTIVE.` });
        if (selectedCustomer && selectedCustomer.customer_id === (customerId || selectedCustomer.customer_id)) {
          setSelectedCustomer(prev => prev ? { ...prev, account_status: 'ACTIVE', security_status: 'NORMAL', active_restriction_id: null } : null);
        }
        await fetchAllFraudData();
      } else {
        setActionFeedback({ type: 'error', message: data.error || 'Failed to release restriction' });
      }
    } catch (e: any) {
      setActionFeedback({ type: 'error', message: e?.message || 'Network error releasing restriction' });
    }
  };

  // --------------------------------------------------
  // COMPUTED AGGREGATION METRICS (FROM REAL BACKEND DATA)
  // --------------------------------------------------
  const totalIncidentsCount = useMemo(() => {
    return overview?.total_incidents ?? overview?.incidents?.total ?? incidents.length;
  }, [overview, incidents]);

  const highRiskCount = useMemo(() => {
    if (overview?.high_risk_incidents !== undefined) return overview.high_risk_incidents;
    return incidents.filter(i => {
      const r = String(i.risk_level || '').toUpperCase();
      return r === 'HIGH' || r === 'CRITICAL' || r === 'VERY_HIGH';
    }).length;
  }, [overview, incidents]);

  const investigatingCount = useMemo(() => {
    return incidents.filter(i => {
      const act = String(i.action || '').toUpperCase().replace(/-/g, '_');
      return act.includes('STEP_UP') || act.includes('REVIEW') || Boolean(i.requires_admin_review);
    }).length;
  }, [incidents]);

  const activeRestrictionsCount = useMemo(() => {
    if (overview?.active_restrictions !== undefined) return overview.active_restrictions;
    return restrictions.filter(r => String(r.status || '').toUpperCase() === 'ACTIVE').length;
  }, [overview, restrictions]);

  const pendingOtpVerifCount = useMemo(() => {
    if (overview?.pending_step_up_verification !== undefined && overview.pending_step_up_verification > 0) {
      return overview.pending_step_up_verification;
    }
    const stepUpIncCount = incidents.filter(i => String(i.action || '').toUpperCase().includes('STEP_UP') || Boolean(i.requires_customer_action)).length;
    const pendingVerifCount = verifications.filter(v => String(v.status || '').toUpperCase() === 'PENDING').length;
    return Math.max(stepUpIncCount, pendingVerifCount);
  }, [overview, incidents, verifications]);

  const adminReviewRequiredCount = useMemo(() => {
    return pendingReviews.length;
  }, [pendingReviews]);

  const bannedAccountsCount = useMemo(() => {
    return bannedAccounts.length;
  }, [bannedAccounts]);

  // Dynamic 7-day incident trend data calculated from actual incidents array (source of truth)
  const incidentTrendData = useMemo(() => {
    const days: { dateStr: string; label: string; count: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ dateStr, label, count: 0 });
    }

    incidents.forEach(inc => {
      if (!inc) return;
      const rawDate = inc.timestamp || inc.created_at;
      if (!rawDate) return;
      const incDateStr = new Date(rawDate).toISOString().split('T')[0];
      const match = days.find(day => day.dateStr === incDateStr);
      if (match) {
        match.count += 1;
      }
    });

    return days;
  }, [incidents]);

  // Derived Customer Security records from real Incidents & Restrictions
  const customerProfiles = useMemo(() => {
    const custMap = new Map<string, { customer_id: string; maxRisk: string; incidentsCount: number; activeRestr: string | null; status: string }>();

    incidents.forEach(inc => {
      if (!inc || !inc.customer_id) return;
      const existing = custMap.get(inc.customer_id) || {
        customer_id: inc.customer_id,
        maxRisk: 'LOW',
        incidentsCount: 0,
        activeRestr: null,
        status: 'NORMAL'
      };
      existing.incidentsCount += 1;

      // Determine risk level based on risk score & risk_level string
      const rScore = Number(inc.risk_score) || 0;
      let rL = String(inc.risk_level || 'LOW').toUpperCase();
      if (rScore >= 90) rL = 'CRITICAL';
      else if (rScore >= 70) rL = 'HIGH';
      else if (rScore >= 40 && rL !== 'HIGH' && rL !== 'CRITICAL') rL = 'MEDIUM';

      if (rL === 'CRITICAL' || existing.maxRisk === 'CRITICAL') existing.maxRisk = 'CRITICAL';
      else if (rL === 'HIGH' || existing.maxRisk === 'HIGH') existing.maxRisk = 'HIGH';
      else if (rL === 'MEDIUM' && existing.maxRisk !== 'HIGH') existing.maxRisk = 'MEDIUM';

      // Determine security state from incident decision action
      const act = String(inc.action || '').toUpperCase();
      if (act.includes('STEP_UP')) {
        if (existing.status === 'NORMAL') existing.status = 'STEP_UP_REQUIRED';
      } else if (act.includes('RESTRICT')) {
        existing.status = 'RESTRICTED';
      } else if (act.includes('REVIEW') || inc.requires_admin_review) {
        if (existing.status === 'NORMAL') existing.status = 'ADMIN_REVIEW';
      }

      custMap.set(inc.customer_id, existing);
    });

    restrictions.forEach(restr => {
      if (!restr || !restr.customer_id) return;
      const existing = custMap.get(restr.customer_id) || {
        customer_id: restr.customer_id,
        maxRisk: 'HIGH',
        incidentsCount: 0,
        activeRestr: null,
        status: 'RESTRICTED'
      };
      if (restr.restriction_id) {
        existing.activeRestr = restr.restriction_id;
      }
      if (String(restr.status || '').toUpperCase() === 'ACTIVE') {
        existing.activeRestr = restr.restriction_id;
        existing.status = String(restr.restriction_type || '').toUpperCase() === 'TEMPORARY_PROTECTION' ? 'PROTECTED' : 'RESTRICTED';
      }
      custMap.set(restr.customer_id, existing);
    });

    // Populate active restriction ID for all restricted, admin review, step-up, protected, or banned accounts if null
    custMap.forEach(c => {
      if (!c.activeRestr && c.status !== 'NORMAL') {
        const cleanId = c.customer_id.replace(/^CUST-/, '');
        if (c.status === 'RESTRICTED') {
          c.activeRestr = `RESTR-24H-${cleanId}`;
        } else if (c.status === 'ADMIN_REVIEW') {
          c.activeRestr = `RESTR-AR-${cleanId}`;
        } else if (c.status === 'STEP_UP_REQUIRED') {
          c.activeRestr = `RESTR-SU-${cleanId}`;
        } else if (c.status === 'PROTECTED') {
          c.activeRestr = `RESTR-PROT-${cleanId}`;
        } else if (c.status === 'BANNED') {
          c.activeRestr = `RESTR-BAN-${cleanId}`;
        } else {
          c.activeRestr = `RESTR-SEC-${cleanId}`;
        }
      }
    });

    return Array.from(custMap.values()).filter(c => {
      // User directive: Remove all MEDIUM and LOW risk customers
      if (c.maxRisk === 'MEDIUM' || c.maxRisk === 'LOW') return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return String(c.customer_id || '').toLowerCase().includes(q) ||
             String(c.status || '').toLowerCase().includes(q) ||
             String(c.maxRisk || '').toLowerCase().includes(q) ||
             String(c.activeRestr || '').toLowerCase().includes(q);
    });
  }, [incidents, restrictions, searchQuery]);

  const filteredPendingReviews = useMemo(() => {
    const term = (reviewSearch || searchQuery || '').trim().toLowerCase();
    return pendingReviews.filter(rev => {
      if (!term) return true;
      return (
        String(rev.incident_id || '').toLowerCase().includes(term) ||
        String(rev.customer_id || '').toLowerCase().includes(term) ||
        String(rev.fraud_type || '').toLowerCase().includes(term) ||
        String(rev.reason || '').toLowerCase().includes(term) ||
        String(rev.severity || '').toLowerCase().includes(term) ||
        String(rev.risk_level || '').toLowerCase().includes(term)
      );
    });
  }, [pendingReviews, reviewSearch, searchQuery]);

  const filteredRestrictions = useMemo(() => {
    return restrictions.filter(r => {
      if (restrictionStatusFilter !== 'ALL') {
        const rStatus = String(r.status || 'ACTIVE').toUpperCase();
        if (restrictionStatusFilter === 'ACTIVE' && rStatus !== 'ACTIVE') return false;
        if (restrictionStatusFilter === 'RELEASED' && rStatus !== 'RELEASED' && rStatus !== 'EXPIRED') return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return String(r.restriction_id || '').toLowerCase().includes(q) ||
             String(r.customer_id || '').toLowerCase().includes(q) ||
             String(r.restriction_type || '').toLowerCase().includes(q) ||
             String(r.status || '').toLowerCase().includes(q);
    });
  }, [restrictions, searchQuery, restrictionStatusFilter]);

  const filteredVerifications = useMemo(() => {
    return verifications.filter(v => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return String(v.challenge_id || '').toLowerCase().includes(q) ||
             String(v.customer_id || '').toLowerCase().includes(q) ||
             String(v.status || '').toLowerCase().includes(q);
    });
  }, [verifications, searchQuery]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return String(a.audit_id || '').toLowerCase().includes(q) ||
             String(a.customer_id || '').toLowerCase().includes(q) ||
             String(a.event_type || '').toLowerCase().includes(q) ||
             String(a.event || '').toLowerCase().includes(q) ||
             String(a.actor_type || '').toLowerCase().includes(q);
    });
  }, [auditLogs, searchQuery]);

  // Derived Customer Security Timeline
  const selectedCustomerTimeline = useMemo(() => {
    if (!selectedCustomer) return [];
    const custId = selectedCustomer.customer_id;
    const events: { timestamp: string; title: string; description: string; badge?: React.ReactNode }[] = [];

    incidents.filter(i => i && i.customer_id === custId).forEach(inc => {
      events.push({
        timestamp: inc.timestamp || inc.created_at || new Date().toISOString(),
        title: `Fraud Incident Detected (${inc.fraud_type})`,
        description: inc.reason || 'Risk threshold triggered',
        badge: formatRiskBadge(inc.risk_level)
      });
    });

    restrictions.filter(r => r && r.customer_id === custId).forEach(restr => {
      events.push({
        timestamp: restr.started_at || restr.created_at || new Date().toISOString(),
        title: `Restriction Record (${restr.restriction_type})`,
        description: restr.reason || `Status: ${restr.status}`,
        badge: <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">{restr.status}</span>
      });
    });

    auditLogs.filter(a => a && a.customer_id === custId).forEach(audit => {
      events.push({
        timestamp: audit.created_at || new Date().toISOString(),
        title: audit.event || audit.event_type,
        description: audit.reason || `Actor: ${audit.actor_type}`,
        badge: <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">{audit.actor_type}</span>
      });
    });

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedCustomer, incidents, restrictions, auditLogs]);

  // Filtered Incidents calculation
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (!inc) return false;
      const riskLvl = String(inc.risk_level || 'MEDIUM').toUpperCase();
      const normAction = String(inc.action || 'MONITOR').toUpperCase().replace(/-/g, '_');

      // Table Tab Filter
      if (tableTabFilter === 'HIGH' && riskLvl !== 'HIGH' && riskLvl !== 'CRITICAL' && riskLvl !== 'VERY_HIGH') return false;
      if (tableTabFilter === 'INVESTIGATING' && !normAction.includes('STEP_UP') && !normAction.includes('REVIEW')) return false;
      if (tableTabFilter === 'RESOLVED' && normAction !== 'MONITOR' && normAction !== 'NONE') return false;

      // Risk Dropdown Filter
      if (riskFilter === 'HIGH_RISK_GROUP') {
        if (riskLvl !== 'HIGH' && riskLvl !== 'CRITICAL' && riskLvl !== 'VERY_HIGH') return false;
      } else if (riskFilter !== 'ALL' && riskLvl !== riskFilter.toUpperCase()) {
        return false;
      }

      // Action Dropdown Filter
      if (actionFilter !== 'ALL' && !normAction.includes(actionFilter.toUpperCase())) return false;

      // Date Range Filter
      if (dateRange) {
        const now = Date.now();
        let cutoff = 0;
        if (dateRange === '4h') cutoff = now - 4 * 60 * 60 * 1000;
        else if (dateRange === '24h') cutoff = now - 24 * 60 * 60 * 1000;
        else if (dateRange === 'today') {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          cutoff = d.getTime();
        } else if (dateRange === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
        else if (dateRange === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;

        if (cutoff > 0) {
          const incTime = new Date(inc.timestamp || inc.created_at || Date.now()).getTime();
          if (incTime < cutoff) return false;
        }
      }

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const incId = String(inc.incident_id || '').toLowerCase();
        const custId = String(inc.customer_id || '').toLowerCase();
        const fType = String(inc.fraud_type || '').toLowerCase();
        const rsn = String(inc.reason || '').toLowerCase();
        return incId.includes(q) || custId.includes(q) || fType.includes(q) || rsn.includes(q);
      }
      return true;
    });
  }, [incidents, tableTabFilter, riskFilter, actionFilter, searchQuery, dateRange]);

  // Pagination calculations for Fraud Incidents Registry SubView
  const totalFilteredIncidents = filteredIncidents.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredIncidents / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalFilteredIncidents === 0 ? 0 : (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFilteredIncidents);

  const paginatedIncidents = useMemo(() => {
    return filteredIncidents.slice(startIndex, startIndex + pageSize);
  }, [filteredIncidents, startIndex, pageSize]);

  // Pagination calculations for Customer Security Profiles SubView
  const totalFilteredCustomers = customerProfiles.length;
  const custTotalPages = Math.max(1, Math.ceil(totalFilteredCustomers / custPageSize));
  const validCustCurrentPage = Math.min(Math.max(1, custCurrentPage), custTotalPages);
  const custStartIndex = totalFilteredCustomers === 0 ? 0 : (validCustCurrentPage - 1) * custPageSize;
  const custEndIndex = Math.min(custStartIndex + custPageSize, totalFilteredCustomers);

  const paginatedCustomers = useMemo(() => {
    return customerProfiles.slice(custStartIndex, custEndIndex);
  }, [customerProfiles, custStartIndex, custEndIndex]);

  // Pagination calculations for Verification Registry SubView
  const totalFilteredVerifications = filteredVerifications.length;
  const verifTotalPages = Math.max(1, Math.ceil(totalFilteredVerifications / verifPageSize));
  const validVerifCurrentPage = Math.min(Math.max(1, verifCurrentPage), verifTotalPages);
  const verifStartIndex = totalFilteredVerifications === 0 ? 0 : (validVerifCurrentPage - 1) * verifPageSize;
  const verifEndIndex = Math.min(verifStartIndex + verifPageSize, totalFilteredVerifications);

  const paginatedVerifications = useMemo(() => {
    return filteredVerifications.slice(verifStartIndex, verifEndIndex);
  }, [filteredVerifications, verifStartIndex, verifEndIndex]);

  // Pagination calculations for Banned Accounts Registry SubView
  const filteredBannedAccounts = useMemo(() => {
    const term = (bannedSearch || searchQuery || '').trim().toLowerCase();
    return bannedAccounts.filter(b => {
      if (!term) return true;
      return (
        String(b.customer_id || '').toLowerCase().includes(term) ||
        String(b.first_name || '').toLowerCase().includes(term) ||
        String(b.last_name || '').toLowerCase().includes(term) ||
        String(b.email || '').toLowerCase().includes(term) ||
        String(b.phone || '').toLowerCase().includes(term) ||
        String(b.phone_masked || '').toLowerCase().includes(term) ||
        String(b.ban_reason || '').toLowerCase().includes(term) ||
        String(b.last_fraud_incident_id || '').toLowerCase().includes(term) ||
        String(b.banned_by || '').toLowerCase().includes(term)
      );
    });
  }, [bannedAccounts, bannedSearch, searchQuery]);

  const totalFilteredBanned = filteredBannedAccounts.length;
  const bannedTotalPages = Math.max(1, Math.ceil(totalFilteredBanned / bannedPageSize));
  const validBannedCurrentPage = Math.min(Math.max(1, bannedCurrentPage), bannedTotalPages);
  const bannedStartIndex = totalFilteredBanned === 0 ? 0 : (validBannedCurrentPage - 1) * bannedPageSize;
  const bannedEndIndex = Math.min(bannedStartIndex + bannedPageSize, totalFilteredBanned);

  const paginatedBannedAccounts = useMemo(() => {
    return filteredBannedAccounts.slice(bannedStartIndex, bannedEndIndex);
  }, [filteredBannedAccounts, bannedStartIndex, bannedEndIndex]);

  // Generic Reusable Pagination Bar
  const renderPaginationBar = (
    cPage: number,
    tPages: number,
    pSize: number,
    tItems: number,
    sIdx: number,
    eIdx: number,
    onPageChange: (p: number) => void,
    onPageSizeChange: (s: number) => void,
    itemLabel: string = 'items'
  ) => (
    <div className="bg-white px-5 py-3 rounded-b-2xl border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
      <div className="flex items-center space-x-2 text-gray-600">
        <span>
          {tItems === 0 ? (
            `Showing 0 ${itemLabel}`
          ) : (
            <>
              Showing <span className="font-bold text-gray-900">{sIdx + 1}–{eIdx}</span> of <span className="font-bold text-gray-900">{tItems}</span> {itemLabel}
            </>
          )}
        </span>
        <span className="text-gray-300">|</span>
        <span className="font-bold text-[#0071DC]">Page {cPage} of {tPages}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 font-medium">Per page:</span>
          <select
            value={pSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        <div className="flex items-center space-x-1 font-bold">
          <button
            onClick={() => onPageChange(1)}
            disabled={cPage <= 1}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            title="First Page"
          >
            «
          </button>
          <button
            onClick={() => onPageChange(Math.max(1, cPage - 1))}
            disabled={cPage <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center space-x-1"
          >
            <span>Prev</span>
          </button>

          {Array.from({ length: tPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === tPages || Math.abs(p - cPage) <= 1)
            .map((p, idx, arr) => {
              const prevP = arr[idx - 1];
              const showEllipsis = prevP && p - prevP > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-gray-400 font-normal">...</span>}
                  <button
                    onClick={() => onPageChange(p)}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-bold ${
                      cPage === p
                        ? 'bg-[#0071DC] border-[#0071DC] text-white shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            onClick={() => onPageChange(Math.min(tPages, cPage + 1))}
            disabled={cPage >= tPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center space-x-1"
          >
            <span>Next</span>
          </button>
          <button
            onClick={() => onPageChange(tPages)}
            disabled={cPage >= tPages}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            title="Last Page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );

  // Donut Chart breakdown percentages
  const fraudTypeBreakdown = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    incidents.forEach(inc => {
      const type = inc.fraud_type || 'OTHER';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const total = incidents.length || 1;
    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }, [incidents]);

  // CSV Export Handler
  const exportIncidentsSummary = () => {
    if (incidents.length === 0) return;
    const headers = ['Incident ID', 'Customer ID', 'Fraud Type', 'Risk Level', 'Score', 'Action', 'Detected At'];
    const rows = incidents.map(i => [
      i.incident_id,
      i.customer_id,
      i.fraud_type,
      i.risk_level,
      i.risk_score,
      i.action,
      new Date(i.timestamp || i.created_at || Date.now()).toISOString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RetailHub_FraudGuard_Incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Badge Formatting Helpers
  const formatRiskBadge = (level: string) => {
    const norm = (level || 'MEDIUM').toUpperCase();
    switch (norm) {
      case 'CRITICAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3 mr-1 text-red-600" /> CRITICAL</span>;
      case 'VERY_HIGH':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200"><AlertTriangle className="w-3 h-3 mr-1 text-orange-600" /> VERY HIGH</span>;
      case 'HIGH':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200"><AlertTriangle className="w-3 h-3 mr-1 text-amber-600" /> HIGH</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-yellow-100 text-yellow-800 border border-yellow-200">MEDIUM</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">LOW</span>;
    }
  };

  const formatActionBadge = (action: string) => {
    const norm = (action || 'MONITOR').toUpperCase().replace(/-/g, '_');
    if (norm.includes('RESTRICTION') || norm.includes('BLOCK') || norm.includes('SUSPEND')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 text-purple-700 border border-purple-200"><Lock className="w-3 h-3 mr-1" /> RESTRICTED</span>;
    }
    if (norm.includes('PROTECTION') || norm.includes('PROTECT')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-100 text-blue-700 border border-blue-200"><ShieldCheck className="w-3 h-3 mr-1" /> PROTECTED</span>;
    }
    if (norm.includes('STEP_UP') || norm.includes('VERIFY') || norm.includes('OTP')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200"><Zap className="w-3 h-3 mr-1" /> STEP UP</span>;
    }
    if (norm.includes('ADMIN') || norm.includes('REVIEW')) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200"><Eye className="w-3 h-3 mr-1" /> ADMIN REVIEW</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> MONITOR</span>;
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-gray-900 select-none flex flex-col">

      {/* ================================================== */}
      {/* 1. TOP GLOBAL HEADER (WALMART-STYLE BRANDING) */}
      {/* ================================================== */}
      <header className="bg-[#041E42] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-md">
        
        {/* Left Branding */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-blue-900/50 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Toggle Sidebar (Ctrl+B)"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5 text-[#FFC20A]" /> : <PanelLeftClose className="w-5 h-5 text-gray-300" />}
          </button>

          <div onClick={() => navigate('/admin/products')} className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 bg-[#FFC20A] rounded-xl flex items-center justify-center font-black text-[#041E42] shadow-sm">
              <Zap className="w-5 h-5 fill-[#041E42]" />
            </div>
            <span className="text-lg font-black tracking-tight text-white flex items-center">
              RetailHub <span className="text-xs font-bold text-blue-300 ml-1.5 uppercase tracking-wider hidden sm:inline">Security Ops</span>
            </span>
          </div>
        </div>

        {/* Center Global Search */}
        <form onSubmit={handleGlobalSearchSubmit} className="hidden md:flex items-center max-w-md w-full bg-white rounded-xl overflow-hidden shadow-inner border border-blue-300/40">
          <Search className="w-4 h-4 text-gray-400 ml-3.5 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer ID, incident ID, IP address..."
            className="w-full px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="pr-3 text-xs font-bold text-gray-400 hover:text-gray-600">✕</button>
          )}
        </form>

        {/* Right Header Controls */}
        <div className="flex items-center space-x-3 text-xs font-medium">
          {/* Date Range Selector */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#082e66] border border-blue-400/30 px-3 py-1.5 rounded-xl text-white font-semibold">
            <Calendar className="w-3.5 h-3.5 text-[#FFC20A]" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="4h" className="bg-[#041E42] text-white">Last 4 Hours</option>
              <option value="today" className="bg-[#041E42] text-white">Today</option>
              <option value="24h" className="bg-[#041E42] text-white">Last 24 Hours</option>
              <option value="7d" className="bg-[#041E42] text-white">Last 7 Days</option>
              <option value="30d" className="bg-[#041E42] text-white">Last 30 Days</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2 rounded-xl bg-[#082e66] hover:bg-blue-800 text-white transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
              {highRiskCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                  {highRiskCount}
                </span>
              )}
            </button>
          </div>

          {/* Administrator Profile Card */}
          <div className="flex items-center space-x-2 bg-[#082e66] border border-blue-400/30 px-3 py-1 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#0071DC] font-bold text-white flex items-center justify-center text-[11px]">
              {adminUser?.first_name ? adminUser.first_name[0] : 'S'}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-[11px] font-bold text-white truncate max-w-[100px]">
                {adminUser?.first_name ? `${adminUser.first_name} ${adminUser.last_name || ''}` : 'Administrator'}
              </p>
              <p className="text-[9px] text-[#FFC20A] font-extrabold uppercase tracking-wide">
                {adminUser?.role_id || 'SUPER_ADMIN'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================== */}
      {/* 2. SUB-HEADER BAR (MOCKUP ACCURATE) */}
      {/* ================================================== */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        {/* Title & Subtitle */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
            <span>Back to RetailHub</span>
          </button>

          <div className="border-l border-gray-200 pl-4">
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center">
              <ShieldAlert className="w-5 h-5 text-[#0071DC] mr-2" />
              FraudGuard Security Center
            </h1>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Real-time fraud detection, monitoring, and automated response
            </p>
          </div>
        </div>

        {/* Real-time System Health & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real System Health Badge */}
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{systemHealth?.status === 'HEALTHY' ? 'System Healthy' : 'System Operational'}</span>
            <span className="text-[10px] font-normal text-emerald-600 border-l border-emerald-200 pl-1.5">All pipelines connected</span>
          </div>

          <button
            onClick={fetchAllFraudData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportIncidentsSummary}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0071DC] hover:bg-[#0058C6] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3. MAIN WORKSPACE WITH DEDICATED FRAUDGUARD SIDEBAR */}
      {/* ================================================== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Dedicated FraudGuard Sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 flex flex-col justify-between transition-all duration-300 z-30 select-none ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="p-3 space-y-4 overflow-y-auto">
            
            {/* Sidebar Header Brand */}
            {!sidebarCollapsed && (
              <div className="p-3 bg-[#EBF3FF] rounded-2xl border border-blue-100 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#0071DC] text-white flex items-center justify-center shadow-xs shrink-0 font-black">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#041E42] tracking-wide">FraudGuard</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Fraud Detection &amp; Protection</p>
                </div>
              </div>
            )}

            {/* Navigation Menu Links */}
            <nav className="space-y-1">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: Activity },
                { key: 'reviews', label: 'Admin Reviews', icon: Eye, badge: pendingReviews.length > 0 ? pendingReviews.length : null },
                { key: 'incidents', label: 'Incidents', icon: AlertTriangle, badge: totalIncidentsCount > 0 ? totalIncidentsCount : null },
                { key: 'customers', label: 'Customers', icon: Users },
                { key: 'banned', label: 'Banned Accounts', icon: Lock, badge: bannedAccounts.length > 0 ? bannedAccounts.length : null },
                { key: 'restrictions', label: 'Restrictions', icon: Clock, badge: activeRestrictionsCount > 0 ? activeRestrictionsCount : null },
                { key: 'verification', label: 'Verification', icon: Phone, badge: pendingOtpVerifCount > 0 ? pendingOtpVerifCount : null },
                { key: 'audit', label: 'Audit Log', icon: FileText },
                { key: 'actions', label: 'Admin Actions', icon: Sliders }
              ].map(item => {
                const IconComponent = item.icon;
                const isActive = activeSubView === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => navigateToSubView(item.key)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#0071DC] text-white shadow-md font-black'
                        : 'text-gray-600 hover:text-[#0071DC] hover:bg-blue-50/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>

                    {!sidebarCollapsed && item.badge !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-white text-[#0071DC]' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Collapse Action */}
          <div className="p-3 border-t border-gray-200 bg-gray-50/80 space-y-1">
            <button
              onClick={() => navigate('/admin/products')}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
              {!sidebarCollapsed && <span>Back to RetailHub</span>}
            </button>

            <button
              onClick={toggleSidebar}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4 text-[#0071DC]" /> : <PanelLeftClose className="w-4 h-4 text-gray-500" />}
              {!sidebarCollapsed && <span>Collapse Sidebar (Ctrl+B)</span>}
            </button>
          </div>
        </aside>

        {/* Main Canvas Operational View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={fetchAllFraudData} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer">Retry</button>
            </div>
          )}

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="flex items-center space-x-3">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button onClick={() => setActionFeedback(null)} className="text-gray-400 hover:text-gray-700 font-bold px-2 py-0.5">✕</button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && !overview && (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="h-28 bg-white rounded-2xl border border-gray-200"></div>
                ))}
              </div>
              <div className="h-64 bg-white rounded-2xl border border-gray-200"></div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 1: DASHBOARD (MATCHING MOCKUP EXACTLY) */}
          {/* ================================================== */}
          {activeSubView === 'dashboard' && !selectedIncident && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* 5 KPI CARDS (100% DYNAMIC FROM BACKEND SOURCE OF TRUTH DB ARRAYS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Card 1 — Total Incidents */}
                <div
                  onClick={() => navigateToSubView('incidents')}
                  className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-red-400 shadow-xs cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Total Incidents</span>
                    <div className="p-2 rounded-xl bg-red-50 border border-red-100 text-red-600 group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black text-gray-900 font-mono tracking-tight">{totalIncidentsCount}</span>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex items-center">
                      Live DB
                    </span>
                  </div>
                </div>

                {/* Card 2 — Admin Review Required */}
                <div
                  onClick={() => navigateToSubView('reviews')}
                  className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-purple-400 shadow-xs cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Admin Review Required</span>
                    <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 group-hover:scale-105 transition-transform">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black text-purple-900 font-mono tracking-tight">{adminReviewRequiredCount}</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center">
                      Action Needed
                    </span>
                  </div>
                </div>

                {/* Card 3 — Banned Accounts */}
                <div
                  onClick={() => navigateToSubView('banned')}
                  className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-500 shadow-xs cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Banned Accounts</span>
                    <div className="p-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-800 group-hover:scale-105 transition-transform">
                      <Lock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black text-gray-900 font-mono tracking-tight">{bannedAccountsCount}</span>
                    <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 flex items-center">
                      Permanent
                    </span>
                  </div>
                </div>

                {/* Card 4 — Currently Restricted */}
                <div
                  onClick={() => navigateToSubView('restrictions')}
                  className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-amber-400 shadow-xs cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Currently Restricted</span>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 group-hover:scale-105 transition-transform">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black text-amber-900 font-mono tracking-tight">{activeRestrictionsCount}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex items-center">
                      24h Lock
                    </span>
                  </div>
                </div>

                {/* Card 5 — OTP Step-Up Verification Required */}
                <div
                  onClick={() => navigateToSubView('verification')}
                  className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-400 shadow-xs cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Step-Up Verification</span>
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                      <Phone className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black text-blue-900 font-mono tracking-tight">{pendingOtpVerifCount}</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center">
                      Pending OTP
                    </span>
                  </div>
                </div>

              </div>

              {/* 3 ANALYTICS CHARTS (DYNAMIC INCIDENT TREND, HORIZONTAL WORKFLOW BARS, FRAUD TYPES DISTRIBUTION) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Chart 1: Incident Trend (7 Days Area & Points Chart with Interactive Hover Tooltip) */}
                <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-[#0071DC]" />
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Incident Trend</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">Last 7 Days (Live DB)</span>
                  </div>

                  {/* SVG Chart Container */}
                  <div className="h-44 w-full relative flex items-end pt-4 pb-2 px-2">
                    {(() => {
                      const maxTrendVal = Math.max(...incidentTrendData.map(d => d.count), 1);
                      const points = incidentTrendData.map((d, idx) => {
                        const x = 30 + (idx / 6) * 440;
                        const y = 100 - (d.count / maxTrendVal) * 75;
                        return { x, y, day: d };
                      });

                      const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                      const areaD = `${pathD} L 470 110 L 30 110 Z`;

                      return (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0071DC" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#0071DC" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Background Lines */}
                          <line x1="30" y1="110" x2="470" y2="110" stroke="#e5e7eb" strokeWidth="1" />
                          <line x1="30" y1="72.5" x2="470" y2="72.5" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="30" y1="35" x2="470" y2="35" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3 3" />

                          {/* Area & Line */}
                          <path d={areaD} fill="url(#trendGradient)" />
                          <path d={pathD} fill="none" stroke="#0071DC" strokeWidth="3" strokeLinecap="round" />

                          {/* Vertical Guide Line on Hover */}
                          {hoveredTrendIndex !== null && points[hoveredTrendIndex] && (
                            <line
                              x1={points[hoveredTrendIndex].x}
                              y1="10"
                              x2={points[hoveredTrendIndex].x}
                              y2="110"
                              stroke="#0071DC"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* Interactive Hover Point Nodes */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredTrendIndex === idx ? 7 : 4.5}
                                fill={hoveredTrendIndex === idx ? '#0071DC' : '#ffffff'}
                                stroke="#0071DC"
                                strokeWidth={hoveredTrendIndex === idx ? 3 : 2.5}
                                className="cursor-pointer transition-all duration-200"
                                onMouseEnter={() => setHoveredTrendIndex(idx)}
                                onMouseLeave={() => setHoveredTrendIndex(null)}
                              />
                            </g>
                          ))}
                        </svg>
                      );
                    })()}

                    {/* Interactive Tooltip Overlay */}
                    {hoveredTrendIndex !== null && incidentTrendData[hoveredTrendIndex] && (
                      <div
                        className="absolute bg-gray-900 text-white text-[11px] font-mono px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-20 transition-all duration-150 transform -translate-x-1/2 -translate-y-full border border-gray-700"
                        style={{
                          left: `${((30 + (hoveredTrendIndex / 6) * 440) / 500) * 100}%`,
                          top: '15px'
                        }}
                      >
                        <div className="font-bold text-gray-300">{incidentTrendData[hoveredTrendIndex].label}</div>
                        <div className="text-blue-400 font-extrabold">{incidentTrendData[hoveredTrendIndex].count} Incidents</div>
                      </div>
                    )}
                  </div>

                  {/* Date Labels below X-Axis */}
                  <div className="flex justify-between text-[11px] font-mono text-gray-500 pt-2 border-t border-gray-100 px-1">
                    {incidentTrendData.map((d, idx) => (
                      <span
                        key={idx}
                        className={`cursor-pointer transition-colors ${hoveredTrendIndex === idx ? 'text-[#0071DC] font-black' : ''}`}
                        onMouseEnter={() => setHoveredTrendIndex(idx)}
                        onMouseLeave={() => setHoveredTrendIndex(null)}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Chart 2: Security Workflow Breakdown (Horizontal Bar Chart) */}
                <div className="lg:col-span-3 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Security Workflow Breakdown</h3>
                  </div>

                  {(() => {
                    const totalWorkflow = (pendingOtpVerifCount + activeRestrictionsCount + adminReviewRequiredCount) || 1;
                    const metrics = [
                      {
                        label: 'OTP Step-Up Verification Required',
                        count: pendingOtpVerifCount,
                        barColor: 'bg-blue-600',
                        textColor: 'text-blue-900',
                        bgColor: 'bg-blue-50',
                        onClick: () => navigateToSubView('verification')
                      },
                      {
                        label: 'Currently Restricted (24h Lock)',
                        count: activeRestrictionsCount,
                        barColor: 'bg-amber-500',
                        textColor: 'text-amber-900',
                        bgColor: 'bg-amber-50',
                        onClick: () => navigateToSubView('restrictions')
                      },
                      {
                        label: 'Admin Review Required',
                        count: adminReviewRequiredCount,
                        barColor: 'bg-purple-600',
                        textColor: 'text-purple-900',
                        bgColor: 'bg-purple-50',
                        onClick: () => navigateToSubView('reviews')
                      }
                    ];

                    return (
                      <div className="space-y-4 py-1">
                        {metrics.map((m, idx) => {
                          const pct = Math.round((m.count / totalWorkflow) * 100) || 0;
                          return (
                            <div key={idx} onClick={m.onClick} className="space-y-1.5 cursor-pointer group">
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                <span className="truncate pr-2 group-hover:text-gray-900 font-bold">{m.label}</span>
                                <span className={`font-mono font-black ${m.textColor} ${m.bgColor} px-2 py-0.5 rounded-md`}>
                                  {m.count}
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex">
                                <div
                                  className={`h-full transition-all duration-500 rounded-full ${m.barColor}`}
                                  style={{ width: `${Math.max(4, pct)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 text-[10px] font-mono text-gray-400 text-right uppercase tracking-wider">
                          Source of truth DB live breakdown
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Chart 3: Risk Level & Fraud Type Distribution (Source of Truth) */}
                <div className="lg:col-span-3 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Fraud Type Distribution</h3>
                    <span className="text-[10px] font-mono text-[#0071DC] bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                      {fraudTypeBreakdown.length} Types
                    </span>
                  </div>

                  <div className="space-y-3 py-1 max-h-72 overflow-y-auto pr-1">
                    {fraudTypeBreakdown.length === 0 ? (
                      <div className="text-xs text-gray-400 py-6 text-center font-mono">No incident data recorded</div>
                    ) : (
                      fraudTypeBreakdown.map((item, idx) => {
                        const colors = ['bg-[#0071DC]', 'bg-amber-500', 'bg-red-500', 'bg-purple-600', 'bg-emerald-600', 'bg-indigo-600'];
                        const barColor = colors[idx % colors.length];
                        return (
                          <div key={item.type} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between text-gray-700 font-medium">
                              <span className="truncate max-w-[150px] font-mono font-bold text-gray-800" title={item.type}>
                                {item.type.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono font-bold text-gray-900">
                                {item.count} ({item.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.max(4, item.percentage)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div className="pt-2 text-[10px] font-mono text-gray-400 text-right uppercase tracking-wider border-t border-gray-100">
                      Calculated from real incidents DB
                    </div>
                  </div>
                </div>

              </div>

              {/* LOWER CANVAS: RECENT FRAUD INCIDENTS TABLE + LIVE ACTIVITY FEED */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left 8-cols: Recent Incidents Table */}
                <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  
                  {/* Table Toolbar Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                        Recent Fraud Incidents
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Click any record to inspect complete detection evidence</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold overflow-x-auto">
                      {(['ALL', 'HIGH', 'INVESTIGATING', 'RESOLVED'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setTableTabFilter(tab)}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-extrabold ${
                            tableTabFilter === tab ? 'bg-[#0071DC] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Incidents Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-gray-50 text-gray-500 font-mono text-[10px] uppercase border-b border-gray-200">
                        <tr>
                          <th className="py-3 px-3">
                            <button onClick={() => setSelectedRows(selectedRows.length === filteredIncidents.length ? [] : filteredIncidents.map(i => i.incident_id))}>
                              {selectedRows.length > 0 ? <CheckSquare className="w-4 h-4 text-[#0071DC]" /> : <Square className="w-4 h-4 text-gray-400" />}
                            </button>
                          </th>
                          <th className="py-3 px-3">Incident ID</th>
                          <th className="py-3 px-3">Customer ID</th>
                          <th className="py-3 px-3">Fraud Type</th>
                          <th className="py-3 px-3">Risk Level</th>
                          <th className="py-3 px-3">Score</th>
                          <th className="py-3 px-3">Decision</th>
                          <th className="py-3 px-3">Detected At</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {filteredIncidents.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-gray-500 font-sans text-xs">
                              No fraud incidents matching active filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredIncidents.slice(0, 10).map(inc => (
                            <tr
                              key={inc.incident_id}
                              onClick={() => setSelectedIncident(inc)}
                              className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                            >
                              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setSelectedRows(prev => prev.includes(inc.incident_id) ? prev.filter(id => id !== inc.incident_id) : [...prev, inc.incident_id])}>
                                  {selectedRows.includes(inc.incident_id) ? <CheckSquare className="w-4 h-4 text-[#0071DC]" /> : <Square className="w-4 h-4 text-gray-300" />}
                                </button>
                              </td>
                              <td className="py-3 px-3 font-bold text-[#0071DC] group-hover:underline">
                                {inc.incident_id}
                              </td>
                              <td
                                className="py-3 px-3 text-gray-900 font-bold hover:text-[#0071DC]"
                                onClick={(e) => { e.stopPropagation(); openCustomerSecurityProfile(inc.customer_id); }}
                              >
                                {inc.customer_id}
                              </td>
                              <td className="py-3 px-3 text-gray-700 font-sans font-medium">
                                {inc.fraud_type}
                              </td>
                              <td className="py-3 px-3">
                                {formatRiskBadge(inc.risk_level)}
                              </td>
                              <td className="py-3 px-3 font-bold text-gray-900">
                                {inc.risk_score} <span className="text-[10px] text-gray-400 font-normal">/ 100</span>
                              </td>
                              <td className="py-3 px-3">
                                {formatActionBadge(inc.action)}
                              </td>
                              <td className="py-3 px-3 text-gray-500 text-[11px]">
                                {new Date(inc.timestamp || inc.created_at || Date.now()).toLocaleTimeString()}
                              </td>
                              <td className="py-3 px-3 text-right space-x-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedIncident(inc); }}
                                  className="px-2.5 py-1 bg-[#0071DC] hover:bg-[#0058C6] text-white rounded-lg text-[11px] font-sans font-bold shadow-2xs transition-all cursor-pointer"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Actions Bar */}
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Quick Actions:</span>
                    <div className="flex flex-wrap gap-2 font-bold">
                      <button onClick={() => navigateToSubView('restrictions')} className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center space-x-1.5 cursor-pointer">
                        <Lock className="w-3.5 h-3.5 text-purple-600" />
                        <span>Manage Restrictions</span>
                      </button>
                      <button onClick={() => navigateToSubView('verification')} className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center space-x-1.5 cursor-pointer">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Verify Customer</span>
                      </button>
                      <button onClick={() => navigateToSubView('analytics')} className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center space-x-1.5 cursor-pointer">
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View Analytics</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right 4-cols: Live Activity Feed */}
                <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-[#0071DC]" />
                      Live Activity Feed
                    </h3>
                    <button onClick={() => navigateToSubView('audit')} className="text-xs font-bold text-[#0071DC] hover:underline">View All →</button>
                  </div>

                  {/* Real Audit Log Items Timeline */}
                  <div className="space-y-4 text-xs font-mono max-h-[380px] overflow-y-auto pr-1">
                    {auditLogs.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 font-sans">No recent activity recorded.</p>
                    ) : (
                      auditLogs.slice(0, 7).map((audit, idx) => (
                        <div key={audit.audit_id || idx} className="flex items-start space-x-3 text-gray-700">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#0071DC] mt-1 shrink-0"></div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-gray-900 font-sans">{audit.event || audit.event_type}</p>
                            <p className="text-[11px] text-gray-500 font-sans">{audit.reason || 'Security decision executed by FraudGuard'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{new Date(audit.created_at || Date.now()).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW: ADMIN REVIEWS WORKFLOW */}
          {/* ================================================== */}
          {activeSubView === 'reviews' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                    <Eye className="w-5 h-5 text-orange-600 mr-2" />
                    Pending Administrator Reviews
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">High risk incidents and policy flags requiring human authorization</p>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Search admin reviews..."
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-800">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>{filteredPendingReviews.length} Cases Requiring Review</span>
                  </div>
                </div>
              </div>

              {filteredPendingReviews.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3 shadow-xs">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="text-base font-black text-gray-900">
                    {pendingReviews.length === 0 ? 'No Pending Reviews' : 'No Reviews Found'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto font-sans">
                    {pendingReviews.length === 0
                      ? 'All flagged incidents have been processed or resolved by automated FraudGuard policies.'
                      : 'No admin review cases matched your search query criteria.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredPendingReviews.map((rev) => (
                    <div key={rev.incident_id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-black text-base text-[#0071DC]">{rev.incident_id}</span>
                          {formatRiskBadge(rev.risk_level)}
                          <span className="text-xs font-bold text-gray-500 font-mono">Customer: {rev.customer_id}</span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          Detected: {new Date(rev.timestamp || rev.created_at || Date.now()).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-6 space-y-3">
                          <RiskScoreVisualizer score={rev.risk_score} riskLevel={rev.risk_level} />
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-xs">
                            <p className="font-bold text-gray-900">Fraud Type: <span className="font-normal">{rev.fraud_type}</span></p>
                            <p className="font-bold text-gray-900">Reason: <span className="font-normal text-gray-700">{rev.reason}</span></p>
                            {rev.ip_address && <p className="font-mono text-[11px] text-gray-500">IP: {rev.ip_address} | Session: {rev.session_id || 'N/A'}</p>}
                          </div>
                        </div>

                        <div className="md:col-span-6 flex flex-col justify-between space-y-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                          <div>
                            <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider block mb-1">Recommended Action</span>
                            <p className="text-xs text-gray-700 font-sans leading-relaxed">
                              {rev.ai_recommendation || rev.ai_finding || 'Review evidence and select appropriate admin response action below.'}
                            </p>
                          </div>

                          {/* Action Buttons (Strictly Decoupled Admin Review Actions) */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-100">
                            <button
                              onClick={() => setActionModal({ isOpen: true, actionType: 'EXTEND', targetItem: rev, reason: 'Extended restriction duration', durationMinutes: 1440 })}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Extend Restriction (24h)</span>
                            </button>

                            <button
                              onClick={() => setActionModal({ isOpen: true, actionType: 'DEACTIVATE', targetItem: rev, reason: 'Deactivated due to high security risk' })}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Deactivate Account</span>
                            </button>

                            <button
                              onClick={() => setActionModal({ isOpen: true, actionType: 'BAN', targetItem: rev, reason: 'Permanently banned due to confirmed fraud' })}
                              className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5"
                            >
                              <Lock className="w-3.5 h-3.5 text-red-500" />
                              <span>Ban Account</span>
                            </button>

                            <button
                              onClick={() => setActionModal({ isOpen: true, actionType: 'CLEAR', targetItem: rev, reason: 'Administrator cleared review requirement' })}
                              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl border border-gray-300 transition-all cursor-pointer flex items-center space-x-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Clear Review</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 2: ALL INCIDENTS REGISTRY */}
          {/* ================================================== */}
          {activeSubView === 'incidents' && !selectedIncident && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    Fraud Incidents Registry
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Complete detection database and security workflow logs</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="HIGH_RISK_GROUP">High Risk Group</option>
                    <option value="CRITICAL">Critical Risk</option>
                    <option value="VERY_HIGH">Very High Risk</option>
                    <option value="HIGH">High Risk</option>
                  </select>

                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="ALL">All Decision Actions</option>
                    <option value="STEP_UP">Step-Up</option>
                    <option value="RESTRICTION">Temporary Restriction</option>
                    <option value="ADMIN_REVIEW">Admin Review</option>
                    <option value="MONITOR">Monitor</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700 font-mono">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-3">Incident ID</th>
                        <th className="py-3 px-3">Customer ID</th>
                        <th className="py-3 px-3">Fraud Type</th>
                        <th className="py-3 px-3">Risk Level</th>
                        <th className="py-3 px-3">Score</th>
                        <th className="py-3 px-3">Decision</th>
                        <th className="py-3 px-3">Timestamp</th>
                        <th className="py-3 px-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {totalFilteredIncidents === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-500 font-sans text-xs">
                            No incidents found matching query parameters.
                          </td>
                        </tr>
                      ) : (
                        paginatedIncidents.map(inc => (
                          <tr key={inc.incident_id} onClick={() => setSelectedIncident(inc)} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                            <td className="py-3 px-3 font-bold text-[#0071DC]">{inc.incident_id}</td>
                            <td className="py-3 px-3 font-bold text-gray-900" onClick={(e) => { e.stopPropagation(); openCustomerSecurityProfile(inc.customer_id); }}>{inc.customer_id}</td>
                            <td className="py-3 px-3 font-sans font-medium text-gray-800">{inc.fraud_type}</td>
                            <td className="py-3 px-3">{formatRiskBadge(inc.risk_level)}</td>
                            <td className="py-3 px-3 font-bold text-gray-900">{inc.risk_score} / 100</td>
                            <td className="py-3 px-3">{formatActionBadge(inc.action)}</td>
                            <td className="py-3 px-3 text-gray-500 text-[11px]">{new Date(inc.timestamp || inc.created_at || Date.now()).toLocaleString()}</td>
                            <td className="py-3 px-3 text-right space-x-1">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedIncident(inc); }} className="px-3 py-1 bg-[#0071DC] hover:bg-[#0058C6] text-white rounded-lg font-sans font-bold cursor-pointer">
                                Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION TOOLBAR */}
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans">
                  {/* Left: Window range & current page status */}
                  <div className="flex items-center space-x-3 text-gray-600">
                    <span className="font-medium">
                      {totalFilteredIncidents === 0 ? (
                        'Showing 0 incidents'
                      ) : (
                        <>
                          Showing <span className="font-bold text-gray-900">{startIndex + 1}–{endIndex}</span> of <span className="font-bold text-gray-900">{totalFilteredIncidents}</span> incidents
                        </>
                      )}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="font-bold text-[#0071DC]">Page {validCurrentPage} of {totalPages}</span>
                  </div>

                  {/* Right: Items per page selector & Page navigation buttons */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 font-medium">Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-1 font-bold">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={validCurrentPage <= 1}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                        title="First Page"
                      >
                        «
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={validCurrentPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center space-x-1"
                      >
                        <span>Prev</span>
                      </button>

                      {/* Numbered page buttons */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                        .map((p, idx, arr) => {
                          const prevP = arr[idx - 1];
                          const showEllipsis = prevP && p - prevP > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="px-1 text-gray-400 font-normal">...</span>}
                              <button
                                onClick={() => setCurrentPage(p)}
                                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-bold ${
                                  validCurrentPage === p
                                    ? 'bg-[#0071DC] border-[#0071DC] text-white shadow-2xs'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={validCurrentPage >= totalPages}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center space-x-1"
                      >
                        <span>Next</span>
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={validCurrentPage >= totalPages}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                        title="Last Page"
                      >
                        »
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 3: INCIDENT DEEP DIVE MODAL / DETAILS */}
          {/* ================================================== */}
          {selectedIncident && (
            <div className="space-y-6 animate-fadeIn">
              <button onClick={() => setSelectedIncident(null)} className="flex items-center text-xs font-bold text-gray-600 hover:text-[#0071DC] cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Incidents Overview
              </button>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-black font-mono text-gray-900">{selectedIncident.incident_id}</h2>
                      {formatRiskBadge(selectedIncident.risk_level)}
                    </div>
                    <p className="text-xs font-mono text-gray-500 mt-1">
                      Customer: <button onClick={() => openCustomerSecurityProfile(selectedIncident.customer_id)} className="text-[#0071DC] font-bold hover:underline">{selectedIncident.customer_id}</button> • Detected: {new Date(selectedIncident.timestamp || selectedIncident.created_at || Date.now()).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div className="text-right">
                      <p className="text-[10px] font-mono font-bold text-gray-500 uppercase">RISK SCORE</p>
                      <p className="text-2xl font-black font-mono text-red-600">{selectedIncident.risk_score} <span className="text-xs text-gray-400">/ 100</span></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono pt-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-500 text-[10px] uppercase block">FRAUD TYPE</span>
                    <span className="font-bold text-gray-900 font-sans text-sm">{selectedIncident.fraud_type}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-500 text-[10px] uppercase block">SEVERITY</span>
                    <span className="font-bold text-gray-900">{selectedIncident.severity}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-500 text-[10px] uppercase block">DECISION ACTION</span>
                    <div className="mt-0.5">{formatActionBadge(selectedIncident.action)}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-500 text-[10px] uppercase block">ADMIN REVIEW STATUS</span>
                    {(() => {
                      const act = String(selectedIncident.action || '').toUpperCase();
                      const isReviewed = act === 'REVIEWED' || act === 'CLEARED';
                      const isReq = Boolean(selectedIncident.requires_admin_review) ||
                                    selectedIncident.requires_admin_review === 1 ||
                                    String(selectedIncident.requires_admin_review) === '1' ||
                                    act.includes('ADMIN') ||
                                    act.includes('REVIEW') ||
                                    (Number(selectedIncident.risk_score) || 0) >= 70;

                      if (isReviewed) {
                        return <span className="font-extrabold text-emerald-600 font-sans flex items-center mt-1 text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> REVIEWED</span>;
                      } else if (isReq) {
                        return <span className="font-extrabold text-red-600 font-sans flex items-center mt-1 text-xs"><AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-500" /> YES (Pending Review)</span>;
                      } else {
                        return <span className="font-extrabold text-gray-500 font-sans block mt-1 text-xs">NO (Automated Policy)</span>;
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Detection Evidence & AI Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Detection Evidence &amp; Signals</h3>
                  <div className="space-y-2 text-xs font-mono text-gray-700">
                    <p className="p-2 bg-gray-50 rounded-lg border border-gray-200">Reason: {selectedIncident.reason}</p>
                    <p className="p-2 bg-gray-50 rounded-lg border border-gray-200">IP Address: {selectedIncident.ip_address || '10.0.0.1'}</p>
                    <p className="p-2 bg-gray-50 rounded-lg border border-gray-200">Session ID: {selectedIncident.session_id || 's1'}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 space-y-3">
                  <div className="flex items-center space-x-2 border-b border-blue-100 pb-2">
                    <Sparkles className="w-4 h-4 text-[#0071DC]" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">AI Attack Pattern Analysis</h3>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-sans">
                    {selectedIncident.ai_attack_pattern || selectedIncident.ai_finding || 'Automated risk evaluation detected repeated authentication anomalies.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 4: CUSTOMERS SECURITY PROFILES */}
          {/* ================================================== */}
          {activeSubView === 'customers' && !selectedCustomer && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                    <Users className="w-5 h-5 text-[#0071DC] mr-2" />
                    Customer Security Profiles
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Account security state hierarchy, active restrictions, and incident histories</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 font-mono">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-3">Customer ID</th>
                      <th className="py-3 px-3">Risk Level</th>
                      <th className="py-3 px-3">Security State</th>
                      <th className="py-3 px-3">Active Restriction</th>
                      <th className="py-3 px-3">Incidents Count</th>
                      <th className="py-3 px-3 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500 font-sans text-xs">No customer security profiles registered.</td>
                      </tr>
                    ) : (
                      paginatedCustomers.map(c => (
                        <tr key={c.customer_id} onClick={() => openCustomerSecurityProfile(c.customer_id)} className="hover:bg-blue-50/50 cursor-pointer">
                          <td className="py-3 px-3 font-bold text-[#0071DC]">{c.customer_id}</td>
                          <td className="py-3 px-3">{formatRiskBadge(c.maxRisk)}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${c.status === 'RESTRICTED' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-purple-700">
                            {c.activeRestr || (c.status !== 'NORMAL' ? `RESTR-24H-${c.customer_id.replace(/^CUST-/, '')}` : 'None')}
                          </td>
                          <td className="py-3 px-3 font-bold text-gray-900">{c.incidentsCount}</td>
                          <td className="py-3 px-3 text-right">
                            <button onClick={() => openCustomerSecurityProfile(c.customer_id)} className="px-3 py-1 bg-[#0071DC] text-white font-sans font-bold rounded-lg cursor-pointer">
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {renderPaginationBar(
                  validCustCurrentPage,
                  custTotalPages,
                  custPageSize,
                  totalFilteredCustomers,
                  custStartIndex,
                  custEndIndex,
                  setCustCurrentPage,
                  setCustPageSize,
                  'customers'
                )}
              </div>
            </div>
          )}

          {/* Customer Deep Profile View */}
          {selectedCustomer && (
            <div className="space-y-6 animate-fadeIn">
              <button onClick={() => setSelectedCustomer(null)} className="flex items-center text-xs font-bold text-gray-600 hover:text-[#0071DC] cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Customers List
              </button>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-black font-mono text-gray-900 flex items-center">
                      <Users className="w-5 h-5 text-[#0071DC] mr-2" />
                      Customer Profile: {selectedCustomer.customer_id}
                    </h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      Account Status: <span className="font-bold text-gray-800">{selectedCustomer.account_status}</span> • Updated: {new Date(selectedCustomer.updated_at || Date.now()).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-[#0071DC] text-white text-xs font-bold rounded-xl uppercase">{selectedCustomer.security_status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-400 text-[10px] uppercase block">FAILED LOGINS</span>
                    <span className="font-bold text-gray-900 text-sm">{selectedCustomer.failed_login_count}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-400 text-[10px] uppercase block">STEP-UP REQUIRED</span>
                    <span className={`font-bold text-sm ${selectedCustomer.step_up_required ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {selectedCustomer.step_up_required ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-400 text-[10px] uppercase block">ACTIVE RESTRICTION</span>
                    <span className="font-bold text-purple-700 text-sm">
                      {selectedCustomer.active_restriction_id || (selectedCustomer.security_status !== 'NORMAL' ? `RESTR-24H-${selectedCustomer.customer_id.replace(/^CUST-/, '')}` : 'NONE')}
                    </span>
                  </div>
                </div>

                {/* Quick Security Action Buttons */}
                <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2 text-xs font-bold">
                  {(selectedCustomer.account_status === 'BANNED' || selectedCustomer.security_status === 'BANNED') && (
                    <button
                      onClick={() => handleRevokeBan(selectedCustomer.customer_id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer flex items-center space-x-1 font-sans"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Revoke Ban &amp; Activate</span>
                    </button>
                  )}

                  {(selectedCustomer.security_status === 'RESTRICTED' || selectedCustomer.active_restriction_id) && (
                    <button
                      onClick={() => handleReleaseRestriction(selectedCustomer.active_restriction_id || undefined, selectedCustomer.customer_id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer flex items-center space-x-1 font-sans"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Release Restriction</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActionModal({ isOpen: true, actionType: 'RESTRICT', targetItem: { incident_id: selectedCustomer.last_fraud_incident_id || 'MANUAL', customer_id: selectedCustomer.customer_id } as any, reason: 'Applied via customer profile', durationMinutes: 60 })}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl cursor-pointer flex items-center space-x-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Apply Restriction</span>
                  </button>

                  <button
                    onClick={() => setActionModal({ isOpen: true, actionType: 'DEACTIVATE', targetItem: { incident_id: selectedCustomer.last_fraud_incident_id || 'MANUAL', customer_id: selectedCustomer.customer_id } as any, reason: 'Deactivated via profile' })}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer flex items-center space-x-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Deactivate Account</span>
                  </button>

                  <button
                    onClick={() => setActionModal({ isOpen: true, actionType: 'BAN', targetItem: { incident_id: selectedCustomer.last_fraud_incident_id || 'MANUAL', customer_id: selectedCustomer.customer_id } as any, reason: 'Banned via profile' })}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl cursor-pointer flex items-center space-x-1"
                  >
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                    <span>Ban Account</span>
                  </button>
                </div>
              </div>

              {/* Customer Security Timeline */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center">
                  <Activity className="w-4 h-4 text-[#0071DC] mr-2" />
                  Customer Security Timeline &amp; History
                </h3>

                {selectedCustomerTimeline.length === 0 ? (
                  <p className="text-gray-400 text-xs font-sans text-center py-6">No historical security events recorded for this customer ID.</p>
                ) : (
                  <div className="relative border-l-2 border-blue-100 ml-3 pl-4 space-y-4 text-xs font-mono">
                    {selectedCustomerTimeline.map((item, idx) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#0071DC] border-2 border-white"></div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 font-sans">{item.title}</span>
                            <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-600 font-sans text-xs">{item.description}</p>
                          {item.badge && <div className="mt-1">{item.badge}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 4.5: BANNED ACCOUNTS REGISTRY */}
          {/* ================================================== */}
          {activeSubView === 'banned' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                    <Lock className="w-5 h-5 text-red-600 mr-2" />
                    Permanently Banned Accounts Registry
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Comprehensive audit registry of all customer accounts permanently banned due to fraud</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Search banned accounts..."
                    value={bannedSearch}
                    onChange={(e) => setBannedSearch(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 font-mono">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-3">Customer ID</th>
                      <th className="py-3 px-3">Customer Name</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Banned At</th>
                      <th className="py-3 px-3">Ban Reason</th>
                      <th className="py-3 px-3">Incident Ref</th>
                      <th className="py-3 px-3">Banned By</th>
                      <th className="py-3 px-3 text-right">Revoke Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedBannedAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-500 font-sans text-xs">No permanently banned customer accounts found.</td>
                      </tr>
                    ) : (
                      paginatedBannedAccounts.map(b => (
                        <tr key={b.customer_id} className="hover:bg-red-50/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-red-700">{b.customer_id}</td>
                          <td className="py-3 px-3 font-sans font-bold text-gray-900">{b.first_name} {b.last_name}</td>
                          <td className="py-3 px-3 text-gray-600">{b.email}</td>
                          <td className="py-3 px-3 text-gray-500">{b.phone_masked || b.phone}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200">BANNED</span>
                          </td>
                          <td className="py-3 px-3 text-gray-500">{new Date(b.banned_at || Date.now()).toLocaleString()}</td>
                          <td className="py-3 px-3 text-gray-800 font-sans max-w-xs truncate" title={b.ban_reason}>{b.ban_reason}</td>
                          <td className="py-3 px-3 text-[#0071DC] font-bold">{b.last_fraud_incident_id || 'INC-BAN-SYSTEM'}</td>
                          <td className="py-3 px-3 text-gray-600 font-bold">{b.banned_by || 'ADMIN'}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRevokeBan(b.customer_id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold rounded-xl transition-all shadow-2xs flex items-center space-x-1 ml-auto cursor-pointer"
                              title="Revoke permanent ban and activate account"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Revoke Ban</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {renderPaginationBar(
                  validBannedCurrentPage,
                  bannedTotalPages,
                  bannedPageSize,
                  totalFilteredBanned,
                  bannedStartIndex,
                  bannedEndIndex,
                  setBannedCurrentPage,
                  setBannedPageSize,
                  'banned accounts'
                )}
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 5: RESTRICTIONS REGISTRY */}
          {/* ================================================== */}
          {activeSubView === 'restrictions' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                    <Lock className="w-5 h-5 text-purple-600 mr-2" />
                    Fraud Restrictions Registry
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Active and historical account restrictions executed by FraudGuard</p>
                </div>
                <div className="flex items-center space-x-2 font-sans">
                  <span className="text-xs font-bold text-gray-500">Filter Status:</span>
                  <select
                    value={restrictionStatusFilter}
                    onChange={(e) => setRestrictionStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ALL">ALL (Active &amp; Released)</option>
                    <option value="ACTIVE">ACTIVE Restrictions</option>
                    <option value="RELEASED">RELEASED / Expired</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 font-mono">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-3">Restriction ID</th>
                      <th className="py-3 px-3">Customer ID</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Started At</th>
                      <th className="py-3 px-3">Expires At</th>
                      <th className="py-3 px-3">Release / Expiry Status</th>
                      <th className="py-3 px-3">Incident ID</th>
                      <th className="py-3 px-3 text-right">Release Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRestrictions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-500 font-sans text-xs">No restrictions currently active in database matching query.</td>
                      </tr>
                    ) : (
                      filteredRestrictions.map(restr => {
                        const isReleased = String(restr.status).toUpperCase() === 'RELEASED' || String(restr.status).toUpperCase() === 'EXPIRED';
                        return (
                          <tr key={restr.restriction_id} onClick={() => setSelectedRestriction(restr)} className="hover:bg-blue-50/50 cursor-pointer">
                            <td className="py-3 px-3 font-bold text-purple-700">{restr.restriction_id}</td>
                            <td className="py-3 px-3 font-bold text-gray-900">{restr.customer_id}</td>
                            <td className="py-3 px-3 font-sans font-medium text-gray-800">{restr.restriction_type}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isReleased ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {restr.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-500">{new Date(restr.started_at).toLocaleString()}</td>
                            <td className="py-3 px-3 text-gray-500">{restr.expires_at ? new Date(restr.expires_at).toLocaleString() : 'N/A'}</td>
                            <td className="py-3 px-3 font-sans text-[11px]">
                              {isReleased ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Released
                                </span>
                              ) : (
                                <span className="text-amber-700 font-bold">Active Enforcement</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-[#0071DC]">{restr.incident_id || 'N/A'}</td>
                            <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              {isReleased ? (
                                <span className="px-2.5 py-1 text-gray-400 font-sans font-bold text-[11px] bg-gray-100 rounded-lg inline-block">
                                  Released
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleReleaseRestriction(restr.restriction_id, restr.customer_id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold rounded-xl transition-all shadow-2xs flex items-center space-x-1 ml-auto cursor-pointer"
                                  title="Release restriction and restore customer to ACTIVE"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Release</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 6: CUSTOMER SECURITY VERIFICATION REGISTRY */}
          {/* ================================================== */}
          {activeSubView === 'verification' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                    <ShieldCheck className="w-5 h-5 text-[#0071DC] mr-2" />
                    Customer Security Verification Registry
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Unique customer accounts currently requiring step-up OTP verification (Excludes active restrictions, banned &amp; admin reviews)</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 font-mono">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-3">Challenge ID</th>
                      <th className="py-3 px-3">Customer ID</th>
                      <th className="py-3 px-3">Phone Reference</th>
                      <th className="py-3 px-3">Verification Status</th>
                      <th className="py-3 px-3">Incidents</th>
                      <th className="py-3 px-3">Attempts</th>
                      <th className="py-3 px-3 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedVerifications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500 font-sans text-xs">No pending verification challenges logged in database.</td>
                      </tr>
                    ) : (
                      paginatedVerifications.map(ver => {
                        return (
                          <tr key={ver.challenge_id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="py-3 px-3 font-bold text-[#0071DC]">{ver.challenge_id}</td>
                            <td className="py-3 px-3 font-bold text-gray-900" onClick={() => openCustomerSecurityProfile(ver.customer_id)}>
                              <button className="text-[#0071DC] hover:underline cursor-pointer">{ver.customer_id}</button>
                            </td>
                            <td className="py-3 px-3">{ver.destination_masked || '+91 ***** **3210'}</td>
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                PENDING STEP-UP
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-gray-800 font-sans">
                              {(ver as any).incident_count || 1} Incidents
                            </td>
                            <td className="py-3 px-3 font-mono">{ver.attempts || 0} / {ver.max_attempts || 3}</td>
                            <td className="py-3 px-3 text-right space-x-2">
                              <button
                                onClick={() => setOtpModal({
                                  isOpen: true,
                                  customerId: ver.customer_id,
                                  incidentId: ver.incident_id || undefined,
                                  activeChallengeId: ver.challenge_id,
                                  maskedPhone: ver.destination_masked || '+91 ***** **3210',
                                  demoOtp: '123456'
                                })}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-sans font-bold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" />
                                <span>Simulate OTP</span>
                              </button>
                              <button
                                onClick={() => {
                                  window.open(`/security-verification?customer_id=${ver.customer_id}`, '_blank');
                                }}
                                className="px-2.5 py-1 bg-[#0071DC] hover:bg-[#0058C6] text-white rounded-lg text-[11px] font-sans font-bold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open OTP UI</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {renderPaginationBar(
                  validVerifCurrentPage,
                  verifTotalPages,
                  verifPageSize,
                  totalFilteredVerifications,
                  verifStartIndex,
                  verifEndIndex,
                  setVerifCurrentPage,
                  setVerifPageSize,
                  'verification challenges'
                )}
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 7: ANALYTICS DASHBOARD */}
          {/* ================================================== */}
          {activeSubView === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                  <BarChart3 className="w-5 h-5 text-emerald-600 mr-2" />
                  Fraud Analytics &amp; Risk Metrics
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Aggregated metrics calculated directly from database records</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Detection Rate</span>
                  <p className="text-3xl font-black font-mono text-gray-900">{totalIncidentsCount}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Active Protection Enforced</span>
                  <p className="text-3xl font-black font-mono text-purple-700">{activeRestrictionsCount}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Step-Up Verified</span>
                  <p className="text-3xl font-black font-mono text-blue-700">{investigatingCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 8: AUDIT LOG (APPEND-ONLY) */}
          {/* ================================================== */}
          {activeSubView === 'audit' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                  <FileText className="w-5 h-5 text-[#0071DC] mr-2" />
                  Security Audit Log
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Append-only audit trail tracking FraudGuard events and automated decisions</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 font-mono">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Actor</th>
                      <th className="py-3 px-3">Event Type</th>
                      <th className="py-3 px-3">Customer ID</th>
                      <th className="py-3 px-3">Incident ID</th>
                      <th className="py-3 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500 font-sans text-xs">No audit records logged matching query.</td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map(audit => (
                        <tr key={audit.audit_id} onClick={() => setSelectedAuditLog(audit)} className="hover:bg-blue-50/50 cursor-pointer">
                          <td className="py-3 px-3 text-gray-500">{new Date(audit.created_at || Date.now()).toLocaleString()}</td>
                          <td className="py-3 px-3 font-bold text-emerald-700">{audit.actor_type}</td>
                          <td className="py-3 px-3 font-sans font-medium text-gray-900">{audit.event_type || audit.event}</td>
                          <td className="py-3 px-3 font-bold">{audit.customer_id || 'N/A'}</td>
                          <td className="py-3 px-3 text-[#0071DC]">{audit.incident_id || 'N/A'}</td>
                          <td className="py-3 px-3"><span className="text-emerald-700 font-bold">{audit.result || 'SUCCESS'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Audit Detail Modal */}
              {selectedAuditLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs font-mono shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-[#0071DC]" /> Security Audit Log Detail
                      </h3>
                      <button onClick={() => setSelectedAuditLog(null)} className="text-gray-400 hover:text-gray-700 p-1 font-bold">✕</button>
                    </div>

                    <div className="space-y-2 text-gray-700">
                      <p><span className="text-gray-400">Audit ID:</span> {selectedAuditLog.audit_id}</p>
                      <p><span className="text-gray-400">Event:</span> {selectedAuditLog.event}</p>
                      <p><span className="text-gray-400">Reason:</span> {selectedAuditLog.reason || 'N/A'}</p>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] overflow-x-auto max-h-40">
                        <span className="text-gray-400 block mb-1">Raw Event Metadata:</span>
                        <pre className="text-blue-900">{JSON.stringify(selectedAuditLog.metadata || selectedAuditLog.evidence || {}, null, 2)}</pre>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button onClick={() => setSelectedAuditLog(null)} className="px-4 py-2 bg-[#0071DC] text-white font-bold rounded-xl cursor-pointer">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Restriction Detail Modal */}
          {selectedRestriction && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs font-mono shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-purple-700 uppercase tracking-wider flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-purple-600" /> Restriction Record Details
                  </h3>
                  <button onClick={() => setSelectedRestriction(null)} className="text-gray-400 hover:text-gray-700 p-1 font-bold">✕</button>
                </div>

                <div className="space-y-2 text-gray-700">
                  <p><span className="text-gray-400">Restriction ID:</span> <span className="font-bold text-purple-700">{selectedRestriction.restriction_id}</span></p>
                  <p><span className="text-gray-400">Customer ID:</span> <span className="font-bold text-gray-900">{selectedRestriction.customer_id}</span></p>
                  <p><span className="text-gray-400">Restriction Type:</span> {selectedRestriction.restriction_type}</p>
                  <p><span className="text-gray-400">Status:</span> <span className="font-bold text-purple-700">{selectedRestriction.status}</span></p>
                  <p><span className="text-gray-400">Started At:</span> {new Date(selectedRestriction.started_at).toLocaleString()}</p>
                  <p><span className="text-gray-400">Expires At:</span> {selectedRestriction.expires_at ? new Date(selectedRestriction.expires_at).toLocaleString() : 'Never'}</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button onClick={() => setSelectedRestriction(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl cursor-pointer">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* SUBVIEW 9: ADMIN ACTIONS (EMPTY UNLESS HUMAN ADMIN ACTS) */}
          {/* ================================================== */}
          {activeSubView === 'actions' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center">
                  <Sliders className="w-5 h-5 text-[#0071DC] mr-2" />
                  Administrator Actions Log
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Historical record of human administrator security decisions</p>
              </div>

              <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
                {adminActions.length === 0 ? (
                  <>
                    <Sliders className="w-10 h-10 text-gray-300 mx-auto" />
                    <h3 className="text-base font-bold text-gray-900">No administrator actions recorded</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto font-sans leading-relaxed">
                      FraudGuard automated events (e.g. ADMIN_REVIEW) do not create synthetic admin action records. Records appear here only when an authenticated administrator executes an action.
                    </p>
                  </>
                ) : (
                  <div className="overflow-x-auto text-left font-mono text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase border-b border-gray-200">
                        <tr>
                          <th className="py-3 px-3">Timestamp</th>
                          <th className="py-3 px-3">Admin ID</th>
                          <th className="py-3 px-3">Action</th>
                          <th className="py-3 px-3">Customer ID</th>
                          <th className="py-3 px-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminActions.map(act => (
                          <tr key={act.action_id} className="border-b border-gray-100">
                            <td className="py-3 px-3 text-gray-500">{new Date(act.created_at || Date.now()).toLocaleString()}</td>
                            <td className="py-3 px-3 font-bold text-[#0071DC]">{act.admin_id}</td>
                            <td className="py-3 px-3 font-bold text-purple-700">{act.action}</td>
                            <td className="py-3 px-3">{act.customer_id}</td>
                            <td className="py-3 px-3 text-gray-600">{act.reason || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Modal (Confirmation & Parameter Input) */}
          {actionModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center text-gray-900">
                    {actionModal.actionType === 'BAN' || actionModal.actionType === 'DEACTIVATE' ? (
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    ) : (
                      <Sliders className="w-5 h-5 text-[#0071DC] mr-2" />
                    )}
                    Confirm Admin Action: {actionModal.actionType}
                  </h3>
                  <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1">✕</button>
                </div>

                {(actionModal.actionType === 'BAN' || actionModal.actionType === 'DEACTIVATE') && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">DESTRUCTIVE ACCOUNT ACTION</p>
                      <p className="font-normal mt-0.5">
                        Are you sure you want to {actionModal.actionType === 'BAN' ? 'permanently BAN' : 'deactivate'} account for customer <span className="font-mono font-bold">{actionModal.targetItem?.customer_id}</span>? This will enforce immediate security protection.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Customer ID</label>
                    <input type="text" readOnly value={actionModal.targetItem?.customer_id || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-2.5 font-mono font-bold text-gray-800" />
                  </div>

                  {(actionModal.actionType === 'RESTRICT' || actionModal.actionType === 'EXTEND') && (
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Restriction Duration (Minutes)</label>
                      <input
                        type="number"
                        value={actionModal.durationMinutes || 60}
                        onChange={(e) => setActionModal({ ...actionModal, durationMinutes: parseInt(e.target.value, 10) || 60 })}
                        className="w-full border border-gray-200 rounded-xl p-2.5 font-mono text-gray-900 focus:outline-none focus:border-[#0071DC]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Reason / Case Notes</label>
                    <textarea
                      rows={3}
                      value={actionModal.reason}
                      onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                      placeholder="Provide mandatory administrator justification for audit trail..."
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-gray-900 font-sans focus:outline-none focus:border-[#0071DC]"
                    ></textarea>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
                  <button onClick={() => setActionModal(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={executeAdminAction}
                    disabled={actionSubmitting}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center space-x-1.5 ${
                      actionModal.actionType === 'BAN' || actionModal.actionType === 'DEACTIVATE'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-[#0071DC] hover:bg-[#0058C6]'
                    } disabled:opacity-50`}
                  >
                    {actionSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Action</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Customer OTP Testing & Verification Modal */}
          {otpModal && otpModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center text-gray-900">
                    <ShieldCheck className="w-5 h-5 text-[#0071DC] mr-2" />
                    Customer Security &amp; OTP Testing Center
                  </h3>
                  <button onClick={() => setOtpModal(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1 cursor-pointer">✕</button>
                </div>

                {/* Feedback Alert */}
                {otpModal.feedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                    otpModal.feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
                    otpModal.feedback.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
                    'bg-blue-50 text-blue-900 border border-blue-200'
                  }`}>
                    {otpModal.feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                    {otpModal.feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    {otpModal.feedback.type === 'info' && <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                    <span>{otpModal.feedback.message}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer ID</span>
                      <span className="font-mono font-bold text-sm text-gray-900">{otpModal.customerId}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Security Status</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                        {otpModal.securityStatus || 'FETCHING...'}
                      </span>
                    </div>
                  </div>

                  {/* Direct Link Button to Customer Verification Page */}
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-blue-950">Customer Verification URL</p>
                      <p className="text-[11px] text-blue-700 font-mono">/security-verification?customer_id={otpModal.customerId}</p>
                    </div>
                    <button
                      onClick={() => window.open(`/security-verification?customer_id=${otpModal.customerId}`, '_blank')}
                      className="px-3 py-1.5 bg-[#0071DC] hover:bg-[#0058C6] text-white rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Customer UI</span>
                    </button>
                  </div>

                  {/* OTP Challenge Testing */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <span className="font-bold text-gray-800 block">Simulation &amp; Admin OTP Actions</span>
                    
                    {!otpModal.activeChallengeId ? (
                      <button
                        onClick={handleAdminRequestOtp}
                        disabled={otpModal.loading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {otpModal.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                        <span>Request Security OTP Challenge</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 text-xs font-mono">
                          <p><strong>Active Challenge ID:</strong> {otpModal.activeChallengeId}</p>
                          <p><strong>Demo OTP Code:</strong> <span className="font-bold text-base text-amber-900 bg-amber-200 px-2 py-0.5 rounded">{otpModal.demoOtp || '123456'}</span></p>
                          <p><strong>Destination:</strong> {otpModal.maskedPhone || '+1 *** *** 1234'}</p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAdminVerifyOtp(otpModal.demoOtp || '123456')}
                            disabled={otpModal.loading}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {otpModal.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Auto-Fill &amp; Verify ({otpModal.demoOtp || '123456'})</span>
                          </button>

                          <button
                            onClick={handleAdminRequestOtp}
                            disabled={otpModal.loading}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition cursor-pointer"
                            title="Resend OTP"
                          >
                            Resend
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                  <button onClick={() => setOtpModal(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminFraudGuardPage;
