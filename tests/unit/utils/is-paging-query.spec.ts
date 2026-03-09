import { describe, expect, it } from "vitest";
import z from "zod";
import type { FetchQuery, PagedFetchQuery } from "../../../lib/sdk/sdk-models.js";
import { isPagingQuery } from "../../../lib/sdk/sdk-utils.js";

describe("isPagingQuery", () => {
	it("returns true for object with paging query shape", () => {
		const pagingQueryLike: PagedFetchQuery<unknown, unknown> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
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
		};

		expect(isPagingQuery(pagingQueryLike)).toBe(true);
	});

	it("returns false when only toPromise is present", () => {
		const queryLike: FetchQuery<unknown, unknown> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
			},
			fetch: () => {
				return {} as never;
			},
		};

		expect(isPagingQuery(queryLike)).toBe(false);
	});

	it("returns false for plain object without query methods", () => {
		// @ts-expect-error - notQuery is not a Query or PagingQuery, but we want to verify runtime behavior
		expect(isPagingQuery({ foo: "bar" })).toBe(false);
	});

	it("returns false when one of paging methods is missing", () => {
		const missingPagesQuery: Omit<PagedFetchQuery<unknown, unknown>, "pages"> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
			},
			fetchPage: () => {
				return {} as never;
			},
			fetchAllPages: () => {
				return {} as never;
			},
		};

		const missingFetchAllPagesQuery: Omit<PagedFetchQuery<unknown, unknown>, "fetchAllPages"> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
			},
			fetchPage: () => {
				return {} as never;
			},
			pages: () => {
				return {} as never;
			},
		};

		expect(isPagingQuery(missingPagesQuery)).toBe(false);
		expect(isPagingQuery(missingFetchAllPagesQuery)).toBe(false);
	});
});
