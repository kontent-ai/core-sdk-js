import { describe, expect, it } from "vitest";
import z from "zod";
import type { JsonValue } from "../../../lib/public_api.js";
import type { PagedFetchQuery } from "../../../lib/sdk/sdk-models.js";
import { isPagingQuery } from "../../../lib/sdk/sdk-utils.js";

describe("isPagingQuery", () => {
	it("Should return true for object with paging query shape", () => {
		const pagingQueryLike: PagedFetchQuery<JsonValue, unknown, unknown> = {
			schema: z.null(),
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
		const missingPagesQuery: Omit<PagedFetchQuery<JsonValue, unknown, unknown>, "pages"> = {
			schema: z.null(),
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

		const missingFetchAllPagesQuery: Omit<PagedFetchQuery<JsonValue, unknown, unknown>, "fetchAllPages"> = {
			schema: z.null(),
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
