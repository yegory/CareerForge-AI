import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getKeyEncryptionSecret,
  getMissingServerEnvNames,
} from "../env.server";

describe("server env validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a missing key encryption secret", () => {
    vi.stubEnv("KEY_ENCRYPTION_SECRET", "");

    expect(() => getKeyEncryptionSecret()).toThrow(
      "KEY_ENCRYPTION_SECRET is required.",
    );
    expect(getMissingServerEnvNames()).toContain("KEY_ENCRYPTION_SECRET");
  });

  it("rejects a short key encryption secret", () => {
    vi.stubEnv("KEY_ENCRYPTION_SECRET", "short");

    expect(() => getKeyEncryptionSecret()).toThrow(
      "KEY_ENCRYPTION_SECRET must be at least 32 characters.",
    );
  });
});
