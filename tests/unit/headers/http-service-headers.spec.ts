import { afterAll, describe, expect, it, vi } from "vitest";
import { coreSdkInfo } from "../../../lib/core-sdk-info.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { CommonHeaderNames, Header } from "../../../lib/models/core.models.js";
import { mockGlobalFetchJsonResponse } from "../../../lib/testkit/testkit.utils.js";
import { getSdkIdHeader } from "../../../lib/utils/header.utils.js";

const sdkIdHeader = getSdkIdHeader(coreSdkInfo);

describe("Default headers", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	mockGlobalFetchJsonResponse({
		jsonResponse: {},
		statusCode: 200,
	});

	const { success, response, error } = await getDefaultHttpService().request({
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

	const { success, response, error } = await getDefaultHttpService().request({
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
	}).request({
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
