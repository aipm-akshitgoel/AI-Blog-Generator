/** Shared Clerk paths — keep OAuth callbacks on the app domain, not accounts.dev. */

export const CLERK_SIGN_IN_URL = "/sign-in";
export const CLERK_SIGN_UP_URL = "/sign-up";
/** OAuth returns here (on your domain), then Clerk sends users to the dashboard. */
export const CLERK_SIGN_IN_SSO_CALLBACK = `${CLERK_SIGN_IN_URL}/sso-callback`;
export const CLERK_SIGN_UP_SSO_CALLBACK = `${CLERK_SIGN_UP_URL}/sso-callback`;

export function isClerkOAuthCallbackPath(pathname: string): boolean {
  return pathname.includes("/sso-callback");
}

/** Default landing page after sign-in / sign-up (existing users should not hit /setup). */
export const CLERK_AFTER_AUTH_URL = "/dashboard";

/** Prebuilt SignIn/SignUp: path routing so Google OAuth uses /sign-in/sso-callback, not Account Portal. */
export const clerkEmbeddedSignInProps = {
  routing: "path" as const,
  path: CLERK_SIGN_IN_URL,
  signUpUrl: CLERK_SIGN_UP_URL,
  forceRedirectUrl: CLERK_AFTER_AUTH_URL,
  fallbackRedirectUrl: CLERK_AFTER_AUTH_URL,
};

export const clerkEmbeddedSignUpProps = {
  routing: "path" as const,
  path: CLERK_SIGN_UP_URL,
  signInUrl: CLERK_SIGN_IN_URL,
  forceRedirectUrl: CLERK_AFTER_AUTH_URL,
  fallbackRedirectUrl: CLERK_AFTER_AUTH_URL,
};
/** Dedicated sign-out route runs `signOut()` then lands on home with `signed_out=1`. */
export const CLERK_SIGN_OUT_URL = "/sign-out";
/** Query flag so home does not immediately redirect back to /dashboard while cookies clear. */
export const CLERK_SIGNED_OUT_HOME_URL = "/?signed_out=1";
export const CLERK_AFTER_SIGN_OUT_URL = CLERK_SIGN_OUT_URL;
