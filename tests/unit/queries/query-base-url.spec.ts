import { describe, expect, it } from "vitest";
import z from "zod";
import { resolveQuery } from "../../../lib/sdk/resolve-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

describe("Query base url with absolute base url", async () => {
	const { success, response, error } = await resolveQuery({
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

	if (!success) {
		throw error;
	}

	it("Should override base url of the url", () => {
		expect(response?.meta.url).toBe("https://kontent.ai/api/path");
	});
});

describe("Query base url with hostname only", async () => {
	const { success, response, error } = await resolveQuery({
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

	if (!success) {
		throw error;
	}

	it("Should override base url of the url", () => {
		expect(response?.meta.url).toBe("https://kontent.ai/api/path");
	});
});

describe("Query base url with http protocol", async () => {
	const { success, response, error } = await resolveQuery({
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

	if (!success) {
		throw error;
	}

	it("Should override base url of the url", () => {
		expect(response?.meta.url).toBe("http://kontent.ai/api/path");
	});
});
