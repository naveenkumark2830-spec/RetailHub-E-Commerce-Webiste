import { create } from 'zustand';

export interface SessionData {
  session_id: string;
  customer_id: string | null;
  user_type: 'guest' | 'registered';
  device: string;
  browser: string;
  started_at: string;
}

export interface CustomerData {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  country: string;
  state: string;
  city: string;
  language: string;
  membership: string;
  preferred_payment: string;
  account_status: string;
}

interface SessionState {
  session: SessionData | null;
  customer: CustomerData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  createGuestSession: () => Promise<SessionData | null>;
  terminateSession: () => Promise<void>;
  clearSession: () => void;
  login: (credentials: Record<string, string>) => Promise<boolean>;
  register: (profileData: Record<string, string>) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setCustomer: (customer: CustomerData | null) => void;
}

const STORAGE_KEY = 'retailhub_session';
const CUSTOMER_STORAGE_KEY = 'retailhub_customer';

const getInitialSession = (): SessionData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved session:', e);
  }
  return null;
};

const getInitialCustomer = (): CustomerData | null => {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  session: getInitialSession(),
  customer: getInitialCustomer(),
  isAuthenticated: !!getInitialCustomer(),
  isLoading: false,
  error: null,

  createGuestSession: async () => {
    const current = get().session;
    if (current && current.user_type === 'guest') {
      return current;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: 'guest', device: 'desktop', browser: 'Chrome' }),
      });

      if (!response.ok) {
        throw new Error(`Session creation failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.session) {
        const sessionPayload: SessionData = data.session;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
        set({ session: sessionPayload, isLoading: false });
        return sessionPayload;
      } else {
        throw new Error('Invalid response structure from backend');
      }
    } catch (err: any) {
      console.warn('[Session Store API Fallback] Backend endpoint unreachable:', err.message);
      const fallbackSession: SessionData = {
        session_id: `sess_${Math.random().toString(36).substring(2, 10)}`,
        customer_id: null,
        user_type: 'guest',
        device: 'desktop',
        browser: 'Chrome',
        started_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackSession));
      set({ session: fallbackSession, isLoading: false, error: err.message });
      return fallbackSession;
    }
  },

  terminateSession: async () => {
    const current = get().session;
    if (current) {
      try {
        await fetch('/api/sessions/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: current.session_id }),
        });
      } catch (e) {
        console.warn('[Session Store Logout Fallback] Failed to notify backend:', e);
      }
    }
    get().clearSession();
  },

  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    set({ session: null, customer: null, isAuthenticated: false, error: null });
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    const currentSession = get().session;
    const sessionId = currentSession?.session_id || `sess_${Math.random().toString(36).substring(2, 10)}`;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, session_id: sessionId }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Link session details
        const updatedSession: SessionData = {
          session_id: sessionId,
          customer_id: data.customer.customer_id,
          user_type: 'registered',
          device: currentSession?.device || 'desktop',
          browser: currentSession?.browser || 'Chrome',
          started_at: currentSession?.started_at || new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
        localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data.customer));
        set({ 
          customer: data.customer, 
          session: updatedSession, 
          isAuthenticated: true, 
          isLoading: false 
        });
        return true;
      } else {
        set({ error: data.error || 'Login failed', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Login connection error', isLoading: false });
      return false;
    }
  },

  register: async (profileData) => {
    set({ isLoading: true, error: null });
    const currentSession = get().session;
    const sessionId = currentSession?.session_id || `sess_${Math.random().toString(36).substring(2, 10)}`;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileData, session_id: sessionId }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Link session details
        const updatedSession: SessionData = {
          session_id: sessionId,
          customer_id: data.customer.customer_id,
          user_type: 'registered',
          device: currentSession?.device || 'desktop',
          browser: currentSession?.browser || 'Chrome',
          started_at: currentSession?.started_at || new Date().toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
        localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data.customer));
        set({ 
          customer: data.customer, 
          session: updatedSession, 
          isAuthenticated: true, 
          isLoading: false 
        });
        return true;
      } else {
        set({ error: data.error || 'Registration failed', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message || 'Registration connection error', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    const currentSession = get().session;
    const sessionId = currentSession?.session_id || 'sess_unknown';
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (e) {
      console.warn('[Session Store Logout Error]', e);
    }
    get().clearSession();
  },

  checkAuth: async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.customer) {
          localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data.customer));
          set({ customer: data.customer, isAuthenticated: true });
          return;
        }
      }
    } catch (e) {
      // Not authenticated or server down
    }

    const saved = getInitialCustomer();
    if (saved) {
      set({ customer: saved, isAuthenticated: true });
    }
  },
  setCustomer: (customer) => set({ customer }),
}));
