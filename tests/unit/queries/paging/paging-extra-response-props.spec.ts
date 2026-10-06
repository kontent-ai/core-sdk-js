import { describe, expect, it, vi } from "vitest";
import type { JsonValue } from "../../../../lib/models/json.models.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import type { QueryResponse } from "../../../../lib/sdk/sdk-models.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";

const pageCount = 2;

const buildPagedQuery = <TPagingExtra>(mapPagingExtraResponseProps: (responses: readonly QueryResponse<JsonValue>[]) => TPagingExtra) => {
	let index = 0;
	return createPagedFetchQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({ jsonResponse: null, statusCode: 200 }),
		},
		sdkInfo: getTestSdkInfo(),
		schema: undefined,
		url: "https://domain.com",
		getNextPageData: () => {
			index++;
			return index < pageCount ? { continuationToken: `token-${index}` } : {};
		},
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		mapPagingExtraResponseProps,
	});
};

const countPages = (responses: readonly QueryResponse<JsonValue>[]) => ({ pageCount: responses.length });

describe("Paging extras - fetchAllPages", async () => {
	const mapPagingExtraResponseProps = vi.fn(countPages);
	const result = await buildPagedQuery(mapPagingExtraResponseProps).fetchAllPages();

	it("Should call mapPagingExtraResponseProps exactly once with all responses", () => {
		expect(mapPagingExtraResponseProps).toHaveBeenCalledOnce();
		expect(mapPagingExtraResponseProps.mock.calls[0]?.[0]).toHaveLength(pageCount);
	});

	it("Should include the paging extras in the result", () => {
		expect(result.pageCount).toBe(pageCount);
	});
});

describe("Paging extras - fetchAllPagesSafe", async () => {
	const mapPagingExtraResponseProps = vi.fn(countPages);
	const result = await buildPagedQuery(mapPagingExtraResponseProps).fetchAllPagesSafe();

	it("Should call mapPagingExtraResponseProps exactly once with all responses", () => {
		expect(mapPagingExtraResponseProps).toHaveBeenCalledOnce();
		expect(mapPagingExtraResponseProps.mock.calls[0]?.[0]).toHaveLength(pageCount);
	});

	it("Should include the paging extras in the result", () => {
		expect(result.success).toBe(true);
		expect(result.pageCount).toBe(pageCount);
	});
});

describe("Paging extras - cannot override the SDK-owned result properties", async () => {
	const overridingMapper = () => ({ responses: [], success: false });

	const allPages = await buildPagedQuery(overridingMapper).fetchAllPages();
	const allPagesSafe = await buildPagedQuery(overridingMapper).fetchAllPagesSafe();

	it("fetchAllPages should keep the fetched responses", () => {
		expect(allPages.responses).toHaveLength(pageCount);
	});

	it("fetchAllPagesSafe should keep the fetched responses and success flag", () => {
		expect(allPagesSafe.success).toBe(true);
		expect(allPagesSafe.responses).toHaveLength(pageCount);
	});
});
