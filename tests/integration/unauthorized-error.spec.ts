import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import { type ErrorReason, SdkError } from "../../lib/models/error.models.js";
import { getIntegrationTestConfig } from "../integration-tests.config.js";

describe("Integration tests - Unauthorized error", async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService({
		retryStrategy: {
			maxRetries: 0,
			logRetryAttempt: false,
			canRetryError: () => {
				return false;
			},
		},
	});

	const { success, error } = await httpService.requestAsync({
		method: "GET",
		url: config.urls.listItemsUrl,
		body: null,
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(SdkError);
	});

	it("Error reason should be 'unauthorized' ", () => {
		const unauthorizedErrorReason = "unauthorized" satisfies ErrorReason;
		expect(error?.details.reason).toBe<ErrorReason>(unauthorizedErrorReason);

		if (error?.details.reason !== unauthorizedErrorReason) {
			throw new Error(`Expected error reason to be '${unauthorizedErrorReason}'`);
		}

		expect(error.details.status).toBe(401);
	});
});
