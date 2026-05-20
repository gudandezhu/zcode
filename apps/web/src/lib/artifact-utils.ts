export function extractMarkdownText(artifact: unknown): string {
  if (typeof artifact === "string") return artifact;
  if (artifact && typeof artifact === "object") {
    const obj = artifact as Record<string, unknown>;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.body === "string") return obj.body;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.data === "string") return obj.data;
  }
  return JSON.stringify(artifact, null, 2);
}
