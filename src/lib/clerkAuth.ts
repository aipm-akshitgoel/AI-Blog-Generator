/** Shared Clerk paths — keep OAuth callbacks on the app domain, not accounts.dev. */

export const CLERK_SIGN_IN_URL = "/sign-in";
export const CLERK_SIGN_UP_URL = "/sign-up";

export function isClerkOAuthCallbackPath(pathname: string): boolean {
  return pathname.includes("/sso-callback");
}
/** Default landing page after sign-in / sign-up (existing users should not hit /setup). */
export const CLERK_AFTER_AUTH_URL = "/dashboard";
/** Dedicated sign-out route runs `signOut()` then lands on home with `signed_out=1`. */
export const CLERK_SIGN_OUT_URL = "/sign-out";
/** Query flag so home does not immediately redirect back to /dashboard while cookies clear. */
export const CLERK_SIGNED_OUT_HOME_URL = "/?signed_out=1";
export const CLERK_AFTER_SIGN_OUT_URL = CLERK_SIGN_OUT_URL;
