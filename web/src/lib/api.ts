import axios, { AxiosError, type AxiosInstance } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30_000,
});

let isRefreshing = false;
let pendingResolvers: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/signup')
    ) {
      original._retry = true;
      if (isRefreshing) {
        await new Promise<void>((resolve) => {
          pendingResolvers.push(() => resolve());
        });
        return api(original);
      }
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        pendingResolvers.forEach((r) => r(null));
        pendingResolvers = [];
        return api(original);
      } catch (refreshErr) {
        pendingResolvers.forEach((r) => r(null));
        pendingResolvers = [];
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }
    throw error;
  },
);

export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
}

export function getApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as Partial<ApiError>;
    return {
      error: data.error ?? err.message,
      code: data.code ?? 'UNKNOWN',
      statusCode: data.statusCode ?? err.response.status,
    };
  }
  if (err instanceof Error) {
    return { error: err.message, code: 'CLIENT_ERROR', statusCode: 0 };
  }
  return { error: 'Unexpected error', code: 'UNKNOWN', statusCode: 0 };
}
