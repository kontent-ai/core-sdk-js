import { describe, expect, it } from "vitest";
import { isBlob } from "../../../lib/utils/core.utils.js";

describe("isBlob", () => {
	it("Should return false for null", () => {
		expect(isBlob(null)).toBe(false);
	});

	it("Should return false for undefined", () => {
		expect(isBlob(undefined)).toBe(false);
	});

	it("Should return false for a plain object that does not resemble a Blob", () => {
		expect(isBlob({ name: "file.txt" })).toBe(false);
	});

	it("Should return true for a real Blob instance", () => {
		expect(isBlob(new Blob(["content"], { type: "text/plain" }))).toBe(true);
	});

	it("Should return true for a duck-typed object with arrayBuffer function and numeric size", () => {
		const blobLike = {
			arrayBuffer: async () => await Promise.resolve(new ArrayBuffer(0)),
			size: 0,
		};

		expect(isBlob(blobLike)).toBe(true);
	});
});
