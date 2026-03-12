import { describe, expect, it } from "vitest";
import z from "zod";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import { createPagedFetchQuery, KontentSdkError } from "../../../lib/public_api.js";
import { createFetchQuery } from "../../../lib/sdk/queries/fetch-sdk-query.js";
import type { FetchQuery, PagedFetchQuery } from "../../../lib/sdk/sdk-models.js";
import { getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

type QueryTest = {
	readonly name: string;
	readonly getQueries: () => {
		readonly unsafeQueries: readonly QueryCallback[];
		readonly safeQueries: readonly QueryCallback[];
	};
};

type QueryCallback = {
	readonly callback: () => Promise<void>;
	readonly title: keyof FetchQuery<unknown, unknown> | keyof PagedFetchQuery<unknown, unknown>;
};

const baseQueryConfig: Parameters<typeof createFetchQuery>[0] = {
	zodSchema: z.null(),
	request: {
		url: "https://domain.com",
	},
	config: {
		httpService: getDefaultHttpService({
			adapter: {
				executeRequest: () => {
					throw new Error("Test error");
				},
			},
		}),
		responseValidation: {
			enable: false,
		},
	},
	sdkInfo: getTestSdkInfo(),
	mapMetadata: () => ({}),
};

const unsafeQueries: readonly QueryTest[] = [
	{
		name: "FetchQuery",
		getQueries: () => {
			const baseQuery = createFetchQuery(baseQueryConfig);

			return {
				unsafeQueries: [
					{
						callback: async () => {
							await baseQuery.fetch();
						},
						title: "fetch",
					},
				],
				safeQueries: [
					{
						callback: async () => {
							await baseQuery.fetchSafe();
						},
						title: "fetchSafe",
					},
				],
			};
		},
	},
	{
		name: "PagedFetchQuery",
		getQueries: () => {
			const baseQuery = createPagedFetchQuery({
				...baseQueryConfig,
				getNextPageData: () => {
					return {};
				},
			});

			return {
				unsafeQueries: [
					{
						callback: async () => {
							await baseQuery.fetchPage();
						},
						title: "fetchPage",
					},
					{
						callback: async () => {
							await baseQuery.fetchAllPages();
						},
						title: "fetchAllPages",
					},
					{
						callback: async () => {
							for await (const _page of baseQuery.pages()) {
							}
						},
						title: "pages",
					},
				],
				safeQueries: [
					{
						callback: async () => {
							await baseQuery.fetchPageSafe();
						},
						title: "fetchPage",
					},
					{
						callback: async () => {
							await baseQuery.fetchAllPagesSafe();
						},
						title: "fetchAllPages",
					},
					{
						callback: async () => {
							for await (const _page of baseQuery.pagesSafe()) {
							}
						},
						title: "pages",
					},
				],
			};
		},
	},
];

for (const unsafeQuery of unsafeQueries) {
	describe(`Safety testing for ${unsafeQuery.name} query`, () => {
		const { unsafeQueries, safeQueries } = unsafeQuery.getQueries();
		for (const unsafeQueryCallback of unsafeQueries) {
			it(`Default '${unsafeQueryCallback.title}' query should throw an error`, async () => {
				await expect(unsafeQueryCallback.callback()).rejects.toThrowError(KontentSdkError);
			});
		}
		for (const safeQueryCallback of safeQueries) {
			it(`Safe '${safeQueryCallback.title}' query should not throw an error`, async () => {
				await expect(safeQueryCallback.callback()).resolves.not.toThrowError(KontentSdkError);
			});
		}
	});
}
