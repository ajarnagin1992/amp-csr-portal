import { csrUserSchema, loginSchema, type CsrUserDto, type LoginDto } from '@amp-csr/shared';

import { apiUrl } from './apiUrl.js';

export class LoginError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Login failed: ${status}`);
    this.name = 'LoginError';
    this.status = status;
  }
}

// These use plain `fetch`, not `apiFetch`: a 401 here is an expected answer
// ("not signed in", "wrong password"), not a session that just ended.

/** The signed-in CSR, or undefined when there is no valid session. */
export async function getCurrentCsr(): Promise<CsrUserDto | undefined> {
  const response = await fetch(apiUrl('/auth/me'));
  if (response.status === 401) return undefined;
  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  const body: unknown = await response.json();
  return csrUserSchema.parse(body);
}

export async function login(data: LoginDto): Promise<CsrUserDto> {
  const response = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginSchema.parse(data)),
  });
  if (!response.ok) {
    throw new LoginError(response.status);
  }

  const body: unknown = await response.json();
  return csrUserSchema.parse(body);
}

export async function logout(): Promise<void> {
  const response = await fetch(apiUrl('/auth/logout'), { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to sign out: ${response.status}`);
  }
}
