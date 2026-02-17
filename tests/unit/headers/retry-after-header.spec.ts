import { describe, expect, it } from "vitest";
import type { CommonHeaderNames, Header } from "../../../lib/models/core.models.js";
import { getRetryAfterHeaderValue } from "../../../lib/utils/header.utils.js";

describe("Valid Retry-After header extraction", () => {
	const headerValue = "9";
	const headers: readonly Header[] = [
		{
			name: "Retry-After" satisfies CommonHeaderNames,
			value: headerValue,
		},
	];

	it(`Should extract retry-after header with value '${headerValue}'`, () => {
		expect(getRetryAfterHeaderValue(headers)).toStrictEqual(+headerValue);
	});
});

describe("Retry-After header extraction with value 0", () => {
	const headerValue = "0";
	const headers: readonly Header[] = [
		{
			name: "Retry-After" satisfies CommonHeaderNames,
			value: headerValue,
		},
	];

	it(`Should extract retry-after header with value '${headerValue}'`, () => {
		expect(getRetryAfterHeaderValue(headers)).toStrictEqual(0);
	});
});

describe("Missing Retry-After header extraction", () => {
	const headers: readonly Header[] = [
		{
			name: "Retry-After-x",
			value: "5",
		},
	];

	it("Should return undefined", () => {
		expect(getRetryAfterHeaderValue(headers)).toBeUndefined();
	});
});

describe("Retry-after with unsafe integer value", () => {
	const headers: readonly Header[] = [
		{
			name: "Retry-After" satisfies CommonHeaderNames,
			value: "hello",
		},
	];

	it("Should return undefined", () => {
		expect(getRetryAfterHeaderValue(headers)).toBeUndefined();
	});
});
