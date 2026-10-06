import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import type { HttpService } from "../../../lib/http/http.models.js";
import type { Header, KnownHeaderName } from "../../../lib/models/core.models.js";
import type { ErrorReason } from "../../../lib/models/error.models.js";
import { inspectQuery, resolveQuery } from "../../../lib/sdk/resolve-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo, stubFetchWithResponse } from "../../../lib/testkit/testkit.utils.js";
import { createAuthorizationHeader, createSdkIdHeader } from "../../../lib/utils/header.utils.js";

describe("resolveQuery - invalid baseUrl host", async () => {
	const { error } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: { baseUrl: { protocol: "https", host: "not a valid host" } },
		schema: undefined,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	it(`Error reason should be '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});

describe("resolveQuery - valid response matching zod schema", async () => {
	const schema = z.object({ name: z.string() }).readonly();
	const jsonResponse = { name: "test" };

	const { success, response } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse }),
			runtimeValidation: { validateResponses: true },
		},
		schema,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should return the parsed payload", () => {
		expect(response?.payload).toStrictEqual(jsonResponse);
	});
});

describe("resolveQuery - response not matching zod schema", async () => {
	const schema = z.object({ name: z.string() }).readonly();

	const { error } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: { name: 123 } }),
			runtimeValidation: { validateResponses: true },
		},
		schema,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	it(`Error reason should be '${"schemaMismatch" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("schemaMismatch" satisfies ErrorReason);
	});
});

describe("resolveQuery - validation is skipped when schema is undefined", async () => {
	const jsonResponse = { name: 123 };

	const { success, response } = await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse }),
			runtimeValidation: { validateResponses: true },
		},
		schema: undefined,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	it("Should succeed without running validation", () => {
		expect(success).toBe(true);
	});

	it("Should return the unvalidated payload", () => {
		expect(response?.payload).toStrictEqual(jsonResponse);
	});
});

describe("resolveQuery - custom httpService from config is used", async () => {
	const customHttpService = getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: null });
	const requestSpy = vi.spyOn(customHttpService, "request" satisfies keyof HttpService);

	await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		config: { httpService: customHttpService },
		schema: undefined,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	it("Should call request on the provided httpService", () => {
		expect(requestSpy).toHaveBeenCalledOnce();
	});
});

describe("resolveQuery - authorization header is applied", async () => {
	const apiKey = "my-api-key";
	const httpService = getTestHttpServiceWithJsonResponse({ statusCode: 200, jsonResponse: null });
	const requestSpy = vi.spyOn(httpService, "request" satisfies keyof HttpService);

	await resolveQuery({
		method: "GET",
		url: "https://domain.com",
		body: null,
		authorizationApiKey: apiKey,
		config: { httpService },
		schema: undefined,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	it("Should include the authorization header in the request", () => {
		const requestHeaders = requestSpy.mock.calls[0]?.[0]?.requestHeaders;
		expect(requestHeaders).toContainEqual(createAuthorizationHeader(apiKey));
	});
});

describe("resolveQuery - default httpService is used when none provided in config", () => {
	it("Should use the default httpService and succeed", async () => {
		stubFetchWithResponse(() => Response.json(null));

		const { success } = await resolveQuery({
			method: "GET",
			url: "https://domain.com",
			body: null,
			config: {},
			schema: undefined,
			sdkInfo: getTestSdkInfo(),
			mapMetadata: () => ({}),
			mapError: (error) => error,
			mapExtraResponseProps: () => ({}),
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
		schema: undefined,
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => ({}),
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

	it(`Error reason should be '${"invalidUrl" satisfies ErrorReason}'`, () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});

describe("inspectQuery - SDK-managed headers take precedence over request headers regardless of casing", () => {
	const apiKey = "sdk-api-key";
	const customHeader: Header = { name: "X-Custom", value: "custom" };
	const callerAuthorizationHeader: Header = { name: "authorization", value: "Bearer caller-token" };

	const getRequestHeaders = ({
		requestHeaders,
		authorizationApiKey,
	}: {
		readonly requestHeaders: readonly Header[];
		readonly authorizationApiKey?: string;
	}): readonly Header[] => {
		const { success, data } = inspectQuery({
			method: "GET",
			url: "https://domain.com",
			body: null,
			config: {},
			sdkInfo: getTestSdkInfo(),
			requestHeaders,
			authorizationApiKey,
			mapError: (error) => error,
		});
		if (!success) {
			throw new Error("Expected query inspection to succeed");
		}
		return data.requestHeaders;
	};

	const findAllByName = (headers: readonly Header[], name: KnownHeaderName): readonly Header[] =>
		headers.filter((header) => header.name.toLowerCase() === name.toLowerCase());

	it("Should replace a lowercase caller SDK id header with the SDK's own", () => {
		const headers = getRequestHeaders({ requestHeaders: [{ name: "x-kc-sdkid", value: "caller;sdk;0.0.1" }] });

		expect(findAllByName(headers, "X-KC-SDKID")).toStrictEqual([createSdkIdHeader(getTestSdkInfo())]);
	});

	it("Should replace a caller authorization header when an API key is provided", () => {
		const headers = getRequestHeaders({ requestHeaders: [callerAuthorizationHeader], authorizationApiKey: apiKey });

		expect(findAllByName(headers, "Authorization")).toStrictEqual([createAuthorizationHeader(apiKey)]);
	});

	it("Should keep a caller authorization header when no API key is provided", () => {
		const headers = getRequestHeaders({ requestHeaders: [callerAuthorizationHeader] });

		expect(findAllByName(headers, "Authorization")).toStrictEqual([callerAuthorizationHeader]);
	});

	it("Should keep unrelated caller headers", () => {
		const headers = getRequestHeaders({ requestHeaders: [customHeader] });

		expect(headers).toContainEqual(customHeader);
	});
});
