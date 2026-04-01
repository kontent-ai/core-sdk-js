import { afterEach, describe, expect, it, vi } from "vitest";
import type { HttpResponse } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { RetryStrategyOptions } from "../../../lib/models/core.models.js";
import { createSdkError } from "../../../lib/utils/error.utils.js";
import { resolveDefaultRetryStrategyOptions, runWithRetry, waitBeforeNextRetry } from "../../../lib/utils/retry.utils.js";

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

describe("waitBeforeNextRetry - no abort signal", () => {
	it("Should wait before the next retry with no abort signal", async () => {
		const start = performance.now();
		const retryInMs = 200;

		const { isAborted } = await waitBeforeNextRetry({ retryInMs });

		const duration = Math.round(performance.now() - start);

		expect(duration).toBeGreaterThanOrEqual(retryInMs);
		expect(isAborted).toBe(false);
	});

	it("Should not wait before the next retry with abort signal", async () => {
		const abortController = new AbortController();
		const start = performance.now();
		const retryInMs = 200;
		const abortAfterMs = 50;
		const expectedDurationMin = abortAfterMs;

		// some leeway for the test to pass
		const expectedDurationMax = abortAfterMs * 2;

		const [{ isAborted }] = await Promise.all([
			waitBeforeNextRetry({ retryInMs, abortSignal: abortController.signal }),
			new Promise((resolve) => {
				setTimeout(() => {
					abortController.abort();
					resolve(true);
				}, abortAfterMs);
			}),
		]);

		const duration = Math.round(performance.now() - start);

		expect(isAborted).toBe(true);
		expect(duration).toBeGreaterThanOrEqual(expectedDurationMin);
		expect(duration).toBeLessThanOrEqual(expectedDurationMax);
	});
});

type TestCase = RetryStrategyOptions & {
	readonly title: string;
	readonly expectedRetries: number;
};

const canRetryTestCases: readonly TestCase[] = [
	{
		title: "By default unhandled errors are not retried even if max retries is > 0",
		canRetryAdapterError: resolveDefaultRetryStrategyOptions({}).canRetryAdapterError,
		maxRetries: 5,
		expectedRetries: 0,
	},
	{
		title: "Can retry when unhandled errors are set to be retried via custom callback",
		canRetryAdapterError: () => true,
		maxRetries: 1,
		expectedRetries: 1,
	},
	{
		title: "Can retry, but should not retry because max retries is 0",
		expectedRetries: 0,
		maxRetries: 0,
		canRetryAdapterError: () => true,
	},
	{
		title: "Should retry 2 times",
		expectedRetries: 2,
		maxRetries: 2,
		canRetryAdapterError: () => true,
	},
];

for (const testCase of canRetryTestCases) {
	describe(testCase.title, async () => {
		const { error } = await getDefaultHttpService({
			retryStrategy: testCase,
			adapter: {
				executeRequest: () => {
					throw new Error("Testing retry policy");
				},
			},
		}).request({
			url: new URL("https://domain.com"),
			method: "GET",
		});

		it(`Should retry '${testCase.expectedRetries}' times`, () => {
			expect(error?.retryAttempt).toBe(testCase.expectedRetries);
		});
	});
}
