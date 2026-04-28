import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import type { GetNextPageData } from "../../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import type { KontentSdkError } from "../../../../lib/models/error.models.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import type { QueryResponse } from "../../../../lib/sdk/sdk-models.js";
import {
	getNextPageUrl,
	getTestSdkInfo,
	mockGlobalFetchJsonResponse,
	preventInfinitePaging,
} from "../../../../lib/testkit/testkit.utils.js";

describe("Async pages iterator with unlimited max count", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const expectedResponseUrls: readonly URL[] = Array.from({ length: maxPagesCount }, (_, index) => new URL(getNextPageUrl(index)));

	// mock initial response
	mockGlobalFetchJsonResponse({
		jsonResponse: null,
		statusCode: 200,
	});

	const pagesIterator = createPagedFetchQuery<null, unknown, unknown, unknown, KontentSdkError>({
		getNextPageData: () => {
			responseIndex++;

			const data: ReturnType<GetNextPageData<null, unknown, unknown>> = preventInfinitePaging({
				responseIndex,
				maxPagesCount,
				nextPageUrl: getNextPageUrl(responseIndex),
			});

			return data;
		},

		mapMetadata: () => null,
		config: {
			httpService: getDefaultHttpService(),
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		zodSchema: z.null(),
		url: expectedResponseUrls?.[0] ?? "n/a",
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		mapPagingExtraResponseProps: () => ({}),
	}).pagesSafe();

	const responses: QueryResponse<null, unknown, unknown>[] = [];

	for await (const { success, response } of pagesIterator) {
		if (success) {
			responses.push(response);
		} else {
			break;
		}

		if (responses.length === maxPagesCount) {
			break;
		}
	}

	it(`Responses should be an array of length "${maxPagesCount}"`, () => {
		expect(responses).toHaveLength(maxPagesCount);
	});

	it("Response urls should be correct & in the expected order", () => {
		expect(responses?.map((response) => response.meta.url)).toEqual(expectedResponseUrls);
	});
});

describe("Async pages iterator fetches all pages when maxPagesCount is set to 0", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const totalPages: number = 5;
	let responseIndex: number = 0;

	const expectedResponseUrls: readonly URL[] = Array.from({ length: totalPages }, (_, index) => new URL(getNextPageUrl(index)));

	mockGlobalFetchJsonResponse({
		jsonResponse: null,
		statusCode: 200,
	});

	const pagesIterator = createPagedFetchQuery<null, unknown, unknown, unknown, KontentSdkError>({
		getNextPageData: () => {
			responseIndex++;

			return preventInfinitePaging({
				responseIndex,
				maxPagesCount: totalPages,
				nextPageUrl: responseIndex < totalPages ? getNextPageUrl(responseIndex) : undefined,
			});
		},
		mapMetadata: () => null,
		config: {
			httpService: getDefaultHttpService(),
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		zodSchema: z.null(),
		url: expectedResponseUrls?.[0] ?? "n/a",
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		mapPagingExtraResponseProps: () => ({}),
	}).pagesSafe({ maxPagesCount: 0 });

	const responses: QueryResponse<null, unknown, unknown>[] = [];

	for await (const { success, response } of pagesIterator) {
		if (success) {
			responses.push(response);
		} else {
			break;
		}
	}

	it(`All "${totalPages}" pages should be fetched without hitting a page limit`, () => {
		expect(responses).toHaveLength(totalPages);
	});

	it("Response urls should be correct & in the expected order", () => {
		expect(responses?.map((response) => response.meta.url)).toEqual(expectedResponseUrls);
	});
});
