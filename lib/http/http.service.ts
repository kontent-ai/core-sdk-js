import { match, P } from "ts-pattern";
import { coreSdkInfo } from "../core-sdk-info.js";
import type { CommonHeaderNames, Header, HttpMethod, ResolvedRetryStrategyOptions } from "../models/core.models.js";
import type { ErrorDetails, ErrorDetailsFor, ErrorReason, ErrorResponseData, KontentSdkError } from "../models/error.models.js";
import type { JsonObject, JsonValue } from "../models/json.models.js";
import type { PickStringLiteral } from "../models/utility.types.js";
import { isBlob, isDefined } from "../utils/core.utils.js";
import {
	createSdkError,
	isAdapterAbortError,
	isAdapterParseError,
	isKontentErrorResponseData,
	isKontentSdkError,
	toInvalidResponseMessage,
} from "../utils/error.utils.js";
import { findHeaderByName, getSdkIdHeader, isApplicationJsonResponseType } from "../utils/header.utils.js";
import { resolveDefaultRetryStrategyOptions, runWithRetry } from "../utils/retry.utils.js";
import { type TryCatchResult, tryCatch, tryCatchAsync } from "../utils/try-catch.utils.js";
import { getDefaultHttpAdapter } from "./http.adapter.js";
import type {
	AdapterBody,
	AdapterPayload,
	AdapterResponse,
	DefaultHttpServiceConfig,
	DownloadFileRequestOptions,
	ExecuteRequestOptions,
	HttpAdapter,
	HttpPayload,
	HttpRequestBody,
	HttpResponse,
	HttpService,
	UploadFileRequestOptions,
} from "./http.models.js";

type ParsedRequest = {
	readonly parsedUrl: URL;
	readonly parsedBody: AdapterBody;
	readonly requestHeaders: readonly Header[];
};

type AdapterRequestData = {
	readonly parsedUrl: URL;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly parsedBody?: AdapterBody;
	readonly abortSignal: AbortSignal | undefined;
};

export function getDefaultHttpService(config?: DefaultHttpServiceConfig): HttpService {
	const adapter = resolveHttpAdapter(config);

	const executeWithAdapter = async <TPayload extends AdapterPayload>({
		parsedUrl,
		method,
		requestHeaders,
		parsedBody,
		abortSignal,
	}: AdapterRequestData): Promise<AdapterResponse<TPayload>> => {
		return (await adapter.executeRequest({
			url: parsedUrl.toString(),
			method,
			requestHeaders,
			body: parsedBody ?? null,
			abortSignal,
		})) as AdapterResponse<TPayload>;
	};

	return {
		request: async <TPayload extends JsonValue, TRequestBody extends HttpRequestBody>(options: ExecuteRequestOptions<TRequestBody>) => {
			return await processHttpRequest<TPayload, TRequestBody>({
				config,
				options,
				runAdapterFunc: executeWithAdapter,
			});
		},

		downloadFile: async (options: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
			return await processHttpRequest<Blob, null>({
				config,
				options: {
					...options,
					method: "GET",
				},
				runAdapterFunc: async ({ parsedUrl, requestHeaders }) => {
					return await adapter.downloadFile({
						url: parsedUrl.toString(),
						requestHeaders,
						abortSignal: options.abortSignal,
					});
				},
			});
		},

		uploadFile: async <TPayload extends JsonValue>(options: UploadFileRequestOptions): Promise<HttpResponse<TPayload, Blob>> => {
			return await processHttpRequest<TPayload, Blob>({
				config,
				options,
				runAdapterFunc: executeWithAdapter,
			});
		},
	};
}

function resolveHttpAdapter(config?: DefaultHttpServiceConfig): Required<HttpAdapter> {
	const defaultAdapter = getDefaultHttpAdapter();

	return {
		downloadFile: config?.adapter?.downloadFile ?? defaultAdapter.downloadFile,
		executeRequest: config?.adapter?.executeRequest ?? defaultAdapter.executeRequest,
	};
}

async function processHttpRequest<TPayload extends AdapterPayload, TRequestBody extends HttpRequestBody>({
	options,
	runAdapterFunc,
	config,
}: {
	readonly runAdapterFunc: (data: AdapterRequestData) => Promise<AdapterResponse<TPayload>>;
	readonly config: DefaultHttpServiceConfig | undefined;
	readonly options: ExecuteRequestOptions<TRequestBody>;
}): Promise<HttpResponse<TPayload, TRequestBody>> {
	const retryStrategyOptions = resolveDefaultRetryStrategyOptions(config?.retryStrategy);

	const { success, data: parsedRequest, error } = parseAndValidateRequest({ options, retryStrategyOptions, config });

	if (!success) {
		return {
			success: false,
			error: error,
		};
	}

	return await runWithRetry({
		retryAttempt: 0,
		abortSignal: options.abortSignal,
		func: async (retryAttempt) => {
			const responseOrError = await runAdapterRequest({
				parsedUrl: parsedRequest.parsedUrl,
				method: options.method,
				requestHeaders: parsedRequest.requestHeaders,
				parsedBody: parsedRequest.parsedBody,
				runAdapterRequest: runAdapterFunc,
				abortSignal: options.abortSignal,
				retryAttempt,
				retryStrategyOptions,
			});

			if (isKontentSdkError(responseOrError)) {
				return {
					success: false,
					error: responseOrError,
				};
			}

			return mapAdapterResponse({
				retryStrategyOptions,
				method: options.method,
				requestHeaders: parsedRequest.requestHeaders,
				response: responseOrError,
				retryAttempt,
				...(options.body === undefined ? {} : { requestBody: options.body }),
			});
		},
		url: parsedRequest.parsedUrl,
		retryStrategyOptions,
	});
}

