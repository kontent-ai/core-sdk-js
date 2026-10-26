import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../../lib/main/http/http.service.js";
import { KontentSdkError } from "../../../../../lib/main/models/error.models.js";
import { createFetchQuery } from "../../../../../lib/main/sdk/queries/fetch-sdk-query.js";
import { getTestSdkInfo } from "../../../../../lib/testkit/testkit.utils.js";

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
		schema: undefined,
		url: "https://domain.com",
		config: {
			httpService: getDefaultHttpService({
				adapter: {
					executeRequest: () => {
						throw new Error("Test error");
					},
				},
			}),
		},
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => new CustomSdkError(error),
		mapExtraResponseProps: () => ({}),
	}).fetchSafe();

	it("Error should be an instance of CustomSdkError", () => {
		expect(error).toBeInstanceOf(CustomSdkError);
	});

	it("Error originalError should be the KontentSdkError passed to mapError", () => {
		expect(error?.originalError).toBeInstanceOf(KontentSdkError);
		expect(error?.originalError.message).toBe(error?.message);
	});
});
