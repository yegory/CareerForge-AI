import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  fingerprintSecret,
  publicKeyVaultEntry,
} from "../key-vault";

describe("key vault crypto", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts and decrypts provider keys without storing plaintext", () => {
    vi.stubEnv(
      "KEY_ENCRYPTION_SECRET",
      "test-secret-with-at-least-thirty-two-characters",
    );

    const apiKey = "sk-test-provider-secret";
    const encrypted = encryptSecret(apiKey);

    expect(encrypted.encryptedKey).not.toContain(apiKey);
    expect(encrypted.encryptionNonce).not.toContain(apiKey);
    expect(decryptSecret(encrypted)).toBe(apiKey);
    expect(fingerprintSecret(apiKey)).toHaveLength(16);
  });

  it("removes encrypted fields from public entries", () => {
    const publicEntry = publicKeyVaultEntry({
      id: "entry-1",
      provider: "gemini",
      encrypted_key: "ciphertext",
      encryption_nonce: "nonce",
    });

    expect(publicEntry).toEqual({
      id: "entry-1",
      provider: "gemini",
    });
  });
});
