import { describe, expect, it } from "vitest";
import { runWithAbortSignal } from "../../../lib/utils/abort.utils.js";

describe("runWithAbortSignal - not aborted", async () => {
	const abortController = new AbortController();
	const expectedData = { value: "result" };

	const result = await runWithAbortSignal({
		func: async () => expectedData,
		abortSignal: abortController.signal,
	});

	it("Result should not be aborted", () => {
		expect(result.isAborted).toBe(false);
	});

	it("Result should contain the data returned by func", () => {
		expect(result.data).toStrictEqual(expectedData);
	});
});

describe("runWithAbortSignal - aborted", async () => {
	const abortController = new AbortController();
	abortController.abort();

	const result = await runWithAbortSignal({
		func: async () => ({ value: "result" }),
		abortSignal: abortController.signal,
	});

	it("Result should be aborted", () => {
		expect(result.isAborted).toBe(true);
	});

	it("Result should not contain data", () => {
		expect(result.data).toBeUndefined();
	});
});

describe("runWithAbortSignal - exception thrown in func", async () => {
	const abortController = new AbortController();
	const expectedError = new Error("func error");

	const thrownError = await runWithAbortSignal({
		func: () => {
			throw expectedError;
		},
		abortSignal: abortController.signal,
	}).catch((error: unknown) => error);

	it("Should reject with the error thrown by func", () => {
		expect(thrownError).toBe(expectedError);
	});
});
