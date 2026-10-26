import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../../lib/main/http/http.service.js";
import { extractContinuationToken } from "../../../../../lib/main/main_api.js";
import { createPagedFetchQuery } from "../../../../../lib/main/sdk/queries/paged-fetch-sdk-query.js";
import type { GetNextPageData } from "../../../../../lib/main/sdk/sdk-models.js";
import { createContinuationHeader, toFetchHeaders } from "../../../../../lib/main/utils/header.utils.js";
import { getTestSdkInfo, preventInfinitePaging, stubFetchWithResponse } from "../../../../../lib/testkit/testkit.utils.js";

describe("Basic paging query with continuation token", async () => {
	const responseStatusCode = 200;
	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const getResponseContinuationToken = (index: number) => {
		return `responseContinuationToken-${index}`;
	};

	const mockResponseByIndex = (index: number) => {
		stubFetchWithResponse(() =>
			Response.json(null, {
				status: responseStatusCode,
				headers: toFetchHeaders([createContinuationHeader(getResponseContinuationToken(index))]),
			}),
		);
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
		},
		sdkInfo: getTestSdkInfo(),
		schema: undefined,
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
