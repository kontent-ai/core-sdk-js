import { describe, expect, it } from "vitest";
import z from "zod";
import { createMutationQuery, createPagedFetchQuery, type KontentSdkError, type Query } from "../../../lib/public_api.js";
import { createFetchQuery } from "../../../lib/sdk/queries/fetch-sdk-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

const responseContinuationToken = "fake-continuation-token";
const responseStatusCode = 200;

describe("Query builder", async () => {
	const query = createFetchQuery({
		mapMetadata: () => ({}),
		config: {
			httpService: getTestHttpServiceWithJsonResponse({
				jsonResponse: null,
				statusCode: responseStatusCode,
				continuationToken: responseContinuationToken,
			}),
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		zodSchema: z.null(),
		url: "https://domain.com",
		mapError: (error) => error,
	});

	const { response, success } = await query.fetchSafe();

	it("Meta should have proper continuation token", () => {
		expect(response?.meta.continuationToken).toStrictEqual(responseContinuationToken);
	});

	it("Meta should have proper status code", () => {
		expect(response?.meta.status).toStrictEqual(responseStatusCode);
	});

	it("Success should be true", () => {
		expect(success).toBeTruthy();
	});

	it("Response data should be null", () => {
		expect(response?.payload).toBeNull();
	});
});

describe("Query builder url handling without modifications", () => {
	const sharedData = {
		config: {},
		mapMetadata: () => ({}),
		sdkInfo: getTestSdkInfo(),
		zodSchema: z.null(),
		mapError: (error: KontentSdkError) => error,
		url: "https://domain.com/api/path",
	};
	const queries: Query<unknown, KontentSdkError>[] = [
		createFetchQuery(sharedData),
		createMutationQuery({
			...sharedData,
			method: "POST",
			body: null,
		}),
		createPagedFetchQuery({
			...sharedData,
			getNextPageData: () => ({}),
		}),
	];

	for (const query of queries) {
		it("Url should be as is without any modifications", () => {
			expect(query.getUrl()?.data?.toString()).toBe(new URL("https://domain.com/api/path").toString());
		});
	}
});

describe("Query builder url handling with base url", () => {
	const sharedData = {
		config: {
			baseUrl: "https://kontent.ai",
		},
		mapMetadata: () => ({}),
		sdkInfo: getTestSdkInfo(),
		zodSchema: z.null(),
		mapError: (error: KontentSdkError) => error,
		url: "https://domain.com/api/path",
	};
	const queries: Query<unknown, KontentSdkError>[] = [
		createFetchQuery(sharedData),
		createMutationQuery({
			...sharedData,
			method: "POST",
			body: null,
		}),
		createPagedFetchQuery({
			...sharedData,
			getNextPageData: () => ({}),
		}),
	];

	for (const query of queries) {
		it("Url should be modified if baseUrl is provided", () => {
			expect(query.getUrl()?.data?.toString()).toBe(new URL("https://kontent.ai/api/path").toString());
		});
	}
});
