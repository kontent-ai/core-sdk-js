import { match } from "ts-pattern";
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
	): AdapterResponse<TPayload> => {
		return {
			responseHeaders: toSdkHeaders(response.headers),
			status: response.status,
			statusText: response.statusText,
			url: url,
			payload,
		};
	};

	return {
		executeRequestAsync: async (options) => {
			const response = await getResponseAsync(options);
			const payload = await match({ isApplicationJsonResponseType: isApplicationJsonResponseType(toSdkHeaders(response.headers)) })
				.returnType<Promise<JsonValue>>()
				.with({ isApplicationJsonResponseType: true }, async () => (await response.json()) as JsonValue)
				.with({ isApplicationJsonResponseType: false }, async () => null)
				.exhaustive();

			return createAdapterResponse(options.url, response, payload);
		},
		downloadFileAsync: async (options) => {
			const response = await getResponseAsync({
				...options,
				method: "GET",
				body: null,
			});

			return createAdapterResponse(options.url, response, await response.blob());
		},
	};
}
