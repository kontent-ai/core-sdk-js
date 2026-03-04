import { describe, expect, it } from "vitest";
import z from "zod";
import type { GetNextPageData, QueryResponse } from "../../../lib/public_api.js";
import { createPagingQuery } from "../../../lib/sdk/paging-sdk-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";
import { getNextPageUrl } from "../../test.utils.js";

describe("Async pages iterator errors", async () => {
	const throwErrorAtResponseIndex: number = 3;
	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const expectedResponseUrls: readonly string[] = Array.from({ length: maxPagesCount }, (_, index) => getNextPageUrl(index));

	const pagesIterator = createPagingQuery({
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
	}).pages();

	const responses: QueryResponse<null>[] = [];

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
