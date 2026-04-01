import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommonHeaderNames, Header } from "../../../lib/models/core.models.js";
import { getRetryAfterHeaderValue } from "../../../lib/utils/header.utils.js";

afterEach(() => {
	vi.useRealTimers();
});

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

describe("Retry-After header extraction with date value", () => {
	const now = new Date("2026-03-11T12:00:00.000Z");
	const headerValue = "Wed, 11 Mar 2026 12:00:05 GMT";
	const headers: readonly Header[] = [
		{
			name: "Retry-After" satisfies CommonHeaderNames,
			value: headerValue,
		},
	];

	it(`Should extract retry-after header with date value '${headerValue}'`, () => {
		vi.useFakeTimers();
		vi.setSystemTime(now);

		expect(getRetryAfterHeaderValue(headers)).toStrictEqual(5);
	});
});

describe("Retry-After header extraction with past date value", () => {
	const now = new Date("2026-03-11T12:00:05.000Z");
	const headerValue = "Wed, 11 Mar 2026 12:00:00 GMT";
	const headers: readonly Header[] = [
		{
			name: "Retry-After" satisfies CommonHeaderNames,
			value: headerValue,
		},
	];

	it("Should clamp to 0 seconds", () => {
		vi.useFakeTimers();
		vi.setSystemTime(now);

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

describe("Retry-After header extraction with decimal seconds value", () => {
	const headerValue = "1.5";
	const headers: readonly Header[] = [
		{
			name: "Retry-After" satisfies CommonHeaderNames,
			value: headerValue,
		},
	];

	it(`Should extract retry-after header with decimal value '${headerValue}'`, () => {
		expect(getRetryAfterHeaderValue(headers)).toStrictEqual(1.5);
	});
});
