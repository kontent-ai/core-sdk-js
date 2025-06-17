import type { CommonHeaderNames } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import { toFetchHeaders, toSdkHeaders } from "../utils/header.utils.js";
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
				toBlobAsync: async () => await response.blob(),
				toJsonAsync: async () => {
					const contentTypeResponseHeader = sdkResponseHeaders
						.find((m) => m.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase())
						?.value.toLowerCase();

					if (contentTypeResponseHeader?.includes("application/json")) {
						// Includes instead of equal due to the fact that the header value can be 'application/json; charset=utf-8' or similar
						return (await response.json()) as JsonValue;
					}

					return null;
				},
			};
		},
	};
}
