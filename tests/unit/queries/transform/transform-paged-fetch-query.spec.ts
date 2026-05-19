import { describe, expect, it } from "vitest";
import * as z from "zod/mini";
import type { KontentSdkError } from "../../../../lib/models/error.models.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import type { PagedFetchQuery, QueryResponse, SafeQueryResult } from "../../../../lib/sdk/sdk-models.js";
import { transformPagedFetchQuery } from "../../../../lib/sdk/transform/transform-paged-fetch-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";
import { tryCatchAsync } from "../../../../lib/utils/try-catch.utils.js";

type PagePayload = { readonly name: string };

const extraValue = "added-by-transform";
const defaultPages: readonly PagePayload[] = [{ name: "page-0" }];
const multiPages: readonly PagePayload[] = [{ name: "page-0" }, { name: "page-1" }, { name: "page-2" }];

const buildBaseQuery = (options?: {
	readonly pages?: readonly PagePayload[];
	readonly url?: string;
}): PagedFetchQuery<PagePayload, KontentSdkError> => {
	const pages = options?.pages ?? defaultPages;
	let index = 0;
	return createPagedFetchQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({
				jsonResponse: async () => pages[index] ?? { name: "fallback" },
				statusCode: 200,
			}),
			runtimeValidation: { validateResponses: false },
		},
		sdkInfo: getTestSdkInfo(),
		schema: async () => Promise.resolve(z.object({ name: z.string() })),
		url: options?.url ?? "https://domain.com",
		getNextPageData: () => {
			index++;
			if (index < pages.length) {
				return { continuationToken: `tok-${index}` };
			}
			return {};
		},
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		mapPagingExtraResponseProps: () => ({}),
	});
};

const transformSchema = async () => Promise.resolve(z.object({ name: z.string(), extra: z.string() }));
const identitySchema = async () => Promise.resolve(z.object({ name: z.string() })) as unknown as Promise<z.ZodMiniType<PagePayload>>;

describe("transformPagedFetchQuery - fetchPage applies transform that adds extra property", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema,
		mapError: (error) => error,
	});

	const response = await transformedQuery.fetchPage();

	it("Should include the extra property added by transform", () => {
		expect(response.payload.extra).toBe(extraValue);
	});

	it("Should preserve the original property", () => {
		expect(response.payload.name).toBe("page-0");
	});
});

describe("transformPagedFetchQuery - fetchPage throws when transform throws", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema,
		mapError: (error) => error,
	});

	const { error } = await tryCatchAsync(async () => await transformedQuery.fetchPage());

	it("Should throw error with transformError reason", () => {
		expect(error).toMatchObject({ details: { reason: "transformError" } });
	});
});

describe("transformPagedFetchQuery - fetchPageSafe applies transform that adds extra property", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema,
		mapError: (error) => error,
	});

	const { success, response } = await transformedQuery.fetchPageSafe();

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should include the extra property added by transform", () => {
		expect(response?.payload.extra).toBe(extraValue);
	});
});

describe("transformPagedFetchQuery - fetchPageSafe propagates underlying failure unchanged", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ url: "not-a-valid-url" }),
		transform: (responses) => responses,
		transformSchema: identitySchema,
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchPageSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return the underlying invalidUrl error", () => {
		expect(error?.details.reason).toBe("invalidUrl");
	});
});

describe("transformPagedFetchQuery - fetchPageSafe returns failure when transform throws", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => {
			throw new Error();
		},
		transformSchema,
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchPageSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with transformError reason", () => {
		expect(error?.details.reason).toBe("transformError");
	});
});

describe("transformPagedFetchQuery - fetchPage throws when transform returns empty array", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => [],
		transformSchema,
		mapError: (error) => error,
	});

	const { error } = await tryCatchAsync(async () => await transformedQuery.fetchPage());

	it("Should throw error with transformError reason", () => {
		expect(error).toMatchObject({ details: { reason: "transformError" } });
	});
});

