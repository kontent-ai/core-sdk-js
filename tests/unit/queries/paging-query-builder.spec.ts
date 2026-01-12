import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { getDefaultHttpService } from "../../../lib/public_api.js";
import { getPagingQuery } from "../../../lib/sdk/sdk-queries.js";
import { getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";

describe("Paging query builder", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const requestContinuationToken = "fake-request-continuation-token";
	const responseStatusCode = 200;
	const responsesCount: number = 5;
	const expectedResponsesCount: number = responsesCount + 1;
	let responseIndex: number = 0;

	const getResponseContinuationToken = (index: number) => {
		return `responseContinuationToken-${index}`;
	};

	const mockResponse = (index: number) => {
		mockGlobalFetchJsonResponse({
			jsonResponse: null,
			statusCode: responseStatusCode,
			continuationToken: getResponseContinuationToken(index),
		});
	};

	// mock initial response
	mockResponse(0);

	const { success, error, responses, lastContinuationToken } = await getPagingQuery({
		authorizationApiKey: undefined,
		continuationToken: requestContinuationToken,
		canFetchNextResponse: () => {
			if (responseIndex < responsesCount) {
				responseIndex++;
				// mock next response
				mockResponse(responseIndex);
				return true;
			}
			return false;
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
		expect(lastContinuationToken).toEqual(getResponseContinuationToken(responsesCount));
	});
});
