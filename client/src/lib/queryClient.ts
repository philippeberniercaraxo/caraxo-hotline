import { QueryClient } from "@tanstack/react-query";
import { getToken } from "./auth";

// Port-agnostic base URL (replaced at deploy time by deploy_website)
// In development (Vite), __PORT_5000__ is not defined → falls back to ""
export const API_BASE = (() => {
  try {
    // This will throw ReferenceError in dev — caught below
    const v = (globalThis as any).__PORT_5000__;
    if (v !== undefined) return v as string;
    return "";
  } catch {
    return "";
  }
})();

export async function apiRequest(method: string, path: string, body?: unknown): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Erreur serveur");
  }
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [path] = queryKey as string[];
        const res = await apiRequest("GET", path);
        return res.json();
      },
      retry: false,
      staleTime: 30_000,
    },
  },
});
