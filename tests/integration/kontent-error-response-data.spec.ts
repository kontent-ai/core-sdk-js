import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../lib/http/http.service.js";
import { type ErrorReason, SdkError } from "../../lib/models/error.models.js";
import { getIntegrationTestConfig } from "../integration-tests.config.js";

describe("Integration tests - Kontent error response data", async () => {
	const config = getIntegrationTestConfig();
	const httpService = getDefaultHttpService({
		requestHeaders: config.getMapiAuthorizationHeaders(),
		retryStrategy: {
			maxRetries: 0,
			logRetryAttempt: false,
			canRetryError: () => {
				return false;
			},
		},
	});

	const { success, error } = await httpService.requestAsync({
		method: "POST",
		url: config.urls.addAssetUrl,
		body: {
			"invalid-field": "invalid-value",
		},
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(SdkError);
	});

	it("Kontent error response data should be defined", () => {
		const invalidResponseReason = "invalidResponse" satisfies ErrorReason;
		expect(error?.details.reason).toBe<ErrorReason>(invalidResponseReason);

		if (error?.details.reason !== invalidResponseReason) {
			throw new Error(`Expected error reason to be '${invalidResponseReason}'`);
		}

		expect(error.details.kontentErrorResponse?.message).toBeDefined();
		expect(error.details.kontentErrorResponse?.request_id).toBeDefined();
		expect(error.details.kontentErrorResponse?.error_code).toBeDefined();
	});
});
