import { describe, expect, it } from "vitest";
import type { ErrorResponseData } from "../../../lib/models/core.models.js";
import { isKontentErrorResponseData } from "../../../lib/utils/error.utils.js";

describe("isKontentErrorResponseData utility function", () => {
	it("Should return true when JSON is a Kontent API error response data", () => {
		expect(
			isKontentErrorResponseData({
				message: "Error message",
				request_id: "123",
				error_code: 0,
			} satisfies ErrorResponseData),
		).toBe(true);
	});

	it("Should return false when error JSON is missing required properties", () => {
		expect(
			isKontentErrorResponseData({
				message: "Error message",
				error_code: 0,
			} satisfies Omit<ErrorResponseData, "request_id">),
		).toBe(false);

		expect(
			isKontentErrorResponseData({
				request_id: "123",
				error_code: 0,
			} satisfies Omit<ErrorResponseData, "message">),
		).toBe(false);

		expect(
			isKontentErrorResponseData({
				message: "Error message",
				request_id: "123",
			} satisfies Omit<ErrorResponseData, "error_code">),
		).toBe(false);
	});
});
