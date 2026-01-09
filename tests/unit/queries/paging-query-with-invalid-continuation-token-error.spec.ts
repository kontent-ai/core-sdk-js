import { describe, expect, it } from "vitest";
import z from "zod";
import type { AdapterResponse } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { ContinuationHeaderName } from "../../../lib/models/core.models.js";
import { type ErrorReason, SdkError } from "../../../lib/models/error.models.js";
import { getPagingQuery } from "../../../lib/sdk/sdk-queries.js";

describe("Paging query with invalid continuation token", async () => {
	const httpService = getDefaultHttpService({
		adapter: {
			requestAsync: async () => {
				const adapterResponse: AdapterResponse = {
					isValidResponse: true,
					responseHeaders: [
						{
							name: "X-Continuation" satisfies ContinuationHeaderName,
							value: undefined,
						},
					],
					status: 200,
					statusText: "",
					toJsonAsync: async () => {
						return await Promise.resolve(null);
					},
					toBlobAsync: () => {
						throw new Error("n/a");
					},
				};

				return await Promise.resolve<AdapterResponse>(adapterResponse);
			},
		},
	});

	const { success, error } = await getPagingQuery({
		authorizationApiKey: undefined,
		continuationToken: "first-continuation-token",
		extraMetadata: () => ({}),
		config: {
			httpService,
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: {
			name: "test",
			version: "0.0.0",
			host: "test",
		},
		zodSchema: z.null(),
		request: {
			url: "https://domain.com",
			method: "GET",
			body: {},
		},
		canFetchNextResponse: () => false,
	}).toAllPromise();

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(SdkError);
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Error reason should be invalid continuation token", () => {
		expect(error?.details.reason).toBe<ErrorReason>("invalidContinuationToken");
	});
});
