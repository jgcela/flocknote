/** Shared between the server (authorize) and the sign-in form. */
export const LOGIN_THROTTLED_PREFIX = "THROTTLED:";

export function loginErrorMessage(error: string) {
  if (error.startsWith(LOGIN_THROTTLED_PREFIX)) {
    const wait = error.slice(LOGIN_THROTTLED_PREFIX.length);
    return `Too many sign-in attempts. Please wait ${wait} and try again, or reset your password.`;
  }
  return "That email and password don't match our records. Please try again.";
}
