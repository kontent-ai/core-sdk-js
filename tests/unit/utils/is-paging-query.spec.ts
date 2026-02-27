import { describe, expect, it } from "vitest";
import type { PagingQuery, Query } from "../../../lib/sdk/sdk-models.js";
import { isPagingQuery } from "../../../lib/sdk/sdk-utils.js";

describe("isPagingQuery", () => {
	it("returns true for object with paging query shape", () => {
		const pagingQueryLike: PagingQuery<unknown, unknown> = {
			toUrl: () => {
				return "x";
			},
			toPromise: async () => {
				return await Promise.resolve({} as never);
			},
			toAllPromise: async () => {
				return await Promise.resolve({} as never);
			},
			pages: () => {
				return (async function* () {})();
			},
		};

		expect(isPagingQuery(pagingQueryLike)).toBe(true);
	});

	it("returns false when only toPromise is present", () => {
		const queryLike: Query<unknown, unknown> = {
			toUrl: () => {
				return "x";
			},
			toPromise: async () => {
				return await Promise.resolve({} as never);
			},
		};

		expect(isPagingQuery(queryLike)).toBe(false);
	});

	it("returns false for plain object without query methods", () => {
		// @ts-expect-error - notQuery is not a Query or PagingQuery, but we want to verify runtime behavior
		expect(isPagingQuery({ foo: "bar" })).toBe(false);
	});

	it("returns false when one of paging methods is missing", () => {
		const missingPages = {
			toUrl: () => {
				return "x";
			},
			toPromise: async () => {
				return await Promise.resolve({} as never);
			},
			toAllPromise: async () => {
				return await Promise.resolve({} as never);
			},
		} as unknown as PagingQuery<unknown, unknown>;

		const missingToAllPromise = {
			toUrl: () => {
				return "x";
			},
			toPromise: async () => {
				return await Promise.resolve({} as never);
			},
			pages: () => {
				return (async function* () {
					// no-op
				})();
			},
		} as unknown as PagingQuery<unknown, unknown>;

		expect(isPagingQuery(missingPages)).toBe(false);
		expect(isPagingQuery(missingToAllPromise)).toBe(false);
	});
});
