import { describe, expect, it, vi } from "vitest";
import type { AdapterExecuteRequestOptions, AdapterResponse } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { JsonValue } from "../../../lib/models/json.models.js";
import { type ErrorReason, getDefaultHttpAdapter } from "../../../lib/public_api.js";
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
			body: null,
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
	const waitTimeInMs = 3000;

	// the duration should be a lot lower since it's cancelled immediately
	// but this is to give some leeway for the test to pass
	const expectedDuration = waitTimeInMs / 2;

	const [result] = await Promise.all([
		getDefaultHttpService({
			adapter: {
				executeRequest: async (options: AdapterExecuteRequestOptions): Promise<AdapterResponse<JsonValue>> => {
					const response = await getDefaultHttpAdapter().executeRequest(options);
					await sleep(waitTimeInMs);
					return response;
				},
			},
		}).request<null, null>({
			url: "https://domain.com",
			method: "GET",
			body: null,
			abortSignal: abortController.signal,
		}),
		new Promise((resolve) => {
			setTimeout(() => {
				// abort request
				abortController.abort();
				resolve(true);
			}, 100);
		}),
	]);

	const duration = performance.now() - startTime;

	it("Request should be cancelled and therefore not succeed", () => {
		expect(result.success).toBe(false);
	});

	it("Error should be set and set to aborted state", () => {
		expect(result.error?.details.reason).toBe<ErrorReason>("aborted");
	});

	it("Duration should be less than the wait time", () => {
		expect(duration).toBeLessThan(expectedDuration);
	});
});
