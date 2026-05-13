import kontentAiConfig from "@kontent-ai/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig(
	// Global ignores must be in their own config entry; otherwise they only apply
	// to files matched by `files` in the same entry.
	{
		ignores: ["**/dist/**"],
	},
	{
		extends: [kontentAiConfig],
		files: ["lib/**/*.ts", "tests/**/*.ts", "scripts/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "zod",
							message: "Import from 'zod/mini' instead to keep the SDK tree-shakeable.",
						},
					],
				},
			],
			"no-restricted-syntax": [
				"error",
				{
					selector: "ImportDeclaration[source.value='zod/mini'] > ImportSpecifier[imported.name='z']",
					message:
						'Use `import * as z from "zod/mini"` instead. The named `{ z }` import defeats esbuild\'s namespace tree-shaking and pulls ~280 kB of zod locales into consumer bundles.',
				},
			],
		},
	},
);
