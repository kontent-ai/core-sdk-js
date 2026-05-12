import { describe, expect, it } from "vitest";
import z from "zod";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { KontentSdkError } from "../../../../lib/models/error.models.js";
import { createFetchQuery } from "../../../../lib/sdk/queries/fetch-sdk-query.js";
import { getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";

class CustomSdkError extends KontentSdkError {
	readonly originalError: KontentSdkError;

	constructor(error: KontentSdkError) {
		super({
			baseErrorData: {
				message: error.message,
				url: error.url,
				retryStrategyOptions: error.retryStrategyOptions,
				retryAttempt: error.retryAttempt,
			},
			details: error.details,
		});
		this.originalError = error;
	}
}

describe("createFetchQuery mapError", async () => {
	const { error } = await createFetchQuery({
		zodSchema: async () => Promise.resolve(z.null()),
		url: "https://domain.com",
		config: {
			httpService: getDefaultHttpService({
				adapter: {
					executeRequest: () => {
						throw new Error("Test error");
					},
				},
			}),
			runtimeValidation: {
				validateResponses: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => new CustomSdkError(error),
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => payload,
	}).fetchSafe();

	it("Error should be an instance of CustomSdkError", () => {
		expect(error).toBeInstanceOf(CustomSdkError);
	});

	it("Error originalError should be the KontentSdkError passed to mapError", () => {
		expect(error?.originalError).toBeInstanceOf(KontentSdkError);
		expect(error?.originalError.message).toBe(error?.message);
	});
});
