import { match, P } from "ts-pattern";
import type { CommonHeaderNames, Header, HttpMethod, KontentErrorResponseData, RetryStrategyOptions } from "../models/core.models.js";
import type { SdkError, SdkErrorDetails } from "../models/error.models.js";
import type { JsonValue } from "../models/json.models.js";
import { sdkInfo } from "../sdk-info.js";
import { isBlob, isNotUndefined } from "../utils/core.utils.js";
import { createSdkError, getErrorMessage, isKontentErrorResponseData } from "../utils/error.utils.js";
import { getSdkIdHeader, isApplicationJsonResponseType } from "../utils/header.utils.js";
import { runWithRetryAsync, toRequiredRetryStrategyOptions } from "../utils/retry.utils.js";
import { type Result, tryCatch, tryCatchAsync } from "../utils/try.utils.js";
import { getDefaultHttpAdapter } from "./http.adapter.js";
import type {
	AdapterRequestBody,
	AdapterResponse,
	DefaultHttpServiceConfig,
	DownloadFileRequestOptions,
	ExecuteRequestOptions,
	HttpAdapter,
	HttpResponse,
	HttpService,
	RequestBody,
	ResponseData,
	UploadFileRequestOptions,
} from "./http.models.js";

export function getDefaultHttpService(config?: DefaultHttpServiceConfig): HttpService {
	return {
		requestAsync: async <TResponseData extends JsonValue, TRequestBody extends RequestBody>(
			options: ExecuteRequestOptions<TRequestBody>,
		) => {
			return await resolveRequestAsync<TResponseData, TRequestBody>({
				config,
				options,
				resolveDataAsync: async (response) => {
					return (await response.toJsonAsync()) as TResponseData;
				},
			});
		},

		downloadFileAsync: async (options: DownloadFileRequestOptions): Promise<HttpResponse<Blob, null>> => {
			return await resolveRequestAsync<Blob, null>({
				config,
				options: {
					...options,
					method: "GET",
					body: null,
				},
				resolveDataAsync: async (response) => {
					return await response.toBlobAsync();
				},
			});
		},

		uploadFileAsync: async <TResponseData extends JsonValue>(
			options: UploadFileRequestOptions,
		): Promise<HttpResponse<TResponseData, Blob>> => {
			return await resolveRequestAsync<TResponseData, Blob>({
				config,
				options,
				resolveDataAsync: async (response) => {
					return (await response.toJsonAsync()) as TResponseData;
				},
			});
		},
	};
}

async function resolveRequestAsync<TResponseData extends ResponseData, TRequestBody extends RequestBody>({
	options,
	resolveDataAsync,
	config,
}: {
	readonly config: DefaultHttpServiceConfig | undefined;
	readonly options: ExecuteRequestOptions<TRequestBody>;
	readonly resolveDataAsync: (response: AdapterResponse) => Promise<TResponseData>;
}): Promise<HttpResponse<TResponseData, TRequestBody>> {
	return await withUnknownErrorHandlingAsync({
		url: options.url,
		funcAsync: async () => {
			const { success: parseSuccess, data: parsedRequest, error: parseError } = parseAndValidateRequest(options);

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

			return await withRetryAsync({
				funcAsync: async () => {
					const adapterResponse = await executeWithAdapter({
						adapter: config?.adapter ?? getDefaultHttpAdapter(),
						parsedUrl: parsedRequest.parsedUrl,
						method: options.method,
						requestHeaders,
						parsedBody: parsedRequest.parsedBody,
					});

					return await resolveResponseAsync({
						method: options.method,
						requestBody: options.body,
						requestHeaders,
						response: adapterResponse,
						resolveDataAsync,
					});
				},
				url: options.url,
				retryStrategyOptions: toRequiredRetryStrategyOptions(config?.retryStrategy),
				requestHeaders,
				method: options.method,
			});
		},
	});
}

async function withUnknownErrorHandlingAsync<TResponseData extends ResponseData, TRequestBody extends RequestBody>({
	url,
	funcAsync,
}: {
	readonly url: string;
	readonly funcAsync: () => Promise<HttpResponse<TResponseData, TRequestBody>>;
}): Promise<HttpResponse<TResponseData, TRequestBody>> {
	const { success, data, error } = await tryCatchAsync(funcAsync);

	if (success) {
		return data;
	}

	return {
		success: false,
		error: createSdkError({
			message: "Unknown error. See the error object for more details.",
			url: url,
			reason: "unknown",
			originalError: error,
		}),
	};
}

async function resolveResponseAsync<TResponseData extends ResponseData, TRequestBody extends RequestBody>({
	response,
	resolveDataAsync,
	method,
	requestHeaders,
	requestBody,
}: {
	readonly response: AdapterResponse;
	readonly resolveDataAsync: (response: AdapterResponse) => Promise<TResponseData>;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly requestBody: TRequestBody;
}): Promise<HttpResponse<TResponseData, TRequestBody>> {
	if (!response.isValidResponse) {
		return {
			success: false,
			error: await getErrorForInvalidResponseAsync(response, method),
		};
	}

	return {
		success: true,
		response: {
			data: await resolveDataAsync(response),
			body: requestBody,
			method: method,
			adapterResponse: {
				url: response.url,
				isValidResponse: response.isValidResponse,
				responseHeaders: response.responseHeaders,
				status: response.status,
				statusText: response.statusText,
			},
			requestHeaders: requestHeaders,
		},
	};
}

