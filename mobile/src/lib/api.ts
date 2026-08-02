import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://used.pm.sa/api';

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string[]>) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('auth_token');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message ?? 'تعذر إتمام الطلب، حاول مرة أخرى.', response.status, data.errors);
  }
  return data as T;
}

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'حدث خطأ غير متوقع.';
