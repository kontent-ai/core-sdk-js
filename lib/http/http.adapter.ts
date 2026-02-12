import type { JsonValue } from "../models/json.models.js";
import { isApplicationJsonResponseType, toFetchHeaders, toSdkHeaders } from "../utils/header.utils.js";
import type { HttpAdapter } from "./http.models.js";

export function getDefaultHttpAdapter(): HttpAdapter {
	return {
		requestAsync: async (options) => {
			const response = await fetch(options.url, {
				method: options.method,
				headers: toFetchHeaders(options.requestHeaders ?? []),
				body: options.body,
			});

			const sdkResponseHeaders = toSdkHeaders(response.headers);

			return {
				isValidResponse: response.ok,
				responseHeaders: sdkResponseHeaders,
				status: response.status,
				statusText: response.statusText,
				url: options.url,
				toBlobAsync: async () => await response.blob(),
				toJsonAsync: async () => {
					if (isApplicationJsonResponseType(sdkResponseHeaders)) {
						return (await response.json()) as JsonValue;
					}

					return null;
				},
			};
		},
	};
}
