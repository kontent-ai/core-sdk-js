import { describe, expect, it } from "vitest";
import z from "zod";
import type { CommonHeaderNames, Header, HttpMethod } from "../../../lib/models/core.models.js";
import type { KontentSdkError } from "../../../lib/public_api.js";
import { createFetchQuery } from "../../../lib/sdk/queries/fetch-sdk-query.js";
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

	let mappedContinuationToken: string | undefined;
	let mappedResponseStatus: number | undefined;
	let mappedResponseMethod: HttpMethod | undefined;
	let mappedRequestHeaders: readonly Header[] | undefined;

	const { response } = await createFetchQuery<
		null,
		{
			testExtraMetadata: string;
		},
		KontentSdkError
	>({
		mapMetadata: (response, data) => {
			mappedContinuationToken = data.continuationToken;
			mappedResponseStatus = response.adapterResponse.status;
			mappedResponseMethod = response.method;
			mappedRequestHeaders = response.requestHeaders;

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
		url: "https://domain.com",
		requestHeaders: [requestHeader],
		mapError: (error) => error,
	}).fetchSafe();

	it("Meta should have proper extra metadata", () => {
		expect(response?.meta.testExtraMetadata).toStrictEqual(expectedExtraMetadataValue);
	});

	it("Continuation token should be the same as the one from the response", () => {
		expect(mappedContinuationToken).toStrictEqual(responseContinuationToken);
	});

	it("Response status code should be the same as the one from the response", () => {
		expect(mappedResponseStatus).toStrictEqual(responseStatusCode);
	});

	it("Response method should be the same as the one from the request", () => {
		expect(mappedResponseMethod).toStrictEqual(method);
	});

	it(`Request headers should contain the header '${requestHeader.name}' from the request`, () => {
		expect(mappedRequestHeaders?.find((m) => m.name === requestHeader.name)).toStrictEqual(requestHeader);
	});

	it("Request headers should contain sdk id header", () => {
		expect(mappedRequestHeaders?.find((m) => m.name === ("X-KC-SDKID" satisfies CommonHeaderNames))).toStrictEqual(
			getSdkIdHeader(getTestSdkInfo()),
		);
	});
});
