import { match } from "ts-pattern";
import type { JsonValue } from "../models/json.models.js";
import { isApplicationJsonResponseType, toFetchHeaders, toSdkHeaders } from "../utils/header.utils.js";
import type { HttpAdapter } from "./http.models.js";

export function getDefaultHttpAdapter(): HttpAdapter {
	return {
		executeRequestAsync: async (options) => {
			const response = await fetch(options.url, {
				method: options.method,
				headers: toFetchHeaders(options.requestHeaders ?? []),
				body: options.body,
			});

			const payload = await match({ isApplicationJsonResponseType: isApplicationJsonResponseType(toSdkHeaders(response.headers)) })
				.returnType<Promise<JsonValue>>()
				.with({ isApplicationJsonResponseType: true }, async () => (await response.json()) as JsonValue)
				.with({ isApplicationJsonResponseType: false }, async () => null)
				.exhaustive();

			return {
				isValidResponse: response.ok,
				responseHeaders: toSdkHeaders(response.headers),
				status: response.status,
				statusText: response.statusText,
				url: options.url,
				payload,
			};
		},
		downloadFileAsync: async (options) => {
			const response = await fetch(options.url, {
				method: "GET",
				headers: toFetchHeaders(options.requestHeaders ?? []),
				body: null,
			});

			return {
				isValidResponse: response.ok,
				responseHeaders: toSdkHeaders(response.headers),
				status: response.status,
				statusText: response.statusText,
				url: options.url,
				payload: await response.blob(),
			};
		},
	};
}
