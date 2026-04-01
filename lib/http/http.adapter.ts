import type { Header } from "../models/core.models.js";
import { AdapterAbortError, AdapterParseError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { runWithAbortSignal } from "../utils/abort.utils.js";
import { isAbortError } from "../utils/error.utils.js";
import { isApplicationJsonResponseType, toFetchHeaders, toSdkHeaders } from "../utils/header.utils.js";
import { tryCatchAsync } from "../utils/try-catch.utils.js";
import type { AdapterExecuteRequestOptions, AdapterPayload, AdapterResponse, HttpAdapter } from "./http.models.js";

export function getDefaultHttpAdapter(): Required<HttpAdapter> {
	return {
		executeRequest: async (options) => {
			const response = await getResponse(options);
			const sdkHeaders = toSdkHeaders(response.headers);
			const payload = isApplicationJsonResponseType(sdkHeaders)
				? await parseResponse<JsonValue>({
						parseFunc: async () => (await response.json()) as JsonValue,
						abortSignal: options.abortSignal,
					})
				: null;

			return createAdapterResponse(options.url, response, payload, sdkHeaders);
		},
		downloadFile: async (options) => {
			const response = await getResponse({
				...options,
				method: "GET",
				body: null,
			});

			const file = await parseResponse({ parseFunc: async () => await response.blob(), abortSignal: options.abortSignal });

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
				body: options.body ?? null,
				signal: options.abortSignal ?? null,
			}),
	);

	if (success) {
		return data;
	}

	if (isAbortError(error)) {
		// this is to notify the HttpService that the request was aborted
		// HttpService will then convert the error to a KontentSdkError with the reason "aborted"
		throw new AdapterAbortError({ message: "Request was aborted.", error });
	}

	// re-throw original error
	throw error;
}

async function parseResponse<TPayload extends AdapterPayload>({
	parseFunc,
	abortSignal,
}: {
	readonly parseFunc: () => Promise<TPayload>;
	readonly abortSignal: AbortSignal | undefined;
}): Promise<TPayload> {
	const runParseFunc = async (): Promise<TPayload> => {
		const { success, data, error } = await tryCatchAsync(async () => {
			return await parseFunc();
		});

		if (!success) {
			// this is to notify the HttpService that the response is not valid JSON or BLOB
			// HttpService will then convert the error to a KontentSdkError with the reason "parseError"
			throw new AdapterParseError({ message: "Failed to parse the response.", error });
		}

		return data;
	};

	if (!abortSignal) {
		return await runParseFunc();
	}

	const { isAborted, data } = await runWithAbortSignal<TPayload>({
		func: runParseFunc,
		abortSignal: abortSignal,
	});

	if (isAborted) {
		throw new AdapterAbortError({ message: "Request was aborted while parsing the response." });
	}

	return data;
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
