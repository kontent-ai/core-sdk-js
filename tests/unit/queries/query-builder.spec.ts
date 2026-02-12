import { describe, expect, it } from "vitest";
import z from "zod";
import { createQuery } from "../../../lib/sdk/sdk-queries.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";

describe("Query builder", async () => {
	const responseContinuationToken = "fake-continuation-token";
	const responseStatusCode = 200;

	const { success, error, response } = await createQuery({
		authorizationApiKey: undefined,
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
		request: {
			url: "https://domain.com",
			method: "GET",
			body: {},
		},
	}).toPromise();

	it("Meta should have proper continuation token", () => {
		expect(response?.meta.continuationToken).toStrictEqual(responseContinuationToken);
	});

	it("Meta should have proper status code", () => {
		expect(response?.meta.status).toStrictEqual(responseStatusCode);
	});

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Success should be true", () => {
		expect(success).toBeTruthy();
	});

	it("Response data should be null", () => {
		expect(response?.data).toBeNull();
	});
});
