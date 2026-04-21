import { describe, expect, it } from "vitest";
import z from "zod";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import type { QueryResponse } from "../../../../lib/sdk/sdk-models.js";
import { getNextPageUrl, getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";

describe("Async pages iterator errors", async () => {
	const throwErrorAtResponseIndex: number = 3;
	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const expectedResponseUrls: readonly URL[] = Array.from({ length: maxPagesCount }, (_, index) => new URL(getNextPageUrl(index)));

	const pagesIterator = createPagedFetchQuery({
		getNextPageData: () => {
			responseIndex++;

			// stop paging after maxPagesCount responses
			if (responseIndex === maxPagesCount) {
				return {};
			}

			return {
				nextPageUrl: getNextPageUrl(responseIndex),
			};
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
		url: expectedResponseUrls?.[0] ?? "n/a",
		mapError: (error) => error,
	}).pagesSafe();

	const responses: QueryResponse<null, unknown>[] = [];

	for await (const { success, response } of pagesIterator) {
		if (success) {
			responses.push(response);
		} else {
			break;
		}
	}

	it(`Responses should have length of "${throwErrorAtResponseIndex}"`, () => {
		expect(responses).toHaveLength(throwErrorAtResponseIndex);
	});
});
