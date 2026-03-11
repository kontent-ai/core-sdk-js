import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { AdapterParseError, type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

describe("Parse error", async () => {
	const originalError = new Error("Failed to parse response");

	const { error } = await getDefaultHttpService({
		adapter: {
			executeRequest: () => {
				throw new AdapterParseError(originalError);
			},
		},
	}).request({
		url: "https://domain.com",
		method: "GET",
		body: null,
	});

	it("Retry attempt should be 0 because parse error should not be retried", () => {
		expect(error?.retryAttempt).toBe(0);
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it(`Error details should be of type '${"parseError" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("parseError" satisfies ErrorReason);
	});

	it("Original error should be preserved", () => {
		if (error?.details.reason === "parseError") {
			expect(error.details.originalError).toBeInstanceOf(AdapterParseError);
			expect(error.details.originalError).toHaveProperty("cause", originalError);
		} else {
			throw new Error("Error reason is not parseError");
		}
	});
});
