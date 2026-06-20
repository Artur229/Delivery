import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatValidationError } from "./validation.js";

describe("validation utilities", () => {
  it("formats field-specific body validation errors", () => {
    const result = z.object({ name: z.string().min(2) }).safeParse({
      name: "A",
    });

    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    expect(formatValidationError("json", result.error)).toBe(
      "Invalid body.name: Too small: expected string to have >=2 characters",
    );
  });

  it("formats root-level param validation errors", () => {
    const result = z.string().uuid().safeParse("not-a-uuid");

    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    expect(formatValidationError("param", result.error)).toBe(
      "Invalid params: Invalid UUID",
    );
  });
});