function createAdapterError({
	url,
	error,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly url: string;
	readonly error: unknown;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): KontentSdkError<ErrorDetailsFor<"adapterError" | "aborted" | "parseError">> {
	return match(error)
		.returnType<KontentSdkError<ErrorDetailsFor<"adapterError" | "aborted" | "parseError">>>()
		.when(isAdapterAbortError, (abortError) =>
			createSdkError({
				baseErrorData: {
					message: `Adapter has aborted the request for url '${url}'. See the error object for more details.`,
					url: url,
					retryStrategyOptions,
					retryAttempt,
				},
				details: {
					reason: "aborted",
					originalError: abortError,
				},
			}),
		)
		.when(isAdapterParseError, (parseError) =>
			createSdkError({
				baseErrorData: {
					message: `Adapter failed to parse the response for url '${url}'. See the error object for more details.`,
					url: url,
					retryStrategyOptions,
					retryAttempt,
				},
				details: {
					reason: "parseError",
					originalError: parseError,
				},
			}),
		)
		.otherwise(() =>
			createSdkError({
				baseErrorData: {
					message: `Adapter failed to execute the request for url '${url}'. See the error object for more details.`,
					url: url,
					retryStrategyOptions,
					retryAttempt,
				},
				details: {
					reason: "adapterError",
					originalError: error,
				},
			}),
		);
}

function mapAdapterResponse<TPayload extends HttpPayload, TRequestBody extends HttpRequestBody>({
	response,
	method,
	requestHeaders,
	requestBody,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly response: AdapterResponse<TPayload>;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly requestBody?: TRequestBody;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): HttpResponse<TPayload, TRequestBody> {
	if (!isSuccessfulResponse(response)) {
		return {
			success: false,
			error: createInvalidResponseError({ response, method, retryAttempt, retryStrategyOptions }),
		};
	}

	return {
		success: true,
		response: {
			payload: response.payload,
			method: method,
			adapterResponse: response,
			requestHeaders: requestHeaders,
			...(requestBody === undefined ? {} : { body: requestBody }),
		},
	};
}

async function runAdapterRequest<TPayload extends AdapterPayload>({
	parsedUrl,
	method,
	requestHeaders,
	parsedBody,
	runAdapterRequest,
	abortSignal,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly runAdapterRequest: (data: AdapterRequestData) => Promise<AdapterResponse<TPayload>>;
	readonly parsedUrl: URL;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly parsedBody: AdapterBody;
	readonly abortSignal: AbortSignal | undefined;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): Promise<AdapterResponse<TPayload> | KontentSdkError> {
	const { error, data } = await tryCatchAsync(
		async () =>
			await runAdapterRequest({
				parsedUrl,
				method,
				requestHeaders,
				parsedBody,
				abortSignal,
			}),
	);

	return data ?? createAdapterError({ url: parsedUrl.toString(), error, retryAttempt, retryStrategyOptions });
}

function isSuccessfulResponse(response: AdapterResponse<AdapterPayload>): boolean {
	return response.status >= 200 && response.status < 300;
}

function createInvalidResponseError({
	response,
	method,
	retryAttempt,
	retryStrategyOptions,
}: {
	readonly response: AdapterResponse<AdapterPayload>;
	readonly method: HttpMethod;
	readonly retryAttempt: number;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): KontentSdkError {
	const kontentErrorData = tryExtractKontentErrorData(response);

	return createSdkError({
		baseErrorData: {
			message: toInvalidResponseMessage({
				url: response.url,
				adapterResponse: response,
				method: method,
				kontentErrorData: kontentErrorData,
			}),
			url: response.url,
			retryAttempt,
			retryStrategyOptions,
		},
		details: extractInvalidResponseErrorDetails({ response, kontentErrorData }),
	});
}

function extractInvalidResponseErrorDetails({
	response,
	kontentErrorData,
}: {
	readonly response: AdapterResponse<AdapterPayload>;
	readonly kontentErrorData: ErrorResponseData | undefined;
}): ErrorDetails {
	const reason = match(response.status)
		.returnType<PickStringLiteral<ErrorReason, "unauthorized" | "notFound" | "invalidResponse">>()
		.with(401, () => "unauthorized")
		.with(404, () => "notFound")
		.otherwise(() => "invalidResponse");

	return {
		reason,
		responseHeaders: response.responseHeaders,
		status: response.status,
		statusText: response.statusText,
		kontentErrorResponse: kontentErrorData,
	};
}

function parseRequestBody({
	requestBody,
	url,
	retryStrategyOptions,
}: {
	readonly requestBody: HttpRequestBody;
	readonly url: URL;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): TryCatchResult<AdapterBody, KontentSdkError> {
	return match(requestBody)
		.returnType<TryCatchResult<AdapterBody, KontentSdkError>>()
		.with(P.nullish, () => ({
			success: true,
			data: null,
		}))
		.when(isBlob, (blob) => ({
			success: true,
			data: blob,
		}))
		.otherwise((m) => stringifyJson({ url: url, retryStrategyOptions, json: m }));
}

function stringifyJson({
	url,
	retryStrategyOptions,
	json,
}: {
	readonly url: URL;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly json: JsonObject;
}): TryCatchResult<string, KontentSdkError> {
	const { success, data, error } = tryCatch(() => JSON.stringify(json));

	if (success) {
		return {
			success: true,
			data,
		};
	}

	return {
		success: false,
		error: createSdkError({
			baseErrorData: {
				message: "Failed to stringify body of the request.",
				url: url.toString(),
				retryStrategyOptions,
				retryAttempt: 0,
			},
			details: {
				reason: "invalidBody",
				originalError: error,
			},
		}),
	};
}

function tryExtractKontentErrorData(response: AdapterResponse<AdapterPayload>): ErrorResponseData | undefined {
	if (isApplicationJsonResponseType(response.responseHeaders) && isKontentErrorResponseData(response.payload)) {
		return response.payload;
	}

	return undefined;
}

function isStringUrl(url: string | URL): url is string {
	return typeof url === "string";
}

function parseAndValidateRequest<TRequestBody extends HttpRequestBody>({
	options,
	retryStrategyOptions,
	config,
}: {
	readonly options: ExecuteRequestOptions<TRequestBody>;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
	readonly config: DefaultHttpServiceConfig | undefined;
}): TryCatchResult<ParsedRequest, KontentSdkError> {
	const { success: urlParsedSuccess, data: parsedUrl, error: urlError } = parseUrl({ url: options.url, retryStrategyOptions });

	if (!urlParsedSuccess) {
		return {
			success: false,
			error: urlError,
		};
	}

	const {
		success: requestBodyParsedSuccess,
		data: parsedRequestBody,
		error: requestBodyError,
	} = parseRequestBody({ requestBody: options.body ?? null, url: parsedUrl, retryStrategyOptions });

	if (!requestBodyParsedSuccess) {
		return {
			success: false,
			error: requestBodyError,
		};
	}

	return {
		success: true,
		data: {
			parsedUrl,
			parsedBody: parsedRequestBody,
			requestHeaders: buildRequestHeaders({
				configHeaders: config?.requestHeaders,
				optionHeaders: options.requestHeaders,
				body: options.body ?? null,
			}),
		},
	};
}

function parseUrl({
	url,
	retryStrategyOptions,
}: {
	readonly url: string | URL;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): TryCatchResult<URL, KontentSdkError> {
	if (!isStringUrl(url)) {
		return {
			success: true,
			data: url,
		};
	}

	const { success, data: parsedUrl, error } = tryCatch(() => new URL(url));

	if (success) {
		return {
			success: true,
			data: parsedUrl,
		};
	}

	return {
		success: false,
		error: createSdkError({
			baseErrorData: {
				message: `Failed to parse url '${url}'.`,
				url: url,
				retryStrategyOptions,
				retryAttempt: 0,
			},
			details: {
				reason: "invalidUrl",
				originalError: error,
			},
		}),
	};
}

function buildRequestHeaders({
	configHeaders,
	optionHeaders,
	body,
}: {
	readonly configHeaders: readonly Header[] | undefined;
	readonly optionHeaders: readonly Header[] | undefined;
	readonly body: HttpRequestBody;
}): readonly Header[] {
	const combinedHeaders: readonly Header[] = [...(configHeaders ?? []), ...(optionHeaders ?? [])];
	const existingContentTypeHeader = findHeaderByName(combinedHeaders, "Content-Type");
	const existingSdkVersionHeader = findHeaderByName(combinedHeaders, "X-KC-SDKID");

	const contentTypeHeader = match({ existingContentTypeHeader, body })
		.returnType<Header | undefined>()
		.with({ existingContentTypeHeader: P.nullish, body: P.nonNullable }, ({ body }) => createDefaultContentTypeHeader(body))
		.otherwise(() => undefined);
	const sdkVersionHeader = existingSdkVersionHeader ? undefined : getSdkIdHeader(coreSdkInfo);

	const contentLengthHeader = isBlob(body) ? createDefaultContentLengthHeader(body) : undefined;

	return [...combinedHeaders, ...[contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isDefined)];
}

function createDefaultContentTypeHeader(body: Blob | JsonValue): Header {
	return {
		name: "Content-Type" satisfies CommonHeaderNames,
		value: isBlob(body) ? body.type : "application/json",
	};
}

function createDefaultContentLengthHeader(body: Blob): Header {
	return {
		name: "Content-Length" satisfies CommonHeaderNames,
		value: body.size.toString(),
	};
}
