import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { ErrorReason } from "../../../lib/public_api.js";

class CustomError {}

describe("Unknown error", async () => {
	const { success, response, error } = await getDefaultHttpService({
		adapter: {
			requestAsync: async () => {
				return await Promise.resolve({
					isValidResponse: true,
					responseHeaders: [],
					status: 500,
					statusText: "",
					toJsonAsync: () => {
						throw new CustomError();
					},
					toBlobAsync: () => {
						throw new CustomError();
					},
				});
			},
		},
	}).requestAsync({
		url: "https://domain.com",
		method: "GET",
		body: null,
	});

	it("Success should be false", () => {
		expect(success).toBe(false);
	});

	it("Response should be undefined", () => {
		expect(response).toBeUndefined();
	});

	it("Error reason should be unknown", () => {
		expect(error?.reason).toBe<ErrorReason>("unknown");
	});

	it("Original error should be propagated", () => {
		if (error?.reason === "unknown") {
			expect(error.originalError).toBeInstanceOf(CustomError);
		} else {
			throw new Error("Error reason is not unknown");
		}
	});
});
