import kontentAiConfig from "@kontent-ai/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig(
	// Global ignores must be in their own config entry; otherwise they only apply
	// to files matched by `files` in the same entry.
	{
		ignores: ["**/dist/**", "**/coverage/**"],
	},
	{
		extends: [kontentAiConfig],
		files: ["lib/**/*.ts", "tests/**/*.ts", "scripts/**/*.ts"],
	},
);
