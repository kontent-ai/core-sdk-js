import { defineConfig } from "vitest/config";

export default defineConfig({
	root: ".",
	test: {
		dir: "tests",
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			thresholds: { lines: 100, functions: 100, branches: 100 },
			exclude: ["**/testkit/**", "**/devkit/**", "**/tests/**"],
		},
	},
	build: {
		target: "esnext",
	},
});
