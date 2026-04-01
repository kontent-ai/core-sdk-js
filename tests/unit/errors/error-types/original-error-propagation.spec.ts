import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

class CustomError {}

describe("Original error propagation", async () => {
	const { success, response, error } = await getDefaultHttpService({
		adapter: {
			executeRequest: () => {
				throw new CustomError();
			},
		},
	}).request({
		url: "https://domain.com",
		method: "GET",
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it("Original error should be propagated", () => {
		expect(error?.details.reason).toBe<ErrorReason>("adapterError");

		if (error?.details.reason === "adapterError") {
			expect(error.details.originalError).toBeInstanceOf(CustomError);
		} else {
			throw new Error("Error reason is not adapterError");
		}
	});
});
