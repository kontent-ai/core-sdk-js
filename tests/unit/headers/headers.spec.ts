import { afterAll, describe, expect, it, vi } from "vitest";
import { getFetchJsonMock } from "../../../lib/devkit/test.utils.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import type { CommonHeaderNames, Header } from "../../../lib/models/core.models.js";
import { sdkInfo } from "../../../lib/sdk-info.js";
import { getSdkIdHeader } from "../../../lib/utils/header.utils.js";

const sdkIdHeader = getSdkIdHeader(sdkInfo);

describe("Default headers", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchJsonMock({
		json: {},
		status: 200,
		responseHeaders: [],
	});
	const { success, data, error } = await getDefaultHttpService().requestAsync({
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
		expect(data?.requestHeaders.find((m) => m.name.toLowerCase() === "content-type")?.value).toStrictEqual("application/json");
	});

	it(`Request should contain '${sdkIdHeader.name}' header`, () => {
		expect(data?.requestHeaders.find((m) => m.name === "X-KC-SDKID")?.value).toStrictEqual(sdkIdHeader.value);
	});
});

describe(`SDK tracking header '${sdkIdHeader.name}'`, async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	const customSdkId = "x";

	global.fetch = getFetchJsonMock({
		json: {},
		status: 200,
	});

	const { success, data, error } = await getDefaultHttpService().requestAsync({
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
		expect(data?.requestHeaders.filter((m) => m.name.toLowerCase() === ("X-KC-SDKID" satisfies CommonHeaderNames).toLowerCase()).length).toStrictEqual(1);
	});

	it(`Request should contain '${sdkIdHeader.name}' header`, () => {
		expect(data?.requestHeaders.find((m) => m.name.toLowerCase() === ("X-KC-SDKID" satisfies CommonHeaderNames).toLowerCase())?.value).toStrictEqual(
			customSdkId,
		);
	});
});

describe("Custom Http Service & Request headers", async () => {
	afterAll(() => {
		vi.resetAllMocks();
	});

	global.fetch = getFetchJsonMock({
		json: {},
		status: 200,
	});

	const headerA: Header = {
		name: "A",
		value: "a",
	};

	const headerB: Header = {
		name: "B",
		value: "b",
	};

	const { data } = await getDefaultHttpService({
		requestHeaders: [headerA],
	}).requestAsync({
		url: "https://domain.com",
		method: "GET",
		body: null,
		requestHeaders: [headerB],
	});

	it(`Request should contain header ${headerA.name}`, () => {
		expect(data?.requestHeaders.find((m) => m.name === headerA.name)).toStrictEqual(headerA);
	});

	it(`Request should contain header ${headerB.name} `, () => {
		expect(data?.requestHeaders.find((m) => m.name === headerB.name)).toStrictEqual(headerB);
	});
});
