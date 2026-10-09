type OxlintRuleContext = {
	readonly report: (descriptor: { readonly node: unknown; readonly message: string }) => void;
};

type OxlintRule = {
	readonly create: (context: OxlintRuleContext) => Readonly<Record<string, (node: unknown) => void>>;
};

type OxlintPlugin = {
	readonly meta: { readonly name: string };
	readonly rules: Readonly<Record<string, OxlintRule>>;
};

const kontentOxlintPluginName = "kontent";
const noNamedZodImportRuleName = "no-named-zod-import";

const noNamedZodImportSelector = "ImportDeclaration[source.value=/^zod(\\/mini)?$/] > ImportSpecifier[imported.name='z']";
const noNamedZodImportMessage =
	'Use `import * as z from "zod"` instead. The named `{ z }` import defeats esbuild\'s namespace tree-shaking and pulls ~280 kB of zod locales into consumer bundles.';

const noNamedZodImportRule: OxlintRule = {
	create: (context) => ({
		[noNamedZodImportSelector]: (node) => context.report({ node, message: noNamedZodImportMessage }),
	}),
};

const kontentOxlintPlugin: OxlintPlugin = {
	meta: { name: kontentOxlintPluginName },
	rules: {
		[noNamedZodImportRuleName]: noNamedZodImportRule,
	},
};

export default kontentOxlintPlugin;
