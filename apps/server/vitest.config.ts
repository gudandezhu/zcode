import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@zcode/shared": path.resolve(__dirname, "../../shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 80,
        statements: 95,
      },
      include: [
        "src/engine/session.ts",
        "src/engine/provider.ts",
        "src/services/events.ts",
        "src/services/pipeline.ts",
        "src/services/task.ts",
        "src/services/session.ts",
        "src/services/project.ts",
        "src/services/memory.ts",
        "src/services/discussion.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.test.ts",
      ],
    },
  },
});
