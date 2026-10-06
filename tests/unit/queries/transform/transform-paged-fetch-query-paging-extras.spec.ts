import { describe, expect, it } from "vitest";
import type { KontentSdkError } from "../../../../lib/models/error.models.js";
import { createPagedFetchQuery } from "../../../../lib/sdk/queries/paged-fetch-sdk-query.js";
import type { PagedFetchQuery } from "../../../../lib/sdk/sdk-models.js";
import { transformPagedFetchQuery } from "../../../../lib/sdk/transform/transform-paged-fetch-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";

type PagePayload = { readonly name: string };
type PagingExtra = { readonly allNames: readonly string[] };

const originalNames: readonly string[] = ["page-0", "page-1"];
const transformedNames: readonly string[] = ["PAGE-0", "PAGE-1"];
const pages: readonly PagePayload[] = originalNames.map((name) => ({ name }));

const buildQueryWithPayloadDerivedExtras = (): PagedFetchQuery<PagePayload, KontentSdkError, unknown, unknown, PagingExtra> => {
	let index = 0;
	return createPagedFetchQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({
				jsonResponse: async () => pages[index] ?? { name: "n/a" },
				statusCode: 200,
			}),
		},
		sdkInfo: getTestSdkInfo(),
		schema: undefined,
		url: "https://domain.com",
		getNextPageData: () => {
			index++;
			return index < pages.length ? { continuationToken: `token-${index}` } : {};
		},
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
		// paging extra derived from the payload of all pages
		mapPagingExtraResponseProps: (responses) => ({ allNames: responses.map((r) => r.payload.name) }),
	});
};

const buildTransformedQuery = () =>
	transformPagedFetchQuery({
		config: {},
		query: buildQueryWithPayloadDerivedExtras(),
		// here we convert the payload to uppercase to simulate a transformed response
		transform: (responses) => responses.map((r) => ({ ...r, payload: { ...r.payload, name: r.payload.name.toUpperCase() } })),
		transformSchema: undefined,
		mapError: (error) => error,
	});

describe("transformPagedFetchQuery - fetchAllPages paging extras", async () => {
	const result = await buildTransformedQuery().fetchAllPages();

	it("Responses should be transformed", () => {
		expect(result.responses.map((r) => r.payload.name)).toStrictEqual(transformedNames);
	});

	it("Paging extras should be derived from the untransformed responses", () => {
		expect(result.allNames).toStrictEqual(originalNames);
	});
});

describe("transformPagedFetchQuery - fetchAllPagesSafe paging extras", async () => {
	const result = await buildTransformedQuery().fetchAllPagesSafe();

	it("Responses should be transformed", () => {
		expect(result.responses?.map((r) => r.payload.name)).toStrictEqual(transformedNames);
	});

	it("Paging extras should be derived from the untransformed responses", () => {
		expect(result.allNames).toStrictEqual(originalNames);
	});
});
