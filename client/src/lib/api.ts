const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? 'Une erreur est survenue.', res.status);
  }
  return body as T;
}

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user?: AuthUser;
  guest?: { id: string; displayName: string };
}

export const authApi = {
  providers: () => request<{ providers: string[] }>('/auth/oauth/providers'),
  register: (username: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  guest: (displayName: string) =>
    request<AuthResponse>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),
};

export interface ProfileData {
  username: string;
  avatarUrl: string | null;
  stats: { races: number; wins: number; bestWpm: number; avgWpm: number; avgAccuracy: number };
  progression: { date: string; wpm: number }[];
}

export interface HistoryItem {
  raceId: string;
  startedAt: string;
  wpm: number;
  accuracy: number;
  rank: number;
  errors: number;
  language: string;
}

export interface HistoryPage {
  page: number;
  pageSize: number;
  total: number;
  items: HistoryItem[];
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export const profileApi = {
  profile: (token: string) => request<ProfileData>('/me/profile', { headers: bearer(token) }),
  history: (token: string, page: number, pageSize = 5) =>
    request<HistoryPage>(`/me/history?page=${page}&pageSize=${pageSize}`, { headers: bearer(token) }),
};
