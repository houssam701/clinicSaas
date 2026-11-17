import { cookies } from "next/headers";
import { apiUrl } from "./api";

/**
 * Server-side client for this app's own API routes.
 *
 * Use these from Server Components and Server Actions only. Every request
 * forwards the caller's cookies, so the route's auth() sees the same session
 * and the API stays the single place where access is checked.
 */

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Low-level call: forwards cookies and disables caching.
 * Throws on network failure, like fetch.
 */
export async function serverApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      ...init?.headers,
      cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });
}

/**
 * Sends a request to an internal API route, with an optional JSON body.
 * Returns null instead of throwing when the network fails, so callers can
 * map every outcome (null, 2xx, 4xx, 5xx) in one place.
 *
 * @example
 *   const res = await sendApiJson(API_PATHS.users.list(), "POST", { email, password });
 *   if (!res) return { error: "Network error — please try again." };
 */
export async function sendApiJson(
  path: string,
  method: ApiMethod,
  body?: unknown
): Promise<Response | null> {
  try {
    return await serverApiFetch(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch {
    return null;
  }
}
