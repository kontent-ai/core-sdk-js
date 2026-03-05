import { match, P } from "ts-pattern";
import { coreSdkInfo } from "../core-sdk-info.js";
import type { CommonHeaderNames, ErrorResponseData, Header, HttpMethod, ResolvedRetryStrategyOptions } from "../models/core.models.js";
import type { ErrorDetails, ErrorDetailsFor, ErrorReason, KontentSdkError } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import type { PickStringLiteral } from "../models/utility.models.js";
import { isBlob, isDefined } from "../utils/core.utils.js";
import { createSdkError, isKontentErrorResponseData, isKontentSdkError, toInvalidResponseMessage } from "../utils/error.utils.js";
import { findHeaderByName, getSdkIdHeader, isApplicationJsonResponseType } from "../utils/header.utils.js";
import { resolveDefaultRetryStrategyOptions, runWithRetryAsync } from "../utils/retry.utils.js";
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

export function getDefaultHttpService(config?: DefaultHttpServiceConfig): HttpService {
	const adapter = resolveHttpAdapter(config);

	const executeWithAdapterAsync = async <TPayload extends AdapterPayload>({
		parsedUrl,
		method,
		requestHeaders,
		parsedBody,
	}: AdapterRequestData): Promise<AdapterResponse<TPayload>> => {
		return (await adapter.executeRequestAsync({
			url: parsedUrl.toString(),
			method,
			requestHeaders,
			body: parsedBody,
		})) as AdapterResponse<TPayload>;
	};

	return {
		requestAsync: async <TPayload extends JsonValue, TRequestBody extends HttpRequestBody>(
			options: ExecuteRequestOptions<TRequestBody>,
		) => {
			return await processHttpRequestAsync<TPayload, TRequestBody>({
				config,
				options,
				runAdapterFuncAsync: executeWithAdapterAsync,
			});
		},

		downloadFileAsync: async (options: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
			return await processHttpRequestAsync<Blob, null>({
				config,
				options: {
					...options,
					method: "GET",
					body: null,
				},
				runAdapterFuncAsync: async ({ parsedUrl, requestHeaders }) => {
					return await adapter.downloadFileAsync({
						url: parsedUrl.toString(),
						requestHeaders,
					});
				},
			});
		},

		uploadFileAsync: async <TPayload extends JsonValue>(options: UploadFileRequestOptions): Promise<HttpResponse<TPayload, Blob>> => {
			return await processHttpRequestAsync<TPayload, Blob>({
				config,
				options,
				runAdapterFuncAsync: executeWithAdapterAsync,
			});
		},
	};
}

function resolveHttpAdapter(config?: DefaultHttpServiceConfig): Required<HttpAdapter> {
	const defaultAdapter = getDefaultHttpAdapter();

	return {
		downloadFileAsync: config?.adapter?.downloadFileAsync ?? defaultAdapter.downloadFileAsync,
		executeRequestAsync: config?.adapter?.executeRequestAsync ?? defaultAdapter.executeRequestAsync,
	};
}

async function processHttpRequestAsync<TPayload extends AdapterPayload, TRequestBody extends HttpRequestBody>({
	options,
	runAdapterFuncAsync,
	config,
}: {
	readonly runAdapterFuncAsync: (data: AdapterRequestData) => Promise<AdapterResponse<TPayload>>;
	readonly config: DefaultHttpServiceConfig | undefined;
	readonly options: ExecuteRequestOptions<TRequestBody>;
}): Promise<HttpResponse<TPayload, TRequestBody>> {
	const retryStrategyOptions = resolveDefaultRetryStrategyOptions(config?.retryStrategy);

	const { success: parseSuccess, data: parsedRequest, error: parseError } = parseAndValidateRequest(options, retryStrategyOptions);

	if (!parseSuccess) {
		return {
			success: false,
			error: parseError,
		};
	}

	const requestHeaders = buildRequestHeaders({
		configHeaders: config?.requestHeaders,
		optionHeaders: options.requestHeaders,
		body: options.body,
	});

	return await runWithRetryAsync({
		retryAttempt: 0,
		funcAsync: async (retryAttempt) => {
			const responseOrError = await runAdapterRequestAsync({
				parsedUrl: parsedRequest.parsedUrl,
				method: options.method,
				requestHeaders,
				parsedBody: parsedRequest.parsedBody,
				runAdapterFuncAsync,
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
				requestBody: options.body,
				requestHeaders,
				response: responseOrError,
				retryAttempt,
			});
		},
		url: options.url,
		retryStrategyOptions,
	});
}

