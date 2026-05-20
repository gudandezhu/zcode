import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/api.ts",
        "src/lib/event-stream.ts",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
      ],
    },
  },
});
