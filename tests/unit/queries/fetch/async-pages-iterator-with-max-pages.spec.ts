import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { type GetNextPageData, getDefaultHttpService, type QueryResponse } from "../../../../lib/public_api.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../../lib/testkit/testkit.utils.js";
import { getNextPageUrl, preventInfinitePaging } from "../../../test.utils.js";

describe("Async pages iterator with max pages count", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const expectedResponseUrls: readonly string[] = Array.from({ length: maxPagesCount }, (_, index) => getNextPageUrl(index));

	// mock initial response
	mockGlobalFetchJsonResponse({
		jsonResponse: null,
		statusCode: 200,
	});

	const pagesIterator = createPagedFetchQuery<null, null>({
		getNextPageData: () => {
			responseIndex++;

			const data: ReturnType<GetNextPageData<null, null>> = preventInfinitePaging({
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
		request: {
			url: expectedResponseUrls?.[0] ?? "n/a",
		},
	}).pagesSafe({ maxPagesCount });

	const responses: QueryResponse<null>[] = [];

	for await (const { success, response } of pagesIterator) {
		if (success) {
			responses.push(response);
		} else {
			break;
		}
	}

	it("All responses should be successful", () => {
		expect(responses.every((response) => response)).toBeTruthy();
	});

	it(`Responses should be an array of length "${maxPagesCount}"`, () => {
		expect(responses).toHaveLength(maxPagesCount);
	});

	it("Response urls should be correct & in the expected order", () => {
		expect(responses?.map((response) => response.meta.url)).toEqual(expectedResponseUrls);
	});
});
