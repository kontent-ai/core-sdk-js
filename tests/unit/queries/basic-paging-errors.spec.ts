import { afterAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { type ErrorReason, type GetNextPageData, KontentSdkError } from "../../../lib/public_api.js";
import { createPagingQuery } from "../../../lib/sdk/paging-sdk-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo, mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import { getNextPageUrl } from "../../test.utils.js";

describe("Basic paging errors", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const throwErrorAtResponseIndex: number = 3;
	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const expectedResponseUrls: readonly string[] = Array.from({ length: maxPagesCount }, (_, index) => getNextPageUrl(index));

	// mock initial response
	mockGlobalFetchJsonResponse({
		jsonResponse: null,
		statusCode: 200,
	});

	const { success, error, responses, partialResponses } = await createPagingQuery({
		authorizationApiKey: undefined,
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
			httpService: getTestHttpServiceWithJsonResponse({
				statusCode: 200,
				jsonResponse: async () => {
					if (responseIndex === throwErrorAtResponseIndex) {
						throw new Error("Paging query error");
					}

					return await Promise.resolve(null);
				},
			}),
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		zodSchema: z.null(),
		request: {
			url: expectedResponseUrls?.[0] ?? "n/a",
			method: "GET",
			body: {},
		},
	}).toAllPromise();

	it("Error should be defined", () => {
		expect(error).toBeDefined();
		expect(error).toBeInstanceOf(KontentSdkError);
		expect(error?.details.reason).toBe<ErrorReason>("unknown");
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Responses should be undefined", () => {
		expect(responses).toBeUndefined();
	});

	it(`Expected partial responses to be set instead of responses and include partial responses`, () => {
		expect(partialResponses).toBeDefined();
		expect(partialResponses).toHaveLength(throwErrorAtResponseIndex);
	});
});
