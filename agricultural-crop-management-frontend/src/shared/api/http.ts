/// <reference types="vite/client" />
// Shared HTTP Client with Axios Interceptors and JWT Handling
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const httpClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

const AUTH_STORAGE_KEY = 'acm_auth';
const LANGUAGE_STORAGE_KEY = 'acm_language';

type StoredAuth = {
    token: string;
    refreshToken: string;
    expiresAt: number;
    user?: {
        id?: number;
        username: string;
        role: string;
        email?: string;
    };
};

type AuthStorageLocation = 'local' | 'session';

type StoredAuthWithLocation = {
    auth: StoredAuth;
    location: AuthStorageLocation;
};

function isStoredAuth(value: unknown): value is StoredAuth {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<StoredAuth>;
    return typeof candidate.token === 'string'
        && candidate.token.length > 0
        && typeof candidate.refreshToken === 'string'
        && candidate.refreshToken.length > 0
        && typeof candidate.expiresAt === 'number'
        && Number.isFinite(candidate.expiresAt)
        && Boolean(candidate.user)
        && typeof candidate.user?.username === 'string'
        && typeof candidate.user?.role === 'string';
}

/**
 * Get stored auth data from either localStorage or sessionStorage.
 * This matches the storage behavior in useSignIn hook:
 * - localStorage is used when "Keep me logged in" is checked
 * - sessionStorage is used otherwise
 */
function getStoredAuthWithLocation(): StoredAuthWithLocation | null {
    if (typeof window === 'undefined') return null;

    const candidates: Array<[AuthStorageLocation, Storage]> = [
        ['local', window.localStorage],
        ['session', window.sessionStorage],
    ];

    for (const [location, storage] of candidates) {
        const raw = storage.getItem(AUTH_STORAGE_KEY);
        if (!raw) continue;
        try {
            const parsed: unknown = JSON.parse(raw);
            if (isStoredAuth(parsed)) {
                return { auth: parsed, location };
            }
        } catch {
            // Invalid records are removed below so they cannot shadow valid auth.
        }
        storage.removeItem(AUTH_STORAGE_KEY);
    }

    return null;
}

function getStoredAuth(): StoredAuth | null {
    return getStoredAuthWithLocation()?.auth ?? null;
}

function setStoredAuth(data: StoredAuth, location: AuthStorageLocation) {
    if (typeof window === 'undefined') return;
    const target = location === 'local' ? window.localStorage : window.sessionStorage;
    const stale = location === 'local' ? window.sessionStorage : window.localStorage;
    target.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    stale.removeItem(AUTH_STORAGE_KEY);
}

function clearStoredAuth() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function resolveRequestLanguage(): string {
    if (typeof window === 'undefined') {
        return 'en-US';
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
        || window.document?.documentElement?.lang
        || 'en';
    const normalized = storedLanguage.trim().toLowerCase();
    if (normalized.startsWith('vi')) {
        return 'vi-VN';
    }
    if (normalized.startsWith('en')) {
        return 'en-US';
    }
    return normalized;
}


// Add request interceptor for JWT token
httpClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const stored = getStoredAuth();

        if (stored?.token && !config.headers['Authorization']) {
            // Attach Authorization header if not already set
            config.headers['Authorization'] = `Bearer ${stored.token}`;
        }

        if (!config.headers['Accept-Language']) {
            config.headers['Accept-Language'] = resolveRequestLanguage();
        }

        return config;

    },
    (error) => Promise.reject(error)
);

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise;
    }

    const storedWithLocation = getStoredAuthWithLocation();
    if (!storedWithLocation) return null;
    const { auth: stored, location } = storedWithLocation;

    refreshPromise = (async () => {
        try {
            const response = await httpClient.post('/api/v1/auth/refresh', {
                token: stored.refreshToken,
            });

            const result = (response.data as {
                result?: { token?: unknown; expiresIn?: unknown };
            } | undefined)?.result;
            if (
                typeof result?.token !== 'string'
                || result.token.length === 0
                || typeof result.expiresIn !== 'number'
                || !Number.isFinite(result.expiresIn)
                || result.expiresIn <= 0
            ) {
                return null;
            }

            const updated: StoredAuth = {
                token: result.token,
                refreshToken: result.token,
                expiresAt: Date.now() + result.expiresIn * 1000,
                user: stored.user,
            };

            setStoredAuth(updated, location);

            return result.token;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                clearStoredAuth();
            }
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// Add response interceptor for error handling
httpClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

        const status = error.response?.status;
        const errorCode = (error.response?.data as { code?: string })?.code;

        // Handle USER_LOCKED error - account has been locked by admin
        if (status === 403 && errorCode === 'USER_LOCKED') {
            console.warn('[Auth] Account locked by administrator');
            
            // Dispatch custom event for UI to show modal
            // Modal will handle auth clearing and redirect after user clicks OK
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('account-locked', {
                    detail: {
                        message: (error.response?.data as { message?: string })?.message ||
                            'Tài khoản của bạn đã bị khóa do vi phạm chính sách hệ thống.'
                    }
                }));
            }
            
            return Promise.reject(error);
        }

        if (
            originalRequest &&
            status === 401 &&
            !originalRequest._retry &&
            originalRequest.url !== '/api/v1/auth/refresh' &&
            typeof window !== 'undefined'
        ) {
            originalRequest._retry = true;

            const newToken = await refreshAccessToken();

            if (newToken) {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return httpClient(originalRequest);
            }

            // If refresh failed and auth was cleared (due to 401), redirect to sign-in
            if (!getStoredAuth() && window.location.pathname !== '/sign-in') {
                window.location.href = '/sign-in';
            }
        }

        return Promise.reject(error);
    }
);

export default httpClient;
