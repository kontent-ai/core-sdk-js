import { describe, expect, it } from "vitest";
import z from "zod";
import type { AdapterResponse } from "../../../lib/http/http.models.js";
import { getDefaultHttpService } from "../../../lib/http/http.service.js";
import { getQuery } from "../../../lib/sdk/sdk-queries.js";

describe("Paging query ", async () => {
	const httpService = getDefaultHttpService({
		adapter: {
			requestAsync: async () => {
				const adapterResponse: AdapterResponse = {
					isValidResponse: true,
					responseHeaders: [],
					status: 200,
					statusText: "",
					toJsonAsync: async () => {
						return await Promise.resolve(null);
					},
					toBlobAsync: () => {
						throw new Error("n/a");
					},
				};

				return await Promise.resolve<AdapterResponse>(adapterResponse);
			},
		},
	});

	const { success, error, response } = await getQuery({
		authorizationApiKey: undefined,
		continuationToken: "",
		extraMetadata: () => ({}),
		config: {
			httpService,
			responseValidation: {
				enable: false,
			},
		},
		sdkInfo: {
			name: "test",
			version: "0.0.0",
			host: "test",
		},
		zodSchema: z.null(),
		request: {
			url: "https://domain.com",
			method: "GET",
			body: {},
		},
	}).toPromise();

	it("Error should be undefined", () => {
		expect(error).toBeUndefined();
	});

	it("Success should be true", () => {
		expect(success).toBe(true);
	});

	it("Response should be defined", () => {
		expect(response).toBeDefined();
	});

	it("Response payload should be null", () => {
		expect(response?.payload).toBeNull();
	});
});
