import { describe, expect, it } from "vitest";
import type { KontentErrorResponseData } from "../../../lib/models/core.models.js";
import { isKontentErrorResponseData } from "../../../lib/utils/error.utils.js";

describe("isKontentErrorResponseData utility function", () => {
	it("Should return true when JSON is a Kontent API error response data", () => {
		expect(
			isKontentErrorResponseData({
				message: "Error message",
				request_id: "123",
				error_code: 0,
			} satisfies KontentErrorResponseData),
		).toBe(true);
	});

	it("Should return false when error JSON is missing required properties", () => {
		expect(
			isKontentErrorResponseData({
				message: "Error message",
				error_code: 0,
			} satisfies Omit<KontentErrorResponseData, "request_id">),
		).toBe(false);

		expect(
			isKontentErrorResponseData({
				request_id: "123",
				error_code: 0,
			} satisfies Omit<KontentErrorResponseData, "message">),
		).toBe(false);

		expect(
			isKontentErrorResponseData({
				message: "Error message",
				request_id: "123",
			} satisfies Omit<KontentErrorResponseData, "error_code">),
		).toBe(false);
	});
});
