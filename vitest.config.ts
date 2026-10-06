import { defineConfig } from "vitest/config";

export default defineConfig({
	root: ".",
	test: {
		dir: "tests",
		globals: true,
		environment: "node",
		clearMocks: false,
		unstubGlobals: true,
		coverage: {
			provider: "v8",
			reporter: ["text"],
			thresholds: { lines: 100, functions: 100, branches: 100 },
			exclude: ["**/testkit/**", "**/devkit/**", "**/tests/**"],
			include: ["lib/**"],
		},
	},
	build: {
		target: "esnext",
	},
});
