import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import * as FileSystem from 'expo-file-system/legacy';
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

export async function uploadListingImage(
  listingId: number,
  fileUri: string,
  mimeType?: string | null,
): Promise<void> {
  const token = await SecureStore.getItemAsync('auth_token');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await FileSystem.uploadAsync(
    `${API_URL}/listings/${listingId}/images`,
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'images[]',
      headers,
      ...(mimeType ? { mimeType } : {}),
    },
  );

  let data: { message?: string; errors?: Record<string, string[]> } = {};
  try {
    data = JSON.parse(response.body);
  } catch {
    // Some successful upload responses do not contain JSON.
  }

  if (response.status < 200 || response.status >= 300) {
    throw new ApiError(
      data.message ?? 'تعذر رفع الصورة، حاول مرة أخرى.',
      response.status,
      data.errors,
    );
  }
}

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'حدث خطأ غير متوقع.';
