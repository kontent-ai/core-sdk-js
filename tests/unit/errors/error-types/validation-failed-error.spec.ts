import { describe, expect, it } from "vitest";
import z from "zod";
import { type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";
import { createFetchQuery } from "../../../../lib/sdk/queries/fetch-sdk-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";

const zodSchema = z.object({
	codename: z.string(),
});

describe("Validation failed error", async () => {
	const { success, error } = await createFetchQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({
				statusCode: 200,
				jsonResponse: { codename: 123 }, // schema expects string
			}),
			responseValidation: {
				enable: true,
			},
		},
		sdkInfo: getTestSdkInfo(),
		zodSchema,
		request: {
			url: "https://domain.com",
		},
		mapError: (error) => error,
	}).fetchSafe();

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it(`Error details should be of type '${"validationFailed" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe<ErrorReason>("validationFailed");

		if (error?.details.reason === "validationFailed") {
			expect(error.details.zodError).toBeDefined();
			expect(error.details.response).toBeDefined();
			expect(error.details.url).toBe(new URL("https://domain.com").toString());
		}
	});

	it("Retry attempt should be undefined because validation errors are not retried", () => {
		expect(error?.retryAttempt).toBeUndefined();
	});
});
