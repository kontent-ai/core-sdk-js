import { kontentOxlintConfig } from "@kontent-ai/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
	extends: [kontentOxlintConfig],
	overrides: [
		{
			// The public schemas entry re-exports schema modules by design, consumers opt in by importing "@kontent-ai/core-sdk/schema"
			files: ["lib/schema_api.ts"],
			rules: { "kontent/no-static-schema-import": "off" },
		},
	],
});
