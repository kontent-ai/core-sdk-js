import { describe, expect, it } from "vitest";
import z from "zod";
import type { KontentSdkError } from "../../../../lib/models/error.models.js";
import { createFetchQuery } from "../../../../lib/sdk/queries/fetch-sdk-query.js";
import { getTestHttpServiceWithJsonResponse, getTestSdkInfo } from "../../../../lib/testkit/testkit.utils.js";

type ResponsePayload = {
	readonly id: string;
	readonly name: string;
};

type Metadata = {
	readonly projectId: string;
	readonly requestDuration: number;
};

const responsePayload: ResponsePayload = {
	id: "item-1",
	name: "Test item",
};

const expectedMetadata: Metadata = {
	projectId: "project-abc",
	requestDuration: 42,
};

describe("createFetchQuery mapMetadata", async () => {
	const { response } = await createFetchQuery<ResponsePayload, KontentSdkError, Metadata>({
		zodSchema: z.object({
			id: z.string(),
			name: z.string(),
		}),
		url: "https://domain.com",
		config: {
			httpService: getTestHttpServiceWithJsonResponse({
				jsonResponse: responsePayload,
				statusCode: 200,
			}),
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: getTestSdkInfo(),
		mapMetadata: () => expectedMetadata,
		mapError: (error) => error,
		mapExtraResponseProps: () => ({}),
	}).fetchSafe();

	it("Response should contain the payload", () => {
		expect(response?.payload).toStrictEqual(responsePayload);
	});

	it("Response meta should contain the mapped metadata", () => {
		expect(response?.meta.projectId).toBe(expectedMetadata.projectId);
		expect(response?.meta.requestDuration).toBe(expectedMetadata.requestDuration);
	});
});
