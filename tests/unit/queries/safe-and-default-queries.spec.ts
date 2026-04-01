import { describe, expect, it } from "vitest";
import z from "zod";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import { createPagedFetchQuery, KontentSdkError } from "../../../lib/public_api.js";
import { createFetchQuery } from "../../../lib/sdk/queries/fetch-sdk-query.js";
import { createMutationQuery } from "../../../lib/sdk/queries/mutation-sdk-query.js";
import type { FetchQuery, MutationQuery, PagedFetchQuery } from "../../../lib/sdk/sdk-models.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

type QueryTest = {
	readonly name: string;
	readonly getQueries: () => {
		readonly unsafeQueries: readonly QueryCallback[];
		readonly succeedingUnsafeQueries: readonly QueryCallback[];
		readonly safeQueries: readonly QueryCallback[];
		readonly succeedingSafeQueries: readonly QueryCallback[];
	};
};

type QueryCallback = {
	readonly callback: () => Promise<void>;
	readonly title:
		| keyof FetchQuery<unknown, unknown, unknown>
		| keyof PagedFetchQuery<unknown, unknown, unknown>
		| keyof MutationQuery<unknown, unknown, unknown>;
};

const successfulBaseQueryConfig: Parameters<typeof createFetchQuery>[0] = {
	zodSchema: z.null(),
	request: {
		url: "https://domain.com",
	},
	config: {
		httpService: getTestHttpServiceWithJsonResponse({
			statusCode: 200,
			jsonResponse: null,
		}),
		responseValidation: {
			enable: false,
		},
	},
	sdkInfo: getTestSdkInfo(),
	mapMetadata: () => ({}),
	mapError: (error) => error,
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
	mapError: (error) => error,
};

const unsafeQueries: readonly QueryTest[] = [
	{
		name: "MutationQuery",
		getQueries: () => {
			const baseQuery = createMutationQuery({
				...baseQueryConfig,
				method: "POST",
				request: {
					url: "https://domain.com",
					body: null,
				},
			});

			const succeedingBaseQuery = createMutationQuery({
				...successfulBaseQueryConfig,
				method: "POST",
				request: {
					url: "https://domain.com",
					body: null,
				},
			});

			return {
				unsafeQueries: [
					{
						callback: async () => {
							await baseQuery.execute();
						},
						title: "execute",
					},
				],
				succeedingUnsafeQueries: [
					{
						callback: async () => {
							await succeedingBaseQuery.execute();
						},
						title: "execute",
					},
				],
				safeQueries: [
					{
						callback: async () => {
							await baseQuery.executeSafe();
						},
						title: "execute",
					},
				],
				succeedingSafeQueries: [
					{
						callback: async () => {
							await succeedingBaseQuery.executeSafe();
						},
						title: "executeSafe",
					},
				],
			};
		},
	},
	{
		name: "FetchQuery",
		getQueries: () => {
			const baseQuery = createFetchQuery(baseQueryConfig);
			const succeedingBaseQuery = createFetchQuery(successfulBaseQueryConfig);

			return {
				unsafeQueries: [
					{
						callback: async () => {
							await baseQuery.fetch();
						},
						title: "fetch",
					},
				],
				succeedingUnsafeQueries: [
					{
						callback: async () => {
							await succeedingBaseQuery.fetch();
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
				succeedingSafeQueries: [
					{
						callback: async () => {
							await succeedingBaseQuery.fetchSafe();
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

			const succeedingBaseQuery = createPagedFetchQuery({
				...successfulBaseQueryConfig,
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
				succeedingUnsafeQueries: [
					{
						callback: async () => {
							await succeedingBaseQuery.fetchPage();
						},
						title: "fetchPage",
					},
					{
						callback: async () => {
							await succeedingBaseQuery.fetchAllPages();
						},
						title: "fetchAllPages",
					},
					{
						callback: async () => {
							for await (const _page of succeedingBaseQuery.pages()) {
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
				succeedingSafeQueries: [
					{
						callback: async () => {
							await succeedingBaseQuery.fetchPageSafe();
						},
						title: "fetchPageSafe",
					},
					{
						callback: async () => {
							await succeedingBaseQuery.fetchAllPagesSafe();
						},
						title: "fetchAllPagesSafe",
					},
					{
						callback: async () => {
							for await (const _page of succeedingBaseQuery.pagesSafe()) {
							}
						},
						title: "pagesSafe",
					},
				],
			};
		},
	},
];

for (const unsafeQuery of unsafeQueries) {
	describe(`Safety testing for ${unsafeQuery.name} query`, () => {
		const { unsafeQueries, succeedingUnsafeQueries, safeQueries, succeedingSafeQueries } = unsafeQuery.getQueries();
		for (const unsafeQueryCallback of unsafeQueries) {
			it(`Default '${unsafeQueryCallback.title}' query should throw an error`, async () => {
				await expect(unsafeQueryCallback.callback()).rejects.toThrow(KontentSdkError);
			});
		}
		for (const succeedingUnsafeQueryCallback of succeedingUnsafeQueries) {
			it(`Default '${succeedingUnsafeQueryCallback.title}' query should not throw when successful`, async () => {
				await expect(succeedingUnsafeQueryCallback.callback()).resolves.not.toThrow();
			});
		}
		for (const safeQueryCallback of safeQueries) {
			it(`Safe '${safeQueryCallback.title}' query should not throw an error`, async () => {
				await expect(safeQueryCallback.callback()).resolves.not.toThrow(KontentSdkError);
			});
		}
		for (const succeedingSafeQueryCallback of succeedingSafeQueries) {
			it(`Safe '${succeedingSafeQueryCallback.title}' query should not throw when successful`, async () => {
				await expect(succeedingSafeQueryCallback.callback()).resolves.not.toThrow();
			});
		}
	});
}
