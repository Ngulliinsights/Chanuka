/**
 * Storage Helpers for Auth
 */

export function getStorageToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setStorageToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function removeStorageToken(): void {
  localStorage.removeItem('auth_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function setRefreshToken(token: string): void {
  localStorage.setItem('refresh_token', token);
}

export function removeRefreshToken(): void {
  localStorage.removeItem('refresh_token');
}

export function clearAuthStorage(): void {
  removeStorageToken();
  removeRefreshToken();
}

// Aliases for compatibility with index exports
export function storeSecurely(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function retrieveSecurely(key: string): string | null {
  return localStorage.getItem(key);
}

export function getCurrentSession(): any {
  const token = getStorageToken();
  return token ? { token } : null;
}

export function isAuthenticated(): boolean {
  return !!getStorageToken();
}

export function getAuthToken(): string | null {
  return getStorageToken();
}
