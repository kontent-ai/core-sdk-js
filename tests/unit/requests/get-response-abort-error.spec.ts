import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpAdapter } from "../../../lib/http/http.adapter.js";
import { AdapterAbortError } from "../../../lib/models/error.models.js";

describe("Handling abort errors in default http adapter", () => {
	afterAll(() => {
		vi.restoreAllMocks();
	});

	it("Should throw AdapterAbortError when fetch throws an AbortError", async () => {
		const abortError = new DOMException("The operation was aborted.", "AbortError");

		vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortError);

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
});
