import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { AdapterParseError, type ErrorReason } from "../../../../lib/models/error.models.js";

describe("Parse failure", async () => {
	const originalError = new Error("Failed to parse response");

	const { error } = await getDefaultHttpService({
		adapter: {
			executeRequest: () => {
				throw new AdapterParseError({ message: "Failed to parse response", error: originalError });
			},
		},
	}).request({
		url: "https://domain.com",
		method: "GET",
	});

	it(`Error details should be of type '${"parseError" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("parseError" satisfies ErrorReason);
	});

	it("Original error should be preserved", () => {
		if (error?.details.reason === "parseError") {
			expect(error.details.originalError).toBeInstanceOf(AdapterParseError);
			if (error.details.originalError instanceof AdapterParseError) {
				expect(error.details.originalError.details).toBe(originalError);
			} else {
				throw new Error("Original error is not an instance of AdapterParseError");
			}
		} else {
			throw new Error("Error reason is not parseError");
		}
	});
});
