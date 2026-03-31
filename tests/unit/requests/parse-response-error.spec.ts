import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpAdapter } from "../../../lib/http/http.adapter.js";
import { AdapterAbortError, AdapterParseError } from "../../../lib/models/error.models.js";

describe("Handling parse errors in default http adapter", () => {
	afterAll(() => {
		vi.restoreAllMocks();
	});

	it("Should throw AdapterAbortError when abort signal is fired during response parsing", async () => {
		const abortController = new AbortController();
		abortController.abort();

		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
			...({} as Response),
			ok: true,
			status: 200,
			statusText: "OK",
			headers: new Headers({ "Content-Type": "application/json" }),
			json: async () => await new Promise(() => {}),
		});

		await expect(
			getDefaultHttpAdapter().executeRequest({
				url: "https://domain.com",
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: abortController.signal,
			}),
		).rejects.toThrow(AdapterAbortError);
	});

	it("Should throw AdapterParseError when response.json() throws", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
			...({} as Response),
			ok: true,
			status: 200,
			statusText: "OK",
			headers: new Headers({ "Content-Type": "application/json" }),
			json: async () => await Promise.reject(new Error("Unexpected token in JSON")),
		});

		await expect(
			getDefaultHttpAdapter().executeRequest({
				url: "https://domain.com",
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: undefined,
			}),
		).rejects.toThrow(AdapterParseError);
	});
});
