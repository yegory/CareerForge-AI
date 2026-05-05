export function getKeyEncryptionSecret() {
  const secret = process.env.KEY_ENCRYPTION_SECRET?.trim();

  if (!secret) {
    throw new Error("KEY_ENCRYPTION_SECRET is required.");
  }

  if (secret.length < 32) {
    throw new Error("KEY_ENCRYPTION_SECRET must be at least 32 characters.");
  }

  return secret;
}

export function getMissingServerEnvNames() {
  const missing: string[] = [];

  if (!process.env.KEY_ENCRYPTION_SECRET?.trim()) {
    missing.push("KEY_ENCRYPTION_SECRET");
  }

  return missing;
}
