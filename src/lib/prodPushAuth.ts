import crypto from "node:crypto";

const PROD_PUSH_PASSWORD_ENV_KEYS = [
  "PROD_PUSH_PASSWORD",
  "FAQ_PROD_PUSH_PASSWORD",
  "PUBLISH_PASSWORD",
] as const;

const PROD_PUSH_OTP_SECRET_ENV_KEYS = [
  "PROD_PUSH_OTP_SECRET",
  "FAQ_PROD_PUSH_OTP_SECRET",
] as const;

export const PROD_PUSH_OTP_TTL_MS = 10 * 60 * 1000;

type ProdPushAuthSuccess =
  | { ok: true; method: "fixed_password" }
  | { ok: true; method: "otp"; expiresAt: string };

type ProdPushAuthFailure = {
  ok: false;
  status: 400 | 401 | 500;
  error: string;
};

export type ProdPushAuthResult = ProdPushAuthSuccess | ProdPushAuthFailure;

function getFirstConfiguredEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function getFixedPassword(): string | null {
  return getFirstConfiguredEnv(PROD_PUSH_PASSWORD_ENV_KEYS);
}

function getOtpSecret(): string | null {
  return getFirstConfiguredEnv(PROD_PUSH_OTP_SECRET_ENV_KEYS) ?? getFixedPassword();
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signOtpPayload(issuedAtMs: number, nonce: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${issuedAtMs}.${nonce}`)
    .digest("hex")
    .slice(0, 16);
}

function buildOtpToken(issuedAtMs: number, nonce: string, secret: string): string {
  const signature = signOtpPayload(issuedAtMs, nonce, secret);
  return `pp.${issuedAtMs.toString(36)}.${nonce}.${signature}`;
}

function parseOtpToken(token: string): { issuedAtMs: number; nonce: string; signature: string } | null {
  const parts = token.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "pp") return null;

  const issuedAtMs = Number.parseInt(parts[1], 36);
  const nonce = parts[2];
  const signature = parts[3];

  if (!Number.isFinite(issuedAtMs) || issuedAtMs <= 0) return null;
  if (!/^[a-f0-9]{8}$/i.test(nonce)) return null;
  if (!/^[a-f0-9]{16}$/i.test(signature)) return null;

  return { issuedAtMs, nonce: nonce.toLowerCase(), signature: signature.toLowerCase() };
}

function validateOtpToken(token: string, nowMs = Date.now()): ProdPushAuthResult {
  const secret = getOtpSecret();
  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: "Prod push password is not configured on the server.",
    };
  }

  const parsed = parseOtpToken(token);
  if (!parsed) {
    return {
      ok: false,
      status: 401,
      error: "Invalid password or one-time password.",
    };
  }

  if (parsed.issuedAtMs > nowMs) {
    return {
      ok: false,
      status: 401,
      error: "Invalid password or one-time password.",
    };
  }

  const ageMs = nowMs - parsed.issuedAtMs;
  if (ageMs > PROD_PUSH_OTP_TTL_MS) {
    return {
      ok: false,
      status: 401,
      error: "This one-time password has expired. Generate a new one and try again.",
    };
  }

  const expectedSignature = signOtpPayload(parsed.issuedAtMs, parsed.nonce, secret);
  if (!safeEqual(expectedSignature, parsed.signature)) {
    return {
      ok: false,
      status: 401,
      error: "Invalid password or one-time password.",
    };
  }

  return {
    ok: true,
    method: "otp",
    expiresAt: new Date(parsed.issuedAtMs + PROD_PUSH_OTP_TTL_MS).toISOString(),
  };
}

export function generateProdPushOtp(nowMs = Date.now()): { otp: string; expiresAt: string } {
  const secret = getOtpSecret();
  if (!secret) {
    throw new Error("Prod push password is not configured on the server.");
  }

  const nonce = crypto.randomBytes(4).toString("hex");
  return {
    otp: buildOtpToken(nowMs, nonce, secret),
    expiresAt: new Date(nowMs + PROD_PUSH_OTP_TTL_MS).toISOString(),
  };
}

export function extractProdPushCredential(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const auth = record.auth && typeof record.auth === "object"
    ? (record.auth as Record<string, unknown>)
    : null;

  const candidates = [
    record.password,
    record.otp,
    record.credential,
    record.prodPushPassword,
    record.oneTimePassword,
    auth?.password,
    auth?.otp,
    auth?.credential,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function stripProdPushCredential<T>(body: T): T {
  if (!body || typeof body !== "object") return body;

  const nextBody = { ...(body as Record<string, unknown>) };
  delete nextBody.password;
  delete nextBody.otp;
  delete nextBody.credential;
  delete nextBody.prodPushPassword;
  delete nextBody.oneTimePassword;

  if (nextBody.auth && typeof nextBody.auth === "object") {
    const nextAuth = { ...(nextBody.auth as Record<string, unknown>) };
    delete nextAuth.password;
    delete nextAuth.otp;
    delete nextAuth.credential;

    if (Object.keys(nextAuth).length === 0) {
      delete nextBody.auth;
    } else {
      nextBody.auth = nextAuth;
    }
  }

  return nextBody as T;
}

export function validateProdPushCredential(candidate: string | null, nowMs = Date.now()): ProdPushAuthResult {
  const fixedPassword = getFixedPassword();
  if (!fixedPassword) {
    return {
      ok: false,
      status: 500,
      error: "Prod push password is not configured on the server.",
    };
  }

  if (!candidate) {
    return {
      ok: false,
      status: 400,
      error: "A prod push password or one-time password is required.",
    };
  }

  if (safeEqual(candidate, fixedPassword)) {
    return { ok: true, method: "fixed_password" };
  }

  return validateOtpToken(candidate, nowMs);
}
