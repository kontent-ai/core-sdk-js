import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { OxlintConfig } from "oxlint";

const pluginFileBaseName = "kontent.oxlint-plugin";

/**
 * Resolves the plugin next to this module, keeping this module's extension so it works
 * both from source (`.ts`, via Node type stripping) and from compiled output (`.js`).
 */
const resolvePluginPath = (): string => fileURLToPath(new URL(`./${pluginFileBaseName}${extname(import.meta.url)}`, import.meta.url));

/**
 * Shared oxlint configuration for Kontent.ai SDKs.
 *
 * Use in `oxlint.config.ts`: `export default defineConfig({ extends: [kontentOxlintConfig] })`
 */
export const kontentOxlintConfig = {
	plugins: ["typescript"],
	jsPlugins: [resolvePluginPath()],
	categories: {
		correctness: "off",
	},
	ignorePatterns: ["dist/**"],
	rules: {
		"no-duplicate-imports": "error",
		"no-promise-executor-return": "error",
		"no-unexpected-multiline": "error",
		"no-unreachable-loop": "error",
		"no-useless-backreference": "error",

		"no-loop-func": "error",
		"typescript/no-redundant-type-constituents": "error",
		"typescript/no-unnecessary-boolean-literal-compare": "error",
		"typescript/no-unnecessary-qualifier": "error",
		"typescript/prefer-includes": "error",
		"typescript/prefer-return-this-type": "error",
		"typescript/prefer-string-starts-ends-with": "error",
		"typescript/await-thenable": "error",
		"typescript/no-unsafe-argument": "error",
		"typescript/no-unsafe-assignment": "error",
		"typescript/no-unsafe-call": "error",
		"typescript/no-unsafe-member-access": "error",
		"typescript/no-unsafe-return": "error",
		"typescript/prefer-nullish-coalescing": "error",
		"typescript/restrict-plus-operands": "error",
		"typescript/restrict-template-expressions": "error",
		"typescript/unbound-method": "error",
		"typescript/no-duplicate-enum-values": "error",
		"typescript/no-unnecessary-type-assertion": "error",
		"typescript/promise-function-async": "error",
		"typescript/no-mixed-enums": "error",
		"typescript/no-unsafe-enum-comparison": "error",

		"kontent/no-named-zod-import": "error",
	},
} as const satisfies OxlintConfig;
