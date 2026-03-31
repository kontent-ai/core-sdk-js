import { defineConfig } from "vitest/config";

export default defineConfig({
	root: ".",
	test: {
		dir: "tests/unit",
		globals: true,
		environment: "node",
		coverage: { provider: "v8" },
	},
	build: {
		target: "esnext",
	},
});
