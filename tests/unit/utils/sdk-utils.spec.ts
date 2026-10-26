import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as z from "@zod/mini";
import { describe, expect, it, vi } from "vitest";
import type { JsonValue } from "../../../lib/main/main_api.js";
import type { ErrorReason } from "../../../lib/main/models/error.models.js";
import type { PagedFetchQuery } from "../../../lib/main/sdk/sdk-models.js";
import { isPagingQuery, validatePayloads } from "../../../lib/main/sdk/sdk-utils.js";

describe("isPagingQuery", () => {
	it("Should return true for object with paging query shape", () => {
		const pagingQueryLike: PagedFetchQuery<JsonValue> = {
			inspect: () => {
				return {} as never;
			},
			fetchPageSafe: () => {
				return {} as never;
			},
			fetchPage: () => {
				return {} as never;
			},
			fetchAllPages: () => {
				return {} as never;
			},
			pages: () => {
				return {} as never;
			},
			fetchAllPagesSafe: () => {
				return {} as never;
			},
			pagesSafe: () => {
				return {} as never;
			},
		};

		expect(isPagingQuery(pagingQueryLike)).toBe(true);
	});

	it("Should return false for plain object without query methods", () => {
		// @ts-expect-error - notQuery is not a Query or PagingQuery, but we want to verify runtime behavior
		expect(isPagingQuery({ foo: "bar" })).toBe(false);
	});

	it("Should return false when one of paging methods is missing", () => {
		const missingPagesQuery: Omit<PagedFetchQuery<JsonValue>, "pages"> = {
			inspect: () => {
				return {} as never;
			},
			fetchPageSafe: () => {
				return {} as never;
			},
			fetchAllPagesSafe: () => {
				return {} as never;
			},
			fetchPage: () => {
				return {} as never;
			},
			fetchAllPages: () => {
				return {} as never;
			},
			pagesSafe: () => {
				return {} as never;
			},
		};

		const missingFetchAllPagesQuery: Omit<PagedFetchQuery<JsonValue>, "fetchAllPages"> = {
			inspect: () => {
				return {} as never;
			},
			fetchPageSafe: () => {
				return {} as never;
			},
			pagesSafe: () => {
				return {} as never;
			},
			pages: () => {
				return {} as never;
			},
			fetchAllPagesSafe: () => {
				return {} as never;
			},
			fetchPage: () => {
				return {} as never;
			},
		};

		expect(isPagingQuery(missingPagesQuery)).toBe(false);
		expect(isPagingQuery(missingFetchAllPagesQuery)).toBe(false);
	});
});

describe("validatePayloads", () => {
	// names shorter than 5 characters are type-correct but fail the schema at runtime
	const nameSchema = z.readonly(z.object({ name: z.string().check(z.minLength(5)) }));
	const validPayload = { url: new URL("https://example.com/0"), payload: { name: "valid" } };
	const invalidPayloadA = { url: new URL("https://example.com/1"), payload: { name: "a" } };
	const invalidPayloadB = { url: new URL("https://example.com/2"), payload: { name: "b" } };

	it.each([{ runtimeValidation: undefined }, { runtimeValidation: { validateResponses: false } }])(
		"Should skip validation without resolving the schema when validation is disabled ($runtimeValidation)",
		async ({ runtimeValidation }) => {
			const schemaFactory = vi.fn(async () => await Promise.resolve(nameSchema));

			const result = await validatePayloads({ runtimeValidation, schema: schemaFactory, payloads: [invalidPayloadA] });

			expect(result).toBeUndefined();
			expect(schemaFactory).not.toHaveBeenCalled();
		},
	);

	it("Should skip validation when no schema is provided", async () => {
		const result = await validatePayloads({
			runtimeValidation: { validateResponses: true },
			schema: undefined,
			payloads: [invalidPayloadA],
		});

		expect(result).toBeUndefined();
	});

	it("Should return undefined when all payloads match the schema", async () => {
		const result = await validatePayloads({
			runtimeValidation: { validateResponses: true },
			schema: nameSchema,
			payloads: [validPayload],
		});

		expect(result).toBeUndefined();
	});

	it("Should return the error of the first mismatching payload in input order", async () => {
		const result = await validatePayloads({
			runtimeValidation: { validateResponses: true },
			schema: nameSchema,
			payloads: [validPayload, invalidPayloadA, invalidPayloadB],
		});

		expect(result?.details.reason).toBe("schemaMismatch" satisfies ErrorReason);
		expect(result?.url).toStrictEqual(invalidPayloadA.url.toString());
	});

	it("Should validate with any Standard Schema implementation and expose its issues", async () => {
		const issue: StandardSchemaV1.Issue = { message: "Name is too short", path: ["name"] };
		const handWrittenSchema: StandardSchemaV1<unknown, { readonly name: string }> = {
			"~standard": {
				version: 1,
				vendor: "test",
				validate: (value) =>
					typeof value === "object" && value !== null && "name" in value && value.name === "valid"
						? { value: { name: value.name } }
						: { issues: [issue] },
			},
		};

		const result = await validatePayloads({
			runtimeValidation: { validateResponses: true },
			schema: handWrittenSchema,
			payloads: [validPayload, invalidPayloadA],
		});

		expect(result?.details.reason).toBe("schemaMismatch" satisfies ErrorReason);
		expect(result?.details.reason === "schemaMismatch" && result.details.issues).toStrictEqual([issue]);
	});
});
