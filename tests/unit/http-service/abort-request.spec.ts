import { describe, expect, it, vi } from "vitest";
import type { AdapterExecuteRequestOptions, AdapterResponse } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { JsonValue } from "../../../lib/models/json.models.js";
import type { ErrorReason } from "../../../lib/public_api.js";
import { sleep } from "../../../lib/utils/core.utils.js";

describe("Abort signal forwarding", () => {
	it("Request should forward abort signal", async () => {
		const abortController = new AbortController();
		const executeRequest = vi.fn(async (options: AdapterExecuteRequestOptions): Promise<AdapterResponse<JsonValue>> => {
			return await Promise.resolve({
				responseHeaders: [],
				status: 200,
				statusText: "Ok",
				url: options.url,
				payload: null,
			});
		});

		const result = await getDefaultHttpService({
			adapter: {
				executeRequest,
			},
		}).request<null, null>({
			url: "https://domain.com",
			method: "GET",
			abortSignal: abortController.signal,
		});

		expect(result.success).toBe(true);
		expect(executeRequest).toHaveBeenCalledTimes(1);
		expect(executeRequest.mock.calls[0]?.[0]?.abortSignal).toBe(abortController.signal);
	});
});

describe("Abort signal cancellation", async () => {
	const abortController = new AbortController();
	const startTime = performance.now();
	const executeRequestSleepMs = 500;
	const abortAfterMs = 100;

	// some leeway for the test to pass
	const expectedDuration = abortAfterMs * 2 + executeRequestSleepMs;

	const [{ error }] = await Promise.all([
		getDefaultHttpService({
			retryStrategy: {
				maxRetries: 5,
				canRetryAdapterError: () => true,
			},
			adapter: {
				executeRequest: async (_options: AdapterExecuteRequestOptions): Promise<AdapterResponse<JsonValue>> => {
					await sleep(executeRequestSleepMs);
					throw new Error("Test error");
				},
			},
		}).request<null, null>({
			url: "https://domain.com",
			method: "GET",
			abortSignal: abortController.signal,
		}),
		new Promise((resolve) => {
			setTimeout(() => {
				abortController.abort();
				resolve(true);
			}, abortAfterMs);
		}),
	]);

	const duration = performance.now() - startTime;

	it("Error should be set and set to aborted state", () => {
		expect(error?.details.reason).toBe<ErrorReason>("aborted");
	});

	it("Duration should be slighly higher than the abort after time", () => {
		expect(duration).toBeLessThan(expectedDuration);
	});
});
