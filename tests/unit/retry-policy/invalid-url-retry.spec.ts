import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../lib/models/error.models.js";

const url = "invalid-url";

describe("Invalid url retry", async () => {
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
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it("Retry attempt should be undefined because invalid URL should not be retried", () => {
		expect(error?.details.retryAttempt).toBe(0);
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
