import { afterEach, describe, expect, it, vi } from "vitest";
import type { HttpResponse } from "../../../lib/http/http.models.js";
import { createSdkError } from "../../../lib/utils/error.utils.js";
import { resolveDefaultRetryStrategyOptions, runWithRetry } from "../../../lib/utils/retry.utils.js";

const url = new URL("https://domain.com");

const successResponse: HttpResponse<null, null> = {
	success: true,
	response: {
		payload: null,
		method: "GET",
		requestHeaders: [],
		adapterResponse: { status: 200, statusText: "OK", responseHeaders: [], url: url.toString(), payload: null },
	},
};

const rateLimitError = createSdkError({
	baseErrorData: { message: "Rate limited", url: url.toString(), retryStrategyOptions: undefined, retryAttempt: 0 },
	details: {
		reason: "invalidResponse",
		status: 429,
		statusText: "Too Many Requests",
		responseHeaders: [],
		kontentErrorResponse: undefined,
	},
});

describe("resolveDefaultRetryStrategyOptions - logRetryAttempt: undefined", () => {
	const resolved = resolveDefaultRetryStrategyOptions();

	it("Should resolve logRetryAttempt to undefined when not provided", () => {
		expect(resolved.logRetryAttempt).toBeUndefined();
	});
});

describe("resolveDefaultRetryStrategyOptions - logRetryAttempt: custom function", () => {
	const customLog = vi.fn();
	const resolved = resolveDefaultRetryStrategyOptions({ logRetryAttempt: customLog });

	it("Should pass the custom function through unchanged", () => {
		expect(resolved.logRetryAttempt).toBe(customLog);
	});

	it("Should call the custom function with retryAttempt and url when invoked", () => {
		resolved.logRetryAttempt?.(1, "https://domain.com");
		expect(customLog).toHaveBeenCalledOnce();
		expect(customLog).toHaveBeenCalledWith(1, "https://domain.com");
	});
});

describe("resolveDefaultRetryStrategyOptions - logRetryAttempt: 'logToConsole'", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("Should call console.warn with the formatted message when invoked", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const resolved = resolveDefaultRetryStrategyOptions({ maxRetries: 5, logRetryAttempt: "logToConsole" });

		resolved.logRetryAttempt?.(2, "https://domain.com");

		expect(warnSpy).toHaveBeenCalledOnce();
		expect(warnSpy).toHaveBeenCalledWith("Retry attempt '2' from a maximum of '5' retries. Requested url: 'https://domain.com'");
	});

	it("Should not call console.warn when logRetryAttempt is not invoked", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		resolveDefaultRetryStrategyOptions({ logRetryAttempt: "logToConsole" });

		expect(warnSpy).not.toHaveBeenCalled();
	});
});

describe("getDelayBetweenRetriesMs - Retry-After header present", () => {
	const { getDelayBetweenRetriesMs } = resolveDefaultRetryStrategyOptions();

	it("Should return the header value converted from seconds to milliseconds", () => {
		const error = createSdkError({
			baseErrorData: { message: "Rate limited", url: url.toString(), retryStrategyOptions: undefined, retryAttempt: 0 },
			details: {
				reason: "invalidResponse",
				status: 429,
				statusText: "Too Many Requests",
				responseHeaders: [{ name: "Retry-After", value: "3" }],
				kontentErrorResponse: undefined,
			},
		});

		expect(getDelayBetweenRetriesMs(error)).toBe(3000);
	});

	it("Should return 0 when no Retry-After header is present", () => {
		const error = createSdkError({
			baseErrorData: { message: "Rate limited", url: url.toString(), retryStrategyOptions: undefined, retryAttempt: 0 },
			details: {
				reason: "invalidResponse",
				status: 429,
				statusText: "Too Many Requests",
				responseHeaders: [],
				kontentErrorResponse: undefined,
			},
		});

		expect(getDelayBetweenRetriesMs(error)).toBe(0);
	});
});

describe("runWithRetry - rate-limited request succeeds on retry", async () => {
	const func = vi
		.fn<(retryAttempt: number) => Promise<HttpResponse<null, null>>>()
		.mockResolvedValueOnce({ success: false, error: rateLimitError })
		.mockResolvedValueOnce(successResponse);

	const result = await runWithRetry({
		func,
		retryStrategyOptions: resolveDefaultRetryStrategyOptions({ maxRetries: 3 }),
		retryAttempt: 0,
		url,
		abortSignal: undefined,
	});

	it("Should eventually succeed", () => {
		expect(result.success).toBe(true);
	});

	it("Should call func exactly twice (one rate-limited attempt + one retry)", () => {
		expect(func).toHaveBeenCalledTimes(2);
	});
});

describe("runWithRetry - rate-limited request fails after max retries exceeded", async () => {
	const func = vi
		.fn<(retryAttempt: number) => Promise<HttpResponse<null, null>>>()
		.mockResolvedValue({ success: false, error: rateLimitError });

	const maxRetries = 2;

	const result = await runWithRetry({
		func,
		retryStrategyOptions: resolveDefaultRetryStrategyOptions({ maxRetries }),
		retryAttempt: 0,
		url,
		abortSignal: undefined,
	});

	it("Should not succeed", () => {
		expect(result.success).toBe(false);
	});

	it("Should call func maxRetries + 1 times before giving up", () => {
		expect(func).toHaveBeenCalledTimes(maxRetries + 1);
	});
});
