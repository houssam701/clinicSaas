import { cookies } from "next/headers";
import { parseSetCookie } from "@/lib/api";

/**
 * Copies the Set-Cookie headers of an internal API response (e.g. the new
 * session cookie from POST /api/auth/login) onto the browser's response.
 * Server Actions only: the API answered our server, not the browser.
 */
export async function forwardSetCookies(response: Response): Promise<void> {
  const cookieStore = await cookies();
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie")!]
        : [];

  for (const cookieHeader of setCookies) {
    if (!cookieHeader) continue;
    const { name, value, options } = parseSetCookie(cookieHeader);
    if (name) cookieStore.set(name, value, options);
  }
}
