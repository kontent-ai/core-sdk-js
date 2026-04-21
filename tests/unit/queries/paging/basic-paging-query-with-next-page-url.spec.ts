import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { type GetNextPageData, getDefaultHttpService } from "../../../../lib/public_api.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import {
	getNextPageUrl,
	getTestSdkInfo,
	mockGlobalFetchJsonResponse,
	preventInfinitePaging,
} from "../../../../lib/testkit/testkit.utils.js";

describe("Basic paging query with next page url", async () => {
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

	const { success, responses } = await createPagedFetchQuery({
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
		url: expectedResponseUrls?.[0] ?? "n/a",
		mapError: (error) => error,
	}).fetchAllPagesSafe({ maxPagesCount: maxPagesCount });

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
