import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

describe("Adapter error", async () => {
	const { error } = await getDefaultHttpService({
		adapter: {
			executeRequest: () => {
				throw new Error("Test error");
			},
		},
	}).request({
		url: "https://domain.com",
		method: "GET",
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it(`Error details should be of type '${"adapterError" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("adapterError" satisfies ErrorReason);
	});

	it(`Original error should be preserved`, () => {
		if (error?.details.reason === "adapterError") {
			expect(error.details.originalError).toBeInstanceOf(Error);
		} else {
			throw new Error("Error reason is not adapterError");
		}
	});
});
