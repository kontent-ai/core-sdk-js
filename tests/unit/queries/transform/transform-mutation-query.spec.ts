import { describe, expect, it } from "vitest";
import * as z from "zod/mini";
import type { KontentSdkError } from "../../../../lib/models/error.models.js";
import { createMutationQuery } from "../../../../lib/sdk/queries/mutation-sdk-query.js";
import type { MutationQuery } from "../../../../lib/sdk/sdk-models.js";
import { transformMutationQuery } from "../../../../lib/sdk/transform/transform-mutation-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";
import { tryCatchAsync } from "../../../../lib/utils/try-catch.utils.js";

const jsonResponse = { name: "test" };
const extraValue = "added-by-transform";

const buildBaseQuery = (overrides?: { readonly url?: string }): MutationQuery<typeof jsonResponse, KontentSdkError> =>
	createMutationQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ jsonResponse, statusCode: 200 }),
			runtimeValidation: { validateResponses: false },
		},
		sdkInfo: getTestSdkInfo(),
		schema: undefined,
		method: "POST",
		url: overrides?.url ?? "https://domain.com",
		body: null,
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	});

describe("transformMutationQuery - executeSafe applies transform that adds extra property", async () => {
	const transformedQuery = transformMutationQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: (response) => ({ ...response, payload: { ...response.payload, extra: extraValue } }),
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, response } = await transformedQuery.executeSafe();

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

describe("transformMutationQuery - execute applies transform that adds extra property", async () => {
	const transformedQuery = transformMutationQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: (response) => ({ ...response, payload: { ...response.payload, extra: extraValue } }),
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const response = await transformedQuery.execute();

	it("Should include the extra property added by transform", () => {
		expect(response.payload.extra).toBe(extraValue);
	});

	it("Should preserve the original property", () => {
		expect(response.payload.name).toBe("test");
	});
});

describe("transformMutationQuery - execute throws when transform throws", async () => {
	const transformedQuery = transformMutationQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, error } = await tryCatchAsync(async () => await transformedQuery.execute());

	it("Should fail", () => {
		expect(success).toBe(false);
	});

	it("Should throw error with transformError reason", () => {
		expect(error).toMatchObject({ details: { reason: "transformError" } });
	});
});

describe("transformMutationQuery - executeSafe returns failure when transform throws", async () => {
	const transformedQuery = transformMutationQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.executeSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with transformError reason", () => {
		expect(error?.details.reason).toBe("transformError");
	});
});

describe("transformMutationQuery - executeSafe propagates underlying query failure unchanged", async () => {
	const transformedQuery = transformMutationQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ url: "not-a-valid-url" }),
		transform: (response) => response,
		transformSchema: undefined,
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.executeSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return the underlying invalidUrl error", () => {
		expect(error?.details.reason).toBe("invalidUrl");
	});
});

describe("transformMutationQuery - runtime validation passes when transformed payload matches schema", async () => {
	const transformedQuery = transformMutationQuery({
		config: { runtimeValidation: { validateResponses: true } },
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: z.object({ name: z.string() }),
		mapError: (error) => error,
	});

	const { success, response } = await transformedQuery.executeSafe();

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should return the payload", () => {
		expect(response?.payload).toStrictEqual({ name: "test" });
	});
});

describe("transformMutationQuery - runtime validation fails when transformed payload mismatches schema", async () => {
	const transformedQuery = transformMutationQuery({
		config: { runtimeValidation: { validateResponses: true } },
		query: buildBaseQuery(),
		transform: (response) => response,
		transformSchema: z.object({ name: z.string().check(z.minLength(50)) }),
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.executeSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with parsingFailed reason", () => {
		expect(error?.details.reason).toBe("parsingFailed");
	});
});
