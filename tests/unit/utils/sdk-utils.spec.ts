import { describe, expect, it } from "vitest";
import * as zMini from "zod/mini";
import type { JsonValue } from "../../../lib/public_api.js";
import type { PagedFetchQuery } from "../../../lib/sdk/sdk-models.js";
import { isPagingQuery, parseResponse } from "../../../lib/sdk/sdk-utils.js";

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

describe("parseResponse", () => {
	it("Should accept a zod/mini schema and succeed for a matching payload", async () => {
		const result = await parseResponse({
			url: new URL("https://example.com"),
			payload: { name: "test" },
			schema: zMini.object({ name: zMini.string() }),
		});

		expect(result).toBeUndefined();
	});

	it("Should accept a zod/mini schema and report a failure for a mismatching payload", async () => {
		const result = await parseResponse({
			url: new URL("https://example.com"),
			payload: { name: "test" },
			schema: zMini.object({ name: zMini.string().check(zMini.minLength(50)) }),
		});

		expect(result?.success).toBe(false);
	});
});
