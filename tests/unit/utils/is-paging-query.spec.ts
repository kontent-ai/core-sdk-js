import { describe, expect, it } from "vitest";
import z from "zod";
import type { PagingQuery, Query } from "../../../lib/sdk/sdk-models.js";
import { isPagingQuery } from "../../../lib/sdk/sdk-utils.js";

describe("isPagingQuery", () => {
	it("returns true for object with paging query shape", () => {
		const pagingQueryLike: PagingQuery<unknown, unknown> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
			},
			toPromise: () => {
				return {} as never;
			},
			toAllPromise: () => {
				return {} as never;
			},
			pages: () => {
				return {} as never;
			},
		};

		expect(isPagingQuery(pagingQueryLike)).toBe(true);
	});

	it("returns false when only toPromise is present", () => {
		const queryLike: Query<unknown, unknown> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
			},
			toPromise: () => {
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
		const missingPages: Omit<PagingQuery<unknown, unknown>, "pages"> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
			},
			toPromise: () => {
				return {} as never;
			},
			toAllPromise: () => {
				return {} as never;
			},
		};

		const missingToAllPromise: Omit<PagingQuery<unknown, unknown>, "toAllPromise"> = {
			schema: z.null(),
			toUrl: () => {
				return "x";
			},
			toPromise: () => {
				return {} as never;
			},
			pages: () => {
				return {} as never;
			},
		};

		expect(isPagingQuery(missingPages)).toBe(false);
		expect(isPagingQuery(missingToAllPromise)).toBe(false);
	});
});
