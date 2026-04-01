import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { AdapterAbortError, type ErrorReason } from "../../../../lib/models/error.models.js";

describe("Aborted error", async () => {
	const originalError = new Error("Request was aborted");

	const { error } = await getDefaultHttpService({
		adapter: {
			executeRequest: () => {
				throw new AdapterAbortError({ message: "Request was aborted", error: originalError });
			},
		},
	}).request({
		url: "https://domain.com",
		method: "GET",
	});

	it(`Error details should be of type '${"aborted" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("aborted" satisfies ErrorReason);
	});

	it("Original error should be preserved", () => {
		if (error?.details.reason === "aborted") {
			expect(error.details.originalError).toBeInstanceOf(AdapterAbortError);
			if (error.details.originalError instanceof AdapterAbortError) {
				expect(error.details.originalError.details).toBe(originalError);
			} else {
				throw new Error("Original error is not an instance of AdapterAbortError");
			}
		} else {
			throw new Error("Error reason is not aborted");
		}
	});
});
