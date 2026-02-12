import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { getDefaultHttpService } from "../../../lib/public_api.js";
import { createPagingQuery } from "../../../lib/sdk/sdk-queries.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";

describe("Basic paging query with page limit", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const getNextPageUrl = (index: number) => {
		return `https://page-url.com/${index}`;
	};

	const initialRequestUrl = getNextPageUrl(0);
	const nextPagesCount: number = 5;
	const pageLimit: number = 3;
	let responseIndex: number = 0;
	const expectedResponsesCount: number = pageLimit;

	const expectedResponseUrls: readonly string[] = Array.from({ length: expectedResponsesCount }, (_, index) => getNextPageUrl(index));

	// mock initial response
	mockGlobalFetchJsonResponse({
		jsonResponse: null,
		statusCode: 200,
	});

	const { success, error, responses } = await createPagingQuery({
		authorizationApiKey: undefined,
		pagination: {
			config: {
				maxPagesCount: pageLimit,
			},
			getNextPageData: () => {
				if (responseIndex < nextPagesCount) {
					responseIndex++;
					return {
						nextPageUrl: getNextPageUrl(responseIndex),
					};
				}
				return {};
			},
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
			body: {},
		},
	}).toAllPromise();

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Success should be true", () => {
		expect(success).toBeTruthy();
	});

	it(`Responses should be an array of length "${expectedResponsesCount}"`, () => {
		expect(responses).toHaveLength(expectedResponsesCount);
	});

	it("Response urls should be correct & in the expected order", () => {
		expect(responses?.map((response) => response.meta.url)).toEqual(expectedResponseUrls);
	});
});
