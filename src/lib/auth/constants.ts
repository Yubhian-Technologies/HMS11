export const SESSION_COOKIE_NAME = "hms_session";

/**
 * Firebase session cookies max out at 14 days; kept shorter here so a lost
 * device doesn't stay signed in indefinitely (docs/07-user-roles.md §7.3
 * relies on this expiring rather than only on explicit revocation).
 */
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5;
