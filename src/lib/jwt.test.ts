import { describe, expect, it } from "vitest";
import { signAuthToken, verifyAuthToken } from "./jwt.js";

describe("jwt utilities", () => {
  it("signs and verifies access tokens", async () => {
    const token = await signAuthToken(
      {
        sub: "user-1",
        role: "customer",
        type: "access",
      },
      "5m",
    );

    await expect(verifyAuthToken(token, "access")).resolves.toEqual({
      sub: "user-1",
      role: "customer",
      type: "access",
    });
  });

  it("rejects a token when the expected token type is different", async () => {
    const token = await signAuthToken(
      {
        sub: "user-1",
        role: "customer",
        type: "refresh",
      },
      "5m",
    );

    await expect(verifyAuthToken(token, "access")).rejects.toMatchObject({
      code: 401,
      message: "Invalid token payload",
    });
  });
});
