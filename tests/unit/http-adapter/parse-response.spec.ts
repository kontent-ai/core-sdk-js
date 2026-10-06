import { describe, expect, it } from "vitest";
import { getDefaultHttpAdapter } from "../../../lib/http/http.adapter.js";
import type { KnownHeaderName } from "../../../lib/models/core.models.js";
import { AdapterAbortError, AdapterParseError } from "../../../lib/models/error.models.js";
import { stubFetchWithResponse } from "../../../lib/testkit/testkit.utils.js";

const jsonContentTypeHeaders = { ["Content-Type" satisfies KnownHeaderName]: "application/json" };

describe("Handling parse errors in default http adapter", () => {
	it("Should succeed when requestHeaders is not provided", async () => {
		stubFetchWithResponse(() => Response.json(null));

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

		// a body stream that never closes, so parsing never finishes on its own
		stubFetchWithResponse(() => new Response(new ReadableStream(), { headers: jsonContentTypeHeaders }));

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

		stubFetchWithResponse(() => Response.json(payload));

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
		stubFetchWithResponse(() => new Response("not json", { headers: jsonContentTypeHeaders }));

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
