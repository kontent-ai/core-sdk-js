import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { type GetNextPageData, getDefaultHttpService } from "../../../../lib/public_api.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse, preventInfinitePaging } from "../../../../lib/testkit/testkit.utils.js";

describe("Basic paging query with continuation token", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const responseStatusCode = 200;
	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const getResponseContinuationToken = (index: number) => {
		return `responseContinuationToken-${index}`;
	};

	const mockResponseByIndex = (index: number) => {
		mockGlobalFetchJsonResponse({
			jsonResponse: null,
			statusCode: responseStatusCode,
			continuationToken: getResponseContinuationToken(index),
		});
	};

	// mock initial response
	mockResponseByIndex(0);

	const { success, error, responses, lastContinuationToken } = await createPagedFetchQuery({
		getNextPageData: () => {
			responseIndex++;

			const data: ReturnType<GetNextPageData<null, null>> = preventInfinitePaging({
				responseIndex,
				maxPagesCount,
				continuationToken: getResponseContinuationToken(responseIndex),
			});

			// mock next response
			mockResponseByIndex(responseIndex);

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
			url: "https://domain.com",
		},
		mapError: (error) => error,
	}).fetchAllPagesSafe({ maxPagesCount: maxPagesCount });

	it("Success should be true", () => {
		expect(success).toBeTruthy();
	});

	it(`Responses should be an array of length "${maxPagesCount}"`, () => {
		expect(responses).toHaveLength(maxPagesCount);
	});

	it("Last continuation token should be taken from the last response", () => {
		expect(lastContinuationToken).toEqual(getResponseContinuationToken(maxPagesCount - 1));
	});
});
