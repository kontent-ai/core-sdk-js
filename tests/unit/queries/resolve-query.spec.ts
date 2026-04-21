import { afterEach, describe, expect, it, vi } from "vitest";
import z from "zod";
import type { ErrorReason } from "../../../lib/models/error.models.js";
import { prepareQueryData, resolveQuery } from "../../../lib/sdk/resolve-query.js";
import type { BaseUrl } from "../../../lib/sdk/sdk-models.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";
import { createAuthorizationHeader } from "../../../lib/utils/header.utils.js";

describe("prepareQuery - invalid baseUrl", () => {
	const { error } = prepareQueryData({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: { baseUrl: "not a valid base url" as unknown as BaseUrl },
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	it(`Error reason should be '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});

describe("prepareQuery - invalid baseUrl starting with https", () => {
	const { error } = prepareQueryData({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: { baseUrl: "https://not a valid base url" },
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	it(`Error reason should be '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});

describe("resolveQuery - valid response matching zod schema", async () => {
	const zodSchema = z.object({ name: z.string() });
	const jsonResponse = { name: "test" };

	const prepared = prepareQueryData({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse }),
			responseValidation: { enable: true },
		},
		zodSchema,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	if (!prepared.success) {
		throw prepared.error;
	}
	const { success, response } = await resolveQuery(prepared.data);

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should return the parsed payload", () => {
		expect(response?.payload).toStrictEqual(jsonResponse);
	});
});

describe("resolveQuery - response not matching zod schema", async () => {
	const zodSchema = z.object({ name: z.string() });

	const prepared = prepareQueryData({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: { name: 123 } }),
			responseValidation: { enable: true },
		},
		zodSchema,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	if (!prepared.success) {
		throw prepared.error;
	}
	const { error } = await resolveQuery(prepared.data);

	it(`Error reason should be '${"validationFailed" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("validationFailed" satisfies ErrorReason);
	});
});

describe("resolveQuery - custom httpService from config is used", async () => {
	const customHttpService = getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: null });
	const requestSpy = vi.spyOn(customHttpService, "request");

	const prepared = prepareQueryData({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: { httpService: customHttpService },
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	if (!prepared.success) {
		throw prepared.error;
	}
	await resolveQuery(prepared.data);

	it("Should call request on the provided httpService", () => {
		expect(requestSpy).toHaveBeenCalledOnce();
	});
});

describe("resolveQuery - authorization header is applied", async () => {
	const apiKey = "my-api-key";
	const httpService = getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: null });
	const requestSpy = vi.spyOn(httpService, "request");

	const prepared = prepareQueryData({
		method: "GET",
		url: "https://domain.com",
		body: null,
		authorizationApiKey: apiKey,
		config: { httpService },
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	if (!prepared.success) {
		throw prepared.error;
	}
	await resolveQuery(prepared.data);

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

		const prepared = prepareQueryData({
			method: "GET",
			url: "https://domain.com",
			body: null,
			config: {},
			zodSchema: z.null(),
			sdkInfo: getTestSdkInfo(),
			mapMetadata: () => ({}),
			mapError: (error) => error,
		});

		if (!prepared.success) {
			throw prepared.error;
		}
		const { success } = await resolveQuery(prepared.data);

		expect(success).toBe(true);
	});
});

describe("prepareQuery - invalid URL", () => {
	const { error } = prepareQueryData({
		method: "GET",
		url: "not-a-valid-url",
		body: null,
		config: {},
		zodSchema: z.null(),
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
	});

	it(`Error reason should be '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});
