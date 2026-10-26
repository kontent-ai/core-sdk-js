import * as z from "@zod/mini";
import { describe, expect, it, vi } from "vitest";
import type { ErrorReason, KontentSdkError } from "../../../../../lib/main/models/error.models.js";
import { createFetchQuery } from "../../../../../lib/main/sdk/queries/fetch-sdk-query.js";
import type { FetchQuery } from "../../../../../lib/main/sdk/sdk-models.js";
import { transformFetchQuery } from "../../../../../lib/main/sdk/transform/transform-fetch-query.js";
import { tryCatchAsync } from "../../../../../lib/main/utils/try-catch.utils.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../../lib/testkit/testkit.utils.js";

const jsonResponse = { name: "test" };
const extraValue = "added-by-transform";

const buildBaseQuery = (overrides?: { readonly url?: string }): FetchQuery<typeof jsonResponse, KontentSdkError> =>
	createFetchQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ jsonResponse, statusCode: 200 }),
		},
		sdkInfo: getTestSdkInfo(),
		schema: undefined,
		url: overrides?.url ?? "https://domain.com",
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

describe("transformFetchQuery - fetchSafe applies transform that adds extra property", async () => {
	const transformedQuery = transformFetchQuery({
		query: buildBaseQuery(),
		transform: (response) => ({ ...response, payload: { ...response.payload, extra: extraValue } }),
		transformSchema: undefined,
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
		query: buildBaseQuery(),
		transform: (response) => ({ ...response, payload: { ...response.payload, extra: extraValue } }),
		transformSchema: undefined,
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
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, error } = await tryCatchAsync(async () => await transformedQuery.fetch());

	it("Should fail", () => {
		expect(success).toBe(false);
	});

	it("Should throw error with transformError reason", () => {
		expect(error).toMatchObject({ details: { reason: "transformError" satisfies ErrorReason } });
	});
});

describe("transformFetchQuery - fetchSafe returns failure when transform throws", async () => {
	const transformedQuery = transformFetchQuery({
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with transformError reason", () => {
		expect(error?.details.reason).toBe("transformError" satisfies ErrorReason);
	});
});

describe("transformFetchQuery - fetchSafe propagates underlying query failure unchanged", async () => {
	const transformedQuery = transformFetchQuery({
		query: buildBaseQuery({ url: "not-a-valid-url" }),
		transform: (response) => response,
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return the underlying invalidUrl error", () => {
		expect(error?.details.reason).toBe("invalidUrl" satisfies ErrorReason);
	});
});

describe("transformFetchQuery - runtime validation passes when transformed payload matches schema", async () => {
	const transformedQuery = transformFetchQuery({
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: z.readonly(z.object({ name: z.string() })),
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
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: z.readonly(z.object({ name: z.string().check(z.minLength(50)) })),
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with schemaMismatch reason", () => {
		expect(error?.details.reason).toBe("schemaMismatch" satisfies ErrorReason);
	});
});

describe("transformFetchQuery - resolves a lazy transformSchema factory and validates against it", async () => {
	const transformSchemaFactory = vi.fn(
		async () => await Promise.resolve(z.readonly(z.object({ name: z.string().check(z.minLength(50)) }))),
	);
	const transformedQuery = transformFetchQuery({
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: transformSchemaFactory,
		mapError: (error) => error,
	});

	const { error } = await transformedQuery.fetchSafe();

	it("Should return error with schemaMismatch reason", () => {
		expect(error?.details.reason).toBe("schemaMismatch" satisfies ErrorReason);
	});

	it("Should resolve the factory once", () => {
		expect(transformSchemaFactory).toHaveBeenCalledOnce();
	});
});

describe("transformFetchQuery - skips validation when transformSchema is undefined", async () => {
	const transformedQuery = transformFetchQuery({
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, response } = await transformedQuery.fetchSafe();

	it("Should succeed without running validation", () => {
		expect(success).toBe(true);
	});

	it("Should return the untouched payload", () => {
		expect(response?.payload).toStrictEqual({ name: "test" });
	});
});

describe("transformFetchQuery - accepts a Zod schema passed directly", async () => {
	const transformedQuery = transformFetchQuery({
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: z.readonly(z.object({ name: z.string() })),
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