async function executeWithAdapter({
	adapter,
	parsedUrl,
	method,
	requestHeaders,
	parsedBody,
}: {
	readonly adapter: HttpAdapter;
	readonly parsedUrl: URL;
	readonly method: HttpMethod;
	readonly requestHeaders: readonly Header[];
	readonly parsedBody: AdapterRequestBody;
}): Promise<AdapterResponse> {
	return await adapter.requestAsync({
		url: parsedUrl.toString(),
		method,
		requestHeaders,
		body: parsedBody,
	});
}

async function withRetryAsync<TResponseData extends ResponseData, TRequestBody extends RequestBody>({
	funcAsync,
	url,
	retryStrategyOptions,
	requestHeaders,
	method,
}: {
	readonly funcAsync: () => Promise<HttpResponse<TResponseData, TRequestBody>>;
	readonly url: string;
	readonly retryStrategyOptions: Required<RetryStrategyOptions>;
	readonly requestHeaders: readonly Header[];
	readonly method: HttpMethod;
}): Promise<HttpResponse<TResponseData, TRequestBody>> {
	return await runWithRetryAsync({
		url: url,
		retryStrategyOptions,
		retryAttempt: 0,
		requestHeaders,
		method: method,
		funcAsync: async () => {
			return await funcAsync();
		},
	});
}

async function getErrorForInvalidResponseAsync(response: AdapterResponse, method: HttpMethod): Promise<SdkError> {
	return createSdkError(await getErrorDetailsForInvalidResponseAsync(response, method));
}

async function getErrorDetailsForInvalidResponseAsync(response: AdapterResponse, method: HttpMethod): Promise<SdkErrorDetails> {
	const sharedErrorData: Pick<SdkErrorDetails, "message" | "url"> = {
		message: getErrorMessage({
			url: response.url,
			adapterResponse: response,
			method: method,
		}),
		url: response.url,
	};

	return await match(response)
		.returnType<Promise<SdkErrorDetails>>()
		.with({ status: P.union(401, 404) }, async (m) => ({
			...sharedErrorData,
			reason: m.status === 401 ? "unauthorized" : "notFound",
			isValidResponse: m.isValidResponse,
			responseHeaders: m.responseHeaders,
			status: m.status,
			statusText: m.statusText,
			kontentErrorResponse: await getKontentErrorDataAsync(m),
		}))
		.otherwise(async () => ({
			...sharedErrorData,
			reason: "invalidResponse",
			isValidResponse: response.isValidResponse,
			responseHeaders: response.responseHeaders,
			status: response.status,
			statusText: response.statusText,
			kontentErrorResponse: await getKontentErrorDataAsync(response),
		}));
}

function parseRequestBody({
	requestBody,
	url,
}: {
	readonly requestBody: RequestBody;
	readonly url: string;
}): Result<AdapterRequestBody, SdkError> {
	return match(requestBody)
		.returnType<Result<AdapterRequestBody, SdkError>>()
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
						message: "Failed to stringify body of the request.",
						url: url,
						reason: "invalidBody",
						originalError: parseError,
					}),
				};
			}

			return {
				success: true,
				data: parsedBody,
			};
		});
}

async function getKontentErrorDataAsync(response: AdapterResponse): Promise<KontentErrorResponseData | undefined> {
	if (isApplicationJsonResponseType(response.responseHeaders)) {
		const json = await response.toJsonAsync();

		if (isKontentErrorResponseData(json)) {
			return json;
		}
	}

	return undefined;
}

type ParsedRequest = {
	readonly parsedUrl: URL;
	readonly parsedBody: AdapterRequestBody;
};

function parseAndValidateRequest<TRequestBody extends RequestBody>(
	options: ExecuteRequestOptions<TRequestBody>,
): Result<ParsedRequest, SdkError> {
	const { success: urlParsedSuccess, data: parsedUrl, error: urlError } = parseUrl(options.url);

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
	} = parseRequestBody({ requestBody: options.body, url: options.url });

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

function parseUrl(url: string): Result<URL, SdkError> {
	const { success, data: parsedUrl, error } = tryCatch(() => new URL(url));

	if (!success) {
		return {
			success: false,
			error: createSdkError({
				message: `Failed to parse url '${url}'.`,
				url: url,
				reason: "invalidUrl",
				originalError: error,
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
	const existingContentTypeHeader = getExistingContentTypeHeader(combinedHeaders);
	const existingSdkVersionHeader = getExistingSdkVersionHeader(combinedHeaders);

	const contentTypeHeader = existingContentTypeHeader ? undefined : createDefaultContentTypeHeader(body);
	const sdkVersionHeader = existingSdkVersionHeader
		? undefined
		: getSdkIdHeader({
				host: sdkInfo.host,
				name: sdkInfo.name,
				version: sdkInfo.version,
			});

	const contentLengthHeader = body instanceof Blob ? createDefaultContentLengthHeader(body) : undefined;

	return [...combinedHeaders, contentTypeHeader, contentLengthHeader, sdkVersionHeader].filter(isNotUndefined);
}

function createDefaultContentTypeHeader(body: Blob | JsonValue): Header {
	return {
		name: "Content-Type" satisfies CommonHeaderNames,
		value: body instanceof Blob ? body.type : "application/json",
	};
}

function createDefaultContentLengthHeader(body: Blob): Header {
	return {
		name: "Content-Length" satisfies CommonHeaderNames,
		value: body.size.toString(),
	};
}

function getExistingContentTypeHeader(headers: readonly Header[]): Header | undefined {
	return headers.find((header) => header.name.toLowerCase() === ("Content-Type" satisfies CommonHeaderNames).toLowerCase());
}

function getExistingSdkVersionHeader(headers: readonly Header[]): Header | undefined {
	return headers.find((header) => header.name.toLowerCase() === ("X-KC-SDKID" satisfies CommonHeaderNames).toLowerCase());
}
