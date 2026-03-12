import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { type GetNextPageData, getDefaultHttpService } from "../../../lib/public_api.js";
import { createPagedFetchQuery } from "../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import { getNextPageUrl } from "../../test.utils.js";

describe("Basic paging query with unlimited max count", async () => {
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

	const { success, error, responses } = await createPagedFetchQuery({
		getNextPageData: () => {
			responseIndex++;

			// stop paging after maxPagesCount responses
			if (responseIndex === maxPagesCount) {
				return {};
			}

			const data: ReturnType<GetNextPageData<null, null>> = {
				nextPageUrl: getNextPageUrl(responseIndex),
			};

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
		},
	}).fetchAllPagesSafe();

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Success should be true", () => {
		expect(success).toBeTruthy();
	});

	it(`Responses should be an array of length "${maxPagesCount}"`, () => {
		expect(responses).toHaveLength(maxPagesCount);
	});

	it("Response urls should be correct & in the expected order", () => {
		expect(responses?.map((response) => response.meta.url)).toEqual(expectedResponseUrls);
	});
});
