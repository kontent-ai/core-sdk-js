import { afterEach, describe, expect, it, vi } from "vitest";
import z from "zod";
import type { ErrorReason } from "../../../lib/models/error.models.js";
import { resolveQuery } from "../../../lib/sdk/resolve-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";
import { createAuthorizationHeader } from "../../../lib/utils/header.utils.js";

describe("resolveQuery - invalid baseUrl host", async () => {
	const { error } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: { baseUrl: { protocol: "https", host: "not a valid host" } },
		zodSchema: async () => Promise.resolve(z.null()),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => payload,
	});

	it(`Error reason should be '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});

describe("resolveQuery - valid response matching zod schema", async () => {
	const zodSchema = z.object({ name: z.string() });
	const jsonResponse = { name: "test" };

	const { success, response } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse }),
			runtimeValidation: { validateResponses: true },
		},
		zodSchema: async () => Promise.resolve(zodSchema),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => payload,
	});

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should return the parsed payload", () => {
		expect(response?.payload).toStrictEqual(jsonResponse);
	});
});

describe("resolveQuery - response not matching zod schema", async () => {
	const zodSchema = z.object({ name: z.string() });

	const { error } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: { name: 123 } }),
			runtimeValidation: { validateResponses: true },
		},
		zodSchema: async () => Promise.resolve(zodSchema),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => payload,
	});

	it(`Error reason should be '${"parsingFailed" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("parsingFailed" satisfies ErrorReason);
	});
});

describe("resolveQuery - custom httpService from config is used", async () => {
	const customHttpService = getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: null });
	const requestSpy = vi.spyOn(customHttpService, "request");

	await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: { httpService: customHttpService },
		zodSchema: async () => Promise.resolve(z.null()),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => payload,
	});

	it("Should call request on the provided httpService", () => {
		expect(requestSpy).toHaveBeenCalledOnce();
	});
});

describe("resolveQuery - authorization header is applied", async () => {
	const apiKey = "my-api-key";
	const httpService = getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: null });
	const requestSpy = vi.spyOn(httpService, "request");

	await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		authorizationApiKey: apiKey,
		config: { httpService },
		zodSchema: async () => Promise.resolve(z.null()),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => payload,
	});

	it("Should include the authorization header in the request", () => {
		const requestHeaders = requestSpy.mock.calls[0]?.[0]?.requestHeaders;
		expect(requestHeaders).toContainEqual(createAuthorizationHeader(apiKey));
	});
});

describe("resolveQuery - default httpService is used when none provided in config", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("Should use the default httpService and succeed", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
			...({} as Response),
			ok: true,
			status: 200,
			statusText: "OK",
			headers: new Headers({ "Content-Type": "application/json" }),
			json: async () => await Promise.resolve(null),
		});

		const { success } = await resolveQuery({
			method: "GET",
			url: "https://domain.com",
			body: null,
			config: {},
			zodSchema: async () => Promise.resolve(z.null()),
			sdkInfo: getTestSdkInfo(),
			mapMetadata: () => ({}),
			mapError: (error) => error,
			mapExtraResponseProps: () => ({}),
			transformPayload: (payload) => payload,
		});

		expect(success).toBe(true);
	});
});

describe("resolveQuery - invalid URL", async () => {
	const { error } = await resolveQuery({
		method: "GET",
		url: "not-a-valid-url",
		body: null,
		config: {},
		zodSchema: async () => Promise.resolve(z.null()),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => payload,
	});

	it(`Error reason should be '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});

describe("resolveQuery - custom transformPayload adds extra property to payload", async () => {
	const zodSchema = z.object({ name: z.string() });
	const jsonResponse = { name: "test" };
	const extraValue = "added-by-transform";

	const { success, response } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse }),
			runtimeValidation: { validateResponses: true },
		},
		zodSchema: async () => Promise.resolve(zodSchema),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		transformPayload: (payload) => ({ ...payload, extra: extraValue }),
	});

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should include the extra property added by transformPayload", () => {
		expect(response?.payload).toStrictEqual({ ...jsonResponse, extra: extraValue });
	});
});
