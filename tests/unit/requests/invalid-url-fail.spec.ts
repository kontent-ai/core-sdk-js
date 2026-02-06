import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import { type ErrorReason, SdkError } from "../../../lib/models/error.models.js";

const url = "invalid-url";

describe("Invalid url fail", async () => {
	const { success, error } = await getDefaultHttpService({}).requestAsync({
		url,
		method: "GET",
		body: null,
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Error should be defined", () => {
		expect(error).toBeDefined();
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(SdkError);
	});

	it("Retry attempt should be undefined because invalid should not be retried", () => {
		expect(error?.details.retryAttempt).toBeUndefined();
	});

	it("Error message should be set", () => {
		expect(error?.details.message).toContain(`Failed to parse url '${url}'.`);
	});

	it(`Error details should be of type '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);

		if (error?.details.reason === "invalidUrl") {
			expect(error.details.originalError).toBeDefined();
		}
	});
});
