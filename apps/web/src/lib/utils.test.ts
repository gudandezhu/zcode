import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles falsy values", () => {
    expect(cn("foo", false, null, undefined, "")).toBe("foo");
  });

  it("handles tailwind merge conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles arrays and objects", () => {
    const result = cn(["foo", "bar"], { baz: true, qux: false });
    expect(result).toBe("foo bar baz");
  });
});
