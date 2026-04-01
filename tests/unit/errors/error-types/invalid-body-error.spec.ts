import { describe, expect, it } from "vitest";
import type { HttpRequestBody } from "../../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../../lib/http/http.service.js";
import type { ErrorReason } from "../../../../lib/models/error.models.js";

// Unserializable body
const body: Record<string, unknown> = {};
body.self = body;

describe("Invalid body error", async () => {
	const { error } = await getDefaultHttpService({}).request({
		url: "https://domain.com",
		method: "POST",
		body: body as unknown as HttpRequestBody,
	});

	it(`Error details should be of type '${"invalidBody" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidBody" satisfies ErrorReason);

		if (error?.details.reason === "invalidBody") {
			expect(error.details.originalError).toBeDefined();
		}
	});
});
