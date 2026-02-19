import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { getDefaultHttpService, type QueryResponse } from "../../../lib/public_api.js";
import { createPagingQuery } from "../../../lib/sdk/paging-sdk-query.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";

describe("Async pages iterator", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const getNextPageUrl = (index: number) => {
		return `https://page-url.com/${index}`;
	};

	const initialRequestUrl = getNextPageUrl(0);
	const nextPagesCount: number = 5;
	let responseIndex: number = 0;
	const expectedResponsesCount: number = nextPagesCount + 1;

	const expectedResponseUrls: readonly string[] = Array.from({ length: expectedResponsesCount }, (_, index) => getNextPageUrl(index));

	// mock initial response
	mockGlobalFetchJsonResponse({
		jsonResponse: null,
		statusCode: 200,
	});

	const pagesIterator = createPagingQuery<null, null>({
		authorizationApiKey: undefined,
		getNextPageData: () => {
			if (responseIndex < nextPagesCount) {
				responseIndex++;
				return {
					nextPageUrl: getNextPageUrl(responseIndex),
				};
			}
			return {};
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
			url: initialRequestUrl,
			method: "GET",
			body: null,
		},
	}).pages();

	const responses: QueryResponse<null>[] = [];

	for await (const page of pagesIterator) {
		responses.push(page);
	}

	it("All responses should be successful", () => {
		expect(responses.every((response) => response)).toBeTruthy();
	});

	it(`Responses should be an array of length "${expectedResponsesCount}"`, () => {
		expect(responses).toHaveLength(expectedResponsesCount);
	});

	it("Response urls should be correct & in the expected order", () => {
		expect(responses?.map((response) => response.meta.url)).toEqual(expectedResponseUrls);
	});
});
