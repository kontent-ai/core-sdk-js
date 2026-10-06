import { defineConfig } from "vitest/config";

export default defineConfig({
	root: ".",
	test: {
		dir: "tests/integration",
		globals: true,
		environment: "node",
    coverage: { provider: "v8" },
		clearMocks: false,
	},
	build: {
		target: "esnext",
	},
});
