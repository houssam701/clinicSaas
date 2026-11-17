/**
 * Shared base URL helper for all internal API and server-side fetch calls.
 *
 * - Production / preview:  NEXT_PUBLIC_APP_URL  (set in your env)
 * - Local dev:             http://localhost:<PORT>  (defaults to 3000)
 *
 * Usage:
 *   import { apiUrl } from "@/lib/api";
 *   fetch(apiUrl(API_PATHS.auth.login), { ... })   // paths come from src/config/path.ts
 */
export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`
  );
}

/**
 * Builds a full URL from a relative path.
 * @example apiUrl(API_PATHS.auth.login) => "http://localhost:3000/api/auth/login"
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${cleanPath}`;
}

/**
 * Helper to parse a "Set-Cookie" header string into arguments
 * compatible with Next.js cookieStore.set(name, value, options).
 */
export function parseSetCookie(header: string) {
  const [nv, ...directives] = header.split(";").map((s) => s.trim());
  const eq = nv.indexOf("=");
  const name = eq !== -1 ? nv.slice(0, eq) : nv;
  // Set-Cookie values arrive percent-encoded and cookieStore.set encodes again,
  // so decode here to avoid double-encoding (e.g. authjs.callback-url).
  const rawValue = eq !== -1 ? nv.slice(eq + 1) : "";
  let value = rawValue;
  try {
    value = decodeURIComponent(rawValue);
  } catch {
    // Not valid percent-encoding: keep the raw value.
  }

  const options: {
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
    sameSite?: "lax" | "strict" | "none";
    httpOnly?: boolean;
    secure?: boolean;
  } = {};

  for (const directive of directives) {
    const dEq = directive.indexOf("=");
    const key = (dEq !== -1 ? directive.slice(0, dEq) : directive).toLowerCase();
    const val = dEq !== -1 ? directive.slice(dEq + 1) : "";

    if (key === "path") options.path = val;
    else if (key === "domain") options.domain = val;
    else if (key === "max-age") options.maxAge = Number(val);
    else if (key === "expires") options.expires = new Date(val);
    else if (key === "samesite") {
      const s = val.toLowerCase();
      if (s === "lax" || s === "strict" || s === "none") {
        options.sameSite = s;
      }
    } else if (key === "httponly") options.httpOnly = true;
    else if (key === "secure") options.secure = true;
  }

  return { name, value, options };
}