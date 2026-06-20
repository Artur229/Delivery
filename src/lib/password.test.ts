import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password utilities", () => {
  it("hashes passwords and verifies matching input", async () => {
    const passwordHash = await hashPassword("correct-password");

    expect(passwordHash).not.toBe("correct-password");
    await expect(verifyPassword("correct-password", passwordHash)).resolves.toBe(
      true,
    );
  });

  it("rejects non-matching passwords", async () => {
    const passwordHash = await hashPassword("correct-password");

    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(
      false,
    );
  });
});
