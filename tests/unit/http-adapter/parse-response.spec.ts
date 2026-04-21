import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpAdapter } from "../../../lib/http/http.adapter.js";
import { AdapterAbortError, AdapterParseError } from "../../../lib/models/error.models.js";

describe("Handling parse errors in default http adapter", () => {
	afterAll(() => {
		vi.restoreAllMocks();
	});

	it("Should succeed when requestHeaders is not provided", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
			...({} as Response),
			ok: true,
			status: 200,
			statusText: "OK",
			headers: new Headers({ "Content-Type": "application/json" }),
			json: async () => await Promise.resolve(null),
		});

		const result = await getDefaultHttpAdapter().executeRequest({
			url: new URL("https://domain.com"),
			method: "GET",
			body: null,
		});

		expect(result.status).toBe(200);
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
				url: new URL("https://domain.com"),
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: abortController.signal,
			}),
		).rejects.toThrow(AdapterAbortError);
	});

	it("Should return parsed data when abortSignal is provided but not aborted", async () => {
		const abortController = new AbortController();
		const payload = { value: "test" };

		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
			...({} as Response),
			ok: true,
			status: 200,
			statusText: "OK",
			headers: new Headers({ "Content-Type": "application/json" }),
			json: async () => await Promise.resolve(payload),
		});

		const result = await getDefaultHttpAdapter().executeRequest({
			url: new URL("https://domain.com"),
			method: "GET",
			requestHeaders: [],
			body: null,
			abortSignal: abortController.signal,
		});

		expect(result.payload).toStrictEqual(payload);
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
				url: new URL("https://domain.com"),
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: undefined,
			}),
		).rejects.toThrow(AdapterParseError);
	});
});
