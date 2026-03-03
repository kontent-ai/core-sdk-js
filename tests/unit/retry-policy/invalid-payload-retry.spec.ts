import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../lib/models/error.models.js";

// Unserializable body
const body: Record<string, unknown> = {};
body.self = body;

describe("Invalid payload retry", async () => {
	const { error } = await getDefaultHttpService({
		adapter: {
			requestAsync: async () => {
				return await Promise.resolve({
					isValidResponse: true,
					responseHeaders: [],
					status: 200,
					statusText: "OK",
					url: "https://domain.com",
					toJsonAsync: () => {
						throw new Error("Invalid payload");
					},
					toBlobAsync: () => null as never,
				});
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

	it("Retry attempt should be 0 because invalid payload should not be retried", () => {
		expect(error?.details.retryAttempt).toBe(0);
	});

	it(`Error details should be of type '${"invalidPayload" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidPayload" satisfies ErrorReason);

		if (error?.details.reason === "invalidPayload") {
			expect(error.details.originalError).toBeDefined();
		}
	});
});
