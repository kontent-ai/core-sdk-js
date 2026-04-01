import { describe, expect, it } from "vitest";
import z from "zod";
import { type ErrorReason, type GetNextPageData, KontentSdkError } from "../../../../lib/public_api.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import { getNextPageUrl, getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";

describe("Basic paging errors", async () => {
	const throwErrorAtResponseIndex: number = 3;
	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const expectedResponseUrls: readonly string[] = Array.from({ length: maxPagesCount }, (_, index) => getNextPageUrl(index));

	const { success, error, responses, partialResponses } = await createPagedFetchQuery({
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
		},
		mapError: (error) => error,
	}).fetchAllPagesSafe();

	it("Error should be defined & unknown", () => {
		expect(error).toBeDefined();
		expect(error).toBeInstanceOf(KontentSdkError);
		expect(error?.details?.reason).toBe<ErrorReason>("adapterError");

		if (error?.details?.reason === "adapterError") {
			expect(error.details.originalError).toBeInstanceOf(Error);
		} else {
			throw new Error("Error reason is not adapterError");
		}
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
