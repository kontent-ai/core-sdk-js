import { describe, expect, it } from "vitest";
import z from "zod";
import type { CommonHeaderNames, Header, HttpMethod } from "../../../lib/models/core.models.js";
import { getQuery } from "../../../lib/sdk/sdk-queries.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../lib/testkit/testkit.utils.js";
import { getSdkIdHeader } from "../../../lib/utils/header.utils.js";

describe("Query extra metadata", async () => {
	const responseContinuationToken = "fake-continuation-token";
	const expectedExtraMetadataValue = "extra-metadata";
	const responseStatusCode = 200;
	const method: HttpMethod = "GET";
	const requestHeader: Header = {
		name: "x",
		value: "y",
	};
	const { response } = await getQuery({
		authorizationApiKey: undefined,
		continuationToken: undefined,
		extraMetadata: (response, data) => {
			it("Continuation token should be the same as the one from the response", () => {
				expect(data.continuationToken).toStrictEqual(responseContinuationToken);
			});

			it("Response status code should be the same as the one from the response", () => {
				expect(response.adapterResponse.status).toStrictEqual(responseStatusCode);
			});

			it("Response method should be the same as the one from the request", () => {
				expect(response.method).toStrictEqual(method);
			});

			it(`Request headers should contain the header '${requestHeader.name}' from the request`, () => {
				expect(response.requestHeaders.find((m) => m.name === requestHeader.name)).toStrictEqual(requestHeader);
			});

			it(`Request headers should contain sdk id header`, () => {
				expect(response.requestHeaders.find((m) => m.name === ("X-KC-SDKID" satisfies CommonHeaderNames))).toStrictEqual(
					getSdkIdHeader(getTestSdkInfo()),
				);
			});

			return {
				testExtraMetadata: expectedExtraMetadataValue,
			};
		},
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
			method: method,
			body: {},
			requestHeaders: [requestHeader],
		},
	}).toPromise();

	it("Meta should have proper extra metadata", () => {
		expect(response?.meta.testExtraMetadata).toStrictEqual(expectedExtraMetadataValue);
	});
});
