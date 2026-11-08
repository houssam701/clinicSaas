/**
 * One-time marker set when a user signs in: the first page shows the welcome
 * animation and removes it, so a refresh or a new tab never replays it. It
 * expires by itself in case that page never loads.
 */
export const WELCOME_COOKIE = "just_signed_in";
export const WELCOME_COOKIE_MAX_AGE_SECONDS = 60;
