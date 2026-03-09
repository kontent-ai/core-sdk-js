import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

const url = "invalid-url";

describe("Invalid url error", async () => {
	const { error } = await getDefaultHttpService({}).request({
		url,
		method: "GET",
		body: null,
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it("Retry attempt should be 0 because invalid URL should not be retried", () => {
		expect(error?.retryAttempt).toBe(0);
	});

	it(`Error details should be of type '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);

		if (error?.details.reason === "invalidUrl") {
			expect(error.details.originalError).toBeDefined();
		}
	});
});
