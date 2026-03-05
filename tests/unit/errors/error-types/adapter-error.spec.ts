import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

describe("Adapter error", async () => {
	const { error } = await getDefaultHttpService({}).requestAsync({
		url: "https://9876543210.invalid",
		method: "GET",
		body: null,
	});

	it("Retry attempt should be 0 because invalid body should not be retried", () => {
		expect(error?.retryAttempt).toBe(0);
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it(`Error details should be of type '${"adapterError" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("adapterError" satisfies ErrorReason);
	});
});
