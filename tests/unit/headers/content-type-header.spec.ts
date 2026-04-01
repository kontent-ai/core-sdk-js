import { describe, expect, it } from "vitest";
import type { CommonHeaderNames, Header } from "../../../lib/models/core.models.js";
import { isApplicationJsonResponseType } from "../../../lib/utils/header.utils.js";

describe("isApplicationJsonResponseType", () => {
	it("Should return true when Content-Type is application/json", () => {
		const headers: readonly Header[] = [{ name: "Content-Type" satisfies CommonHeaderNames, value: "application/json" }];
		expect(isApplicationJsonResponseType(headers)).toBe(true);
	});

	it("Should return true when Content-Type is application/json with charset", () => {
		const headers: readonly Header[] = [{ name: "Content-Type" satisfies CommonHeaderNames, value: "application/json; charset=utf-8" }];
		expect(isApplicationJsonResponseType(headers)).toBe(true);
	});

	it("Should return false when headers are empty", () => {
		const headers: readonly Header[] = [];
		expect(isApplicationJsonResponseType(headers)).toBe(false);
	});

	it("Should return false when Content-Type is not application/json", () => {
		const headers: readonly Header[] = [{ name: "Content-Type" satisfies CommonHeaderNames, value: "text/html" }];
		expect(isApplicationJsonResponseType(headers)).toBe(false);
	});
});
