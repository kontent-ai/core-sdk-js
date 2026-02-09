import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { getDefaultHttpService } from "../../../lib/public_api.js";
import { getPagingQuery } from "../../../lib/sdk/sdk-queries.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";

describe("Basic paging query with continuation token", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const requestContinuationToken = "fake-request-continuation-token";
	const responseStatusCode = 200;
	const nextPagesCount: number = 5;
	const expectedResponsesCount: number = nextPagesCount + 1;
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

	const { success, error, responses, lastContinuationToken } = await getPagingQuery({
		authorizationApiKey: undefined,
		pagination: {
			getNextPageData: () => {
				if (responseIndex < nextPagesCount) {
					responseIndex++;
					// mock next response
					mockResponseByIndex(responseIndex);
					return {
						continuationToken: requestContinuationToken,
					};
				}
				return {};
			},
		},
		extraMetadata: () => ({}),
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

	it("Last continuation token should be taken from the last response", () => {
		expect(lastContinuationToken).toEqual(getResponseContinuationToken(nextPagesCount));
	});
});
