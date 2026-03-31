import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultHttpAdapter } from "../../../lib/http/http.adapter.js";
import { AdapterAbortError } from "../../../lib/models/error.models.js";

describe("isAbortError", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("Should throw AdapterAbortError when fetch throws a DOMException with name 'AbortError'", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("The operation was aborted.", "AbortError"));

		await expect(
			getDefaultHttpAdapter().executeRequest({
				url: "https://domain.com",
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: undefined,
			}),
		).rejects.toThrow(AdapterAbortError);
	});

	it("Should re-throw the original error when fetch throws a non-abort error", async () => {
		const networkError = new Error("Network failure");

		vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(networkError);

		await expect(
			getDefaultHttpAdapter().executeRequest({
				url: "https://domain.com",
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: undefined,
			}),
		).rejects.toThrow(networkError);
	});
});
