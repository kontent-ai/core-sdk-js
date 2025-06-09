import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { ErrorType } from "../../../lib/public_api.js";

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

	it("Retry attempt should be undefined because invalid should not be retried", () => {
		expect(error?.retryAttempt).toBeUndefined();
	});

	it("Error message should be set", () => {
		expect(error?.message).toContain(`Failed to parse url '${url}'.`);
	});

	it(`Error details should be of type '${"invalidUrl" satisfies ErrorType}'`, () => {
		expect(error?.details.type).toBe("invalidUrl" satisfies ErrorType);

		if (error?.details.type === "invalidUrl") {
			expect(error.details.error).toBeDefined();
		}
	});
});
