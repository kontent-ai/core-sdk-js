import { defineConfig } from "vitest/config";

export default defineConfig({
	root: ".",
	test: {
		dir: "tests/integration",
		globals: true,
		environment: "node",
		coverage: { provider: "v8", thresholds: { lines: 90, functions: 90, branches: 85 } },
	},
	build: {
		target: "esnext",
	},
});
