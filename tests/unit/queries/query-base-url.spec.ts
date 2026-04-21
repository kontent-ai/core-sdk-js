import { describe, expect, it } from "vitest";
import z from "zod";
import { prepareQueryData } from "../../../lib/sdk/resolve-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

describe("Query base url with absolute base url", () => {
	const { data } = prepareQueryData({
		config: {
			baseUrl: "https://kontent.ai",
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

describe("Query base url with hostname only", () => {
	const { data } = prepareQueryData({
		config: {
			baseUrl: "kontent.ai",
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
			baseUrl: "http://kontent.ai",
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