function createAdapterError(url: string, error: unknown): KontentSdkError<ErrorDetailsFor<"adapterError">> {
	return createSdkError({
		baseErrorData: {
			message: `Adapter failed to execute the request for url '${url}'. See the error object for more details.`,
			url: url,
			retryStrategyOptions: undefined,
			retryAttempt: undefined,
		},
		details: {
			reason: "adapterError",
			originalError: error,
		},
	});
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
	readonly requestBody: TRequestBody;
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
			body: requestBody,
			method: method,
			adapterResponse: response,
			requestHeaders: requestHeaders,
		},
	};
}

type AdapterRequestData = {
	readonly parsedUrl: URL;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly parsedBody: AdapterBody;
};

async function runAdapterRequestAsync<TPayload extends AdapterPayload>({
	parsedUrl,
	method,
	requestHeaders,
	parsedBody,
	runAdapterFuncAsync,
}: {
	readonly runAdapterFuncAsync: (data: AdapterRequestData) => Promise<AdapterResponse<TPayload>>;
	readonly parsedUrl: URL;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly parsedBody: AdapterBody;
}): Promise<AdapterResponse<TPayload> | KontentSdkError> {
	const { success, error, data } = await tryCatchAsync(
		async () =>
			await runAdapterFuncAsync({
				parsedUrl,
				method,
				requestHeaders,
				parsedBody,
			}),
	);

	if (!success) {
		return createAdapterError(parsedUrl.toString(), error);
	}

	return data;
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
	return createSdkError({
		baseErrorData: {
			message: toInvalidResponseMessage({
				url: response.url,
				adapterResponse: response,
				method: method,
			}),
			url: response.url,
			retryAttempt,
			retryStrategyOptions,
		},
		details: extractInvalidResponseErrorDetails({ response }),
	});
}

function extractInvalidResponseErrorDetails({ response }: { readonly response: AdapterResponse<AdapterPayload> }): ErrorDetails {
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
		kontentErrorResponse: tryExtractKontentErrorData(response),
	};
}

function parseRequestBody({
	requestBody,
	url,
	retryStrategyOptions,
}: {
	readonly requestBody: HttpRequestBody;
	readonly url: string;
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
		.otherwise((m) => {
			const { success: isParseSuccess, data: parsedBody, error: parseError } = tryCatch(() => JSON.stringify(m));

			if (!isParseSuccess) {
				return {
					success: false,
					error: createSdkError({
						baseErrorData: {
							message: "Failed to stringify body of the request.",
							url: url,
							retryStrategyOptions,
							retryAttempt: 0,
						},
						details: {
							reason: "invalidBody",
							originalError: parseError,
						},
					}),
				};
			}

			return {
				success: true,
				data: parsedBody,
			};
		});
}

function tryExtractKontentErrorData(response: AdapterResponse<AdapterPayload>): ErrorResponseData | undefined {
	if (isApplicationJsonResponseType(response.responseHeaders) && isKontentErrorResponseData(response.payload)) {
		return response.payload;
	}

	return undefined;
}

type ParsedRequest = {
	readonly parsedUrl: URL;
	readonly parsedBody: AdapterBody;
};

function parseAndValidateRequest<TRequestBody extends HttpRequestBody>(
	options: ExecuteRequestOptions<TRequestBody>,
	retryStrategyOptions: ResolvedRetryStrategyOptions,
): TryCatchResult<ParsedRequest, KontentSdkError> {
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
	} = parseRequestBody({ requestBody: options.body, url: options.url, retryStrategyOptions });

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
		},
	};
}

function parseUrl({
	url,
	retryStrategyOptions,
}: {
	readonly url: string;
	readonly retryStrategyOptions: ResolvedRetryStrategyOptions;
}): TryCatchResult<URL, KontentSdkError> {
	const { success, data: parsedUrl, error } = tryCatch(() => new URL(url));

	if (!success) {
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

	return {
		success: true,
		data: parsedUrl,
	};
}

function buildRequestHeaders({
	configHeaders,
	optionHeaders,
	body,
}: {
	readonly configHeaders: readonly Header[] | undefined;
	readonly optionHeaders: readonly Header[] | undefined;
	readonly body: Blob | JsonValue;
}): readonly Header[] {
	const combinedHeaders: readonly Header[] = [...(configHeaders ?? []), ...(optionHeaders ?? [])];
	const existingContentTypeHeader = findHeaderByName(combinedHeaders, "Content-Type");
	const existingSdkVersionHeader = findHeaderByName(combinedHeaders, "X-KC-SDKID");

	const contentTypeHeader = existingContentTypeHeader ? undefined : createDefaultContentTypeHeader(body);
	const sdkVersionHeader = existingSdkVersionHeader ? undefined : getSdkIdHeader(coreSdkInfo);

	const contentLengthHeader = isBlob(body) ? createDefaultContentLengthHeader(body) : undefined;

	return [...combinedHeaders, contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isDefined);
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
