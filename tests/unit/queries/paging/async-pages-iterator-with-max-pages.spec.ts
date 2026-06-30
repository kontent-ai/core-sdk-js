import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import type { JsonValue } from "../../../../lib/public_api.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import type { QueryResponse } from "../../../../lib/sdk/sdk-models.js";
import {
	getNextPageUrl,
	getTestSdkInfo,
	mockGlobalFetchJsonResponse,
	preventInfinitePaging,
} from "../../../../lib/testkit/testkit.utils.js";

describe("Async pages iterator with max pages count", async () => {
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

	const pagesIterator = createPagedFetchQuery({
		getNextPageData: () => {
			responseIndex++;

			return preventInfinitePaging({
				responseIndex,
				maxPagesCount,
				nextPageUrl: getNextPageUrl(responseIndex),
			});
		},

		mapMetadata: () => null,
		config: {
			httpService: getDefaultHttpService(),
			runtimeValidation: {
				validateResponses: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		schema: undefined,
		url: expectedResponseUrls?.[0] ?? "n/a",
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		mapPagingExtraResponseProps: () => ({}),
	}).pagesSafe({ maxPagesCount });

	const responses: QueryResponse<JsonValue>[] = [];

	for await (const { success, response } of pagesIterator) {
		if (success) {
			responses.push(response);
		} else {
			break;
		}
	}

	it(`Responses should be an array of length "${maxPagesCount}"`, () => {
		expect(responses).toHaveLength(maxPagesCount);
	});

	it("Response urls should be correct & in the expected order", () => {
		expect(responses.map((response) => response.meta.url)).toEqual(expectedResponseUrls);
	});
});
