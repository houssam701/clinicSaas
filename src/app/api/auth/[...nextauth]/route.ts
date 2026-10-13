import { handlers } from "../../../../lib/auth";

/**
 * NextAuth catch-all handler.
 *
 * Handles the following routes automatically:
 *   POST /api/auth/signin   → Credentials login (sets HttpOnly JWT cookie)
 *   POST /api/auth/signout  → Clears the JWT cookie
 *   GET  /api/auth/session  → Returns the current session
 *   GET  /api/auth/csrf     → CSRF token (used internally by NextAuth)
 */
export const { GET, POST } = handlers;
