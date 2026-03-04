import { describe, expect, it } from "vitest";
import type { RequestBody } from "../../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import { type ErrorReason, KontentSdkError } from "../../../../lib/models/error.models.js";

// Unserializable body
const body: Record<string, unknown> = {};
body.self = body;

describe("Invalid body error", async () => {
	const { error } = await getDefaultHttpService({}).requestAsync({
		url: "https://domain.com",
		method: "POST",
		body: body as unknown as RequestBody,
	});

	it("Retry attempt should be 0 because invalid body should not be retried", () => {
		expect(error?.retryAttempt).toBe(0);
	});

	it("Error should be an instance of SdkError", () => {
		expect(error).toBeInstanceOf(KontentSdkError);
	});

	it(`Error details should be of type '${"invalidBody" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidBody" satisfies ErrorReason);

		if (error?.details.reason === "invalidBody") {
			expect(error.details.originalError).toBeDefined();
		}
	});
});
