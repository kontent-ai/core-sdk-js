import { describe, expect, it } from "vitest";
import kontentOxlintPlugin, { type ImportLikeNode } from "../../../lib/devkit/oxlint/kontent.oxlint-plugin.js";

const noStaticSchemaImportRule = kontentOxlintPlugin.rules["no-static-schema-import" satisfies keyof typeof kontentOxlintPlugin.rules];
const schemaSourceSelectorPart = String.raw`[source.value=/\.schemas?\.js$/]`;

const collectReportedNodes = (node: ImportLikeNode): readonly unknown[] => {
	const reported: unknown[] = [];
	const handlers = noStaticSchemaImportRule.create({
		report: (descriptor) => {
			reported.push(descriptor.node);
		},
	});

	Object.values(handlers).forEach((handler) => {
		handler(node);
	});
	return reported;
};

describe("kontent/no-static-schema-import - selectors", () => {
	const handlers = noStaticSchemaImportRule.create({ report: () => undefined });

	it("Should match imports and re-exports of both *.schema.js and *.schemas.js modules", () => {
		expect(Object.keys(handlers)).toStrictEqual([
			`ImportDeclaration${schemaSourceSelectorPart}`,
			`ExportNamedDeclaration${schemaSourceSelectorPart}`,
			`ExportAllDeclaration${schemaSourceSelectorPart}`,
		]);
	});
});

describe("kontent/no-static-schema-import - value imports and re-exports", () => {
	it.each<{ readonly name: string; readonly node: ImportLikeNode }>([
		{ name: "value import", node: { importKind: "value", specifiers: [{ importKind: "value" }] } },
		{ name: "named re-export", node: { exportKind: "value" } },
		{ name: "export all", node: {} },
		{
			name: "import mixing type and value specifiers",
			node: { importKind: "value", specifiers: [{ importKind: "type" }, { importKind: "value" }] },
		},
	])("Should report a $name", ({ node }) => {
		expect(collectReportedNodes(node).length).toBeGreaterThan(0);
	});
});

describe("kontent/no-static-schema-import - type-only imports and re-exports", () => {
	it.each<{ readonly name: string; readonly node: ImportLikeNode }>([
		{ name: "import type", node: { importKind: "type", specifiers: [{ importKind: "value" }] } },
		{ name: "export type", node: { exportKind: "type" } },
		{
			name: "import with only type specifiers",
			node: { importKind: "value", specifiers: [{ importKind: "type" }, { importKind: "type" }] },
		},
	])("Should not report an $name", ({ node }) => {
		expect(collectReportedNodes(node)).toStrictEqual([]);
	});
});
