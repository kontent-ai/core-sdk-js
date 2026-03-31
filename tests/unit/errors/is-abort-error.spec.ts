import { describe, expect, it } from "vitest";
import { isAbortError } from "../../../lib/utils/error.utils.js";

describe("isAbortError utility function", () => {
	it("Should return false when error is null", () => {
		expect(isAbortError(null)).toBe(false);
	});

	it("Should return false when error is undefined", () => {
		expect(isAbortError(undefined)).toBe(false);
	});

	it("Should return false when error is a string", () => {
		expect(isAbortError("AbortError")).toBe(false);
	});

	it("Should return false when error is an object without a name property", () => {
		expect(isAbortError({ message: "Something went wrong" })).toBe(false);
	});

	it("Should return false when error has a name that is not 'AbortError'", () => {
		expect(isAbortError(new Error("Something went wrong"))).toBe(false);
	});

	it("Should return true when error is a DOMException with name 'AbortError'", () => {
		expect(isAbortError(new DOMException("The operation was aborted.", "AbortError"))).toBe(true);
	});

	it("Should return true when error is a plain object with name 'AbortError'", () => {
		expect(isAbortError({ name: "AbortError" })).toBe(true);
	});
});
