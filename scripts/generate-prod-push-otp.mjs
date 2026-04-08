import crypto from "node:crypto";

const PROD_PUSH_OTP_TTL_MS = 10 * 60 * 1000;
const passwordEnvKeys = ["PROD_PUSH_PASSWORD", "FAQ_PROD_PUSH_PASSWORD", "PUBLISH_PASSWORD"];
const otpSecretEnvKeys = ["PROD_PUSH_OTP_SECRET", "FAQ_PROD_PUSH_OTP_SECRET"];

function firstConfiguredEnv(keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

const fixedPassword = firstConfiguredEnv(passwordEnvKeys);
const otpSecret = firstConfiguredEnv(otpSecretEnvKeys) ?? fixedPassword;

if (!fixedPassword) {
  console.error("Missing prod push password. Set PROD_PUSH_PASSWORD before generating an OTP.");
  process.exit(1);
}

if (!otpSecret) {
  console.error("Missing prod push OTP secret. Set PROD_PUSH_OTP_SECRET or PROD_PUSH_PASSWORD.");
  process.exit(1);
}

const issuedAtMs = Date.now();
const expiresAt = new Date(issuedAtMs + PROD_PUSH_OTP_TTL_MS).toISOString();
const nonce = crypto.randomBytes(4).toString("hex");
const signature = crypto
  .createHmac("sha256", otpSecret)
  .update(`${issuedAtMs}.${nonce}`)
  .digest("hex")
  .slice(0, 16);
const otp = `pp.${issuedAtMs.toString(36)}.${nonce}.${signature}`;

console.log(JSON.stringify({ otp, expiresAt, validForMinutes: 10 }, null, 2));
