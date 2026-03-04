import { describe, expect, it } from "vitest";
import { createSdkError, isKontent404Error } from "../../../lib/utils/error.utils.js";

describe("isKontent404Error utility function", () => {
	it("Should evaluate to true when error is a Kontent AI not found error", () => {
		expect(
			isKontent404Error(
				createSdkError({
					baseErrorData: {
						message: "",
						url: "",
						retryAttempt: undefined,
						retryStrategyOptions: undefined,
					},
					details: {
						reason: "notFound",
						isValidResponse: false,
						status: 404,
						statusText: "",
						responseHeaders: [],
						kontentErrorResponse: undefined,
					},
				}),
			),
		).toBe(true);
	});

	it("Should evaluate to false when error is not a Kontent AI not found error", () => {
		expect(
			isKontent404Error(
				createSdkError({
					baseErrorData: {
						message: "",
						url: "",
						retryAttempt: undefined,
						retryStrategyOptions: undefined,
					},
					details: {
						reason: "invalidResponse",
						isValidResponse: false,
						status: 404,
						statusText: "",
						responseHeaders: [],
						kontentErrorResponse: undefined,
					},
				}),
			),
		).toBe(false);
	});
});
