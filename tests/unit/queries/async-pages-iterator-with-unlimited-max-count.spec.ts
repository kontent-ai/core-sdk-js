import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { type GetNextPageData, getDefaultHttpService, type QueryResponse } from "../../../lib/public_api.js";
import { createPagingQuery } from "../../../lib/sdk/paging-sdk-query.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import { getNextPageUrl, preventInfinitePaging } from "../../test.utils.js";

describe("Async pages iterator with unlimited max count", async () => {
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

	const pagesIterator = createPagingQuery<null, null>({
		authorizationApiKey: undefined,
		getNextPageData: () => {
			responseIndex++;

			const data: ReturnType<GetNextPageData<null, null>> = preventInfinitePaging({
				responseIndex,
				maxPagesCount,
				nextPageUrl: getNextPageUrl(responseIndex),
			});

			return data;
		},

		mapMetadata: () => ({}),
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
			method: "GET",
			body: null,
		},
	}).pages();

	const responses: QueryResponse<null>[] = [];

	for await (const page of pagesIterator) {
		responses.push(page);

		if (responses.length === maxPagesCount) {
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
