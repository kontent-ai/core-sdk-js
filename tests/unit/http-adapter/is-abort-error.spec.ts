import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultHttpAdapter } from "../../../lib/http/http.adapter.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import { AdapterAbortError, type ErrorReason } from "../../../lib/models/error.models.js";

const executeRequestWithSignal = async (abortSignal: AbortSignal) =>
	await getDefaultHttpAdapter().executeRequest({
		url: new URL("https://domain.com"),
		method: "GET",
		requestHeaders: [],
		body: null,
		abortSignal,
	});

const isAbortErrorCausedBy =
	(cause: unknown) =>
	(error: unknown): boolean =>
		error instanceof AdapterAbortError && error.cause === cause;

describe("isAbortError", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("Should throw AdapterAbortError when fetch throws a DOMException with name 'AbortError'", async () => {
		vi.spyOn(globalThis, "fetch" satisfies keyof typeof globalThis).mockRejectedValueOnce(
			new DOMException("The operation was aborted.", "AbortError"),
		);

		await expect(
			getDefaultHttpAdapter().executeRequest({
				url: new URL("https://domain.com"),
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: undefined,
			}),
		).rejects.toThrow(AdapterAbortError);
	});

	it("Should re-throw the original error when fetch throws a non-abort error", async () => {
		const networkError = new Error("Network failure");

		vi.spyOn(globalThis, "fetch" satisfies keyof typeof globalThis).mockRejectedValueOnce(networkError);

		await expect(
			getDefaultHttpAdapter().executeRequest({
				url: new URL("https://domain.com"),
				method: "GET",
				requestHeaders: [],
				body: null,
				abortSignal: undefined,
			}),
		).rejects.toThrow(networkError);
	});

	it("Should throw AdapterAbortError when the signal times out (fetch rejects with 'TimeoutError')", async () => {
		const timeoutError = new DOMException("The operation timed out.", "TimeoutError");
		vi.spyOn(globalThis, "fetch" satisfies keyof typeof globalThis).mockRejectedValueOnce(timeoutError);

		await expect(executeRequestWithSignal(AbortSignal.abort(timeoutError))).rejects.toSatisfy(isAbortErrorCausedBy(timeoutError));
	});

	it("Should throw AdapterAbortError when the signal is aborted with a custom reason", async () => {
		const customReason = new Error("User navigated away");
		const abortController = new AbortController();
		abortController.abort(customReason);
		vi.spyOn(globalThis, "fetch" satisfies keyof typeof globalThis).mockRejectedValueOnce(customReason);

		await expect(executeRequestWithSignal(abortController.signal)).rejects.toSatisfy(isAbortErrorCausedBy(customReason));
	});

	it("Should re-throw the original error when the provided signal is not aborted", async () => {
		const networkError = new Error("Network failure");
		vi.spyOn(globalThis, "fetch" satisfies keyof typeof globalThis).mockRejectedValueOnce(networkError);

		await expect(executeRequestWithSignal(new AbortController().signal)).rejects.toBe(networkError);
	});

	it(`Http service should report a timed out request with the '${"aborted" satisfies ErrorReason}' reason`, async () => {
		const timeoutError = new DOMException("The operation timed out.", "TimeoutError");
		vi.spyOn(globalThis, "fetch" satisfies keyof typeof globalThis).mockRejectedValueOnce(timeoutError);

		const { error } = await getDefaultHttpService().request({
			url: "https://domain.com",
			method: "GET",
			abortSignal: AbortSignal.abort(timeoutError),
		});

		expect(error?.details.reason).toBe("aborted" satisfies ErrorReason);
	});
});
