import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { CommonHeaderNames, Header } from "../../../lib/models/core.models.js";
import { sdkInfo } from "../../../lib/sdk-info.js";
import { mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import {
	getRetryAfterHeaderValue,
	getSdkIdHeader,
	isApplicationJsonResponseType,
	toFetchHeaders,
	toSdkHeaders,
} from "../../../lib/utils/header.utils.js";

const sdkIdHeader = getSdkIdHeader(sdkInfo);

describe("Default headers", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	mockGlobalFetchJsonResponse({
		jsonResponse: {},
		statusCode: 200,
	});

	const { success, response, error } = await getDefaultHttpService().requestAsync({
		url: "https://domain.com",
		method: "GET",
		body: null,
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Response should contain application/json content type header", () => {
		expect(response?.requestHeaders.find((m) => m.name.toLowerCase() === "content-type")?.value).toStrictEqual("application/json");
	});

	it(`Request should contain '${sdkIdHeader.name}' header`, () => {
		expect(response?.requestHeaders.find((m) => m.name === ("X-KC-SDKID" satisfies CommonHeaderNames))?.value).toStrictEqual(
			sdkIdHeader.value,
		);
	});
});

describe(`SDK tracking header '${sdkIdHeader.name}'`, async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const customSdkId = "x";

	mockGlobalFetchJsonResponse({
		jsonResponse: {},
		statusCode: 200,
	});

	const { success, response, error } = await getDefaultHttpService().requestAsync({
		url: "https://domain.com",
		method: "GET",
		body: null,
		requestHeaders: [
			{
				name: "X-KC-SDKID" satisfies CommonHeaderNames,
				value: customSdkId,
			},
		],
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it(`Request should contain only single '${sdkIdHeader.name}' header`, () => {
		expect(
			response?.requestHeaders.filter((m) => m.name.toLowerCase() === ("X-KC-SDKID" satisfies CommonHeaderNames).toLowerCase())
				.length,
		).toStrictEqual(1);
	});

	it(`Request should contain '${sdkIdHeader.name}' header`, () => {
		expect(
			response?.requestHeaders.find((m) => m.name.toLowerCase() === ("X-KC-SDKID" satisfies CommonHeaderNames).toLowerCase())?.value,
		).toStrictEqual(customSdkId);
	});
});

describe("Custom Http Service & Request headers", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	mockGlobalFetchJsonResponse({
		jsonResponse: {},
		statusCode: 200,
	});

	const headerA: Header = {
		name: "A",
		value: "a",
	};

	const headerB: Header = {
		name: "B",
		value: "b",
	};

	const { response } = await getDefaultHttpService({
		requestHeaders: [headerA],
	}).requestAsync({
		url: "https://domain.com",
		method: "GET",
		body: null,
		requestHeaders: [headerB],
	});

	it(`Request should contain header ${headerA.name}`, () => {
		expect(response?.requestHeaders.find((m) => m.name === headerA.name)).toStrictEqual(headerA);
	});

	it(`Request should contain header ${headerB.name} `, () => {
		expect(response?.requestHeaders.find((m) => m.name === headerB.name)).toStrictEqual(headerB);
	});
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

describe("Validation of toSdkHeaders utility function", () => {
	it("Should convert empty Headers to empty array", () => {
		const headers = new Headers();
		expect(toSdkHeaders(headers)).toStrictEqual([]);
	});

	it("Should convert single header to single Header object", () => {
		const headers = new Headers([["Content-Type", "application/json"]]);
		expect(toSdkHeaders(headers)).toStrictEqual([
			{
				name: "content-type",
				value: "application/json",
			},
		]);
	});

	it("Should convert multiple headers to Header array", () => {
		const headers = new Headers([
			["Content-Type", "application/json"],
			["X-KC-SDKID", "host;name;1.0.0"],
			["Retry-After", "5"],
		]);
		const result = toSdkHeaders(headers);
		expect(result).toHaveLength(3);
		expect(result).toContainEqual({ name: "content-type", value: "application/json" });
		expect(result).toContainEqual({ name: "x-kc-sdkid", value: "host;name;1.0.0" });
		expect(result).toContainEqual({ name: "retry-after", value: "5" });
	});

	it("Should convert normalized header names from Headers API (lowercase)", () => {
		const headers = new Headers([["X-Custom-Header", "custom-value"]]);
		expect(toSdkHeaders(headers)).toStrictEqual([{ name: "x-custom-header", value: "custom-value" }]);
	});
});

describe("Validation of toFetchHeaders utility function", () => {
	it("Should convert empty Header array to empty Headers", () => {
		const headers: readonly Header[] = [];
		const result = toFetchHeaders(headers);
		expect(toSdkHeaders(result)).toStrictEqual([]);
	});

	it("Should convert single Header to Headers with one entry", () => {
		const headers: readonly Header[] = [{ name: "Content-Type", value: "application/json" }];
		const result = toFetchHeaders(headers);
		expect(toSdkHeaders(result)).toStrictEqual([{ name: "content-type", value: "application/json" }]);
	});

	it("Should convert multiple Headers to Headers", () => {
		const headers: readonly Header[] = [
			{ name: "Content-Type", value: "application/json" },
			{ name: "X-KC-SDKID", value: "host;name;1.0.0" },
			{ name: "Retry-After", value: "5" },
		];
		const result = toFetchHeaders(headers);
		const back = toSdkHeaders(result);
		expect(back).toHaveLength(3);
		expect(back).toContainEqual({ name: "content-type", value: "application/json" });
		expect(back).toContainEqual({ name: "x-kc-sdkid", value: "host;name;1.0.0" });
		expect(back).toContainEqual({ name: "retry-after", value: "5" });
	});

	it("Should preserve header names and values (normalized to lowercase by Headers API)", () => {
		const headers: readonly Header[] = [{ name: "X-Custom-Header", value: "custom-value" }];
		const result = toFetchHeaders(headers);
		expect(toSdkHeaders(result)).toStrictEqual([{ name: "x-custom-header", value: "custom-value" }]);
	});
});

describe("Validation of isApplicationJsonResponseType utility function", () => {
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

	it("Should return false when Content-Type header is missing", () => {
		const headers: readonly Header[] = [{ name: "y", value: "x" }];
		expect(isApplicationJsonResponseType(headers)).toBe(false);
	});

	it("Should return false when Content-Type is not application/json", () => {
		const headers: readonly Header[] = [{ name: "Content-Type" satisfies CommonHeaderNames, value: "text/html" }];
		expect(isApplicationJsonResponseType(headers)).toBe(false);
	});
});