describe("transformPagedFetchQuery - fetchPageSafe returns failure when transform returns empty array", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery(),
		transform: () => [],
		transformSchema,
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchPageSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with transformError reason", () => {
		expect(error?.details.reason).toBe("transformError");
	});
});

describe("transformPagedFetchQuery - fetchAllPages applies transform across multiple pages", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema,
		mapError: (error) => error,
	});

	const result = await transformedQuery.fetchAllPages();

	it("Should return one response per page", () => {
		expect(result.responses).toHaveLength(multiPages.length);
	});

	it("Should add the extra property to every page", () => {
		for (const response of result.responses) {
			expect(response.payload.extra).toBe(extraValue);
		}
	});

	it("Should preserve each page's original name", () => {
		const names = result.responses.map((r) => r.payload.name);
		expect(names).toStrictEqual(multiPages.map((p) => p.name));
	});
});

describe("transformPagedFetchQuery - fetchAllPages throws when transform throws", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: () => {
			throw new Error();
		},
		transformSchema,
		mapError: (error) => error,
	});

	const { error } = await tryCatchAsync(async () => await transformedQuery.fetchAllPages());

	it("Should throw error with transformError reason", () => {
		expect(error).toMatchObject({ details: { reason: "transformError" } });
	});
});

describe("transformPagedFetchQuery - fetchAllPagesSafe applies transform across multiple pages", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema,
		mapError: (error) => error,
	});

	const result = await transformedQuery.fetchAllPagesSafe();

	it("Should succeed", () => {
		expect(result.success).toBe(true);
	});

	it("Should return one transformed response per page", () => {
		expect(result.responses).toHaveLength(multiPages.length);
	});

	it("Should add the extra property to every page", () => {
		for (const response of result.responses ?? []) {
			expect(response.payload.extra).toBe(extraValue);
		}
	});
});

describe("transformPagedFetchQuery - fetchAllPagesSafe propagates underlying failure unchanged", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ url: "not-a-valid-url" }),
		transform: (responses) => responses,
		transformSchema: identitySchema,
		mapError: (error) => error,
	});

	const result = await transformedQuery.fetchAllPagesSafe();

	it("Should not succeed", () => {
		expect(result.success).toBe(false);
	});

	it("Should return the underlying invalidUrl error", () => {
		expect(result.error?.details.reason).toBe("invalidUrl");
	});
});

describe("transformPagedFetchQuery - fetchAllPagesSafe returns failure when transform throws", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: () => {
			throw new Error();
		},
		transformSchema,
		mapError: (error) => error,
	});

	const result = await transformedQuery.fetchAllPagesSafe();

	it("Should not succeed", () => {
		expect(result.success).toBe(false);
	});

	it("Should return error with transformError reason", () => {
		expect(result.error?.details.reason).toBe("transformError");
	});
});

describe("transformPagedFetchQuery - pages async iterator applies transform across multiple pages", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema,
		mapError: (error) => error,
	});

	const collected: QueryResponse<{ name: string; extra: string }, unknown, unknown>[] = [];
	for await (const response of transformedQuery.pages()) {
		collected.push(response);
	}

	it("Should yield one transformed response per page", () => {
		expect(collected).toHaveLength(multiPages.length);
	});

	it("Should add the extra property to every yielded page", () => {
		for (const response of collected) {
			expect(response.payload.extra).toBe(extraValue);
		}
	});
});

describe("transformPagedFetchQuery - pages async iterator throws when transform throws", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: () => {
			throw new Error();
		},
		transformSchema,
		mapError: (error) => error,
	});

	const { error } = await tryCatchAsync(async () => {
		for await (const _ of transformedQuery.pages()) {
			// drain
		}
	});

	it("Should throw error with transformError reason", () => {
		expect(error).toMatchObject({ details: { reason: "transformError" } });
	});
});

