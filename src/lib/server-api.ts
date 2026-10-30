import { cookies } from "next/headers";
import { apiUrl } from "./api";

/**
 * Calls an internal API route from a Server Component or Server Action,
 * forwarding the caller's cookies so the route's auth() sees the same session.
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
