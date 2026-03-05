import type { Header } from "../models/core.models.js";
import type { JsonValue } from "../models/json.models.js";
import { isApplicationJsonResponseType, toFetchHeaders, toSdkHeaders } from "../utils/header.utils.js";
import type { AdapterExecuteRequestOptions, AdapterPayload, AdapterResponse, HttpAdapter } from "./http.models.js";

export function getDefaultHttpAdapter(): Required<HttpAdapter> {
	const getResponseAsync = async (options: AdapterExecuteRequestOptions): Promise<Response> => {
		return await fetch(options.url, {
			method: options.method,
			headers: toFetchHeaders(options.requestHeaders ?? []),
			body: options.body,
		});
	};

	const createAdapterResponse = <TPayload extends AdapterPayload>(
		url: string,
		response: Response,
		payload: TPayload,
		responseHeaders: readonly Header[],
	): AdapterResponse<TPayload> => {
		return {
			responseHeaders,
			status: response.status,
			statusText: response.statusText,
			url: url,
			payload,
		};
	};

	return {
		executeRequestAsync: async (options) => {
			const response = await getResponseAsync(options);
			const sdkHeaders = toSdkHeaders(response.headers);
			const payload = isApplicationJsonResponseType(toSdkHeaders(response.headers)) ? ((await response.json()) as JsonValue) : null;

			return createAdapterResponse(options.url, response, payload, sdkHeaders);
		},
		downloadFileAsync: async (options) => {
			const response = await getResponseAsync({
				...options,
				method: "GET",
				body: null,
			});
			const sdkHeaders = toSdkHeaders(response.headers);

			return createAdapterResponse(options.url, response, await response.blob(), sdkHeaders);
		},
	};
}
