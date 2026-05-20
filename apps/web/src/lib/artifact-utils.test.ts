import { describe, it, expect } from "vitest";
import { extractMarkdownText } from "./artifact-utils";

describe("extractMarkdownText", () => {
  it("with string returns string", () => {
    expect(extractMarkdownText("hello")).toBe("hello");
  });

  it("with object containing content key returns content", () => {
    expect(extractMarkdownText({ content: "c" })).toBe("c");
  });

  it("with object containing body key returns body", () => {
    expect(extractMarkdownText({ body: "b" })).toBe("b");
  });

  it("with object containing text key returns text", () => {
    expect(extractMarkdownText({ text: "t" })).toBe("t");
  });

  it("with object containing data key returns data", () => {
    expect(extractMarkdownText({ data: "d" })).toBe("d");
  });

  it("with unknown object returns JSON.stringify", () => {
    expect(extractMarkdownText({ foo: 1 })).toBe(JSON.stringify({ foo: 1 }, null, 2));
  });

  it("with null returns JSON.stringify", () => {
    expect(extractMarkdownText(null)).toBe(JSON.stringify(null, null, 2));
  });

  it("priority: content > body > text > data", () => {
    const obj = { content: "c", body: "b", text: "t", data: "d" };
    expect(extractMarkdownText(obj)).toBe("c");

    const obj2 = { body: "b", text: "t", data: "d" };
    expect(extractMarkdownText(obj2)).toBe("b");

    const obj3 = { text: "t", data: "d" };
    expect(extractMarkdownText(obj3)).toBe("t");
  });
});
