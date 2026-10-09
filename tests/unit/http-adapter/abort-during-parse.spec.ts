import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpAdapter } from "../../../lib/http/http.adapter.js";
import type { KnownHeaderName } from "../../../lib/models/core.models.js";
import { AdapterAbortError } from "../../../lib/models/error.models.js";

/**
 * Uses the real `fetch` against a local server whose JSON body never completes,
 * to verify that aborting the signal while the body is being read is reported as an abort.
 */
describe("Abort signal fired while the real fetch is parsing the response body", () => {
	let server: Server;
	let serverUrl: URL;

	beforeAll(async () => {
		server = createServer((_request, response) => {
			response.writeHead(200, { ["Content-Type" satisfies KnownHeaderName]: "application/json" });
			// partial body that is never finished, so parsing can only end through the abort
			response.write("{");
		});

		await new Promise<void>((resolveListening) => {
			server.listen(0, "127.0.0.1", () => resolveListening());
		});

		const { port } = server.address() as AddressInfo;
		serverUrl = new URL(`http://127.0.0.1:${port}`);
	});

	afterAll(async () => {
		vi.restoreAllMocks();
		server.closeAllConnections();
		await new Promise<void>((resolveClosed) => {
			server.close(() => resolveClosed());
		});
	});

	it("Should throw AdapterAbortError", async () => {
		const abortController = new AbortController();
		const originalFetch = globalThis.fetch;

		// resolves once the response headers arrived, i.e. the adapter is about to read the body
		const headersReceived = new Promise<void>((resolveHeadersReceived) => {
			vi.spyOn(globalThis, "fetch" satisfies keyof typeof globalThis).mockImplementation(async (...args) => {
				const response = await originalFetch(...args);
				resolveHeadersReceived();
				return response;
			});
		});

		const requestPromise = getDefaultHttpAdapter().executeRequest({
			url: serverUrl,
			method: "GET",
			body: null,
			abortSignal: abortController.signal,
		});

		await headersReceived;
		abortController.abort();

		await expect(requestPromise).rejects.toThrow(AdapterAbortError);
	});
});
