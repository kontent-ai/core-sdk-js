import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { AdapterAbortError, type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

describe("Aborted error", async () => {
	const originalError = new Error("Request was aborted");

	const { error } = await getDefaultHttpService({
		adapter: {
			executeRequest: () => {
				throw new AdapterAbortError(originalError);
			},
		},
	}).request({
		url: "https://domain.com",
		method: "GET",
		body: null,
	});

	it("Retry attempt should be 0 because aborted request should not be retried", () => {
		expect(error?.retryAttempt).toBe(0);
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it(`Error details should be of type '${"aborted" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("aborted" satisfies ErrorReason);
	});

	it("Original error should be preserved", () => {
		if (error?.details.reason === "aborted") {
			expect(error.details.originalError).toBeInstanceOf(AdapterAbortError);
			expect(error.details.originalError).toHaveProperty("cause", originalError);
		} else {
			throw new Error("Error reason is not aborted");
		}
	});
});
