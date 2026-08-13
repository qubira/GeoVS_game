import { NETWORK } from "../config";

export interface Account {
  id: string;
  email: string;
  username: string;
  age: number;
  role: "player" | "developer" | "moderator" | "admin";
  blocked: boolean;
  createdAt: string;
}

const TOKEN_KEY = "geovs_auth_token_v1";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(`${NETWORK.SERVER_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}

export function register(input: { email: string; username: string; password: string; age: number }) {
  return request<{ ok: boolean; token?: string; user?: Account; error?: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { username: string; password: string }) {
  return request<{ ok: boolean; token?: string; user?: Account; error?: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchMe(token: string) {
  return request<{ ok: boolean; user?: Account; error?: string }>("/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateProfile(
  token: string,
  input: Partial<{ email: string; username: string; age: number; password: string }>
) {
  return request<{ ok: boolean; user?: Account; error?: string }>("/auth/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}