describe("transformPagedFetchQuery - pagesSafe async iterator applies transform across multiple pages", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema,
		mapError: (error) => error,
	});

	const collected: SafeQueryResult<QueryResponse<{ name: string; extra: string }, unknown, unknown>, KontentSdkError>[] = [];
	for await (const result of transformedQuery.pagesSafe()) {
		collected.push(result);
	}

	it("Should yield one transformed result per page", () => {
		expect(collected).toHaveLength(multiPages.length);
	});

	it("Should mark every result as successful", () => {
		for (const result of collected) {
			expect(result.success).toBe(true);
		}
	});

	it("Should add the extra property to every yielded result", () => {
		for (const result of collected) {
			expect(result.response?.payload.extra).toBe(extraValue);
		}
	});
});

describe("transformPagedFetchQuery - pagesSafe async iterator yields underlying failure", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ url: "not-a-valid-url" }),
		transform: (responses) => responses,
		transformSchema: identitySchema,
		mapError: (error) => error,
	});

	const collected: SafeQueryResult<QueryResponse<PagePayload, unknown, unknown>, KontentSdkError>[] = [];
	for await (const result of transformedQuery.pagesSafe()) {
		collected.push(result);
	}

	it("Should yield exactly one result", () => {
		expect(collected).toHaveLength(1);
	});

	it("Should yield a failure with the underlying invalidUrl error", () => {
		expect(collected[0]?.success).toBe(false);
		expect(collected[0]?.error?.details.reason).toBe("invalidUrl");
	});
});

describe("transformPagedFetchQuery - pagesSafe async iterator yields transform failure", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: () => {
			throw new Error();
		},
		transformSchema,
		mapError: (error) => error,
	});

	const collected: SafeQueryResult<QueryResponse<{ name: string; extra: string }, unknown, unknown>, KontentSdkError>[] = [];
	for await (const result of transformedQuery.pagesSafe()) {
		collected.push(result);
	}

	it("Should yield exactly one result then stop", () => {
		expect(collected).toHaveLength(1);
	});

	it("Should yield a failure with transformError reason", () => {
		expect(collected[0]?.success).toBe(false);
		expect(collected[0]?.error?.details.reason).toBe("transformError");
	});
});

describe("transformPagedFetchQuery - runtime validation passes when transformed payload matches schema", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: true } },
		query: buildBaseQuery(),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema,
		mapError: (error) => error,
	});

	const { success, response } = await transformedQuery.fetchPageSafe();

	it("Should succeed", () => {
		expect(success).toBe(true);
	});

	it("Should return the transformed payload", () => {
		expect(response?.payload).toStrictEqual({ name: "page-0", extra: extraValue });
	});
});

describe("transformPagedFetchQuery - runtime validation fails when transformed payload mismatches schema", async () => {
	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: true } },
		query: buildBaseQuery(),
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } })),
		transformSchema: async () => Promise.resolve(z.object({ name: z.string(), extra: z.string().check(z.minLength(50)) })),
		mapError: (error) => error,
	});

	const { success, error } = await transformedQuery.fetchPageSafe();

	it("Should not succeed", () => {
		expect(success).toBe(false);
	});

	it("Should return error with parsingFailed reason", () => {
		expect(error?.details.reason).toBe("parsingFailed");
	});
});

describe("transformPagedFetchQuery - fetchAllPages invokes transform exactly once with all page responses", async () => {
	const recordedLengths: number[] = [];

	const transformedQuery = transformPagedFetchQuery({
		config: { runtimeValidation: { validateResponses: false } },
		query: buildBaseQuery({ pages: multiPages }),
		transform: (responses) => {
			recordedLengths.push(responses.length);
			return responses.map((r) => ({ ...r, payload: { ...r.payload, extra: extraValue } }));
		},
		transformSchema,
		mapError: (error) => error,
	});

	const result = await transformedQuery.fetchAllPages();

	it("Should invoke the transform exactly once with all page responses", () => {
		expect(recordedLengths).toStrictEqual([multiPages.length]);
	});

	it("Should still return one transformed response per page", () => {
		expect(result.responses).toHaveLength(multiPages.length);
	});
});
