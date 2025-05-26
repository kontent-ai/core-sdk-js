import type { JsonValue } from '../models/json.models.js';
import { toFetchHeaders, toSdkHeaders } from '../utils/header.utils.js';
import type { HttpAdapter } from './http.models.js';

export function getDefaultHttpAdapter(): HttpAdapter {
	return {
		sendAsync: async (options) => {
			const response = await fetch(options.url, {
				method: options.method,
				headers: toFetchHeaders(options.options?.requestHeaders ?? []),
				body: options.body,
			});

			return {
				isValidResponse: response.ok,
				responseHeaders: toSdkHeaders(response.headers),
				status: response.status,
				statusText: response.statusText,
				toBlobAsync: async () => await response.blob(),
				toJsonAsync: async () => (await response.json()) as Promise<JsonValue>,
			};
		},
	};
}
