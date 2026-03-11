import type { Header } from "../models/core.models.js";
import { AdapterAbortError, AdapterParseError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { isApplicationJsonResponseType, toFetchHeaders, toSdkHeaders } from "../utils/header.utils.js";
import { tryCatchAsync } from "../utils/try-catch.utils.js";
import type { AdapterExecuteRequestOptions, AdapterPayload, AdapterResponse, HttpAdapter } from "./http.models.js";

export function getDefaultHttpAdapter(): Required<HttpAdapter> {
	return {
		executeRequest: async (options) => {
			const response = await getResponse(options);
			const sdkHeaders = toSdkHeaders(response.headers);
			const payload = isApplicationJsonResponseType(sdkHeaders)
				? await parseResponse<JsonValue>(async () => (await response.json()) as JsonValue)
				: null;

			return createAdapterResponse(options.url, response, payload, sdkHeaders);
		},
		downloadFile: async (options) => {
			const response = await getResponse({
				...options,
				method: "GET",
				body: null,
			});

			const file = await parseResponse(async () => response.blob());

			return createAdapterResponse(options.url, response, file, toSdkHeaders(response.headers));
		},
	};
}

async function getResponse(options: AdapterExecuteRequestOptions): Promise<Response> {
	const { error, data, success } = await tryCatchAsync(
		async () =>
			await fetch(options.url, {
				method: options.method,
				headers: toFetchHeaders(options.requestHeaders ?? []),
				body: options.body,
				signal: options.abortSignal ?? null,
			}),
	);

	if (success) {
		return data;
	}

	if (isAbortError(error)) {
		// this is to notify the HttpService that the request was aborted
		// HttpService will then convert the error to a KontentSdkError with the reason "aborted"
		throw new AdapterAbortError(error);
	}

	// re-throw original error
	throw error;
}

async function parseResponse<TPayload extends AdapterPayload>(resolve: () => Promise<TPayload>): Promise<TPayload> {
	const { success, data, error } = await tryCatchAsync(async () => {
		return await resolve();
	});

	if (!success) {
		// this is to notify the HttpService that the response is not valid JSON or BLOB
		// HttpService will then convert the error to a KontentSdkError with the reason "parseError"
		throw new AdapterParseError(error);
	}

	return data;
}

function isAbortError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}
	return "name" in error && error.name === "AbortError";
}

function createAdapterResponse<TPayload extends AdapterPayload>(
	url: string,
	response: Response,
	payload: TPayload,
	responseHeaders: readonly Header[],
): AdapterResponse<TPayload> {
	return {
		responseHeaders,
		status: response.status,
		statusText: response.statusText,
		url: url,
		payload,
	};
}
