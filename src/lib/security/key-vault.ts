import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getKeyEncryptionSecret } from "@/lib/env.server";

interface EncryptedSecret {
  encryptedKey: string;
  encryptionNonce: string;
}

function encryptionKey() {
  return createHash("sha256").update(getKeyEncryptionSecret()).digest();
}

export function fingerprintSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

export function encryptSecret(secret: string): EncryptedSecret {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: `${ciphertext.toString("base64")}.${authTag.toString("base64")}`,
    encryptionNonce: nonce.toString("base64"),
  };
}

export function decryptSecret(input: EncryptedSecret) {
  const [ciphertext, authTag] = input.encryptedKey.split(".");

  if (!ciphertext || !authTag) {
    throw new Error("Encrypted key payload is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(input.encryptionNonce, "base64"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function publicKeyVaultEntry<T extends { encrypted_key?: string; encryption_nonce?: string }>(
  entry: T,
) {
  const safeEntry = { ...entry };
  delete safeEntry.encrypted_key;
  delete safeEntry.encryption_nonce;

  return safeEntry;
}
