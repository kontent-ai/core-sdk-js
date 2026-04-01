import { describe, expect, it } from "vitest";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

describe("Unauthorized error", async () => {
	const { error } = await getDefaultHttpService({
		adapter: {
			executeRequest: async ({ url }) => ({
				responseHeaders: [],
				status: 401,
				statusText: "Unauthorized",
				url,
				payload: null,
			}),
		},
	}).request({
		url: "https://domain.com",
		method: "GET",
	});

	it("Error should be an instance of KontentSdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it(`Error details should be of type '${"unauthorized" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("unauthorized" satisfies ErrorReason);
	});

	it("Error status should be 401", () => {
		if (error?.details.reason === "unauthorized") {
			expect(error.details.status).toBe(401);
		} else {
			throw new Error("Error reason is not unauthorized");
		}
	});
});
