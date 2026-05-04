import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import type { GetNextPageData } from "../../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { extractContinuationToken } from "../../../../lib/public_api.js";
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

	const { success, responses, lastContinuationToken } = await createPagedFetchQuery({
		getNextPageData: () => {
			responseIndex++;

			const data: ReturnType<GetNextPageData<null, unknown, unknown>> = preventInfinitePaging({
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
		url: "https://domain.com",
		mapError: (error) => error,
		mapExtraResponseProps: (response) => ({
			continuationToken: extractContinuationToken(response?.adapterResponse.responseHeaders ?? []),
		}),
		mapPagingExtraResponseProps: (responses) => ({
			lastContinuationToken: extractContinuationToken(responses.at(-1)?.meta.responseHeaders ?? []),
		}),
	}).fetchAllPagesSafe({ maxPagesCount: maxPagesCount });

	it("Success should be true", () => {
		expect(success).toBeTruthy();
	});

	it(`Last continuation token should be set`, () => {
		expect(lastContinuationToken).toBe(getResponseContinuationToken(maxPagesCount - 1));
	});

	it(`Responses should be an array of length "${maxPagesCount}"`, () => {
		expect(responses).toHaveLength(maxPagesCount);
	});

	it(`Responses should have correct continuation tokens`, () => {
		for (let index = 0; index < (responses ?? []).length; index++) {
			expect(responses?.[index]?.continuationToken).toBe(getResponseContinuationToken(index));
		}
	});
});
