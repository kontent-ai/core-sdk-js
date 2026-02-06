import { afterAll, describe, expect, it, vi } from "vitest";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { CommonHeaderNames, Header } from "../../../lib/models/core.models.js";
import { sdkInfo } from "../../../lib/sdk-info.js";
import { mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import { getRetryAfterHeaderValue, getSdkIdHeader } from "../../../lib/utils/header.utils.js";

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
