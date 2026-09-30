import { LoginResponse, User, WorkFilters, WorkStats, WorkStatus, WorkUpdate, EmployeeQuery, EmployeeQueryDetail, QueryFilters, QueryStatus, QueryType, AppNotification, EodRecord, EodReport, EodEnablement, EodSubmissionGate } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('wt_access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('wt_refresh_token');
}

export function setAuthTokens(token: string, refreshToken: string) {
  localStorage.setItem('wt_access_token', token);
  localStorage.setItem('wt_refresh_token', refreshToken);
}

export function clearAuthTokens() {
  localStorage.removeItem('wt_access_token');
  localStorage.removeItem('wt_refresh_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    // Attempt refresh token
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });

        if (refreshRes.ok) {
          const data: LoginResponse = await refreshRes.json();
          setAuthTokens(data.token, data.refreshToken);
          // Retry original request
          headers['Authorization'] = `Bearer ${data.token}`;
          const retryRes = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
          });
          if (!retryRes.ok) {
            const errData = await retryRes.json().catch(() => ({}));
            throw new Error(errData.message || `Request failed with status ${retryRes.status}`);
          }
          return retryRes.json();
        }
      } catch (e) {
        clearAuthTokens();
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    } else {
      clearAuthTokens();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error (${response.status})`);
  }

  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string): Promise<LoginResponse> =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: (): Promise<{ user: User }> => request('/auth/me'),
    updateProfile: (profile: {
      fullName: string;
      email: string;
      state?: string | null;
      employeeId?: string | null;
      mobileNumber?: string | null;
    }): Promise<{ user: User }> =>
      request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      }),
    changePassword: (payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<{ message: string }> =>
      request('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  works: {
    list: (filters: WorkFilters = {}, page = 1, limit = 20): Promise<{ items: WorkUpdate[]; total: number; hasMore: boolean }> => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.department && filters.department !== 'all') params.append('department', filters.department);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.userId) params.append('userId', filters.userId);
      params.append('page', String(page));
      params.append('limit', String(limit));

      return request(`/works?${params.toString()}`);
    },

    getById: (id: string): Promise<WorkUpdate> => request(`/works/${id}`),

    create: (data: {
      title: string;
      description: string;
      hoursSpent: number;
      category: string;
      attachments?: { fileName: string; fileUrl: string; fileSize: number; fileType: string }[];
      eodDate?: string;
    }): Promise<WorkUpdate> =>
      request('/works', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (
      id: string,
      data: {
        title?: string;
        description?: string;
        hoursSpent?: number;
        category?: string;
        attachments?: { fileName: string; fileUrl: string; fileSize: number; fileType: string }[];
      }
    ): Promise<WorkUpdate> =>
      request(`/works/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    review: (id: string, status: 'approved' | 'rejected', comment: string): Promise<WorkUpdate> =>
      request(`/works/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, comment }),
      }),

    bulkReview: (ids: string[], status: 'approved' | 'rejected', comment: string): Promise<{ message: string; items: WorkUpdate[] }> =>
      request('/works/bulk-review', {
        method: 'POST',
        body: JSON.stringify({ ids, status, comment }),
      }),

    stats: (): Promise<WorkStats> => request('/works/stats'),
  },

  users: {
    list: (): Promise<User[]> => request('/users'),
    create: (userData: any): Promise<User> =>
      request('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    update: (id: string, userData: any): Promise<User> =>
      request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      }),
  },

  queries: {
    list: (filters: QueryFilters = {}): Promise<EmployeeQuery[]> => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.queryType && filters.queryType !== 'all') params.append('queryType', filters.queryType);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.search) params.append('search', filters.search);
      const qs = params.toString();
      return request(`/queries${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string): Promise<EmployeeQueryDetail> => request(`/queries/${id}`),
    create: (data: { queryType: QueryType; subject: string; description: string; relatedDate?: string | null }): Promise<EmployeeQuery> =>
      request('/queries', { method: 'POST', body: JSON.stringify(data) }),
    respond: (id: string, data: { status: QueryStatus; hrResponse: string }): Promise<EmployeeQuery> =>
      request(`/queries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  notifications: {
    list: (): Promise<AppNotification[]> => request('/notifications'),
    unreadCount: (): Promise<{ count: number }> => request('/notifications/unread-count'),
    markRead: (id: string): Promise<AppNotification> => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: (): Promise<{ message: string }> => request('/notifications/read-all', { method: 'PUT' }),
  },

  eod: {
    markAbsentLeave: (date: string, reason: string): Promise<EodRecord> =>
      request('/eod/absent-leave', { method: 'POST', body: JSON.stringify({ date, reason }) }),
    report: (date: string, filters: { department?: string; userId?: string } = {}): Promise<EodReport> => {
      const params = new URLSearchParams({ date });
      if (filters.department && filters.department !== 'all') params.append('department', filters.department);
      if (filters.userId) params.append('userId', filters.userId);
      return request(`/eod/report?${params.toString()}`);
    },
    submissionStatus: (date?: string): Promise<EodSubmissionGate> => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const qs = params.toString();
      return request(`/eod/submission-status${qs ? `?${qs}` : ''}`);
    },
    enable: (userId: string, date: string, note?: string): Promise<EodEnablement> =>
      request('/eod/enable', { method: 'POST', body: JSON.stringify({ userId, date, note }) }),
    disable: (userId: string, date: string): Promise<{ message: string }> =>
      request('/eod/disable', { method: 'POST', body: JSON.stringify({ userId, date }) }),
  },

  seed: {
    reset: (): Promise<{ message: string }> =>
      request('/seed/reset', {
        method: 'POST',
      }),
  },
};
