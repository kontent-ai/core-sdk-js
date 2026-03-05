import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { KontentSdkError } from "../../../../lib/models/error.models.js";
import type { ErrorReason } from "../../../../lib/public_api.js";

class CustomError {}

describe("Unknown error (unhandled)", async () => {
	const { success, response, error } = await getDefaultHttpService({
		adapter: {
			executeRequestAsync: () => {
				throw new CustomError();
			},
			downloadFileAsync: () => {
				throw new CustomError();
			},
		},
	}).requestAsync({
		url: "https://domain.com",
		method: "GET",
		body: null,
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Response should be undefined", () => {
		expect(response).toBeUndefined();
	});

	it("Error reason should be unknown", () => {
		expect(error?.details.reason).toBe<ErrorReason>("unknown");
	});

	it("Original error should be propagated", () => {
		if (error?.details.reason === "unknown") {
			expect(error.details.originalError).toBeInstanceOf(CustomError);
		} else {
			throw new Error("Error reason is not unknown");
		}
	});
});
