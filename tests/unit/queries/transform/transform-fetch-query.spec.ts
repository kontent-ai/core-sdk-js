import { describe, expect, it } from "vitest";
import * as z from "zod/mini";
import type { KontentSdkError } from "../../../../lib/models/error.models.js";
import { createFetchQuery } from "../../../../lib/sdk/queries/fetch-sdk-query.js";
import type { FetchQuery } from "../../../../lib/sdk/sdk-models.js";
import { transformFetchQuery } from "../../../../lib/sdk/transform/transform-fetch-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";
import { tryCatchAsync } from "../../../../lib/utils/try-catch.utils.js";

const jsonResponse = { name: "test" };
const extraValue = "added-by-transform";

const buildBaseQuery = (overrides?: { readonly url?: string }): FetchQuery<typeof jsonResponse, KontentSdkError> =>
	createFetchQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ jsonResponse, statusCode: 200 }),
			runtimeValidation: { validateResponses: false },
		},
		sdkInfo: getTestSdkInfo(),
		schema: async () => Promise.resolve(z.object({ name: z.string() })),
		url: overrides?.url ?? "https://domain.com",
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

describe("transformFetchQuery - fetchSafe applies transform that adds extra property", async () => {
	const transformedQuery = transformFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: (response) => ({ ...response, payload: { ...response.payload, extra: extraValue } }),
		transformSchema: async () => Promise.resolve(z.object({ name: z.string(), extra: z.string() })),
		mapError: (error) => error,
	});

	const { success, response } = await transformedQuery.fetchSafe();

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should include the original property from the underlying payload", () => {
		expect(response?.payload.name).toBe("test");
	});

	it("Should include the extra property added by transform", () => {
		expect(response?.payload.extra).toBe(extraValue);
	});
});

describe("transformFetchQuery - fetch applies transform that adds extra property", async () => {
	const transformedQuery = transformFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: (response) => ({ ...response, payload: { ...response.payload, extra: extraValue } }),
		transformSchema: async () => Promise.resolve(z.object({ name: z.string(), extra: z.string() })),
		mapError: (error) => error,
	});

	const response = await transformedQuery.fetch();

	it("Should include the extra property added by transform", () => {
		expect(response.payload.extra).toBe(extraValue);
	});

	it("Should preserve the original property", () => {
		expect(response.payload.name).toBe("test");
	});
});

describe("transformFetchQuery - fetch throws when transform throws", async () => {
	const transformedQuery = transformFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema: async () => Promise.resolve(z.object({ name: z.string() })),
		mapError: (error) => error,
	});

	const { success, error } = await tryCatchAsync(async () => await transformedQuery.fetch());

	it("Should fail", () => {
		expect(success).toBe(false);
	});

	it("Should throw error with transformError reason", () => {
		expect(error).toMatchObject({ details: { reason: "transformError" } });
	});
});

describe("transformFetchQuery - fetchSafe returns failure when transform throws", async () => {
	const transformedQuery = transformFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema: async () => Promise.resolve(z.object({ name: z.string() })),
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with transformError reason", () => {
		expect(error?.details.reason).toBe("transformError");
	});
});

describe("transformFetchQuery - fetchSafe propagates underlying query failure unchanged", async () => {
	const transformedQuery = transformFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ url: "not-a-valid-url" }),
		transform: (response) => response,
		transformSchema: async () => Promise.resolve(z.object({ name: z.string() })),
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return the underlying invalidUrl error", () => {
		expect(error?.details.reason).toBe("invalidUrl");
	});
});

describe("transformFetchQuery - runtime validation passes when transformed payload matches schema", async () => {
	const transformedQuery = transformFetchQuery({
		config: { runtimeValidation: { validateResponses: true } },
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: async () => Promise.resolve(z.object({ name: z.string() })),
		mapError: (error) => error,
	});

	const { success, response } = await transformedQuery.fetchSafe();

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should return the payload", () => {
		expect(response?.payload).toStrictEqual({ name: "test" });
	});
});

describe("transformFetchQuery - runtime validation fails when transformed payload mismatches schema", async () => {
	const transformedQuery = transformFetchQuery({
		config: { runtimeValidation: { validateResponses: true } },
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: async () => Promise.resolve(z.object({ name: z.string().check(z.minLength(50)) })),
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with parsingFailed reason", () => {
		expect(error?.details.reason).toBe("parsingFailed");
	});
});
