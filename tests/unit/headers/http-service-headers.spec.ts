import { afterAll, describe, expect, it, vi } from "vitest";
import { coreSdkInfo } from "../../../lib/core-sdk-info.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { Header, KnownHeaderName } from "../../../lib/models/core.models.js";
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

	const { success, response } = await getDefaultHttpService().request({
		url: "https://domain.com",
		method: "GET",
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Response should not contain content type header for null body", () => {
		expect(response?.requestHeaders.find((m) => m.name.toLowerCase() === "content-type")).toBeUndefined();
	});

	it(`Request should contain '${sdkIdHeader.name}' header`, () => {
		expect(response?.requestHeaders.find((m) => m.name === ("X-KC-SDKID" satisfies KnownHeaderName))?.value).toStrictEqual(
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

	const { success, response } = await getDefaultHttpService().request({
		url: "https://domain.com",
		method: "GET",
		requestHeaders: [
			{
				name: "X-KC-SDKID" satisfies KnownHeaderName,
				value: customSdkId,
			},
		],
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it(`Request should contain only single '${sdkIdHeader.name}' header`, () => {
		expect(
			response?.requestHeaders.filter((m) => m.name.toLowerCase() === ("X-KC-SDKID" satisfies KnownHeaderName).toLowerCase()).length,
		).toStrictEqual(1);
	});

	it(`Request should contain '${sdkIdHeader.name}' header`, () => {
		expect(
			response?.requestHeaders.find((m) => m.name.toLowerCase() === ("X-KC-SDKID" satisfies KnownHeaderName).toLowerCase())?.value,
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
		requestHeaders: [headerB],
	});

	it(`Request should contain header ${headerA.name}`, () => {
		expect(response?.requestHeaders.find((m) => m.name === headerA.name)).toStrictEqual(headerA);
	});

	it(`Request should contain header ${headerB.name} `, () => {
		expect(response?.requestHeaders.find((m) => m.name === headerB.name)).toStrictEqual(headerB);
	});
});

describe("Content-Type header handling", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const contentTypeHeader: Header = {
		name: "Content-Type",
		value: "application/json",
	};

	mockGlobalFetchJsonResponse({
		jsonResponse: {},
		statusCode: 200,
	});

	const { response } = await getDefaultHttpService().request({
		url: "https://domain.com",
		method: "POST",
		body: {},
		requestHeaders: [contentTypeHeader],
	});

	it("Request should contain only a single content type header", () => {
		expect(response?.requestHeaders.filter((m) => m.name.toLowerCase() === "content-type").length).toStrictEqual(1);
	});

	it("Request should preserve provided content type header", () => {
		expect(response?.requestHeaders.find((m) => m.name.toLowerCase() === "content-type")).toStrictEqual(contentTypeHeader);
	});
});
