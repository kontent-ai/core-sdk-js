import { describe, expect, it } from "vitest";
import z from "zod";
import { getQuery } from "../../../lib/sdk/sdk-queries.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

describe("Query builder", async () => {
	const responseContinuationToken = "fake-continuation-token";
	const responseStatusCode = 200;

	const { success, error, response } = await getQuery({
		authorizationApiKey: undefined,
		continuationToken: undefined,
		extraMetadata: () => ({}),
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
		request: {
			url: "https://domain.com",
			method: "GET",
			body: {},
		},
	}).toPromise();

	it("Meta should contain the continuation token", () => {
		expect(response?.meta.continuationToken).toStrictEqual(responseContinuationToken);
	});

	it("Meta should contain the status code", () => {
		expect(response?.meta.status).toStrictEqual(responseStatusCode);
	});

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Success should be true", () => {
		expect(success).toBeTruthy();
	});

	it("Response payload should be null", () => {
		expect(response?.payload).toBeNull();
	});
});
