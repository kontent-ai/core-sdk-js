import { defineConfig } from "vitest/config";

export default defineConfig({
	root: ".",
	test: {
		dir: "tests",
		globals: true,
		environment: "node",
		coverage: { provider: "v8", thresholds: { lines: 90, functions: 90, branches: 90 }, exclude: ["**/testkit/**", "**/devkit/**", "vitest-integration.config.ts"] },
	},
	build: {
		target: "esnext",
	},
});
