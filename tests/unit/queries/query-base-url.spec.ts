import { describe, expect, it } from "vitest";
import z from "zod";
import { prepareQueryData } from "../../../lib/sdk/resolve-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

describe("Query base url with https protocol", () => {
	const { data } = prepareQueryData({
		config: {
			baseUrl: { protocol: "https", host: "kontent.ai" },
			httpService: getTestHttpServiceWithJsonResponse({
				jsonResponse: null,
				statusCode: 200,
			}),
		},
		url: new URL("https://domain.com/api/path"),
		body: null,
		method: "GET",
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		abortSignal: undefined,
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	it("Should override base url of the url", () => {
		expect(data?.url).toStrictEqual(new URL("https://kontent.ai/api/path"));
	});
});

describe("Query base url with http protocol", () => {
	const { data } = prepareQueryData({
		config: {
			baseUrl: { protocol: "http", host: "kontent.ai" },
			httpService: getTestHttpServiceWithJsonResponse({
				jsonResponse: null,
				statusCode: 200,
			}),
		},
		url: new URL("https://domain.com/api/path"),
		body: null,
		method: "GET",
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		abortSignal: undefined,
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	it("Should override base url of the url", () => {
		expect(data?.url).toStrictEqual(new URL("http://kontent.ai/api/path"));
	});
});

describe("Query base url with host including port", () => {
	const { data } = prepareQueryData({
		config: {
			baseUrl: { protocol: "http", host: "localhost:3000" },
			httpService: getTestHttpServiceWithJsonResponse({
				jsonResponse: null,
				statusCode: 200,
			}),
		},
		url: new URL("https://domain.com/api/path"),
		body: null,
		method: "GET",
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		abortSignal: undefined,
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	it("Should override base url of the url", () => {
		expect(data?.url).toStrictEqual(new URL("http://localhost:3000/api/path"));
	});
});
