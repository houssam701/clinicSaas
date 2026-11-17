/**
 * Limits on repeated failures. After `max` failures within `windowMinutes`,
 * the action is refused until `windowMinutes` after the last failure.
 * Counted per account (email or user), so it works across servers; limits
 * per IP address belong at the edge (host firewall / WAF) when deployed.
 */
export interface AttemptLimit {
  max: number;
  windowMinutes: number;
}

/** Wrong passwords on the sign-in form, per email (known or not). */
export const LOGIN_LIMIT: AttemptLimit = { max: 5, windowMinutes: 15 };

/** Wrong "current password" when changing it, per user. */
export const PASSWORD_CHANGE_LIMIT: AttemptLimit = { max: 5, windowMinutes: 15 };

/**
 * "Forgot password" requests per email (every request counts, not only
 * failures): stops anyone flooding a person's inbox with reset emails.
 */
export const RESET_REQUEST_LIMIT: AttemptLimit = { max: 3, windowMinutes: 15 };

/** How long a reset link works. */
export const RESET_LINK_MINUTES = 30;

/** Failed attempts are kept this long, then pruned. */
export const ATTEMPT_RETENTION_HOURS = 24;

export const attemptKeys = {
  login: (email: string) => `login:${email.trim().toLowerCase()}`,
  passwordChange: (userId: string) => `password:${userId}`,
  resetRequest: (email: string) => `reset:${email.trim().toLowerCase()}`,
};
