import { describe, expect, it } from "vitest";
import z from "zod";
import {
	type ErrorReason,
	type GetNextPageData,
	getDefaultHttpService,
	isKontentSdkError,
	KontentSdkError,
	tryCatchAsync,
} from "../../../lib/public_api.js";
import { createPagingQuery } from "../../../lib/sdk/paging-sdk-query.js";
import { getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";
import { getNextPageUrl, preventInfinitePaging } from "../../test.utils.js";

describe("Async pages iterator error propagation", async () => {
	const maxPagesCount: number = 5;
	let responseIndex: number = 0;

	const pagesIterator = createPagingQuery<null, null>({
		authorizationApiKey: undefined,
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
		request: {
			url: "invalid-url",
			method: "GET",
			body: null,
		},
	}).pages({ maxPagesCount });

	const { error, success } = await tryCatchAsync(async () => {
		for await (const _page of pagesIterator) {
			// do nothing, error should be thrown by the iterator
		}
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Error should be an instance of KontentSdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it("Error reason should be invalidUrl", () => {
		if (isKontentSdkError(error)) {
			expect(error.details.reason).toBe<ErrorReason>("invalidUrl");
		} else {
			throw new Error("Error is not an instance of KontentSdkError");
		}
	});
});
