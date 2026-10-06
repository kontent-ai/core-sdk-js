export default {
	meta: { name: "kontent" },
	rules: {
		"no-named-zod-import": {
			create: (context) => ({
				"ImportDeclaration[source.value=/^zod(\\/mini)?$/] > ImportSpecifier[imported.name='z']": (node) =>
					context.report({
						node,
						message:
							'Use `import * as z from "zod"` instead. The named `{ z }` import defeats esbuild\'s namespace tree-shaking and pulls ~280 kB of zod locales into consumer bundles.',
					}),
			}),
		},
	},
};
